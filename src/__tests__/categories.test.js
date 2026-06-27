import { describe, it, expect } from 'vitest';
import { filterPharmaPublic, HIDE_PHARMA_PUBLIC, PUBLIC_CATEGORIES, CATEGORIES } from '../constants/categories.js';

describe('filterPharmaPublic', () => {
  const items = [
    { id: 'a', category: 'pharma' },
    { id: 'b', category: 'equipment' },
    { id: 'c', category: 'pharma' },
    { id: 'd', category: 'consumables' },
  ];

  it('removes pharma items when HIDE_PHARMA_PUBLIC is true', () => {
    if (!HIDE_PHARMA_PUBLIC) return; // skip if flag is off
    const result = filterPharmaPublic(items);
    expect(result.every(i => i.category !== 'pharma')).toBe(true);
  });

  it('returns non-pharma items unchanged', () => {
    const result = filterPharmaPublic(items);
    expect(result.find(i => i.id === 'b')).toBeTruthy();
    expect(result.find(i => i.id === 'd')).toBeTruthy();
  });

  it('handles empty array', () => {
    expect(filterPharmaPublic([])).toEqual([]);
  });
});

describe('HIDE_PHARMA_PUBLIC flag', () => {
  it('is true (PayRex compliance — do not change without PayRex approval)', () => {
    expect(HIDE_PHARMA_PUBLIC).toBe(true);
  });
});

describe('PUBLIC_CATEGORIES', () => {
  it('does not include pharma category when HIDE_PHARMA_PUBLIC is true', () => {
    if (!HIDE_PHARMA_PUBLIC) return;
    expect(PUBLIC_CATEGORIES.find(c => c.id === 'pharma')).toBeUndefined();
  });

  it('is a subset of CATEGORIES', () => {
    PUBLIC_CATEGORIES.forEach(pub => {
      expect(CATEGORIES.find(c => c.id === pub.id)).toBeTruthy();
    });
  });
});
