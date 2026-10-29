import { describe, it, expect } from 'vitest';
import {
  validatePdfBuffer,
  extractTextFromPdfBuffer,
  extractHeuristicQuotationFields,
  savePrivateQuotationFile,
} from '@/lib/services/quotationExtractionService';
import fs from 'fs';

describe('Quotation Document Upload & Extraction (Unit)', () => {
  const validMinimalPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 120 >>\nstream\nBT /F1 12 Tf 72 712 Td (Royal Catering Services Total: INR 350000 Inclusions: 5-Course Dinner Exclusions: Transportation) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000212 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n384\n%%EOF'
  );

  describe('validatePdfBuffer', () => {
    it('accepts a valid PDF buffer within size limits without throwing', () => {
      expect(() => validatePdfBuffer(validMinimalPdf, 'estimate.pdf')).not.toThrow();
    });

    it('rejects files without valid PDF magic bytes', () => {
      const fakePdf = Buffer.from('NOT A PDF FILE JUST PLAIN TEXT');
      expect(() => validatePdfBuffer(fakePdf, 'fake.pdf')).toThrow(/%PDF-/);
    });

    it('rejects files exceeding 5MB limit', () => {
      const hugeBuffer = Buffer.alloc(5 * 1024 * 1024 + 10);
      hugeBuffer.write('%PDF-1.4', 0);
      expect(() => validatePdfBuffer(hugeBuffer, 'huge.pdf')).toThrow(/5 MB/);
    });

    it('rejects empty buffers', () => {
      const emptyBuffer = Buffer.alloc(0);
      expect(() => validatePdfBuffer(emptyBuffer, 'empty.pdf')).toThrow(/empty/);
    });
  });

  describe('extractTextFromPdfBuffer', () => {
    it('extracts readable text tokens from PDF stream content', () => {
      const extracted = extractTextFromPdfBuffer(validMinimalPdf);
      expect(extracted).toContain('Royal Catering Services');
      expect(extracted).toContain('Total: INR 350000');
    });
  });

  describe('extractHeuristicQuotationFields', () => {
    it('extracts vendor name, amounts, inclusions, and exclusions from text', () => {
      const text = `
        Royal Heritage Catering Quotation
        Date: 2026-11-15
        Valid Until: 2026-12-15
        Total: ₹ 4,50,000 INR
        Payment Terms: 25% advance booking
        Cancellation Policy: Non-refundable advance
        Inclusions: 5-Course Gujarati feast, Welcome mocktails
        Exclusions: Liquor license, Outstation generator charges
      `;

      const candidate = extractHeuristicQuotationFields(text, 'Royal_Catering.pdf', 'doc_123');
      expect(candidate.quotedAmountPaise.value).toBe(45000000); // 4,50,000 * 100
      expect(candidate.currency.value).toBe('INR');
      expect(candidate.quoteDate.value).toBe('2026-11-15');
      expect(candidate.inclusions.value.length).toBeGreaterThanOrEqual(1);
      expect(candidate.exclusions.value.length).toBeGreaterThanOrEqual(1);
      expect(candidate.depositPercentage.value).toBe(25);
      expect(candidate.extractionEngine).toBe('heuristic-offline');
    });
  });

  describe('savePrivateQuotationFile', () => {
    it('saves PDF to private isolated directory with random ID and cleans up', async () => {
      const eventId = 'evt_test_private_doc';
      const result = await savePrivateQuotationFile(eventId, validMinimalPdf, 'vendor_quote.pdf');

      expect(result.privateDocumentId).toMatch(/^doc_/);
      expect(fs.existsSync(result.fullPath)).toBe(true);

      // Clean up test file and dir
      fs.unlinkSync(result.fullPath);
      const dir = result.fullPath.substring(0, result.fullPath.lastIndexOf('\\') || result.fullPath.lastIndexOf('/'));
      try {
        fs.rmdirSync(dir);
      } catch {
        // ignore if not empty
      }
    });
  });
});
