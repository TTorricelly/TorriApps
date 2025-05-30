import { defaultTheme } from './defaultTheme';

export const createTheme = (customTheme = {}) => {
  return {
    ...defaultTheme,
    ...customTheme,
    colors: {
      ...defaultTheme.colors,
      ...customTheme.colors
    }
  };
};

