import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Button, // Use standard Button for header
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditSystemPromptScreenProps } from '../navigation/AppNavigator'; // Import navigation props type

// --- Styles (Inspired by the screenshot) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // Use theme background
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
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    borderWidth: borders.widthThin,
    borderColor: colors.borderLight,
    minHeight: 200, // Make it taller for the prompt
    textAlignVertical: 'top',
  },
  // Style for the toggle row (like "Enable for new chats")
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borders.radiusMedium,
    borderWidth: borders.widthThin,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  toggleLabel: {
      fontSize: typography.fontSizeM,
      color: colors.textPrimary,
  },
});

// --- Component ---
function EditSystemPromptScreen(): React.ReactElement {
  const navigation = useNavigation<EditSystemPromptScreenProps['navigation']>();
  const { userToken } = useAuth();
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentPrompt = useCallback(async () => {
    if (!userToken) {
        setError('Authentication required.');
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      const prompt = data?.config_system_prompt || '';
      setInitialPrompt(prompt);
      setCurrentPrompt(prompt);
    } catch (err: any) {
      setError(`Failed to load prompt: ${err.message}`);
      console.error("Error fetching prompt:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchCurrentPrompt();
  }, [fetchCurrentPrompt]);

  const handleSave = useCallback(async () => {
    if (!userToken || currentPrompt.trim() === initialPrompt.trim()) {
        navigation.goBack();
        return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
          config_system_prompt: currentPrompt.trim()
      };

      console.log("Saving System Prompt:", payload);

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
      
      console.log("System Prompt save successful");
      navigation.goBack();

    } catch (err: any) {
      setError(`Failed to save prompt: ${err.message}`);
      console.error("Error saving prompt:", err);
      Alert.alert('Save Failed', err.message || 'Could not save the system prompt.');
    } finally {
      setIsSaving(false);
    }
  }, [userToken, currentPrompt, initialPrompt, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isSaving} color={Platform.OS === 'ios' ? colors.primary : undefined}/>
      ),
      headerRight: () => (
        <Button onPress={handleSave} title={isSaving ? "Saving..." : "Save"} disabled={isLoading || isSaving || currentPrompt.trim() === initialPrompt.trim()} color={Platform.OS === 'ios' ? colors.primary : undefined} />
      ),
    });
  }, [navigation, handleSave, isLoading, isSaving, currentPrompt, initialPrompt]);

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
         keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0} // Adjust if needed
       >
         <ScrollView style={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
            {error && <Text style={styles.errorText}>{error}</Text>} 

            {/* System Prompt Input */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>System Prompt</Text>
              <TextInput
                style={styles.textInput}
                value={currentPrompt}
                onChangeText={setCurrentPrompt}
                placeholder="Enter system prompt instructions..."
                multiline={true}
                editable={!isSaving}
                autoCapitalize="sentences"
                autoCorrect={true}
              />
            </View>

            {/* Add other fields from the screenshot if needed */}
            {/* e.g., "What should ChatGPT call you?", "What do you do?" */}
            {/* These would likely require adding more fields to your ProfileData interface */}
            {/* and fetching/saving them similarly to the system prompt. */}

         </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default EditSystemPromptScreen; 