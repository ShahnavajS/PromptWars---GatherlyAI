import { describe, expect, it } from 'vitest';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/jsonBody';

describe('bounded JSON body', () => {
  it('accepts a small object and rejects both declared and streamed oversized bodies', async () => {
    expect(await readJsonBody(new Request('http://localhost', { method: 'POST', body: '{"ok":true}' }), 16))
      .toEqual({ ok: true });
    await expect(readJsonBody(new Request('http://localhost', {
      method: 'POST', headers: { 'content-length': '100' }, body: '{}',
    }), 16)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    await expect(readJsonBody(new Request('http://localhost', {
      method: 'POST', body: '{"note":"more than 16 bytes"}',
    }), 16)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });
});
