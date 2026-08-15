import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import JudgeDashboard from './components/JudgeDashboard';
import ParticipantDashboard from './components/ParticipantDashboard';
import Navbar from './components/Navbar';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const getInitialSession = () => {
    const sessionToken = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
    const sessionRole = sessionStorage.getItem('role') || localStorage.getItem('role') || '';
    return { token: sessionToken, role: sessionRole };
  };

  const initialSession = getInitialSession();
  const [token, setToken] = useState(initialSession.token);
  const [role, setRole] = useState(initialSession.role);
  const [isLoading, setIsLoading] = useState({ active: true, message: 'Loading Boardroom Battles...' });

  useEffect(() => {
    document.documentElement.className = 'light';
    const timer = setTimeout(() => {
      setIsLoading({ active: false, message: '' });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (newToken, newRole) => {
    setIsLoading({ active: true, message: 'Loading Session...' });
    try {
      setToken(newToken);
      setRole(newRole);
      sessionStorage.setItem('token', newToken);
      sessionStorage.setItem('role', newRole);
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  const handleLogout = () => {
    setIsLoading({ active: true, message: 'Logging Out...' });
    try {
      setToken('');
      setRole('');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('role');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('voteHistory');
      localStorage.removeItem('voteCounts');
      localStorage.removeItem('neutralUsed');
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {isLoading.active && <LoadingScreen message={isLoading.message} />}
      <div className="min-h-screen pt-20 pb-12">
        <Navbar />
        <main className="flex items-center justify-center p-4 sm:p-6 min-h-[calc(100vh-5rem)]">
          {!token ? (
            <Login onLogin={handleLogin} setIsLoading={setIsLoading} />
          ) : role === 'judge' ? (
            <div className="w-full flex justify-center">
              <JudgeDashboard token={token} onLogout={handleLogout} setIsLoading={setIsLoading} />
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <ParticipantDashboard token={token} onLogout={handleLogout} setIsLoading={setIsLoading} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;