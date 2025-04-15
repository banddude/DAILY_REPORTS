import React, { createContext, useState, useEffect, useContext, PropsWithChildren } from 'react';
// import { Session, User } from '@supabase/supabase-js'; // <<< Can remove if not using Supabase types directly
// import { supabase } from '../utils/supabaseClient'; // <<< REMOVE THIS COMMENTED IMPORT
// import AsyncStorage from '@react-native-async-storage/async-storage'; // <<< Remove AsyncStorage
import { API_BASE_URL } from '../config';

// Interface for the user data we expect and store
interface AppUser {
  id: string; // Supabase user ID
  email: string;
}

// Remove old DebugSession interface if not used

interface AuthContextProps {
  user: AppUser | null;
  userToken: string | null; // This will store the JWT Access Token
  isAuthenticated: boolean; 
  loading: boolean;
  login: (email: string, password: string) => Promise<void>; 
  signOut: () => Promise<void>;
  // Expose signup if needed for auto-login logic
  // signup: (email: string, password: string) => Promise<any>; // Returns the server response data
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null); // State for the JWT
  const [loading, setLoading] = useState<boolean>(false);

  const isAuthenticated = !!userToken && !!user;

  useEffect(() => {
    // TODO: Implement loading token/user from secure storage on app start
  }, []);

  // SIGNUP Function (Optional but useful for auto-login)
  // const handleSignup = async (email: string, password: string) => {
  //    setLoading(true);
  //    try {
  //        const response = await fetch(`${API_BASE_URL}/api/signup`, { ... });
  //        const data = await response.json();
  //        if (!response.ok || !data.success) {
  //             throw new Error(data.message || 'Signup failed');
  //        }
  //        console.log("Signup successful, received data:", data);
  //        // IMPORTANT: Return the raw data for auto-login logic to parse
  //        return data;
  //    } catch (e: any) {
  //        console.error("Error during signup:", e.message);
  //        throw e;
  //    } finally {
  //        setLoading(false);
  //    }
  // };

  const handleLogin = async (email: string, password: string) => {
      setLoading(true);
      setUser(null);
      setUserToken(null);
      try {
          const response = await fetch(`${API_BASE_URL}/api/login`, {
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
          // NEW EXPECTATION: { success: true, token: <JWT>, user: { id: <supabase_id>, email: <user_email> } }
          if (data.token && data.user && data.user.id && data.user.email) {
             // Set user state with nested data
             setUser({ email: data.user.email, id: data.user.id }); 
             // Store the JWT access token
             setUserToken(data.token);
             // TODO: Store token (and maybe refresh token data.refreshToken) securely
             // await SecureStore.setItemAsync('userToken', data.token);
             // await SecureStore.setItemAsync('refreshToken', data.refreshToken);
          } else {
              // Log the actual data received for easier debugging
              console.error('Invalid login response structure received:', data);
              throw new Error('Invalid login response from server.'); 
          }

      } catch (e: any) {
          console.error("Error during login:", e.message);
          setUser(null);
          setUserToken(null);
          // TODO: Clear secure storage on error
          throw e; 
      } finally {
          setLoading(false);
      }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setUser(null);
    setUserToken(null);
    // TODO: Remove token/user from secure storage
    // await SecureStore.deleteItemAsync('userToken');
    // await SecureStore.deleteItemAsync('refreshToken');
    console.log("User signed out.");
    setLoading(false);
    // TODO: Consider calling Supabase signout if managing sessions server-side becomes complex
    // await supabase.auth.signOut(); 
  };

  const value = {
    user,
    userToken,
    isAuthenticated,
    loading,
    login: handleLogin,
    signOut: handleSignOut,
    // signup: handleSignup, // Expose signup if needed
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