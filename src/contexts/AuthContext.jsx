import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios.config.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // const [user, setUser] = useState(null);
  // const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   const storedUser = localStorage.getItem('user');
  //   const token = localStorage.getItem('accessToken');
  //   if (storedUser && token) {
  //     setUser(JSON.parse(storedUser));
  //   }
  // }, []);
  // ---> NEW: Synchronous Initialization <---
  // This grabs the user BEFORE the first render, stopping the premature redirect!
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    return (storedUser && token) ? JSON.parse(storedUser) : null;
  });
  
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // THIS IS THE REAL BACKEND CALL!
      const response = await api.post('/auth/login', { email, password });
      
      const { user: userData, accessToken } = response.data.data;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      
      toast.success(`Welcome back, ${userData.name}!`);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid email or password';
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    toast.success('Logged out successfully');
  };

// 1. Add "otp" to the function parameters
  const registerUser = async (name, username, email, password, otp) => { 
    setLoading(true);
    try {
      // 2. Add "otp" to the payload being sent to the backend
      const response = await api.post('/auth/register', { 
        name, 
        username, 
        email, 
        password, 
        otp 
      });
      
      const { user, accessToken, refreshToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return true; 
    } catch (error) {
      console.error("Registration failed:", error);
      return false; 
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (credential) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/google', { credential });
      
      // Check if it's a brand new user
      if (response.data.isNewUser) {
        return { isNewUser: true, googleData: response.data.googleData };
      }

      // Otherwise, log them in normally
      const { user, accessToken, refreshToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error("Google login failed", error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return (
      <AuthContext.Provider value={{ user, login, registerUser, loginWithGoogle, logout, loading }}>
        {children}
      </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);