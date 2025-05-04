import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { getProfile } from '../services/apiService';
import eventEmitter from '../utils/eventEmitter';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // --- MODIFIED: Initialize state directly from localStorage ---
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('authUser');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error("Failed to parse stored user", e);
      localStorage.removeItem('authUser'); // Remove potentially corrupt data
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('authRefreshToken'));
  // --- End Modified Initial State ---

  const [isLoading, setIsLoading] = useState(false); // For login/signup actions
  const [error, setError] = useState(null);
  // This tracks if we've done the *very first* check/setup
  const [isInitialAuthCheckComplete, setIsInitialAuthCheckComplete] = useState(false);
  const navigate = useNavigate();

  // --- Effect for initial setup & sync AFTER state is initialized ---
  useEffect(() => {
    // This runs once on mount and whenever token/refreshToken state changes
    if (token) {
      console.log("AuthContext Effect: Setting Axios header with token.");
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('authToken', token); // Sync state to storage
    } else {
      console.log("AuthContext Effect: Deleting Axios header.");
      delete apiClient.defaults.headers.common['Authorization'];
      localStorage.removeItem('authToken');
    }

    if (refreshToken) {
        localStorage.setItem('authRefreshToken', refreshToken); // Sync state to storage
    } else {
         localStorage.removeItem('authRefreshToken');
    }

    // Mark initial check as complete only after the first run
    if (!isInitialAuthCheckComplete) {
        setIsInitialAuthCheckComplete(true);
    }
  }, [token, refreshToken, isInitialAuthCheckComplete]); // Add isInitialAuthCheckComplete to dependencies

  // --- Effect to listen for token refresh events (keep as is) ---
  useEffect(() => {
    const handleTokenRefresh = async (data) => {
      console.log("AuthContext: Received tokenRefreshed event", data);
      if (data?.token) {
        setToken(data.token);
        console.log("AuthContext: Re-fetching user profile after token refresh...");
        try {
          const profileResponse = await getProfile();
          setUser(profileResponse.data);
          localStorage.setItem('authUser', JSON.stringify(profileResponse.data));
          console.log("AuthContext: User profile updated via refresh event.");
        } catch (profileError) {
           console.error("AuthContext: Failed to re-fetch profile after token refresh", profileError);
           // Consider logging out if profile fetch fails consistently after refresh
           // logout();
        }
      }
    };
    const unsubscribe = eventEmitter.subscribe('tokenRefreshed', handleTokenRefresh);
    return () => { unsubscribe(); };
  }, []); // Empty array: runs only once to set up listener

  // --- Login Function ---
  const login = async (email, password) => {
    setIsLoading(true); setError(null);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token, refresh_token, user: loggedInUser } = response.data;
      // Set state, which triggers the useEffect to update storage/headers
      setUser(loggedInUser);
      setToken(access_token);
      setRefreshToken(refresh_token);
      // Explicitly set user storage here too for immediate availability if needed elsewhere
      localStorage.setItem('authUser', JSON.stringify(loggedInUser));
      setIsLoading(false); navigate('/'); return true;
    } catch (err) { /* ... error handling ... */ setIsLoading(false); return false; }
  };

  // --- Signup Function ---
  const signup = async (userData) => { /* ... as before ... */ };

  // --- Logout Function ---
  const logout = () => {
    // Clear state, which triggers useEffect to clear storage/headers
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    // Explicitly remove user data storage on logout
    localStorage.removeItem('authUser');
    navigate('/login');
  };

  const setNewToken = (newToken) => {
    setToken(newToken);
  };

  const updateUserInContext = (newUserData) => {
    // Ensure we merge, not overwrite completely, unless newUserData is complete
    setUser(currentUser => ({ ...currentUser, ...newUserData }));
    // Update local storage as well
    localStorage.setItem('authUser', JSON.stringify({ ...user, ...newUserData }));
  };

  // --- Value provided by the context ---
  const value = {
    user, token, refreshToken, isLoading,
    isAuthLoading: !isInitialAuthCheckComplete, // Use the new flag for initial loading state
    error, setError, setNewToken, login, signup, logout, updateUserInContext,
    isAuthenticated: !!token // Based on access token presence
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom hook to use the auth context ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};