import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios.config.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { Eye, EyeOff } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [otpSent, setOtpSent] = useState(false); // Tracks if they clicked Send OTP
  
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // 1. Send the Email
  const handleRequestOtp = async () => {
    if (!email) return toast.error('Please enter your email first');
    setLoadingOtp(true);
    try {
      const response = await api.post('/auth/forgotpassword', { email });
      toast.success(response.data.message);
      setOtpSent(true); // Locks the email field so they don't change it
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoadingOtp(false);
    }
  };

  // 2. Submit the whole form to change password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otpSent) return toast.error('Please request an OTP first');
    if (!otp || !newPassword) return toast.error('Please fill in all fields');
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match!');
    }
    
    setLoadingReset(true);
    try {
      const response = await api.post('/auth/resetpassword', { email, otp, newPassword });
      toast.success(response.data.message);
      navigate('/login'); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-gray-900 p-4 font-sans transition-colors duration-300 relative">
      <button onClick={toggleTheme} className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Reset Password</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Enter your email to receive a code, then set your new password.</p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-5">
          
          {/* EMAIL & SEND OTP BUTTON ON SAME LINE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
            <div className="flex gap-2">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white disabled:opacity-60" 
                placeholder="name@company.com" 
                disabled={otpSent} 
              />
              <button 
                type="button" 
                onClick={handleRequestOtp} 
                disabled={loadingOtp || otpSent} 
                className="px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 whitespace-nowrap"
              >
                {loadingOtp ? '...' : (otpSent ? 'Sent!' : 'Send OTP')}
              </button>
            </div>
          </div>

          {/* OTP INPUT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">6-Digit OTP</label>
            <input 
              type="text" 
              maxLength="6" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white tracking-[0.5em] text-center font-bold text-xl" 
              placeholder="••••••" 
            />
          </div>

          {/* NEW PASSWORD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"} 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white pr-10" 
                placeholder="Enter new password" 
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* CONFIRM NEW PASSWORD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white pr-10" 
                placeholder="Confirm new password" 
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loadingReset} className="w-full py-2.5 px-4 bg-[#4CAF50] text-white font-medium rounded-lg hover:bg-[#43A047] transition-colors disabled:opacity-70 mt-4">
            {loadingReset ? 'Resetting...' : 'Change Password'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          Remember your password? <Link to="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;