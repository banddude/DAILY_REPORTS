import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert, Button, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import theme, { colors } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditCompanyWebsiteScreenProps } from '../navigation/AppNavigator';

function EditCompanyWebsiteScreen(): React.ReactElement {
  const navigation = useNavigation<EditCompanyWebsiteScreenProps['navigation']>();
  const { session, isAuthenticated } = useAuth();
  const [initialValue, setInitialValue] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentValue = useCallback(async () => {
    if (!session || !isAuthenticated) {
      setError('Auth required');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const token = session.access_token;
    if (!token) {
      setError('Token error');
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error('Profile not found. Cannot edit company website.');
        }
        throw new Error(errData.error || 'Fetch failed');
      }
      const data = await response.json();
      const value = data?.company_website || '';
      setInitialValue(value);
      setCurrentValue(value);
    } catch (err: any) {
      setError(`Load failed: ${err.message}`);
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
    setIsSaving(true);
    setError(null);
    const token = session.access_token;
    if (!token) {
      setError('Token error');
      setIsSaving(false);
      return;
    }
    try {
      const payload = {
        company_website: currentValue.trim()
      };
      console.log("Saving Company Website:", payload);
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
      console.log("Company Website save successful");
      navigation.goBack();
    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
      Alert.alert('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  }, [session, isAuthenticated, currentValue, initialValue, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isSaving} color={Platform.OS === 'ios' ? colors.primary : undefined} />,
      headerRight: () => <Button onPress={handleSave} title={isSaving ? "Saving..." : "Save"} disabled={isLoading || isSaving || currentValue.trim() === initialValue.trim()} color={Platform.OS === 'ios' ? colors.primary : undefined} />,
    });
  }, [navigation, handleSave, isLoading, isSaving, currentValue, initialValue]);

  if (isLoading) return <View style={theme.screens.editCompanyWebsiteScreen.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={theme.screens.editCompanyWebsiteScreen.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={theme.screens.editCompanyWebsiteScreen.container}>
        {error && <Text style={theme.screens.editCompanyWebsiteScreen.errorText}>{error}</Text>}
        <Text style={theme.screens.editCompanyWebsiteScreen.label}>Company Website</Text>
        <TextInput style={theme.screens.editCompanyWebsiteScreen.textInput} value={currentValue} onChangeText={setCurrentValue} placeholder="https://www.example.com" editable={!isSaving} keyboardType="url" autoCapitalize='none' />
      </ScrollView>
    </SafeAreaView>
  );
}
export default EditCompanyWebsiteScreen; 