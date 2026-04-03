import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const Splash = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth(); // We check if they are already logged in!

  useEffect(() => {
    // If AuthContext is still loading from localStorage, wait.
    if (loading) return;

    // The Auto-Start Timer (2.5 seconds)
    const timer = setTimeout(() => {
      if (user) {
        navigate('/dashboard'); // If they logged in before, skip login!
      } else {
        navigate('/login'); // Otherwise, ask them to log in.
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate, user, loading]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden">
      
      {/* Optional: Very faint background circle to match your design */}
      <div className="absolute w-[400px] h-[400px] border border-orange-100 dark:border-gray-800 rounded-full scale-150 opacity-50"></div>

      <div className="z-10 flex flex-col items-center">
        {/* Logo Image */}
        <div className="w-32 h-32 mb-8 animate-pulse">
          <img src="/logo.png" alt="Seit Chat Logo" className="w-full h-full object-contain" />
        </div>

        {/* Brand Text */}
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-2 tracking-tight">
            <span className="text-[#FF9800]">Seit</span>
            <br />
            <span className="text-[#4CAF50]">Chat</span>
          </h1>
          
          {/* Subtitle */}
          <p className="mt-8 text-xs sm:text-sm text-gray-400 dark:text-gray-500 tracking-[0.25em] uppercase font-medium">
            Connect Beyond Words
          </p>
        </div>
      </div>

    </div>
  );
};

export default Splash;