import React, { useLayoutEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Button, Platform } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams, getFocusedRouteNameFromRoute, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';
import BrowseScreen from '../screens/BrowseScreen';
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
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import UpdatePasswordScreen from '../screens/UpdatePasswordScreen';
import { colors, spacing, typography, borders } from '../theme/theme';

// --- Define Param Lists ---

// Params for screens in the Auth stack
export type AuthStackParamList = {
  Login: undefined; // No params expected
  SignUp: undefined; // No params expected
  ResetPassword: undefined; // Add ResetPassword screen
};

// Params for screens in the Home stack (inside the main tabs)
export type HomeStackParamList = {
  HomeBase: { // Keep params HomeBase might receive
      selectedCustomer?: string; // From old logic, maybe remove later
      selectedProject?: string; // From old logic, maybe remove later
      newCustomerName?: string; // Added param for new customer
      newProjectForCustomer?: string; // Added param for customer context of new project
      newProjectName?: string; // Added param for new project name
  } | undefined;
};

// Params for screens in the Browse stack (inside the main tabs)
export type BrowseStackParamList = {
  BrowseBase: { focusedCustomer?: string } | undefined;
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
export type ResetPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;
export type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'HomeBase'>;
export type BrowseScreenProps = NativeStackScreenProps<BrowseStackParamList, 'BrowseBase'>;
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
export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>; // For navigating *out* to modals
export type HomeScreenRouteProp = RouteProp<HomeStackParamList, 'HomeBase'>; // For receiving params

// Define Root Stack including Auth, Main App, and Modal/Top-Level Screens
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainAppTabs: NavigatorScreenParams<MainTabsParamList>;
  AddProject: { customer?: string };
};

// Define Stack Navigators
const RootStack = createNativeStackNavigator<RootStackParamList>(); // Root stack
const AuthNavStack = createNativeStackNavigator<AuthStackParamList>(); // Auth stack
const HomeNavStack = createNativeStackNavigator<HomeStackParamList>();
const BrowseNavStack = createNativeStackNavigator<BrowseStackParamList>();
const ProfileNavStack = createNativeStackNavigator<ProfileStackParamList>(); // Create Profile stack navigator
const Tab = createBottomTabNavigator<MainTabsParamList>();

// --- Auth Stack (Login/Signup/Reset) ---
function AuthStack() {
  return (
    <AuthNavStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthNavStack.Screen name="Login" component={LoginScreen} />
      <AuthNavStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthNavStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
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
            headerBackVisible: false
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
                headerBackVisible: false
            }}
        >
            <BrowseNavStack.Screen 
                name="BrowseBase" 
                component={BrowseScreen} 
                options={{ title: 'Reports', headerLeft: () => null }} 
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
                headerBackVisible: false
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
        options={{ title: 'Reports' }} 
      />
       <Tab.Screen 
         name="ProfileTab" 
         component={ProfileStackNavigator} 
         options={{ title: 'Settings'}} // Label for the tab
      />
    </Tab.Navigator>
  );
}

// --- Root Stack (Handles Auth vs Main App vs Password Recovery) ---
function RootStackContainer() {
  const { session, isAuthenticated, loading, isPasswordRecovery } = useAuth();

  if (loading) {
    // Show a loading spinner or splash screen while checking token
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Conditionally render UpdatePasswordScreen if in recovery mode
  if (isPasswordRecovery) {
     console.log("AppNavigator: Rendering UpdatePasswordScreen directly.");
     return <UpdatePasswordScreen />;
  }

  // Otherwise, render Auth or Main App based on authentication
  return (
    <RootStack.Navigator
       screenOptions={{
          headerShown: false 
       }}
    >
      {isAuthenticated ? (
        <RootStack.Screen name="MainAppTabs" component={MainTabs} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthStack} />
      )}
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootStackContainer />
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
    // Add any other styles needed
});

// Helper function (optional, for tab bar visibility based on route)
// ... (getTabBarVisibility function remains the same) ...
function getTabBarVisibility(route: any) {
    const routeName = getFocusedRouteNameFromRoute(route) ?? '';
    // Hide tab bar for specific screens within BrowseTab or ProfileTab
    const screensToHideTabBar = [
        'ReportViewer',
        'WebViewer',
        'ReportEditor',
        'ProjectReports',
        'EditSystemPrompt',
        'EditReportSchema',
        'EditName',
        'EditEmail',
        'EditPhone',
        'EditCompanyName',
        'EditCompanyPhone',
        'EditCompanyWebsite',
        'EditAddress',
        'EditLogo',
        'EditChatModel'
    ];
    if (screensToHideTabBar.includes(routeName)) {
        return false;
    }
    return true;
} 