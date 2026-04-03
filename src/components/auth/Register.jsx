import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

const Register = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); // NEW STATE
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const { theme, toggleTheme } = useTheme();
  const { registerUser, loading } = useAuth(); 
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(''); 
    
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setApiError('Please fill in all fields.');
      return; 
    }

    // Pass the username to the function!
    const success = await registerUser(name, username, email, password);
    if (success) {
      navigate('/dashboard'); 
    } else {
      setApiError('Email or Username might already be in use. Please try another.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-gray-900 p-4 font-sans transition-colors duration-300 relative">
      <button onClick={toggleTheme} className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 transition-colors duration-300">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold mb-1">
            <span className="text-[#FF9800]">Seit</span> <span className="text-[#4CAF50]">Chat</span>
          </h1>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Create Account</h2>
        </div>

        {apiError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 flex items-start gap-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" placeholder="Enter Name" />
          </div>

          {/* NEW USERNAME FIELD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" placeholder="Username" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" placeholder="username@mailserver.domain" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" placeholder="••••••" />
            <div className="mt-2 flex items-center">
              <input type="checkbox" id="show-pass" className="mr-2 cursor-pointer" onChange={() => setShowPassword(!showPassword)} />
              <label htmlFor="show-pass" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">Show Password</label>
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-[#4CAF50] text-white font-medium rounded-lg hover:bg-[#43A047] transition-colors disabled:opacity-70">
              {loading ? 'Creating...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account? <Link to="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;