import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
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
import theme, { colors } from '../theme/theme'; // Import theme and colors
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditSystemPromptScreenProps } from '../navigation/AppNavigator'; // Import navigation props type

// --- Component ---
function EditSystemPromptScreen(): React.ReactElement {
  const navigation = useNavigation<EditSystemPromptScreenProps['navigation']>();
  const { session, isAuthenticated } = useAuth();
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentPrompt = useCallback(async () => {
    if (!session || !isAuthenticated) {
        setError('Authentication required.');
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = session.access_token;
      if (!token) {
        throw new Error('Token not found');
      }
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
  }, [session, isAuthenticated]);

  useEffect(() => {
    fetchCurrentPrompt();
  }, [fetchCurrentPrompt]);

  const handleSave = useCallback(async () => {
    if (!session || !isAuthenticated || currentPrompt.trim() === initialPrompt.trim()) {
        navigation.goBack();
        return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const token = session.access_token;
      if (!token) {
        throw new Error('Token not found');
      }
      const payload = {
          config_system_prompt: currentPrompt.trim()
      };

      console.log("Saving System Prompt:", payload);

      const saveResponse = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
  }, [session, isAuthenticated, currentPrompt, initialPrompt, navigation]);

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
      <View style={theme.screens.editSystemPromptScreen.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={theme.screens.editSystemPromptScreen.safeArea} edges={['left', 'right', 'bottom']}>
       <KeyboardAvoidingView
         behavior={Platform.OS === "ios" ? "padding" : "height"}
         style={theme.screens.editSystemPromptScreen.keyboardAvoidingView}
         keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0} // Adjust if needed
       >
         <ScrollView style={theme.screens.editSystemPromptScreen.scrollViewContent} keyboardShouldPersistTaps="handled">
            {error && <Text style={theme.screens.editSystemPromptScreen.errorText}>{error}</Text>} 

            {/* System Prompt Input */}
            <View style={theme.screens.editSystemPromptScreen.fieldContainer}>
              <Text style={theme.screens.editSystemPromptScreen.label}>System Prompt</Text>
              <TextInput
                style={theme.screens.editSystemPromptScreen.textInput}
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