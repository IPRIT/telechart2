export const ROOT_CLASS_NAME = 'telechart-root';

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
