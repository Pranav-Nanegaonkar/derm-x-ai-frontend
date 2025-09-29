import React, { createContext, useContext, useState } from "react";

const SimpleAuthContext = createContext();

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://derm-x-ai-backend.onrender.com/";

export const useSimpleAuth = () => useContext(SimpleAuthContext);

export const SimpleAuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const [user, setUser] = useState(null);

  // Email/Password Login
  const login = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();
    setAuthToken(data.token);
    localStorage.setItem("authToken", data.token);

    // ✅ fetch user profile
    await fetchUserProfile(data.token);

    return data;
  };

  // Logout
  const logout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
  };

  // Fetch User Profile
  const fetchUserProfile = async (token = authToken) => {
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const profile = await response.json();
      setUser(profile);
    } else {
      console.warn("Failed to fetch user profile");
    }
  };

  return (
    <SimpleAuthContext.Provider
      value={{
        authToken,
        user,
        login,
        logout,
        fetchUserProfile,
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  );
};
