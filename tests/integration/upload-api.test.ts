import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/events/[id]/quotes/extract-document/route';
import { createEvent } from '@/lib/services/eventService';
import { getRawSqlite } from '@/lib/db';
import { testSession } from '../helpers/auth';

function quotationPdf(): string {
  const stream = 'BT /F1 12 Tf 72 720 Td (Catering Rs. 250000) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf;
}

describe('quotation upload route', () => {
  beforeEach(() => { getRawSqlite().exec('DELETE FROM events; DELETE FROM request_limits;'); });

  it('rejects an oversized multipart request before reading the body', async () => {
    const token = testSession({ id: 'usr_demo', name: 'Test Organizer', email: 'test-organizer@example.com' });
    const event = await createEvent({
      title: 'Upload Test Wedding', eventType: 'WEDDING', startDate: '2026-11-20',
      venueCity: 'Pune', targetGuestCount: 100, totalBudgetRupees: 100000,
    }, 'usr_demo');
    const req = new NextRequest(`http://localhost:3000/api/events/${event.event.id}/quotes/extract-document`, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=test', 'content-length': String(6 * 1024 * 1024), authorization: `Bearer ${token}` },
    });
    const result = await POST(req, { params: Promise.resolve({ id: event.event.id }) });
    expect(result.status).toBe(413);
  });

  it('extracts a review candidate from a valid PDF without saving a quote', async () => {
    const token = testSession({ id: 'usr_demo', name: 'Test Organizer', email: 'test-organizer@example.com' });
    const event = await createEvent({
      title: 'Catering PDF Test', eventType: 'WEDDING', startDate: '2027-01-20',
      venueCity: 'Pune', targetGuestCount: 100, totalBudgetRupees: 100000,
    }, 'usr_demo');
    const form = new FormData();
    form.set('file', new File([quotationPdf()], 'catering.pdf', { type: 'application/pdf' }));
    const req = new NextRequest(`http://localhost:3000/api/events/${event.event.id}/quotes/extract-document`, {
      method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form,
    });
    const response = await POST(req, { params: Promise.resolve({ id: event.event.id }) });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.data.quotedAmountPaise).toMatchObject({ value: 25_000_000, status: 'EXTRACTED' });
    expect(result.data.extractionEngine).toBe('heuristic-offline');
    expect(getRawSqlite().prepare('SELECT COUNT(*) AS count FROM vendor_quotes').get()).toEqual({ count: 0 });
  });
});
