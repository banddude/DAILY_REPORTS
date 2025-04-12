import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

// Define base URL for the API (use your actual backend URL)
// For local development with Expo Go, use your machine's local IP
// For production, use your deployed URL (e.g., reports.shaffercon.com)
// const API_BASE_URL = process.config.API_BASE_URL || 'https://localhost:3000'; // Replace if necessary <-- REMOVE THIS LINE
const S3_BUCKET_NAME = 'shaffer-reports'; // Add S3 Bucket Name
const AWS_REGION = 'us-east-1';        // Add AWS Region

// --- Styles --- (Similar to HomeScreen, but adapted for Browse)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // Use theme token
  },
  listContentContainer: { // Padding for FlatList content (items)
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl, // Space at the bottom of the list itself
  },
  listHeaderContainer: { // Padding for the header component within FlatList
    padding: spacing.md, // Apply padding around the controls/status in the header
    paddingBottom: spacing.lg, // Extra space below header content before list starts
  },
  controlsContainer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borders.radiusMedium,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  controlGroup: {
    marginBottom: spacing.lg,
  },
  controlGroupLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: typography.fontSizeS,
    fontWeight: typography.fontWeightMedium as '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerWrapper: {
    borderWidth: borders.widthThin,
    borderColor: colors.border,
    borderRadius: borders.radiusSmall,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  pickerWrapperDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  pickerLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  loadingIndicator: {
    marginBottom: spacing.xs,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeS,
  },
  errorContainer: {
    backgroundColor: colors.errorBg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borders.radiusSmall,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    width: '100%',
    alignItems: 'center',
  },
  errorText: {
    color: colors.errorText,
    fontWeight: typography.fontWeightMedium as '500',
    textAlign: 'center',
    fontSize: typography.fontSizeS,
  },
  emptyContainer: { // Container for the ListEmptyComponent
    flexGrow: 1, // Allow it to take space if list is short/empty
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl, // Add space above the empty message
  },
  noReportsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.fontSizeS,
    fontStyle: 'italic',
  },
  reportItem: {
    backgroundColor: colors.surface,
    borderRadius: borders.radiusMedium,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
    marginBottom: spacing.md,
  },
  reportInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  reportName: {
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightMedium as '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  reportActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
});

// --- Helper Functions ---
export const fetchApi = async (endpoint: string, token: string | null): Promise<string[]> => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('Fetching:', url);
  
  const headers: HeadersInit = {
      'Accept': 'application/json', // Standard header
      // Add other headers if needed
  };
  
  if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      // console.log('Auth Header Sent:', `Bearer ${token.substring(0, 5)}...`); // Keep if needed
  } else {
      console.warn('fetchApi called without a token for endpoint:', endpoint);
      return []; // Return empty for now
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      let errorBody = '';
      try {
          errorBody = await response.text();
          const errData = JSON.parse(errorBody);
          throw new Error(errData.error || errData.message || `HTTP error! status: ${response.status}`);
      } catch (parseError) {
          console.error("Failed to parse error response as JSON:", errorBody);
          throw new Error(`HTTP error! status: ${response.status}. Response: ${errorBody.substring(0, 100)}`);
      }
    }
    const data = await response.json();
    // console.log('Received:', data); // Keep if needed
    return Array.isArray(data?.items) ? data.items.filter((item: any): item is string => typeof item === 'string') : [];
  } catch (error: any) {
    console.error("API Fetch Error:", error);
    throw new Error(error.message || 'An unknown API error occurred');
  }
};

export const openLink = async (url: string) => {
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert("Cannot Open Link", `Don't know how to open this URL: ${url}`);
  }
};

// --- Component ---
function BrowseScreen(): React.ReactElement {
  const navigation = useNavigation<any>();
  const { userToken } = useAuth();
  const [customers, setCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [reports, setReports] = useState<string[]>([]);
  const [loadingState, setLoadingState] = useState<'idle' | 'customers' | 'projects' | 'reports'>('customers');
  const [error, setError] = useState<string | null>(null);

  // Fetch initial customers
  useEffect(() => {
    let isMounted = true;
    setLoadingState('customers');
    setError(null);
    setCustomers([]);
    setSelectedCustomer(undefined);
    setProjects([]);
    setSelectedProject(undefined);
    setReports([]);

    fetchApi('/api/browse-reports', userToken)
      .then(fetchedCustomers => {
          if (isMounted) setCustomers(fetchedCustomers);
      })
      .catch(err => {
          if (isMounted) setError(`Failed to load customers: ${err.message}`);
      })
      .finally(() => {
          if (isMounted) setLoadingState('idle');
      });
      return () => { isMounted = false };
  }, [userToken]);

  // Fetch projects when customer changes
  useEffect(() => {
    if (!selectedCustomer) {
      setProjects([]);
      setSelectedProject(undefined);
      setReports([]);
      setError(null); // Clear errors when customer is deselected
      return;
    }
    let isMounted = true;
    setLoadingState('projects');
    setError(null);
    setProjects([]);
    setSelectedProject(undefined);
    setReports([]);

    fetchApi(`/api/browse-reports?customer=${encodeURIComponent(selectedCustomer)}`, userToken)
      .then(fetchedProjects => {
          if (isMounted) setProjects(fetchedProjects);
      })
      .catch(err => {
          if (isMounted) setError(`Failed to load projects for ${selectedCustomer}: ${err.message}`);
      })
      .finally(() => {
          if (isMounted) setLoadingState('idle');
      });
       return () => { isMounted = false };
  }, [selectedCustomer, userToken]);

  // Fetch reports when project changes
  useEffect(() => {
    if (!selectedCustomer || !selectedProject) {
      setReports([]);
      setError(null); // Clear errors when project is deselected
      return;
    }
    let isMounted = true;
    setLoadingState('reports');
    setError(null);
    setReports([]);

    fetchApi(`/api/browse-reports?customer=${encodeURIComponent(selectedCustomer)}&project=${encodeURIComponent(selectedProject)}`, userToken)
      .then(fetchedReports => {
          if (isMounted) setReports(fetchedReports);
      })
      .catch(err => {
          if (isMounted) setError(`Failed to load reports for ${selectedCustomer}/${selectedProject}: ${err.message}`);
      })
      .finally(() => {
          if (isMounted) setLoadingState('idle');
      });
       return () => { isMounted = false };
  }, [selectedCustomer, selectedProject, userToken]);

  // Render helper for loading inside pickers
  const renderPickerLoading = (isLoading: boolean) => {
      if (!isLoading) return null;
      return (
          <View style={styles.pickerLoadingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
          </View>
      );
  };

  // Render helper for report list item
  const renderReportItem = ({ item: reportFolder }: { item: string }) => {
    if (!userToken || !selectedCustomer || !selectedProject) {
        console.error("Missing context for rendering report item");
        return null;
    }
    const baseKey = `users/${userToken}/${selectedCustomer}/${selectedProject}/${reportFolder}`;
    const jsonKey = `${baseKey}/daily_report.json`;
    const viewerKey = `${baseKey}/report-viewer.html`;

    const reportDate = reportFolder.match(/report_(\d{4}-\d{2}-\d{2})/)?.[1] || reportFolder;

    const navigateToEditor = () => {
        console.log(`Navigating to ReportEditor with key: ${jsonKey}`);
        navigation.navigate('ReportEditor', { reportKey: jsonKey });
    };

    const navigateToWebViewer = () => {
        const viewerUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${viewerKey}`;
        console.log(`Navigating to WebViewer with URL: ${viewerUrl}`);
        navigation.navigate('WebViewer', { url: viewerUrl });
    };

    return (
      <View style={styles.reportItem}>
          <View style={styles.reportInfo}>
              <Text style={styles.reportName}>{`Report: ${reportDate}`}</Text>
          </View>
          <View style={styles.reportActions}>
              <TouchableOpacity onPress={navigateToWebViewer} style={styles.actionButton}>
                  <Ionicons name="eye-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={navigateToEditor} style={styles.actionButton}>
                  <Ionicons name="create-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
          </View>
      </View>
    );
  };

  const ListHeader = () => (
      <View style={styles.listHeaderContainer}> 
          {/* --- Controls Section --- */}
          <View style={styles.controlsContainer}>
              {/* Customer Picker */}
              <View style={styles.controlGroup}>
                  <Text style={styles.label}>Customer</Text>
                  <View style={[styles.pickerWrapper, loadingState === 'customers' && styles.pickerWrapperDisabled]}>
                      <Picker
                          selectedValue={selectedCustomer}
                          onValueChange={(itemValue) => setSelectedCustomer(itemValue == null ? undefined : String(itemValue))}
                          enabled={loadingState !== 'customers'}
                          style={styles.picker}
                          prompt="Select a Customer"
                      >
                          <Picker.Item label="-- Select Customer --" value={undefined} color={colors.textDisabled} />
                          {customers.map((customer) => (
                              <Picker.Item key={customer} label={customer} value={customer} />
                          ))}
                      </Picker>
                      {renderPickerLoading(loadingState === 'customers')}
                  </View>
              </View>

              {/* Project Picker */}
              <View style={[styles.controlGroup, styles.controlGroupLast]}>
                  <Text style={styles.label}>Project</Text>
                  <View style={[styles.pickerWrapper, (!selectedCustomer || loadingState === 'projects') && styles.pickerWrapperDisabled]}>
                      <Picker
                          selectedValue={selectedProject}
                          onValueChange={(itemValue) => setSelectedProject(itemValue == null ? undefined : String(itemValue))}
                          enabled={!!selectedCustomer && loadingState !== 'projects'}
                          style={styles.picker}
                          prompt="Select a Project"
                      >
                          <Picker.Item label={selectedCustomer ? "-- Select Project --" : "-- Select Customer First --"} value={undefined} color={colors.textDisabled} />
                          {projects.map((project) => (
                              <Picker.Item key={project} label={project} value={project} />
                          ))}
                      </Picker>
                      {renderPickerLoading(loadingState === 'projects')}
                  </View>
              </View>
          </View>

          {/* --- Status/Error Display Area (below controls, before list) --- */}
          {error && (
              <View style={styles.statusContainer}>
                  <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                  </View>
              </View>
          )}

          {/* Loading indicator specifically for reports (shows when reports are loading) */}
          {loadingState === 'reports' && !error && (
              <View style={styles.statusContainer}>
                  <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator}/>
                  <Text style={styles.statusText}>Loading reports...</Text>
              </View>
          )}
      </View>
  );

  const EmptyListMessage = () => (
      <View style={styles.emptyContainer}>
          <Text style={styles.noReportsText}>
              {selectedCustomer && selectedProject
                  ? "No reports found for this selection."
                  : "Please select a customer and project to view reports."
              }
          </Text>
      </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <FlatList
          data={selectedCustomer && selectedProject && loadingState === 'idle' ? reports : []} // Only pass reports when ready
          renderItem={renderReportItem}
          keyExtractor={(item) => item} // Report folder names should be unique in context
          ListHeaderComponent={ListHeader} // Controls, error, loading indicator
          ListEmptyComponent={!error && (loadingState === 'idle' || loadingState === 'reports') ? EmptyListMessage : null} // Show message when idle/loading reports but empty, hide if picker loading
          contentContainerStyle={styles.listContentContainer} // Padding for list items
          keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

export default BrowseScreen; 