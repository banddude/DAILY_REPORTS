import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Button,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditChatModelScreenProps } from '../navigation/AppNavigator';

// Define only necessary parts of the profile data
interface ProfileConfig {
  chatModel?: string;
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
  container: { // Use a container for padding
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
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
  },
});

// --- Component ---
function EditChatModelScreen(): React.ReactElement {
  const navigation = useNavigation<EditChatModelScreenProps['navigation']>();
  const { userToken } = useAuth();
  const [initialModel, setInitialModel] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the current model name
  const fetchCurrentModel = useCallback(async () => {
    // ... (Similar fetch logic as EditSystemPrompt, getting config.chatModel) ...
    if (!userToken) { /* ... handle error ... */ return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${userToken}` } });
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      const model = data?.config?.chatModel || '';
      setInitialModel(model);
      setCurrentModel(model);
    } catch (err: any) { setError(`Failed to load model: ${err.message}`); } 
    finally { setIsLoading(false); }
  }, [userToken]);

  useEffect(() => {
    fetchCurrentModel();
  }, [fetchCurrentModel]);

  // Save the updated model name
  const handleSave = useCallback(async () => {
     // ... (Similar save logic: fetch full profile, update only config.chatModel, POST) ...
    if (!userToken || currentModel === initialModel) { navigation.goBack(); return; }
    setIsSaving(true);
    setError(null);
    try {
      const profileResponse = await fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${userToken}` } });
      if (!profileResponse.ok) throw new Error('Failed to fetch current profile');
      const fullProfile = await profileResponse.json();
      const payload = { ...fullProfile, config: { ...(fullProfile.config || {}), chatModel: currentModel } };
      const saveResponse = await fetch(`${API_BASE_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` }, body: JSON.stringify(payload) });
      if (!saveResponse.ok) {
        const errData = await saveResponse.json().catch(() => ({}));
        throw new Error(errData.error || 'Save failed');
      }
      navigation.goBack();
    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
      Alert.alert('Save Failed', err.message);
    } finally { setIsSaving(false); }
  }, [userToken, currentModel, initialModel, navigation]);

  // Configure Header Buttons
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isSaving} color={Platform.OS === 'ios' ? colors.primary : undefined}/>
      ),
      headerRight: () => (
        <Button onPress={handleSave} title={isSaving ? "Saving..." : "Save"} disabled={isLoading || isSaving || currentModel === initialModel} color={Platform.OS === 'ios' ? colors.primary : undefined} />
      ),
    });
  }, [navigation, handleSave, isLoading, isSaving, currentModel, initialModel]);

  // --- Render Logic ---
  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
       {/* No KeyboardAvoidingView needed for single-line input usually */}
       <ScrollView style={styles.container}>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <Text style={styles.label}>Chat Model Name</Text>
            <TextInput
                style={styles.textInput}
                value={currentModel}
                onChangeText={setCurrentModel}
                placeholder="e.g., gpt-4o-mini"
                editable={!isSaving}
                autoCapitalize="none"
                autoCorrect={false}
            />
       </ScrollView>
    </SafeAreaView>
  );
}

export default EditChatModelScreen; 