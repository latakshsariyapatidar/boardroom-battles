import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import Modal from './Modal';
import { apiCall, subscribeLiveChanges } from '../services/api';

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

  const fetchStatement = async (silent = false) => {
    if (!silent) setIsLoading({ active: true, message: 'Loading Statement' });
    try {
      const data = await apiCall({ action: 'getStatement' });
      if (data.success) {
        setStatement(data);
        if (data.createdAt && data.durationMinutes) {
          const created = new Date(data.createdAt);
          const expires = new Date(created.getTime() + data.durationMinutes * 60 * 1000);
          if (expires < new Date()) {
            setStatement({ ...data, isActive: false });
          }
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      if (!silent) setIsLoading({ active: false, message: '' });
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [setIsLoading]);

  useEffect(() => {
    const unsubscribe = subscribeLiveChanges((event) => {
      if (event.type === 'STATEMENT_UPDATED' || event.type === 'STORAGE_UPDATED') {
        fetchStatement(true);
      }
    });
    return () => unsubscribe();
  }, []);

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
    setIsLoading({ active: true, message: `Submitting ${voteChoice.toUpperCase()} Vote` });
    try {
      const data = await apiCall({ action: 'vote', token, statementID: statement.statementID, vote: voteChoice });
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
      setError('You have already used your neutral vote!');
      return;
    }
    setIsNeutralModalOpen(true);
  };

  const handleNeutralSubmit = async () => {
    setNeutralUsed(true);
    localStorage.setItem('neutralUsed', 'true');
    setSuccess('No vote submitted (neutral)');
    const newHistory = history.filter(entry => entry.statementID !== statement.statementID);
    newHistory.push({ statementID: statement.statementID, vote: 'neutral' });
    setHistory(newHistory);
    localStorage.setItem('voteHistory', JSON.stringify(newHistory));
    setIsNeutralModalOpen(false);

    try {
      await apiCall({ action: 'vote', token, statementID: statement.statementID, vote: 'neutral' });
    } catch (err) {
      console.error('Failed to submit neutral vote:', err);
    }
  };

  return (
    <div className="p-4 sm:p-8 w-full max-w-5xl bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Main Section */}
        <div className="w-full sm:w-2/3 space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center pb-4 border-b-2 border-slate-200 gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-slate-900">Participant Dashboard</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                Live Session
              </span>
            </div>
            <button
              onClick={onLogout}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-semibold text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg font-semibold text-sm">
              {success}
            </div>
          )}

          {/* Active Statement Card */}
          {statement ? (
            <div className="bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-md border border-orange-200">
                  Active Motion
                </span>
                <span className="text-xs font-mono text-slate-500 font-bold">
                  ID: {statement.statementID}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-6 leading-snug">
                {statement.text}
              </h3>

              {statement.isActive ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openVoteModal('agree')}
                    className={`py-3 px-4 rounded-lg font-bold text-sm text-white transition-colors bg-green-600 hover:bg-green-700 ${
                      (voteCounts[statement.statementID] || 0) >= 2 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={(voteCounts[statement.statementID] || 0) >= 2}
                  >
                    Agree
                  </button>
                  <button
                    onClick={() => openVoteModal('disagree')}
                    className={`py-3 px-4 rounded-lg font-bold text-sm text-white transition-colors bg-red-600 hover:bg-red-700 ${
                      (voteCounts[statement.statementID] || 0) >= 2 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={(voteCounts[statement.statementID] || 0) >= 2}
                  >
                    Disagree
                  </button>
                  <button
                    onClick={handleNoVote}
                    className={`py-3 px-4 rounded-lg font-bold text-sm text-slate-800 transition-colors bg-slate-200 hover:bg-slate-300 ${
                      neutralUsed ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={neutralUsed}
                  >
                    No Vote (Neutral)
                  </button>
                </div>
              ) : (
                <p className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  Voting is currently closed for this statement.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm text-slate-500 font-medium">
              No active statement available right now.
            </div>
          )}
        </div>

        {/* Sidebar History */}
        <div className="w-full sm:w-1/3 bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm h-fit">
          <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
            Voting History
          </h3>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((entry, index) => (
                <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <p className="font-bold text-slate-900">ID: {entry.statementID}</p>
                  <p className="font-semibold text-slate-600 mt-1">
                    Vote Cast: <span className="uppercase text-orange-600 font-extrabold">{entry.vote}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-xs font-medium">No votes recorded in this session yet.</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={isVoteModalOpen}
        onClose={() => setIsVoteModalOpen(false)}
        onSubmit={handleVote}
        title="Confirm Vote"
        submitText="Confirm Vote"
      >
        <p className="text-slate-700 text-sm font-medium">
          Are you sure you want to vote <strong className="uppercase text-orange-600">{voteChoice}</strong> for statement "{statement?.text}"?
        </p>
      </Modal>

      <Modal
        isOpen={isNeutralModalOpen}
        onClose={() => setIsNeutralModalOpen(false)}
        onSubmit={handleNeutralSubmit}
        title="Confirm Neutral Vote"
        submitText="Confirm Neutral"
      >
        <p className="text-slate-700 text-sm font-medium">
          Are you sure you want to submit a neutral vote? This action can only be performed once per session.
        </p>
      </Modal>
    </div>
  );
}

export default ParticipantDashboard;