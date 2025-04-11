import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Import Ionicons from Expo's vector icons
import Ionicons from '@expo/vector-icons/Ionicons';
import { ParamListBase } from '@react-navigation/native'; // Import ParamListBase if needed, though often inferred
import { colors, typography, borders } from './src/theme/theme'; // <-- Import theme

import HomeScreen from './src/screens/HomeScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReportEditorScreen from './src/screens/ReportEditorScreen';
import WebViewScreen from './src/screens/WebViewScreen'; // Import the WebView screen

const Tab = createBottomTabNavigator();
// const Stack = createStackNavigator(); // Old: Create a stack navigator instance

// --- Define Param List for Stack Navigators ---
type RootStackParamList = {
  HomeStackScreen: undefined; // No params expected for the initial home screen
  BrowseStackScreen: undefined; // No params expected for the initial browse screen
  ReportEditor: { reportKey: string }; // ReportEditor expects a reportKey parameter
  // ReportViewer: { reportKey: string }; // Old viewer type
  WebViewer: { url: string }; // WebViewer expects a URL parameter
  // Add other stack screens here if needed
};

// --- Apply Param List when creating the stack navigator ---
const Stack = createStackNavigator<RootStackParamList>();

// Define icon colors based on focus state - NOW USING THEME
// const activeTabColor = '#007AFF'; // Example active color - REMOVED
// const inactiveTabColor = '#8e8e93'; // Example inactive color - REMOVED

function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap; // Use keyof typeof for type safety

              // Assign modern Ionicons
              if (route.name === 'Home') {
                iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
              } else if (route.name === 'Browse') {
                iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
              } else if (route.name === 'Profile') {
                iconName = focused ? 'person' : 'person-outline';
              } else {
                 iconName = 'alert-circle-outline'; // Default icon
              }

              // You can return any component that you like here!
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: colors.primary, // Use theme color
            tabBarInactiveTintColor: colors.textSecondary, // Use theme color
            headerStyle: {
              backgroundColor: colors.surface, // Use theme color
              borderBottomWidth: borders.widthThin, // Add border
              borderBottomColor: colors.border,   // Use theme border color
              elevation: 0, // Remove shadow on Android
              shadowOpacity: 0, // Remove shadow on iOS
            },
            headerTintColor: colors.textPrimary, // Header text color from theme
            headerTitleStyle: {
              fontWeight: typography.fontWeightBold as '600', // Use theme font weight
              fontSize: typography.fontSizeL,          // Use theme font size
            },
            tabBarStyle: {
                backgroundColor: colors.surface, // Match header or choose another
                borderTopColor: colors.border, // Use theme border color
                borderTopWidth: borders.widthThin, // Add border width
            }
          })}
        >
          <Tab.Screen 
            name="Home" 
            component={HomeStackNavigator}
            options={{
              title: 'Generate Report', 
              headerShown: false
            }} 
          />
          <Tab.Screen 
            name="Browse" 
            component={BrowseStackNavigator}
            options={{
              title: 'Browse Reports', 
              headerShown: false
            }}
          />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// --- Stack Navigators for Tabs ---

function HomeStackNavigator() {
  return (
    <Stack.Navigator
      // screenOptions={{ headerShown: false }} // Optionally hide stack headers too
    >
      <Stack.Screen // No type arguments needed here now
        name="HomeStackScreen" // Use a different name than the tab name
        component={HomeScreen}
        options={{ title: 'Generate Report' }} // Set header title for this screen
      />
      <Stack.Screen // No type arguments needed here now
        name="ReportEditor" // This name matches navigation.navigate calls
        component={ReportEditorScreen}
        options={{ title: 'Edit Report' }} // Set header title for the editor
      />
      <Stack.Screen // No type arguments needed here now
        name="WebViewer" // Use WebViewer name
        component={WebViewScreen} // Use WebViewScreen component
        options={{ title: 'View Report' }} // Keep title or customize
      />
    </Stack.Navigator>
  );
}

function BrowseStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen // No type arguments needed here now
        name="BrowseStackScreen"
        component={BrowseScreen}
        options={{ title: 'Browse Reports' }}
      />
      <Stack.Screen // No type arguments needed here now
        name="ReportEditor"
        component={ReportEditorScreen}
        options={{ title: 'Edit Report' }}
      />
      <Stack.Screen // No type arguments needed here now
        name="WebViewer" // Use WebViewer name
        component={WebViewScreen} // Use WebViewScreen component
        options={{ title: 'View Report' }} // Keep title or customize
      />
    </Stack.Navigator>
  );
}

export default App;
