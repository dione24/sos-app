import { describe, expect, it, vi } from 'vitest';

const deleted = vi.hoisted(() => [] as unknown[][]);
vi.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///app-private/cache/' },
  File: class {
    exists = true;
    constructor(...parts: unknown[]) { this.parts = parts; }
    parts: unknown[];
    delete() { deleted.push(this.parts); }
  },
  Directory: class {
    exists = true;
    constructor(...parts: unknown[]) { this.parts = parts; }
    parts: unknown[];
    delete() { deleted.push(this.parts); }
  },
}));

import { clearMedicalTemporaryFiles } from '../medical-files';

describe('medical temporary files cleanup', () => {
  it('only targets private export and picker copies, never the original provider or photo library', () => {
    clearMedicalTemporaryFiles();
    expect(deleted).toEqual([
      ['file:///app-private/cache/', 'dossier-sos-mali.json'],
      ['file:///app-private/cache/', 'DocumentPicker'],
      ['file:///app-private/cache/', 'ImagePicker'],
    ]);
  });
});
