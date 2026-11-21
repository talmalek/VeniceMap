/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ColorGradingSettings {
  brightness: number; // 50 to 160 (default 105%)
  contrast: number; // 60 to 180 (default 118%)
  saturation: number; // 50 to 220 (default 135%)
  clarity: number; // 0 to 100 (default 30%)
  warmth: number; // -40 to +40 (default +6%)
  vibrance: number; // -30 to +50 (default +12%)
  highlights: number; // -30 to +30 (default +5%)
  shadows: number; // -30 to +30 (default -5%)
}

export interface ColorPreset {
  id: string;
  name: string;
  description: string;
  settings: ColorGradingSettings;
}

export const DEFAULT_COLOR_SETTINGS: ColorGradingSettings = {
  brightness: 102,
  contrast: 133,
  saturation: 142,
  clarity: 44,
  warmth: 6,
  vibrance: 9,
  highlights: 15,
  shadows: -14,
};

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'cinematic',
    name: 'Venice Tour Signature',
    description: 'Calibrated high-definition Venetian terracotta roofs, deep lagoon contrast, and 44% clarity sharpness',
    settings: {
      brightness: 102,
      contrast: 133,
      saturation: 142,
      clarity: 44,
      warmth: 6,
      vibrance: 9,
      highlights: 15,
      shadows: -14,
    },
  },
  {
    id: 'vivid-emerald',
    name: 'Vivid Emerald',
    description: 'Intense Mediterranean turquoise waters and radiant daylight on marble facades',
    settings: {
      brightness: 110,
      contrast: 124,
      saturation: 165,
      clarity: 40,
      warmth: -2,
      vibrance: 25,
      highlights: 8,
      shadows: -4,
    },
  },
  {
    id: 'golden-hour',
    name: 'Venetian Sunset',
    description: 'Warm amber tones, romantic twilight glow, and softened deep shadows',
    settings: {
      brightness: 104,
      contrast: 115,
      saturation: 128,
      clarity: 25,
      warmth: 28,
      vibrance: 10,
      highlights: -4,
      shadows: 6,
    },
  },
  {
    id: 'natural-crisp',
    name: 'True-to-Life Crisp',
    description: 'Subtle enhancement preserving natural colors with high-definition clarity',
    settings: {
      brightness: 102,
      contrast: 110,
      saturation: 115,
      clarity: 28,
      warmth: 2,
      vibrance: 6,
      highlights: 0,
      shadows: 0,
    },
  },
  {
    id: 'raw-satellite',
    name: 'Raw Satellite',
    description: 'Untouched Google Maps satellite imagery with zero color modifications',
    settings: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      clarity: 0,
      warmth: 0,
      vibrance: 0,
      highlights: 0,
      shadows: 0,
    },
  },
];

/**
 * Generate CSS filter string and SVG clarity matrix from settings
 */
export function buildCssFilterString(settings: ColorGradingSettings): string {
  const parts: string[] = [];

  // Effective brightness adjusted by exposure/highlights/shadows
  const effectiveBrightness = settings.brightness + settings.highlights * 0.2 + settings.shadows * 0.15;
  parts.push(`brightness(${effectiveBrightness.toFixed(1)}%)`);

  // Contrast
  parts.push(`contrast(${settings.contrast.toFixed(1)}%)`);

  // Saturation & vibrance
  const effectiveSaturation = settings.saturation + settings.vibrance * 0.6;
  parts.push(`saturate(${effectiveSaturation.toFixed(1)}%)`);

  // Warmth (subtle hue shift and sepia balance)
  if (settings.warmth > 0) {
    const sepiaVal = (settings.warmth * 0.35).toFixed(1);
    parts.push(`sepia(${sepiaVal}%)`);
  } else if (settings.warmth < 0) {
    const hueVal = (settings.warmth * 0.3).toFixed(1);
    parts.push(`hue-rotate(${hueVal}deg)`);
  }

  // Clarity/Sharpness via SVG filter reference
  if (settings.clarity > 0) {
    parts.push('url(#venice-clarity-filter)');
  }

  return parts.join(' ');
}
