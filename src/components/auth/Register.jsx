import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Eye, EyeOff } from 'lucide-react'; // <-- Added
import toast from 'react-hot-toast'; 
import api from '../../api/axios.config.js'; // <-- Needed for OTP request

const Register = () => {
  const location = useLocation();
  const googleData = location.state?.googleData;
  const [step, setStep] = useState(1); // <-- Added Step State
  const [otp, setOtp] = useState(''); // <-- Added OTP State
  const [username, setUsername] = useState(''); 
  const [name, setName] = useState(googleData?.name || '');
  const [email, setEmail] = useState(googleData?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { registerUser, loading } = useAuth(); 
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      return setApiError('Please fill in all fields.');
    }
    setIsSendingOtp(true);
    try {
      await api.post('/auth/send-register-otp', { email, username });
      toast.success("OTP sent to your email!");
      setStep(2); 
    } catch (error) {
      setApiError(error.response?.data?.message || 'Error sending OTP.');
    } finally {
      setIsSendingOtp(false); 
    }
  };

  const handleVerifyRegister = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error("Please enter the OTP");
    
    // We pass the OTP to the context function
    const success = await registerUser(name, username, email, password, otp);
    if (success) {
      navigate('/dashboard'); 
    } else {
      setApiError('Invalid OTP or Registration Failed.');
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
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
            {step === 1 ? "Create Account" : "Verify Email"}
          </h2>
        </div>

        {apiError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 flex items-start gap-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{apiError}</p>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" placeholder="Enter Name" />
            </div>
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
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white pr-10" placeholder="••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSendingOtp} 
                className="w-full py-2.5 px-4 bg-[#4CAF50] text-white font-medium rounded-lg hover:bg-[#43A047] transition-colors disabled:opacity-70"
              >
                {isSendingOtp ? 'Sending Email...' : 'Next'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyRegister} className="space-y-5">
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-4">We sent a 6-digit code to {email}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">6-Digit OTP</label>
              <input type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none text-gray-900 dark:text-white tracking-[0.5em] text-center font-bold text-xl focus:ring-2 focus:ring-blue-500" placeholder="••••••" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-[#4CAF50] text-white font-medium rounded-lg hover:bg-[#43A047] transition-colors disabled:opacity-70">
              {loading ? 'Creating Account...' : 'Verify & Create Account'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Back to edit details
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account? <Link to="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;