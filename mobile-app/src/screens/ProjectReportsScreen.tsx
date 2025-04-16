import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';

import theme, { colors } from '../theme/theme'; // Import theme and colors
import { API_BASE_URL, S3_BUCKET_NAME, AWS_REGION } from '../config'; // Import S3 constants
import { useAuth } from '../context/AuthContext';
import { fetchApi } from './fetchApiHelper';
import { BrowseStackParamList } from '../navigation/AppNavigator'; // Import ParamList for navigation types

// Type for the route parameters expected by this screen
type ProjectReportsScreenRouteProp = RouteProp<BrowseStackParamList, 'ProjectReports'>;

// Type for navigation prop
type ProjectReportsNavigationProp = NativeStackNavigationProp<BrowseStackParamList, 'ProjectReports'>;

// --- Project Reports Screen Component ---
function ProjectReportsScreen(): React.ReactElement {
  const navigation = useNavigation<ProjectReportsNavigationProp>();
  const route = useRoute<ProjectReportsScreenRouteProp>();
  const { session, user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const { customer, project } = route.params;

  const [reports, setReports] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set the header title dynamically and add custom back button
  useEffect(() => {
    navigation.setOptions({ 
      title: project, // Keep setting the title
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            console.log("ProjectReports: Navigating back to Browse screen, ensuring focus triggers updates.");
            navigation.dispatch(
              CommonActions.navigate({
                name: 'BrowseBase',
                params: {
                  focusedCustomer: customer, 
                },
              })
            );
          }}
          style={theme.screens.projectReportsScreen.headerBackButtonContainer}
        >
          <Ionicons
            name="chevron-back-outline"
            size={24}
            color={colors.textPrimary}
          />
          <Text style={theme.screens.projectReportsScreen.headerBackTitle}>Reports</Text>
        </TouchableOpacity>
      ),
    }); 
  }, [navigation, project, customer]); // Add customer to dependencies

  // Fetch reports
  const fetchReports = useCallback(async () => {
    if (!session || !isAuthenticated || !customer || !project) return;
    console.log(`Fetching reports for ${customer} / ${project}...`);
    setError(null);
    const endpoint = `/api/browse-reports?customer=${encodeURIComponent(customer)}&project=${encodeURIComponent(project)}`;
    try {
      const reportFolders = await fetchApi(endpoint);
      // Sort reports, potentially reverse chronologically if folder names allow
      const sortedReports = reportFolders.sort().reverse(); // Basic reverse alpha sort
      setReports(sortedReports);
      console.log(`Reports fetched: ${sortedReports.length}`);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setError(`Failed to load reports: ${err.message}`);
      setReports([]);
    }
  }, [session, isAuthenticated, customer, project]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchReports().finally(() => setIsLoading(false));
  }, [fetchReports]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchReports();
    setIsRefreshing(false);
  }, [fetchReports]);

  // Navigation handler - Reverted to use full reportString for path
  const handleReportPress = useCallback((reportString: string) => {
    // The reportString itself (e.g., "report_2025-04-11T...") IS the folder name on S3
    const reportFolderName = reportString; 
    
    if (!userId || !customer || !project) {
        console.error("Missing context for report navigation (userId, customer, or project)");
        Alert.alert("Error", "Could not determine report details.");
        return;
    }
    // Construct the key for the viewer HTML file using the original reportString as the folder name
    const viewerKey = `users/${userId}/${customer}/${project}/${reportFolderName}/report-viewer.html`;
    const viewerUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${viewerKey}`;
    
    console.log(`Navigating to WebViewer with URL: ${viewerUrl} (using folder: ${reportFolderName})`);
    navigation.navigate('WebViewer', { url: viewerUrl });
  }, [navigation, userId, customer, project]);

  // --- Render Functions - Updated parsing (Manual Extraction) ---
  const renderItem = ({ item: reportString, index }: { item: string, index: number }) => {
    let displayValue = reportString; // Default to the full input string

    // Extract the date-time part (expecting format "report_YYYY-MM-DDTHH-MM-SS-msZ")
    const dateTimeString = reportString.startsWith('report_') ? reportString.substring(7) : null;

    if (dateTimeString) {
        try {
            // Manually parse components: YYYY-MM-DDTHH-MM-SS-msZ
            const parts = dateTimeString.split('T');
            if (parts.length === 2) {
                const dateParts = parts[0].split('-'); // [YYYY, MM, DD]
                const timeParts = parts[1].replace('Z', '').split('-'); // [HH, MM, SS, ms]

                if (dateParts.length === 3 && timeParts.length === 4) {
                    const year = parseInt(dateParts[0], 10);
                    const monthIndex = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
                    const day = parseInt(dateParts[2], 10);
                    const hour = parseInt(timeParts[0], 10);
                    const minute = parseInt(timeParts[1], 10);
                    const second = parseInt(timeParts[2], 10);
                    const ms = parseInt(timeParts[3], 10);

                    // Construct date using Date.UTC to respect the 'Z' (Zulu/UTC time)
                    const reportDate = new Date(Date.UTC(year, monthIndex, day, hour, minute, second, ms));

                    if (!isNaN(reportDate.getTime())) {
                        const options: Intl.DateTimeFormatOptions = {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        };
                        // Format in the user's local timezone using toLocaleDateString
                        displayValue = reportDate.toLocaleDateString(undefined, options);
                    } else {
                        console.warn(`Could not construct valid Date object from parsed components for: ${dateTimeString}`);
                        displayValue = dateTimeString; // Fallback to extracted part
                    }
                } else {
                     console.warn(`Incorrect number of date/time parts after split for: ${dateTimeString}`);
                     displayValue = dateTimeString; // Fallback
                }
            } else {
                 console.warn(`String could not be split by 'T': ${dateTimeString}`);
                 displayValue = dateTimeString; // Fallback
            }
        } catch (e) {
            console.error(`Error manually parsing/formatting date for ${reportString}:`, e);
            displayValue = dateTimeString || reportString; // Fallback
        }
    } else {
        console.warn(`Unexpected report string format: ${reportString}`);
    }

    return (
      <TouchableOpacity
        style={[theme.screens.projectReportsScreen.rowContainer, index === 0 && theme.screens.projectReportsScreen.firstRow]}
        onPress={() => handleReportPress(reportString)} // Pass the original string
      >
        <View style={theme.screens.projectReportsScreen.iconContainer}>
          <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
        </View>
        <Text style={theme.screens.projectReportsScreen.rowText}>{displayValue}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={theme.screens.projectReportsScreen.disclosureIcon} />
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={theme.screens.projectReportsScreen.statusContainer}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : error ? (
        <Text style={theme.screens.projectReportsScreen.errorText}>{error}</Text>
      ) : (
        <Text style={theme.screens.projectReportsScreen.emptyText}>No reports found for this project.</Text>
      )}
    </View>
  );

  // --- Main Render ---
  return (
    <SafeAreaView style={theme.screens.projectReportsScreen.safeArea} edges={['bottom']}>
      {reports.length > 0 ? (
        <FlatList
          data={reports}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          ListEmptyComponent={isLoading ? null : ListEmptyComponent} // Only show if not loading
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      ) : (
        ListEmptyComponent()
      )}
    </SafeAreaView>
  );
}

export default ProjectReportsScreen; 