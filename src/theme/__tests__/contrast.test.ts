import { describe, expect, it } from 'vitest';

import { darkPalette, lightPalette } from '../tokens';

// WCAG relative luminance of an opaque sRGB color, independent of RN rendering.
function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(foreground: string, background: string) {
  const [low, high] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  return (high! + 0.05) / (low! + 0.05);
}

for (const [name, p] of [['light', lightPalette], ['dark', darkPalette]] as const) {
  describe(`${name} brand and semantic accessibility`, () => {
    it('keeps normal and pressed primary/emergency labels at AA body-text contrast', () => {
      for (const [label, fill] of [[p.onPrimary, p.primary], [p.onPrimary, p.primaryPressed], [p.onColor, p.sos], [p.onColor, p.sosPressed]] as const) {
        expect(contrast(label, fill)).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('keeps body, supporting text and links readable on their actual surfaces', () => {
      for (const background of [p.bg, p.surface, p.surfaceAlt]) {
        for (const foreground of [p.ink, p.inkMuted, p.inkFaint, p.primaryText]) {
          expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it('keeps branded selections and explicit semantic labels readable', () => {
      for (const [foreground, background] of [[p.primaryText, p.primaryBg], [p.successText, p.successBg], [p.warningText, p.warningBg], [p.dangerText, p.dangerBg], [p.infoText, p.infoBg]] as const) {
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.inkMuted, background)).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('preserves a visible boundary for enabled controls on the surrounding surface', () => {
      for (const foreground of [p.primary, p.sos, p.borderStrong]) {
        expect(contrast(foreground, p.surface)).toBeGreaterThanOrEqual(3);
      }
    });
  });
}
