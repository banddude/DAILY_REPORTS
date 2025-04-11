import React, { createContext, useState, useEffect, useContext, PropsWithChildren } from 'react';
// import { Session, User } from '@supabase/supabase-js'; // <<< Can remove if not using Supabase types directly
// import { supabase } from '../utils/supabaseClient'; // <<< REMOVE THIS COMMENTED IMPORT
// import AsyncStorage from '@react-native-async-storage/async-storage'; // <<< Remove AsyncStorage
import { API_BASE_URL } from '../config';

// Simplified User/Session types for debug mode
interface DebugUser {
  id: string;
  email: string;
}

interface DebugSession {
  access_token: string;
  user: DebugUser;
}

interface AuthContextProps {
  // session: DebugSession | null; // Simplified - primarily need the token
  user: DebugUser | null;
  userToken: string | null; // Add the token directly here
  isAuthenticated: boolean; 
  loading: boolean;
  login: (email: string, password: string) => Promise<void>; 
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  // const [session, setSession] = useState<DebugSession | null>(null); // Simplified
  const [user, setUser] = useState<DebugUser | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null); // State for the token (UUID)
  const [loading, setLoading] = useState<boolean>(false);

  // Derived state for isAuthenticated based on token presence
  const isAuthenticated = !!userToken && !!user; // User needs to be set too

  useEffect(() => {
    // Optional: Could try to load token from AsyncStorage here on initial load
    // For now, we rely solely on the login flow
  }, []);

  const handleLogin = async (email: string, password: string) => {
      setLoading(true);
      setUser(null); // Clear previous state
      setUserToken(null);
      try {
          // Call the standard login endpoint now
          const response = await fetch(`${API_BASE_URL}/api/login`, { // Use /api/login
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
              },
              body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
              throw new Error(data.message || 'Login failed');
          }

          console.log("Login successful, received data:", data);
          // Expecting { success: true, token: <UUID>, email: <user_email> }
          if (data.token && data.email) {
             setUser({ email: data.email, id: data.token }); // Set simplified user object
             setUserToken(data.token); // Store the UUID token
             // Optional: Store token in AsyncStorage for persistence
             // await AsyncStorage.setItem('userToken', data.token);
          } else {
              throw new Error('Invalid login response from server.');
          }

      } catch (e: any) {
          console.error("Error during login:", e.message);
          setUser(null); // Clear state on error
          setUserToken(null);
          throw e; // Re-throw to be caught in LoginScreen
      } finally {
          setLoading(false);
      }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setUser(null);
    setUserToken(null);
    // Optional: Remove token from AsyncStorage
    // await AsyncStorage.removeItem('userToken');
    console.log("User signed out.");
    setLoading(false);
  };

  const value = {
    // session, // Removed
    user,
    userToken, // Provide the token
    isAuthenticated,
    loading,
    login: handleLogin,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 