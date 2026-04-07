export interface AxisConfig {
  min: number;
  max: number;
  cssTag?: string;
}

export interface FontConfig {
  id: string;
  name: string;
  cssFamily: string;
  supportedAxes: string[]; // e.g. ['wdth', 'wght', 'slnt', 'GRAD']
  axes: {
    volumeToWidth?: AxisConfig;
    volumeToWeight?: AxisConfig;
    volumeToSlant?: AxisConfig;
    volumeToGrade?: AxisConfig;
    idleWidth?: AxisConfig;
    idleWeight?: AxisConfig;
    idleSlant?: AxisConfig;
    idleGrade?: AxisConfig;
  };
}

export const VARIABLE_FONTS: Record<string, FontConfig> = {
  dfpKingGothic: {
    id: 'dfpKingGothic',
    name: '華康金剛黑',
    cssFamily: "'DFP King Gothic', sans-serif",
    supportedAxes: ['wdth', 'wght'], // Only weight and width supported
    axes: {
      volumeToWidth: { min: 75, max: 100, cssTag: 'wdth' }, // Based on inspection: min 75, max 100
      volumeToWeight: { min: 100, max: 600, cssTag: 'wght' }, // Based on inspection: min 100, max 600
      idleWidth: { min: 90, max: 95 },
      idleWeight: { min: 300, max: 400 },
    }
  },
  robotoFlex: {
    id: 'robotoFlex',
    name: 'Roboto Flex',
    cssFamily: "'Roboto Flex', sans-serif",
    supportedAxes: ['wdth', 'wght', 'slnt', 'GRAD'],
    axes: {
      volumeToWidth: { min: 25, max: 150, cssTag: 'wdth' },
      volumeToWeight: { min: 100, max: 1000, cssTag: 'wght' },
      volumeToSlant: { min: 0, max: -10, cssTag: 'slnt' },
      volumeToGrade: { min: -200, max: 150, cssTag: 'GRAD' },
      idleWidth: { min: 35, max: 40 },
      idleWeight: { min: 450, max: 550 },
      idleSlant: { min: 0, max: 0 },
      idleGrade: { min: -200, max: -100 },
    }
  }
};
