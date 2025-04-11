import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Linking,
  ImageSourcePropType,
  TextInput,
  Button,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config'; // <-- Import from config
import { useAuth } from '../context/AuthContext'; // Add this import for auth context
import * as ImagePicker from 'expo-image-picker'; // Import ImagePicker

// Define the expected structure of the profile data
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
    customer?: string;
    project?: string;
}
interface ProfileConfig {
    logoFilename?: string;
    chatModel?: string;
    whisperModel?: string;
    systemPrompt?: string;
    reportJsonSchema?: object;
}
interface ProfileData {
  name?: string;
  email?: string;
  phone?: string;
  company?: ProfileCompany;
  config?: ProfileConfig;
}

// Type for keys that can be edited directly or nested in company
type EditableProfileKey =
    | 'name' | 'email' | 'phone'
    | 'company.name' | 'company.phone' | 'company.website'
    | 'company.address.street' | 'company.address.unit' | 'company.address.city' | 'company.address.state' | 'company.address.zip'
    | 'config.chatModel' | 'config.whisperModel' | 'config.systemPrompt' | 'config.reportJsonSchema';

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollViewContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  statusMessageContainer: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontWeight: typography.fontWeightBold as '600',
    fontSize: typography.fontSizeXS,
  },
  successText: {
    color: colors.success,
    textAlign: 'center',
    fontWeight: typography.fontWeightBold as '600',
    fontSize: typography.fontSizeXS,
  },
  section: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderRadius: borders.radiusLarge,
    borderWidth: borders.widthThin,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.fontSizeL,
    fontWeight: typography.fontWeightBold as '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    borderBottomWidth: borders.widthThin,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightMedium as '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  valueText: {
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: spacing.sm,
  },
  textInput: {
      fontSize: typography.fontSizeM,
      color: colors.textPrimary,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      paddingHorizontal: spacing.sm,
      borderWidth: borders.widthThin,
      borderColor: colors.borderLight,
      borderRadius: borders.radiusSmall,
      backgroundColor: colors.surface,
  },
  textArea: {
      minHeight: 150,
      textAlignVertical: 'top',
  },
  jsonTextArea: {
      minHeight: 250,
      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
      fontSize: typography.fontSizeXS,
  },
  linkValue: {
      color: colors.primary,
      textDecorationLine: 'underline',
      paddingVertical: spacing.xs,
  },
  logo: {
      width: 200,
      height: 100,
      marginBottom: spacing.md,
      alignSelf: 'center',
  },
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
  },
  footerNote: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontSize: typography.fontSizeXS,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoCaption: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  uploadButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radiusSmall,
  },
  uploadButtonText: {
    color: colors.surfaceAlt,
    fontWeight: typography.fontWeightMedium as '500',
  },
  uploadingText: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontWeight: typography.fontWeightMedium as '500',
  },
});

// --- Helper to open links ---
const openLink = async (url: string) => {
  const prefixedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
  try {
      const supported = await Linking.canOpenURL(prefixedUrl);
      if (supported) {
        await Linking.openURL(prefixedUrl);
      } else {
        Alert.alert("Cannot Open Link", `Don't know how to open this URL: ${prefixedUrl}`);
      }
  } catch (error) {
       Alert.alert("Error", `Could not open link: ${error}`);
  }
};

// Utility to safely set nested properties
const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] === undefined || current[key] === null) {
            current[key] = {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
};

// Utility to safely get nested properties
const getNestedValue = (obj: any, path: string): any => {
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

// --- Component ---
function ProfileScreen(): React.ReactElement {
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [editableProfile, setEditableProfile] = useState<ProfileData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { userToken } = useAuth(); // Get authentication token from context
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Check if userToken exists
      if (!userToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      // Add authorization header with the token
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to fetch profile' }));
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }
      const data: ProfileData = await response.json();
      // Ensure nested objects exist even if empty in fetched data
      data.company = data.company ?? {};
      data.company.address = data.company.address ?? {};
      data.config = data.config ?? {};
      setOriginalProfile(data);
      setEditableProfile(JSON.parse(JSON.stringify(data))); // Deep copy
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(`Failed to load profile: ${err.message}`);
      setOriginalProfile({}); // Set to empty object on error
      setEditableProfile({});
    } finally {
      setIsLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = useCallback((key: EditableProfileKey, value: string) => {
    setError(null);
    setSuccessMessage(null);
    setEditableProfile(prev => {
      const newProfile = JSON.parse(JSON.stringify(prev)); // Deep copy
      // Special case for JSON schema - store as string until save
      if (key === 'config.reportJsonSchema') {
          setNestedValue(newProfile, key, value); // Store the raw string input
      } else {
          setNestedValue(newProfile, key, value);
      }
      return newProfile;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!originalProfile) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Attempt to parse JSON Schema from editable state string
    let parsedSchema: object | undefined = undefined;
    let schemaError: string | null = null;
    const schemaString = getNestedValue(editableProfile, 'config.reportJsonSchema');

    if (typeof schemaString === 'string' && schemaString.trim()) {
        try {
            parsedSchema = JSON.parse(schemaString);
        } catch (e: any) {
            schemaError = `Invalid JSON in Report Schema: ${e.message}`;
        }
    } else {
        // Allow empty/undefined schema - use original or empty object
        parsedSchema = originalProfile.config?.reportJsonSchema ?? {};
    }

    if (schemaError) {
        setError(schemaError);
        setIsSaving(false);
        return;
    }

    // Construct payload using the editable state, ensuring all levels exist
    const payload: ProfileData = {
        name: editableProfile.name,
        email: editableProfile.email,
        phone: editableProfile.phone,
        company: {
          name: editableProfile.company?.name,
          phone: editableProfile.company?.phone,
          website: editableProfile.company?.website,
          address: {
            street: editableProfile.company?.address?.street,
            unit: editableProfile.company?.address?.unit,
            city: editableProfile.company?.address?.city,
            state: editableProfile.company?.address?.state,
            zip: editableProfile.company?.address?.zip,
          },
        },
        config: {
          logoFilename: originalProfile.config?.logoFilename, // Preserve original logo
          chatModel: editableProfile.config?.chatModel,
          whisperModel: editableProfile.config?.whisperModel,
          systemPrompt: editableProfile.config?.systemPrompt,
          reportJsonSchema: parsedSchema, // Use the parsed schema object
        },
      };

    console.log("Saving profile:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Save failed: ${response.status}`);
      }
      setSuccessMessage('Profile saved successfully!');
      const savedProfile = JSON.parse(JSON.stringify(payload)); // Deep copy saved state
      setOriginalProfile(savedProfile);
      setEditableProfile(savedProfile);
      setTimeout(() => setSuccessMessage(null), 3000); // Hide success message after delay
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(`Failed to save profile: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [originalProfile, editableProfile, userToken]);

  // Function to handle logo upload
  const handleLogoUpload = async () => {
    if (!userToken) return;
    
    try {
      // Request permission to access the media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant access to your photos to upload a logo.');
        return;
      }
      
      // Launch the image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [2, 1],
        quality: 0.8,
      });
      
      if (result.canceled) {
        console.log('User canceled image picker');
        return;
      }
      
      if (!result.assets || result.assets.length === 0) {
        console.log('No assets returned from image picker');
        return;
      }
      
      // Get the selected image
      const selectedImage = result.assets[0];
      
      // Show uploading indicator
      setIsUploadingLogo(true);
      setError(null);
      
      // Create a form data object to send the image
      const formData = new FormData();
      
      // Handle web environment vs. native environment differently
      if (Platform.OS === 'web') {
        // For web, fetch the blob from the URI
        try {
          const response = await fetch(selectedImage.uri);
          const blob = await response.blob();
          formData.append('logo', blob, 'logo.jpg');
          console.log('Web: Appended blob to FormData');
        } catch (err) {
          console.error('Error creating blob from URI:', err);
          setError('Failed to prepare image for upload');
          setIsUploadingLogo(false);
          return;
        }
      } else {
        // For native (iOS/Android)
        // @ts-ignore - TypeScript doesn't recognize the URI structure needed for React Native FormData
        formData.append('logo', {
          uri: selectedImage.uri,
          type: 'image/jpeg',
          name: 'logo.jpg',
        });
        console.log('Native: Appended file object to FormData');
      }
      
      console.log('Uploading logo to:', `${API_BASE_URL}/api/upload-logo`);
      
      // Upload the logo with appropriate headers
      const response = await fetch(`${API_BASE_URL}/api/upload-logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json',
          // Don't set Content-Type here, let it be set automatically with boundary
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
        throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('Upload response:', responseData);
      
      // Set the new logo URL with a timestamp to force refresh
      const timestamp = Date.now();
      setLogoUrl(`${API_BASE_URL}/api/logo/${userToken}?t=${timestamp}`);
      
      // Show success message
      setSuccessMessage('Logo uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh profile data to get updated logoFilename
      fetchProfile();
      
    } catch (err: any) {
      console.error("Error uploading logo:", err);
      setError(`Failed to upload logo: ${err.message}`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // --- Render Helpers ---

  const renderEditableField = useCallback((label: string, valueKey: EditableProfileKey, options?: { multiline?: boolean, lines?: number, isJson?: boolean, keyboard?: TextInput['props']['keyboardType'] }) => {
    // Get the potentially nested value from editable state
    let currentValue = getNestedValue(editableProfile, valueKey);

    // Handle JSON object case - stringify for TextInput
    if (options?.isJson && typeof currentValue === 'object' && currentValue !== null) {
        currentValue = JSON.stringify(currentValue, null, 2); // Pretty print
    } else if (typeof currentValue !== 'string') {
        currentValue = currentValue?.toString() ?? ''; // Ensure it's a string for TextInput
    }

    const inputStyle = [
        styles.textInput,
        options?.multiline && styles.textArea,
        options?.isJson && styles.jsonTextArea,
    ];

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}:</Text>
        <TextInput
          style={inputStyle}
          value={currentValue}
          onChangeText={(text) => handleInputChange(valueKey, text)}
          placeholder={`Enter ${label}`}
          editable={!isSaving}
          multiline={options?.multiline}
          numberOfLines={options?.multiline ? (options?.lines || 4) : 1}
          keyboardType={options?.keyboard || 'default'}
          autoCapitalize={valueKey.includes('email') || options?.isJson ? 'none' : 'sentences'}
          autoCorrect={!options?.isJson} // Disable autocorrect for JSON
          spellCheck={!options?.isJson}
        />
      </View>
    );
  }, [editableProfile, isSaving, handleInputChange]);

  const renderLinkField = useCallback((label: string, valueKey: EditableProfileKey) => {
    const value = getNestedValue(editableProfile, valueKey) as string | undefined;
    if (!value) return null;
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}:</Text>
        <TouchableOpacity onPress={() => openLink(value)}>
            <Text style={[styles.textInput, styles.linkValue]}>{value}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [editableProfile]);

  const renderLogoSection = () => {
    if (!userToken) return null;
    
    // Use the cached logo URL if available, otherwise build the URL
    const displayLogoUrl = logoUrl || `${API_BASE_URL}/api/logo/${userToken}`;
    
    return (
      <View style={styles.logoContainer}>
        <Image 
          source={{ uri: displayLogoUrl }} 
          style={styles.logo}
          resizeMode="contain"
          onError={(e) => {
            console.log('Error loading logo:', e.nativeEvent.error);
          }}
        />
        <Text style={styles.logoCaption}>Company Logo</Text>
        
        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={handleLogoUpload}
          disabled={isUploadingLogo}
        >
          <Text style={styles.uploadButtonText}>
            {originalProfile?.config?.logoFilename ? 'Change Logo' : 'Upload Logo'}
          </Text>
        </TouchableOpacity>
        
        {isUploadingLogo && (
          <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadingText}> Uploading...</Text>
          </View>
        )}
      </View>
    );
  };

  // --- Main Render Logic ---

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

  // Use originalProfile for checks, as it reflects fetched status
  if (!originalProfile) {
      return (
          <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
              <Text style={styles.errorText}>{error || 'Profile data could not be loaded.'}</Text>
              {/* Optional: Add a retry button */}
              {/* <Button title="Retry" onPress={fetchProfile} /> */}
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
          <ScrollView
              style={styles.scrollViewContent}
              keyboardShouldPersistTaps="handled"
          >
            {renderLogoSection()}

            {/* Display Save Status */} 
            <View style={styles.statusMessageContainer}>
                {error && <Text style={styles.errorText}>{error}</Text>}
                {successMessage && <Text style={styles.successText}>{successMessage}</Text>}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Details</Text>
              {renderEditableField('Name', 'name')}
              {renderEditableField('Email', 'email', { keyboard: 'email-address' })}
              {renderEditableField('Phone', 'phone', { keyboard: 'phone-pad' })}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Company Details</Text>
                {renderEditableField('Company Name', 'company.name')}
                {renderEditableField('Street', 'company.address.street')}
                {renderEditableField('Unit', 'company.address.unit')}
                {renderEditableField('City', 'company.address.city')}
                {renderEditableField('State', 'company.address.state')}
                {renderEditableField('ZIP Code', 'company.address.zip', { keyboard: 'number-pad' })}
                {renderEditableField('Company Phone', 'company.phone', { keyboard: 'phone-pad' })}
                {renderLinkField('Website', 'company.website')}
            </View>

             <View style={styles.section}>
                <Text style={styles.sectionTitle}>Configuration</Text>
                {renderEditableField('Chat Model', 'config.chatModel')}
                {renderEditableField('Whisper Model', 'config.whisperModel')}
                {renderEditableField('System Prompt', 'config.systemPrompt', { multiline: true, lines: 8 })}
                {renderEditableField('Report Schema (JSON)', 'config.reportJsonSchema', { multiline: true, lines: 12, isJson: true })}
             </View>

          </ScrollView>
      </KeyboardAvoidingView>

       {/* Floating Save Button */} 
       <View style={styles.saveButtonContainer}>
            <Button
                title={isSaving ? "Saving..." : "Save Profile Changes"}
                onPress={handleSave}
                disabled={isSaving || isLoading}
            />
        </View>
    </SafeAreaView>
  );
}

export default ProfileScreen; 