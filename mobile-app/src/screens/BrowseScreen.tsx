import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BrowseStackParamList } from '../navigation/AppNavigator';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from './fetchApiHelper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// --- Data Structure Types ---
type ProjectData = { id: string; name: string };
type CustomerEntry = {
  id: string;
  name: string;
  projects: ProjectData[] | null; // null = not fetched, [] = fetched but none found
  isLoadingProjects: boolean;
  hasFetchedProjects: boolean; // To prevent refetching on re-expand if already fetched
};

// Type for items rendered in the FlatList
type ListItem = 
  | { type: 'customer' } & CustomerEntry // Embed customer data directly
  | { type: 'project'; customerName: string } & ProjectData; // Embed project data

// Define navigation prop type for BrowseScreen
type BrowseScreenNavigationProp = NativeStackNavigationProp<BrowseStackParamList, 'BrowseBase'>;

// --- Styles (Adapted from ProfileScreen/Existing BrowseScreen) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusContainer: {
    flex: 1, // Allow it to take full space for centering
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontWeight: typography.fontWeightMedium as '500',
    fontSize: typography.fontSizeM,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: typography.fontSizeM,
    fontStyle: 'italic',
  },
  // Row Styles adapted from ProfileScreen
  rowContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm, // Reduced padding
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
    minHeight: 48, // Consistent height
  },
  firstRow: { // Apply to the very first row if needed, or manage border sections
    borderTopWidth: borders.widthHairline,
    borderTopColor: colors.borderLight,
  },
  iconContainer: {
    marginRight: spacing.md,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
  },
  loadingIconContainer: { // Specific container for the loading spinner on rows
    marginLeft: 'auto', // Push to the right
    paddingLeft: spacing.sm,
  },
  disclosureIcon: {
    marginLeft: spacing.sm, // Push to the right after text/spinner
  },
  projectRowContainer: { // Style for project rows to add indentation
    paddingLeft: spacing.lg + spacing.md + 24, // Indent past customer icon+margin
  },
  searchContainer: { // Styles for the search bar area
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background, // Or colors.surface if preferred
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
  },
  searchInput: { // Styles for the TextInput itself
    backgroundColor: colors.surfaceAlt, // A slightly different background
    borderRadius: borders.radiusMedium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, // Adjust for optimal height
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
  },
});

// --- Browse Screen Component ---
function BrowseScreen(): React.ReactElement {
  const navigation = useNavigation<BrowseScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { userToken } = useAuth();

  // Use a Map to store customer data, preserving insertion order for display
  const [customersMap, setCustomersMap] = useState<Map<string, CustomerEntry>>(new Map());
  const [customerOrder, setCustomerOrder] = useState<string[]>([]); // Keep track of original order
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [errorCustomers, setErrorCustomers] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Data Fetching ---
  const fetchCustomers = useCallback(async () => {
    if (!userToken) return;
    console.log('Fetching customers...');
    setErrorCustomers(null);
    try {
      const customerNames = await fetchApi('/api/browse-reports', userToken);
      const newMap = new Map<string, CustomerEntry>();
      const newOrder: string[] = [];
      customerNames.forEach(name => {
        const id = `customer_${name}`;
        newMap.set(id, {
          id: id,
          name: name,
          projects: null,
          isLoadingProjects: false,
          hasFetchedProjects: false,
        });
        newOrder.push(id);
      });
      setCustomersMap(newMap);
      setCustomerOrder(newOrder);
      setExpandedCustomers(new Set());
      console.log('Customers map populated:', newMap.size);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setErrorCustomers(`Failed to load customers: ${err.message}`);
      setCustomersMap(new Map());
      setCustomerOrder([]);
    }
  }, [userToken]);

  const fetchProjects = useCallback(async (customerId: string, customerName: string): Promise<ProjectData[]> => {
    if (!userToken) return [];
    console.log(`Fetching projects for ${customerName}...`);
    try {
      const endpoint = `/api/browse-reports?customer=${encodeURIComponent(customerName)}`;
      const projectNames = await fetchApi(endpoint, userToken);
      const projects: ProjectData[] = projectNames.map(name => ({
        id: `project_${customerName}_${name}`,
        name: name,
      }));
      console.log(`Projects fetched for ${customerName}:`, projects.length);
      return projects;
    } catch (err: any) {
      console.error(`Error fetching projects for ${customerName}:`, err);
      Alert.alert('Error', `Failed to load projects for ${customerName}: ${err.message}`);
      return []; // Return empty array on error
    }
  }, [userToken]);

  // Initial fetch
  useEffect(() => {
    if (isFocused && userToken) {
      setIsLoadingCustomers(true);
      fetchCustomers().finally(() => setIsLoadingCustomers(false));
    }
  }, [isFocused, userToken, fetchCustomers]);

  // --- Filtering Logic (Uses customersMap) ---
  const filteredListData = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const customerIdsToInclude = new Set<string>();

    // Step 1: Identify Customers to Include
    if (searchQuery) {
      for (const customer of customersMap.values()) {
        // Match customer name
        if (customer.name.toLowerCase().includes(lowerCaseQuery)) {
          customerIdsToInclude.add(customer.id);
          continue; // Already included, no need to check projects
        }
        // Match project names (only if projects have been fetched)
        if (customer.projects) {
          for (const project of customer.projects) {
            if (project.name.toLowerCase().includes(lowerCaseQuery)) {
              customerIdsToInclude.add(customer.id);
              break; // Found a matching project, move to next customer
            }
          }
        }
      }
    } else {
        // No search query, include all customer IDs
        customersMap.forEach((_, key) => customerIdsToInclude.add(key));
    }

    // Step 2: Build the FlatList data
    const filteredList: ListItem[] = [];
    customerOrder.forEach(customerId => { // Iterate in original order
        if (customerIdsToInclude.has(customerId)) {
            const customer = customersMap.get(customerId);
            if (!customer) return; // Should not happen

            // Add customer row
            filteredList.push({ ...customer, type: 'customer' });

            // Add expanded, matching project rows
            if (expandedCustomers.has(customer.id) && customer.projects) {
                customer.projects.forEach(project => {
                    // Only include project if it matches the search query when a query exists
                    if (!searchQuery || project.name.toLowerCase().includes(lowerCaseQuery)) {
                        filteredList.push({ 
                            ...project, 
                            type: 'project', 
                            customerName: customer.name 
                        });
                    }
                });
            }
        }
    });

    return filteredList;
  }, [searchQuery, customersMap, expandedCustomers, customerOrder]);

  // --- Handlers ---
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchCustomers(); // Refetch customers, which resets map and order
    setIsRefreshing(false);
  }, [fetchCustomers]);

  const handleToggleCustomer = useCallback(async (customerId: string, customerName: string, shouldFetchProjects = true) => {
    // Check expansion based on customerId
    const isCurrentlyExpanded = expandedCustomers.has(customerId); 
    const customerEntry = customersMap.get(customerId);

    if (!customerEntry) return;

    // Toggle expansion state using customerId
    const nextExpanded = new Set(expandedCustomers);
    if (isCurrentlyExpanded) {
      nextExpanded.delete(customerId); // Use ID
      console.log(`Collapsed customer: ${customerName} (ID: ${customerId})`);
    } else {
      nextExpanded.add(customerId); // Use ID
      console.log(`Expanded customer: ${customerName} (ID: ${customerId})`);
      // Fetch projects only if expanding and not already fetched
      if (!customerEntry.hasFetchedProjects) {
          console.log(`Fetching projects for ${customerName} on first expand...`);
          setCustomersMap(prevMap => {
              const newMap = new Map(prevMap);
              const entry = newMap.get(customerId);
              if(entry) entry.isLoadingProjects = true;
              return newMap;
          });

          const fetchedProjects = await fetchProjects(customerId, customerName);

          setCustomersMap(prevMap => {
              const newMap = new Map(prevMap);
              const entry = newMap.get(customerId);
              if (entry) {
                  entry.projects = fetchedProjects;
                  entry.isLoadingProjects = false;
                  entry.hasFetchedProjects = true;
              }
              return newMap;
          });
      }
    }
    setExpandedCustomers(nextExpanded); // Update state with the modified Set

  }, [customersMap, expandedCustomers, fetchProjects]);

  const handleProjectPress = useCallback((customerName: string, projectName: string) => {
    console.log(`Navigating to project: ${customerName} / ${projectName}`);
    navigation.navigate('ProjectReports', { customer: customerName, project: projectName });
  }, [navigation]);


  // --- Render Functions ---
  const renderItem = ({ item, index }: { item: ListItem, index: number }) => {
    const isFirst = index === 0;

    if (item.type === 'customer') {
      // Customer Row - uses item directly as it contains CustomerEntry data
      return (
        <TouchableOpacity
          style={[styles.rowContainer, isFirst && styles.firstRow]}
          // Pass customerId and customerName to the handler
          onPress={() => handleToggleCustomer(item.id, item.name)} 
        >
          <View style={styles.iconContainer}>
            <Ionicons name="business-outline" size={22} color={colors.textSecondary} />
          </View>
          <Text style={styles.rowText}>{item.name}</Text>
          {item.isLoadingProjects ? (
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          ) : (
            <Ionicons
              // Check expansion using item.id
              name={expandedCustomers.has(item.id) ? "chevron-down" : "chevron-forward"}
              size={20}
              color={colors.textSecondary}
              style={styles.disclosureIcon}
            />
          )}
        </TouchableOpacity>
      );
    }

    if (item.type === 'project') {
      // Project Row - uses item directly as it contains ProjectData
      return (
        <TouchableOpacity
          style={[styles.rowContainer, styles.projectRowContainer]}
          onPress={() => handleProjectPress(item.customerName, item.name)}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="folder-outline" size={22} color={colors.textSecondary} />
          </View>
          <Text style={styles.rowText}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.disclosureIcon} />
        </TouchableOpacity>
      );
    }

    return null;
  };

  const ListEmptyComponent = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'No customers or projects match your search.'
          : 'No customers found.'}
      </Text>
    </View>
  );

  // --- Main Render ---
  if (isLoadingCustomers && customersMap.size === 0) { // Check map size for initial loading
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorCustomers) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>{errorCustomers}</Text>
          {/* Optionally add a retry button */}
          <TouchableOpacity onPress={handleRefresh}>
             <Text style={{ color: colors.primary, marginTop: spacing.md }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      {/* Add Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Customers & Projects..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing" // iOS clear button
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filteredListData} // Use the data generated by the new useMemo
        renderItem={renderItem}
        keyExtractor={(item) => item.id} // Use the item's id (customer or project)
        ListEmptyComponent={!isLoadingCustomers ? ListEmptyComponent : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]} // iOS tint color
            tintColor={colors.primary} // Android color
          />
        }
        keyboardShouldPersistTaps="handled" // Dismiss keyboard on scroll
      />
    </SafeAreaView>
  );
}

export default BrowseScreen; 