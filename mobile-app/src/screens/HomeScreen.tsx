import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  Modal,
  Dimensions,
  TextInput,
  Button,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video, ResizeMode, Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from './fetchApiHelper';
import SelectionModal from '../components/SelectionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';

// Restore constant
const ADD_NEW_CUSTOMER_OPTION = "Add New Customer...";
const ADD_NEW_PROJECT_OPTION = "Add New Project...";

// Basic type for the result object expected from the server
interface ReportResult {
  editorUrl: string;
  viewerUrl: string;
}

// Type for the result state, including message and type (success, error, loading, null)
type ResultState = {
  message: string;
  type: 'success' | 'error' | 'loading' | null;
  data?: ReportResult | null;
};

// Define a unified asset type for state
interface SelectedAsset {
  uri: string;
  name: string;
  size?: number;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { userToken } = useAuth();
  const [selectedFile, setSelectedFile] = useState<SelectedAsset | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [result, setResult] = useState<ResultState>({ message: '', type: null, data: null });
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const videoPlayerRef = useRef<Video>(null);

  // State for pickers
  const [selectedCustomer, setSelectedCustomer] = useState<string | undefined>(undefined);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [fetchedCustomers, setFetchedCustomers] = useState<string[]>([ADD_NEW_CUSTOMER_OPTION]);
  const [fetchedProjects, setFetchedProjects] = useState<string[]>([]);
  const [isFetchingCustomers, setIsFetchingCustomers] = useState(false);
  const [isFetchingProjects, setIsFetchingProjects] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // State for modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
      title: string;
      data: string[];
      currentSelection?: string;
      isLoading: boolean;
      onSelect: (item: string) => void;
  } | null>(null);

  // State for deletion confirmation
  const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'customer' | 'project', name: string } | null>(null);

  // Log token value on every render
  console.log(`HomeScreen Render: userToken is ${userToken ? 'present' : 'null'}`);

  // Restore and adapt Fetch customers function
  const loadCustomers = useCallback(async () => {
    if (!userToken) {
      console.log('HomeScreen Customer Effect: No userToken, setting defaults.');
      // Only include ADD_NEW option if no token
      setFetchedCustomers([ADD_NEW_CUSTOMER_OPTION]); 
      setSelectedCustomer(undefined);
      setIsFetchingCustomers(false);
      return;
    }

    console.log('HomeScreen: Attempting to fetch customers...');
    setIsFetchingCustomers(true);
    setFetchError(null);
    const previouslySelectedCustomer = selectedCustomer;

    try {
      const fetchedData: string[] = await fetchApi('/api/browse-reports', userToken);
      console.log('HomeScreen: Successfully fetched customers from server:', fetchedData.length);

      // Merge fetched data with existing local state, keep ADD_NEW first, ensure uniqueness
      setFetchedCustomers(prevLocalCustomers => {
          const combined = [
              ADD_NEW_CUSTOMER_OPTION,
              ...fetchedData,
              // Add any from previous state that weren't fetched (locally added)
              ...prevLocalCustomers.filter(c => c !== ADD_NEW_CUSTOMER_OPTION && !fetchedData.includes(c))
          ];
          // Remove duplicates
          const uniqueCombined = combined.filter((v, i, a) => a.indexOf(v) === i);
          console.log('HomeScreen: Merged customer list:', uniqueCombined);
          return uniqueCombined;
      });

      // Check if the PREVIOUSLY selected customer is still valid in the NEW merged list
      // We need to check against the latest state after the update
      setFetchedCustomers(currentMergedCustomers => {
          if (previouslySelectedCustomer &&
              previouslySelectedCustomer !== ADD_NEW_CUSTOMER_OPTION &&
              !currentMergedCustomers.includes(previouslySelectedCustomer)) {
              console.log(`HomeScreen loadCustomers: Previously selected customer '${previouslySelectedCustomer}' no longer exists. Resetting selection.`);
              setSelectedCustomer(undefined);
              setSelectedProject(undefined);
          } else {
              console.log(`HomeScreen loadCustomers: Keeping current selection: ${previouslySelectedCustomer}`);
          }
          return currentMergedCustomers; // Return the state unchanged from this check
      });

    } catch (err: any) {
      const errorMessage = `Failed to load customers: ${err?.message || 'Unknown error'}`;
      console.error("HomeScreen Fetch customers error:", errorMessage, err);
      setFetchError(errorMessage);
      // On error, revert to just the Add New option? Or keep local ones?
      // Let's keep local ones + Add New for now
      setFetchedCustomers(prev => prev.filter(c => c !== ADD_NEW_CUSTOMER_OPTION).length > 0 
          ? [ADD_NEW_CUSTOMER_OPTION, ...prev.filter(c => c !== ADD_NEW_CUSTOMER_OPTION)]
          : [ADD_NEW_CUSTOMER_OPTION]);
      setSelectedCustomer(undefined);
      setSelectedProject(undefined);
    } finally {
      setIsFetchingCustomers(false);
    }
  // Re-add selectedCustomer dependency here as we check it
  }, [userToken, selectedCustomer]); 

  // Restore Effect to load customers on focus
  useEffect(() => {
    if (isFocused && userToken) {
       console.log("HomeScreen Focus Effect: Triggering loadCustomers.");
       loadCustomers();
    } else if (!userToken) {
      // Ensure list is reset correctly if user logs out
      setFetchedCustomers([ADD_NEW_CUSTOMER_OPTION]);
      setFetchedProjects([]);
      setSelectedCustomer(undefined);
      setSelectedProject(undefined);
      setFetchError(null);
    }
  // Add loadCustomers back to dependencies
  }, [isFocused, userToken, loadCustomers]); 

  // Fetch projects - Refactored Logic
  const loadProjects = useCallback(async () => {
    if (!selectedCustomer || !userToken) {
      setFetchedProjects([]);
      setIsFetchingProjects(false);
      return;
    }

    console.log(`HomeScreen: Triggering project fetch for customer ${selectedCustomer}.`);
    setIsFetchingProjects(true);
    setFetchError(null);
    setFetchedProjects([]);
    setSelectedProject(undefined);

    try {
      const projectsData: string[] = await fetchApi(`/api/browse-reports?customer=${encodeURIComponent(selectedCustomer)}`, userToken);
      console.log(`HomeScreen: Successfully fetched projects for ${selectedCustomer}.`, projectsData.length);
      // Ensure "Add New" option is always first
      setFetchedProjects([ADD_NEW_PROJECT_OPTION, ...projectsData.filter(p => p !== ADD_NEW_PROJECT_OPTION)]);
    } catch (err: any) {
      const errorMessage = `Failed to load projects: ${err?.message || 'Unknown error'}`;
      console.error("HomeScreen Fetch projects error:", errorMessage, err);
      setFetchError(errorMessage);
      setFetchedProjects([]);
      setSelectedProject(undefined);
    } finally {
      setIsFetchingProjects(false);
    }
  }, [selectedCustomer, userToken]);

  // Effect to load projects when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      loadProjects();
    } else {
      setFetchedProjects([]);
      setSelectedProject(undefined);
    }
  }, [selectedCustomer, loadProjects]);

  // Effect to generate thumbnail when selectedFile changes
  useEffect(() => {
    const generateThumbnail = async () => {
      if (selectedFile?.uri) {
        setIsGeneratingThumbnail(true);
        setThumbnailUri(null);
        try {
          console.log(`Generating thumbnail for: ${selectedFile.uri}`);
          const { uri } = await VideoThumbnails.getThumbnailAsync(
            selectedFile.uri,
            {
              time: 1000, // Generate thumbnail around the 1-second mark
              quality: 0.5 // Adjust quality if needed
            }
          );
          console.log(`Thumbnail generated: ${uri}`);
          setThumbnailUri(uri);
        } catch (e) {
          console.warn('Could not generate thumbnail:', e);
          setThumbnailUri(null);
        } finally {
          setIsGeneratingThumbnail(false);
        }
      } else {
        setThumbnailUri(null);
        setIsGeneratingThumbnail(false);
      }
    };

    generateThumbnail();

    // Optional: Cleanup function if thumbnail URI needs revoking (rarely needed for file URIs)
    // return () => {
    //   if (thumbnailUri) { /* Revoke logic */ }
    // };
  }, [selectedFile]); // Re-run effect if selectedFile changes

  // Effect to configure audio mode when preview modal opens/closes
  useEffect(() => {
    const configureAudio = async (shouldPlayInBackground: boolean) => {
      try {
        console.log('Configuring audio mode for playback...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix, // Don't mix with other audio
          playsInSilentModeIOS: true, // <-- Key setting for playing audio even in silent mode
          staysActiveInBackground: shouldPlayInBackground, // If you want playback while app is backgrounded (false for modal)
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: false, // Don't lower volume for notifications
          playThroughEarpieceAndroid: false, // Play through speaker
        });
        console.log('Audio mode configured.');
      } catch (e) {
        console.error('Failed to set audio mode', e);
      }
    };

    if (isPreviewModalVisible) {
      configureAudio(false); // Configure for foreground playback when modal opens
    }
    // Optional: Add logic here to reset audio mode when modal closes if needed
    // else { /* Reset audio mode */ }

  }, [isPreviewModalVisible]);

  // Modal handlers
  const openCustomerModal = () => {
    setModalConfig({
        title: 'Select Customer',
        data: fetchedCustomers, 
        currentSelection: selectedCustomer,
        isLoading: isFetchingCustomers, // Pass loading state
        onSelect: (customer) => {
            console.log(`HomeScreen onSelect called with: ${customer}`);
            // Add to list if it's a new name saved from the modal
            if (!fetchedCustomers.includes(customer)) {
                console.log(`Adding new customer ${customer} to fetchedCustomers list`);
                // Ensure ADD_NEW option stays at the start
                setFetchedCustomers(prev => [
                    ADD_NEW_CUSTOMER_OPTION,
                    // Keep existing items (excluding ADD_NEW if present)
                    ...prev.filter(c => c !== ADD_NEW_CUSTOMER_OPTION),
                    customer // Add the new one
                ].filter((v, i, a) => a.indexOf(v) === i)); // Ensure uniqueness 
            }
            // Select the customer
            if (customer !== selectedCustomer) {
                setSelectedCustomer(customer);
                setSelectedProject(undefined); 
            }
            closeModal(); 
        },
    });
    setIsModalVisible(true);
  };

  const openProjectModal = () => {
    if (!selectedCustomer) return;
    setModalConfig({
        title: 'Select Project',
        data: fetchedProjects,
        currentSelection: selectedProject,
        isLoading: isFetchingProjects,
        onSelect: (project) => {
            // REMOVED check for ADD_NEW_PROJECT_OPTION - modal handles this now
            /*
            if (project === ADD_NEW_PROJECT_OPTION) {
                console.log("Navigating to Add Project Screen");
                navigation.navigate('AddProject', { customer: selectedCustomer });
            } else */
            // This runs for existing selections OR newly saved items from the modal
            console.log(`HomeScreen project onSelect called with: ${project}`);
            // Add to list if it's a new name saved from the modal
            if (!fetchedProjects.filter(p => p !== ADD_NEW_PROJECT_OPTION).includes(project)) {
                 console.log(`Adding new project ${project} to fetchedProjects list`);
                 setFetchedProjects(prev => [
                     ADD_NEW_PROJECT_OPTION, // Keep Add New first
                     // Keep existing items (excluding Add New)
                     ...prev.filter(p => p !== ADD_NEW_PROJECT_OPTION),
                     project // Add the new one
                 ].filter((v, i, a) => a.indexOf(v) === i)); // Ensure uniqueness
            }
            // Select the project
            if (project !== selectedProject) {
                setSelectedProject(project);
            }
            closeModal(); 
        },
    });
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setModalConfig(null);
  };

  // --- Image Picker Logic ---
  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant permission to access the photo library.');
      return;
    }

    // Launch image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Allow only images
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8, // Reduce quality slightly for upload
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      console.log('Image selected:', asset.uri);
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`, // Generate a name if needed
        size: asset.fileSize,
      });
      setThumbnailUri(asset.uri); // For images, thumbnail is the image itself
      setIsPreviewModalVisible(true); // Optionally open preview right away
      setResult({ message: '', type: null, data: null }); // Clear previous result
    }
  };

  // --- Document/Video Picker Logic ---
  async function pickDocument() {
    console.log('Opening document/video picker...');
    setResult({ message: '', type: null, data: null }); // Reset result
    setThumbnailUri(null);
    setIsFileProcessing(true);
    setSelectedFile(null); // Clear previous selection
    setIsPreviewModalVisible(false);

    try {
      // Reset audio mode before picking
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true, // Important for video preview
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      const result = await DocumentPicker.getDocumentAsync({
        // type: ['video/*', 'image/*'], // Allow videos and images
        type: ['video/*'], // Modify to specifically ask for video
        copyToCacheDirectory: true,
      });

      // Log the entire result object for debugging
      console.log('DocumentPicker Result:', JSON.stringify(result, null, 2));

      if (result.canceled) {
        console.log('Document selection cancelled.');
        setIsFileProcessing(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log(`Selected file: Name=${asset.name}, URI=${asset.uri}, Size=${asset.size}, MIMEType=${asset.mimeType}`);

        // Check if the selected file is a video based on MIME type
        if (asset.mimeType && asset.mimeType.startsWith('video/')) {
          setSelectedFile({
            uri: asset.uri,
            name: asset.name,
            size: asset.size,
          });
          // Thumbnail generation is handled by the useEffect hook
        } else {
          // Handle non-video files if necessary, or show an error
          console.warn('Selected file is not a video:', asset.mimeType);
          Alert.alert('Invalid File Type', 'Please select a video file.');
          setSelectedFile(null);
          setThumbnailUri(null);
        }
      } else {
        console.log('No assets found in DocumentPicker result.');
        // Handle cases where assets array is unexpectedly empty
        // Remove legacy fallback for result.uri
        Alert.alert('Error', 'Failed to select a file.');
        setSelectedFile(null);
        setThumbnailUri(null);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Could not pick the document.');
      setSelectedFile(null);
      setThumbnailUri(null);
    } finally {
      setIsFileProcessing(false);
    }
  }

  // --- Delete Logic ---
  const handleDeleteRequest = (type: 'customer' | 'project', name: string) => {
    setItemToDelete({ type, name });
    setIsConfirmDeleteVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !userToken) {
      setIsConfirmDeleteVisible(false);
      return;
    }

    const { type, name } = itemToDelete;
    console.log(`Attempting to delete ${type}: ${name}`);
    setIsConfirmDeleteVisible(false); // Close modal immediately
    setResult({ message: `Deleting ${type} '${name}'...`, type: 'loading' });

    try {
      let url = '';
      if (type === 'customer') {
        url = `${API_BASE_URL}/api/browse-reports?customer=${encodeURIComponent(name)}`;
      } else if (type === 'project' && selectedCustomer) {
        url = `${API_BASE_URL}/api/browse-reports?customer=${encodeURIComponent(selectedCustomer)}&project=${encodeURIComponent(name)}`;
      } else {
        throw new Error("Invalid deletion parameters.");
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Failed to delete ${type}`);
      }

      console.log(`${type} '${name}' deleted successfully.`);
      setResult({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} '${name}' deleted successfully.`, type: 'success' });

      // Refresh the relevant list
      if (type === 'customer') {
        setSelectedCustomer(undefined); // Reset customer selection
        setSelectedProject(undefined);
        loadCustomers(); // Reload customer list
      } else {
        setSelectedProject(undefined); // Reset project selection
        loadProjects(); // Reload project list for the current customer
      }
      setItemToDelete(null);
    } catch (err: any) {
      console.error(`Error deleting ${type}:`, err);
      setResult({ message: `Failed to delete ${type}: ${err.message}`, type: 'error' });
      Alert.alert('Deletion Failed', `Could not delete ${type} '${name}'. ${err.message}`);
      setItemToDelete(null);
    } finally {
        // Maybe small delay before clearing message?
        // setTimeout(() => setResult({ message: '', type: null }), 3000);
    }
  };

  const handleDeleteCancel = () => {
    setIsConfirmDeleteVisible(false);
    setItemToDelete(null);
  };

  async function handleUpload() {
    if (!selectedCustomer || !selectedProject) {
      setResult({ message: 'Please select a customer and project first.', type: 'error' });
      return;
    }
    if (!selectedFile) {
      setResult({ message: 'Please select or record a video file first.', type: 'error' });
      return;
    }
    if (!userToken) {
        setResult({ message: 'Authentication error. Please log out and back in.', type: 'error' });
        return;
    }

    setIsGeneratingReport(true);
    setResult({ message: 'Generating report... ', type: 'loading', data: null });

    const formData = new FormData();
    formData.append('customer', selectedCustomer);
    formData.append('project', selectedProject);
    formData.append('video', {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: 'video/quicktime',
    } as any);

    try {
      console.log('HomeScreen handleUpload: Calling /api/generate-report');
      const response = await fetch(`${API_BASE_URL}/api/generate-report`, {
        method: 'POST',
        body: formData,
        headers: {
           'Accept': 'application/json',
           'Authorization': `Bearer ${userToken}`
        },
      });

      const contentType = response.headers.get('content-type');
      let responseJson: ReportResult | { error: string };
      if (contentType && contentType.indexOf('application/json') !== -1) {
          responseJson = await response.json();
      } else {
          const textResponse = await response.text();
          throw new Error(textResponse || `Report generation failed with status: ${response.status}`);
      }

      if (!response.ok) {
         const errorMessage = (responseJson as { error: string }).error || `Report generation failed: ${response.status}`;
         throw new Error(errorMessage);
      }
       const reportData = responseJson as ReportResult;
       console.log('Report generated:', reportData);
       // Keep loading state briefly before navigation
       // setResult({ message: 'Report Generated Successfully!', type: 'success', data: reportData });
       
       // Navigate directly to the viewer
       navigateToWebViewer(reportData.viewerUrl); 
       
       // Optionally reset file/state *after* scheduling navigation or upon returning
       // setSelectedFile(null);
       // setThumbnailUri(null);

    } catch (error) {
      console.error('Report generation error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult({ message: `Error: ${errorMessage}`, type: 'error', data: null });
    } finally {
      // Set generating false after navigation call (or potentially before)
      setIsGeneratingReport(false);
    }
  }

  function renderResultArea() {
    if (result.type === null || result.type === 'success') return null;

    const resultContainerStyle = [
      styles.resultsContainerBase,
      result.type === 'loading' && styles.resultsContainerLoading,
      result.type === 'error' && styles.resultsContainerError,
    ];

    const resultTextStyle = [
      styles.resultTextBase,
      result.type === 'error' && styles.resultTextError,
      result.type === 'loading' && styles.resultTextLoading,
    ];

    return (
      <View style={resultContainerStyle}>
        <Text style={resultTextStyle}>{result.message}</Text>
        {isGeneratingReport && result.type === 'loading' && (
          <ActivityIndicator size="small" color={colors.textSecondary} style={styles.resultLoadingIndicator} />
        )}
      </View>
    );
  }

  function navigateToEditorFromUrl(url: string | undefined) {
    if (!url) {
        Alert.alert("Navigation Error", "Could not get report URL.");
        return;
    }
    try {
        const parsedUrl = new URL(url);
        const reportKey = parsedUrl.searchParams.get('key');

        if (reportKey) {
            console.log(`Navigating to ReportEditor with extracted key: ${reportKey}`);
            navigation.navigate('BrowseTab', {
              screen: 'ReportEditor',
              params: { reportKey: reportKey }
            });
        } else {
            throw new Error("'key' parameter not found in URL");
        }
    } catch (error) {
        console.error("Error extracting report key from URL:", error, `URL: ${url}`);
        Alert.alert(
            "Navigation Error",
            `Could not process the report URL. Please check the URL format or try browsing for the report.\n\nError: ${error instanceof Error ? error.message : 'Invalid URL'}`,
            [
                { text: "Open Web Link Instead", onPress: () => Linking.canOpenURL(url).then(supported => {
                    if (supported) { Linking.openURL(url); } else { Alert.alert("Cannot open URL", "This link cannot be opened.")}
                }) },
                { text: "OK" }
            ]
        );
    }
  }

  function navigateToWebViewer(url: string | undefined) {
    if (!url) {
        Alert.alert("Navigation Error", "Could not get report URL to view.");
        return;
    }
    // Reset state *before* navigating away
    setSelectedFile(null);
    setThumbnailUri(null);
    setIsFileProcessing(false);
    setIsGeneratingThumbnail(false);
    setResult({ message: '', type: null, data: null }); // Clear results too

    console.log(`Navigating to WebViewer with URL: ${url}`);
    navigation.navigate('BrowseTab', {
      screen: 'WebViewer',
      params: { url: url }
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
       <ScrollView
         contentContainerStyle={styles.scrollContainer}
         keyboardShouldPersistTaps="handled"
         showsVerticalScrollIndicator={false}
       >
            <Text style={styles.title}>Daily Report Generator</Text>
            <Text style={styles.description}>
                Select customer & project, then upload or record a video walkthrough to generate a report.
            </Text>

            <View style={styles.sectionContainer}>
                <Text style={styles.sectionHeaderText}>Details</Text>
                 {fetchError && <Text style={styles.fetchErrorText}>{fetchError}</Text>}

                {/* Restore Original Customer Row */}
                <TouchableOpacity
                    style={[styles.rowContainer, styles.firstRowInSection]}
                    onPress={openCustomerModal}
                    disabled={isFetchingCustomers}
                >
                    <View style={styles.rowIconContainer}>
                        <Ionicons name="business-outline" size={22} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.rowLabel}>Customer</Text>
                    <View style={styles.rowValueContainer}>
                        <Text style={styles.rowValueText} numberOfLines={1}>{isFetchingCustomers ? 'Loading...' : (selectedCustomer || 'Select')}</Text>
                        {isFetchingCustomers ? <ActivityIndicator size="small" color={colors.textSecondary} style={styles.rowSpinner} /> : <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} style={styles.rowChevron} />}
                    </View>
                </TouchableOpacity>

                {/* Project Row - Renders normally */}
                <TouchableOpacity
                    style={[styles.rowContainer, !selectedCustomer && styles.rowDisabled]}
                    onPress={openProjectModal}
                    disabled={!selectedCustomer || isFetchingProjects}
                >
                     <View style={styles.rowIconContainer}>
                         <Ionicons name="folder-outline" size={22} color={!selectedCustomer ? colors.borderLight : colors.textSecondary} />
                     </View>
                    <Text style={[styles.rowLabel, !selectedCustomer && styles.rowLabelDisabled]}>Project</Text>
                    <View style={styles.rowValueContainer}>
                         <Text style={[styles.rowValueText, !selectedCustomer && styles.rowValueDisabled]} numberOfLines={1}>{!selectedCustomer ? 'Select Customer First' : (isFetchingProjects ? 'Loading...' : (selectedProject || 'Select'))}</Text>
                        {isFetchingProjects ? <ActivityIndicator size="small" color={colors.textSecondary} style={styles.rowSpinner} /> : <Ionicons name="chevron-forward" size={22} color={!selectedCustomer ? colors.borderLight : colors.textSecondary} style={styles.rowChevron} />}
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.sectionContainer}>
                <Text style={styles.sectionHeaderText}>Video</Text>
                <View style={styles.uploadSectionContent}>
                    <TouchableOpacity
                      style={[
                        styles.buttonBase,
                        isGeneratingReport && styles.buttonDisabled,
                        { borderTopWidth: borders.widthHairline, borderTopColor: colors.borderLight }
                      ]}
                      onPress={pickDocument}
                      disabled={isGeneratingReport}
                    >
                        <View style={styles.buttonIconContainer}>
                           <Ionicons name="videocam-outline" size={22} color={isGeneratingReport ? colors.textDisabled : colors.textSecondary} />
                        </View>
                        <Text style={[
                            styles.buttonTextBase,
                            isGeneratingReport && styles.buttonTextDisabled
                        ]}>
                            {selectedFile ? 'Change Video File' : 'Select or Record Video'}
                        </Text>
                        <View style={styles.buttonChevronContainer}>
                           <Ionicons name="chevron-forward" size={22} color={isGeneratingReport ? colors.textDisabled : colors.textSecondary} />
                        </View>
                    </TouchableOpacity>

                    {selectedFile && (
                        <TouchableOpacity
                            style={styles.thumbnailContainer}
                            onPress={() => {
                                console.log('Opening preview for video:', JSON.stringify(selectedFile, null, 2));
                                setIsPreviewModalVisible(true);
                            }}
                            disabled={!thumbnailUri && !isFileProcessing}
                        >
                          {thumbnailUri ? (
                              <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImage} resizeMode="cover" />
                          ) : (isFileProcessing || isGeneratingThumbnail) ? (
                              <View style={styles.thumbnailPlaceholder}>
                                 <ActivityIndicator size="small" color={colors.textSecondary} />
                              </View>
                          ) : (
                             <View style={styles.thumbnailPlaceholder}>
                                <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
                             </View>
                          )}
                          <Text style={styles.thumbnailFilenameText} numberOfLines={1} ellipsizeMode="middle">
                              {selectedFile.name}
                          </Text>
                          <View style={styles.playIconOverlay}>
                             <Ionicons name="play-circle-outline" size={24} color="rgba(255, 255, 255, 0.8)" />
                          </View>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.buttonBase,
                            (!selectedFile || !selectedCustomer || !selectedProject || isGeneratingReport) && styles.buttonDisabled,
                            { borderBottomWidth: 0 }
                        ]}
                        onPress={handleUpload}
                        disabled={!selectedFile || !selectedCustomer || !selectedProject || isGeneratingReport}
                    >
                        <View style={styles.buttonIconContainer}>
                           <Ionicons name="document-text-outline" size={22} color={(!selectedFile || !selectedCustomer || !selectedProject || isGeneratingReport) ? colors.textDisabled : colors.textSecondary} />
                        </View>
                        <Text style={[
                            styles.buttonTextBase,
                            !((!selectedFile || !selectedCustomer || !selectedProject || isGeneratingReport)) && { color: colors.textPrimary },
                            (!selectedFile || !selectedCustomer || !selectedProject || isGeneratingReport) && styles.buttonTextDisabled
                        ]}>
                            {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                        </Text>
                        <View style={styles.buttonChevronContainer}>
                            {isGeneratingReport ? (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.textDisabled}
                                />
                            ) : (
                               <Ionicons name="chevron-forward" size={22} color={(!selectedFile || !selectedCustomer || !selectedProject) ? colors.textDisabled : colors.textSecondary} />
                            )}
                        </View>
                    </TouchableOpacity>
                 </View>
            </View>

            {renderResultArea()}
        </ScrollView>

        {modalConfig && (
            <SelectionModal
                isVisible={isModalVisible}
                title={modalConfig.title}
                data={modalConfig.data}
                currentSelection={modalConfig.currentSelection}
                onSelect={modalConfig.onSelect}
                onClose={closeModal}
                isLoading={modalConfig.isLoading}
            />
        )}

        <Modal
             visible={isPreviewModalVisible}
             transparent={true}
             animationType="fade"
             onRequestClose={() => setIsPreviewModalVisible(false)}
         >
            <View style={styles.modalContainer}>
               <View style={styles.videoContainer}>
                 {selectedFile?.uri && (
                    <>
                     <Video
                        ref={videoPlayerRef}
                        source={{ uri: selectedFile.uri }}
                        style={styles.videoPlayer}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        onError={(error) => {
                           console.error('Video playback error string:', error);
                           Alert.alert(
                               "Playback Error",
                               `Sorry, this video could not be played. It might be in an unsupported format or corrupted.\n\nError: ${error}`,
                               [{ text: "OK", onPress: () => setIsPreviewModalVisible(false) }]
                           );
                        }}
                        onFullscreenUpdate={(event) => {
                           // Optional: Handle fullscreen updates if needed
                           console.log('Fullscreen status:', event.fullscreenUpdate);
                        }}
                    />
                    </>
                 )}
               </View>
               <TouchableOpacity style={styles.closeButton} onPress={() => setIsPreviewModalVisible(false)}>
                  <Ionicons name="close-circle" size={36} color={colors.surface} />
               </TouchableOpacity>
            </View>
         </Modal>

        {/* Confirmation Modal for Deletion */} 
        {itemToDelete && (
          <ConfirmationModal
            isVisible={isConfirmDeleteVisible}
            title={`Delete ${itemToDelete.type}?`}
            message={`Are you sure you want to delete the ${itemToDelete.type} '${itemToDelete.name}'? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
            isDestructive={true}
          />
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
      flexGrow: 1,
      paddingVertical: spacing.lg,
  },
  title: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
    lineHeight: typography.lineHeightXL,
    paddingHorizontal: spacing.lg,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeM,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: typography.lineHeightM,
    paddingHorizontal: spacing.lg,
  },
  sectionContainer: {
      marginBottom: spacing.xl,
  },
  sectionHeaderText: {
      paddingBottom: spacing.xs,
      marginBottom: spacing.xxs,
      paddingHorizontal: spacing.lg,
      color: colors.textSecondary,
      fontSize: typography.fontSizeS,
      fontWeight: typography.fontWeightMedium as '500',
      textTransform: 'uppercase',
  },
  rowContainer: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
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
  rowDisabled: {
      opacity: 0.6,
  },
  rowIconContainer: {
      marginRight: spacing.md,
      width: 24,
      alignItems: 'center',
  },
  rowLabel: {
      fontSize: typography.fontSizeM,
      color: colors.textPrimary,
      flexGrow: 1,
      flexShrink: 0,
  },
  rowLabelDisabled: {
      color: colors.textDisabled,
  },
  rowValueContainer: {
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: spacing.sm,
  },
  rowValueText: {
      fontSize: typography.fontSizeM,
      color: colors.textSecondary,
      textAlign: 'right',
      marginRight: spacing.xs,
  },
  rowValueDisabled: {
      color: colors.textDisabled,
      fontStyle: 'italic',
  },
  rowChevron: {
  },
  rowSpinner: {
      marginLeft: spacing.xs, // Add some space for spinner
  },
  fetchErrorText: {
     color: colors.error,
     fontSize: typography.fontSizeS,
     textAlign: 'center',
     paddingVertical: spacing.sm,
     marginHorizontal: spacing.lg,
     fontWeight: typography.fontWeightMedium as '500',
     backgroundColor: colors.errorBg,
     borderRadius: borders.radiusSmall,
     marginBottom: spacing.sm,
     borderWidth: borders.widthThin,
     borderColor: colors.errorBorder,
   },
  uploadSectionContent: {
    backgroundColor: colors.surface,
    borderTopWidth: borders.widthHairline,
    borderTopColor: colors.borderLight,
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: 0,
    marginBottom: spacing.xl,
  },
  buttonBase: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: borders.widthHairline,
      borderBottomColor: colors.borderLight,
      minHeight: 48,
      width: '100%',
      justifyContent: 'space-between',
  },
  buttonDisabled: {
      opacity: 0.6,
  },
  buttonTextBase: {
      fontSize: typography.fontSizeM,
      color: colors.textPrimary,
      flexShrink: 1,
      marginLeft: spacing.md,
  },
  buttonTextDisabled: {
      color: colors.textDisabled,
  },
  buttonIconContainer: {
      width: 24,
      alignItems: 'center',
  },
  buttonChevronContainer: {
      marginLeft: spacing.sm,
  },
  buttonActivityIndicator: {
  },
  thumbnailContainer: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderBottomWidth: borders.widthHairline,
      borderBottomColor: colors.borderLight,
      alignItems: 'center',
      flexDirection: 'row',
  },
  thumbnailImage: {
     width: 60,
     height: 60,
     borderRadius: borders.radiusSmall,
     marginRight: spacing.md,
     backgroundColor: colors.borderLight,
  },
  thumbnailPlaceholder: {
     width: 60,
     height: 60,
     borderRadius: borders.radiusSmall,
     marginRight: spacing.md,
     backgroundColor: colors.surfaceAlt,
     justifyContent: 'center',
     alignItems: 'center',
  },
  thumbnailFilenameText: {
     flex: 1,
     fontSize: typography.fontSizeS,
     color: colors.textSecondary,
     fontStyle: 'italic',
     textAlign: 'left',
  },
  playIconOverlay: {
      position: 'absolute',
      left: spacing.lg + 20,
      top: spacing.sm + 20,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderRadius: 12,
      padding: 2,
   },
  resultsContainerBase: {
      marginTop: 0,
      marginHorizontal: 0,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderTopWidth: borders.widthHairline,
      borderTopColor: colors.borderLight,
      borderBottomWidth: borders.widthHairline,
      borderBottomColor: colors.borderLight,
  },
  resultsContainerLoading: {
      alignItems: 'center',
  },
  resultsContainerError: {
  },
  resultTextBase: {
      fontSize: typography.fontSizeM,
      lineHeight: typography.lineHeightM,
      marginBottom: spacing.sm,
      textAlign: 'left',
  },
  resultTextLoading: {
      color: colors.textSecondary,
      textAlign: 'center',
      fontWeight: typography.fontWeightNormal as 'normal',
  },
  resultTextError: {
      color: colors.error,
      fontWeight: typography.fontWeightNormal as 'normal',
  },
  resultLoadingIndicator: {
      marginTop: spacing.sm,
      alignSelf: 'center',
  },
  modalContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     paddingBottom: 100,
  },
  videoContainer: {
     width: Dimensions.get('window').width * 0.9,
     height: Dimensions.get('window').height * 0.7,
     backgroundColor: colors.background,
     borderRadius: borders.radiusMedium,
     overflow: 'hidden',
     marginBottom: spacing.lg,
  },
  videoPlayer: {
     width: '100%',
     height: '100%',
  },
  closeButton: {
  },
});

export default HomeScreen; 