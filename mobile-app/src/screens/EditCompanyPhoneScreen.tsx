import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert, Button, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import theme, { colors } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditCompanyPhoneScreenProps } from '../navigation/AppNavigator';

function EditCompanyPhoneScreen(): React.ReactElement {
  const navigation = useNavigation<EditCompanyPhoneScreenProps['navigation']>();
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
          throw new Error('Profile not found. Cannot edit company phone.');
        }
        throw new Error(errData.error || 'Fetch failed');
      }
      const data = await response.json();
      const value = data?.company_phone || '';
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
      return;
    }
    try {
      const payload = {
        company_phone: currentValue.trim()
      };
      console.log("Saving Company Phone:", payload);
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
      console.log("Company Phone save successful");
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

  if (isLoading) return <View style={theme.screens.editCompanyPhoneScreen.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={theme.screens.editCompanyPhoneScreen.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={theme.screens.editCompanyPhoneScreen.container}>
        {error && <Text style={theme.screens.editCompanyPhoneScreen.errorText}>{error}</Text>}
        <Text style={theme.screens.editCompanyPhoneScreen.label}>Company Phone Number</Text>
        <TextInput style={theme.screens.editCompanyPhoneScreen.textInput} value={currentValue} onChangeText={setCurrentValue} placeholder="Enter company phone" editable={!isSaving} keyboardType="phone-pad" autoComplete='tel' />
      </ScrollView>
    </SafeAreaView>
  );
}
export default EditCompanyPhoneScreen; 