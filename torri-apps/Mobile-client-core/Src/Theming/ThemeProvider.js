import React from 'react';
import { ThemeContext } from '../Context/ThemeContext';

export const ThemeProvider = ({ children, theme }) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

