import { StyleSheet, Platform, Dimensions } from 'react-native';
import type { ViewStyle, TextStyle, ImageStyle, FlexAlignType } from 'react-native';

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

// --- Text Fragments Base Definitions ---
// These are defined separately so they can be referenced within commonStyles
const baseText: TextStyle = {
  fontSize: typography.fontSizeM,
  fontWeight: typography.fontWeightNormal as '400',
  lineHeight: typography.lineHeightM,
  color: colors.textPrimary,
};
const secondaryTextBase: TextStyle = {
  fontSize: typography.fontSizeM,
  fontWeight: typography.fontWeightNormal as '400',
  lineHeight: typography.lineHeightM,
  color: colors.textSecondary,
};
const smallSecondaryText: TextStyle = {
  fontSize: typography.fontSizeS,
  fontWeight: typography.fontWeightNormal as '400',
  lineHeight: typography.lineHeightS,
  color: colors.textSecondary,
};
const labelBase: TextStyle = {
  fontSize: typography.fontSizeS,
  fontWeight: typography.fontWeightMedium as '500',
  lineHeight: typography.lineHeightS,
  color: colors.textSecondary,
};
const titleXL: TextStyle = {
  fontSize: typography.fontSizeXL,
  fontWeight: typography.fontWeightBold as '600',
  lineHeight: typography.lineHeightXL,
  color: colors.textPrimary,
};
const titleL: TextStyle = {
  fontSize: typography.fontSizeL,
  fontWeight: typography.fontWeightBold as '600',
  lineHeight: typography.lineHeightL,
  color: colors.textPrimary,
};
const titleM: TextStyle = {
  fontSize: typography.fontSizeM,
  fontWeight: typography.fontWeightBold as '600',
  lineHeight: typography.lineHeightM,
  color: colors.textPrimary,
};
const errorTextBase: TextStyle = {
  color: colors.error,
  textAlign: 'center',
  fontSize: typography.fontSizeS, // Common base size
  lineHeight: typography.lineHeightS,
};
const successTextBase: TextStyle = {
  color: colors.success,
  textAlign: 'center',
  fontSize: typography.fontSizeS, // Common base size
  lineHeight: typography.lineHeightS,
};
const linkTextBase: TextStyle = {
    fontSize: typography.fontSizeS,
    color: colors.primary,
    textDecorationLine: 'underline',
};
const buttonTextBase: TextStyle = {
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightMedium as '500',
    lineHeight: typography.lineHeightM,
    textAlign: 'center',
};

// --- Common Style Fragments ---
// Base styles used across multiple screens
const commonStyles = {
  // Layout & Containers
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  container: {
    flex: 1,
    padding: spacing.lg,
  } as ViewStyle,
  keyboardAvoidingView: {
    flex: 1,
  } as ViewStyle,
  scrollViewContentPadding: {
    padding: spacing.lg,
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center' as FlexAlignType,
  } as ViewStyle,
  centeredContainer: { // Used in ReportEditorScreen.centered & common status containers
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center' as FlexAlignType,
    padding: spacing.lg,
    backgroundColor: colors.background,
  } as ViewStyle,

  // Text Fragments (References to constants defined above)
  baseText,
  secondaryTextBase,
  smallSecondaryText,
  labelBase,
  titleXL,
  titleL,
  titleM,
  errorTextBase,
  successTextBase,
  linkTextBase,
  buttonTextBase,

  // Form Elements
  formLabel: {
    ...labelBase,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  } as TextStyle,
  formTextInput: {
    ...baseText,
    paddingVertical: spacing.md, // Override line height via padding
    backgroundColor: colors.surface,
    borderRadius: borders.radiusMedium,
    paddingHorizontal: spacing.md,
    borderWidth: borders.widthThin,
    borderColor: colors.borderLight,
  } as TextStyle,
  formFieldContainer: {
    marginBottom: spacing.md,
  } as ViewStyle,

  // List Elements
  listRowContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center' as FlexAlignType,
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
    minHeight: 44,
  } as ViewStyle,
  firstRowInSection: {
    borderTopWidth: borders.widthHairline,
    borderTopColor: colors.borderLight,
  } as ViewStyle,
  listSectionHeader: {
    ...labelBase,
    paddingBottom: spacing.xs,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  } as TextStyle,
  iconContainer24: {
    marginRight: spacing.md,
    width: 24,
    height: 24,
    alignItems: 'center' as FlexAlignType,
    justifyContent: 'center',
  } as ViewStyle,
  listValueContainer: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center' as FlexAlignType,
    marginLeft: spacing.sm,
  } as ViewStyle,
  listValueText: {
    ...secondaryTextBase,
    textAlign: 'right',
  } as TextStyle,
  listDisclosureIcon: {
    marginLeft: spacing.xs,
  } as ViewStyle,

  // Header Elements
  headerBackButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center' as FlexAlignType,
    paddingLeft: Platform.OS === 'ios' ? spacing.sm : spacing.md,
  } as ViewStyle,
  headerBackTitle: {
    ...baseText,
    marginLeft: spacing.xs,
  } as TextStyle,
};

// --- Screen-Specific Common Style Objects ---

// For simple form screens (e.g., Edit Name, Edit Phone)
const basicFormScreenStyles = {
    safeArea: commonStyles.safeArea,
    container: commonStyles.container,
    loadingContainer: commonStyles.loadingContainer,
    errorText: { // Use base error text
      ...commonStyles.errorTextBase,
      marginBottom: spacing.md,
    } as TextStyle,
    label: commonStyles.formLabel,
    textInput: commonStyles.formTextInput,
};

// For form screens with larger text areas (e.g., Edit Schema, Edit Prompt)
const textAreaFormScreenStyles = {
    safeArea: commonStyles.safeArea,
    keyboardAvoidingView: commonStyles.keyboardAvoidingView,
    scrollViewContent: commonStyles.scrollViewContentPadding,
    loadingContainer: {
        ...commonStyles.loadingContainer,
        padding: spacing.lg,
    } as ViewStyle,
    errorText: { // Use base error text
        ...commonStyles.errorTextBase,
        marginBottom: spacing.md,
    } as TextStyle,
    fieldContainer: {
      marginBottom: spacing.xl,
    } as ViewStyle,
    label: commonStyles.formLabel,
};

// For basic list screens (e.g., Browse, Project Reports)
const basicListScreenStyles = {
    safeArea: commonStyles.safeArea,
    statusContainer: {
        ...commonStyles.centeredContainer,
        padding: spacing.xl,
    } as ViewStyle,
    errorText: {
        ...commonStyles.errorTextBase,
        fontWeight: typography.fontWeightMedium as '500',
        fontSize: typography.fontSizeM,
    } as TextStyle,
    emptyText: {
        ...commonStyles.secondaryTextBase,
        textAlign: 'center',
        fontStyle: 'italic',
    } as TextStyle,
    rowContainer: {
        ...commonStyles.listRowContainer,
        minHeight: 48,
    } as ViewStyle,
    firstRow: commonStyles.firstRowInSection,
    iconContainer: commonStyles.iconContainer24,
    rowText: {
        ...commonStyles.baseText,
        flex: 1,
    } as TextStyle,
    disclosureIcon: {
        marginLeft: spacing.sm,
    } as ViewStyle,
};

// For Marketing Card sections (Login, Sign Up)
const marketingCardStyles = {
    marketingCard: {
        backgroundColor: colors.surfaceAlt || '#f7f7f9',
        padding: spacing.lg,
        borderRadius: borders.radiusLarge,
        marginBottom: spacing.md,
        maxWidth: 420,
        alignSelf: 'center' as FlexAlignType,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
    } as ViewStyle,
    marketingHeadline: {
        ...commonStyles.titleL,
        textAlign: 'center',
    } as TextStyle,
    marketingSubheadline: {
        ...commonStyles.smallSecondaryText,
        textAlign: 'center',
        marginBottom: spacing.lg,
    } as TextStyle,
    marketingWorkflowRow: {
        flexDirection: 'row',
        alignItems: 'flex-end' as FlexAlignType,
        justifyContent: 'center',
        marginBottom: spacing.lg,
        flexWrap: 'wrap',
        width: '100%',
    } as ViewStyle,
    workflowStep: {
        alignItems: 'center' as FlexAlignType,
        justifyContent: 'flex-end',
        minWidth: 80,
        flex: 1,
        maxWidth: 120,
    } as ViewStyle,
    workflowIcon: {
        marginBottom: spacing.xxs,
    } as ViewStyle,
    workflowLabel: {
        ...commonStyles.baseText,
        fontSize: typography.fontSizeS,
        lineHeight: typography.lineHeightS,
        textAlign: 'center',
        minHeight: 36,
    } as TextStyle,
    workflowArrow: {
        marginHorizontal: spacing.xs,
        alignSelf: 'center' as FlexAlignType,
    } as ViewStyle,
};


// Combine into a single theme object
const theme = {
  colors,
  spacing,
  typography,
  borders,
  screens: {
    editLogoScreen: {
      safeArea: commonStyles.safeArea,
      contentContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
      } as ViewStyle,
      section: {
        marginBottom: spacing.lg,
      } as ViewStyle,
      sectionHeader: commonStyles.listSectionHeader,
      rowContainer: commonStyles.listRowContainer,
      firstRowInSection: commonStyles.firstRowInSection,
      iconContainer: commonStyles.iconContainer24,
      iconImage: {
        width: 24,
        height: 24,
        borderRadius: borders.radiusSmall,
      } as ImageStyle,
      rowLabel: {
        ...commonStyles.baseText,
        flex: 1,
      } as TextStyle,
      valueContainer: commonStyles.listValueContainer,
      valueText: commonStyles.listValueText,
      linkValueText: {
        ...commonStyles.listValueText,
        color: colors.primary,
        textDecorationLine: 'underline',
      } as TextStyle,
      disclosureIcon: commonStyles.listDisclosureIcon,
      statusMessageContainer: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        minHeight: 20,
        width: '100%',
        alignItems: 'center' as FlexAlignType,
      } as ViewStyle,
      errorText: {
        ...commonStyles.errorTextBase,
        fontWeight: typography.fontWeightBold as '600',
        fontSize: typography.fontSizeM,
        marginBottom: 0,
      } as TextStyle,
      successText: {
        ...commonStyles.successTextBase,
        fontWeight: typography.fontWeightBold as '600',
        fontSize: typography.fontSizeM,
        marginBottom: 0,
      } as TextStyle,
      logo: {
        width: '80%',
        aspectRatio: 2,
        marginBottom: spacing.xl,
        marginTop: spacing.lg,
        alignSelf: 'center' as FlexAlignType,
      } as ImageStyle,
      buttonRow: {
        ...commonStyles.listRowContainer,
        ...commonStyles.firstRowInSection,
      } as ViewStyle,
      buttonRowText: {
        ...commonStyles.secondaryTextBase,
        fontWeight: typography.fontWeightMedium as '500',
        marginLeft: spacing.sm,
        flex: 1,
        textAlign: 'left',
      } as TextStyle,
      buttonIconContainer: commonStyles.iconContainer24,
    },
    editNameScreen: {
        ...basicFormScreenStyles,
    },
    editChatModelScreen: {
        ...basicFormScreenStyles,
    },
    editPhoneScreen: {
        ...basicFormScreenStyles,
    },
    editCompanyNameScreen: {
        ...basicFormScreenStyles,
    },
    editCompanyPhoneScreen: {
        ...basicFormScreenStyles,
    },
    editReportSchemaScreen: {
      ...textAreaFormScreenStyles,
      textInput: {
        ...commonStyles.formTextInput,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        minHeight: 300,
        textAlignVertical: 'top',
      } as TextStyle,
      jsonErrorText: {
          ...commonStyles.errorTextBase,
          textAlign: 'left',
          marginTop: spacing.sm,
          fontSize: typography.fontSizeXS,
      } as TextStyle,
      imagePreviewContainer: {
          alignItems: 'center' as FlexAlignType,
          marginVertical: spacing.lg,
          borderWidth: borders.widthThin,
          borderColor: colors.borderLight,
          borderRadius: borders.radiusMedium,
          padding: spacing.md,
      } as ViewStyle,
      imagePreview: {
          width: 150,
          height: 150,
          borderRadius: borders.radiusSmall,
          marginBottom: spacing.md,
      } as ImageStyle,
      imagePlaceholder: {
          width: 150,
          height: 150,
          borderRadius: borders.radiusSmall,
          backgroundColor: colors.surfaceAlt,
          justifyContent: 'center',
          alignItems: 'center' as FlexAlignType,
          marginBottom: spacing.md,
      } as ViewStyle,
      imageButton: {
          backgroundColor: colors.primary,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: borders.radiusMedium,
          flexDirection: 'row',
          alignItems: 'center' as FlexAlignType,
      } as ViewStyle,
      imageButtonText: {
          ...commonStyles.buttonTextBase,
          color: colors.textOnPrimary,
          marginLeft: spacing.sm,
      } as TextStyle,
    },
    editSystemPromptScreen: {
      ...textAreaFormScreenStyles,
      textInput: {
        ...commonStyles.formTextInput,
        minHeight: 200,
        textAlignVertical: 'top',
      } as TextStyle,
      toggleRow: {
        flexDirection: 'row',
        alignItems: 'center' as FlexAlignType,
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: borders.radiusMedium,
        borderWidth: borders.widthThin,
        borderColor: colors.borderLight,
        marginBottom: spacing.xl,
      } as ViewStyle,
      toggleLabel: {
          ...commonStyles.baseText,
      } as TextStyle,
    },
    editCompanyWebsiteScreen: {
        ...basicFormScreenStyles,
    },
    editAddressScreen: {
        safeArea: commonStyles.safeArea,
        keyboardAvoidingView: commonStyles.keyboardAvoidingView,
        scrollViewContent: commonStyles.scrollViewContentPadding,
        loadingContainer: commonStyles.loadingContainer,
        errorText: { // Use base error text
            ...commonStyles.errorTextBase,
            marginBottom: spacing.md,
        } as TextStyle,
        fieldContainer: commonStyles.formFieldContainer,
        label: {
            ...commonStyles.formLabel,
            marginBottom: spacing.xs,
        } as TextStyle,
        textInput: commonStyles.formTextInput,
    },
    editEmailScreen: {
        safeArea: commonStyles.safeArea,
        container: commonStyles.container,
        containerContent: {
            flexGrow: 1,
            justifyContent: 'center',
        } as ViewStyle,
        loadingContainer: commonStyles.loadingContainer,
        errorText: { // Use base error text
            ...commonStyles.errorTextBase,
            marginBottom: spacing.md,
        } as TextStyle,
        label: commonStyles.formLabel,
        textInput: commonStyles.formTextInput,
        disabledTextInput: { // Specific style
            ...commonStyles.formTextInput,
            backgroundColor: colors.surfaceAlt,
            color: colors.textSecondary,
        } as TextStyle,
        supportText: { // Specific style
            ...commonStyles.smallSecondaryText,
            fontSize: typography.fontSizeXS,
            lineHeight: typography.lineHeightXS,
            marginTop: spacing.md,
            textAlign: 'center',
        } as TextStyle,
    },
    signUpScreen: {
      safeArea: {
        ...commonStyles.safeArea,
        paddingTop: spacing.xl,
        paddingHorizontal: spacing.lg,
      } as ViewStyle,
      keyboardAwareScrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 24,
      } as ViewStyle,
      title: {
        ...commonStyles.titleXL,
        marginBottom: spacing.xl,
        textAlign: 'center',
      } as TextStyle,
      input: {
        ...commonStyles.formTextInput,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
      } as TextStyle,
      ...marketingCardStyles,
      marketingHeadline: {
          ...marketingCardStyles.marketingHeadline,
          marginBottom: spacing.xs,
      } as TextStyle,
      workflowLabel: {
          ...marketingCardStyles.workflowLabel,
          display: 'flex',
          alignItems: 'center' as FlexAlignType,
          justifyContent: 'center',
      } as TextStyle,
      button: {
        ...commonStyles.listRowContainer,
        justifyContent: 'center',
        marginTop: 0,
        borderTopWidth: borders.widthHairline,
        borderTopColor: colors.borderLight,
      } as ViewStyle,
      buttonText: {
        ...commonStyles.buttonTextBase,
        fontWeight: typography.fontWeightNormal as 'normal',
        color: colors.textPrimary,
        flex: 0,
      } as TextStyle,
      loginLinkContainer: {
        marginTop: spacing.lg,
        alignItems: 'center' as FlexAlignType,
      } as ViewStyle,
      loginLinkText: {
        ...commonStyles.linkTextBase,
      } as TextStyle,
    },
    profileScreen: {
        safeArea: commonStyles.safeArea,
        keyboardAvoidingView: commonStyles.keyboardAvoidingView,
        scrollViewContent: {
        } as ViewStyle,
        contentContainer: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
        } as ViewStyle,
        loadingContainer: {
            ...commonStyles.loadingContainer,
            padding: spacing.lg,
            backgroundColor: colors.background,
        } as ViewStyle,
        errorTextContainer: {
           ...commonStyles.centeredContainer,
         } as ViewStyle,
        errorText: {
          ...commonStyles.errorTextBase,
          fontWeight: typography.fontWeightBold as '600',
          fontSize: typography.fontSizeM,
        } as TextStyle,
        statusMessageContainer: {
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.md,
            marginTop: spacing.xs,
        } as ViewStyle,
        successText: {
            ...commonStyles.successTextBase,
            fontWeight: typography.fontWeightBold as '600',
            fontSize: typography.fontSizeXS,
        } as TextStyle,
        section: {
          marginBottom: spacing.md,
        } as ViewStyle,
        sectionHeader: {
          ...commonStyles.listSectionHeader,
          marginBottom: spacing.xxs,
        } as TextStyle,
        rowContainer: commonStyles.listRowContainer,
        firstRowInSection: commonStyles.firstRowInSection,
        iconContainer: {
            ...commonStyles.iconContainer24,
            justifyContent: undefined,
        } as ViewStyle,
        label: {
          ...commonStyles.baseText,
          flex: 1,
        } as TextStyle,
        valueContainer: commonStyles.listValueContainer,
        valueText: commonStyles.listValueText,
        linkValueText: {
          ...commonStyles.listValueText,
          color: colors.primary,
          textDecorationLine: 'underline',
        } as TextStyle,
        disclosureIcon: commonStyles.listDisclosureIcon,
        fieldContainer: {
            ...commonStyles.formFieldContainer,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.xs,
            borderBottomWidth: borders.widthHairline,
            borderBottomColor: colors.borderLight,
        } as ViewStyle,
        firstFieldInSection: commonStyles.firstRowInSection,
        fieldLabel: {
            ...commonStyles.labelBase,
            marginBottom: spacing.xs,
            paddingTop: spacing.sm,
        } as TextStyle,
        textInput: {
            ...commonStyles.baseText,
            paddingVertical: Platform.OS === 'ios' ? 8 : 6,
        } as TextStyle,
        saveButtonContainer: {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderTopColor: colors.borderLight,
            borderTopWidth: borders.widthHairline,
        } as ViewStyle,
        rowLabel: { // Duplicated? Same as 'label' above
          ...commonStyles.baseText,
          flex: 1,
        } as TextStyle,
        iconImage: {
          width: 24,
          height: 24,
          borderRadius: borders.radiusSmall,
        } as ImageStyle,
        logoutButtonContainer: {
            ...commonStyles.listRowContainer,
            ...commonStyles.firstRowInSection,
            justifyContent: 'center',
        } as ViewStyle,
        logoutButtonText: {
            ...commonStyles.buttonTextBase,
            fontSize: typography.fontSizeM,
            fontWeight: typography.fontWeightNormal as '400',
            color: colors.error,
        } as TextStyle,
    },
    loginScreen: {
      safeArea: commonStyles.safeArea,
      keyboardAwareScrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 24,
      } as ViewStyle,
      title: {
        ...commonStyles.titleL,
        fontWeight: typography.fontWeightMedium as '500',
        textAlign: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.md,
      } as TextStyle,
      input: {
        ...commonStyles.formTextInput,
        fontWeight: typography.fontWeightNormal as 'normal',
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
      } as TextStyle,
      button: {
        ...commonStyles.listRowContainer,
        justifyContent: 'center',
        marginTop: 0,
        borderTopWidth: borders.widthHairline,
        borderTopColor: colors.borderLight,
      } as ViewStyle,
      buttonText: {
        ...commonStyles.buttonTextBase,
        fontWeight: typography.fontWeightNormal as 'normal',
        color: colors.textPrimary,
        flex: 0,
      } as TextStyle,
      errorText: {
        ...commonStyles.errorTextBase,
        marginBottom: spacing.md,
      } as TextStyle,
      signUpLinkContainer: {
        marginTop: spacing.lg,
        alignItems: 'center' as FlexAlignType,
      } as ViewStyle,
      signUpLinkText: {
        ...commonStyles.linkTextBase,
      } as TextStyle,
      ...marketingCardStyles,
      marketingHeadline: {
          ...marketingCardStyles.marketingHeadline,
          marginBottom: spacing.sm,
      } as TextStyle,
      marketingDivider: {
        height: borders.widthThin,
        backgroundColor: colors.borderLight,
        marginVertical: spacing.md,
      } as ViewStyle,
      marketingFeatureList: {
        marginBottom: spacing.md,
      } as ViewStyle,
      marketingFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center' as FlexAlignType,
        marginBottom: spacing.xs,
      } as ViewStyle,
      marketingFeatureIcon: {
        marginRight: spacing.sm,
        width: 20,
      } as ViewStyle,
      marketingFeatureText: {
        ...commonStyles.smallSecondaryText,
        flex: 1,
      } as TextStyle,
      marketingCTA: {
          ...commonStyles.smallSecondaryText,
          textAlign: 'center',
          marginTop: spacing.sm,
          fontStyle: 'italic',
      } as TextStyle,
    },
    browseScreen: {
      ...basicListScreenStyles,
      projectRowContainer: {
        ...commonStyles.listRowContainer,
        paddingLeft: spacing.lg + spacing.md + 24,
        minHeight: 48,
      } as ViewStyle,
      searchContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
        borderBottomWidth: borders.widthHairline,
        borderBottomColor: colors.borderLight,
      } as ViewStyle,
      searchInput: {
        ...commonStyles.baseText,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surfaceAlt,
        borderRadius: borders.radiusMedium,
        paddingHorizontal: spacing.md,
      } as TextStyle,
      loadingIconContainer: {
        marginLeft: 'auto',
        paddingLeft: spacing.sm,
      } as ViewStyle,
    },
    projectReportsScreen: {
        ...basicListScreenStyles,
        headerButton: {
          padding: spacing.md,
        } as ViewStyle,
        headerBackButtonContainer: commonStyles.headerBackButtonContainer,
        headerBackTitle: commonStyles.headerBackTitle,
    },
    webViewerScreen: {
        container: {
            flex: 1,
            backgroundColor: colors.background,
            position: 'relative',
            paddingTop: 0,
            marginTop: 0,
        } as ViewStyle,
        loadingContainer: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
            backgroundColor: colors.background,
        } as ViewStyle,
        errorText: {
            ...commonStyles.errorTextBase,
            padding: 20,
        } as TextStyle,
        headerButton: {
            padding: spacing.xs,
        } as ViewStyle,
        headerButtonContainer: {
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        headerBackButtonContainer: commonStyles.headerBackButtonContainer,
        headerBackTitle: commonStyles.headerBackTitle,
        webview: { // Specific style
            flex: 1,
            paddingTop: 0,
            marginTop: 0,
        } as ViewStyle,
    },
    reportEditorScreen: { // Very specific screen, minimal reuse
      safeArea: commonStyles.safeArea,
      container: {
        flex: 1,
      } as ViewStyle,
      centered: commonStyles.centeredContainer,
      loadingText: {
        ...commonStyles.secondaryTextBase,
        marginTop: spacing.sm,
      } as TextStyle,
      errorText: {
        ...commonStyles.errorTextBase,
        fontSize: typography.fontSizeM,
        fontWeight: typography.fontWeightBold as '600',
      } as TextStyle,
      placeholderText: {
          ...commonStyles.smallSecondaryText,
          fontStyle: 'italic',
          textAlign: 'center',
          paddingVertical: spacing.lg,
      } as TextStyle,
      placeholderTextSmall: {
          ...commonStyles.smallSecondaryText,
          fontSize: typography.fontSizeXS,
          lineHeight: typography.lineHeightXS,
          fontStyle: 'italic',
          textAlign: 'center',
          marginTop: spacing.xs,
      } as TextStyle,
      metaContainer: {
        alignItems: 'center' as FlexAlignType,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
      } as ViewStyle,
      logo: {
        maxHeight: 50,
        width: '50%',
        marginBottom: spacing.md,
      } as ImageStyle,
      mainTitle: {
        ...commonStyles.titleXL,
        marginBottom: spacing.md,
        textAlign: 'center',
      } as TextStyle,
      metaInfo: {
        ...commonStyles.smallSecondaryText,
        textAlign: 'center',
        marginBottom: spacing.xs,
      } as TextStyle,
      companyInfo: {
        marginTop: spacing.md,
      } as ViewStyle,
      companyName: {
          ...commonStyles.labelBase,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.xs,
      } as TextStyle,
      statusContainer: {
         marginHorizontal: spacing.lg,
         marginBottom: spacing.md,
      } as ViewStyle,
      statusText: { // Base for success/error status text
          textAlign: 'center',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: borders.radiusSmall,
          fontWeight: typography.fontWeightMedium as '500',
          fontSize: typography.fontSizeXS,
          lineHeight: typography.lineHeightXS,
          overflow: 'hidden',
          borderWidth: borders.widthThin,
      } as TextStyle,
      statusSuccess: { // Define base properties directly instead of spreading
          textAlign: 'center',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: borders.radiusSmall,
          fontWeight: typography.fontWeightMedium as '500',
          fontSize: typography.fontSizeXS,
          lineHeight: typography.lineHeightXS,
          overflow: 'hidden',
          borderWidth: borders.widthThin,
          // Specific success colors
          backgroundColor: colors.successBg,
          color: colors.successText,
          borderColor: colors.successBorder,
      } as TextStyle,
      statusError: { // Define base properties directly instead of spreading
          textAlign: 'center',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: borders.radiusSmall,
          fontWeight: typography.fontWeightMedium as '500',
          fontSize: typography.fontSizeXS,
          lineHeight: typography.lineHeightXS,
          overflow: 'hidden',
          borderWidth: borders.widthThin,
          // Specific error colors
          backgroundColor: colors.errorBg,
          color: colors.error,
          borderColor: colors.errorBorder,
      } as TextStyle,
      sectionContainer: {
          marginBottom: spacing.xl,
      } as ViewStyle,
      sectionHeader: {
          ...commonStyles.listSectionHeader,
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.xxs,
      } as TextStyle,
      rowContainer: {
          ...commonStyles.listRowContainer,
          alignItems: 'flex-start' as FlexAlignType,
          minHeight: 48,
      } as ViewStyle,
      firstRowInSection: commonStyles.firstRowInSection,
      rowContentContainer: {
         flex: 1,
         marginRight: spacing.sm,
      } as ViewStyle,
      rowInput: {
          ...commonStyles.baseText,
          paddingVertical: Platform.OS === 'ios' ? 6 : 4,
          paddingHorizontal: 0,
          textAlignVertical: 'top',
      } as TextStyle,
      rowMultiInputContainer: {
      } as ViewStyle,
      fieldLabel: {
          ...commonStyles.labelBase,
          fontSize: typography.fontSizeXS,
          lineHeight: typography.lineHeightXS,
          marginBottom: spacing.xxs,
          marginTop: spacing.xs,
      } as TextStyle,
      removeItemButton: {
          padding: spacing.sm,
          marginLeft: 'auto',
          justifyContent: 'center',
          alignItems: 'center' as FlexAlignType,
      } as ViewStyle,
      addItemRow: {
         ...commonStyles.listRowContainer,
         justifyContent: 'space-between',
         minHeight: 44,
         paddingVertical: spacing.xs,
         borderBottomWidth: 0,
      } as ViewStyle,
      addRowIcon: {
         marginRight: spacing.md,
      } as ViewStyle,
      addRowText: {
         ...commonStyles.buttonTextBase,
         color: colors.primary,
         textAlign: 'left',
         flex: 1,
      } as TextStyle,
      imageItemRow: {
         ...commonStyles.listRowContainer,
         flexDirection: 'column',
         alignItems: 'stretch' as FlexAlignType,
         paddingVertical: spacing.md,
      } as ViewStyle,
      imageItemContent: {
         marginBottom: spacing.md,
      } as ViewStyle,
      imagePreview: {
          width: '100%',
          aspectRatio: 16 / 9,
          borderRadius: borders.radiusSmall,
          backgroundColor: colors.borderLight,
          marginBottom: spacing.md,
      } as ImageStyle,
      imagePreviewPlaceholder: {
          width: '100%',
          aspectRatio: 16 / 9,
          borderRadius: borders.radiusSmall,
          backgroundColor: colors.surfaceAlt,
          borderWidth: borders.widthHairline,
          borderColor: colors.border,
          justifyContent: 'center',
          alignItems: 'center' as FlexAlignType,
          marginBottom: spacing.md,
      } as ViewStyle,
      captionContainer: {
      } as ViewStyle,
      removeImageButton: {
          alignSelf: 'flex-end' as FlexAlignType,
          flexDirection: 'row',
          alignItems: 'center' as FlexAlignType,
          padding: spacing.sm,
          borderRadius: borders.radiusMedium,
          borderWidth: borders.widthThin,
          borderColor: colors.error,
      } as ViewStyle,
      removeButtonText: {
          ...commonStyles.buttonTextBase,
          fontSize: typography.fontSizeS,
          color: colors.error,
          marginLeft: spacing.xs,
      } as TextStyle,
      uploadActivityContainer: {
         flexDirection: 'row',
         alignItems: 'center' as FlexAlignType,
         marginLeft: spacing.sm,
         paddingVertical: spacing.xs,
      } as ViewStyle,
      uploadActivityText: {
          ...commonStyles.smallSecondaryText,
          fontSize: typography.fontSizeXS,
          lineHeight: typography.lineHeightXS,
          marginLeft: spacing.xs,
          fontStyle: 'italic',
      } as TextStyle,
      button: { // Main action button
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borders.radiusMedium,
        backgroundColor: colors.primary,
        alignItems: 'center' as FlexAlignType,
        justifyContent: 'center',
        minHeight: 44,
      } as ViewStyle,
      buttonText: { // Main action button text
        ...commonStyles.buttonTextBase,
        color: colors.textOnPrimary,
      } as TextStyle,
      headerButton: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
      } as ViewStyle,
      headerBackButtonContainer: commonStyles.headerBackButtonContainer,
      headerBackTitle: commonStyles.headerBackTitle,
    },
    homeScreen: {
        safeArea: commonStyles.safeArea,
        scrollContainer: {
            flexGrow: 1,
            paddingVertical: spacing.lg,
        } as ViewStyle,
        title: {
            ...commonStyles.titleXL,
            marginBottom: spacing.xs,
            textAlign: 'center' as const,
            paddingHorizontal: spacing.lg,
        } as TextStyle,
        description: {
            ...commonStyles.secondaryTextBase,
            marginBottom: spacing.xl,
            textAlign: 'center' as const,
            paddingHorizontal: spacing.lg,
        } as TextStyle,
        sectionContainer: {
            marginBottom: spacing.xl,
        } as ViewStyle,
        sectionHeaderText: {
            ...commonStyles.labelBase,
            paddingBottom: spacing.xs,
            marginBottom: spacing.xxs,
            paddingHorizontal: spacing.lg,
            textTransform: 'uppercase',
        } as TextStyle,
        rowContainer: {
            ...commonStyles.listRowContainer,
            minHeight: 48,
        } as ViewStyle,
        firstRowInSection: commonStyles.firstRowInSection,
        rowDisabled: {
            opacity: 0.6,
        } as ViewStyle,
        rowIconContainer: {
            ...commonStyles.iconContainer24,
            justifyContent: undefined,
        } as ViewStyle,
        rowLabel: {
            ...commonStyles.baseText,
            flexGrow: 1,
            flexShrink: 0,
        } as TextStyle,
        rowLabelDisabled: {
            ...commonStyles.baseText,
            color: colors.textDisabled,
        } as TextStyle,
        rowValueContainer: commonStyles.listValueContainer,
        rowValueText: {
            ...commonStyles.listValueText,
            textAlign: 'right' as const,
            marginRight: spacing.xs,
        } as TextStyle,
        rowValueDisabled: {
            ...commonStyles.listValueText,
            color: colors.textDisabled,
            fontStyle: 'italic',
        } as TextStyle,
        rowChevron: {
        } as ViewStyle,
        rowSpinner: {
            marginLeft: spacing.xs,
        } as ViewStyle,
        fetchErrorText: {
            ...commonStyles.errorTextBase,
            paddingVertical: spacing.sm,
            marginHorizontal: spacing.lg,
            fontWeight: typography.fontWeightMedium as '500',
            backgroundColor: colors.errorBg,
            borderRadius: borders.radiusSmall,
            marginBottom: spacing.sm,
            borderWidth: borders.widthThin,
            borderColor: colors.errorBorder,
        } as TextStyle,
        uploadSectionContent: {
            backgroundColor: colors.surface,
            borderTopWidth: borders.widthHairline,
            borderTopColor: colors.borderLight,
            borderBottomWidth: borders.widthHairline,
            borderBottomColor: colors.borderLight,
            paddingHorizontal: 0,
            marginBottom: spacing.xl,
        } as ViewStyle,
        buttonBase: {
            ...commonStyles.listRowContainer,
            minHeight: 48,
            width: '100%',
            justifyContent: 'space-between',
        } as ViewStyle,
        buttonDisabled: {
            opacity: 0.6,
        } as ViewStyle,
        buttonTextBase: {
            ...commonStyles.baseText,
            flexShrink: 1,
            marginLeft: spacing.md,
            textAlign: 'left',
        } as TextStyle,
        buttonTextDisabled: {
            ...commonStyles.baseText,
            color: colors.textDisabled,
        } as TextStyle,
        buttonIconContainer: {
            ...commonStyles.iconContainer24,
            justifyContent: undefined,
        } as ViewStyle,
        buttonChevronContainer: {
            marginLeft: spacing.sm,
        } as ViewStyle,
        buttonActivityIndicator: {
        } as ViewStyle,
        thumbnailContainer: {
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
            marginTop: spacing.md,
            padding: spacing.sm,
            backgroundColor: colors.surfaceAlt,
            borderRadius: borders.radiusMedium,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
        } as ViewStyle,
        thumbnail: {
            width: 60,
            height: 60,
            borderRadius: borders.radiusSmall,
            backgroundColor: colors.borderLight,
        } as ImageStyle,
        thumbnailPlaceholder: {
            width: 60,
            height: 60,
            borderRadius: borders.radiusSmall,
            backgroundColor: colors.surfaceAlt,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
            padding: spacing.xs,
        } as ViewStyle,
        thumbnailPlaceholderText: {
            ...commonStyles.smallSecondaryText,
            fontSize: typography.fontSizeXS,
            lineHeight: typography.lineHeightXS,
            textAlign: 'center' as const,
            marginTop: spacing.xxs,
        } as TextStyle,
        thumbnailInfoContainer: {
            flex: 1,
            marginLeft: spacing.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        thumbnailFileName: {
            ...commonStyles.labelBase,
            fontSize: typography.fontSizeS,
            color: colors.textPrimary,
            lineHeight: typography.lineHeightS,
            flexShrink: 1,
            marginRight: spacing.xs,
        } as TextStyle,
        thumbnailClearButton: {
            padding: spacing.xs,
        } as ViewStyle,
        resultsContainerBase: {
            marginTop: 0,
            marginHorizontal: 0,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            backgroundColor: colors.surface,
            borderTopWidth: borders.widthHairline,
            borderTopColor: colors.borderLight,
            borderBottomWidth: borders.widthHairline,
            borderBottomColor: colors.borderLight,
        } as ViewStyle,
        resultsContainerLoading: {
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        resultsContainerError: {
        } as ViewStyle,
        resultTextBase: {
            ...commonStyles.baseText,
            marginBottom: spacing.sm,
            textAlign: 'left' as const,
        } as TextStyle,
        resultTextLoading: {
            ...commonStyles.secondaryTextBase,
            textAlign: 'center' as const,
        } as TextStyle,
        resultTextError: {
            ...commonStyles.baseText,
            color: colors.error,
        } as TextStyle,
        resultLoadingIndicator: {
            marginTop: spacing.sm,
            alignSelf: 'center' as FlexAlignType,
        } as ViewStyle,
        modalContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
            paddingBottom: 100,
        } as ViewStyle,
        videoContainer: {
            width: Dimensions.get('window').width * 0.9,
            height: Dimensions.get('window').height * 0.7,
            backgroundColor: colors.background,
            borderRadius: borders.radiusMedium,
            overflow: 'hidden',
            marginBottom: spacing.lg,
        } as ViewStyle,
        videoPlayer: {
            width: '100%',
            height: '100%',
        } as ImageStyle,
        closeButton: {
        } as ViewStyle,
        generateButton: {
            backgroundColor: colors.surface,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            marginTop: spacing.xl,
            marginHorizontal: spacing.lg,
            minHeight: 44,
            borderTopWidth: borders.widthHairline,
            borderBottomWidth: borders.widthHairline,
            borderTopColor: colors.borderLight,
            borderBottomColor: colors.borderLight,
        } as ViewStyle,
        disabledButton: {
            opacity: 0.6,
        } as ViewStyle,
        generateButtonText: {
            ...commonStyles.buttonTextBase,
            fontWeight: typography.fontWeightNormal as 'normal',
            color: colors.textPrimary,
        } as TextStyle,
        instructionsContainer: {
            flexDirection: 'row',
            backgroundColor: colors.surface,
            borderRadius: borders.radiusMedium,
            padding: spacing.md,
            marginBottom: spacing.lg,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
        } as ViewStyle,
        instructionsIcon: {
            marginRight: spacing.sm,
            marginTop: 1,
        } as ViewStyle,
        instructionsTextContainer: {
            flex: 1,
        } as ViewStyle,
        instructionsTitle: {
            ...commonStyles.labelBase,
            color: colors.textPrimary,
            marginBottom: spacing.xs,
        } as TextStyle,
        instructionsText: {
            ...commonStyles.smallSecondaryText,
            fontSize: typography.fontSizeS - 1,
            marginBottom: spacing.xs,
        } as TextStyle,
        instructionsBold: {
            fontWeight: typography.fontWeightBold as 'bold',
            color: colors.textPrimary,
        } as TextStyle,
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
            padding: spacing.lg,
        } as ViewStyle,
        tipsButton: {
            padding: spacing.sm,
        } as ViewStyle,
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        tipsModalContainer: {
            backgroundColor: colors.surface,
            padding: spacing.lg,
            borderRadius: borders.radiusMedium,
            width: Dimensions.get('window').width * 0.9,
            maxHeight: Dimensions.get('window').height * 0.9,
        } as ViewStyle,
        tipsModalHeader: {
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
        } as ViewStyle,
        tipsModalTitle: {
            ...commonStyles.titleM,
        } as TextStyle,
        tipsModalCloseButton: {
            padding: spacing.sm,
        } as ViewStyle,
        tipsList: {
            marginBottom: spacing.lg,
        } as ViewStyle,
        tipRow: {
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
            marginBottom: spacing.xs,
        } as ViewStyle,
        tipIcon: {
            marginRight: spacing.sm,
        } as ViewStyle,
        tipText: {
            ...commonStyles.smallSecondaryText,
             flex: 1,
        } as TextStyle,
        tipBold: {
            fontWeight: typography.fontWeightBold as 'bold',
            color: colors.textPrimary,
        } as TextStyle,
        loadingOverlay: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.85)',
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
            zIndex: 100,
        } as ViewStyle,
        loadingText: {
            marginTop: spacing.md,
            fontSize: 18,
            color: colors.textPrimary,
            fontWeight: 'bold',
        } as TextStyle,
        mediaCard: {
            backgroundColor: colors.surface,
            borderRadius: borders.radiusLarge,
            padding: spacing.sm + spacing.xs,
            marginTop: spacing.md,
            marginBottom: spacing.sm,
            alignItems: 'center' as FlexAlignType,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
        } as ViewStyle,
        mediaThumbnailWrapper: {
            position: 'relative',
            width: 120,
            height: 120,
            borderRadius: borders.radiusLarge - 4,
            overflow: 'hidden',
            marginBottom: spacing.sm,
        } as ViewStyle,
        mediaThumbnail: {
            width: '100%',
            height: '100%',
            borderRadius: borders.radiusLarge - 4,
            backgroundColor: colors.borderLight,
        } as ImageStyle,
        playIcon: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -18,
            marginTop: -18,
        } as ViewStyle,
        removeMediaButton: {
            position: 'absolute',
            top: 6,
            right: 6,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 14,
            padding: 2,
            zIndex: 2,
        } as ViewStyle,
        mediaFileName: {
            ...commonStyles.labelBase,
            color: colors.textPrimary,
            marginTop: spacing.xxs,
            textAlign: 'center' as const,
            maxWidth: 120,
        } as TextStyle,
        previewModalSafeArea: {
            flex: 1,
        } as ViewStyle,
        previewModalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        previewModalContent: {
            width: '90%',
            maxWidth: 400,
            aspectRatio: 9 / 16,
            backgroundColor: colors.surface,
            borderRadius: 20,
            overflow: 'hidden',
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
            position: 'relative',
        } as ViewStyle,
        previewVideoPlayer: {
            width: '100%',
            height: '100%',
            borderRadius: 20,
            backgroundColor: '#000',
        } as ImageStyle,
        previewModalCloseButton: {
            position: 'absolute',
            top: spacing.sm + spacing.xs,
            right: spacing.sm + spacing.xs,
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: 20,
            width: 40,
            height: 40,
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            zIndex: 10,
            borderWidth: 2,
            borderColor: '#fff',
        } as ViewStyle,
        thumbnailPreviewWrapper: {
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            marginTop: spacing.md,
            marginBottom: spacing.sm,
            position: 'relative',
        } as ViewStyle,
        thumbnailPreviewContainer: {
            width: 120,
            height: 120,
            borderRadius: borders.radiusLarge - 4,
            overflow: 'hidden',
            backgroundColor: '#eee',
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            borderWidth: borders.widthThin,
            borderColor: '#ccc',
        } as ViewStyle,
        thumbnailPreviewImage: {
            width: '100%',
            height: '100%',
            borderRadius: borders.radiusLarge - 4,
            backgroundColor: '#eee',
        } as ImageStyle,
        thumbnailPlayIcon: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -20,
            marginTop: -20,
            opacity: 0.8,
            color: '#222'
        } as ViewStyle,
        thumbnailRemoveButton: {
            position: 'absolute',
            top: spacing.xs,
             right: '25%',
            backgroundColor: '#222',
            borderRadius: 14,
            width: 28,
            height: 28,
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            zIndex: 2,
            borderWidth: 2,
            borderColor: '#fff',
        } as ViewStyle,
    },
  },
};

export default theme; 