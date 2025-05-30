import { useContext } from 'react';
import { ConfigContext } from '../Context/ConfigContext';

export const useConfig = () => {
  return useContext(ConfigContext);
};

