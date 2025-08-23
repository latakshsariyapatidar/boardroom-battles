import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Login from './components/Login';
import JudgeDashboard from './components/JudgeDashboard';
import ParticipantDashboard from './components/ParticipantDashboard';
import Navbar from './components/Navbar';
import RippleContainer from './components/RippleContainer';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isLoading, setIsLoading] = useState({ active: true, message: 'Loading Boardroom Battles...' });

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Simulate initial load (e.g., checking localStorage)
    const timer = setTimeout(() => {
      setIsLoading({ active: false, message: '' });
    }, 1500); // 1.5s delay for initial load
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = async (newToken, newRole) => {
    setIsLoading({ active: true, message: 'Logging In' });
    try {
      setToken(newToken);
      setRole(newRole);
      localStorage.setItem('token', newToken);
      localStorage.setItem('role', newRole);
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  const handleLogout = () => {
    setIsLoading({ active: true, message: 'Logging Out' });
    try {
      setToken('');
      setRole('');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('voteHistory');
      localStorage.removeItem('neutralUsed');
      localStorage.removeItem('voteCounts');
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeInOut' } }
  };

  return (
    <RippleContainer>
      {isLoading.active && <LoadingScreen message={isLoading.message} />}
      <div className="min-h-screen pt-16">
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <motion.div
          className="flex items-center justify-center p-4 sm:p-6 min-h-[calc(100vh-4rem)]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
            {!token ? (
              <Login onLogin={handleLogin} setIsLoading={setIsLoading} />
            ) : role === 'judge' ? (
              <div className="glass-card p-4 sm:p-8 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-5xl">
                <JudgeDashboard token={token} onLogout={handleLogout} setIsLoading={setIsLoading} />
              </div>
            ) : (
              <div className="glass-card p-4 sm:p-8 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-5xl">
                <ParticipantDashboard token={token} onLogout={handleLogout} setIsLoading={setIsLoading} />
              </div>
            )}
        </motion.div>
      </div>
    </RippleContainer>
  );
}

export default App;