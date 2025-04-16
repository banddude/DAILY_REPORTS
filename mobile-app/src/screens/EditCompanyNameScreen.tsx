import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert, Button, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import theme, { colors } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditCompanyNameScreenProps } from '../navigation/AppNavigator';

function EditCompanyNameScreen(): React.ReactElement {
  const navigation = useNavigation<EditCompanyNameScreenProps['navigation']>();
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
      setError('Token not found');
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
          throw new Error('Profile not found. Cannot edit company name.');
        }
        throw new Error(errData.error || 'Fetch failed');
      }
      const data = await response.json();
      const value = data?.company_name || '';
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
      setError('Token not found');
      return;
    }

    try {
      const payload = {
        company_name: currentValue.trim()
      };

      console.log("Saving Company Name:", payload);

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

      console.log("Company Name save successful");
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

  if (isLoading) return <View style={theme.screens.editCompanyNameScreen.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={theme.screens.editCompanyNameScreen.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={theme.screens.editCompanyNameScreen.container}>
        {error && <Text style={theme.screens.editCompanyNameScreen.errorText}>{error}</Text>}
        <Text style={theme.screens.editCompanyNameScreen.label}>Company Name</Text>
        <TextInput style={theme.screens.editCompanyNameScreen.textInput} value={currentValue} onChangeText={setCurrentValue} placeholder="Enter company name" editable={!isSaving} autoCapitalize="words" />
      </ScrollView>
    </SafeAreaView>
  );
}
export default EditCompanyNameScreen; 