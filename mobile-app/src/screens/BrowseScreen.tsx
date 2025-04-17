import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
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
import theme, { colors } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/fetchApiHelper';
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

// --- Browse Screen Component ---
function BrowseScreen(): React.ReactElement {
  const navigation = useNavigation<BrowseScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { isAuthenticated } = useAuth();

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
    if (!isAuthenticated) return;
    console.log('Fetching customers...');
    setErrorCustomers(null);
    try {
      const customerNames = await fetchApi('/api/browse-reports');
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
  }, [isAuthenticated]);

  const fetchProjects = useCallback(async (customerId: string, customerName: string): Promise<ProjectData[]> => {
    if (!isAuthenticated) return [];
    console.log(`Fetching projects for ${customerName}...`);
    try {
      const endpoint = `/api/browse-reports?customer=${encodeURIComponent(customerName)}`;
      const projectNames = await fetchApi(endpoint);
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
  }, [isAuthenticated]);

  // Initial fetch
  useEffect(() => {
    if (isFocused && isAuthenticated) {
      setIsLoadingCustomers(true);
      fetchCustomers().finally(() => setIsLoadingCustomers(false));
    }
  }, [isFocused, isAuthenticated, fetchCustomers]);

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

  // --- Event Handlers ---
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchCustomers();
    setIsRefreshing(false);
  }, [fetchCustomers]);

  const handleCustomerPress = useCallback((customer: CustomerEntry) => {
    if (!customer.hasFetchedProjects) {
      // Fetch projects if not already fetched
      setCustomersMap(prevMap => {
          const newMap = new Map(prevMap);
          const updatedCustomer = { ...customer, isLoadingProjects: true };
          newMap.set(customer.id, updatedCustomer);
          return newMap;
      });

      fetchProjects(customer.id, customer.name)
        .then(projects => {
          setCustomersMap(prevMap => {
            const newMap = new Map(prevMap);
            const updatedCustomer = { 
                ...customer, 
                projects: projects, 
                isLoadingProjects: false, 
                hasFetchedProjects: true 
            };
            newMap.set(customer.id, updatedCustomer);
            return newMap;
          });
        })
        .catch(() => { // Handle error within fetchProjects already alerts
           setCustomersMap(prevMap => {
                const newMap = new Map(prevMap);
                const updatedCustomer = { 
                    ...customer, 
                    isLoadingProjects: false, 
                    hasFetchedProjects: true, // Mark as fetched even on error to prevent retrying on expand
                    projects: [] // Show as empty on error
                };
                newMap.set(customer.id, updatedCustomer);
                return newMap;
            });
        });
    }

    // Toggle expansion
    setExpandedCustomers(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(customer.id)) {
        newExpanded.delete(customer.id);
      } else {
        newExpanded.add(customer.id);
      }
      return newExpanded;
    });
  }, [fetchProjects]);

  const handleProjectPress = (customerName: string, projectName: string) => {
    console.log('Navigate to Project View for:', customerName, projectName);
    // Navigate to a Project Detail screen (to be created)
    navigation.navigate('ProjectReports', { customer: customerName, project: projectName });
  };

  // --- Render Item ---
  const renderItem = ({ item, index }: { item: ListItem, index: number }) => {
    const isFirst = index === 0;

    if (item.type === 'customer') {
        const isExpanded = expandedCustomers.has(item.id);
        return (
          <TouchableOpacity 
              style={[theme.screens.browseScreen.rowContainer, isFirst && theme.screens.browseScreen.firstRow]}
              onPress={() => handleCustomerPress(item)} // Pass the full customer item
          >
            <View style={theme.screens.browseScreen.iconContainer}>
              <Ionicons name={isExpanded ? 'folder-open-outline' : 'folder-outline'} size={24} color={colors.textSecondary} />
            </View>
            <Text style={theme.screens.browseScreen.rowText}>{item.name}</Text>
            {item.isLoadingProjects ? (
                <View style={theme.screens.browseScreen.loadingIconContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            ) : (
                <Ionicons 
                    name={isExpanded ? 'chevron-down' : 'chevron-forward'} 
                    size={20} 
                    color={colors.textDisabled}
                    style={theme.screens.browseScreen.disclosureIcon}
                />
            )}
          </TouchableOpacity>
        );
    }

    if (item.type === 'project') {
      return (
        <TouchableOpacity 
            style={theme.screens.browseScreen.projectRowContainer} // Use indented style
            onPress={() => handleProjectPress(item.customerName, item.name)}
        >
           {/* No specific icon for project needed with indentation */}
          <Text style={theme.screens.browseScreen.rowText}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} style={theme.screens.browseScreen.disclosureIcon} />
        </TouchableOpacity>
      );
    }

    return null; // Should not happen
  };

  // --- Empty List Component ---
  const ListEmptyComponent = () => (
      <View style={theme.screens.browseScreen.statusContainer}>
        <Text style={theme.screens.browseScreen.emptyText}>
          {searchQuery 
            ? "No customers or projects found matching your search."
            : "No customers found. Pull down to refresh."
          }
        </Text>
      </View>
  );

  // --- Main Render ---
  if (isLoadingCustomers) {
    return (
      <SafeAreaView style={theme.screens.browseScreen.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={theme.screens.browseScreen.statusContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorCustomers && customersMap.size === 0) {
    return (
      <SafeAreaView style={theme.screens.browseScreen.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={theme.screens.browseScreen.statusContainer}>
          <Text style={theme.screens.browseScreen.errorText}>{errorCustomers}</Text>
          {/* Optional: Add a retry button */}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={theme.screens.browseScreen.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={theme.screens.browseScreen.searchContainer}>
          <TextInput
            style={theme.screens.browseScreen.searchInput}
            placeholder="Search Customers or Projects..."
            placeholderTextColor={colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
      </View>
      <FlatList
        data={filteredListData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]} // iOS tint color
            tintColor={colors.primary} // Android spinner color
          />
        }
      />
    </SafeAreaView>
  );
}

export default BrowseScreen; 