import React, { createContext, useContext } from 'react';

const ConfigContext = createContext();

export const useConfig = () => useContext(ConfigContext);

