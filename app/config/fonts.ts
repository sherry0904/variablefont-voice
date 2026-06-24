export interface AxisConfig {
  min: number;
  max: number;
  // Axis input source:
  // - volume: louder input moves the axis toward max.
  // - pitch: higher pitch moves the axis toward max.
  // - pitchInverse: lower pitch moves the axis toward max.
  // - delta: stronger instant volume change moves the axis toward max.
  // - none: audio does not drive this axis; idle/default values are used.
  input?: 'volume' | 'pitch' | 'pitchInverse' | 'delta' | 'none';
  idle?: {
    min: number;
    max: number;
  };
  decimals?: number;
  sliderStep?: number;
}

export interface FontSizeConfig {
  // Responsive preview size: clamp(minRem, preferredVw, maxRem).
  // Tune per font when defaultText gets longer or a font visually looks larger/smaller.
  minRem: number;
  // Main size knob. Lower this first when the preview text takes too much space.
  preferredVw: number;
  // Desktop upper bound. Lower this if large screens feel too oversized.
  maxRem: number;
  // Text length that should keep the full preferredVw size. Lower = long text shrinks sooner.
  fitChars?: number;
  // Smallest auto-shrink ratio for text longer than fitChars. Lower = allow more shrink.
  minScale?: number;
}

export interface FontConfig {
  id: string;
  name: string;
  cssFamily: string;
  defaultText: string;
  playgroundText?: string;
  displaySize?: FontSizeConfig;
  playgroundSize?: FontSizeConfig;
  devOnly?: boolean;
  supportedAxes: string[]; // e.g. ['wdth', 'wght', 'slnt', 'GRAD']
  axes: Record<string, AxisConfig>;
}

export const DEFAULT_FONT_ID = 'variableMusako';

const DEFAULT_DISPLAY_SIZE: FontSizeConfig = {
  minRem: 4,
  preferredVw: 12,
  maxRem: 14,
  fitChars: 5,
  minScale: 0.72,
};

const DEFAULT_PLAYGROUND_SIZE: FontSizeConfig = {
  minRem: 3,
  preferredVw: 10,
  maxRem: 12,
  fitChars: 7,
  minScale: 0.68,
};

const countDisplayChars = (text: string) => {
  return Array.from(text.replace(/\s/g, '')).length || 1;
};

export const getResponsiveFontSize = (config: FontSizeConfig | undefined, text: string, fallback: FontSizeConfig) => {
  const size = { ...fallback, ...config };
  const fitChars = size.fitChars ?? countDisplayChars(text);
  const scale = Math.max(size.minScale ?? 0.7, Math.min(1, fitChars / countDisplayChars(text)));

  return `clamp(${size.minRem}rem, ${(size.preferredVw * scale).toFixed(2)}vw, ${size.maxRem}rem)`;
};

export const getDisplayFontSize = (font: FontConfig) => {
  return getResponsiveFontSize(font.displaySize, font.defaultText, DEFAULT_DISPLAY_SIZE);
};

export const getPlaygroundFontSize = (font: FontConfig) => {
  return getResponsiveFontSize(font.playgroundSize, font.playgroundText ?? font.defaultText, DEFAULT_PLAYGROUND_SIZE);
};

export const VARIABLE_FONTS: Record<string, FontConfig> = {
  variableMusako: {
    id: 'variableMusako',
    name: 'Variable musako',
    cssFamily: "'Variable musako', sans-serif",
    defaultText: 'DynaFont',
    playgroundText: 'DynaFont',
    // displaySize controls the home experience; playgroundSize controls /playground preview.
    // Quick tuning: reduce preferredVw/maxRem when text is too large, reduce minScale for longer words.
    displaySize: { preferredVw: 9.5, maxRem: 11, fitChars: 6, minScale: 0.7 },
    playgroundSize: { preferredVw: 8.5, maxRem: 10, fitChars: 7, minScale: 0.7 },
    supportedAxes: ['wght', 'wdth', 'HIGH'],
    axes: {
      wght: { min: 100, max: 900, input: 'pitchInverse', idle: { min: 300, max: 500 } },
      wdth: { min: 1, max: 9, input: 'volume', idle: { min: 4, max: 5.5 }, decimals: 2, sliderStep: 0.1 },
      HIGH: { min: 1, max: 9, input: 'pitch', idle: { min: 4.5, max: 6 }, decimals: 2, sliderStep: 0.1 },
    }
  },
  dfpKingGothic: {
    id: 'dfpKingGothic',
    name: '華康金剛黑',
    cssFamily: "'DFP King Gothic', sans-serif",
    defaultText: 'VOICE',
    playgroundText: 'VOICE\n可變字型',
    devOnly: true,
    supportedAxes: ['wdth', 'wght'], // Only weight and width supported
    axes: {
      wdth: { min: 75, max: 100, input: 'volume', idle: { min: 90, max: 95 } },
      wght: { min: 100, max: 600, input: 'pitchInverse', idle: { min: 300, max: 400 } },
    }
  },
  robotoFlex: {
    id: 'robotoFlex',
    name: 'Roboto Flex',
    cssFamily: "'Roboto Flex', sans-serif",
    defaultText: 'FLEX',
    playgroundText: 'FLEX\nRoboto',
    devOnly: true,
    supportedAxes: ['wdth', 'wght', 'slnt', 'GRAD'],
    axes: {
      wdth: { min: 25, max: 150, input: 'volume', idle: { min: 35, max: 40 } },
      wght: { min: 100, max: 1000, input: 'pitchInverse', idle: { min: 450, max: 550 } },
      slnt: { min: 0, max: -10, input: 'delta', idle: { min: 0, max: 0 }, decimals: 3 },
      GRAD: { min: -200, max: 150, input: 'volume', idle: { min: -200, max: -100 } },
    }
  }
};

export const getVisibleFonts = (isDevMode: boolean) => {
  return Object.values(VARIABLE_FONTS).filter((font) => isDevMode || !font.devOnly);
};
