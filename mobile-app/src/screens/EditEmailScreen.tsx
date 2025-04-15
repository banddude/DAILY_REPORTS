import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Alert, Button, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditEmailScreenProps } from '../navigation/AppNavigator';

const styles = StyleSheet.create({ /* Common editor styles */ safeArea:{flex:1,backgroundColor:colors.background}, container:{flex:1,padding:spacing.lg}, loadingContainer:{flex:1,justifyContent:'center',alignItems:'center'}, errorText:{color:colors.error,textAlign:'center',marginBottom:spacing.md}, label:{fontSize:typography.fontSizeS,fontWeight:typography.fontWeightMedium as '500',color:colors.textSecondary,marginBottom:spacing.sm,textTransform:'uppercase'}, textInput:{backgroundColor:colors.surface,borderRadius:borders.radiusMedium,paddingHorizontal:spacing.md,paddingVertical:spacing.md,fontSize:typography.fontSizeM,color:colors.textPrimary,borderWidth:borders.widthThin,borderColor:colors.borderLight} });

function EditEmailScreen(): React.ReactElement {
  const navigation = useNavigation<EditEmailScreenProps['navigation']>();
  const { userToken, user } = useAuth();
  const [currentValue, setCurrentValue] = useState<string>(user?.email || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <Button onPress={() => navigation.goBack()} title="Close" color={Platform.OS === 'ios' ? colors.primary : undefined}/>,
      headerRight: undefined,
      title: 'Email Address'
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.label}>Current Email Address</Text>
        <TextInput 
            style={[styles.textInput, { backgroundColor: colors.surfaceAlt, color: colors.textSecondary }]}
            value={currentValue}
            placeholder="Email address"
            editable={false}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete='email'
        />
        <Text style={{ marginTop: spacing.md, textAlign: 'center', color: colors.textSecondary, fontSize: typography.fontSizeXS }}>
            To change your email address, please contact support.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
export default EditEmailScreen; 