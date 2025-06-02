import { createTokens, createTamagui } from 'tamagui';
import brandTokens from './src/brand/tokens';

const tokens = createTokens({
  color: {
    primary: brandTokens.colors.primary,
    primaryDark: brandTokens.colors.primaryDark,
    secondary: brandTokens.colors.secondary,
    background: brandTokens.colors.background,
    surface: brandTokens.colors.surface,
    text: brandTokens.colors.text,
    textSecondary: brandTokens.colors.textSecondary,
    border: brandTokens.colors.border,
    success: brandTokens.colors.success,
    warning: brandTokens.colors.warning,
    error: brandTokens.colors.error,
  },
  radius: {
    0: 0,
    1: brandTokens.radius.sm,
    2: brandTokens.radius.md,
    3: brandTokens.radius.lg,
    4: brandTokens.radius.xl,
  },
  space: {
    0: 0,
    1: brandTokens.spacing.xs,
    2: brandTokens.spacing.sm,
    3: brandTokens.spacing.md,
    4: brandTokens.spacing.lg,
    5: brandTokens.spacing.xl,
  },
  size: {
    0: 0,
    1: brandTokens.spacing.xs,
    2: brandTokens.spacing.sm,
    3: brandTokens.spacing.md,
    4: brandTokens.spacing.lg,
    5: brandTokens.spacing.xl,
  },
});

const config = createTamagui({
  tokens,
  themes: {
    light: {
      background: tokens.color.background,
      backgroundHover: tokens.color.surface,
      color: tokens.color.text,
      colorHover: tokens.color.textSecondary,
      borderColor: tokens.color.border,
      primary: tokens.color.primary,
      secondary: tokens.color.secondary,
    },
    dark: {
      background: '#000000',
      backgroundHover: '#1a1a1a',
      color: '#ffffff',
      colorHover: '#e5e5e5',
      borderColor: '#333333',
      primary: tokens.color.primary,
      secondary: tokens.color.secondary,
    },
  },
  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  },
});

export default config;

export type Conf = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}