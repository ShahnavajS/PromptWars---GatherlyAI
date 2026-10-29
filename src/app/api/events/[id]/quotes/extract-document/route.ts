import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth/session';
import { processQuotationDocument } from '@/lib/services/quotationExtractionService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const session = getCurrentSessionUser(req);

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'A valid PDF document file must be uploaded.' },
        { status: 400 }
      );
    }

    const filename = (file as File).name || 'quotation.pdf';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extracted = await processQuotationDocument(eventId, session.id, buffer, filename);

    return NextResponse.json({ success: true, data: extracted }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to extract quotation document.';
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Event not found or unauthorized.' }, { status: 404 });
    }
    if (
      message.includes('PDF') ||
      message.includes('size limit') ||
      message.includes('empty') ||
      message.includes('extension')
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

