import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert, Button, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import theme, { colors, spacing, typography } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditEmailScreenProps } from '../navigation/AppNavigator';

function EditEmailScreen(): React.ReactElement {
  const navigation = useNavigation<EditEmailScreenProps['navigation']>();
  const { session, user, isAuthenticated } = useAuth();
  const [currentValue, setCurrentValue] = useState<string>('');
  const [initialValue, setInitialValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <Button onPress={() => navigation.goBack()} title="Close" color={Platform.OS === 'ios' ? colors.primary : undefined}/>,
      headerRight: undefined,
      title: 'Email Address'
    });
  }, [navigation]);

  const fetchCurrentValue = useCallback(async () => {
    if (!session || !isAuthenticated) { /* ... handle auth error ... */ return; }
    setIsLoading(true);
    setError(null);
    const token = session.access_token;
    if (!token) { /* ... handle token error ... */ return; }

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
      if (!response.ok) throw new Error('Fetch failed');
      const data = await response.json();
      const value = data?.email || user?.email || '';
      setInitialValue(value);
      setCurrentValue(value);
    } catch (err: any) { setError(`Load failed: ${err.message}`); }
    finally { setIsLoading(false); }
  }, [session, isAuthenticated, user?.email]);

  useEffect(() => { fetchCurrentValue(); }, [fetchCurrentValue]);

  return (
    <SafeAreaView style={theme.screens.editEmailScreen.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView 
        style={theme.screens.editEmailScreen.container} 
        contentContainerStyle={theme.screens.editEmailScreen.containerContent}
      >
        {isLoading && <ActivityIndicator size="large" color={colors.primary} />} 
        {!isLoading && error && <Text style={theme.screens.editEmailScreen.errorText}>{error}</Text>}
        {!isLoading && !error && (
          <>
            <Text style={theme.screens.editEmailScreen.label}>Current Email Address</Text>
            <TextInput 
                style={theme.screens.editEmailScreen.disabledTextInput}
                value={currentValue}
                placeholder="Email address"
                editable={false}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete='email'
            />
            <Text style={theme.screens.editEmailScreen.supportText}> 
                To change your email address, please contact support.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
export default EditEmailScreen; 