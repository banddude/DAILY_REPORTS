import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders } from '../theme/theme';

// --- Props Interface ---
interface TipsModalProps {
  isVisible: boolean; // Although rendered by parent animation, might be useful internally later
  onClose: () => void;
}

// --- Styles ---
// Migrated and adapted from theme.screens.homeScreen styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    // Removed fixed width/height - parent container controls this
    borderRadius: borders.radiusLarge, // Keep rounding, parent wrapper should have overflow:hidden
    padding: spacing.lg, // Add overall padding
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
  },
  titleText: {
    fontSize: typography.fontSizeL,
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary,
    flex: 1, // Allow title to take space
    textAlign: 'center',
    marginRight: -spacing.lg, // Adjust to center title accounting for close button space
  },
  closeButton: {
    padding: spacing.xs,
  },
  listContainer: {
    // Allow vertical scrolling if content exceeds maxHeight set by parent
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align items to the top
    marginBottom: spacing.md,
  },
  tipIcon: {
    marginRight: spacing.sm,
    marginTop: spacing.xxs, // Align icon slightly better with text start
  },
  tipText: {
    flex: 1, // Take remaining space
    fontSize: typography.fontSizeS, // Make font size smaller
    color: colors.textSecondary,
    lineHeight: typography.lineHeightS, // Adjust line height to match font size
  },
  tipBold: {
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary, // Use primary text color for emphasis
  },
});

// --- Tips Modal Component ---
const TipsModal: React.FC<TipsModalProps> = ({ isVisible, onClose }) => {
  // If not visible (according to parent state), don't render anything
  // This is handled by the parent's mounting logic now, but kept for safety
  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>How to Get the Best Report</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close Tips">
          <Ionicons name="close" size={28} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {/* Use ScrollView in case content overflows maxHeight */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
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
      </ScrollView>
    </View>
  );
};

export default TipsModal; 