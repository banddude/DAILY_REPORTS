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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditReportSchemaScreenProps } from '../navigation/AppNavigator';

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

  // Configure Header Buttons
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isSaving} color={Platform.OS === 'ios' ? colors.primary : undefined} />
      ),
      headerRight: () => (
        <Button onPress={handleSave} title={isSaving ? "Saving..." : "Save"} disabled={isLoading || isSaving || !!jsonError} color={Platform.OS === 'ios' ? colors.primary : undefined} />
      ),
    });
  }, [navigation, handleSave, isLoading, isSaving, jsonError]);

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
             keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
           >
            <ScrollView style={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                {error && <Text style={styles.errorText}>{error}</Text>}

                <View style={styles.fieldContainer}>
                <Text style={styles.label}>Report Schema (JSON)</Text>
                <TextInput
                    style={styles.textInput}
                    value={currentSchemaString}
                    onChangeText={setCurrentSchemaString}
                    placeholder="Enter JSON schema for reports..."
                    multiline={true}
                    editable={!isSaving}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                />
                 {jsonError && <Text style={styles.jsonErrorText}>{jsonError}</Text>}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default EditReportSchemaScreen; 