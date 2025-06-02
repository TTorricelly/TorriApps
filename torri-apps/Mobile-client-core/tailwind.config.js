const brandTokens = require('./src/brand/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './App.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: brandTokens.colors.primary,
        'primary-dark': brandTokens.colors.primaryDark,
        secondary: brandTokens.colors.secondary,
        background: brandTokens.colors.background,
        surface: brandTokens.colors.surface,
        text: brandTokens.colors.text,
        'text-secondary': brandTokens.colors.textSecondary,
        border: brandTokens.colors.border,
        success: brandTokens.colors.success,
        warning: brandTokens.colors.warning,
        error: brandTokens.colors.error,
      },
      borderRadius: {
        'brand-sm': brandTokens.radius.sm,
        'brand-md': brandTokens.radius.md,
        'brand-lg': brandTokens.radius.lg,
        'brand-xl': brandTokens.radius.xl,
      },
      spacing: {
        'brand-xs': brandTokens.spacing.xs,
        'brand-sm': brandTokens.spacing.sm,
        'brand-md': brandTokens.spacing.md,
        'brand-lg': brandTokens.spacing.lg,
        'brand-xl': brandTokens.spacing.xl,
      },
      fontFamily: {
        'brand-regular': [brandTokens.typography.fontFamily.regular],
        'brand-medium': [brandTokens.typography.fontFamily.medium],
        'brand-bold': [brandTokens.typography.fontFamily.bold],
      },
      fontSize: {
        'brand-xs': [brandTokens.typography.fontSize.xs],
        'brand-sm': [brandTokens.typography.fontSize.sm],
        'brand-md': [brandTokens.typography.fontSize.md],
        'brand-lg': [brandTokens.typography.fontSize.lg],
        'brand-xl': [brandTokens.typography.fontSize.xl],
        'brand-2xl': [brandTokens.typography.fontSize['2xl']],
      },
    },
  },
  plugins: [],
};