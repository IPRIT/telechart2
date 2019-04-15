export const ROOT_CLASS_NAME = 'telechart2-root';

/**
 * @param {string} themeName
 * @returns {string}
 */
export function interpolateThemeClass (themeName) {
  return `${ROOT_CLASS_NAME}_theme_${themeName}`;
}

/**
 * @type {{default: string, dark: string}}
 */
export const ChartThemes = {
  default: 'default',
  dark: 'dark'
};

/**
 * @type {{default: string, dark: string}}
 */
export const ChartThemesColors = {
  default: '#ffffff',
  dark: '#242F3E'
};

export const Colors = {
  default: {
    color: '#FFFFFF',

    sliderBorder: '#C0D1E1',
    sliderOverlay: '#E2EEF9',
    sliderOverlayAlpha: .6,

    // axis
    axisTextColor: '#8E8E93',
    axisTextColorAlpha: 1,
    axisColor: '#182D3B',
    axisColorAlpha: .1,

    // axis for bars
    barAxisTextColorX: '#252529',
    barAxisTextColorAlphaX: .5,
    barAxisTextColorY: '#252529',
    barAxisTextColorAlphaY: .5,
    barAllColor: '#000000',

    // cursor mask
    maskColor: '#FFFFFF',
    maskColorAlpha: .5
  },
  dark: {
    color: '#242F3E',

    sliderBorder: '#56626D',
    sliderOverlay: '#304259',
    sliderOverlayAlpha: .6,

    // axis
    axisTextColor: '#A3B1C2',
    axisTextColorAlpha: .6,
    axisColor: '#FFFFFF',
    axisColorAlpha: .1,

    // axis for bars
    barAxisTextColorX: '#A3B1C2',
    barAxisTextColorAlphaX: .6,
    barAxisTextColorY: '#ECF2F8',
    barAxisTextColorAlphaY: .5,
    barAllColor: '#FFFFFF',

    // cursor mask
    maskColor: '#242F3E',
    maskColorAlpha: .5
  }
};
