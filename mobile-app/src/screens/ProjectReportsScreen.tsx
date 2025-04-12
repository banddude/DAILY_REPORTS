import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL, S3_BUCKET_NAME, AWS_REGION } from '../config'; // Import S3 constants
import { useAuth } from '../context/AuthContext';
import { fetchApi } from './fetchApiHelper';
import { BrowseStackParamList } from '../navigation/AppNavigator'; // Import ParamList for navigation types

// Type for the route parameters expected by this screen
type ProjectReportsScreenRouteProp = RouteProp<BrowseStackParamList, 'ProjectReports'>;

// Type for navigation prop
type ProjectReportsNavigationProp = NativeStackNavigationProp<BrowseStackParamList, 'ProjectReports'>;

// --- Styles (Reusing styles similar to BrowseScreen/ProfileScreen) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusContainer: {
    flex: 1,
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
  rowContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
    minHeight: 48,
  },
  firstRow: {
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
  disclosureIcon: {
    marginLeft: spacing.sm,
  },
});

// --- Project Reports Screen Component ---
function ProjectReportsScreen(): React.ReactElement {
  const navigation = useNavigation<ProjectReportsNavigationProp>();
  const route = useRoute<ProjectReportsScreenRouteProp>();
  const { userToken, user } = useAuth();
  const userId = user?.id;
  const { customer, project } = route.params;

  const [reports, setReports] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set the header title dynamically
  useEffect(() => {
    navigation.setOptions({ title: project }); // Set header to project name
  }, [navigation, project]);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    if (!userToken || !customer || !project) return;
    console.log(`Fetching reports for ${customer} / ${project}...`);
    setError(null);
    const endpoint = `/api/browse-reports?customer=${encodeURIComponent(customer)}&project=${encodeURIComponent(project)}`;
    try {
      const reportFolders = await fetchApi(endpoint, userToken);
      // Sort reports, potentially reverse chronologically if folder names allow
      const sortedReports = reportFolders.sort().reverse(); // Basic reverse alpha sort
      setReports(sortedReports);
      console.log(`Reports fetched: ${sortedReports.length}`);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setError(`Failed to load reports: ${err.message}`);
      setReports([]);
    }
  }, [userToken, customer, project]);

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
        style={[styles.rowContainer, index === 0 && styles.firstRow]}
        onPress={() => handleReportPress(reportString)} // Pass the original string
      >
        <View style={styles.iconContainer}>
          <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
        </View>
        <Text style={styles.rowText}>{displayValue}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.disclosureIcon} />
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.emptyText}>No reports found for this project.</Text>
    </View>
  );

  // --- Main Render ---
  if (isLoading && reports.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh}>
             <Text style={{ color: colors.primary, marginTop: spacing.md }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={reports}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        ListEmptyComponent={!isLoading ? ListEmptyComponent : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

export default ProjectReportsScreen; 