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
  logoutButtonContainer: {
      backgroundColor: colors.surface, // Match row background
      paddingHorizontal: spacing.lg, // Match row horizontal padding
      paddingVertical: spacing.sm, // Match row vertical padding (use sm like other rows)
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center', // Center the text
      borderBottomWidth: borders.widthHairline, // Match row border
      borderBottomColor: colors.borderLight, // Match row border color
      borderTopWidth: borders.widthHairline, // Match row border (as first in section)
      borderTopColor: colors.borderLight, // Match row border color
      minHeight: 44, // Match row min height
  },
  logoutButtonText: {
      fontSize: typography.fontSizeM, // Match row label font size
      color: colors.error, // Keep error color for logout
      // fontWeight: typography.fontWeightMedium as '500', // Remove potential bolding to match standard labels
      textAlign: 'center', // Keep text centered
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
  labelStyle?: any; // Add labelStyle prop
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
  labelStyle, // Use the prop
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
        <Text style={[styles.rowLabel, labelStyle]}>{label}</Text>
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
  const auth = useAuth();
  const isFocused = useIsFocused();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [initialProfileData, setInitialProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now()); // For cache busting

  const fetchProfile = useCallback(async ({ isInitialLoad = false } = {}) => {
    if (!auth.userToken) {
      setError('Authentication token is missing.');
      setLoading(false);
      return;
    }
    if (isInitialLoad) setLoading(true);
    setError(null);
    setSaveStatus(null); // Clear save status on fetch

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${auth.userToken}`,
          'Accept': 'application/json',
        },
      });
      const data = await response.json();

      if (!response.ok) {
          // Check if the error indicates profile needs initialization
          if (response.status === 404 && data?.needsInitialization) {
              console.log('Profile needs initialization.');
              setError('User profile not found. Please initialize your profile first.'); 
              // Keep profileData null or set to an empty object if needed for UI
              setProfileData(null); // Or setProfileData({});
          } else {
              throw new Error(data.error || `HTTP error! status: ${response.status}`);
          }
      } else {
         // Convert snake_case from server to camelCase for local state
         const camelCaseData: ProfileData = {
             name: data.full_name, // Map full_name to name
             email: data.email || auth.user?.email, // Use server email or fallback to auth context
             phone: data.phone,
             company: {
                 name: data.company_name,
                 address: {
                     street: data.company_street,
                     unit: data.company_unit,
                     city: data.company_city,
                     state: data.company_state,
                     zip: data.company_zip,
                 },
                 phone: data.company_phone,
                 website: data.company_website,
             },
             config: {
                 logoFilename: data.config_logo_filename,
                 chatModel: data.config_chat_model,
                 systemPrompt: data.config_system_prompt,
                 reportJsonSchema: typeof data.config_report_json_schema === 'string' 
                                    ? JSON.parse(data.config_report_json_schema) 
                                    : data.config_report_json_schema, // Parse schema string
             }
         };
         setProfileData(camelCaseData);
         if (isInitialLoad) {
             setInitialProfileData(camelCaseData); // Store initial state only once
         }
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(`Failed to load profile: ${err.message}`);
      // Only clear profile if it was an initialization error maybe?
      // setProfileData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.userToken, auth.user?.email]);

  // Initial fetch on mount
  useEffect(() => {
    fetchProfile({ isInitialLoad: true });
  }, [fetchProfile]); // Depend on fetchProfile

  // Re-fetch on focus to update data (including logo if changed on EditLogo screen)
  useEffect(() => {
    if (isFocused && !loading) {
      fetchProfile(); // Re-fetch profile data
      // Also specifically re-fetch the logo URL in case it changed
      if (auth.userToken) {
        setLogoTimestamp(Date.now()); // Refresh logo timestamp on focus
      }
    }
  }, [isFocused, loading, fetchProfile, auth.userToken]);

  // --- Loading State (Only shows on initial mount) ---
  if (loading) { // This is now only true during the isInitialLoad fetch
      return (
        <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Loading Settings...</Text>
        </SafeAreaView>
      );
  }

  // --- Error State (Shows if initial load failed AND we have no data) ---
  if (error && !profileData) {
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
                      refreshing={refreshing} // Use the dedicated refreshing state
                      onRefresh={() => fetchProfile({ isInitialLoad: true })} // Trigger refresh fetch
                      tintColor={colors.primary}
                      colors={[colors.primary]}
                  />
              }
              keyboardShouldPersistTaps="handled"
          >
             {/* Display Fetch Error Inline if stale data exists */}
             <View style={styles.statusMessageContainer}>
                 {/* Display only general fetch errors here */}
                 {error && profileData && <Text style={[styles.errorText, {marginBottom: spacing.md}]}>{`Failed to refresh: ${error}`}</Text>}
             </View>

            {/* Render sections only if profileData exists */}
            {profileData ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Account</Text>
                   <SettingsRow
                       icon="person-circle-outline"
                       value={profileData.name || 'Not Set'}
                       isFirst
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditName')}
                   />
                   <SettingsRow
                       icon="mail-outline"
                       value={profileData.email || 'Not Set'}
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditEmail')}
                   />
                   <SettingsRow
                       icon="call-outline"
                       value={profileData.phone || 'Not Set'}
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditPhone')}
                   />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Company</Text>
                   <SettingsRow
                       icon="business-outline"
                       value={profileData.company?.name || 'Not Set'}
                       isFirst
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditCompanyName')}
                   />
                   <SettingsRow
                       icon="map-outline"
                       value={formatAddress(profileData.company?.address)}
                       numberOfLines={3}
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditAddress')}
                   />
                   <SettingsRow
                       icon="call-outline"
                       value={profileData.company?.phone || 'Not Set'}
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditCompanyPhone')}
                   />
                   <SettingsRow
                       icon="link-outline"
                       value={profileData.company?.website || 'Not Set'}
                       showDisclosure={true}
                       onPress={() => navigation.navigate('EditCompanyWebsite')}
                   />
                   {/* Logo Row - Moved Here */}
                   <SettingsRow
                     icon={profileData.config?.logoFilename ? { uri: `${API_BASE_URL}/api/logo/${auth.user?.id}?t=${logoTimestamp}` } : 'image-outline'}
                     value="Logo"
                     onPress={() => navigation.navigate('EditLogo', { currentLogoUrl: `${API_BASE_URL}/api/logo/${auth.user?.id}?t=${logoTimestamp}` })}
                     showDisclosure={true}
                   />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Configuration</Text>
                   <SettingsRow
                     icon="chatbubbles-outline"
                     label="Chat Model"
                     value={profileData.config?.chatModel || 'Not Set'}
                     isFirst
                     showDisclosure={true}
                     onPress={() => navigation.navigate('EditChatModel')}
                   />
                   <SettingsRow
                     icon="reader-outline"
                     label="System Prompt"
                     value={profileData.config?.systemPrompt ? 'View/Edit Prompt' : 'Not Set'}
                     numberOfLines={1}
                     showDisclosure={true}
                     onPress={() => navigation.navigate('EditSystemPrompt')}
                   />
                   <SettingsRow
                    icon="document-text-outline"
                    label="Report Schema"
                    value={profileData.config?.reportJsonSchema ? 'View/Edit Schema' : 'Not Set'}
                    numberOfLines={1}
                    showDisclosure={true}
                    onPress={() => navigation.navigate('EditReportSchema')}
                    isLink={false}
                  />
                  {/* Logout as a SettingsRow, styled identically to other rows */}
                  <SettingsRow
                    icon="log-out-outline"
                    label="Log Out"
                    value=""
                    onPress={auth.signOut}
                    isFirst={false}
                    showDisclosure={true}
                    // Custom label style for red color and centering
                    labelStyle={{ color: colors.error, textAlign: 'center', flex: 1 }}
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