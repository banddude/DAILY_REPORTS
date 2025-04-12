import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Switch,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
  RefreshControl,
  TextInput,
  Button,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons
import { useNavigation, useIsFocused } from '@react-navigation/native'; // Import useIsFocused
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config'; // <-- Add back config
import { useAuth } from '../context/AuthContext'; // <-- Add back AuthContext
import * as ImagePicker from 'expo-image-picker'; // <-- Import ImagePicker
import { ProfileScreenProps } from '../navigation/AppNavigator'; // Import navigation props type

// --- Define the original, full structure of the profile data ---
interface ProfileCompanyAddress {
    street?: string;
    unit?: string;
    city?: string;
    state?: string;
    zip?: string;
}
interface ProfileCompany {
    name?: string;
    address?: ProfileCompanyAddress;
    phone?: string;
    website?: string;
}
interface ProfileConfig {
    logoFilename?: string; // Keep for potential future use/reference
    chatModel?: string;
    whisperModel?: string;
    systemPrompt?: string;
    reportJsonSchema?: object; // Store as object, display as string
}
interface ProfileData {
  name?: string;
  email?: string;
  phone?: string;
  company?: ProfileCompany;
  config?: ProfileConfig;
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // Use theme background
  },
  keyboardAvoidingView: {
      flex: 1,
  },
  scrollViewContent: {
    // No vertical padding here anymore
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md, // Reduced bottom padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  errorTextContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     padding: spacing.lg,
     backgroundColor: colors.background,
   },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontWeight: typography.fontWeightBold as '600',
    fontSize: typography.fontSizeM,
  },
  statusMessageContainer: { // For save status
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      marginTop: spacing.xs,
  },
  successText: { // For save status
      color: colors.success,
      textAlign: 'center',
      fontWeight: typography.fontWeightBold as '600',
      fontSize: typography.fontSizeXS,
  },
  section: {
    marginBottom: spacing.md, // Further reduce bottom margin from lg to md
  },
  sectionHeader: {
    paddingBottom: spacing.xs, // Reduce padding bottom
    marginBottom: spacing.xxs, // Reduce margin bottom
    color: colors.textSecondary,
    fontSize: typography.fontSizeS,
    fontWeight: typography.fontWeightMedium as '500',
    textTransform: 'uppercase',
  },
  rowContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, // Reduce vertical padding from md to sm
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
    minHeight: 44, // Reduce minHeight slightly
  },
  firstRowInSection: {
    borderTopWidth: borders.widthHairline,
    borderTopColor: colors.borderLight,
  },
  iconContainer: {
    marginRight: spacing.md,
    width: 24, // Fixed width for alignment
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
  },
  valueContainer: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  valueText: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  linkValueText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  disclosureIcon: {
     marginLeft: spacing.xs,
  },
  fieldContainer: {
      marginBottom: spacing.md,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs, // Less vertical padding than rows
      borderBottomWidth: borders.widthHairline,
      borderBottomColor: colors.borderLight,
  },
  firstFieldInSection: {
      borderTopWidth: borders.widthHairline,
      borderTopColor: colors.borderLight,
  },
  fieldLabel: {
      fontSize: typography.fontSizeS, // Smaller label above input
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      paddingTop: spacing.sm, // Add some top padding for the label
  },
  textInput: {
      fontSize: typography.fontSizeM,
      color: colors.textPrimary,
      paddingVertical: Platform.OS === 'ios' ? 8 : 6, // Adjust padding for input itself
  },
  saveButtonContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)', // Semi-transparent background
      borderTopColor: colors.borderLight,
      borderTopWidth: borders.widthHairline,
  },
  rowLabel: {
    flex: 1,
  },
  iconImage: {
    width: 24, // Match icon container width
    height: 24, // Match icon size
    borderRadius: borders.radiusSmall, // Optional: round corners slightly
  },
});

// --- Utility to safely get/set nested properties (Adding set back) ---
const getNestedValue = (obj: any, path: string): any => {
    if (!obj) return undefined;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[key];
    }
    return current;
};

const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] === undefined || current[key] === null) {
            current[key] = {}; // Create nested objects if they don't exist
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
};

// --- Helper to open links --- (Adding back)
const openLink = async (url: string) => {
  if (!url) return;
  const prefixedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
  try {
      const supported = await Linking.canOpenURL(prefixedUrl);
      if (supported) {
        await Linking.openURL(prefixedUrl);
      } else {
        Alert.alert("Cannot Open Link", `Don't know how to open this URL: ${prefixedUrl}`);
      }
  } catch (error: any) {
       Alert.alert("Error Opening Link", `Could not open link: ${error.message}`);
  }
};

// --- Settings Row Component Interface (Simplified: No toggles, disclosures needed now) ---
interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap | { uri: string }; // Allow Ionicon name or Image URI object
  label?: string; // Make label optional
  value?: string | null; // Accept null
  isFirst?: boolean;
  isLink?: boolean;
  onPress?: () => void;
  numberOfLines?: number; // For potentially long values like system prompt
  showDisclosure?: boolean; // Add this prop
}

// --- Reusable Row Component (Adapted) ---
const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  label,
  value,
  isFirst,
  isLink,
  onPress,
  numberOfLines = 1,
  showDisclosure, // Use the prop
}) => {
  const displayValue = value ?? 'Not Set';

  const rowContent = (
    <View style={[styles.rowContainer, isFirst && styles.firstRowInSection]}>
      <View style={styles.iconContainer}>
        {typeof icon === 'string' ? (
          <Ionicons name={icon} size={22} color={colors.textSecondary} />
        ) : (
          <Image source={icon} style={styles.iconImage} resizeMode="contain" />
        )}
      </View>
      {/* Render label Text if provided, otherwise render an empty View spacer */}
      {label ? (
        <Text style={styles.rowLabel}>{label}</Text>
      ) : (
        <View style={styles.rowLabel} /> /* Spacer to push value right */
      )}
      <View style={styles.valueContainer}>
         <Text
            style={[styles.valueText, isLink && styles.linkValueText]}
            numberOfLines={numberOfLines}
            ellipsizeMode="tail"
          >
              {displayValue}
         </Text>
         {showDisclosure && (
             <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.disclosureIcon} />
         )}
      </View>
    </View>
  );

  // Wrap with TouchableOpacity only if it's a link or has an onPress handler
  if (isLink || onPress) {
      const handlePress = isLink ? () => openLink(value || '') : onPress;
      return (
          <TouchableOpacity onPress={handlePress} disabled={!value && isLink}>{rowContent}</TouchableOpacity>
      );
  }

  return rowContent;
};

// Helper function to format address
const formatAddress = (address?: ProfileCompanyAddress): string => {
    if (!address || Object.values(address).every(v => !v)) return 'Not Set';
    // Combine street and unit on the first line if both exist
    const streetLine = [
        address.street,
        address.unit,
    ].filter(Boolean).join(' ');

    const parts = [
        streetLine,
        // Keep city/state/zip on the next line
        `${address.city || ''}${address.city && address.state ? ', ' : ''}${address.state || ''} ${address.zip || ''}`.trim()
    ];
    return parts.filter(Boolean).join('\n'); // Join with newline for display
};

// --- Main Settings Screen Component ---
function ProfileScreen({ navigation }: ProfileScreenProps): React.ReactElement {
  const isFocused = useIsFocused();
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Tracks initial load
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false); // Tracks pull-to-refresh
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null); // <-- Add logoUrl state
  const { userToken } = useAuth();

  // Modify fetchProfile to accept options
  const fetchProfile = useCallback(async (options: { isInitialLoad?: boolean, isRefresh?: boolean } = {}) => {
    const { isInitialLoad = false, isRefresh = false } = options;

    // Only show full-screen loader on initial load
    if (isInitialLoad) {
        setIsLoading(true);
    }
    // Show pull-to-refresh indicator only on refresh action
    if (isRefresh) {
        setIsRefreshing(true);
    }

    // Clear only fetch errors, not potential save errors shown in dedicated screens
    setError(null); 

    if (!userToken) {
      setError('Authentication token not found.');
      if (isInitialLoad) setIsLoading(false);
      if (isRefresh) setIsRefreshing(false);
      return;
    }

    try {
      const cacheBuster = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/profile?cb=${cacheBuster}`, {
        headers: { 'Authorization': `Bearer ${userToken}`, 'Accept': 'application/json' }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to fetch profile' }));
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }
      const data: ProfileData = await response.json();
      data.company = data.company ?? {};
      data.company.address = data.company.address ?? {};
      data.config = data.config ?? {};
      setOriginalProfile(data);
      // Initialize logo URL after profile is fetched
      if (userToken) {
          setLogoUrl(`${API_BASE_URL}/api/logo/${userToken}?t=${Date.now()}`);
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      // Show error, but don't clear existing data if present
      setError(`Failed to load profile: ${err.message}`); 
      // Only clear profile if it was an initial load failure
      if (isInitialLoad) {
          setOriginalProfile(null);
      }
    } finally {
      // Always turn off indicators regardless of which one was active
      if (isInitialLoad) setIsLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, [userToken]);

  // Initial fetch on mount
  useEffect(() => {
    fetchProfile({ isInitialLoad: true });
  }, [fetchProfile]); // Depend on fetchProfile

  // Re-fetch on focus to update data (including logo if changed on EditLogo screen)
  useEffect(() => {
    if (isFocused && !isLoading) {
      fetchProfile(); // Re-fetch profile data
      // Also specifically re-fetch the logo URL in case it changed
      if (userToken) {
        setLogoUrl(`${API_BASE_URL}/api/logo/${userToken}?t=${Date.now()}`);
      }
    }
  }, [isFocused, isLoading, fetchProfile, userToken]);

  // --- Loading State (Only shows on initial mount) ---
  if (isLoading) { // This is now only true during the isInitialLoad fetch
      return (
        <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Loading Settings...</Text>
        </SafeAreaView>
      );
  }

  // --- Error State (Shows if initial load failed AND we have no data) ---
  if (error && !originalProfile) {
    const handleRetry = () => fetchProfile({ isInitialLoad: true }); // Retry should be initial load
    return (
      <SafeAreaView style={[styles.safeArea, styles.errorTextContainer]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { marginTop: spacing.md }]}>{error}</Text>
         <TouchableOpacity onPress={handleRetry} style={{ marginTop: spacing.lg }}>
              <Text style={{ color: colors.primary }}>Try Again</Text>
         </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Main Render Logic ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
          <ScrollView
              style={styles.scrollViewContent}
              contentContainerStyle={styles.contentContainer}
              refreshControl={
                  <RefreshControl
                      refreshing={isRefreshing} // Use the dedicated refreshing state
                      onRefresh={() => fetchProfile({ isRefresh: true })} // Trigger refresh fetch
                      tintColor={colors.primary}
                      colors={[colors.primary]}
                  />
              }
              keyboardShouldPersistTaps="handled"
          >
             {/* Display Fetch Error Inline if stale data exists */}
             <View style={styles.statusMessageContainer}>
                 {/* Display only general fetch errors here */}
                 {error && originalProfile && <Text style={[styles.errorText, {marginBottom: spacing.md}]}>{`Failed to refresh: ${error}`}</Text>}
             </View>

            {/* Render sections only if originalProfile exists */}
            {originalProfile ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Account</Text>
                   <SettingsRow
                       icon="person-circle-outline"
                       value={originalProfile.name || 'Not Set'}
                       isFirst
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditName')}
                   />
                   <SettingsRow
                       icon="mail-outline"
                       value={originalProfile.email || 'Not Set'}
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditEmail')}
                   />
                   <SettingsRow
                       icon="call-outline"
                       value={originalProfile.phone || 'Not Set'}
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditPhone')}
                   />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Company</Text>
                   <SettingsRow
                       icon="business-outline"
                       value={originalProfile.company?.name || 'Not Set'}
                       isFirst
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditCompanyName')}
                   />
                   <SettingsRow
                       icon="map-outline"
                       value={formatAddress(originalProfile.company?.address)}
                       numberOfLines={3}
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditAddress')}
                   />
                   <SettingsRow
                       icon="call-outline"
                       value={originalProfile.company?.phone || 'Not Set'}
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditCompanyPhone')}
                   />
                   <SettingsRow
                       icon="link-outline"
                       value={originalProfile.company?.website || 'Not Set'}
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditCompanyWebsite')}
                   />
                   {/* Logo Row - Moved Here */}
                   <SettingsRow
                     icon={logoUrl ? { uri: logoUrl } : 'image-outline'}
                     value="Logo"
                     onPress={() => navigation.navigate('EditLogo', { currentLogoUrl: logoUrl })}
                     showDisclosure={true}
                   />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Configuration</Text>
                   <SettingsRow
                     icon="reader-outline"
                     label="System Prompt"
                     value={originalProfile.config?.systemPrompt ? 'View/Edit Prompt' : 'Not Set'}
                     isFirst
                     numberOfLines={1}
                     showDisclosure={true}
                     onPress={() => navigation.navigate('EditSystemPrompt')}
                   />
                   <SettingsRow
                    icon="document-text-outline"
                    label="Report Schema"
                    value={originalProfile.config?.reportJsonSchema ? 'View/Edit Schema' : 'Not Set'}
                    numberOfLines={1}
                    showDisclosure={true}
                    onPress={() => navigation.navigate('EditReportSchema')}
                    isLink={false}
                  />
                </View>
              </>
            ) : (
                 // Optional: Show a message if profile is somehow null after load/refresh
                 <Text style={{textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl}}>Profile data unavailable.</Text>
            )}

          </ScrollView>
    </SafeAreaView>
  );
}

export default ProfileScreen; 