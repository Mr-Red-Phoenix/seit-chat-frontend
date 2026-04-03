import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios.config.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

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

  // Add 'username' as the second parameter
  const registerUser = async (name, username, email, password) => {
    setLoading(true);
    try {
      // Send the username to the backend
      const response = await api.post('/auth/register', { name, username, email, password });
      
      const { user: userData, accessToken } = response.data.data;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      
      toast.success(`Welcome to Seit Chat, ${userData.name}!`);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Try again.';
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (credential) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/google', { credential });
      const { user: userData, accessToken } = response.data.data;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      
      toast.success(`Welcome, ${userData.name}!`);
      return true;
    } catch (error) {
      toast.error('Google Sign-In failed. Please try again.');
      return false;
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