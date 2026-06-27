import { describe, it, expect } from 'vitest';
import { formatPHP, formatUSD, PHP_TO_USD } from '../utils/format.js';

describe('formatPHP', () => {
  it('formats zero', () => expect(formatPHP(0)).toBe('₱0'));
  it('formats integer', () => expect(formatPHP(1000)).toMatch(/₱1[,.]?000/));
  it('formats float', () => expect(formatPHP(1234.5)).toMatch(/₱1[,.]?234/));
  it('handles string input', () => expect(formatPHP('500')).toBe('₱500'));
  it('handles NaN input (returns ₱NaN — matches toLocaleString behavior)', () => expect(formatPHP(NaN)).toBe('₱NaN'));
});

describe('formatUSD', () => {
  it('converts PHP to USD using PHP_TO_USD rate', () => {
    const php = 1000;
    const expected = `≈ $${(php * PHP_TO_USD).toFixed(2)} USD`;
    expect(formatUSD(php)).toBe(expected);
  });
  it('returns 2 decimal places', () => {
    expect(formatUSD(100)).toMatch(/\$\d+\.\d{2} USD/);
  });
  it('handles zero', () => expect(formatUSD(0)).toBe('≈ $0.00 USD'));
  it('handles string input', () => expect(formatUSD('200')).toMatch(/\$\d+\.\d{2} USD/));
});
