import { StyleSheet, Platform } from 'react-native';

// --- Modern Color Palette ---
export const colors = {
  // Core Brand Colors
  primary: '#0066CC',     // A slightly less intense blue
  primaryDarker: '#004C99', // A darker shade for links/pressed states
  secondary: '#F0F4F8',   // A very light grey/blue for backgrounds

  // Neutrals
  background: '#F8F9FA',   // Light grey background for screens
  surface: '#FFFFFF',     // White for cards, inputs, main content areas
  surfaceAlt: '#F0F4F8',   // Same as secondary, good for slightly off-white sections
  border: '#DEE2E6',       // Standard light grey border
  borderLight: '#E9ECEF',  // Even lighter border for subtle dividers

  // Text Colors
  textPrimary: '#212529',   // Very dark grey (almost black)
  textSecondary: '#6C757D', // Medium grey for secondary text/labels
  textDisabled: '#ADB5BD',  // Light grey for disabled states
  textOnPrimary: '#FFFFFF', // White text for use on primary background

  // Status Colors (Consider accessibility - WCAG AA contrast)
  success: '#198754',      // Bootstrap 5 Green
  successBg: '#D1E7DD',     // Light green background
  successBorder: '#A3CFBB', // Green border
  successText: '#0A3622',   // Dark green text

  error: '#DC3545',        // Bootstrap 5 Red
  errorBg: '#F8D7DA',       // Light red background
  errorBorder: '#F1AEB5',   // Red border
  errorText: '#58151C',     // Dark red text

  warning: '#FFC107',      // Bootstrap 5 Yellow (Background/Border)
  warningBg: '#FFF3CD',     // Light yellow background
  warningBorder: '#FFE69C', // Yellow border
  warningText: '#664D03',   // Dark yellow text
};

// --- Consistent Spacing (8-Point Grid System) ---
export const spacing = {
  xxs: 2,   // 2px
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 16,   // 16px (Common margin/padding)
  lg: 24,   // 24px (Larger container padding/margins)
  xl: 32,   // 32px (Section separation)
  xxl: 48,  // 48px (Large spacing)
};

// --- Clear Typography Scale ---
export const typography = {
  // Font Sizes (Based on a common scale)
  fontSizeXXL: 32, // Large Page Titles
  fontSizeXL: 24,  // Main Section Titles
  fontSizeL: 20,   // Sub-Section Titles / Important Text
  fontSizeM: 16,   // Standard Body Text / Buttons / Inputs
  fontSizeS: 14,   // Secondary Text / Captions / Labels
  fontSizeXS: 12,  // Small Print / Footer Notes / Tags

  // Font Weights (Standard weights)
  fontWeightBold: '600',     // Use for titles and emphasis
  fontWeightMedium: '500',   // Use for buttons, slightly important text
  fontWeightNormal: '400',   // Standard body text weight

  // Line Heights (Absolute pixel values)
  // Calculated roughly as fontSize * 1.4/1.5 for readability
  lineHeightXXL: 32 * 1.4, // ~45
  lineHeightXL: 24 * 1.4, // ~34
  lineHeightL: 20 * 1.5,  // 30
  lineHeightM: 16 * 1.5,  // 24
  lineHeightS: 14 * 1.5,  // 21
  lineHeightXS: 12 * 1.5, // 18

  // Families (Keep system default for simplicity unless a specific font is added)
  // fontFamilyDefault: Platform.OS === 'ios' ? 'System' : 'Roboto',
  // fontFamilyMonospace: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
};

// --- Standardized Borders ---
export const borders = {
  radiusSmall: 4,    // Inputs, small elements
  radiusMedium: 8,   // Buttons, cards, standard rounding
  radiusLarge: 16,   // Larger elements, containers
  radiusPill: 9999,  // For pill-shaped buttons/tags

  widthHairline: StyleSheet.hairlineWidth,
  widthThin: 1,
  widthMedium: 2,
};

// Combine into a single theme object (optional but convenient)
const theme = {
  colors,
  spacing,
  typography,
  borders,
};

export default theme; 