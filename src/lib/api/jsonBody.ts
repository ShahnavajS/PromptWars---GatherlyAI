import { NextResponse } from 'next/server';

/** Keep ordinary JSON mutations bounded even when Content-Length is absent. */
export class RequestBodyTooLargeError extends Error {}

export function jsonBodyErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof RequestBodyTooLargeError) {
    return NextResponse.json({ success: false, error: 'Request too large.' }, { status: 413 });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }
  return null;
}

export async function readJsonBody(req: Request, maxBytes = 16 * 1024): Promise<unknown> {
  const statedLength = Number(req.headers.get('content-length'));
  if (statedLength > maxBytes) throw new RequestBodyTooLargeError();
  if (!req.body) throw new SyntaxError('Missing JSON body.');

  const reader = req.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(Buffer.from(value));
  }
  return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
}
