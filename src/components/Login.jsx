import React, { useState } from 'react';
import { apiCall } from '../services/api';

function Login({ onLogin, setIsLoading }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading({ active: true, message: 'Authenticating...' });
    try {
      const data = await apiCall({ action: 'login', username, password });
      if (data.success) {
        onLogin(data.token, data.role);
        setError(null);
      } else {
        setError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  return (
    <div className="bg-white border-2 border-slate-200 p-8 rounded-xl w-full max-w-sm mx-auto shadow-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900">Sign In</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Boardroom Battles Portal</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-4 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(null); }}
            placeholder="Enter your username"
            required
            className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            placeholder="Enter your password"
            required
            className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 rounded-lg font-bold bg-orange-600 hover:bg-orange-700 text-white text-sm transition-colors shadow-sm mt-2"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}

export default Login;