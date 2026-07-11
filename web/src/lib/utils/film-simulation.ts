import type { FilmSimulationBannerId } from './film-simulation-banner';

export type FilmSimulationGraphic = {
  label: string;
  src: string;
  banner?: FilmSimulationBannerId;
};

const graphic = (label: string, filename: string, banner?: FilmSimulationBannerId): FilmSimulationGraphic => ({
  label,
  src: `/film-simulations/${filename}.png`,
  banner,
});

const graphics = {
  acros: graphic('ACROS', 'acros', 'acros'),
  acrosGreen: graphic('ACROS+ G FILTER', 'acros-g-filter', 'acros'),
  acrosRed: graphic('ACROS+ R FILTER', 'acros-r-filter', 'acros'),
  acrosYellow: graphic('ACROS+ Ye FILTER', 'acros-ye-filter', 'acros'),
  astia: graphic('ASTIA', 'astia', 'astia'),
  classicChrome: graphic('CLASSIC CHROME', 'classic-chrome'),
  classicNegative: graphic('CLASSIC Neg.', 'classic-neg', 'classicNeg'),
  eterna: graphic('ETERNA', 'eterna', 'eterna'),
  eternaBleachBypass: graphic('ETERNA BLEACH BYPASS', 'eterna-bleach-bypass', 'eternaBleachBypass'),
  monochrome: graphic('MONOCHROME', 'monochrome', 'monochrome'),
  monochromeGreen: graphic('MONOCHROME+ G FILTER', 'monochrome-g-filter', 'monochrome'),
  monochromeRed: graphic('MONOCHROME+ R FILTER', 'monochrome-r-filter', 'monochrome'),
  monochromeYellow: graphic('MONOCHROME+ Ye FILTER', 'monochrome-ye-filter', 'monochrome'),
  nostalgicNegative: graphic('NOSTALGIC Neg.', 'nostalgic-neg', 'nostalgicNeg'),
  proNegHi: graphic('PRO Neg. Hi', 'pro-neg-hi', 'proNegHi'),
  proNegStd: graphic('PRO Neg. Std', 'pro-neg-std', 'proNegStd'),
  provia: graphic('PROVIA', 'provia', 'provia'),
  realaAce: graphic('REALA ACE', 'reala-ace', 'realaAce'),
  sepia: graphic('SEPIA', 'sepia', 'sepia'),
  velvia: graphic('Velvia', 'velvia', 'velvia'),
};

const hasFilter = (value: string, color: 'green' | 'red' | 'yellow') => {
  const aliases = color === 'yellow' ? ['yellow', ' ye '] : [color];
  return aliases.some((alias) => value.includes(alias));
};

export const getFilmSimulationGraphic = (filmMode: string): FilmSimulationGraphic | undefined => {
  const value = ` ${filmMode
    .toLowerCase()
    .replaceAll(/[+._/-]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()} `;

  if (value.includes(' reala ace ')) {
    return graphics.realaAce;
  }

  if (value.includes(' bleach bypass ')) {
    return graphics.eternaBleachBypass;
  }

  if (value.includes(' nostalgic neg')) {
    return graphics.nostalgicNegative;
  }

  if (value.includes(' classic neg')) {
    return graphics.classicNegative;
  }

  if (value.includes(' classic chrome ')) {
    return graphics.classicChrome;
  }

  if (value.includes(' pro neg hi ')) {
    return graphics.proNegHi;
  }

  if (value.includes(' pro neg std ')) {
    return graphics.proNegStd;
  }

  if (value.includes(' acros ')) {
    if (hasFilter(value, 'green')) {
      return graphics.acrosGreen;
    }
    if (hasFilter(value, 'red')) {
      return graphics.acrosRed;
    }
    if (hasFilter(value, 'yellow')) {
      return graphics.acrosYellow;
    }
    return graphics.acros;
  }

  if (value.includes(' monochrome ') || value.includes(' b&w ')) {
    if (hasFilter(value, 'green')) {
      return graphics.monochromeGreen;
    }
    if (hasFilter(value, 'red')) {
      return graphics.monochromeRed;
    }
    if (hasFilter(value, 'yellow')) {
      return graphics.monochromeYellow;
    }
    return graphics.monochrome;
  }

  if (value.includes(' sepia ')) {
    return graphics.sepia;
  }

  if (value.includes(' eterna ')) {
    return graphics.eterna;
  }

  if (value.includes(' astia ') || value.includes(' studio portrait ')) {
    return graphics.astia;
  }

  if (value.includes(' velvia ') || value.includes(' fujichrome ')) {
    return graphics.velvia;
  }

  if (value.includes(' provia ') || value.includes(' standard ')) {
    return graphics.provia;
  }
};
