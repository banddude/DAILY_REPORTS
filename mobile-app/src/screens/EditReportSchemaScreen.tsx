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

  const fetchCurrentSchema = useCallback(async () => {
    if (!userToken) {
      setError('Authentication required.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error('Profile not found. Cannot edit schema.');
        }
        throw new Error(errData.error || 'Fetch failed');
      }
      const data = await response.json();
      const schemaStr = data?.config_report_json_schema || '';
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

  const handleSave = useCallback(async () => {
    if (!userToken) {
      Alert.alert('Error', 'Authentication required.');
      return;
    }
    const currentTrimmed = typeof currentSchemaString === 'string' ? currentSchemaString.trim() : '';
    const initialTrimmed = typeof initialSchemaString === 'string' ? initialSchemaString.trim() : '';

    if (currentTrimmed === initialTrimmed) {
      navigation.goBack();
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        config_report_json_schema: currentTrimmed || null
      };

      console.log("Saving Report Schema (as string):", payload);

      const saveResponse = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!saveResponse.ok) {
        const d = await saveResponse.json().catch(() => ({}));
        throw new Error(d.error || 'Save failed');
      }
      
      console.log("Report Schema save successful");
      navigation.goBack();

    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
      Alert.alert('Save Failed', err.message || 'Could not save the report schema.');
    } finally {
      setIsSaving(false);
    }
  }, [userToken, currentSchemaString, initialSchemaString, navigation]);

  useLayoutEffect(() => {
    const currentTrimmed = typeof currentSchemaString === 'string' ? currentSchemaString.trim() : '';
    const initialTrimmed = typeof initialSchemaString === 'string' ? initialSchemaString.trim() : '';
    const isDisabled = isLoading || isSaving || currentTrimmed === initialTrimmed;

    navigation.setOptions({
      headerLeft: () => (
        <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isSaving} color={Platform.OS === 'ios' ? colors.primary : undefined} />
      ),
      headerRight: () => (
        <Button onPress={handleSave} title={isSaving ? "Saving..." : "Save"} disabled={isDisabled} color={Platform.OS === 'ios' ? colors.primary : undefined} />
      ),
    });
  }, [navigation, handleSave, isLoading, isSaving, currentSchemaString, initialSchemaString]);

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
            <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                {error && <Text style={styles.errorText}>{error}</Text>}

                <View style={styles.fieldContainer}> 
                  <Text style={styles.label}>Report JSON Schema (Raw Text)</Text> 
                  <TextInput
                    style={styles.textInput}
                    value={currentSchemaString}
                    onChangeText={setCurrentSchemaString}
                    multiline={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    placeholder="Enter schema text here..."
                    placeholderTextColor={colors.textSecondary}
                    editable={!isLoading && !isSaving}
                  />
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default EditReportSchemaScreen; 