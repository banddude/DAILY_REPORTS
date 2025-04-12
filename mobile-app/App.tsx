import { registerRootComponent } from 'expo';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator'; // Import the main navigator
import { AuthProvider } from './src/context/AuthContext'; // Import the Auth provider

// Remove old imports: NavigationContainer, createBottomTabNavigator, createStackNavigator, Ionicons, theme, screens

function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <AuthProvider> 
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Remove old Tab, Stack, RootStackParamList, HomeStackNavigator, BrowseStackNavigator definitions

export default App;

registerRootComponent(App);
