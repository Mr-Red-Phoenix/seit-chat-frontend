import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios.config.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const ForgotPassword = () => {
  // We use "step" to flip between the Email form and the OTP form
  const [step, setStep] = useState(1); 
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Step 1: Request the OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');

    setLoading(true);
    try {
      const response = await api.post('/auth/forgotpassword', { email });
      toast.success(response.data.message);
      setStep(2); // Move to the OTP screen!
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and change password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) return toast.error('Please fill in all fields');

    setLoading(true);
    try {
      const response = await api.post('/auth/resetpassword', { email, otp, newPassword });
      toast.success(response.data.message);
      navigate('/login'); // Send them back to login!
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-gray-900 p-4 font-sans transition-colors duration-300 relative">
      <button onClick={toggleTheme} className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        
        {step === 1 ? (
          // --- STEP 1 UI: REQUEST OTP ---
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Reset Password</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Enter your email and we'll send you a 6-digit OTP.</p>
            </div>
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" placeholder="name@company.com" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          </>
        ) : (
          // --- STEP 2 UI: VERIFY OTP & RESET ---
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Enter OTP</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">We sent a 6-digit code to {email}</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">6-Digit OTP</label>
                <input type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white tracking-[0.5em] text-center font-bold text-xl" placeholder="••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" placeholder="Enter new password" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-[#4CAF50] text-white font-medium rounded-lg hover:bg-[#43A047] transition-colors disabled:opacity-70">
                {loading ? 'Resetting...' : 'Change Password'}
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          Remember your password? <Link to="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;