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
  AlertButton,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video, ResizeMode, Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useNavigation, useIsFocused, CommonActions } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL, S3_BUCKET_NAME, AWS_REGION } from '../config';
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
  reportJsonKey: string;
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
  mimeType?: string;
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

  // State for tips modal
  const [showTipsModal, setShowTipsModal] = useState(false);

  // Log token value on every render
  console.log(`HomeScreen Render: userToken is ${userToken ? 'present' : 'null'}`);

  // Restore and adapt Fetch customers function
  const loadCustomers = useCallback(async () => {
    if (!userToken) {
      console.log('HomeScreen Customer Effect: No userToken, setting defaults.');
      // Only include ADD_NEW_CUSTOMER_OPTION if no token
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

  // --- Helper Function to process selected asset ---
  const processSelectedAsset = (asset: ImagePicker.ImagePickerAsset | DocumentPicker.DocumentPickerAsset) => {
    console.log('Processing asset:', asset.uri);
    const isImage = asset.mimeType?.startsWith('image/');
    const isVideo = asset.mimeType?.startsWith('video/');

    // Handle type differences for name and size correctly
    const fileName = 'fileName' in asset ? asset.fileName : ('name' in asset ? asset.name : undefined);
    const fileSize = 'fileSize' in asset ? asset.fileSize : ('size' in asset ? asset.size : undefined);
    const mimeType = asset.mimeType;

    setSelectedFile({
      uri: asset.uri,
      name: fileName || `${isImage ? 'image' : isVideo ? 'video' : 'file'}_${Date.now()}.${mimeType?.split('/')[1] || 'tmp'}`,
      size: fileSize,
      mimeType: mimeType,
    });

    if (isImage) {
      setThumbnailUri(asset.uri); // Use image URI directly for thumbnail
    } else if (isVideo) {
      // Thumbnail generation for video is handled by the useEffect hook
    } else {
        Alert.alert('Unsupported File', 'Selected file is not a supported image or video.');
        setSelectedFile(null);
        setThumbnailUri(null);
    }
    setResult({ message: '', type: null, data: null }); // Clear previous result
  };

  // --- Helper for Web Desktop File Picking ---
  const pickWebDesktopFile = () => {
    console.log("Attempting to use hidden input for desktop web file picking.");
    setIsFileProcessing(true); // Indicate processing start
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*'; // Only accept video files
      input.style.display = 'none'; // Keep it hidden

      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          console.log(`Web desktop file selected: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

          // Create an object URL for the preview URI
          const objectUrl = URL.createObjectURL(file);
          // Remember to revoke this URL later if needed, e.g., in a useEffect cleanup or when file changes

          processSelectedAsset({
            uri: objectUrl, // Use object URL for local preview
            name: file.name,
            size: file.size,
            mimeType: file.type,
          });
        } else {
          console.log("Web desktop file selection cancelled or failed.");
        }
        // Clean up the input element
        document.body.removeChild(input);
        setIsFileProcessing(false); // Indicate processing end
      };

      // Append to body temporarily (needed for some browsers) and click
      document.body.appendChild(input);
      input.click();
    } catch (err) {
      console.error("Error setting up web desktop file picker:", err);
      Alert.alert('Error', 'Could not open file picker.');
      setIsFileProcessing(false); // Indicate processing end on error
    }
  };
  // --- End Helper ---

  // --- Media Source Selection ---
  const showMediaSourceOptions = () => {
    // Native options remain the same
    const options: AlertButton[] = [
      { text: 'Photo Library', onPress: () => pickMedia('library', 'video') },
      { text: 'Take Video', onPress: () => pickMedia('camera', 'video') },
      { text: 'Choose File', onPress: () => pickDocumentFile() },
      { text: 'Cancel', style: 'cancel' },
    ];

    // --- Platform Specific Logic ---
    if (Platform.OS === 'web') {
        // Basic check for desktop user agents
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        if (!isMobile) {
            console.log("Desktop web detected, using hidden input.");
            pickWebDesktopFile(); // Directly trigger desktop web picker
        } else {
            console.log("Mobile web detected, using ImagePicker.");
            pickMedia('library', 'video'); // Trigger mobile web picker
        }
    } else {
        // Native: Show the alert with options
        Alert.alert(
          'Select Video Source',
          'How would you like to select the video?',
          options,
          { cancelable: true }
        );
    }
    // --- End Platform Specific Logic ---
  };

  // --- Unified Media Picker Logic (Handles Camera/Library via ImagePicker) ---
  const pickMedia = async (source: 'camera' | 'library', type: 'video') => { // Only video type needed here now
    let hasPermission = false;
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is needed.');
          return;
      }
      hasPermission = true;
    } else { // source === 'library'
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Media Library permission is needed.');
          return;
      }
      hasPermission = true;
    }

    if (!hasPermission) return;

    setResult({ message: '', type: null, data: null });
    setThumbnailUri(null);
    setSelectedFile(null);
    setIsPreviewModalVisible(false);
    setIsFileProcessing(true);

    try {
      let result: ImagePicker.ImagePickerResult | null = null;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'videos',
          allowsEditing: false, // Editing usually not needed for video reports
          quality: 0.8,
        });
      } else { // source === 'library'
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'videos',
          allowsEditing: false,
          quality: 0.8,
        });
      }

      console.log(`${source} ${type} Picker Result:`, JSON.stringify(result, null, 2));

      if (result === null || result.canceled) {
        console.log('Media selection cancelled or failed.');
        setIsFileProcessing(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        // Use the existing helper to set state
        processSelectedAsset(result.assets[0]);
      } else {
        console.log('No assets found in picker result.');
        Alert.alert('Error', 'Failed to select media.');
        setSelectedFile(null);
        setThumbnailUri(null);
      }
    } catch (err) {
      console.error(`Error picking media (${source}/${type}):`, err);
      Alert.alert('Error', `Could not select media. ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSelectedFile(null);
      setThumbnailUri(null);
    } finally {
      setIsFileProcessing(false);
    }
  };

  // --- Document Picker Logic (Handles 'Choose File') ---
  const pickDocumentFile = async () => {
    console.log('[pickDocumentFile] Started.');
    setResult({ message: '', type: null, data: null });
    setThumbnailUri(null);
    setSelectedFile(null);
    setIsPreviewModalVisible(false);
    setIsFileProcessing(true);

    try {
      // Reset audio mode before picking if necessary (optional)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      console.log('[pickDocumentFile] Calling DocumentPicker.getDocumentAsync...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*', // Only allow video selection
        copyToCacheDirectory: true,
      });

      console.log('[pickDocumentFile] DocumentPicker Result: ', JSON.stringify(result, null, 2));

      if (result.canceled) {
        console.log('[pickDocumentFile] Document selection cancelled.');
        setIsFileProcessing(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('[pickDocumentFile] Asset found: ', JSON.stringify(asset, null, 2));
        // Basic check if it seems like a video
        if (asset.mimeType?.startsWith('video/') || asset.name?.match(/\.(mov|mp4|avi|mkv|wmv)$/i)) {
            console.log('[pickDocumentFile] Calling processSelectedAsset...');
            processSelectedAsset(asset);
            console.log('[pickDocumentFile] Returned from processSelectedAsset.');
        } else {
            console.warn('[pickDocumentFile] Selected file via DocumentPicker might not be a video:', asset.mimeType, asset.name);
            Alert.alert('Invalid File Type', 'Please select a valid video file.');
            setSelectedFile(null);
            setThumbnailUri(null);
        }
      } else {
        console.log('[pickDocumentFile] No assets found in DocumentPicker result.');
        Alert.alert('Error', 'Failed to select file.');
        setSelectedFile(null);
        setThumbnailUri(null);
      }
    } catch (err) {
      console.error('[pickDocumentFile] Error picking document:', err);
      Alert.alert('Error', `Could not pick the document. ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSelectedFile(null);
      setThumbnailUri(null);
    } finally {
      console.log('[pickDocumentFile] Finished.');
      setIsFileProcessing(false);
    }
  };

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
    console.log('Generate Report button pressed');
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

    try {
      // --- Platform Specific File Handling --- 
      if (Platform.OS === 'web') {
         console.log('Web platform detected: Fetching blob for URI:', selectedFile.uri);
         const response = await fetch(selectedFile.uri);
         const blob = await response.blob();
         console.log(`Fetched blob: size=${blob.size}, type=${blob.type}`);
         formData.append('video', blob, selectedFile.name);
         console.log('Web: Appended blob to FormData');
      } else {
         // Native platform: append file object as before
         console.log('Native platform detected: Appending file object');
         formData.append('video', {
           uri: selectedFile.uri,
           name: selectedFile.name,
           type: selectedFile.mimeType || 'video/mp4', // Attempt to get mimeType, fallback
         } as any);
         console.log('Native: Appended file object to FormData');
      }
      // --- End Platform Specific File Handling ---

      console.log('HomeScreen handleUpload: Calling /api/generate-report');
      const response = await fetch(`${API_BASE_URL}/api/generate-report`, {
        method: 'POST',
        body: formData,
        headers: {
           'Accept': 'application/json',
           'Authorization': `Bearer ${userToken}`,
           // Content-Type is set automatically by browser/fetch for FormData
        },
      });

      const contentType = response.headers.get('content-type');
      let responseJson: ReportResult | { error: string };
      if (contentType && contentType.indexOf('application/json') !== -1) {
          responseJson = await response.json();
      } else {
          const textResponse = await response.text();
          // Improved error message for non-JSON responses
          throw new Error(textResponse || `Server returned non-JSON response with status: ${response.status}`);
      }

      if (!response.ok) {
         const errorMessage = (responseJson as { error: string }).error || `Report generation failed: ${response.status}`;
         throw new Error(errorMessage);
      }
       const reportData = responseJson as ReportResult;
       console.log('Report generated, JSON key:', reportData.reportJsonKey);
       navigateToWebViewer(reportData.reportJsonKey); 

    } catch (error) {
      console.error('Report generation error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Provide more specific error feedback to the user
      setResult({ message: `Upload/Generation Failed: ${errorMessage}`, type: 'error', data: null });
    } finally {
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

  function navigateToWebViewer(reportJsonKey: string | undefined) {
    if (!reportJsonKey) {
        Alert.alert("Navigation Error", "Could not get report JSON key to construct viewer URL.");
        return;
    }

    // Construct the direct public S3 URL for the viewer HTML
    if (!S3_BUCKET_NAME || !AWS_REGION) {
        console.error("S3 bucket name or region is missing in config!");
        Alert.alert("Configuration Error", "Cannot construct report viewer URL.");
        return;
    }
    const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/'));
    const viewerS3Key = `${reportBaseKey}/report-viewer.html`;
    const viewerS3Url = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${viewerS3Key}`;

    console.log(`Constructed direct S3 viewer URL: ${viewerS3Url}`);

    // --- Initiate Navigation FIRST ---
    console.log(`Navigating to BrowseTab -> WebViewer with URL: ${viewerS3Url}`);
    navigation.navigate('MainAppTabs', {
      screen: 'BrowseTab',
      params: { // Navigate to WebViewer within BrowseTab
        screen: 'WebViewer',
        params: { url: viewerS3Url } // Pass the direct S3 URL
      }
    });

    // --- Reset State AFTER Navigation Call ---
    // Reset state *after* navigating away
    setSelectedFile(null);
    setThumbnailUri(null);
    setIsFileProcessing(false);
    setIsGeneratingThumbnail(false);
    setResult({ message: '', type: null, data: null }); // Clear results too

    // Extract customer and project from the URL (keep this for potential context)
    let customer: string | null = null;
    let project: string | null = null;
    try {
      const urlObj = new URL(viewerS3Url);
      const segments = urlObj.pathname.split('/').filter(Boolean);
      // users/{userId}/{customer}/{project}/{reportFolder}/report-viewer.html
      if (segments.length >= 5) {
        customer = segments[2];
        project = segments[3];
      }
    } catch (e) {
      console.warn("Could not extract customer/project from URL", e);
    }
  }

  // Debug log for button state
  console.log('Button disabled:', !selectedFile, !selectedCustomer, selectedCustomer === ADD_NEW_CUSTOMER_OPTION, !selectedProject, selectedProject === ADD_NEW_PROJECT_OPTION, isGeneratingReport);

  return (
    <SafeAreaView style={styles.safeArea}>
       <ScrollView
         contentContainerStyle={styles.scrollContainer}
         keyboardShouldPersistTaps="handled"
         showsVerticalScrollIndicator={false}
       >
            <View style={styles.headerRow}>
              <Text style={styles.title}>Daily Report Generator</Text>
              <TouchableOpacity onPress={() => setShowTipsModal(true)} style={styles.tipsButton} accessibilityLabel="How to Get the Best Report">
                <Ionicons name="help-circle-outline" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.description}>
                Select customer & project, then upload or record a video walkthrough to generate a report.
            </Text>

            {/* --- Tips Modal --- */}
            <Modal
              visible={showTipsModal}
              animationType="slide"
              transparent
              onRequestClose={() => setShowTipsModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.tipsModalContainer}>
                  <View style={styles.tipsModalHeader}>
                    <Text style={styles.tipsModalTitle}>How to Get the Best Report</Text>
                    <TouchableOpacity onPress={() => setShowTipsModal(false)} style={styles.tipsModalCloseButton} accessibilityLabel="Close Tips">
                      <Ionicons name="close" size={28} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tipsList}>
                    <View style={styles.tipRow}>
                      <Ionicons name="mic-outline" size={22} color={colors.primary} style={styles.tipIcon} />
                      <Text style={styles.tipText}><Text style={styles.tipBold}>Speak Clearly:</Text> Enunciate near your device's mic. The AI transcribes exactly what it hears.</Text>
                    </View>
                    <View style={styles.tipRow}>
                      <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} style={styles.tipIcon} />
                      <Text style={styles.tipText}><Text style={styles.tipBold}>Verbalize Everything:</Text> Mention details, observations, measurements, and even the desired tone or sections for your report (e.g., "In the summary, mention that the framing is complete."). The AI uses your words to write the report.</Text>
                    </View>
                    <View style={styles.tipRow}>
                      <Ionicons name="camera-outline" size={22} color={colors.primary} style={styles.tipIcon} />
                      <Text style={styles.tipText}><Text style={styles.tipBold}>Steady Camera for Images:</Text> The AI selects images based on your speech timestamps. When describing something you want a picture of, <Text style={styles.tipBold}>hold the camera steady on the subject for a few seconds while speaking about it.</Text></Text>
                    </View>
                    <View style={styles.tipRow}>
                      <Ionicons name="sunny-outline" size={22} color={colors.primary} style={styles.tipIcon} />
                      <Text style={styles.tipText}><Text style={styles.tipBold}>Good Lighting & Minimal Noise:</Text> Ensure the environment is well-lit and reasonably quiet for best results.</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Modal>
            {/* ------------------- */}

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
                <Text style={styles.sectionHeaderText}>MEDIA</Text>
                <TouchableOpacity
                  style={[
                    styles.buttonBase,
                    isGeneratingReport && styles.buttonDisabled,
                    { borderTopWidth: borders.widthHairline, borderTopColor: colors.borderLight }
                  ]}
                  onPress={showMediaSourceOptions}
                  disabled={isGeneratingReport || isFileProcessing}
                >
                  <View style={styles.buttonIconContainer}>
                    {selectedFile ? (
                      <Ionicons name="checkmark-circle-outline" size={22} color="#222" />
                    ) : (
                      <Ionicons name="add-circle-outline" size={22} color="#222" />
                    )}
                  </View>
                  <Text style={[styles.buttonTextBase, (isGeneratingReport || isFileProcessing) && styles.buttonTextDisabled]}>
                    {/* Conditional Text */}
                    {selectedFile ? 'Change Media' : 'Choose Media'}
                  </Text>
                  <View style={styles.buttonChevronContainer}>
                    {isFileProcessing ? <ActivityIndicator size="small" color="#888" /> : <Ionicons name="chevron-forward" size={22} color="#888" />} 
                  </View>
                </TouchableOpacity>

                {/* Only show the thumbnail, no filename, with play icon and X button */}
                {selectedFile && !isGeneratingThumbnail && (
                  <View style={styles.thumbnailPreviewWrapper}>
                    <TouchableOpacity onPress={() => setIsPreviewModalVisible(true)}>
                      <View style={styles.thumbnailPreviewContainer}>
                        <Image source={{ uri: thumbnailUri || '' }} style={styles.thumbnailPreviewImage} />
                        <Ionicons name="play-circle" size={40} color="#222" style={styles.thumbnailPlayIcon} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.thumbnailRemoveButton}
                      onPress={() => { setSelectedFile(null); setThumbnailUri(null); }}
                      accessibilityLabel="Remove selected media"
                    >
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
            </View>

            {/* --- Generate Report Button --- */}
            <TouchableOpacity
                style={[
                    styles.generateButton,
                    (!selectedFile || !selectedCustomer || selectedCustomer === ADD_NEW_CUSTOMER_OPTION || !selectedProject || selectedProject === ADD_NEW_PROJECT_OPTION || isGeneratingReport) && styles.disabledButton,
                ]}
                onPress={handleUpload}
                // disabled={!selectedFile || !selectedCustomer || selectedCustomer === ADD_NEW_CUSTOMER_OPTION || !selectedProject || selectedProject === ADD_NEW_PROJECT_OPTION || isGeneratingReport} // TEMPORARILY REMOVED FOR DEBUGGING
            >
                {isGeneratingReport ? (
                    <ActivityIndicator color={colors.textPrimary} />
                ) : (
                    <Text style={styles.generateButtonText}>Generate Report</Text>
                )}
            </TouchableOpacity>

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
          <SafeAreaView style={styles.previewModalSafeArea}>
            <View style={styles.previewModalOverlay}>
              <View style={styles.previewModalContent}>
                {selectedFile?.uri && (
                  <Video
                    ref={videoPlayerRef}
                    source={{ uri: selectedFile.uri }}
                    style={styles.previewVideoPlayer}
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
                )}
                <TouchableOpacity
                  style={styles.previewModalCloseButton}
                  onPress={() => setIsPreviewModalVisible(false)}
                  accessibilityLabel="Close preview"
                >
                  <Ionicons name="close" size={32} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
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

        {isGeneratingReport && (
          <View style={styles.loadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Generating report…</Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borders.radiusMedium,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: borders.radiusSmall,
    backgroundColor: colors.borderLight,
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: borders.radiusSmall,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xs,
  },
  thumbnailPlaceholderText: {
      fontSize: typography.fontSizeXS,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xxs,
  },
  thumbnailInfoContainer: {
      flex: 1,
      marginLeft: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  thumbnailFileName: {
    fontSize: typography.fontSizeS,
    color: colors.textPrimary,
    fontWeight: typography.fontWeightMedium as '500',
    flexShrink: 1, // Allow text to shrink
    marginRight: spacing.xs, // Space before clear button
  },
  thumbnailClearButton: {
     padding: spacing.xs,
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
  generateButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    minHeight: 44,
    borderTopWidth: borders.widthHairline,
    borderBottomWidth: borders.widthHairline,
    borderTopColor: colors.borderLight,
    borderBottomColor: colors.borderLight,
  },
  disabledButton: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: typography.fontWeightNormal as 'normal',
  },
  // --- Instruction Styles ---
  instructionsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface, 
    borderRadius: borders.radiusMedium,
    padding: spacing.md,
    marginBottom: spacing.lg, // Space before the next section
    borderWidth: borders.widthThin,
    borderColor: colors.borderLight,
  },
  instructionsIcon: {
    marginRight: spacing.sm,
    marginTop: 1, // Align icon slightly better
  },
  instructionsTextContainer: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: typography.fontSizeS,
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  instructionsText: {
    fontSize: typography.fontSizeS-1, // Slightly smaller
    lineHeight: typography.lineHeightS,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  instructionsBold: {
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary, // Make bold parts stand out more
  },
  // -------------------------
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  tipsButton: {
    padding: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsModalContainer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borders.radiusMedium,
    width: Dimensions.get('window').width * 0.9,
    maxHeight: Dimensions.get('window').height * 0.9,
  },
  tipsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  tipsModalTitle: {
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary,
  },
  tipsModalCloseButton: {
    padding: spacing.sm,
  },
  tipsList: {
    marginBottom: spacing.lg,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tipIcon: {
    marginRight: spacing.sm,
  },
  tipText: {
    flex: 1,
  },
  tipBold: {
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  mediaCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  mediaThumbnailWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: colors.borderLight,
  },
  playIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    padding: 2,
    zIndex: 2,
  },
  mediaFileName: {
    fontSize: typography.fontSizeS,
    color: colors.textPrimary,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 120,
  },
  previewModalSafeArea: {
    flex: 1,
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalContent: {
    width: '90%',
    maxWidth: 400,
    aspectRatio: 9/16,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  previewVideoPlayer: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#000',
  },
  previewModalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbnailPreviewWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
    position: 'relative',
  },
  thumbnailPreviewContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  thumbnailPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  thumbnailPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    opacity: 0.8,
  },
  thumbnailRemoveButton: {
    position: 'absolute',
    top: 4,
    right: '25%',
    backgroundColor: '#222',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default HomeScreen; 