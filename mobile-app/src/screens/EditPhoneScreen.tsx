import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert, Button, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import theme, { colors } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditPhoneScreenProps } from '../navigation/AppNavigator';

const EditPhoneScreen: React.FC<EditPhoneScreenProps> = ({ navigation }) => {
  const { session, isAuthenticated } = useAuth();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentValue = useCallback(async () => {
    if (!session || !isAuthenticated) {
      setError("Not authenticated.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const token = session.access_token;
    if (!token) {
      setError("No access token found.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error('Profile not found. Cannot edit phone.');
        }
        throw new Error(errData.error || 'Fetch failed');
      }
      const data = await response.json();
      const value = data?.phone || '';
      setPhone(value);
    } catch (err: any) {
      setError(`Load failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [session, isAuthenticated]);

  useEffect(() => { fetchCurrentValue(); }, [fetchCurrentValue]);

  const handleSave = useCallback(async () => {
    if (!session || !isAuthenticated || phone.trim() === '') {
      navigation.goBack();
      return;
    }
    setIsLoading(true);
    setError(null);

    const token = session.access_token;
    if (!token) {
      setError("No access token found.");
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        phone: phone.trim()
      };

      console.log("Saving Phone:", payload);

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
      
      console.log("Phone save successful");
      navigation.goBack();
    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
      Alert.alert('Save Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [session, isAuthenticated, phone, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isLoading} color={Platform.OS === 'ios' ? colors.primary : undefined}/>,
      headerRight: () => <Button onPress={handleSave} title={isLoading ? "Saving..." : "Save"} disabled={isLoading || phone.trim() === ''} color={Platform.OS === 'ios' ? colors.primary : undefined} />,
    });
  }, [navigation, handleSave, isLoading, phone]);

  if (isLoading) return <View style={theme.screens.editPhoneScreen.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={theme.screens.editPhoneScreen.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={theme.screens.editPhoneScreen.container}>
        {error && <Text style={theme.screens.editPhoneScreen.errorText}>{error}</Text>}
        <Text style={theme.screens.editPhoneScreen.label}>Phone Number</Text>
        <TextInput 
          style={theme.screens.editPhoneScreen.textInput} 
          value={phone} 
          onChangeText={setPhone} 
          placeholder="Enter phone number" 
          editable={!isLoading} 
          keyboardType="phone-pad" 
          autoComplete='tel' 
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export default EditPhoneScreen; 