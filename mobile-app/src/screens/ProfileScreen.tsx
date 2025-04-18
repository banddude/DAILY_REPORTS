import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
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
import theme, { colors, spacing } from '../theme/theme'; // Import theme and other needed values
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
  isDev?: boolean;
}

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
    <View style={[theme.screens.profileScreen.rowContainer, isFirst && theme.screens.profileScreen.firstRowInSection]}>
      <View style={theme.screens.profileScreen.iconContainer}>
        {typeof icon === 'string' ? (
          <Ionicons name={icon} size={22} color={colors.textSecondary} />
        ) : (
          <Image source={icon} style={theme.screens.profileScreen.iconImage} resizeMode="contain" />
        )}
      </View>
      {label ? (
        <Text style={[theme.screens.profileScreen.rowLabel, labelStyle]}>{label}</Text> 
      ) : (
        <View style={theme.screens.profileScreen.rowLabel} />
      )}
      <View style={theme.screens.profileScreen.valueContainer}>
         <Text
            style={[theme.screens.profileScreen.valueText, isLink && theme.screens.profileScreen.linkValueText]}
            numberOfLines={numberOfLines}
            ellipsizeMode="tail"
          >
              {displayValue}
         </Text>
         {showDisclosure && (
             <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={theme.screens.profileScreen.disclosureIcon} />
         )}
      </View>
    </View>
  );

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
  const isFocused = useIsFocused(); // Add useIsFocused hook
  // Get session and user, not userToken
  const { session, user, signOut, loading: authLoading, isAuthenticated } = useAuth(); 
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [initialProfileData, setInitialProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now()); // For cache busting

  const fetchProfile = useCallback(async ({ isInitialLoad = false } = {}) => {
    // Use isAuthenticated
    if (!isAuthenticated) { 
      console.log("fetchProfile: Not authenticated, skipping fetch.");
      // Don't set loading if it's not an initial load (e.g., focus-based refresh)
      if (isInitialLoad) setIsLoading(false); 
      setError('Not logged in.'); // Set an error if not logged in
      setProfileData(null);
      return;
    }
    
    // Only set main loading state on initial load
    if (isInitialLoad) setIsLoading(true);
    setError(null);
    setSaveStatus(null); // Clear save status on refresh

    try {
      // Get token from session
      const token = session?.access_token;
      if (!token) {
         throw new Error("Authentication token not found.");
      }

      console.log("Fetching profile data...");
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'GET',
        headers: {
          // Use token from session
          'Authorization': `Bearer ${token}`, 
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
             email: data.email || user?.email, // Use server email or fallback to auth context
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
             },
             isDev: data.is_dev, // Map new is_dev flag
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
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [session?.access_token, user?.email]);

  // Initial fetch on mount
  useEffect(() => {
    console.log("ProfileScreen useEffect: isFocused, isAuthenticated:", isFocused, isAuthenticated);
    // Check isAuthenticated
    if (isFocused && isAuthenticated) { 
       fetchProfile({ isInitialLoad: !profileData }); // Trigger fetch, only set initial load if no data yet
    } else if (!isAuthenticated) {
       // Clear data if user logs out while screen might be cached
       setProfileData(null);
       setError('Please log in to view your profile.');
       setIsLoading(false);
    }
  // Depend on isAuthenticated and isFocused
  }, [isFocused, isAuthenticated]); // Removed fetchProfile from deps to avoid loops

  // Re-fetch on focus to update data (including logo if changed on EditLogo screen)
  useEffect(() => {
    if (isFocused && !isLoading) {
      fetchProfile(); // Re-fetch profile data
      // Also specifically re-fetch the logo URL in case it changed
      if (session?.access_token) {
        setLogoTimestamp(Date.now()); // Refresh logo timestamp on focus
      }
    }
  }, [isFocused, isLoading, fetchProfile, session?.access_token]);

  // --- Loading State (Only shows on initial mount) ---
  if (authLoading || (isLoading && !profileData && !error)) {
    return (
      <SafeAreaView style={[theme.screens.profileScreen.safeArea, theme.screens.profileScreen.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Loading Settings...</Text>
      </SafeAreaView>
    );
  }

  // --- Error State (Shows if initial load failed AND we have no data) ---
  if (error && !profileData) {
    const handleRetry = () => fetchProfile({ isInitialLoad: true });
    return (
      <SafeAreaView style={[theme.screens.profileScreen.safeArea, theme.screens.profileScreen.errorTextContainer]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[theme.screens.profileScreen.errorText, { marginTop: spacing.md }]}>{error}</Text>
         <TouchableOpacity onPress={handleRetry} style={{ marginTop: spacing.lg }}>
              <Text style={{ color: colors.primary }}>Try Again</Text>
         </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Main Render Logic ---
  return (
    <SafeAreaView style={theme.screens.profileScreen.safeArea} edges={['left', 'right', 'bottom']}>
          <ScrollView
              style={theme.screens.profileScreen.scrollViewContent}
              contentContainerStyle={theme.screens.profileScreen.contentContainer}
              refreshControl={
                  <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => fetchProfile({ isInitialLoad: true })}
                      tintColor={colors.primary}
                      colors={[colors.primary]}
                  />
              }
              keyboardShouldPersistTaps="handled"
          >
             <View style={theme.screens.profileScreen.statusMessageContainer}>
                 {error && profileData && <Text style={[theme.screens.profileScreen.errorText, {marginBottom: spacing.md}]}>{`Failed to refresh: ${error}`}</Text>}
             </View>

            {profileData ? (
              <>
                <View style={theme.screens.profileScreen.section}>
                  <Text style={theme.screens.profileScreen.sectionHeader}>Account</Text>
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

                <View style={theme.screens.profileScreen.section}>
                  <Text style={theme.screens.profileScreen.sectionHeader}>Company</Text>
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
                   <SettingsRow
                     icon={profileData.config?.logoFilename ? { uri: `${API_BASE_URL}/api/logo/${user?.id}?t=${logoTimestamp}` } : 'image-outline'}
                     value="Logo"
                     onPress={() => navigation.navigate('EditLogo', { currentLogoUrl: `${API_BASE_URL}/api/logo/${user?.id}?t=${logoTimestamp}` })}
                     showDisclosure={true}
                   />
                </View>

                {/* Configuration section has been moved to Developer screen */}

                {/* Developer access button, only visible for dev users */}
                {profileData.isDev && (
                  <View style={theme.screens.profileScreen.section}>
                    <SettingsRow
                      icon="construct-outline"
                      label="Developer"
                      value=""
                      onPress={() => {
                        const parentNav = navigation.getParent();
                        if (parentNav) {
                          parentNav.navigate('ProfileTab', { screen: 'Developer' as any });
                        } else {
                          (navigation as any).navigate('Developer');
                        }
                      }}
                      showDisclosure={true}
                      isFirst={true}
                    />
                  </View>
                )}
                {/* Log Out button, always visible */}
                <View style={theme.screens.profileScreen.section}>
                  <SettingsRow
                    icon="log-out-outline"
                    label="Log Out"
                    value=""
                    onPress={signOut}
                    showDisclosure={true}
                    labelStyle={{ color: colors.error, textAlign: 'center', flex: 1 }}
                    isFirst={!profileData.isDev}
                  />
                </View>
              </>
            ) : (
                 <Text style={{textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl}}>Profile data unavailable.</Text>
            )}

          </ScrollView>
    </SafeAreaView>
  );
}

export default ProfileScreen;
export { SettingsRow }; 