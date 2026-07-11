import { render } from '@testing-library/svelte';
import DetailPanelFilmSimulation from './DetailPanelFilmSimulation.svelte';

describe('DetailPanelFilmSimulation', () => {
  it('renders Classic Chrome as a code-native vector banner', () => {
    const { baseElement } = render(DetailPanelFilmSimulation, { filmMode: 'Classic Chrome' });
    const figure = baseElement.querySelector('[data-testid="film-simulation-graphic"]');

    expect(figure?.querySelector('svg')).not.toBeNull();
    expect(figure?.querySelector('img')).toBeNull();
    expect(figure?.querySelector('.classic-chrome-monogram')?.textContent).toBe('CC');
    expect(figure?.querySelectorAll('.vertical-detents line')).toHaveLength(25);
    expect(figure?.querySelectorAll('.bottom-ticks line')).toHaveLength(27);
    expect(figure?.querySelector('.horizontal-detent-highlight')).toBeNull();
  });

  it.each([
    'PROVIA/Standard',
    'Velvia/Vivid',
    'ASTIA/Soft',
    'REALA ACE',
    'Classic Neg.',
    'Nostalgic Neg.',
    'PRO Neg. Hi',
    'PRO Neg. Std',
    'ETERNA/Cinema',
    'ETERNA BLEACH BYPASS',
    'ACROS+Ye Filter',
    'MONOCHROME Red Filter',
    'SEPIA',
  ])('renders %s as a code-native identity banner', (filmMode) => {
    const { baseElement } = render(DetailPanelFilmSimulation, { filmMode });
    const figure = baseElement.querySelector('[data-testid="film-simulation-graphic"]');

    expect(figure?.querySelector('svg')).not.toBeNull();
    expect(figure?.querySelector('img')).toBeNull();
    expect(figure?.querySelectorAll('.vertical-detents line')).toHaveLength(25);
    expect(figure?.querySelectorAll('.bottom-ticks line')).toHaveLength(27);
    expect(figure?.querySelector('.horizontal-detent-highlight')).toBeNull();
  });

  it('falls back to a text badge for an unknown film simulation', () => {
    const { getByText } = render(DetailPanelFilmSimulation, { filmMode: 'Future Film Mode' });

    expect(getByText('Future Film Mode')).toBeTruthy();
  });
});
