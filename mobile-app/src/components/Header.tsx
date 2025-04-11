import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { colors, spacing, typography, borders } from '../theme/theme';

// Define styles similar to header.html
const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: borders.widthThin,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    margin: 0,
    fontSize: typography.fontSizeL,
    fontWeight: typography.fontWeightBold as '600',
  },
  nav: {
    flexDirection: 'row',
  },
  link: {
    marginLeft: spacing.md,
    textDecorationLine: 'none',
    color: colors.primary,
  },
});

// Basic Header component structure
// Navigation links won't work yet as navigation isn't set up
function Header(): React.ReactElement {
  // In a real app, these links would use react-navigation
  const handleLinkPress = (url: string) => {
     // For now, just log or use Linking API if they are external links
     // Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
     console.log(`Navigate to: ${url}`); // Placeholder
  };

  return (
    <View style={styles.header}>
      <Text style={styles.title}>Daily Report App</Text>
      <View style={styles.nav}>
        {/* Placeholder links - will need navigation library later */}
        <Text style={styles.link} onPress={() => handleLinkPress('/')}>Home</Text>
        <Text style={styles.link} onPress={() => handleLinkPress('/browse')}>Browse</Text>
        <Text style={styles.link} onPress={() => handleLinkPress('/edit-profile')}>Profile</Text>
      </View>
    </View>
  );
}

export default Header; 