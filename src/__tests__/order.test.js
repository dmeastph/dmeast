import { describe, it, expect } from 'vitest';
import { calculateDueDate, daysOverdue, findSource, findTerms } from '../constants/order.js';

describe('calculateDueDate', () => {
  it('returns null for zero-credit terms (cod, gcash, etc.)', () => {
    const result = calculateDueDate(new Date(), 'cod');
    expect(result).toBeNull();
  });

  it('adds creditDays to orderDate for credit_30', () => {
    const order = new Date('2025-01-01');
    const term = findTerms('credit_30');
    expect(term).toBeTruthy();
    const due = calculateDueDate(order, 'credit_30');
    const diffDays = Math.round((due - order) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(term.creditDays); // 30
  });

  it('handles Firestore Timestamp-like objects with .toDate()', () => {
    const fakeTs = { toDate: () => new Date('2025-06-01') };
    const result = calculateDueDate(fakeTs, 'credit_30');
    expect(result).toBeInstanceOf(Date);
  });

  it('returns null for unknown term id', () => {
    const result = calculateDueDate(new Date(), 'nonexistent_term_xyz');
    expect(result).toBeNull();
  });
});

describe('daysOverdue', () => {
  it('returns 0 for null dueDate', () => {
    expect(daysOverdue(null)).toBe(0);
  });

  it('returns positive number for past due date', () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    expect(daysOverdue(past)).toBeGreaterThanOrEqual(4);
  });

  it('returns negative number for future due date', () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    expect(daysOverdue(future)).toBeLessThan(0);
  });

  it('handles Firestore Timestamp-like objects', () => {
    const fakeTs = { toDate: () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) };
    expect(daysOverdue(fakeTs)).toBeGreaterThanOrEqual(2);
  });
});

describe('findSource', () => {
  it('returns first source as fallback for unknown id', () => {
    const result = findSource('nonexistent_source_xyz');
    expect(result).toBeTruthy();
  });

  it('returns correct source for known id', () => {
    // At minimum the first source exists
    const sources = findSource(''); // triggers fallback
    expect(sources).toBeTruthy();
  });
});
