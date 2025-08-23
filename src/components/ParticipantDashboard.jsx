import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import Modal from './Modal';

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

function ParticipantDashboard({ token, onLogout, setIsLoading }) {
  const [statement, setStatement] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [history, setHistory] = useState(JSON.parse(localStorage.getItem('voteHistory') || '[]'));
  const [neutralUsed, setNeutralUsed] = useState(localStorage.getItem('neutralUsed') === 'true');
  const [voteCounts, setVoteCounts] = useState(JSON.parse(localStorage.getItem('voteCounts') || '{}'));
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [isNeutralModalOpen, setIsNeutralModalOpen] = useState(false);
  const [voteChoice, setVoteChoice] = useState('');

  useEffect(() => {
    let timerInterval;
    
    const fetchStatement = async () => {
      setIsLoading({ active: true, message: 'Loading Statement' });
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getStatement' }),
        });
        const data = await response.json();
        if (data.success) {
          setStatement(data);
          if (data.createdAt && data.durationMinutes) {
            const created = new Date(data.createdAt);
            const expires = new Date(created.getTime() + data.durationMinutes * 60 * 1000);
            if (expires < new Date()) {
              setStatement({ ...data, isActive: false });
            } else {
              // Start timer
              timerInterval = setInterval(() => {
                const now = new Date();
                const remaining = expires - now;
                if (remaining <= 0) {
                  setTimeRemaining(null);
                  setStatement(prev => ({ ...prev, isActive: false }));
                  clearInterval(timerInterval);
                } else {
                  setTimeRemaining(remaining);
                }
              }, 1000);
            }
          }
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Network error: ' + err.message);
      } finally {
        setIsLoading({ active: false, message: '' });
      }
    };
    fetchStatement();
    
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [setIsLoading]);

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const openVoteModal = (choice) => {
    if (!statement || !statement.isActive) {
      setError('This statement is no longer active');
      return;
    }
    const statementID = statement.statementID;
    const currentCount = voteCounts[statementID] || 0;
    if (currentCount >= 2) {
      setError('You have already voted and changed your vote once for this statement');
      return;
    }
    setVoteChoice(choice);
    setIsVoteModalOpen(true);
  };

  const handleVote = async () => {
    setIsLoading({ active: true, message: `Submitting ${voteChoice.charAt(0).toUpperCase() + voteChoice.slice(1)} Vote` });
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', token, statementID: statement.statementID, vote: voteChoice }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Vote submitted successfully');
        setError(null);
        const statementID = statement.statementID;
        const newHistory = history.filter(entry => entry.statementID !== statementID);
        newHistory.push({ statementID, vote: voteChoice });
        setHistory(newHistory);
        localStorage.setItem('voteHistory', JSON.stringify(newHistory));
        const newVoteCounts = { ...voteCounts, [statementID]: (voteCounts[statementID] || 0) + 1 };
        setVoteCounts(newVoteCounts);
        localStorage.setItem('voteCounts', JSON.stringify(newVoteCounts));
        setIsVoteModalOpen(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  const handleNoVote = () => {
    if (!statement || !statement.isActive) {
      setError('This statement is no longer active');
      return;
    }
    if (neutralUsed) {
      setError('You’ve already used your neutral vote!');
      return;
    }
    setIsNeutralModalOpen(true);
  };

  const handleNeutralSubmit = () => {
    setNeutralUsed(true);
    localStorage.setItem('neutralUsed', 'true');
    setSuccess('No vote submitted (neutral)');
    const newHistory = history.filter(entry => entry.statementID !== statement.statementID);
    newHistory.push({ statementID: statement.statementID, vote: 'neutral' });
    setHistory(newHistory);
    localStorage.setItem('voteHistory', JSON.stringify(newHistory));
    setIsNeutralModalOpen(false);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, type: 'spring', damping: 15 } }
  };

  return (
    <motion.div
      className="participant-dashboard p-4 sm:p-8 w-full max-w-4xl flex flex-col sm:flex-row"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="w-full sm:w-2/3 sm:pr-6 mb-4 sm:mb-0">
        <div className="flex flex-col sm:flex-row sm:justify-between items-center mb-6">
          <motion.h2
            className="text-xl sm:text-2xl font-bold text-[var(--text-heading)]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Participant Dashboard
          </motion.h2>
          <motion.button
            onClick={onLogout}
            className="bg-[var(--error)] text-white p-2 rounded-lg hover:bg-red-700 transition font-medium liquid-hover mt-2 sm:mt-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Logout
          </motion.button>
        </div>
        
        {/* Timer Section */}
        {statement && statement.isActive && timeRemaining && (
          <motion.div
            className="glass-card p-4 rounded-lg mb-6 flex items-center justify-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Clock className="w-5 h-5 text-[var(--button-bg)] mr-2" />
            <span className="text-lg font-semibold text-[var(--text-heading)]">
              Time Remaining: {formatTime(timeRemaining)}
            </span>
          </motion.div>
        )}
        
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
        {success && (
          <motion.p
            className="text-[var(--success)] mb-4 font-medium text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {success}
          </motion.p>
        )}
        {statement ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, type: 'spring', damping: 15 }}
          >
            <h3 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--text-heading)]">Active Statement</h3>
            <p className="mb-6 text-[var(--text-secondary)] text-base sm:text-lg">
              {statement.text} (ID: {statement.statementID})
              {!statement.isActive && (
                <span className="ml-2 text-sm text-[var(--error)]">(Inactive)</span>
              )}
            </p>
            {statement.isActive ? (
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <motion.button
                  onClick={() => openVoteModal('agree')}
                  className={`flex-1 bg-[var(--success)] text-white p-3 rounded-lg hover:bg-green-700 transition font-medium liquid-hover ${
                    (voteCounts[statement.statementID] || 0) >= 2 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={(voteCounts[statement.statementID] || 0) >= 2}
                >
                  Agree
                </motion.button>
                <motion.button
                  onClick={() => openVoteModal('disagree')}
                  className={`flex-1 bg-[var(--error)] text-white p-3 rounded-lg hover:bg-red-700 transition font-medium liquid-hover ${
                    (voteCounts[statement.statementID] || 0) >= 2 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={(voteCounts[statement.statementID] || 0) >= 2}
                >
                  Disagree
                </motion.button>
                <motion.button
                  onClick={handleNoVote}
                  className={`flex-1 bg-gray-500 text-white p-3 rounded-lg hover:bg-gray-600 transition font-medium liquid-hover ${
                    neutralUsed ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={neutralUsed}
                >
                  No Vote (Neutral)
                </motion.button>
              </div>
            ) : (
              <p className="text-[var(--text-secondary)]">Voting is closed for this statement</p>
            )}
          </motion.div>
        ) : (
          <p className="text-[var(--text-secondary)] text-base sm:text-lg">No active statement available</p>
        )}
      </div>
      <div className="w-full sm:w-1/3 sm:pl-6 sm:border-l border-[var(--card-border)]">
        <motion.h3
          className="text-lg sm:text-xl font-semibold mb-4 text-[var(--text-heading)]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Voting History
        </motion.h3>
        {history.length > 0 ? (
          <ul className="list-disc pl-5 text-[var(--text-secondary)] text-sm sm:text-base">
            {history.map((entry, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
              >
                Statement ID: {entry.statementID}, Vote: {entry.vote}
              </motion.li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--text-secondary)] text-sm sm:text-base">No voting history available</p>
        )}
      </div>
      <Modal
        isOpen={isVoteModalOpen}
        onClose={() => setIsVoteModalOpen(false)}
        onSubmit={handleVote}
        title="Confirm Vote"
        submitText="Confirm"
      >
        <p className="text-[var(--text-secondary)]">Are you sure you want to vote "{voteChoice}" for statement "{statement?.text}"?</p>
      </Modal>
      <Modal
        isOpen={isNeutralModalOpen}
        onClose={() => setIsNeutralModalOpen(false)}
        onSubmit={handleNeutralSubmit}
        title="Confirm Neutral Vote"
        submitText="Confirm"
      >
        <p className="text-[var(--text-secondary)]">Are you sure you want to submit a neutral vote for statement "{statement?.text}"? This can only be done once.</p>
      </Modal>
    </motion.div>
  );
}

export default ParticipantDashboard;