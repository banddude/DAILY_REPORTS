import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from './BrowseScreen'; // Re-use fetchApi helper

// Simple SettingsRow for list items (can be enhanced)
const SettingsRow = ({ value, onPress, isFirst }: { value: string, onPress: () => void, isFirst?: boolean }) => (
  <TouchableOpacity onPress={onPress} style={[styles.rowContainer, isFirst && styles.firstRowInSection]}>
    <Text style={styles.rowText}>{value}</Text>
    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.disclosureIcon} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: spacing.md,
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  searchInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borders.radiusMedium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
  },
  listContainer: {
    flex: 1,
  },
  listContentContainer: {
    paddingBottom: spacing.md,
  },
  // Row styles adapted from ProfileScreen's SettingsRow
  rowContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, // Slightly more padding for easier tapping
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
    minHeight: 48,
  },
  firstRowInSection: {
    borderTopWidth: borders.widthHairline,
    borderTopColor: colors.borderLight,
  },
  rowText: {
    flex: 1,
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
  },
  disclosureIcon: {
    marginLeft: spacing.xs,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontWeight: typography.fontWeightBold as '600',
    fontSize: typography.fontSizeM,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: typography.fontSizeM,
    fontStyle: 'italic',
  },
});

function SelectCustomerScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userToken } = useAuth();
  const [allCustomers, setAllCustomers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all customers on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    fetchApi('/api/browse-reports', userToken)
      .then(fetchedCustomers => {
        if (isMounted) {
          setAllCustomers(fetchedCustomers.sort()); // Sort alphabetically
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(`Failed to load customers: ${err.message}`);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [userToken]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) {
      return allCustomers;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return allCustomers.filter(customer =>
      customer.toLowerCase().includes(lowerCaseQuery)
    );
  }, [allCustomers, searchQuery]);

  const handleSelectCustomer = useCallback((customer: string) => {
    // Navigate back to BrowseScreen and pass the selected customer
    // Use explicit tab + screen navigation for nested stacks
    navigation.navigate('MainAppTabs', {         // Target the screen containing the tabs
      screen: 'BrowseTab',                   // Specify the tab
      params: {                            // Specify params for the tab's stack
        screen: 'BrowseBase',              // Specify the screen within the tab stack
        params: { selectedCustomer: customer }, // Specify params for that screen
      },
    });
    Keyboard.dismiss(); // Dismiss keyboard on selection
  }, [navigation]);

  const renderItem = ({ item, index }: { item: string, index: number }) => (
    <SettingsRow
      value={item}
      onPress={() => handleSelectCustomer(item)}
      isFirst={index === 0}
    />
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {/* Add a retry button maybe? */}
        </View>
      );
    }
    if (filteredCustomers.length === 0) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No customers match your search.' : 'No customers found.'}
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        data={filteredCustomers}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContentContainer}
        keyboardShouldPersistTaps="handled" // Allow tapping item while keyboard is up
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Customers..."
            placeholderTextColor={colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <View style={styles.listContainer}>
            {renderContent()}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default SelectCustomerScreen; 