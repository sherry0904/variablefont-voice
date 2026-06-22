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

export interface FontConfig {
  id: string;
  name: string;
  cssFamily: string;
  defaultText: string;
  playgroundText?: string;
  devOnly?: boolean;
  supportedAxes: string[]; // e.g. ['wdth', 'wght', 'slnt', 'GRAD']
  axes: Record<string, AxisConfig>;
}

export const DEFAULT_FONT_ID = 'variableMusako';

export const VARIABLE_FONTS: Record<string, FontConfig> = {
  variableMusako: {
    id: 'variableMusako',
    name: 'Variable musako',
    cssFamily: "'Variable musako', sans-serif",
    defaultText: 'Dyna',
    playgroundText: 'Dyna',
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
