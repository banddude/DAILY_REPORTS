import React, { useLayoutEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Button, Platform } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams, getFocusedRouteNameFromRoute, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';
import BrowseScreen from '../screens/BrowseScreen';
import ReportViewerScreen from '../screens/ReportViewerScreen';
import ReportEditorScreen from '../screens/ReportEditorScreen';
import WebViewerScreen from '../screens/WebViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditSystemPromptScreen from '../screens/EditSystemPromptScreen';
import EditReportSchemaScreen from '../screens/EditReportSchemaScreen';
import EditNameScreen from '../screens/EditNameScreen';
import EditEmailScreen from '../screens/EditEmailScreen';
import EditPhoneScreen from '../screens/EditPhoneScreen';
import EditCompanyNameScreen from '../screens/EditCompanyNameScreen';
import EditCompanyPhoneScreen from '../screens/EditCompanyPhoneScreen';
import EditCompanyWebsiteScreen from '../screens/EditCompanyWebsiteScreen';
import EditAddressScreen from '../screens/EditAddressScreen';
import EditLogoScreen from '../screens/EditLogoScreen';
import ProjectReportsScreen from '../screens/ProjectReportsScreen';
import EditChatModelScreen from '../screens/EditChatModelScreen';
import EditWhisperModelScreen from '../screens/EditWhisperModelScreen';
import { colors, spacing, typography, borders } from '../theme/theme';

// --- Define Param Lists ---

// Params for screens in the Auth stack
export type AuthStackParamList = {
  Login: undefined; // No params expected
  SignUp: undefined; // No params expected
};

// Params for screens in the Home stack (inside the main tabs)
export type HomeStackParamList = {
  HomeBase: { // Keep params HomeBase might receive (though not from SelectionScreen anymore)
      selectedCustomer?: string;
      selectedProject?: string;
  } | undefined;
  // SelectionScreen REMOVED from here
};

// Params for screens in the Browse stack (inside the main tabs)
export type BrowseStackParamList = {
  BrowseBase: undefined; // Removed params as selection is inline
  ReportViewer: { reportKey: string };
  WebViewer: { url: string };
  ReportEditor: { reportKey: string };
  ProjectReports: { customer: string; project: string };
};

// New Stack for Profile/Settings Tab
export type ProfileStackParamList = {
  ProfileBase: undefined;
  EditSystemPrompt: undefined; // Screen to edit the system prompt
  EditReportSchema: undefined; // Screen to edit the JSON schema
  EditName: undefined;
  EditEmail: undefined;
  EditPhone: undefined;
  EditCompanyName: undefined;
  EditCompanyPhone: undefined;
  EditCompanyWebsite: undefined;
  EditAddress: undefined;
  EditLogo: { currentLogoUrl: string | null }; // Add EditLogo screen with param
  EditChatModel: undefined;
  EditWhisperModel: undefined;
};

// Params for the main bottom tabs themselves
export type MainTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>; // Nested stack
  BrowseTab: NavigatorScreenParams<BrowseStackParamList>; // Nested stack
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>; // Use ProfileStack
};

// Define screen prop types based on param lists (optional but good practice)
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type SignUpScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;
export type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'HomeBase'>;
export type BrowseScreenProps = NativeStackScreenProps<BrowseStackParamList, 'BrowseBase'>;
export type ReportViewerScreenProps = NativeStackScreenProps<BrowseStackParamList, 'ReportViewer'>;
export type WebViewerScreenProps = NativeStackScreenProps<BrowseStackParamList, 'WebViewer'>;
export type ReportEditorScreenProps = NativeStackScreenProps<BrowseStackParamList, 'ReportEditor'>;
export type ProfileScreenProps = NativeStackScreenProps<ProfileStackParamList, 'ProfileBase'>;
export type EditSystemPromptScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditSystemPrompt'>;
export type EditReportSchemaScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditReportSchema'>;
export type EditNameScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditName'>;
export type EditEmailScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditEmail'>;
export type EditPhoneScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditPhone'>;
export type EditCompanyNameScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditCompanyName'>;
export type EditCompanyPhoneScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditCompanyPhone'>;
export type EditCompanyWebsiteScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditCompanyWebsite'>;
export type EditAddressScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditAddress'>;
export type EditLogoScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditLogo'>;
export type ProjectReportsScreenProps = NativeStackScreenProps<BrowseStackParamList, 'ProjectReports'>;
export type EditChatModelScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditChatModel'>;
export type EditWhisperModelScreenProps = NativeStackScreenProps<ProfileStackParamList, 'EditWhisperModel'>;

// Define Root Stack including Auth and Main App
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainAppTabs: NavigatorScreenParams<MainTabsParamList>;
};

// Define Stack Navigators
const RootStack = createNativeStackNavigator<RootStackParamList>(); // Root stack
const AuthNavStack = createNativeStackNavigator<AuthStackParamList>(); // Auth stack
const HomeNavStack = createNativeStackNavigator<HomeStackParamList>();
const BrowseNavStack = createNativeStackNavigator<BrowseStackParamList>();
const ProfileNavStack = createNativeStackNavigator<ProfileStackParamList>(); // Create Profile stack navigator
const Tab = createBottomTabNavigator<MainTabsParamList>();

// --- Auth Stack (Login/Signup) ---
function AuthStack() {
  return (
    <AuthNavStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthNavStack.Screen name="Login" component={LoginScreen} />
      <AuthNavStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthNavStack.Navigator>
  );
}

// --- Stacks for Tabs ---
// Home Stack (e.g., Upload)
function HomeStackNavigator() {
  return (
    <HomeNavStack.Navigator
        screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { fontWeight: typography.fontWeightBold as 'bold', color: colors.textPrimary },
        }}
    >
      <HomeNavStack.Screen
        name="HomeBase"
        component={HomeScreen}
        options={{
            title: 'Generate Report',
        }}
      />
      {/* SelectionScreen component REMOVED from stack */}
    </HomeNavStack.Navigator>
  );
}

// Browse Stack (List, View, Edit)
function BrowseStackNavigator() {
    return (
        <BrowseNavStack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.textPrimary,
                headerTitleStyle: { fontWeight: typography.fontWeightBold as 'bold' },
            }}
        >
            <BrowseNavStack.Screen 
                name="BrowseBase" 
                component={BrowseScreen} 
                options={{ title: 'Reports' }} 
            />
            <BrowseNavStack.Screen 
                name="ReportViewer" 
                component={ReportViewerScreen} 
                options={{ title: 'View Report' }} 
            />
             <BrowseNavStack.Screen 
                name="WebViewer" 
                component={WebViewerScreen} 
                options={{ title: 'View Report' }} // Title can be dynamic later
            />
            <BrowseNavStack.Screen 
                name="ReportEditor" 
                component={ReportEditorScreen} 
                options={{ title: 'Edit Report' }} 
            />
             <BrowseNavStack.Screen 
                 name="ProjectReports" 
                 component={ProjectReportsScreen} 
                 // options={{ title: 'Project Reports' }} // Title is set dynamically in the screen
             />
            {/* Add other screens related to browsing if needed */}
        </BrowseNavStack.Navigator>
    );
}

// New: Profile Stack (Settings Base, Edit Screens)
function ProfileStackNavigator() {
    return (
        <ProfileNavStack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.surface }, // Standard header
                headerTintColor: colors.primary, // Use primary color for back/buttons
                headerTitleStyle: { fontWeight: typography.fontWeightBold as 'bold', color: colors.textPrimary },
            }}
        >
            <ProfileNavStack.Screen
                name="ProfileBase"
                component={ProfileScreen}
                options={{ title: 'Settings' }} // Main title for the base screen
            />
            <ProfileNavStack.Screen
                name="EditSystemPrompt"
                component={EditSystemPromptScreen}
                options={{ title: 'System Prompt' }} // Change title
            />
             <ProfileNavStack.Screen
                name="EditReportSchema"
                component={EditReportSchemaScreen}
                options={{ title: 'Report Schema' }} // Change title
            />
            <ProfileNavStack.Screen
                name="EditName"
                component={EditNameScreen}
                options={{ title: 'Name' }}
            />
            <ProfileNavStack.Screen
                name="EditEmail"
                component={EditEmailScreen}
                options={{ title: 'Email' }}
            />
            <ProfileNavStack.Screen
                name="EditPhone"
                component={EditPhoneScreen}
                options={{ title: 'Phone Number' }}
            />
            <ProfileNavStack.Screen
                name="EditCompanyName"
                component={EditCompanyNameScreen}
                options={{ title: 'Company Name' }}
            />
            <ProfileNavStack.Screen
                name="EditCompanyPhone"
                component={EditCompanyPhoneScreen}
                options={{ title: 'Company Phone' }}
            />
            <ProfileNavStack.Screen
                name="EditCompanyWebsite"
                component={EditCompanyWebsiteScreen}
                options={{ title: 'Company Website' }}
            />
            <ProfileNavStack.Screen
                name="EditAddress"
                component={EditAddressScreen}
                options={{ title: 'Company Address' }}
            />
            <ProfileNavStack.Screen
                name="EditLogo"
                component={EditLogoScreen}
                options={{ title: 'Company Logo' }}
            />
            <ProfileNavStack.Screen
                name="EditChatModel"
                component={EditChatModelScreen}
                options={{ title: 'Chat Model' }}
            />
            <ProfileNavStack.Screen
                name="EditWhisperModel"
                component={EditWhisperModelScreen}
                options={{ title: 'Whisper Model' }}
            />
        </ProfileNavStack.Navigator>
    );
}

// --- Main App Tabs ---
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Hide headers for individual tabs, handled by stacks
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap | undefined;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'cloud-upload' : 'cloud-upload-outline'; // Use filled for focus
          } else if (route.name === 'BrowseTab') {
            iconName = focused ? 'document-text' : 'document-text-outline'; // Use document icon
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'settings' : 'settings-outline'; // Use filled for focus
          }

          // Set color based on focus: Primary Text color when focused, Secondary when not
          const iconColor = focused ? colors.textPrimary : colors.textSecondary; 
          
          // You can return any component that you like here!
          return iconName ? <Ionicons name={iconName} size={size} color={iconColor} /> : null;
        },
        // Update tint colors for labels
        tabBarActiveTintColor: colors.textPrimary, // Use primary text color for active label
        tabBarInactiveTintColor: colors.textSecondary, // Use secondary text color for inactive label
        tabBarStyle: {
            backgroundColor: colors.surface, // Match background
            borderTopColor: colors.borderLight, // Add light border
            ...Platform.select({ // Apply platform-specific styles
                web: {
                    height: 65, // Explicit height for web
                    paddingBottom: 5, // Add some padding for web if needed
                },
                // Keep default behavior for ios/android or add specific styles
            }),
        },
        tabBarLabelStyle: {
            fontSize: typography.fontSizeXS, // Adjust label size if needed
            fontWeight: typography.fontWeightMedium as '500', // Adjust weight
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStackNavigator} 
        options={{ title: 'Generate' }} // Label for the tab
      />
      <Tab.Screen 
        name="BrowseTab" 
        component={BrowseStackNavigator} 
        options={{ title: 'Reports' }} // Label for the tab
      />
       <Tab.Screen 
         name="ProfileTab" 
         component={ProfileStackNavigator} 
         options={{ title: 'Settings'}} // Label for the tab
      />
    </Tab.Navigator>
  );
}

// --- Root Navigator (Handles Auth Flow) ---
export default function AppNavigator() {
  const { userToken, loading } = useAuth(); // Get token and loading state

  // Display a loading indicator while the auth state is being determined (e.g., on initial load)
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {userToken ? (
          // User is signed in - Show main app tabs
          <RootStack.Screen name="MainAppTabs" component={MainTabs} />
        ) : (
          // No token found, user isn't signed in - Show auth flow
          <RootStack.Screen name="Auth" component={AuthStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
}); 