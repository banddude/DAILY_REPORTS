import React, { createContext, useState, useEffect, useContext, PropsWithChildren } from 'react';
// Import Supabase client and types
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient'; // <<< IMPORT Supabase client
// import AsyncStorage from '@react-native-async-storage/async-storage'; // Not needed directly here
import { API_BASE_URL } from '../config';

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
  login: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null); // Use Supabase User type
  const [session, setSession] = useState<Session | null>(null); // Add session state
  // const [userToken, setUserToken] = useState<string | null>(null); // REMOVED userToken state
  const [loading, setLoading] = useState<boolean>(true); // Start loading true

  // Derive isAuthenticated from session presence
  const isAuthenticated = !!session?.access_token; // Use session presence

  useEffect(() => {
    setLoading(true);
    // Check initial session state
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('[AuthContext Effect] Initial session fetched:', initialSession ? 'Exists' : 'Null');
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    }).catch(error => {
       console.error("[AuthContext Effect] Error getting initial session:", error);
       setLoading(false);
    });

    // Listen for auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log(`[AuthContext Listener] Auth event: ${_event}`, newSession ? 'Session updated' : 'No session');
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );

    // Cleanup listener on unmount
    return () => {
      if (authListener?.subscription) {
         console.log('[AuthContext Cleanup] Unsubscribing from auth state changes.');
         authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // SIGNUP Function - Update if you want auto-login after signup
  // const handleSignup = async (...) => { ... };

  const handleLogin = async (email: string, password: string) => {
      setLoading(true);
      // No need to clear state manually, listener handles it
      try {
          // Call backend /api/login
          const response = await fetch(`${API_BASE_URL}/api/login`, { // Keep path as /api/login
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
              },
              body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
              const errorMsg = data?.message || data?.error || 'Login request failed';
              console.error(`[AuthContext Login] Backend login failed (${response.status}):`, errorMsg);
              throw new Error(errorMsg);
          }

          console.log("[AuthContext Login] Backend login successful, received:", data);
          // Expect { access_token: ..., refresh_token: ..., user: ... }
          if (data.access_token && data.refresh_token) {
             // >>> Use supabase.auth.setSession <<<
             console.log("[AuthContext Login] Calling supabase.auth.setSession...");
             const { error: setSessionError } = await supabase.auth.setSession({
                 access_token: data.access_token,
                 refresh_token: data.refresh_token,
             });

             if (setSessionError) {
                 console.error("[AuthContext Login] Error setting Supabase session:", setSessionError);
                 throw new Error(setSessionError.message || 'Failed to set session locally.');
             }

             console.log("[AuthContext Login] Supabase session set successfully. Listener should update state.");
             // State update is handled by the onAuthStateChange listener

          } else {
              console.error('[AuthContext Login] Invalid response structure from backend:', data);
              throw new Error('Invalid login response structure from server.');
          }

      } catch (e: any) {
          console.error("[AuthContext Login] Error during login process:", e.message);
          // Optionally clear state here if needed on failure, though listener might handle it
          // setUser(null); setSession(null);
          throw e; // Re-throw error for UI handling
      } finally {
          setLoading(false);
      }
  };

  const handleSignOut = async () => {
    setLoading(true);
    console.log("[AuthContext SignOut] Calling supabase.auth.signOut...");
    // >>> Use supabase.auth.signOut <<< 
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("[AuthContext SignOut] Error signing out:", error);
        // Decide how to handle signout error (e.g., show message)
    } else {
         console.log("[AuthContext SignOut] Sign out successful. Listener should clear state.");
         // State (user, session) will be cleared by onAuthStateChange listener
    }
    setLoading(false);
  };

  const value = {
    user,
    session, // Expose session
    // userToken, // Removed
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