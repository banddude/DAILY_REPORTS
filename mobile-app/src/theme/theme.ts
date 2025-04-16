import { StyleSheet, Platform } from 'react-native';
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

// Combine into a single theme object (optional but convenient)
const theme = {
  colors,
  spacing,
  typography,
  borders,
  screens: {
    editLogoScreen: {
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      } as ViewStyle,
      contentContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
      } as ViewStyle,
      section: {
        marginBottom: spacing.lg,
      } as ViewStyle,
      sectionHeader: {
        paddingBottom: spacing.xs,
        marginBottom: spacing.md,
        color: colors.textSecondary,
        fontSize: typography.fontSizeS,
        fontWeight: typography.fontWeightMedium as '500',
        textTransform: 'uppercase',
      } as TextStyle,
      rowContainer: {
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
      iconContainer: {
        marginRight: spacing.md,
        width: 24,
        height: 24,
        alignItems: 'center' as FlexAlignType,
        justifyContent: 'center',
      } as ViewStyle,
      iconImage: {
        width: 24,
        height: 24,
        borderRadius: borders.radiusSmall,
      } as ImageStyle,
      rowLabel: {
        flex: 1,
      } as TextStyle,
      valueContainer: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center' as FlexAlignType,
        marginLeft: spacing.sm,
      } as ViewStyle,
      valueText: {
        fontSize: typography.fontSizeM,
        color: colors.textSecondary,
        textAlign: 'right',
      } as TextStyle,
      linkValueText: {
        color: colors.primary,
        textDecorationLine: 'underline',
      } as TextStyle,
      disclosureIcon: {
         marginLeft: spacing.xs,
      } as ViewStyle,
      statusMessageContainer: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        minHeight: 20,
        width: '100%',
        alignItems: 'center' as FlexAlignType,
      } as ViewStyle,
      errorText: {
        color: colors.error,
        textAlign: 'center',
        fontWeight: typography.fontWeightBold as '600',
        fontSize: typography.fontSizeM,
      } as TextStyle,
      successText: {
        color: colors.success,
        textAlign: 'center',
        fontWeight: typography.fontWeightBold as '600',
        fontSize: typography.fontSizeM,
      } as TextStyle,
      logo: {
        width: '80%',
        aspectRatio: 2,
        marginBottom: spacing.xl,
        marginTop: spacing.lg,
        alignSelf: 'center' as FlexAlignType,
      } as ImageStyle,
      buttonRow: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center' as FlexAlignType,
        borderBottomWidth: borders.widthHairline,
        borderBottomColor: colors.borderLight,
        borderTopWidth: borders.widthHairline,
        borderTopColor: colors.borderLight,
        minHeight: 44,
      } as ViewStyle,
      buttonRowText: {
        color: colors.textSecondary,
        fontSize: typography.fontSizeM,
        fontWeight: typography.fontWeightMedium as '500',
        marginLeft: spacing.sm,
        flex: 1,
      } as TextStyle,
      buttonIconContainer: {
          marginRight: spacing.md,
          width: 24,
          height: 24,
          alignItems: 'center' as FlexAlignType,
          justifyContent: 'center',
      } as ViewStyle,
    },
    editNameScreen: {
        safeArea: {
            flex: 1,
            backgroundColor: colors.background,
        } as ViewStyle,
        container: {
            flex: 1,
            padding: spacing.lg,
        } as ViewStyle,
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        errorText: {
            color: colors.error,
            textAlign: 'center',
            marginBottom: spacing.md,
        } as TextStyle,
        label: {
            fontSize: typography.fontSizeS,
            fontWeight: typography.fontWeightMedium as '500',
            color: colors.textSecondary,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
        } as TextStyle,
        textInput: {
            backgroundColor: colors.surface,
            borderRadius: borders.radiusMedium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
        } as TextStyle,
    },
    editChatModelScreen: {
        safeArea: {
            flex: 1,
            backgroundColor: colors.background,
        } as ViewStyle,
        container: {
            flex: 1,
            padding: spacing.lg,
        } as ViewStyle,
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        errorText: {
            color: colors.error,
            textAlign: 'center',
            marginBottom: spacing.md,
        } as TextStyle,
        label: {
            fontSize: typography.fontSizeS,
            fontWeight: typography.fontWeightMedium as '500',
            color: colors.textSecondary,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
        } as TextStyle,
        textInput: {
            backgroundColor: colors.surface,
            borderRadius: borders.radiusMedium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
        } as TextStyle,
    },
    editPhoneScreen: {
        safeArea: {
            flex: 1,
            backgroundColor: colors.background,
        } as ViewStyle,
        container: {
            flex: 1,
            padding: spacing.lg,
        } as ViewStyle,
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        errorText: {
            color: colors.error,
            textAlign: 'center',
            marginBottom: spacing.md,
        } as TextStyle,
        label: {
            fontSize: typography.fontSizeS,
            fontWeight: typography.fontWeightMedium as '500',
            color: colors.textSecondary,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
        } as TextStyle,
        textInput: {
            backgroundColor: colors.surface,
            borderRadius: borders.radiusMedium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
        } as TextStyle,
    },
    editCompanyNameScreen: {
        safeArea: {
            flex: 1,
            backgroundColor: colors.background,
        } as ViewStyle,
        container: {
            flex: 1,
            padding: spacing.lg,
        } as ViewStyle,
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        errorText: {
            color: colors.error,
            textAlign: 'center',
            marginBottom: spacing.md,
        } as TextStyle,
        label: {
            fontSize: typography.fontSizeS,
            fontWeight: typography.fontWeightMedium as '500',
            color: colors.textSecondary,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
        } as TextStyle,
        textInput: {
            backgroundColor: colors.surface,
            borderRadius: borders.radiusMedium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
        } as TextStyle,
    },
    editCompanyPhoneScreen: {
        safeArea:{
            flex:1,
            backgroundColor:colors.background
        } as ViewStyle,
        container:{
            flex:1,
            padding:spacing.lg
        } as ViewStyle,
        loadingContainer:{
            flex:1,
            justifyContent:'center',
            alignItems:'center' as FlexAlignType
        } as ViewStyle,
        errorText:{
            color:colors.error,
            textAlign:'center',
            marginBottom:spacing.md
        } as TextStyle,
        label:{
            fontSize:typography.fontSizeS,
            fontWeight:typography.fontWeightMedium as '500',
            color:colors.textSecondary,
            marginBottom:spacing.sm,
            textTransform:'uppercase'
        } as TextStyle,
        textInput:{
            backgroundColor:colors.surface,
            borderRadius:borders.radiusMedium,
            paddingHorizontal:spacing.md,
            paddingVertical:spacing.md,
            fontSize:typography.fontSizeM,
            color:colors.textPrimary,
            borderWidth:borders.widthThin,
            borderColor:colors.borderLight
        } as TextStyle
    },
    editReportSchemaScreen: {
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      } as ViewStyle,
      keyboardAvoidingView: {
          flex: 1,
      } as ViewStyle,
      scrollViewContent: {
        padding: spacing.lg,
      } as ViewStyle,
      loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center' as FlexAlignType,
        padding: spacing.lg,
      } as ViewStyle,
      errorText: {
        color: colors.error,
        textAlign: 'center',
        marginBottom: spacing.md,
      } as TextStyle,
      fieldContainer: {
        marginBottom: spacing.xl,
      } as ViewStyle,
      label: {
        fontSize: typography.fontSizeS,
        fontWeight: typography.fontWeightMedium as '500',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
      } as TextStyle,
      textInput: {
        backgroundColor: colors.surface,
        borderRadius: borders.radiusMedium,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.fontSizeM,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        color: colors.textPrimary,
        borderWidth: borders.widthThin,
        borderColor: colors.borderLight,
        minHeight: 300,
        textAlignVertical: 'top',
      } as TextStyle,
      jsonErrorText: {
          color: colors.error,
          marginTop: spacing.sm,
          fontSize: typography.fontSizeXS,
      } as TextStyle,
      imagePreviewContainer: {
          alignItems: 'center' as FlexAlignType,
          marginVertical: spacing.lg,
          borderWidth: 1,
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
          color: colors.background,
          marginLeft: spacing.sm,
          fontWeight: typography.fontWeightMedium as '500',
      } as TextStyle,
    },
    editSystemPromptScreen: {
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      } as ViewStyle,
      keyboardAvoidingView: {
          flex: 1,
      } as ViewStyle,
      scrollViewContent: {
        padding: spacing.lg,
      } as ViewStyle,
      loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center' as FlexAlignType,
        padding: spacing.lg,
      } as ViewStyle,
      errorText: {
        color: colors.error,
        textAlign: 'center',
        marginBottom: spacing.md,
      } as TextStyle,
      fieldContainer: {
        marginBottom: spacing.xl,
      } as ViewStyle,
      label: {
        fontSize: typography.fontSizeS,
        fontWeight: typography.fontWeightMedium as '500',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
      } as TextStyle,
      textInput: {
        backgroundColor: colors.surface,
        borderRadius: borders.radiusMedium,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.fontSizeM,
        color: colors.textPrimary,
        borderWidth: borders.widthThin,
        borderColor: colors.borderLight,
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
          fontSize: typography.fontSizeM,
          color: colors.textPrimary,
      } as TextStyle,
    },
    editCompanyWebsiteScreen: {
        safeArea: {
            flex: 1,
            backgroundColor: colors.background,
        } as ViewStyle,
        container: {
            flex: 1,
            padding: spacing.lg,
        } as ViewStyle,
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        errorText: {
            color: colors.error,
            textAlign: 'center',
            marginBottom: spacing.md,
        } as TextStyle,
        label: {
            fontSize: typography.fontSizeS,
            fontWeight: typography.fontWeightMedium as '500',
            color: colors.textSecondary,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
        } as TextStyle,
        textInput: {
            backgroundColor: colors.surface,
            borderRadius: borders.radiusMedium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
        } as TextStyle,
    },
    editAddressScreen: {
        safeArea: {
            flex: 1,
            backgroundColor: colors.background
        } as ViewStyle,
        keyboardAvoidingView: {
            flex: 1
        } as ViewStyle,
        scrollViewContent: {
            padding: spacing.lg
        } as ViewStyle,
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType
        } as ViewStyle,
        errorText: {
            color: colors.error,
            textAlign: 'center',
            marginBottom: spacing.md
        } as TextStyle,
        fieldContainer: {
            marginBottom: spacing.md
        } as ViewStyle,
        label: {
            fontSize: typography.fontSizeS,
            fontWeight: typography.fontWeightMedium as '500',
            color: colors.textSecondary,
            marginBottom: spacing.xs,
            textTransform: 'uppercase'
        } as TextStyle,
        textInput: {
            backgroundColor: colors.surface,
            borderRadius: borders.radiusMedium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight
        } as TextStyle,
    },
    editEmailScreen: {
        safeArea: {
            flex: 1,
            backgroundColor: colors.background,
        } as ViewStyle,
        container: {
            flex: 1,
            padding: spacing.lg,
        } as ViewStyle,
        containerContent: {
            flexGrow: 1,
            justifyContent: 'center',
        } as ViewStyle,
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        errorText: {
            color: colors.error,
            textAlign: 'center',
            marginBottom: spacing.md,
        } as TextStyle,
        label: {
            fontSize: typography.fontSizeS,
            fontWeight: typography.fontWeightMedium as '500',
            color: colors.textSecondary,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
        } as TextStyle,
        textInput: {
            backgroundColor: colors.surface,
            borderRadius: borders.radiusMedium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
        } as TextStyle,
        disabledTextInput: {
            backgroundColor: colors.surfaceAlt,
            borderRadius: borders.radiusMedium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: typography.fontSizeM,
            color: colors.textSecondary,
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
        } as TextStyle,
        supportText: {
            marginTop: spacing.md,
            textAlign: 'center',
            color: colors.textSecondary,
            fontSize: typography.fontSizeXS,
        } as TextStyle,
    },
    signUpScreen: {
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: spacing.xl,
        paddingHorizontal: spacing.lg,
      } as ViewStyle,
      keyboardAwareScrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 24,
      } as ViewStyle,
      title: {
        fontSize: typography.fontSizeXL,
        fontWeight: typography.fontWeightBold as 'bold',
        lineHeight: typography.lineHeightXL,
        color: colors.textPrimary,
        marginBottom: spacing.xl,
        textAlign: 'center',
      } as TextStyle,
      input: {
        borderColor: colors.borderLight,
        borderWidth: borders.widthThin,
        borderRadius: borders.radiusMedium,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        fontSize: typography.fontSizeM,
        color: colors.textPrimary,
        backgroundColor: colors.surface,
      } as TextStyle,
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
        fontSize: typography.fontSizeL,
        fontWeight: typography.fontWeightBold as 'bold',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.xs,
      } as TextStyle,
      marketingSubheadline: {
        fontSize: typography.fontSizeS,
        color: colors.textSecondary,
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
        fontSize: typography.fontSizeS,
        color: colors.textPrimary,
        textAlign: 'center',
        minHeight: 36,
        display: 'flex',
        alignItems: 'center' as FlexAlignType,
        justifyContent: 'center',
      } as TextStyle,
      workflowArrow: {
        marginHorizontal: spacing.xs,
        alignSelf: 'center' as FlexAlignType,
      } as ViewStyle,
      button: {
        backgroundColor: colors.surface,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center' as FlexAlignType,
        justifyContent: 'center',
        marginTop: 0,
        borderTopWidth: borders.widthHairline,
        borderBottomWidth: borders.widthHairline,
        borderTopColor: colors.borderLight,
        borderBottomColor: colors.borderLight,
        minHeight: 44,
      } as ViewStyle,
      buttonText: {
        fontSize: typography.fontSizeM,
        color: colors.textPrimary,
        textAlign: 'center',
        fontWeight: typography.fontWeightNormal as 'normal',
        flex: 0,
      } as TextStyle,
      loginLinkContainer: {
        marginTop: spacing.lg,
        alignItems: 'center' as FlexAlignType,
      } as ViewStyle,
      loginLinkText: {
        color: colors.primary,
        fontSize: typography.fontSizeS,
        textDecorationLine: 'underline',
      } as TextStyle,
    },
    profileScreen: {
        safeArea: {
          flex: 1,
          backgroundColor: colors.background,
        } as ViewStyle,
        keyboardAvoidingView: {
            flex: 1,
        } as ViewStyle,
        scrollViewContent: {
          // No vertical padding here anymore
        } as ViewStyle,
        contentContainer: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
        } as ViewStyle,
        loadingContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center' as FlexAlignType,
          padding: spacing.lg,
          backgroundColor: colors.background,
        } as ViewStyle,
        errorTextContainer: {
           flex: 1,
           justifyContent: 'center',
           alignItems: 'center' as FlexAlignType,
           padding: spacing.lg,
           backgroundColor: colors.background,
         } as ViewStyle,
        errorText: {
          color: colors.error,
          textAlign: 'center',
          fontWeight: typography.fontWeightBold as '600',
          fontSize: typography.fontSizeM,
        } as TextStyle,
        statusMessageContainer: { // For save status
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.md,
            marginTop: spacing.xs,
        } as ViewStyle,
        successText: { // For save status
            color: colors.success,
            textAlign: 'center',
            fontWeight: typography.fontWeightBold as '600',
            fontSize: typography.fontSizeXS,
        } as TextStyle,
        section: {
          marginBottom: spacing.md,
        } as ViewStyle,
        sectionHeader: {
          paddingBottom: spacing.xs,
          marginBottom: spacing.xxs,
          color: colors.textSecondary,
          fontSize: typography.fontSizeS,
          fontWeight: typography.fontWeightMedium as '500',
          textTransform: 'uppercase',
        } as TextStyle,
        rowContainer: {
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
        iconContainer: {
          marginRight: spacing.md,
          width: 24,
          alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        label: {
          flex: 1,
          fontSize: typography.fontSizeM,
          color: colors.textPrimary,
        } as TextStyle,
        valueContainer: {
          flexShrink: 1,
          flexDirection: 'row',
          alignItems: 'center' as FlexAlignType,
          marginLeft: spacing.sm,
        } as ViewStyle,
        valueText: {
          fontSize: typography.fontSizeM,
          color: colors.textSecondary,
          textAlign: 'right',
        } as TextStyle,
        linkValueText: {
          color: colors.primary,
          textDecorationLine: 'underline',
        } as TextStyle,
        disclosureIcon: {
           marginLeft: spacing.xs,
        } as TextStyle, // Icon is typically text-based
        fieldContainer: {
            marginBottom: spacing.md,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.xs,
            borderBottomWidth: borders.widthHairline,
            borderBottomColor: colors.borderLight,
        } as ViewStyle,
        firstFieldInSection: {
            borderTopWidth: borders.widthHairline,
            borderTopColor: colors.borderLight,
        } as ViewStyle,
        fieldLabel: {
            fontSize: typography.fontSizeS,
            color: colors.textSecondary,
            marginBottom: spacing.xs,
            paddingTop: spacing.sm,
        } as TextStyle,
        textInput: {
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
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
        rowLabel: {
          flex: 1,
        } as TextStyle, // This seems duplicated, ensure it's correct
        iconImage: {
          width: 24,
          height: 24,
          borderRadius: borders.radiusSmall,
        } as ImageStyle,
        logoutButtonContainer: {
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            borderBottomWidth: borders.widthHairline,
            borderBottomColor: colors.borderLight,
            borderTopWidth: borders.widthHairline,
            borderTopColor: colors.borderLight,
            minHeight: 44,
        } as ViewStyle,
        logoutButtonText: {
            fontSize: typography.fontSizeM,
            color: colors.error,
            textAlign: 'center',
        } as TextStyle,
    },
    loginScreen: { // Added styles for LoginScreen
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      } as ViewStyle,
      keyboardAwareScrollViewContent: { // Specific for KeyboardAwareScrollView
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 24,
      } as ViewStyle,
      title: {
        fontSize: typography.fontSizeL,
        fontWeight: typography.fontWeightMedium as '500',
        lineHeight: typography.lineHeightL,
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.md,
      } as TextStyle,
      input: {
        fontSize: typography.fontSizeM,
        fontWeight: typography.fontWeightNormal as 'normal',
        lineHeight: typography.lineHeightM,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borders.radiusMedium,
        marginBottom: spacing.md,
        borderWidth: borders.widthThin,
        borderColor: colors.borderLight,
        color: colors.textPrimary,
      } as TextStyle,
      button: {
        backgroundColor: colors.surface,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center' as FlexAlignType,
        justifyContent: 'center',
        marginTop: 0,
        borderTopWidth: borders.widthHairline,
        borderBottomWidth: borders.widthHairline,
        borderTopColor: colors.borderLight,
        borderBottomColor: colors.borderLight,
        minHeight: 44,
      } as ViewStyle,
      buttonText: {
        fontSize: typography.fontSizeM,
        color: colors.textPrimary,
        textAlign: 'center',
        fontWeight: typography.fontWeightNormal as 'normal',
        flex: 0,
      } as TextStyle,
      errorText: {
        color: colors.error,
        fontSize: typography.fontSizeS,
        lineHeight: typography.lineHeightS,
        textAlign: 'center',
        marginBottom: spacing.md,
      } as TextStyle,
      signUpLinkContainer: {
        marginTop: spacing.lg,
        alignItems: 'center' as FlexAlignType,
      } as ViewStyle,
      signUpLinkText: {
        fontSize: typography.fontSizeS,
        color: colors.primary,
        textDecorationLine: 'underline',
      } as TextStyle,
      // Marketing Card Styles
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
        fontSize: typography.fontSizeL,
        fontWeight: typography.fontWeightBold as 'bold',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
      } as TextStyle,
      marketingSubheadline: {
        fontSize: typography.fontSizeS,
        color: colors.textSecondary,
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
      } as ViewStyle, // Icon specific style
      workflowLabel: {
        fontSize: typography.fontSizeS,
        color: colors.textPrimary,
        textAlign: 'center',
        minHeight: 36, // Ensure space for text wrapping
      } as TextStyle,
      workflowArrow: {
        marginHorizontal: spacing.xs,
        alignSelf: 'center' as FlexAlignType,
      } as ViewStyle,
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
        width: 20, // Give icon consistent width
      } as ViewStyle,
      marketingFeatureText: {
        fontSize: typography.fontSizeS,
        color: colors.textSecondary,
        flex: 1, // Allow text to wrap
      } as TextStyle,
      marketingCTA: {
          fontSize: typography.fontSizeS,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: spacing.sm,
          fontStyle: 'italic',
      } as TextStyle,
    },
    browseScreen: { // Added styles for BrowseScreen
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      } as ViewStyle,
      statusContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center' as FlexAlignType,
        padding: spacing.xl,
      } as ViewStyle,
      errorText: {
        color: colors.error,
        textAlign: 'center',
        fontWeight: typography.fontWeightMedium as '500',
        fontSize: typography.fontSizeM,
      } as TextStyle,
      emptyText: {
        color: colors.textSecondary,
        textAlign: 'center',
        fontSize: typography.fontSizeM,
        fontStyle: 'italic',
      } as TextStyle,
      rowContainer: {
        backgroundColor: colors.surface,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center' as FlexAlignType,
        borderBottomWidth: borders.widthHairline,
        borderBottomColor: colors.borderLight,
        minHeight: 48,
      } as ViewStyle,
      firstRow: {
        borderTopWidth: borders.widthHairline,
        borderTopColor: colors.borderLight,
      } as ViewStyle,
      iconContainer: {
        marginRight: spacing.md,
        width: 24,
        height: 24,
        alignItems: 'center' as FlexAlignType,
        justifyContent: 'center',
      } as ViewStyle,
      rowText: {
        flex: 1,
        fontSize: typography.fontSizeM,
        color: colors.textPrimary,
      } as TextStyle,
      loadingIconContainer: {
        marginLeft: 'auto',
        paddingLeft: spacing.sm,
      } as ViewStyle,
      disclosureIcon: {
        marginLeft: spacing.sm,
      } as ViewStyle, // Typically holds an icon component
      projectRowContainer: {
        paddingLeft: spacing.lg + spacing.md + 24, // Indent past customer icon+margin
        backgroundColor: colors.surface, // Keep consistent row background
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center' as FlexAlignType,
        borderBottomWidth: borders.widthHairline,
        borderBottomColor: colors.borderLight,
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
        backgroundColor: colors.surfaceAlt,
        borderRadius: borders.radiusMedium,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.fontSizeM,
        color: colors.textPrimary,
      } as TextStyle,
    },
    projectReportsScreen: {
        safeArea: {
          flex: 1,
          backgroundColor: colors.background,
        } as ViewStyle,
        statusContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center' as FlexAlignType,
          padding: spacing.xl,
        } as ViewStyle,
        errorText: {
          color: colors.error,
          textAlign: 'center',
          fontWeight: typography.fontWeightMedium as '500',
          fontSize: typography.fontSizeM,
        } as TextStyle,
        emptyText: {
          color: colors.textSecondary,
          textAlign: 'center',
          fontSize: typography.fontSizeM,
          fontStyle: 'italic',
        } as TextStyle,
        rowContainer: {
          backgroundColor: colors.surface,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center' as FlexAlignType,
          borderBottomWidth: borders.widthHairline,
          borderBottomColor: colors.borderLight,
          minHeight: 48,
        } as ViewStyle,
        firstRow: {
          borderTopWidth: borders.widthHairline,
          borderTopColor: colors.borderLight,
        } as ViewStyle,
        iconContainer: {
          marginRight: spacing.md,
          width: 24,
          height: 24,
          alignItems: 'center' as FlexAlignType,
          justifyContent: 'center',
        } as ViewStyle,
        rowText: {
          flex: 1,
          fontSize: typography.fontSizeM,
          color: colors.textPrimary,
        } as TextStyle,
        disclosureIcon: {
          marginLeft: spacing.sm,
        } as TextStyle, // Icon is text-based
        headerButton: {
          padding: spacing.md,
        } as ViewStyle,
        headerBackButtonContainer: { 
          flexDirection: 'row', 
          alignItems: 'center' as FlexAlignType,
          paddingLeft: Platform.OS === 'ios' ? spacing.sm : spacing.md, 
        } as ViewStyle,
        headerBackTitle: {
          fontSize: typography.fontSizeM,
          color: colors.textPrimary, 
          marginLeft: spacing.xs, 
        } as TextStyle,
    },
    webViewerScreen: { // Added styles for WebViewerScreen
        container: {
            flex: 1,
            backgroundColor: colors.background,
            position: 'relative',
            paddingTop: 0,
            marginTop: 0,
        } as ViewStyle,
        loadingContainer: {
            // Use StyleSheet.absoluteFillObject properties directly or copy them
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
            color: colors.error,
            padding: 20,
            textAlign: 'center',
        } as TextStyle,
        headerButton: {
            padding: spacing.xs,
        } as ViewStyle,
        headerButtonContainer: {
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        headerBackButtonContainer: { 
            flexDirection: 'row', 
            alignItems: 'center' as FlexAlignType,
            paddingLeft: Platform.OS === 'ios' ? spacing.sm : spacing.md,
        } as ViewStyle,
        headerBackTitle: {
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
            marginLeft: spacing.xs,
        } as TextStyle,
        // Note: Added a webview style that was previously inline
        webview: {
            flex: 1,
            paddingTop: 0,
            marginTop: 0,
        } as ViewStyle,
    },
  },
};

export default theme; 