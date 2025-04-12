import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  AlertButton,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditReportSchemaScreenProps } from '../navigation/AppNavigator';
import ConfirmationModal from '../components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';

// Define the expected structure of the profile data (only what's needed)
interface ProfileConfig {
  reportJsonSchema?: object;
}
interface ProfileData {
  config?: ProfileConfig;
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
   keyboardAvoidingView: {
      flex: 1,
   },
  scrollViewContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  fieldContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.fontSizeS,
    fontWeight: typography.fontWeightMedium as '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borders.radiusMedium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSizeM, // Standard size for readability
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', // Monospace for JSON
    color: colors.textPrimary,
    borderWidth: borders.widthThin,
    borderColor: colors.borderLight,
    minHeight: 300, // Taller for JSON schema
    textAlignVertical: 'top',
  },
  jsonErrorText: {
      color: colors.error,
      marginTop: spacing.sm,
      fontSize: typography.fontSizeXS,
  },
  imagePreviewContainer: {
      alignItems: 'center',
      marginVertical: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: borders.radiusMedium,
      padding: spacing.md,
  },
  imagePreview: {
      width: 150,
      height: 150,
      borderRadius: borders.radiusSmall,
      marginBottom: spacing.md,
  },
  imagePlaceholder: {
      width: 150,
      height: 150,
      borderRadius: borders.radiusSmall,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
  },
  imageButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borders.radiusMedium,
      flexDirection: 'row',
      alignItems: 'center',
  },
  imageButtonText: {
      color: colors.background,
      marginLeft: spacing.sm,
      fontWeight: typography.fontWeightMedium as '500',
  },
});

// --- Component ---
function EditReportSchemaScreen(): React.ReactElement {
  const navigation = useNavigation<EditReportSchemaScreenProps['navigation']>();
  const { userToken } = useAuth();
  const [initialSchemaString, setInitialSchemaString] = useState<string>('');
  const [currentSchemaString, setCurrentSchemaString] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // State for image picker (replace with actual image logic if needed)
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  // State for confirmation modal (replace with actual delete/reset logic if needed)
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string, message: string, confirmText: string, isDestructive: boolean } | null>(null);

  // Fetch the current schema
  const fetchCurrentSchema = useCallback(async () => {
    if (!userToken) {
      setError('Authentication required.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setJsonError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      const schemaObject = data?.config?.reportJsonSchema;
      const schemaStr = schemaObject ? JSON.stringify(schemaObject, null, 2) : ''; // Pretty print
      setInitialSchemaString(schemaStr);
      setCurrentSchemaString(schemaStr);
    } catch (err: any) {
      setError(`Failed to load schema: ${err.message}`);
      console.error("Error fetching schema:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchCurrentSchema();
  }, [fetchCurrentSchema]);

  // Validate JSON input dynamically
  useEffect(() => {
    if (!currentSchemaString.trim()) {
        setJsonError(null); // Clear error if input is empty
        return;
    }
    try {
      JSON.parse(currentSchemaString);
      setJsonError(null); // Valid JSON
    } catch (e) {
      setJsonError('Invalid JSON format.'); // Invalid JSON
    }
  }, [currentSchemaString]);

  // Save the updated schema
  const handleSave = useCallback(async () => {
    if (!userToken) {
      Alert.alert('Error', 'Authentication required.');
      return;
    }

    // Prevent saving if invalid JSON
    if (jsonError) {
        Alert.alert('Invalid JSON', 'Please correct the JSON format before saving.');
        return;
    }

    // Prevent saving if no changes
    if (currentSchemaString === initialSchemaString) {
        navigation.goBack();
        return;
    }

    setIsSaving(true);
    setError(null);

    let parsedSchema = {};
    try {
        // Parse the current string back into an object for saving
        if (currentSchemaString.trim()) {
            parsedSchema = JSON.parse(currentSchemaString);
        }
    } catch (e) {
        setError('Failed to parse JSON before saving. Please check the format.');
        setIsSaving(false);
        return;
    }

    try {
      // 1. Fetch the *entire* current profile first
      const profileResponse = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        }
      });
      if (!profileResponse.ok) throw new Error('Failed to fetch current profile before saving');
      const fullProfile = await profileResponse.json();

      // 2. Create the payload by updating only the reportJsonSchema
      const payload = {
          ...fullProfile,
          config: {
              ...(fullProfile.config || {}),
              reportJsonSchema: parsedSchema, // Save the parsed object
          },
      };

      // 3. Send the updated profile
      const saveResponse = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!saveResponse.ok) {
        const errData = await saveResponse.json().catch(() => ({ error: 'Save failed with unknown server error' }));
        throw new Error(errData.error || `Save failed: ${saveResponse.status}`);
      }

      // Success
      navigation.goBack();

    } catch (err: any) {
      setError(`Failed to save schema: ${err.message}`);
      console.error("Error saving schema:", err);
      Alert.alert('Save Failed', err.message || 'Could not save the report schema.');
    } finally {
      setIsSaving(false);
    }
  }, [userToken, currentSchemaString, initialSchemaString, jsonError, navigation]);

  // --- Image Picker Logic ---
  const showImageSourceOptions = () => {
    const options: AlertButton[] = [
      { text: 'Take Photo', onPress: () => pickImage('camera') },
      { text: 'Choose from Library', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ];

    Alert.alert(
      'Select Image Source',
      'How would you like to select the image?',
      options,
      { cancelable: true }
    );
  };

  const pickImage = async (source: 'camera' | 'library') => {
    let result: ImagePicker.ImagePickerResult;
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
      } else { // source === 'library'
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Media Library permission is needed to choose photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
        console.log("Image selected:", result.assets[0].uri);
        // TODO: Add logic here to actually upload/save the selectedImageUri if needed
        // For now, it just updates the preview
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert('Image Error', 'Could not select or capture image.');
    }
  };

  // --- Confirmation Logic (Example) ---
  const showConfirmation = (config: { title: string, message: string, confirmText: string, isDestructive: boolean }, onConfirm: () => void) => {
    setConfirmConfig(config);
    setConfirmAction(() => onConfirm); // Store the action in state
    setIsConfirmVisible(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setIsConfirmVisible(false);
    setConfirmAction(null);
    setConfirmConfig(null);
  };

  const handleCancelConfirm = () => {
    setIsConfirmVisible(false);
    setConfirmAction(null);
    setConfirmConfig(null);
  };

  // Example Usage of Confirmation:
  const handleResetSchema = () => {
    showConfirmation(
      {
        title: 'Reset Schema?',
        message: 'Are you sure you want to reset the schema to its original state? All your changes will be lost.',
        confirmText: 'Reset',
        isDestructive: true,
      },
      () => {
        setCurrentSchemaString(initialSchemaString);
        setJsonError(null); // Reset JSON error too
        console.log('Schema reset to initial state.');
      }
    );
  };

  // Configure Header Buttons (add reset button)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isSaving} color={Platform.OS === 'ios' ? colors.primary : undefined} />
      ),
      // Add a reset button conditionally if changes were made
      headerTitle: 'Edit Report Schema', // Explicitly set title
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          {currentSchemaString !== initialSchemaString && (
            <Button
                onPress={handleResetSchema}
                title="Reset"
                disabled={isLoading || isSaving}
                color={Platform.OS === 'ios' ? colors.error : undefined} // Use error color for reset
            />
          )}
          {/* Wrap Save Button in View for margin */}
          <View style={{ marginLeft: currentSchemaString !== initialSchemaString ? spacing.md : 0 }}>
            <Button
              onPress={handleSave}
              title={isSaving ? "Saving..." : "Save"}
              disabled={isLoading || isSaving || !!jsonError || currentSchemaString === initialSchemaString} // Disable if no changes
              color={Platform.OS === 'ios' ? colors.primary : undefined}
             />
          </View>
        </View>
      ),
    });
  }, [navigation, handleSave, handleResetSchema, isLoading, isSaving, jsonError, currentSchemaString, initialSchemaString]); // Add dependencies

  // --- Render Logic ---
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <KeyboardAvoidingView
             behavior={Platform.OS === "ios" ? "padding" : "height"}
             style={styles.keyboardAvoidingView}
             keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0} // Adjust offset if needed
        >
            <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                {error && <Text style={styles.errorText}>{error}</Text>}

                {/* Example Image Picker Section */} 
                <View style={styles.imagePreviewContainer}> 
                  <Text style={styles.label}>Report Header Image (Optional)</Text> 
                  {selectedImageUri ? ( 
                    <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} /> 
                  ) : ( 
                    <View style={styles.imagePlaceholder}> 
                      <Ionicons name="image-outline" size={50} color={colors.textSecondary} /> 
                    </View> 
                  )} 
                  <TouchableOpacity onPress={showImageSourceOptions} style={styles.imageButton} disabled={isSaving}> 
                    <Ionicons name="add-circle-outline" size={20} color={colors.background} />
                    <Text style={styles.imageButtonText}> 
                      {selectedImageUri ? 'Change Image' : 'Select Image'} 
                    </Text> 
                  </TouchableOpacity> 
                </View> 

                {/* JSON Schema Editor */} 
                <View style={styles.fieldContainer}> 
                  <Text style={styles.label}>Report JSON Schema</Text> 
                  <TextInput
                    style={styles.textInput}
                    value={currentSchemaString}
                    onChangeText={setCurrentSchemaString}
                    multiline={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    placeholder="Enter JSON schema here..."
                    placeholderTextColor={colors.textSecondary}
                    editable={!isLoading && !isSaving}
                  />
                  {jsonError && <Text style={styles.jsonErrorText}>{jsonError}</Text>}
                </View>

            </ScrollView>
        </KeyboardAvoidingView>

        {/* Confirmation Modal */} 
        {confirmConfig && (
            <ConfirmationModal
                isVisible={isConfirmVisible}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={handleConfirm} // Use the wrapper handler
                onCancel={handleCancelConfirm}
                isDestructive={confirmConfig.isDestructive}
            />
        )}
    </SafeAreaView>
  );
}

export default EditReportSchemaScreen; 