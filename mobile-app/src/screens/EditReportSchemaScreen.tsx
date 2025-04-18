import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
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
import theme, { colors } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditReportSchemaScreenProps } from '../navigation/AppNavigator';
import ConfirmationModal from '../components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';

// --- Component ---
function EditReportSchemaScreen(): React.ReactElement {
  const navigation = useNavigation<EditReportSchemaScreenProps['navigation']>();
  const { session, isAuthenticated } = useAuth();
  const [currentValue, setCurrentValue] = useState<string>('');
  const [initialValue, setInitialValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentValue = useCallback(async () => {
    if (!session || !isAuthenticated) {
      setError('Authentication required.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const token = session.access_token;
    if (!token) {
      setError('Token not found.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/master-config`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
      if (!response.ok) throw new Error('Fetch failed');
      const data = await response.json();
      const schemaData = data?.config_report_json_schema;
      const value = schemaData ? JSON.stringify(schemaData, null, 2) : '';
      setInitialValue(value);
      setCurrentValue(value);
    } catch (err: any) {
      setError(`Load failed: ${err.message}`);
      console.error("Error fetching schema:", err);
    } finally {
      setIsLoading(false);
    }
  }, [session, isAuthenticated]);

  useEffect(() => {
    fetchCurrentValue();
  }, [fetchCurrentValue]);

  const handleSave = useCallback(async () => {
    if (!session || !isAuthenticated || currentValue.trim() === initialValue.trim()) {
      navigation.goBack();
      return;
    }
    
    let parsedSchema;
    try {
      parsedSchema = JSON.parse(currentValue.trim());
      setError(null);
    } catch (jsonError: any) {
      setError(`Invalid JSON format: ${jsonError.message}`);
      Alert.alert('Invalid JSON', 'Please correct the JSON format before saving.');
      return;
    }

    setIsSaving(true);
    const token = session.access_token;
    if (!token) {
      setError('Token not found.');
      Alert.alert('Error', 'Authentication required.');
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        config_report_json_schema: parsedSchema
      };
      console.log("Saving Report Schema:", payload);
      const saveResponse = await fetch(`${API_BASE_URL}/api/master-config`, {
        method: 'PUT',
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
      navigation.goBack();
    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
      Alert.alert('Save Failed', err.message || 'Could not save the report schema.');
    } finally {
      setIsSaving(false);
    }
  }, [session, isAuthenticated, currentValue, initialValue, navigation]);

  useLayoutEffect(() => {
    const isDisabled = isLoading || isSaving || currentValue.trim() === initialValue.trim();

    navigation.setOptions({
      headerLeft: () => (
        <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isSaving} color={Platform.OS === 'ios' ? colors.primary : undefined} />
      ),
      headerRight: () => (
        <Button onPress={handleSave} title={isSaving ? "Saving..." : "Save"} disabled={isDisabled} color={Platform.OS === 'ios' ? colors.primary : undefined} />
      ),
    });
  }, [navigation, handleSave, isLoading, isSaving, currentValue, initialValue]);

  if (isLoading) {
    return (
      <View style={theme.screens.editReportSchemaScreen.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={theme.screens.editReportSchemaScreen.safeArea} edges={['left', 'right', 'bottom']}>
        <KeyboardAvoidingView
             behavior={Platform.OS === "ios" ? "padding" : "height"}
             style={theme.screens.editReportSchemaScreen.keyboardAvoidingView}
             keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
            <ScrollView contentContainerStyle={theme.screens.editReportSchemaScreen.scrollViewContent} keyboardShouldPersistTaps="handled">
                {error && <Text style={theme.screens.editReportSchemaScreen.errorText}>{error}</Text>}

                <View style={theme.screens.editReportSchemaScreen.fieldContainer}> 
                  <Text style={theme.screens.editReportSchemaScreen.label}>Report JSON Schema (Raw Text)</Text> 
                  <TextInput
                    style={theme.screens.editReportSchemaScreen.textInput}
                    value={currentValue}
                    onChangeText={setCurrentValue}
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