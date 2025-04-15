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

  const fetchCurrentModel = useCallback(async () => {
    if (!userToken) { /* ... handle error ... */ return; }
    setIsLoading(true); setError(null);
    try {
      // Fetch the full profile to get the current chat model
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
              throw new Error('Profile not found. Cannot edit chat model.');
          }
          throw new Error(errData.error || 'Fetch failed');
       }
      const data = await response.json();
      // --- FIX: Extract config_chat_model from the response --- 
      const model = data?.config_chat_model || ''; 
      setInitialModel(model);
      setCurrentModel(model);
    } catch (err: any) { setError(`Failed to load model: ${err.message}`); } 
    finally { setIsLoading(false); }
  }, [userToken]);

  useEffect(() => { fetchCurrentModel(); }, [fetchCurrentModel]);

  const handleSave = useCallback(async () => {
    // Exit early if not authenticated or value hasn't changed
    if (!userToken || currentModel.trim() === initialModel.trim()) { 
        navigation.goBack(); 
        return; 
    }
    setIsSaving(true); setError(null);
    try {
      // --- FIX: Construct payload with only the snake_case field --- 
      const payload = { 
          config_chat_model: currentModel.trim() // Send the correct field name
      };

      console.log("Saving Chat Model:", payload);

      // --- FIX: Send only the specific field to update --- 
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
      
      console.log("Chat Model save successful");
      navigation.goBack(); // Go back after successful save

    } catch (err: any) { 
        setError(`Save failed: ${err.message}`); 
        Alert.alert('Save Failed', err.message); 
    } finally { 
        setIsSaving(false); 
    }
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