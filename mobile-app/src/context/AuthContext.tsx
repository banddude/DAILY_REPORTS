import React, { createContext, useState, useEffect, useContext, PropsWithChildren } from 'react';
// Import Supabase client and types
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient'; // <<< IMPORT Supabase client
// import AsyncStorage from '@react-native-async-storage/async-storage'; // Not needed directly here
// import { API_BASE_URL } from '../config';
// Import expo-web-browser
import * as WebBrowser from 'expo-web-browser';
// --- Expo Auth Session Imports ---
import * as Google from 'expo-auth-session/providers/google';
// Import AuthSession itself for makeRedirectUri
import * as AuthSession from 'expo-auth-session'; 

// Recommended for Expo Go compatibility
WebBrowser.maybeCompleteAuthSession();

// Get the correct redirect URI for NATIVE builds
/* // Temporarily remove explicit redirect URI definition
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'com.shaffercon.reports', 
}); 
console.log("!!! NATIVE REDIRECT URI:", redirectUri); 
*/

// --- Read Client IDs from Environment Variables --- 
// Ensure these are set in your .env file and prefixed correctly!
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

// Optional: Add checks to ensure variables are loaded
if (!IOS_CLIENT_ID || !WEB_CLIENT_ID || !ANDROID_CLIENT_ID) {
  console.error("!!! Google Client ID environment variables are missing. Ensure EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, and EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID are set in your .env file.");
  // Decide how to handle this - throw error, disable Google Sign-In, etc.
  // For now, we'll log the error but let the hook potentially fail later.
}

// Use Supabase User type, remove custom AppUser
/*
interface AppUser {
  id: string;
  email: string;
}
*/

interface AuthContextProps {
  user: User | null; // Use Supabase User type
  session: Session | null; // Add session state
  // userToken: string | null; // REMOVED userToken state
  isAuthenticated: boolean;
  loading: boolean;
  // Renamed login -> signInWithPassword
  signInWithPassword: (email: string, password: string) => Promise<void>;
  // Added signUp and signInWithGoogle
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null); // Use Supabase User type
  const [session, setSession] = useState<Session | null>(null); // Add session state
  // const [userToken, setUserToken] = useState<string | null>(null); // REMOVED userToken state
  const [loading, setLoading] = useState<boolean>(true); // Start loading true

  // --- Google Auth Request Hook ---
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // Pass the client IDs read from environment variables
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID, // Added Android Client ID
    // redirectUri: redirectUri, // Keep commented out to test auto-discovery
  });

  // --- Effect to handle Google Auth Response ---
  useEffect(() => {
    if (response) {
      console.log("[AuthContext Google Response Effect] Received response:", response.type);
      setLoading(true); // Indicate processing
      if (response.type === 'success') {
        const { id_token } = response.params;
        if (id_token) {
          console.log("[AuthContext Google Response Effect] Got id_token, calling Supabase signInWithIdToken...");
          supabase.auth.signInWithIdToken({
            provider: 'google',
            token: id_token,
          }).then(({ data, error }) => {
            if (error) {
              console.error("[AuthContext Google Response Effect] Error signing in with ID token:", error);
              // Optionally handle Supabase sign-in error specifically
            } else {
              console.log("[AuthContext Google Response Effect] Supabase session obtained via ID token. Listener will update state.", data);
              // The main onAuthStateChange listener will handle setting user/session
            }
            // setLoading(false); // Let listener handle final loading state
          }).catch(err => {
             console.error("[AuthContext Google Response Effect] Catch block for signInWithIdToken:", err);
             setLoading(false);
          });
        } else {
           console.error("[AuthContext Google Response Effect] Success response but no id_token found.");
           setLoading(false);
        }
      } else if (response.type === 'error') {
         console.error("[AuthContext Google Response Effect] Google Auth Error:", response.error);
         setLoading(false);
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
         console.log("[AuthContext Google Response Effect] User cancelled Google login.");
         setLoading(false); // Stop loading if user cancels
      } else {
         console.warn("[AuthContext Google Response Effect] Unexpected response type:", response.type);
         setLoading(false);
      }
    }
  }, [response]); // Run when the Google auth response changes

  // --- Main Auth State Listener (Supabase) ---
  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('[AuthContext Effect] Initial session fetched:', initialSession ? 'Exists' : 'Null');
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    }).catch(error => {
       console.error("[AuthContext Effect] Error getting initial session:", error);
       setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log(`[AuthContext Listener] Auth event: ${_event}`, newSession ? 'Session updated' : 'No session');
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false); // <<< Listener now reliably sets loading false
      }
    );

    return () => {
      if (authListener?.subscription) {
         console.log('[AuthContext Cleanup] Unsubscribing from auth state changes.');
         authListener.subscription.unsubscribe();
      }
    };
  }, []); // Runs once on mount

  // Derive isAuthenticated from session presence
  const isAuthenticated = !!session?.access_token; // Use session presence

  // --- Sign Up (Email/Password) ---
  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log("[AuthContext SignUp] Calling supabase.auth.signUp...");
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      if (error) throw error;
      console.log("[AuthContext SignUp] Sign up initiated successfully.", data);
    } catch (e: any) {
      console.error("[AuthContext SignUp] Error:", e.message);
      setLoading(false); // Stop loading on error
      throw e;
    }
    // Don't setLoading(false) here, wait for listener or UI action
  };

  // --- Sign In (Email/Password) ---
  const handleSignInWithPassword = async (email: string, password: string) => {
      setLoading(true);
      try {
          console.log("[AuthContext SignIn] Calling supabase.auth.signInWithPassword...");
          const { data, error } = await supabase.auth.signInWithPassword({
              email: email,
              password: password,
          });
          if (error) throw error;
          console.log("[AuthContext SignIn] Sign in successful. Listener will update state.", data);
      } catch (e: any) {
          console.error("[AuthContext SignIn] Error:", e.message);
          setLoading(false); // Stop loading on error
          throw e;
      }
      // Don't setLoading(false) here, wait for listener
  };

  // --- Trigger Google Sign In ---
  // This function now just calls promptAsync from the hook
  const handleSignInWithGoogle = async () => {
    console.log("[AuthContext GoogleSignIn] Prompting Google login...");
    setLoading(true); // Indicate process starting
    try {
      // promptAsync handles opening the browser and getting the response
      await promptAsync(); 
      // The useEffect hook above handles the response
    } catch (e: any) {
       console.error("[AuthContext GoogleSignIn] Error calling promptAsync:", e.message);
       setLoading(false); // Stop loading if prompt fails
       throw e;
    }
    // Don't set loading false here, wait for response effect or listener
  };

  const handleSignOut = async () => {
    setLoading(true);
    console.log("[AuthContext SignOut] Calling supabase.auth.signOut...");
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("[AuthContext SignOut] Error:", error);
        setLoading(false); // Stop loading on error
    } else {
         console.log("[AuthContext SignOut] Sign out successful. Listener will clear state.");
    }
     // Don't setLoading(false) here, wait for listener
  };

  const value = {
    user,
    session,
    // userToken, // Removed
    isAuthenticated,
    loading: loading || !request, 
    signInWithPassword: handleSignInWithPassword,
    signUp: handleSignUp,
    signInWithGoogle: handleSignInWithGoogle,
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