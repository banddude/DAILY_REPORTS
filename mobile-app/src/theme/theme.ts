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
    reportEditorScreen: {
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      } as ViewStyle,
      container: {
        flex: 1,
      } as ViewStyle,
      centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center' as FlexAlignType,
        padding: spacing.lg,
        backgroundColor: colors.background,
      } as ViewStyle,
      loadingText: {
        marginTop: spacing.sm,
        fontSize: typography.fontSizeM,
        color: colors.textSecondary,
      } as TextStyle,
      errorText: {
        color: colors.error,
        fontSize: typography.fontSizeM,
        textAlign: 'center',
        marginBottom: spacing.md,
        fontWeight: typography.fontWeightBold as '600',
      } as TextStyle,
      placeholderText: {
          fontSize: typography.fontSizeS,
          color: colors.textSecondary,
          fontStyle: 'italic',
          textAlign: 'center',
          paddingVertical: spacing.lg,
      } as TextStyle,
      placeholderTextSmall: {
          fontSize: typography.fontSizeXS,
          color: colors.textSecondary,
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
        fontSize: typography.fontSizeXL,
        fontWeight: typography.fontWeightBold as '600',
        color: colors.textPrimary,
        marginBottom: spacing.md,
        textAlign: 'center',
      } as TextStyle,
      metaInfo: {
        fontSize: typography.fontSizeS,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xs,
        lineHeight: typography.lineHeightS,
      } as TextStyle,
      companyInfo: {
        marginTop: spacing.md,
      } as ViewStyle,
      companyName: {
          fontWeight: typography.fontWeightMedium as '500',
          fontSize: typography.fontSizeS,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.xs,
      } as TextStyle,
      statusContainer: {
         marginHorizontal: spacing.lg,
         marginBottom: spacing.md,
      } as ViewStyle,
      statusText: {
          textAlign: 'center',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: borders.radiusSmall,
          fontWeight: typography.fontWeightMedium as '500',
          fontSize: typography.fontSizeXS,
          overflow: 'hidden',
          borderWidth: borders.widthThin,
      } as TextStyle,
      statusSuccess: {
          backgroundColor: colors.successBg,
          color: colors.successText,
          borderColor: colors.successBorder,
      } as TextStyle,
      statusError: {
          backgroundColor: colors.errorBg,
          color: colors.error,
          borderColor: colors.errorBorder,
      } as TextStyle,
      sectionContainer: {
          marginBottom: spacing.xl,
      } as ViewStyle,
      sectionHeader: {
          paddingBottom: spacing.xs,
          marginBottom: spacing.xxs,
          paddingHorizontal: spacing.lg,
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
          alignItems: 'flex-start' as FlexAlignType,
          borderBottomWidth: borders.widthHairline,
          borderBottomColor: colors.borderLight,
          minHeight: 48,
      } as ViewStyle,
      firstRowInSection: {
          borderTopWidth: borders.widthHairline,
          borderTopColor: colors.borderLight,
      } as ViewStyle,
      rowContentContainer: {
         flex: 1,
         marginRight: spacing.sm,
      } as ViewStyle,
      rowInput: {
          fontSize: typography.fontSizeM,
          color: colors.textPrimary,
          paddingVertical: Platform.OS === 'ios' ? 6 : 4,
          paddingHorizontal: 0,
          textAlignVertical: 'top',
      } as TextStyle,
      rowMultiInputContainer: {
         // No specific styles, used for layout
      } as ViewStyle,
      fieldLabel: {
          fontSize: typography.fontSizeXS,
          fontWeight: typography.fontWeightMedium as '500',
          color: colors.textSecondary,
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
         justifyContent: 'space-between',
         alignItems: 'center' as FlexAlignType,
         minHeight: 44,
         paddingVertical: spacing.xs,
         borderBottomWidth: 0,
         // Inherits rowContainer styles like background, paddingHorizontal
      } as ViewStyle,
      addRowIcon: {
         marginRight: spacing.md,
      } as ViewStyle, // Typically holds an icon component
      addRowText: {
         flex: 1,
         fontSize: typography.fontSizeM,
         color: colors.primary,
         fontWeight: typography.fontWeightMedium as '500',
      } as TextStyle,
      imageItemRow: {
         flexDirection: 'column',
         alignItems: 'stretch' as FlexAlignType,
         paddingVertical: spacing.md,
         // Inherits rowContainer styles like background, paddingHorizontal, border
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
         // No specific styles needed, used for layout
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
          color: colors.error,
          fontSize: typography.fontSizeS,
          fontWeight: typography.fontWeightMedium as '500',
          marginLeft: spacing.xs,
      } as TextStyle,
      uploadActivityContainer: {
         flexDirection: 'row',
         alignItems: 'center' as FlexAlignType,
         marginLeft: spacing.sm,
         paddingVertical: spacing.xs,
      } as ViewStyle,
      uploadActivityText: {
         marginLeft: spacing.xs,
         color: colors.textSecondary,
         fontSize: typography.fontSizeXS,
         fontStyle: 'italic',
      } as TextStyle,
      button: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borders.radiusMedium,
        backgroundColor: colors.primary,
        alignItems: 'center' as FlexAlignType,
        justifyContent: 'center',
        minHeight: 44,
      } as ViewStyle,
      buttonText: {
        color: colors.textOnPrimary,
        fontSize: typography.fontSizeM,
        fontWeight: typography.fontWeightMedium as '500',
      } as TextStyle,
      headerButton: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
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
    homeScreen: {
        safeArea: {
            flex: 1,
            backgroundColor: colors.background,
        } as ViewStyle,
        scrollContainer: {
            flexGrow: 1,
            paddingVertical: spacing.lg,
        } as ViewStyle,
        title: {
            fontSize: typography.fontSizeXL,
            fontWeight: typography.fontWeightBold as 'bold',
            color: colors.textPrimary,
            marginBottom: spacing.xs,
            textAlign: 'center' as const,
            lineHeight: typography.lineHeightXL,
            paddingHorizontal: spacing.lg,
        } as TextStyle,
        description: {
            color: colors.textSecondary,
            fontSize: typography.fontSizeM,
            marginBottom: spacing.xl,
            textAlign: 'center' as const,
            lineHeight: typography.lineHeightM,
            paddingHorizontal: spacing.lg,
        } as TextStyle,
        sectionContainer: {
            marginBottom: spacing.xl,
        } as ViewStyle,
        sectionHeaderText: {
            paddingBottom: spacing.xs,
            marginBottom: spacing.xxs,
            paddingHorizontal: spacing.lg,
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
            minHeight: 48,
        } as ViewStyle,
        firstRowInSection: {
            borderTopWidth: borders.widthHairline,
            borderTopColor: colors.borderLight,
        } as ViewStyle,
        rowDisabled: {
            opacity: 0.6,
        } as ViewStyle,
        rowIconContainer: {
            marginRight: spacing.md,
            width: 24,
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        rowLabel: {
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
            flexGrow: 1,
            flexShrink: 0,
        } as TextStyle,
        rowLabelDisabled: {
            color: colors.textDisabled,
        } as TextStyle,
        rowValueContainer: {
            flexShrink: 1,
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
            marginLeft: spacing.sm,
        } as ViewStyle,
        rowValueText: {
            fontSize: typography.fontSizeM,
            color: colors.textSecondary,
            textAlign: 'right' as const,
            marginRight: spacing.xs,
        } as TextStyle,
        rowValueDisabled: {
            color: colors.textDisabled,
            fontStyle: 'italic',
        } as TextStyle,
        rowChevron: {
            // Empty - used for positioning icon
        } as ViewStyle,
        rowSpinner: {
            marginLeft: spacing.xs, // Add some space for spinner
        } as ViewStyle,
        fetchErrorText: {
            color: colors.error,
            fontSize: typography.fontSizeS,
            textAlign: 'center' as const,
            paddingVertical: spacing.sm,
            marginHorizontal: spacing.lg,
            fontWeight: typography.fontWeightMedium as '500',
            backgroundColor: colors.errorBg,
            borderRadius: borders.radiusSmall,
            marginBottom: spacing.sm,
            borderWidth: borders.widthThin,
            borderColor: colors.errorBorder,
        } as TextStyle,
        uploadSectionContent: { // Note: This style might be unused now
            backgroundColor: colors.surface,
            borderTopWidth: borders.widthHairline,
            borderTopColor: colors.borderLight,
            borderBottomWidth: borders.widthHairline,
            borderBottomColor: colors.borderLight,
            paddingHorizontal: 0,
            marginBottom: spacing.xl,
        } as ViewStyle,
        buttonBase: {
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
            borderBottomWidth: borders.widthHairline,
            borderBottomColor: colors.borderLight,
            minHeight: 48,
            width: '100%',
            justifyContent: 'space-between',
        } as ViewStyle,
        buttonDisabled: {
            opacity: 0.6,
        } as ViewStyle,
        buttonTextBase: {
            fontSize: typography.fontSizeM,
            color: colors.textPrimary, // Using a specific color ('#222') in original - adjust if needed
            flexShrink: 1,
            marginLeft: spacing.md,
        } as TextStyle,
        buttonTextDisabled: {
            color: colors.textDisabled,
        } as TextStyle,
        buttonIconContainer: {
            width: 24,
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        buttonChevronContainer: {
            marginLeft: spacing.sm,
        } as ViewStyle,
        buttonActivityIndicator: {
            // Empty - potentially used for styling indicator within chevron container
        } as ViewStyle,
        thumbnailContainer: { // Note: This style might be unused now
            flexDirection: 'row',
            alignItems: 'center' as FlexAlignType,
            marginTop: spacing.md,
            padding: spacing.sm,
            backgroundColor: colors.surfaceAlt,
            borderRadius: borders.radiusMedium,
            borderWidth: 1,
            borderColor: colors.borderLight,
        } as ViewStyle,
        thumbnail: { // Note: This style might be unused now
            width: 60,
            height: 60,
            borderRadius: borders.radiusSmall,
            backgroundColor: colors.borderLight,
        } as ImageStyle,
        thumbnailPlaceholder: { // Note: This style might be unused now
            width: 60,
            height: 60,
            borderRadius: borders.radiusSmall,
            backgroundColor: colors.surfaceAlt,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
            borderWidth: 1,
            borderColor: colors.borderLight,
            padding: spacing.xs,
        } as ViewStyle,
        thumbnailPlaceholderText: { // Note: This style might be unused now
            fontSize: typography.fontSizeXS,
            color: colors.textSecondary,
            textAlign: 'center' as const,
            marginTop: spacing.xxs,
        } as TextStyle,
        thumbnailInfoContainer: { // Note: This style might be unused now
            flex: 1,
            marginLeft: spacing.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center' as FlexAlignType,
        } as ViewStyle,
        thumbnailFileName: { // Note: This style might be unused now
            fontSize: typography.fontSizeS,
            color: colors.textPrimary,
            fontWeight: typography.fontWeightMedium as '500',
            flexShrink: 1, // Allow text to shrink
            marginRight: spacing.xs, // Space before clear button
        } as TextStyle,
        thumbnailClearButton: { // Note: This style might be unused now
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
            // Base already covers background
        } as ViewStyle,
        resultTextBase: {
            fontSize: typography.fontSizeM,
            lineHeight: typography.lineHeightM,
            marginBottom: spacing.sm,
            textAlign: 'left' as const,
        } as TextStyle,
        resultTextLoading: {
            color: colors.textSecondary,
            textAlign: 'center' as const,
            fontWeight: typography.fontWeightNormal as 'normal',
        } as TextStyle,
        resultTextError: {
            color: colors.error,
            fontWeight: typography.fontWeightNormal as 'normal',
        } as TextStyle,
        resultLoadingIndicator: {
            marginTop: spacing.sm,
            alignSelf: 'center' as FlexAlignType,
        } as ViewStyle,
        modalContainer: { // Note: This style might be unused now
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center' as FlexAlignType,
            paddingBottom: 100,
        } as ViewStyle,
        videoContainer: { // Note: This style might be unused now
            width: Dimensions.get('window').width * 0.9,
            height: Dimensions.get('window').height * 0.7,
            backgroundColor: colors.background,
            borderRadius: borders.radiusMedium,
            overflow: 'hidden',
            marginBottom: spacing.lg,
        } as ViewStyle,
        videoPlayer: { // Note: This style might be unused now
            width: '100%',
            height: '100%',
        } as ImageStyle,
        closeButton: {
            // Empty - potentially used for modal close button styling
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
        disabledButton: { // Applied in JSX logic, kept for reference or future use
            opacity: 0.6,
        } as ViewStyle,
        generateButtonText: {
            fontSize: typography.fontSizeM,
            color: colors.textPrimary,
            textAlign: 'center' as const,
            fontWeight: typography.fontWeightNormal as 'normal',
        } as TextStyle,
        instructionsContainer: { // Note: This style might be unused now
            flexDirection: 'row',
            backgroundColor: colors.surface,
            borderRadius: borders.radiusMedium,
            padding: spacing.md,
            marginBottom: spacing.lg, // Space before the next section
            borderWidth: borders.widthThin,
            borderColor: colors.borderLight,
        } as ViewStyle,
        instructionsIcon: { // Note: This style might be unused now
            marginRight: spacing.sm,
            marginTop: 1, // Align icon slightly better
        } as ViewStyle,
        instructionsTextContainer: { // Note: This style might be unused now
            flex: 1,
        } as ViewStyle,
        instructionsTitle: { // Note: This style might be unused now
            fontSize: typography.fontSizeS,
            fontWeight: typography.fontWeightBold as 'bold',
            color: colors.textPrimary,
            marginBottom: spacing.xs,
        } as TextStyle,
        instructionsText: { // Note: This style might be unused now
            fontSize: typography.fontSizeS - 1, // Slightly smaller
            lineHeight: typography.lineHeightS,
            color: colors.textSecondary,
            marginBottom: spacing.xs,
        } as TextStyle,
        instructionsBold: { // Note: This style might be unused now
            fontWeight: typography.fontWeightBold as 'bold',
            color: colors.textPrimary, // Make bold parts stand out more
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
            fontSize: typography.fontSizeM,
            fontWeight: typography.fontWeightBold as 'bold',
            color: colors.textPrimary,
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
            flex: 1,
            // Inherits text styles? Check base Text component or add explicitly
             fontSize: typography.fontSizeS,
             color: colors.textSecondary,
             lineHeight: typography.lineHeightS,
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
            marginTop: spacing.md, // Was 16
            fontSize: 18, // Consider using typography.fontSizeL or M
            color: colors.textPrimary,
            fontWeight: 'bold', // Consider using typography.fontWeightBold
        } as TextStyle,
        mediaCard: { // Note: This style might be unused now
            backgroundColor: colors.surface,
            borderRadius: borders.radiusLarge, // Was 16
            padding: spacing.sm + spacing.xs, // Was 12
            marginTop: spacing.md, // Was 16
            marginBottom: spacing.sm, // Was 8
            alignItems: 'center' as FlexAlignType,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
        } as ViewStyle,
        mediaThumbnailWrapper: { // Note: This style might be unused now
            position: 'relative',
            width: 120,
            height: 120,
            borderRadius: borders.radiusLarge - 4, // Was 12
            overflow: 'hidden',
            marginBottom: spacing.sm, // Was 8
        } as ViewStyle,
        mediaThumbnail: { // Note: This style might be unused now
            width: '100%',
            height: '100%',
            borderRadius: borders.radiusLarge - 4, // Was 12
            backgroundColor: colors.borderLight,
        } as ImageStyle,
        playIcon: { // Note: This style might be unused now
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -18,
            marginTop: -18,
        } as ViewStyle,
        removeMediaButton: { // Note: This style might be unused now
            position: 'absolute',
            top: 6,
            right: 6,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 14, // Consider borders.radiusPill if fully round
            padding: 2,
            zIndex: 2,
        } as ViewStyle,
        mediaFileName: { // Note: This style might be unused now
            fontSize: typography.fontSizeS,
            color: colors.textPrimary,
            fontWeight: typography.fontWeightMedium as '500',
            marginTop: spacing.xxs, // Was 2
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
            backgroundColor: colors.surface, // Was #fff
            borderRadius: 20, // Consider borders.radiusLarge+4 or specific value
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
            borderRadius: 20, // Match previewModalContent
            backgroundColor: '#000', // Keep black for video background
        } as ImageStyle,
        previewModalCloseButton: {
            position: 'absolute',
            top: spacing.sm + spacing.xs, // Was 12
            right: spacing.sm + spacing.xs, // Was 12
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: 20, // Half of width/height
            width: 40,
            height: 40,
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            zIndex: 10,
            borderWidth: 2, // Keep explicit?
            borderColor: '#fff', // Keep explicit white?
        } as ViewStyle,
        thumbnailPreviewWrapper: {
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            marginTop: spacing.md, // Was 16
            marginBottom: spacing.sm, // Was 8
            position: 'relative',
        } as ViewStyle,
        thumbnailPreviewContainer: {
            width: 120,
            height: 120,
            borderRadius: borders.radiusLarge - 4, // Was 12
            overflow: 'hidden',
            backgroundColor: '#eee', // Consider colors.borderLight or surfaceAlt
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            borderWidth: 1, // borders.widthThin
            borderColor: '#ccc', // Consider colors.border
        } as ViewStyle,
        thumbnailPreviewImage: {
            width: '100%',
            height: '100%',
            borderRadius: borders.radiusLarge - 4, // Was 12
            backgroundColor: '#eee', // Consider colors.borderLight or surfaceAlt
        } as ImageStyle,
        thumbnailPlayIcon: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -20, // Half of icon size (40)
            marginTop: -20, // Half of icon size (40)
            opacity: 0.8,
            color: '#222' // Consider colors.textPrimary
        } as ViewStyle,
        thumbnailRemoveButton: {
            position: 'absolute',
            top: spacing.xs, // Was 4
            // Original used '25%' right offset, which is hard to maintain.
            // Positioning relative to the 120x120 wrapper might be better.
            // Example: right: (Dimensions.get('window').width / 2) - (120 / 2) + (120/2) - (28/2) - 4? // Complex.
            // Let's keep the percentage for now, but acknowledge it's brittle.
             right: '25%',
            backgroundColor: '#222', // Consider colors.textPrimary or a dark grey
            borderRadius: 14, // Half of width/height
            width: 28,
            height: 28,
            alignItems: 'center' as FlexAlignType,
            justifyContent: 'center',
            zIndex: 2,
            borderWidth: 2, // Keep explicit?
            borderColor: '#fff', // Keep explicit white?
        } as ViewStyle,
    },
  },
};

export default theme; 