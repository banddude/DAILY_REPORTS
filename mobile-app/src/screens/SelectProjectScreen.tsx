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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator'; // Import ParamList

import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from './BrowseScreen'; // Re-use fetchApi helper
import { BrowseStackParamList } from '../navigation/AppNavigator'; // Import ParamList

// Type for the route parameters expected by this screen
type SelectProjectScreenRouteProp = RouteProp<BrowseStackParamList, 'SelectProject'>;

// Re-use simple SettingsRow for list items
const SettingsRow = ({ value, onPress, isFirst }: { value: string, onPress: () => void, isFirst?: boolean }) => (
  <TouchableOpacity onPress={onPress} style={[styles.rowContainer, isFirst && styles.firstRowInSection]}>
    <Text style={styles.rowText}>{value}</Text>
    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.disclosureIcon} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Using the same styles as SelectCustomerScreen for consistency
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
  rowContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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

function SelectProjectScreen(): React.ReactElement {
  // Explicitly type useNavigation with the Root stack param list
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<SelectProjectScreenRouteProp>();
  const { userToken } = useAuth();
  const { customer } = route.params; // Get selected customer from route params

  const [allProjects, setAllProjects] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects for the selected customer on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    // Construct endpoint with the customer query parameter
    const endpoint = `/api/browse-reports?customer=${encodeURIComponent(customer)}`;
    fetchApi(endpoint, userToken)
      .then(fetchedProjects => {
        if (isMounted) {
          setAllProjects(fetchedProjects.sort()); // Sort alphabetically
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(`Failed to load projects for ${customer}: ${err.message}`);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [userToken, customer]); // Depend on customer param

  const filteredProjects = useMemo(() => {
    if (!searchQuery) {
      return allProjects;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return allProjects.filter(project =>
      project.toLowerCase().includes(lowerCaseQuery)
    );
  }, [allProjects, searchQuery]);

  const handleSelectProject = useCallback((project: string) => {
    // Navigate back to BrowseScreen (BrowseBase) and pass the selected project
    // Use the explicit navigator/screen pattern for nested navigation
    navigation.navigate('MainAppTabs', {         // Target the screen containing the tabs
      screen: 'BrowseTab',                   // Specify the tab
      params: {                            // Specify params for the tab's stack
        screen: 'BrowseBase',              // Specify the screen within the tab stack
        params: { selectedProject: project, selectedCustomer: customer }, // Specify params for that screen
      },
    });
    Keyboard.dismiss();
  }, [navigation, customer]);

  const renderItem = ({ item, index }: { item: string, index: number }) => (
    <SettingsRow
      value={item}
      onPress={() => handleSelectProject(item)}
      isFirst={index === 0}
    />
  );

  const renderContent = () => {
    // (Identical render logic as SelectCustomerScreen, just uses filteredProjects)
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
        </View>
      );
    }
    if (filteredProjects.length === 0) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No projects match your search.' : 'No projects found for this customer.'}
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        data={filteredProjects}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContentContainer}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Projects..."
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

export default SelectProjectScreen;