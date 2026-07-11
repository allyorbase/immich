import { describe, expect, it } from 'vitest';
import { getFilmSimulationGraphic } from './film-simulation';

describe(getFilmSimulationGraphic.name, () => {
  it.each([
    ['F0/Standard (Provia)', 'provia.png'],
    ['F1b/Studio Portrait Smooth Skin Tone (Astia)', 'astia.png'],
    ['F2/Fujichrome (Velvia)', 'velvia.png'],
    ['Classic Chrome', 'classic-chrome.png'],
    ['Pro Neg. Std', 'pro-neg-std.png'],
    ['Classic Negative', 'classic-neg.png'],
    ['Bleach Bypass', 'eterna-bleach-bypass.png'],
    ['Nostalgic Neg', 'nostalgic-neg.png'],
    ['Reala ACE', 'reala-ace.png'],
    ['ACROS+Ye Filter', 'acros-ye-filter.png'],
    ['Monochrome Red Filter', 'monochrome-r-filter.png'],
  ])('maps %s to the official graphic', (filmMode, filename) => {
    expect(getFilmSimulationGraphic(filmMode)?.src).toBe(`/film-simulations/${filename}`);
  });

  it('returns undefined for an unknown mode', () => {
    expect(getFilmSimulationGraphic('Future Film Mode')).toBeUndefined();
  });

  it.each([
    ['F0/Standard (Provia)', 'provia'],
    ['F1b/Studio Portrait Smooth Skin Tone (Astia)', 'astia'],
    ['F2/Fujichrome (Velvia)', 'velvia'],
    ['Pro Neg. Std', 'proNegStd'],
    ['Classic Negative', 'classicNeg'],
    ['Bleach Bypass', 'eternaBleachBypass'],
    ['Nostalgic Neg', 'nostalgicNeg'],
    ['Reala ACE', 'realaAce'],
    ['ACROS+Ye Filter', 'acros'],
    ['Monochrome Red Filter', 'monochrome'],
    ['SEPIA', 'sepia'],
  ])('maps %s to the %s vector identity', (filmMode, banner) => {
    expect(getFilmSimulationGraphic(filmMode)?.banner).toBe(banner);
  });
});
