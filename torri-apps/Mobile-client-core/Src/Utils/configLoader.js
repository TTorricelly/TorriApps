export const loadConfig = (brandConfig) => {
  // Load brand-specific configuration
  return {
    ...brandConfig,
    apiUrl: brandConfig.apiUrl || 'https://api.default.com'
  };
};

