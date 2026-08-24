import { describe, expect, it } from 'vitest';

import { EMERGENCY_NUMBERS, FACILITIES, FIRST_AID_GUIDES } from '@/data';
import { messages } from '@/i18n/messages';

describe('embedded Mali safety data', () => {
  it('keeps every official short number unique, sourced and directly dialable', () => {
    const officialShort = EMERGENCY_NUMBERS.filter(({ status, number }) => status === 'official' && number.length === 3);
    expect(new Set(officialShort.map(({ number }) => number)).size).toBe(officialShort.length);
    expect(officialShort.map(({ number }) => number)).toEqual(expect.arrayContaining(['101', '111', '122', '133', '135', '144', '145']));
    for (const item of officialShort) {
      expect(item.dialNumber).toBe(item.number);
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      expect(item.verifiedAt).toMatch(/^2026-/);
    }
  });

  it('includes a broad set of national, water and electricity contacts', () => {
    expect(EMERGENCY_NUMBERS.length).toBeGreaterThanOrEqual(27);
    expect(EMERGENCY_NUMBERS.some(({ dialNumber }) => dialNumber === '20704100')).toBe(true);
    expect(EMERGENCY_NUMBERS.some(({ dialNumber }) => dialNumber === '36077')).toBe(true);
    expect(EMERGENCY_NUMBERS.some(({ name }) => name.includes('dépannage rive gauche'))).toBe(true);
    expect(EMERGENCY_NUMBERS.some(({ name }) => name.includes('dépannage rive droite'))).toBe(true);
    for (const item of EMERGENCY_NUMBERS) {
      expect(item.dialNumber).toMatch(/^\d+$/);
      expect(item.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it('keeps facilities inside the Bamako pack with traceable OSM identifiers', () => {
    expect(FACILITIES.length).toBeGreaterThanOrEqual(10);
    const osmKeys = new Set<string>();
    for (const facility of FACILITIES) {
      expect(facility.latitude).toBeGreaterThan(12.45);
      expect(facility.latitude).toBeLessThan(12.8);
      expect(facility.longitude).toBeGreaterThan(-8.2);
      expect(facility.longitude).toBeLessThan(-7.8);
      expect(facility.source).toBe('openstreetmap');
      expect(facility.osmType).toBeTruthy();
      expect(facility.osmId).toBeTypeOf('number');
      const key = `${facility.osmType}/${facility.osmId}`;
      expect(osmKeys.has(key)).toBe(false);
      osmKeys.add(key);
    }
  });

  it('ships real French and Bambara guide copy without system-TTS placeholders', () => {
    expect(FIRST_AID_GUIDES).toHaveLength(10);
    for (const guide of FIRST_AID_GUIDES) {
      expect(guide.title.trim().length).toBeGreaterThan(3);
      expect(guide.bambaraTitle.trim().length).toBeGreaterThan(3);
      expect(guide.bambaraTitle.toLowerCase()).not.toContain('audio bambara à fournir');
      expect(guide.summaryBm?.trim().length ?? 0).toBeGreaterThan(10);
      for (const step of guide.steps) {
        expect(step.fr.trim().length).toBeGreaterThan(12);
        expect(step.bm.trim().length).toBeGreaterThan(12);
        expect(step.bm.toLowerCase()).not.toContain('à enregistrer');
        expect(step.bm).not.toBe(step.fr);
      }
    }
  });

  it('keeps matching FR/BM UI message keys', () => {
    expect(Object.keys(messages.fr).sort()).toEqual(Object.keys(messages.bm).sort());
  });
});
