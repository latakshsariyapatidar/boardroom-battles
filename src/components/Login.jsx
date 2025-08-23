import React, { useState } from 'react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

function Login({ onLogin, setIsLoading }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both username and password");
      setIsLoading({ active: false, message: '' });
      return;
    }
    setIsLoading({ active: true, message: 'Logging In' });
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await response.json();
      if (data.success) {
        onLogin(data.token, data.role);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeInOut' } }
  };

  return (
    <motion.div
      className="glass-card p-6 sm:p-8 rounded-lg w-full max-w-sm mx-auto"
      variants={formVariants}
      initial="hidden"
      animate="visible"
    >
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-[var(--text-heading)] text-center">Login</h2>
      {error && (
        <motion.p
          className="text-[var(--error)] mb-4 font-medium text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {error}
        </motion.p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label htmlFor="username" className="sr-only">Username</label>
        <motion.input
          id="username"
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(null); }}
          placeholder="Username"
          className="w-full p-3 liquid-input rounded-lg"
          whileFocus={{ scale: 1.02 }}
        />
        <label htmlFor="password" className="sr-only">Password</label>
        <motion.input
          id="password"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          placeholder="Password"
          className="w-full p-3 liquid-input rounded-lg"
          whileFocus={{ scale: 1.02 }}
        />
        <motion.button
          type="submit"
          disabled={setIsLoading.active}
          className={`w-full p-3 rounded-lg font-medium liquid-hover transition 
            ${setIsLoading.active 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-[var(--button-bg)] hover:bg-[var(--button-hover)] text-white"
            }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {setIsLoading.active ? (
            <div className="flex items-center justify-center gap-2">
              <span className="loader w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Logging in...
            </div>
          ) : "Login"}
        </motion.button>
      </form>
    </motion.div>
  );
}

export default Login;