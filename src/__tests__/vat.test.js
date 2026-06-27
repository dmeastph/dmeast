import { describe, it, expect } from 'vitest';
import { computeVATBreakdown } from '../lib/pdf.js';

describe('computeVATBreakdown', () => {
  describe('vat_inclusive (default)', () => {
    it('splits 1120 into 1000 net + 120 VAT', () => {
      const result = computeVATBreakdown(1120, 'vat_inclusive');
      expect(result.hasVAT).toBe(true);
      expect(result.total).toBe(1120);
      expect(result.netOfVAT).toBeCloseTo(1000, 1);
      expect(result.vat).toBeCloseTo(120, 1);
    });

    it('net + vat equals total', () => {
      const result = computeVATBreakdown(5678, 'vat_inclusive');
      expect(result.netOfVAT + result.vat).toBeCloseTo(result.total, 0);
    });

    it('handles zero', () => {
      const result = computeVATBreakdown(0, 'vat_inclusive');
      expect(result.total).toBe(0);
      expect(result.vat).toBe(0);
    });
  });

  describe('vat_exempt', () => {
    it('returns hasVAT false with full amount as net', () => {
      const result = computeVATBreakdown(1000, 'vat_exempt');
      expect(result.hasVAT).toBe(false);
      expect(result.netOfVAT).toBe(1000);
      expect(result.vat).toBe(0);
    });
  });

  describe('zero_rated', () => {
    it('returns hasVAT false', () => {
      const result = computeVATBreakdown(500, 'zero_rated');
      expect(result.hasVAT).toBe(false);
      expect(result.vat).toBe(0);
    });
  });

  it('defaults to vat_inclusive when no treatment given', () => {
    const withDefault = computeVATBreakdown(1120);
    const explicit = computeVATBreakdown(1120, 'vat_inclusive');
    expect(withDefault.vat).toBeCloseTo(explicit.vat, 2);
  });

  it('handles string number input', () => {
    const result = computeVATBreakdown('1120', 'vat_inclusive');
    expect(result.total).toBe(1120);
  });
});
