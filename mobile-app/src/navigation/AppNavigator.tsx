import React, { useLayoutEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Button } from 'react-native';
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
import { colors, spacing, typography, borders } from '../theme/theme';

// --- Define Param Lists ---

// Params for screens in the Auth stack
export type AuthStackParamList = {
  Login: undefined; // No params expected
  SignUp: undefined; // No params expected
};

// Params for screens in the Home stack (inside the main tabs)
export type HomeStackParamList = {
  HomeBase: undefined; // Upload screen
  // Add other screens related to Home/Upload flow if needed
};

// Params for screens in the Browse stack (inside the main tabs)
export type BrowseStackParamList = {
  BrowseBase: undefined; // List screen
  ReportViewer: { reportKey: string }; // Example: Pass S3 key or DB ID
  WebViewer: { url: string }; // Pass the S3 viewer URL
  ReportEditor: { reportKey: string }; // Example: Pass S3 key or DB ID
  // Add other screens related to browsing if needed
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
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: typography.fontWeightBold as 'bold' },
        }}
    >
      <HomeNavStack.Screen 
        name="HomeBase" 
        component={HomeScreen} 
        options={{ title: 'Generate Report' }} 
      />
      {/* Add other screens related to the Home/Upload flow if needed */}
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
                options={{ title: 'Browse Reports' }} 
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
        </ProfileNavStack.Navigator>
    );
}

// --- Main App Tabs ---
function MainTabs() {
  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap;
              if (route.name === 'HomeTab') {
                iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
              } else if (route.name === 'BrowseTab') {
                iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
              } else if (route.name === 'ProfileTab') {
                iconName = focused ? 'settings' : 'settings-outline'; // Updated icon
              } else {
                 iconName = 'alert-circle-outline';
              }
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            headerShown: false,
            tabBarStyle: {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                borderTopWidth: borders.widthThin,
            },
            tabBarLabelStyle: {
                fontSize: typography.fontSizeXS,
            }
          })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStackNavigator}
        options={{ title: 'Generate' }}
      />
      <Tab.Screen 
        name="BrowseTab" 
        component={BrowseStackNavigator}
        options={{ title: 'Browse' }} 
      />
      <Tab.Screen 
        name="ProfileTab" // This tab now hosts the ProfileStack
        component={ProfileStackNavigator} // Use the new stack navigator
        options={{
            title: 'Settings', // Tab bar title
        }}
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