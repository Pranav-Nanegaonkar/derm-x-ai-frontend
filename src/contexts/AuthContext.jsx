import React, { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext({});

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://derm-x-ai-backend.onrender.com/";

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Google Login
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // ✅ Call backend to complete signup
      const response = await fetch(`${API_BASE_URL}api/auth/signup-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName,
          googleId: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync Google user with backend");
      }

      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setAuthToken(null);
  };

  // Delete account
  const deleteAccount = async () => {
    if (!authToken) throw new Error("No auth token");

    const response = await fetch(`${API_BASE_URL}api/users/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to delete account");
    }

    await logout();
  };

  // Upload profile photo
  const uploadProfilePhoto = async (photoUrl) => {
    if (!authToken) throw new Error("No auth token");

    const response = await fetch(`${API_BASE_URL}api/users/profile/photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ photoUrl }),
    });

    if (!response.ok) {
      throw new Error("Failed to update profile photo");
    }

    const data = await response.json();
    setCurrentUser((prev) => ({ ...prev, photoUrl: data.photoUrl }));
  };

  // Track Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);

          // ✅ Load profile from backend
          const response = await fetch(`${API_BASE_URL}api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const profile = await response.json();
            setCurrentUser({ ...user, ...profile });
          } else {
            setCurrentUser(user); // fallback to Firebase user
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
        setAuthToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authToken,
        loginWithGoogle,
        logout,
        deleteAccount,
        uploadProfilePhoto,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
