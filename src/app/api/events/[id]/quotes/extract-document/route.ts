import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
import { processQuotationDocument } from '@/lib/services/quotationExtractionService';
import { allowRequest } from '@/lib/auth/rateLimit';
import { getDb } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

const MAX_BODY_BYTES = 5 * 1024 * 1024 + 64 * 1024;

async function boundedFormData(req: NextRequest): Promise<FormData> {
  const statedLength = Number(req.headers.get('content-length'));
  if (statedLength > MAX_BODY_BYTES) throw new Error('Upload exceeds the 5 MB size limit.');
  if (!req.body) throw new Error('Uploaded file is empty.');
  const reader = req.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error('Upload exceeds the 5 MB size limit.');
    }
    chunks.push(Buffer.from(value));
  }
  const body = Buffer.concat(chunks);
  return new Request(req.url, {
    method: 'POST',
    headers: { 'content-type': req.headers.get('content-type') || '' },
    body,
  }).formData();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const session = getCurrentSessionUser(req);
    const owned = getDb().select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.userId, session.id))).get();
    if (!owned) return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    if (!allowRequest('quote-upload', session.id, 20, 60 * 60_000)) {
      return NextResponse.json({ success: false, error: 'Upload limit reached. Try again later.' }, { status: 429 });
    }

    const formData = await boundedFormData(req);
    const file = formData.get('file');

    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'A valid PDF document file must be uploaded.' },
        { status: 400 }
      );
    }

    const filename = (file as File).name || 'quotation.pdf';
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File exceeds the 5 MB size limit.' }, { status: 413 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extracted = await processQuotationDocument(eventId, session.id, buffer, filename);

    return NextResponse.json({ success: true, data: extracted }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedSessionError) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : 'Failed to extract quotation document.';
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Event not found or unauthorized.' }, { status: 404 });
    }
    if (/^(Upload exceeds the 5 MB size limit|File exceeds the 5 MB maximum size limit)\.$/.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 413 });
    }
    if ([
      'Uploaded file is empty.',
      'Invalid file format. Only authentic PDF documents (%PDF-) are accepted.',
      'Uploaded file must have a .pdf extension.',
    ].includes(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

