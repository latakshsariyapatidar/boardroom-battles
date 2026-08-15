import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, AlertTriangle, CheckCircle, Info, ShieldAlert, HelpCircle } from 'lucide-react';
import Modal from './Modal';
import { apiCall, subscribeLiveChanges } from '../services/api';

function ParticipantDashboard({ token, onLogout, setIsLoading }) {
  const [statement, setStatement] = useState(null);
  const [history, setHistory] = useState(JSON.parse(localStorage.getItem('voteHistory') || '[]'));
  const [neutralUsed, setNeutralUsed] = useState(localStorage.getItem('neutralUsed') === 'true');
  const [voteCounts, setVoteCounts] = useState(JSON.parse(localStorage.getItem('voteCounts') || '{}'));
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [isNeutralModalOpen, setIsNeutralModalOpen] = useState(false);
  const [voteChoice, setVoteChoice] = useState('');
  const [isChangingVote, setIsChangingVote] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

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
        setStatement(null);
        setError(data.error || 'No active statement available');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      if (!silent) setIsLoading({ active: false, message: '' });
    }
  };

  // Initial load
  useEffect(() => {
    fetchStatement();
  }, [setIsLoading]);

  // Live BroadcastChannel sync + Automatic 3-second polling for instant updates from Judge side
  useEffect(() => {
    const unsubscribe = subscribeLiveChanges((event) => {
      if (event.type === 'STATEMENT_UPDATED' || event.type === 'STORAGE_UPDATED') {
        fetchStatement(true);
      }
    });

    const pollInterval = setInterval(() => {
      fetchStatement(true);
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  const openVoteModal = (choice) => {
    if (!statement || !statement.isActive) {
      setError('This statement is no longer active');
      return;
    }
    const statementID = statement.statementID;
    const currentCount = voteCounts[statementID] || 0;
    if (currentCount >= 2) {
      setError('You have reached the maximum 2 votes limit for this statement');
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
        setIsChangingVote(false);
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
      setError('You have already used your neutral vote for this session!');
      return;
    }
    const statementID = statement.statementID;
    const currentCount = voteCounts[statementID] || 0;
    if (currentCount >= 2) {
      setError('You have reached the maximum 2 votes limit for this statement');
      return;
    }
    setIsNeutralModalOpen(true);
  };

  const handleNeutralSubmit = async () => {
    if (!statement || !statement.statementID) return;
    setIsLoading({ active: true, message: 'Submitting Neutral Vote' });
    try {
      const data = await apiCall({ action: 'vote', token, statementID: statement.statementID, vote: 'neutral' });
      if (data && (data.success !== false)) {
        setNeutralUsed(true);
        localStorage.setItem('neutralUsed', 'true');
        setSuccess('Neutral vote submitted successfully');
        setError(null);
        const statementID = statement.statementID;
        const newHistory = history.filter(entry => entry.statementID !== statementID);
        newHistory.push({ statementID, vote: 'neutral' });
        setHistory(newHistory);
        localStorage.setItem('voteHistory', JSON.stringify(newHistory));
        const newVoteCounts = { ...voteCounts, [statementID]: (voteCounts[statementID] || 0) + 1 };
        setVoteCounts(newVoteCounts);
        localStorage.setItem('voteCounts', JSON.stringify(newVoteCounts));
        setIsNeutralModalOpen(false);
        setIsChangingVote(false);
      } else {
        setError(data?.error || 'Failed to submit neutral vote');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  const currentStatementID = statement?.statementID;
  const votesCastOnCurrent = currentStatementID ? (voteCounts[currentStatementID] || 0) : 0;
  const remainingVotes = Math.max(0, 2 - votesCastOnCurrent);
  const currentVoteEntry = history.find(entry => entry.statementID === currentStatementID);
  const currentStance = currentVoteEntry?.vote;

  return (
    <div className="p-4 sm:p-8 w-full max-w-5xl bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Main Section */}
        <div className="w-full sm:w-2/3 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center pb-4 border-b-2 border-slate-200 gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-slate-900">Participant Dashboard</h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  Live Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Motions update automatically when published by judges
              </p>
            </div>
            <button
              onClick={onLogout}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Logout
            </button>
          </div>

          {/* User Instructions / Guide */}
          <div className="bg-orange-50/70 border border-orange-200 p-4 rounded-xl text-slate-800 text-xs shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-orange-900 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-orange-600" />
                <span>How Voting & Scoring Works</span>
              </div>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-xs font-bold text-orange-700 hover:underline"
              >
                {showInstructions ? 'Hide Rules' : 'Show Rules'}
              </button>
            </div>
            {showInstructions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-orange-200/60 leading-relaxed font-medium">
                <div className="bg-white/80 p-2.5 rounded-lg border border-orange-100">
                  <p className="font-bold text-orange-900 mb-0.5">1st Vote (Initial)</p>
                  <p className="text-slate-600">Eligible for <strong>100% full points</strong> if your stance matches the judge's hidden decision.</p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-orange-100">
                  <p className="font-bold text-orange-900 mb-0.5">2nd Vote (Change Vote)</p>
                  <p className="text-slate-600">You can change your vote <strong>once</strong> per motion. Changing causes a <strong>50% score penalty</strong>.</p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-orange-100">
                  <p className="font-bold text-orange-900 mb-0.5">Neutral Stance</p>
                  <p className="text-slate-600">Can be used <strong>only 1 time per session</strong>. Earns 0 points without score penalties.</p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-orange-100">
                  <p className="font-bold text-orange-900 mb-0.5">Instant Motion Sync</p>
                  <p className="text-slate-600">No need to click refresh! Active motions update instantly when judges publish or toggle them.</p>
                </div>
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-semibold text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 font-bold ml-2">×</button>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg font-semibold text-sm flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="text-green-500 font-bold ml-2">×</button>
            </div>
          )}

          {/* Active Statement Card */}
          {statement ? (
            <div className="bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-md border border-orange-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Active Motion
                </span>
                <span className="text-xs font-mono text-slate-500 font-bold">
                  ID: {statement.statementID}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 leading-snug">
                {statement.text}
              </h3>

              {/* Voting Limits & Penalty Meter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Votes Cast</p>
                  <p className="text-slate-900 font-extrabold text-sm mt-0.5">{votesCastOnCurrent} / 2</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Remaining Changes</p>
                  <p className="text-slate-900 font-extrabold text-sm mt-0.5">{remainingVotes} left</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Penalty Status</p>
                  <p className={`font-extrabold text-sm mt-0.5 ${
                    votesCastOnCurrent === 0 ? 'text-green-600' :
                    votesCastOnCurrent === 1 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {votesCastOnCurrent === 0 ? 'No Penalty (100% Pts)' :
                     votesCastOnCurrent === 1 ? '50% Penalty Applied' : 'Limit Reached'}
                  </p>
                </div>
              </div>

              {statement.isActive ? (
                <div className="pt-2 border-t border-slate-100">
                  {/* CASE 1: User hasn't voted on this statement yet */}
                  {votesCastOnCurrent === 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Cast Your Initial Vote</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={() => openVoteModal('agree')}
                          className="py-3 px-4 rounded-lg font-bold text-sm text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                        >
                          Agree
                        </button>
                        <button
                          onClick={() => openVoteModal('disagree')}
                          className="py-3 px-4 rounded-lg font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
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
                    </div>
                  )}

                  {/* CASE 2: User has voted once -> Show current stance & "Change Vote" button */}
                  {votesCastOnCurrent === 1 && !isChangingVote && (
                    <div className="space-y-4">
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Current Vote Recorded</p>
                          <p className="text-lg font-extrabold text-orange-950 uppercase mt-0.5 flex items-center gap-2">
                            <span>{currentStance || 'Submitted'}</span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-orange-200 text-orange-900 rounded">Initial Vote</span>
                          </p>
                        </div>
                        <button
                          onClick={() => setIsChangingVote(true)}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Change Vote (1 Change Remaining)
                        </button>
                      </div>
                      <p className="text-xs text-amber-700 font-semibold bg-amber-50 p-2.5 rounded border border-amber-200">
                        ⚠️ Note: Changing your vote will incur a 50% score penalty for this statement.
                      </p>
                    </div>
                  )}

                  {/* CASE 2.1: User clicked "Change Vote" -> Show new stance choices */}
                  {votesCastOnCurrent === 1 && isChangingVote && (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Select Your New Stance (50% Penalty Applies)</p>
                        <button
                          onClick={() => setIsChangingVote(false)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={() => openVoteModal('agree')}
                          className="py-3 px-4 rounded-lg font-bold text-sm text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                        >
                          Agree
                        </button>
                        <button
                          onClick={() => openVoteModal('disagree')}
                          className="py-3 px-4 rounded-lg font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
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
                    </div>
                  )}

                  {/* CASE 3: User has reached max 2 votes */}
                  {votesCastOnCurrent >= 2 && (
                    <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Final Vote Submitted</p>
                        <p className="text-base font-extrabold text-slate-900 uppercase mt-0.5">{currentStance || 'Submitted'}</p>
                      </div>
                      <span className="text-xs font-bold bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md">
                        Maximum 2 Votes Reached (Locked)
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  Voting is currently closed for this statement.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-200 p-8 rounded-xl shadow-sm text-center">
              <p className="text-slate-600 font-bold text-base">No active motion available right now.</p>
              <p className="text-slate-400 text-xs mt-1">Please wait for the judge to publish a new statement.</p>
            </div>
          )}
        </div>

        {/* Sidebar History */}
        <div className="w-full sm:w-1/3 bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm h-fit space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Voting History
            </h3>
            <span className="text-xs font-bold text-slate-500">{history.length} Votes</span>
          </div>
          {history.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {history.map((entry, index) => (
                <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-slate-900">ID: {entry.statementID}</p>
                    <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                      {voteCounts[entry.statementID] || 1}x voted
                    </span>
                  </div>
                  <p className="font-semibold text-slate-600 mt-1">
                    Vote Cast: <span className="uppercase text-orange-600 font-extrabold">{entry.vote}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-xs font-medium">No votes recorded in this session yet.</p>
          )}

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Session Stats</p>
            <p>• Neutral Vote: <strong className={neutralUsed ? 'text-red-600' : 'text-green-600'}>{neutralUsed ? 'USED (0 left)' : 'AVAILABLE (1 left)'}</strong></p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isVoteModalOpen}
        onClose={() => setIsVoteModalOpen(false)}
        onSubmit={handleVote}
        title="Confirm Vote"
        submitText="Confirm Vote"
      >
        <div className="space-y-3">
          <p className="text-slate-700 text-sm font-medium">
            Are you sure you want to vote <strong className="uppercase text-orange-600">{voteChoice}</strong> for statement "{statement?.text}"?
          </p>
          {votesCastOnCurrent === 1 && (
            <p className="text-xs font-bold text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
              ⚠️ Penalty Notice: This is your 2nd vote on this statement. A 50% score penalty will apply.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isNeutralModalOpen}
        onClose={() => setIsNeutralModalOpen(false)}
        onSubmit={handleNeutralSubmit}
        title="Confirm Neutral Vote"
        submitText="Confirm Neutral"
      >
        <div className="space-y-3">
          <p className="text-slate-700 text-sm font-medium">
            Are you sure you want to submit a neutral vote? This action can only be performed once per session.
          </p>
          <p className="text-xs font-bold text-slate-600 bg-slate-100 p-2.5 rounded border border-slate-200">
            ℹ️ Neutral votes earn 0 points and do not count towards matching the judge's stance.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default ParticipantDashboard;