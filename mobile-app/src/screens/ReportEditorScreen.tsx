import React, { useState, useEffect, useCallback, useContext, useLayoutEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Button,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL, S3_BUCKET_NAME, AWS_REGION } from '../config';
import { useAuth } from '../context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReportEditorScreenProps as NavigationProps } from '../navigation/AppNavigator';


// --- Types (Define structures based on expected report data) ---
interface CompanyInfo {
  name?: string;
  address?: {
    street?: string;
    unit?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  phone?: string;
  website?: string;
}

interface PreparedBy {
  name?: string;
  email?: string;
}

interface ReportMetadata {
  date?: string;
  preparedBy?: PreparedBy;
  companyInfo?: CompanyInfo;
}

interface ReportImage {
  fileName: string;
  caption: string;
  s3Url?: string; // Make s3Url optional as it might be constructed
}

interface MaterialItem {
  materialName: string;
  status: string;
  note: string;
}

interface IssueItem {
  description: string;
  status: 'Open' | 'Resolved' | 'Needs Monitoring';
  impact: string;
  resolution: string;
}

interface ReportData {
  reportMetadata?: ReportMetadata;
  reportAssetsS3Urls?: {
    logoUrl?: string;
    baseUrl?: string;
  };
  narrative?: string;
  workCompleted?: string[];
  issues?: IssueItem[];
  materials?: MaterialItem[];
  safetyObservations?: string;
  nextSteps?: string[];
  images?: ReportImage[];
}

// --- Component ---
export default function ReportEditorScreen({ route, navigation }: NavigationProps): React.ReactElement {
  const { reportKey } = route.params;
  const { userToken } = useAuth(); // Get token for authenticated fetch

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [editedData, setEditedData] = useState<ReportData | null>(null); // State to hold changes
  const [loading, setLoading] = useState<'initial' | 'saving' | 'uploading' | 'removing' | false>('initial');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [imageBaseUrl, setImageBaseUrl] = useState<string>('');

  // Fetch initial data
  useEffect(() => {
    if (!reportKey) {
      setError("Report key is missing. Cannot load report.");
      setLoading(false);
      return;
    }
    if (!userToken) {
      setError("Authentication token not found. Cannot load report.");
      setLoading(false);
      return; // Need token to fetch
    }

    setLoading('initial');
    setError(null);
    setStatusMessage(null);

    // Use the backend endpoint which enforces auth via protect middleware
    const url = `${API_BASE_URL}/api/report?key=${encodeURIComponent(reportKey)}`;
    console.log(`ReportEditor: Fetching data from ${url}`);
    console.log(`ReportEditor: Using raw reportKey: "${reportKey}"`);
    
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${userToken}`, // Include Auth header
            'Accept': 'application/json'
        }
    })
      .then(async response => {
        if (!response.ok) {
          // Attempt to get error message from backend
          let errorMsg = `Failed to load report. Status: ${response.status}`;
           try {
               const err = await response.json();
               errorMsg = err.error || err.message || errorMsg;
           } catch (e) {
               console.error("Could not parse error response", e);
           }
          throw new Error(errorMsg);
        }
        return response.json();
      })
      .then((data: ReportData) => {
        console.log("Report data loaded:", data);
        setReportData(data);
        setEditedData(JSON.parse(JSON.stringify(data))); // Initialize editedData with a deep copy
        setImageBaseUrl(data.reportAssetsS3Urls?.baseUrl || ''); // Uncommented to potentially fix date
      })
      .catch(err => {
        console.error('Error loading report data:', err);
        setError(`Error loading report: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reportKey, userToken]); // Depend on userToken as well


  // --- Edit Handlers ---

  const handleTextChange = (field: keyof ReportData, value: string) => {
    setEditedData(prev => prev ? { ...prev, [field]: value } : null);
    clearStatus();
  };

  const handleListChange = <T extends string | IssueItem | MaterialItem>(
    listField: keyof ReportData,
    index: number,
    itemField: keyof T | null, // null for simple string list items
    value: any // Can be string, or value for IssueItem/MaterialItem fields
  ) => {
    setEditedData(prev => {
      if (!prev) return null;
      const newList = [...(prev[listField] as T[] || [])];
      if (index >= 0 && index < newList.length) {
        if (itemField === null) {
          // Simple string list
          newList[index] = value as T;
        } else {
          // Object list (IssueItem or MaterialItem)
          const currentItem = { ...(newList[index] as object) }; // Clone item
          (currentItem as any)[itemField] = value;
          newList[index] = currentItem as T;
        }
      }
      return { ...prev, [listField]: newList };
    });
    clearStatus();
  };


  const addItemToList = (listField: keyof ReportData, itemType: 'simple' | 'issue' | 'material') => {
    setEditedData(prev => {
      if (!prev) return null;
      const newList = [...(prev[listField] as any[] || [])];
      let newItem: any;
      if (itemType === 'simple') {
        newItem = ''; // Add empty string for simple item
      } else if (itemType === 'issue') {
        newItem = { description: '', status: 'Open', impact: '', resolution: '' };
      } else if (itemType === 'material') {
        newItem = { materialName: '', status: '', note: '' };
      }
      newList.push(newItem);
      return { ...prev, [listField]: newList };
    });
     clearStatus();
  };

  const removeItemFromList = (listField: keyof ReportData, index: number) => {
     Alert.alert(
       "Confirm Removal",
       "Are you sure you want to remove this item?",
       [
         { text: "Cancel", style: "cancel" },
         {
           text: "Remove", style: "destructive", onPress: () => {
             setEditedData(prev => {
               if (!prev) return null;
               const newList = [...(prev[listField] as any[] || [])];
               if (index >= 0 && index < newList.length) {
                 newList.splice(index, 1);
               }
               return { ...prev, [listField]: newList };
             });
             clearStatus();
           }
         }
       ]
     );
  };


  const handleCaptionChange = (index: number, newCaption: string) => {
    setEditedData(prev => {
      if (!prev || !prev.images) return null;
      const newImages = [...prev.images];
      if (index >= 0 && index < newImages.length) {
        newImages[index] = { ...newImages[index], caption: newCaption };
      }
      return { ...prev, images: newImages };
    });
     clearStatus();
  };

  // --- Image Handling ---

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3], // Optional: aspect ratio for editing
      quality: 0.8, // Lower quality for faster uploads (0 to 1)
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
       handleImageUpload(result.assets[0]);
    }
  };

  const handleImageUpload = async (asset: ImagePicker.ImagePickerAsset) => {
      if (!userToken) {
          setStatusMessage({ message: 'Authentication error.', type: 'error' });
          return;
      }
      setLoading('uploading');
      setStatusMessage({ message: 'Uploading image...', type: 'success' });
      
      try {
        // Log upload details for debugging
        console.log('Uploading image:', {
          uri: asset.uri,
          fileName: asset.fileName || `upload_${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize
        });
        
        // For web only path
        if (Platform.OS === 'web') {
          // For web, convert to blob first
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          
          const webFormData = new FormData();
          webFormData.append('reportImage', blob, asset.fileName || 'image.jpg');
          
          console.log('Web FormData created with blob');
          
          // Construct the URL with the report key
          const uploadUrl = `${API_BASE_URL}/api/report-image?key=${encodeURIComponent(reportKey)}`;
          console.log('Upload URL:', uploadUrl);

          const webResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: webFormData,
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${userToken}`,
              // Don't set Content-Type, browser will add the correct multipart boundary
            },
          });

          console.log('Response status:', webResponse.status);
          const responseText = await webResponse.text();
          console.log('Response text:', responseText);
          
          // Parse the response as JSON
          const result = responseText ? JSON.parse(responseText) : {};

          if (!webResponse.ok) {
            throw new Error(result.error || 'Image upload failed');
          }

          // Update local state with the new image list from the response
          if (result.updatedImages) {
              setEditedData(prev => prev ? { ...prev, images: result.updatedImages } : null);
              setReportData(prev => prev ? { ...prev, images: result.updatedImages } : null);
          }
          setStatusMessage({ message: 'Image uploaded successfully!', type: 'success' });
          return; // Exit early for web path
        }
        
        // For native mobile - need different approach
        const formData = new FormData();
        // This is the correct way to append a file in React Native
        formData.append('reportImage', {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || `upload_${Date.now()}.jpg`,
        } as any);
        
        console.log('Native FormData created');
        
        // Construct the URL with the report key
        const uploadUrl = `${API_BASE_URL}/api/report-image?key=${encodeURIComponent(reportKey)}`;
        console.log('Upload URL:', uploadUrl);

        // Create a simplified fetch for debugging
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${userToken}`);
        xhr.setRequestHeader('Accept', 'application/json');
        
        // Set up listeners
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('Upload successful, response:', xhr.responseText);
            try {
              const result = JSON.parse(xhr.responseText);
              if (result.updatedImages) {
                setEditedData(prev => prev ? { ...prev, images: result.updatedImages } : null);
                setReportData(prev => prev ? { ...prev, images: result.updatedImages } : null);
              }
              setStatusMessage({ message: 'Image uploaded successfully!', type: 'success' });
            } catch (parseError) {
              console.error('Error parsing response:', parseError);
              setStatusMessage({ message: 'Upload succeeded but response parsing failed', type: 'error' });
            }
          } else {
            console.error('Upload failed, status:', xhr.status, 'response:', xhr.responseText);
            setStatusMessage({ message: `Upload failed: ${xhr.status} ${xhr.statusText}`, type: 'error' });
          }
          setLoading(false);
        };
        
        xhr.onerror = function() {
          console.error('XHR error occurred');
          setStatusMessage({ message: 'Network error during upload', type: 'error' });
          setLoading(false);
        };
        
        // Send the request
        console.log('Sending XHR request with FormData');
        xhr.send(formData);

      } catch (err: any) {
        console.error('Image upload error:', err);
        setStatusMessage({ message: `Upload failed: ${err.message}`, type: 'error' });
      } finally {
        setLoading(false);
      }
  };


  const handleRemoveImage = (fileName: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to remove image: ${fileName}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
              if (!userToken) {
                  setStatusMessage({ message: 'Authentication error.', type: 'error' });
                  return;
              }
              setLoading('removing');
              setStatusMessage({ message: 'Removing image...', type: 'success' });

              // Construct the URL with report key and file name
              const deleteUrl = `${API_BASE_URL}/api/report-image?key=${encodeURIComponent(reportKey)}&fileName=${encodeURIComponent(fileName)}`;

              try {
                  const response = await fetch(deleteUrl, {
                      method: 'DELETE',
                      headers: {
                          'Accept': 'application/json',
                          'Authorization': `Bearer ${userToken}` // ADD AUTH HEADER
                      }
                  });

                  const result = await response.json();

                  if (!response.ok) {
                      throw new Error(result.error || 'Failed to remove image');
                  }

                  // Update local state with the updated image list from the response
                  if (result.updatedImages) {
                      setEditedData(prev => prev ? { ...prev, images: result.updatedImages } : null);
                      setReportData(prev => prev ? { ...prev, images: result.updatedImages } : null);
                  }
                  setStatusMessage({ message: 'Image removed successfully.', type: 'success' });

              } catch (err: any) {
                  console.error('Image removal error:', err);
                  setStatusMessage({ message: `Removal failed: ${err.message}`, type: 'error' });
              } finally {
                  setLoading(false);
              }
          },
        },
      ]);
  };


  // --- Save Changes ---
  const saveChanges = async () => {
    if (!editedData) {
        setStatusMessage({ message: 'No changes to save.', type: 'error' });
        return;
    }
    if (!userToken) {
        setStatusMessage({ message: 'Authentication error.', type: 'error' });
        return;
    }

    setLoading('saving');
    setStatusMessage(null);
    setError(null);
    
    const saveUrl = `${API_BASE_URL}/api/report?key=${encodeURIComponent(reportKey)}`;
    
    try {
      const response = await fetch(saveUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${userToken}` // ADD AUTH HEADER
        },
        body: JSON.stringify(editedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save changes');
      }

      // Update original reportData state after successful save
      setReportData(JSON.parse(JSON.stringify(editedData))); 
      setStatusMessage({ message: 'Changes saved successfully!', type: 'success' });
      // Optionally navigate back or provide further user feedback
      // navigation.goBack();

    } catch (err: any) {
      console.error('Error saving changes:', err);
      setError(`Save failed: ${err.message}`);
      setStatusMessage({ message: `Save failed: ${err.message}`, type: 'error' }); // Show status too
    } finally {
      setLoading(false);
    }
  };

  const clearStatus = () => {
      setStatusMessage(null);
      setError(null);
  };

  // --- Configure Header Buttons ---
  useLayoutEffect(() => {
    // Construct the viewer URL from the reportKey
    let viewerUrl = '';
    if (reportKey) {
      const keyParts = reportKey.split('/');
      if (keyParts.length > 1) {
          keyParts[keyParts.length - 1] = 'report-viewer.html'; // Replace JSON filename with HTML filename
          const viewerKey = keyParts.join('/');
          // Assuming S3 bucket structure matches config
          viewerUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${viewerKey}`;
          console.log("Editor: Constructed viewer URL for back button:", viewerUrl);
      } else {
          console.warn("Editor: Could not parse reportKey to construct viewer URL:", reportKey);
      }
    }

    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          style={styles.headerBackButtonContainer}
          onPress={() => {
            if (viewerUrl) {
                console.log("Editor: Navigating back to WebViewer with URL:", viewerUrl);
                navigation.navigate('WebViewer', { url: viewerUrl });
            } else {
                console.warn("Editor: No viewer URL, using default goBack()");
                navigation.goBack(); // Fallback if URL construction failed
            }
          }}
          disabled={loading !== false || !viewerUrl} 
        >
          <Ionicons 
            name="chevron-back-outline"
            size={24} 
            color={loading !== false || !viewerUrl ? colors.textDisabled : colors.textPrimary}
          />
          <Text style={styles.headerBackTitle}>Report View</Text> 
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity 
          style={[styles.headerButton, { marginRight: spacing.xs }]} // Add small right margin
          onPress={saveChanges} 
          disabled={loading !== false /* Add check for unchanged data later */} 
        >
          {loading === 'saving' ? (
             <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
             <Ionicons 
               name="save-outline" 
               size={24} 
               color={loading !== false ? colors.textDisabled : colors.textSecondary} 
             />
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, saveChanges, loading, reportKey]); // Added reportKey dependency

  // --- Render Functions (Adjusted for Row Style) ---

  const renderMetadata = () => {
    if (!reportData || !reportData.reportMetadata) return null;
    const meta = reportData.reportMetadata;
    const company = meta.companyInfo || {};
    const prepared = meta.preparedBy || {};
    const logoUrl = reportData.reportAssetsS3Urls?.logoUrl;
    const date = meta.date || imageBaseUrl?.match(/report_(\d{4}-\d{2}-\d{2})/)?.[1] || 'N/A';

    // Safer address string construction
    let addressString = '';
    if (company.address) {
        addressString += company.address.street || '';
        if (company.address.unit) addressString += ` #${company.address.unit}`;
        // Combine city, state, zip safely
        const city = company.address.city || '';
        const state = company.address.state || '';
        const zip = company.address.zip || '';
        const cityStateZipParts = [];
        if (city) cityStateZipParts.push(city);
        if (state) cityStateZipParts.push(state);
        if (zip) cityStateZipParts.push(zip);

        let cityStateZip = '';
        if (cityStateZipParts.length > 0) {
            if (city && state) {
                // Handle comma correctly: City, State Zip
                cityStateZip = `${city}, ${state} ${zip}`.trim();
            } else {
                 // Handle cases with only city/state/zip or combinations without both city and state
                 cityStateZip = cityStateZipParts.join(' ').trim();
            }
        }

        if (addressString && cityStateZip) addressString += '\n'; // Add newline only if both street/unit and city/state/zip exist
        addressString += cityStateZip;
    }

    // Phone and Website string
    let contactString = '';
    const phone = company.phone ? `Phone: ${company.phone}` : '';
    const website = company.website ? `Website: ${company.website}` : '';
    if (phone && website) {
        contactString = `${phone} | ${website}`;
    } else {
        contactString = phone || website; // Use whichever exists, or empty string if neither
    }

    return (
      <View style={styles.metaContainer}>
        {logoUrl && <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />}
        <Text style={styles.mainTitle}>Edit Daily Report</Text>
        <Text style={styles.metaInfo}>Date: {date}</Text>
        <Text style={styles.metaInfo}>Prepared By: {prepared.name || 'N/A'} {prepared.email ? `(${prepared.email})` : ''}</Text>
        {company.name && (
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            {/* Render the constructed address string */} 
            {addressString ? <Text style={styles.metaInfo}>{addressString}</Text> : null}
            {/* Render the constructed contact string */} 
            {contactString ? <Text style={styles.metaInfo}>{contactString}</Text> : null}
          </View>
        )}
      </View>
    );
  };

  // Renders each item in an editable list (simple text, issue, material)
  const renderListItem = (
    listField: keyof ReportData,
    item: any,
    index: number,
    totalItems: number,
    itemType: 'simple' | 'issue' | 'material',
    placeholder: string
  ) => {
    const isFirst = index === 0;
    const isLast = index === totalItems - 1;

    return (
      <View 
        key={`${listField}-${index}`} 
        style={[
          styles.rowContainer, // Base row style
          isFirst && styles.firstRowInSection, // Add top border if first
          // No bottom border needed if rendered inside a section container?
          // isLast && { borderBottomWidth: 0 } 
        ]}
      >
        <View style={styles.rowContentContainer}> 
          {/* Render specific inputs based on type */}
          {itemType === 'simple' && (
            <TextInput
              style={styles.rowInput} // Simplified input style
              value={String(item)}
              onChangeText={(text) => handleListChange(listField, index, null, text)}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              editable={loading === false}
              multiline
            />
          )}
          {itemType === 'material' && (
             <View style={styles.rowMultiInputContainer}>
               <Text style={styles.fieldLabel}>Name:</Text>
               <TextInput style={styles.rowInput} value={item.materialName || ''} onChangeText={(text) => handleListChange<MaterialItem>(listField, index, 'materialName', text)} placeholder="Material Name" placeholderTextColor={colors.textSecondary} editable={loading === false} />
               <Text style={styles.fieldLabel}>Status:</Text>
               <TextInput style={styles.rowInput} value={item.status || ''} onChangeText={(text) => handleListChange<MaterialItem>(listField, index, 'status', text)} placeholder="Status (e.g., Delivered, Installed)" placeholderTextColor={colors.textSecondary} editable={loading === false} />
               <Text style={styles.fieldLabel}>Note:</Text>
               <TextInput style={styles.rowInput} value={item.note || ''} onChangeText={(text) => handleListChange<MaterialItem>(listField, index, 'note', text)} placeholder="Optional Note" placeholderTextColor={colors.textSecondary} editable={loading === false} multiline />
             </View>
          )}
          {itemType === 'issue' && (
            <View style={styles.rowMultiInputContainer}>
               <Text style={styles.fieldLabel}>Description:</Text>
               <TextInput style={styles.rowInput} value={item.description || ''} onChangeText={(text) => handleListChange<IssueItem>(listField, index, 'description', text)} placeholder="Issue Description" placeholderTextColor={colors.textSecondary} editable={loading === false} multiline/>
               <Text style={styles.fieldLabel}>Status:</Text>
               {/* TODO: Implement Picker */} 
               <TextInput style={styles.rowInput} value={item.status || 'Open'} onChangeText={(text) => handleListChange<IssueItem>(listField, index, 'status', text)} placeholder="Open / Resolved / Needs Monitoring" placeholderTextColor={colors.textSecondary} editable={loading === false} />
               <Text style={styles.fieldLabel}>Impact:</Text>
               <TextInput style={styles.rowInput} value={item.impact || ''} onChangeText={(text) => handleListChange<IssueItem>(listField, index, 'impact', text)} placeholder="Impact (Optional)" placeholderTextColor={colors.textSecondary} editable={loading === false} multiline/>
               <Text style={styles.fieldLabel}>Resolution:</Text>
               <TextInput style={styles.rowInput} value={item.resolution || ''} onChangeText={(text) => handleListChange<IssueItem>(listField, index, 'resolution', text)} placeholder="Resolution (Optional)" placeholderTextColor={colors.textSecondary} editable={loading === false} multiline/>
             </View>
          )}
        </View>
         {/* Remove Button - Positioned absolutely or within the row */}
         <TouchableOpacity
           style={styles.removeItemButton} // Adjusted style?
           onPress={() => removeItemFromList(listField, index)}
           disabled={!!loading}
         >
            <Ionicons name="remove-circle-outline" size={24} color={colors.error} />
         </TouchableOpacity>
      </View>
    );
  };

  // Renders the button to add a new item to a list
  const renderAddItemButton = (label: string, listField: keyof ReportData, itemType: 'simple' | 'issue' | 'material') => {
    return (
      <TouchableOpacity
        style={[styles.rowContainer, styles.addItemRow]} // Style as a tappable row
        onPress={() => addItemToList(listField, itemType)}
        disabled={!!loading}
      >
         <Ionicons name="add-circle-outline" size={22} color={colors.primary} style={styles.addRowIcon} />
         <Text style={styles.addRowText}>Add {label.slice(0,-1)}</Text>
         <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  // Renders each image item (preview, caption input, remove button)
  const renderImageItem = (img: ReportImage, index: number, totalItems: number) => {
    const imageUrl = img.s3Url || null; 
    const isFirst = index === 0;
    const isLast = index === totalItems - 1;

    return (
      <View 
        key={img.fileName || index} 
        style={[ 
          styles.rowContainer, // Use row style
          styles.imageItemRow, // Specific padding/style for image row
          isFirst && styles.firstRowInSection, 
        ]}
      >
        <View style={styles.imageItemContent}> 
            {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
                <View style={styles.imagePreviewPlaceholder}>
                    <Ionicons name="image-outline" size={40} color={colors.border} />
                    <Text style={styles.placeholderTextSmall}>Preview unavailable</Text>
                </View>
            )}
            <View style={styles.captionContainer}>
                <Text style={styles.fieldLabel}>Caption:</Text>
                <TextInput
                    style={styles.rowInput} // Use row input style
                    value={img.caption || ''}
                    onChangeText={(text) => handleCaptionChange(index, text)}
                    placeholder="Enter caption..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    editable={loading === false}
                />
            </View>
        </View>
         <TouchableOpacity
             style={styles.removeImageButton} // Specific style for image remove
             onPress={() => handleRemoveImage(img.fileName)}
             disabled={!!loading}
         >
            <Ionicons name="trash-outline" size={22} color={colors.error} />
         </TouchableOpacity>
      </View>
    );
  };

 // Renders the button to trigger image upload
  const renderUploadImageButton = () => {
    return (
      <TouchableOpacity
        style={[styles.rowContainer, styles.addItemRow]} // Style as tappable row
        onPress={pickImage}
        disabled={!!loading}
      >
         <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} style={styles.addRowIcon}/>
         <Text style={styles.addRowText}>Choose & Upload Image</Text>
         {loading === 'uploading' ? (
             <ActivityIndicator size="small" color={colors.textSecondary} />
         ) : (
             <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
         )}
      </TouchableOpacity>
    );
  };

  // --- Main Return (Structure uses Sections and Rows)

  if (loading === 'initial') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Loading Report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !reportData) { // Show fatal error if data couldn't load at all
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
              <Text style={styles.buttonText}>Go Back</Text>
           </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
         {renderMetadata()}

         {/* Status Messages */} 
          {statusMessage && (
             <View style={styles.statusContainer}> 
               <Text style={[styles.statusText, statusMessage.type === 'success' ? styles.statusSuccess : styles.statusError]}>
                 {statusMessage.message}
               </Text>
             </View>
          )}
          {error && !statusMessage && 
            <View style={styles.statusContainer}>
              {/* Ensure error text gets base styles too */}
              <Text style={[styles.statusText, styles.statusError]}>{error}</Text>
            </View> 
          }

         {/* Render sections using row components */} 
         {editedData ? (
             <>
               {/* Narrative Section */} 
               <View style={styles.sectionContainer}>
                 <Text style={styles.sectionHeader}>Narrative</Text>
                 <View style={[styles.rowContainer, styles.firstRowInSection]}> 
                    <TextInput
                      style={styles.rowInput} // Use row input style
                      value={editedData.narrative || ''}
                      onChangeText={(text) => handleTextChange('narrative', text)}
                      placeholder="Enter narrative..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      editable={loading === false}
                    />
                  </View>
               </View>

               {/* Work Completed Section */} 
               <View style={styles.sectionContainer}>
                 <Text style={styles.sectionHeader}>Work Completed</Text>
                 <>
                   {(editedData.workCompleted || []).map((item, index, arr) => 
                      renderListItem('workCompleted', item, index, arr.length, 'simple', 'Describe work completed...')
                   )}
                 </>
                 {renderAddItemButton('Work Completed', 'workCompleted', 'simple')}
               </View>

               {/* Issues Section */} 
               <View style={styles.sectionContainer}>
                 <Text style={styles.sectionHeader}>Issues</Text>
                 <>
                   {(editedData.issues || []).map((item, index, arr) => 
                     renderListItem('issues', item, index, arr.length, 'issue', 'Describe issue...')
                   )}
                 </>
                 {renderAddItemButton('Issues', 'issues', 'issue')}
               </View>

               {/* Materials Section */} 
               <View style={styles.sectionContainer}>
                 <Text style={styles.sectionHeader}>Materials</Text>
                 <>
                   {(editedData.materials || []).map((item, index, arr) => 
                      renderListItem('materials', item, index, arr.length, 'material', 'Material name...')
                   )}
                 </>
                 {renderAddItemButton('Materials', 'materials', 'material')}
               </View>

               {/* Safety Observations Section */} 
               <View style={styles.sectionContainer}>
                 <Text style={styles.sectionHeader}>Safety Observations</Text>
                 <View style={[styles.rowContainer, styles.firstRowInSection]}> 
                    <TextInput
                      style={styles.rowInput}
                      value={editedData.safetyObservations || ''}
                      onChangeText={(text) => handleTextChange('safetyObservations', text)}
                      placeholder="Enter safety observations..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      editable={loading === false}
                    />
                 </View>
               </View>

               {/* Next Steps Section */} 
               <View style={styles.sectionContainer}>
                 <Text style={styles.sectionHeader}>Next Steps</Text>
                 <>
                   {(editedData.nextSteps || []).map((item, index, arr) => 
                     renderListItem('nextSteps', item, index, arr.length, 'simple', 'Describe next step...')
                   )}
                 </>
                 {renderAddItemButton('Next Steps', 'nextSteps', 'simple')}
               </View>

               {/* Images Section */} 
               <View style={styles.sectionContainer}>
                 <Text style={styles.sectionHeader}>Images</Text>
                 <>
                   {(editedData.images || []).map((item, index, arr) => 
                     renderImageItem(item, index, arr.length)
                   )}
                 </>
                 {renderUploadImageButton()}
               </View>
             </>
         ) : (
             !error && <View style={styles.sectionContainer}><Text style={styles.placeholderText}>Report data not available.</Text></View> 
         )}

         <View style={{ height: 60 }} /> {/* Extra bottom padding */} 
      </ScrollView>
    </SafeAreaView>
  );
}


// --- Styles --- (Row-based Refactor)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    // No outer padding, sections handle it?
  },
  centered: { // For loading/error states
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
  },
  errorText: { 
    color: colors.error,
    fontSize: typography.fontSizeM,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: typography.fontWeightBold as '600',
  },
  placeholderText: { // Used when lists are empty
      fontSize: typography.fontSizeS,
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center', 
      paddingVertical: spacing.lg, // Add padding if it's the only thing shown
  },
   placeholderTextSmall: { // Used inside image placeholder
      fontSize: typography.fontSizeXS,
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: spacing.xs,
   },
  metaContainer: { // Container for top metadata
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md, 
  },
  logo: {
    maxHeight: 50, // Slightly smaller logo
    width: '50%',
    marginBottom: spacing.md,
  },
  mainTitle: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold as '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  metaInfo: {
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    lineHeight: typography.lineHeightS,
  },
  companyInfo: {
    marginTop: spacing.md,
  },
  companyName: {
      fontWeight: typography.fontWeightMedium as '500',
      fontSize: typography.fontSizeS,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.xs,
  },
  statusContainer: {
     marginHorizontal: spacing.lg,
     marginBottom: spacing.md, // Space below status
  },
  statusText: { // Base style for status messages (success/error)
      textAlign: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: borders.radiusSmall, // Smaller radius
      fontWeight: typography.fontWeightMedium as '500',
      fontSize: typography.fontSizeXS,
      overflow: 'hidden',
      borderWidth: borders.widthThin,
  },
  statusSuccess: {
      backgroundColor: colors.successBg,
      color: colors.successText,
      borderColor: colors.successBorder,
  },
  statusError: {
      backgroundColor: colors.errorBg,
      color: colors.error,
      borderColor: colors.errorBorder,
  },
  sectionContainer: { // Wrapper for a logical section (Header + Rows)
      marginBottom: spacing.xl, // Space between sections
  },
  sectionHeader: { // Style for the header text of each section
      paddingBottom: spacing.xs,
      marginBottom: spacing.xxs,
      paddingHorizontal: spacing.lg,
      color: colors.textSecondary,
      fontSize: typography.fontSizeS,
      fontWeight: typography.fontWeightMedium as '500',
      textTransform: 'uppercase',
  },
  rowContainer: { // Base style for a row containing inputs or text
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-start', // Align items to top for multiline text
      borderBottomWidth: borders.widthHairline,
      borderBottomColor: colors.borderLight,
      minHeight: 48, 
  },
  firstRowInSection: { // Style applied to the first row in a section
      borderTopWidth: borders.widthHairline,
      borderTopColor: colors.borderLight,
  },
  rowContentContainer: { // Holds the main content (inputs) within a row
     flex: 1, // Take available space
     marginRight: spacing.sm, // Space before remove button
  },
  rowInput: { // Style for TextInput within a row
      fontSize: typography.fontSizeM,
      color: colors.textPrimary,
      paddingVertical: Platform.OS === 'ios' ? 6 : 4, // Minimal vertical padding
      paddingHorizontal: 0, // No horizontal padding, handled by rowContainer
      // Remove background/border, handled by rowContainer
      // backgroundColor: colors.surface, 
      // borderWidth: borders.widthThin, 
      // borderColor: colors.borderLight, 
      // borderRadius: borders.radiusMedium, 
      textAlignVertical: 'top',
  },
  rowMultiInputContainer: { // Container for multiple labeled inputs within one row (e.g., Material/Issue)
     // No specific style needed, just structure
  },
  fieldLabel: { // Label for fields WITHIN a row (e.g., Issue Description)
      fontSize: typography.fontSizeXS,
      fontWeight: typography.fontWeightMedium as '500',
      color: colors.textSecondary, 
      marginBottom: spacing.xxs, // Less space for sub-labels
      marginTop: spacing.xs, // Add some top margin if not the first label
  },
  removeItemButton: { // Button to remove an item from a list (e.g., Issue)
      padding: spacing.sm, // Tap area
      // Position absolutely or adjust layout
      // position: 'absolute', 
      // top: spacing.sm,
      // right: spacing.xs, 
      marginLeft: 'auto', // Push to the right if in row direction
      justifyContent: 'center',
      alignItems: 'center',
  },
  addItemRow: { // Style for the tappable row used to add items
     justifyContent: 'space-between',
     alignItems: 'center', // Center items vertically for add row
     minHeight: 44, // Slightly smaller min height
     paddingVertical: spacing.xs, // Less vertical padding
     borderBottomWidth: 0, // No bottom border typically on add row
  },
  addRowIcon: {
     marginRight: spacing.md,
  },
  addRowText: {
     flex: 1,
     fontSize: typography.fontSizeM,
     color: colors.primary, 
     fontWeight: typography.fontWeightMedium as '500',
  },
  imageItemRow: { // Specific styles for image item rows
     flexDirection: 'column', // Stack image, caption, button vertically
     alignItems: 'stretch', // Stretch items horizontally
     paddingVertical: spacing.md, // More vertical padding
  },
  imageItemContent: {
     // Holds image and caption
     marginBottom: spacing.md, // Space before remove button
  },
  imagePreview: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: borders.radiusSmall,
      backgroundColor: colors.borderLight,
      marginBottom: spacing.md, // Space between preview and caption
  },
  imagePreviewPlaceholder: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: borders.radiusSmall,
      backgroundColor: colors.surfaceAlt,
      borderWidth: borders.widthHairline,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
  },
  captionContainer: {
     // Container for caption label + input
  },
  // captionInput uses rowInput style
  removeImageButton: { // Button specifically for removing an image
      alignSelf: 'flex-end', // Align button to the right
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      // Use error colors
      // backgroundColor: colors.errorBg,
      borderRadius: borders.radiusMedium,
      borderWidth: borders.widthThin,
      borderColor: colors.error,
  },
  removeButtonText: { // Text for remove image button
      color: colors.error,
      fontSize: typography.fontSizeS,
      fontWeight: typography.fontWeightMedium as '500',
      marginLeft: spacing.xs,
  },
  // uploadContainer removed as upload button is rendered via renderUploadImageButton
  uploadActivityContainer: { // Style for upload spinner + text
     flexDirection: 'row',
     alignItems: 'center',
     marginLeft: spacing.sm,
     paddingVertical: spacing.xs,
  },
  uploadActivityText: {
     marginLeft: spacing.xs,
     color: colors.textSecondary,
     fontSize: typography.fontSizeXS,
     fontStyle: 'italic',
  },
  // Uncomment base button styles needed for error state button
  button: { 
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borders.radiusMedium,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, 
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightMedium as '500',
  },
  headerButton: { // Style for header icon buttons
      paddingHorizontal: spacing.sm, // Reduce horizontal padding slightly
      paddingVertical: spacing.xs, 
  },
  headerBackButtonContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingLeft: Platform.OS === 'ios' ? spacing.sm : spacing.md, 
  },
  headerBackTitle: {
    fontSize: typography.fontSizeM,
    color: colors.textPrimary, 
    marginLeft: spacing.xs, 
  }
}); 