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
      width: 150,
      height: 50,
      resizeMode: 'contain',
      alignSelf: 'center',
      marginBottom: spacing.lg,
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
  }
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

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`);
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
  }, []);

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
          // Preserve potentially non-editable customer/project from original
          customer: originalProfile.company?.customer,
          project: originalProfile.company?.project,
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
  }, [originalProfile, editableProfile]);

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

  const logoFilename = originalProfile.config?.logoFilename;
  const logoUrl = logoFilename ? `${API_BASE_URL}/${logoFilename}` : null;
  const imageSource: ImageSourcePropType | undefined = logoUrl ? { uri: logoUrl } : undefined;

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
            {imageSource && <Image source={imageSource} style={styles.logo} />}

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
                {/* Display Default Customer/Project as read-only - value from original */}
                 <View style={styles.fieldContainer}>
                     <Text style={styles.label}>Default Customer:</Text>
                     <Text style={styles.valueText}>{originalProfile?.company?.customer || '-'}</Text>
                 </View>
                 <View style={styles.fieldContainer}>
                     <Text style={styles.label}>Default Project:</Text>
                     <Text style={styles.valueText}>{originalProfile?.company?.project || '-'}</Text>
                 </View>
            </View>

             <View style={styles.section}>
                <Text style={styles.sectionTitle}>Configuration</Text>
                {renderEditableField('Chat Model', 'config.chatModel')}
                {renderEditableField('Whisper Model', 'config.whisperModel')}
                {renderEditableField('System Prompt', 'config.systemPrompt', { multiline: true, lines: 8 })}
                {renderEditableField('Report Schema (JSON)', 'config.reportJsonSchema', { multiline: true, lines: 12, isJson: true })}
                 <View style={styles.fieldContainer}>
                     <Text style={styles.label}>Logo Filename:</Text>
                     <Text style={styles.valueText}>{originalProfile?.config?.logoFilename || '-'}</Text>
                 </View>
             </View>

             <Text style={styles.footerNote}>
                 Default Customer/Project and Logo are managed elsewhere.
             </Text>

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