import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';

// --- Types (Reusing types similar to ReportEditorScreen) ---
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
  s3Url?: string;
}

interface MaterialItem {
  materialName: string;
  status: string;
  note: string;
}

interface IssueItem {
  description: string;
  status: 'Open' | 'Resolved' | 'Needs Monitoring' | string; // Allow string for flexibility
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

// Type for navigation props
type ReportViewerScreenProps = {
  route: {
    params: {
      reportKey: string;
    };
  };
  navigation: any; // Replace with specific navigation type
};

// --- Configuration ---
// TODO: Move to config.ts or environment variables
// const API_BASE_URL = 'https://reports.shaffercon.com'; // <-- REMOVE THIS LINE

// --- Component ---
export default function ReportViewerScreen({ route, navigation }: ReportViewerScreenProps): React.ReactElement {
  const { reportKey } = route.params;

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageBaseUrl, setImageBaseUrl] = useState<string>('');

  useEffect(() => {
    if (!reportKey) {
      setError("Report key is missing. Cannot load report.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/api/report?key=${encodeURIComponent(reportKey)}`)
      .then(async response => {
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: `HTTP error! Status: ${response.status}` }));
          throw new Error(err.error || `Failed to load report. Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: ReportData) => {
        console.log("Report viewer data loaded:", data);
        setReportData(data);
        setImageBaseUrl(data.reportAssetsS3Urls?.baseUrl || '');
      })
      .catch(err => {
        console.error('Error loading report data for viewer:', err);
        setError(`Error loading report: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reportKey]);

  // --- Helper Functions ---
  const openLink = async (url: string | undefined) => {
      if (!url) return;
      const prefixedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
      try {
          const supported = await Linking.canOpenURL(prefixedUrl);
          if (supported) {
            await Linking.openURL(prefixedUrl);
          } else {
            Alert.alert("Cannot Open Link", `Don't know how to open this URL: ${prefixedUrl}`);
          }
      } catch (error) {
           Alert.alert("Error", `Could not open link: ${error}`);
      }
  };

  const getImageUrl = (img: ReportImage): string | null => {
      if (img.s3Url) return img.s3Url;
      if (imageBaseUrl && img.fileName) {
          const base = imageBaseUrl.endsWith('/') ? imageBaseUrl : imageBaseUrl + '/';
          return `${base}extracted_frames/${img.fileName}`;
      }
      return null; // Cannot determine URL
  };

  // --- Render Functions ---

  const renderMetadata = () => {
    if (!reportData || !reportData.reportMetadata) return null;
    const meta = reportData.reportMetadata;
    const company = meta.companyInfo || {};
    const prepared = meta.preparedBy || {};
    const address = company.address || {};
    const logoUrl = reportData.reportAssetsS3Urls?.logoUrl;
    const date = meta.date || imageBaseUrl?.match(/report_(\d{4}-\d{2}-\d{2})/)?.[1] || 'N/A';

    return (
      <View style={styles.header}>
        {logoUrl && <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />}
        <Text style={styles.mainTitle}>Daily Report</Text>
        <Text style={styles.metaInfo}>Date: {date}</Text>
        <Text style={styles.metaInfo}>Prepared By: {prepared.name || 'N/A'} {prepared.email ? `(${prepared.email})` : ''}</Text>
        {company.name && (
          <View style={styles.companyInfoContainer}>
            <Text style={styles.companyName}>{company.name}</Text>
            {address.street && (
              <Text style={styles.metaInfo}>
                {address.street}{address.unit ? ` #${address.unit}` : ''}
              </Text>
            )}
            {(address.city || address.state || address.zip) && (
                 <Text style={styles.metaInfo}>
                     {address.city}
                     {address.city && address.state ? <Text>, </Text> : ''}
                     {`${address.state || ''} ${address.zip || ''}`.trim()}
                 </Text>
            )}
             {(company.phone || company.website) && (
                 <Text style={styles.metaInfo}>
                    {company.phone ? `Phone: ${company.phone}` : ''}
                    {company.phone && company.website ? <Text> | </Text> : ''}
                    {company.website ? <Text onPress={() => openLink(company.website)} style={styles.link}>Website</Text> : ''}
                 </Text>
             )}
          </View>
        )}
      </View>
    );
  };

  const renderSection = (title: string, content: string | undefined | null) => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionText}>{content || 'N/A'}</Text>
      </View>
    );
  };

  const renderListSection = (title: string, items: string[] | undefined | null) => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <View key={`${title}-${index}`} style={styles.listItem}>
                 <Text style={styles.bullet}>•</Text>
                 <Text style={styles.listItemText}>{item || 'N/A'}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.sectionText}>None reported.</Text>
        )}
      </View>
    );
  };

  const renderMaterialsList = (items: MaterialItem[] | undefined | null) => {
     return (
       <View style={styles.section}>
         <Text style={styles.sectionTitle}>Materials</Text>
         {items && items.length > 0 ? (
           items.map((item, index) => (
             <View key={`material-${index}`} style={styles.listItem}>
               <Text style={styles.bullet}>•</Text>
               <Text style={styles.listItemText}>
                 {item.materialName || 'N/A'}
                 {item.status ? ` (${item.status})` : ''}
                 {item.note ? `: ${item.note}` : ''}
               </Text>
             </View>
           ))
         ) : (
           <Text style={styles.sectionText}>None reported.</Text>
         )}
       </View>
     );
   };

  const renderIssuesList = (items: IssueItem[] | undefined | null) => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issues</Text>
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <View key={`issue-${index}`} style={styles.issueItem}>
               <Text style={styles.issueText}>
                   <Text style={styles.issueStatus}>[{item.status || 'Unknown'}]</Text>
                   <Text> {item.description || 'N/A'}</Text>
               </Text>
               {item.impact ? <Text style={styles.issueDetail}>Impact: {item.impact}</Text> : null}
               {item.resolution ? <Text style={styles.issueDetail}>Resolution: {item.resolution}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.sectionText}>None reported.</Text>
        )}
      </View>
    );
  };

  const renderImageGallery = () => {
    const images = reportData?.images || [];
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Images</Text>
        {images.length > 0 ? (
          <View style={styles.imageGallery}>
            {images.map((img, index) => {
              const imageUrl = getImageUrl(img);
              return (
                <View key={img.fileName || index} style={styles.imageItem}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.imagePreview}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.imagePlaceholder}>[Image Missing]</Text>
                  )}
                  <Text style={styles.caption}>{img.caption || 'No caption'}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.sectionText}>No images included.</Text>
        )}
      </View>
    );
  };

  // --- Main Return ---

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={styles.loadingText}>Loading Report...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        {/* Optionally add a back button */} 
      </SafeAreaView>
    );
  }

  if (!reportData) {
      return (
        <SafeAreaView style={styles.centeredContainer}>
          <Text style={styles.errorText}>Report data could not be loaded.</Text>
        </SafeAreaView>
      );
  }


  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container}>
        {renderMetadata()}
        {renderSection('Narrative', reportData.narrative)}
        {renderListSection('Work Completed', reportData.workCompleted)}
        {renderIssuesList(reportData.issues)}
        {renderMaterialsList(reportData.materials)}
        {renderSection('Safety Observations', reportData.safetyObservations)}
        {renderListSection('Next Steps', reportData.nextSteps)}
        {renderImageGallery()}
        <View style={{ height: 40 }} /> {/* Bottom padding */}
      </ScrollView>
    </SafeAreaView>
  );
}


// --- Styles (Adapted from report-viewer.html) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    // Simulates the max-width and margin:auto from web, roughly
    // On larger screens (tablets) you might want conditional styling
    alignSelf: 'center',
    width: '100%', 
    maxWidth: 900, 
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
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
    fontWeight: typography.fontWeightBold as '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: borders.widthThin,
    borderBottomColor: colors.border,
  },
  logo: {
    maxHeight: 60,
    width: 200, // Fixed width for logo
    marginBottom: spacing.md,
  },
  mainTitle: {
    fontSize: typography.fontSizeXXL,
    fontWeight: typography.fontWeightBold as '600',
    color: colors.textPrimary,
    marginVertical: spacing.xs,
  },
  metaInfo: {
    fontSize: typography.fontSizeXS,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    lineHeight: typography.lineHeightS,
  },
  companyInfoContainer: {
    marginTop: spacing.sm,
  },
  companyName: {
      fontWeight: typography.fontWeightMedium as '500',
      fontSize: typography.fontSizeS,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.xs,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.fontSizeL,
    fontWeight: typography.fontWeightBold as '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: borders.widthThin,
    borderBottomColor: colors.border,
  },
  sectionText: {
      fontSize: typography.fontSizeM,
      color: colors.textPrimary,
      lineHeight: typography.lineHeightM,
  },
  listItem: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
      paddingLeft: spacing.xs,
  },
  bullet: {
      marginRight: spacing.sm,
      color: colors.primary,
      fontWeight: typography.fontWeightBold as '600',
      fontSize: typography.fontSizeM,
      lineHeight: typography.lineHeightM,
  },
  listItemText: {
      flex: 1,
      fontSize: typography.fontSizeM,
      color: colors.textPrimary,
      lineHeight: typography.lineHeightM,
  },
  issueItem: {
      backgroundColor: colors.surfaceAlt,
      padding: spacing.md,
      borderRadius: borders.radiusMedium,
      borderWidth: borders.widthThin,
      borderColor: colors.border,
      marginBottom: spacing.sm,
  },
  issueText: {
      fontSize: typography.fontSizeM,
      lineHeight: typography.lineHeightS,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
  },
  issueStatus: {
      fontWeight: typography.fontWeightBold as '600',
  },
  issueDetail: {
      fontSize: typography.fontSizeXS,
      color: colors.textSecondary,
      marginLeft: spacing.sm,
      fontStyle: 'italic',
      marginTop: spacing.xs,
  },
  imageGallery: {
    // Using flex wrap to simulate grid - simpler for varying image sizes
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  imageItem: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: borders.widthThin,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: borders.radiusMedium,
    // Calculate width - approx 2 columns with gap
    // Adjust this based on desired layout and screen size
    width: '47%', // Roughly 2 columns with gap
    marginBottom: spacing.md,
    alignItems: 'center', 
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 4 / 3, // Maintain aspect ratio
    marginBottom: spacing.sm,
    borderRadius: borders.radiusSmall,
    backgroundColor: colors.border,
  },
  imagePlaceholder: {
      fontSize: typography.fontSizeXS,
      color: colors.error,
      fontStyle: 'italic',
      textAlign: 'center',
      marginVertical: spacing.lg,
  },
  caption: {
    fontSize: typography.fontSizeXS,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
}); 