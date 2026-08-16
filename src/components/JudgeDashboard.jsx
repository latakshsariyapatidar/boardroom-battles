import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Modal from './Modal';
import { apiCall, subscribeLiveChanges } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function JudgeDashboard({ token, onLogout, setIsLoading }) {
  const [text, setText] = useState('');
  const [judgeVote, setJudgeVote] = useState('');
  const [duration, setDuration] = useState('');
  const [statements, setStatements] = useState([]);
  const [resultsData, setResultsData] = useState(null);
  const [selectedStatementForResults, setSelectedStatementForResults] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatementID, setModalStatementID] = useState(null);
  const [modalDuration, setModalDuration] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.custom-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatements(prevStatements =>
        prevStatements.map(statement => {
          if (statement.isActive && statement.expiresAt && new Date() >= statement.expiresAt) {
            handleAutoDeactivate(statement.statementID);
            return { ...statement, isActive: false };
          }
          return statement;
        })
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  const handleAutoDeactivate = async (statementID) => {
    try {
      await apiCall({
        action: 'toggleStatementActive',
        token,
        statementID,
        isActive: false
      });
    } catch (err) {
      console.error('Failed to auto-deactivate statement:', err);
    }
  };

  const handleGetResults = async (targetStatementID) => {
    const targetId = targetStatementID || selectedStatementForResults || statements[0]?.statementID;
    try {
      const data = await apiCall({ action: 'getResults', token, statementID: targetId });
      if (data) {
        setResultsData(data);
        if (!selectedStatementForResults && data.statementID) {
          setSelectedStatementForResults(data.statementID);
        }
        setError(null);
      }
    } catch (err) {
      setError('Network error loading results: ' + err.message);
    }
  };

  const reloadStatements = async () => {
    try {
      const newData = await apiCall({ action: 'getAllStatements', token });
      if (newData && (newData.success || Array.isArray(newData.statements) || Array.isArray(newData))) {
        const rawStatements = Array.isArray(newData) ? newData : (newData.statements || []);
        const now = new Date();
        setStatements(rawStatements.map(s => {
          const expiresAt = s.createdAt && s.durationMinutes
            ? new Date(new Date(s.createdAt).getTime() + s.durationMinutes * 60 * 1000)
            : null;
          const isActive = s.isActive && (expiresAt ? now < expiresAt : true);
          return { ...s, isActive, expiresAt };
        }));
      }
    } catch (err) {
      console.error('Failed to reload statements:', err);
    }
  };

  useEffect(() => {
    const fetchStatements = async () => {
      setIsLoading({ active: true, message: 'Loading Statements...' });
      try {
        await reloadStatements();
        await handleGetResults();
      } catch (err) {
        setError('Network error: ' + err.message);
      } finally {
        setIsLoading({ active: false, message: '' });
      }
    };
    fetchStatements();
  }, [setIsLoading, token]);

  useEffect(() => {
    if (statements.length > 0 && !resultsData) {
      handleGetResults(statements[0].statementID);
    }
  }, [statements]);

  useEffect(() => {
    const unsubscribe = subscribeLiveChanges(() => {
      reloadStatements();
      handleGetResults(selectedStatementForResults || statements[0]?.statementID);
    });
    return () => unsubscribe();
  }, [selectedStatementForResults, statements]);

  const handleSetStatement = async (e) => {
    e.preventDefault();
    if (!duration || parseInt(duration) <= 0) {
      setError('Please enter a valid duration in minutes');
      return;
    }
    setIsLoading({ active: true, message: 'Setting Statement...' });
    try {
      const data = await apiCall({ action: 'setStatement', token, text, judgeVote, durationMinutes: parseInt(duration) });
      if (data && (data.success !== false)) {
        setSuccess('Statement set successfully');
        setError(null);
        setText('');
        setJudgeVote('');
        setDuration('');
        await reloadStatements();
        await handleGetResults();
      } else {
        setError(data.error || 'Failed to set statement');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  const handleToggleActive = async (statementID, isActive) => {
    setIsLoading({ active: true, message: isActive ? 'Deactivating Statement...' : 'Preparing Reactivation...' });
    try {
      if (!isActive) {
        setModalStatementID(statementID);
        setIsModalOpen(true);
      } else {
        const data = await apiCall({ action: 'toggleStatementActive', token, statementID, isActive: false });
        if (data && (data.success !== false)) {
          setSuccess(`Statement ${statementID} deactivated`);
          setError(null);
          await reloadStatements();
        } else {
          setError(data.error || 'Failed to toggle status');
        }
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  const handleReactivateSubmit = async () => {
    if (!modalDuration || parseInt(modalDuration) <= 0) {
      setError('Please enter a valid duration in minutes');
      return;
    }
    setIsLoading({ active: true, message: 'Reactivating Statement...' });
    try {
      const data = await apiCall({
        action: 'toggleStatementActive',
        token,
        statementID: modalStatementID,
        isActive: true,
        durationMinutes: parseInt(modalDuration)
      });
      if (data && (data.success !== false)) {
        setSuccess(`Statement ${modalStatementID} reactivated`);
        setError(null);
        setIsModalOpen(false);
        setModalDuration('');
        await reloadStatements();
      } else {
        setError(data.error || 'Failed to reactivate');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading({ active: false, message: '' });
    }
  };

  // Resilient Vote Counter for Google Sheet / API payload formats
  const getVoteCounts = (data, targetID) => {
    if (!data) return { for: 0, against: 0, neutral: 0, total: 0, rows: [], scores: [] };

    const scoresList = Array.isArray(data.scores) ? data.scores : [];

    // Option 1: Direct aggregated object { for, against, neutral } or { agree, disagree, neutral }
    if (data.results && typeof data.results === 'object' && !Array.isArray(data.results)) {
      const agree = Number(data.results.agree ?? data.results.for ?? 0);
      const disagree = Number(data.results.disagree ?? data.results.against ?? 0);
      const neutral = Number(data.results.neutral ?? 0);
      return {
        for: agree,
        against: disagree,
        neutral: neutral,
        total: agree + disagree + neutral,
        rows: Array.isArray(data.votes) ? data.votes : [],
        scores: scoresList
      };
    }

    // Option 2: Array of Google Sheet vote rows (VoteID, UserID, StatementID, Vote, marks)
    const rawRows = Array.isArray(data) ? data : (
      Array.isArray(data.votes) ? data.votes : (
        Array.isArray(data.results) ? data.results : (
          Array.isArray(data.data) ? data.data : []
        )
      )
    );

    let forCount = 0;
    let againstCount = 0;
    let neutralCount = 0;
    const matchedRows = [];
    const searchTarget = String(targetID || '').toLowerCase();
    const latestVoteByUser = new Map();

    rawRows.forEach((row, idx) => {
      const rowStatement = String(row.StatementID || row.statementID || row.statement_id || '').toLowerCase();
      const isMatch = !searchTarget || 
                      rowStatement === searchTarget || 
                      rowStatement.replace(/[^a-z0-9]/g, '') === searchTarget.replace(/[^a-z0-9]/g, '');

      if (isMatch) {
        matchedRows.push(row);
        const userId = row.UserID || row.userID || row.user_id || `anon_${idx}`;
        const v = String(row.Vote || row.vote || '').toLowerCase();
        // Since logs are appended chronologically, later entries for the same user represent their current stance
        latestVoteByUser.set(userId, v);
      }
    });

    latestVoteByUser.forEach((v) => {
      if (v === 'agree' || v === 'for') {
        forCount++;
      } else if (v === 'disagree' || v === 'against') {
        againstCount++;
      } else if (v === 'neutral' || v === 'no_vote') {
        neutralCount++;
      }
    });

    // Calculate accurate deduplicated scores per user per statement (prevents 2.5 + 1.25 = 3.75 double-counting bug)
    let effectiveScores = scoresList;
    if (rawRows.length > 0) {
      const statementJudgeVoteMap = new Map();
      statements.forEach((s) => {
        const sId = String(s.statementID || '').toLowerCase();
        const jv = String(s.judgeVote || s.JudgeVote || '').toLowerCase();
        statementJudgeVoteMap.set(sId, jv);
      });

      const userVotesMap = new Map();
      rawRows.forEach((row, idx) => {
        const userId = String(row.UserID || row.userID || row.user_id || `User_${idx}`);
        const username = String(row.Username || row.username || userId);
        const rowStatement = String(row.StatementID || row.statementID || row.statement_id || '').toLowerCase();
        const vote = String(row.Vote || row.vote || '').toLowerCase();

        if (!userVotesMap.has(userId)) {
          userVotesMap.set(userId, { userId, username, votesByStatement: new Map() });
        }
        const userObj = userVotesMap.get(userId);
        if (!userObj.votesByStatement.has(rowStatement)) {
          userObj.votesByStatement.set(rowStatement, []);
        }
        userObj.votesByStatement.get(rowStatement).push(vote);
      });

      const calculated = [];
      userVotesMap.forEach((userObj) => {
        let totalScore = 0;
        userObj.votesByStatement.forEach((votesList, stmtId) => {
          const judgeVote = statementJudgeVoteMap.get(stmtId);
          if (!judgeVote) return;
          const isJudgeAgree = judgeVote === 'agree' || judgeVote === 'for';
          const isJudgeDisagree = judgeVote === 'disagree' || judgeVote === 'against';

          const finalVote = votesList[votesList.length - 1];
          const voteCount = votesList.length;

          if (finalVote === 'neutral' || finalVote === 'no_vote') {
            totalScore += 0;
          } else {
            const isUserAgree = finalVote === 'agree' || finalVote === 'for';
            const isUserDisagree = finalVote === 'disagree' || finalVote === 'against';
            const isCorrect = (isUserAgree && isJudgeAgree) || (isUserDisagree && isJudgeDisagree);

            if (isCorrect) {
              // 1st vote gets full +2.5. If changed (2nd vote), 50% penalty replaces the score -> exactly +1.25 (NOT 2.5 + 1.25 = 3.75)
              totalScore += voteCount > 1 ? 1.25 : 2.5;
            } else {
              // Incorrect vote gets -0.5
              totalScore -= 0.5;
            }
          }
        });

        calculated.push({
          userID: userObj.userId,
          username: userObj.username,
          score: Number(totalScore.toFixed(2))
        });
      });

      if (calculated.length > 0) {
        calculated.sort((a, b) => b.score - a.score);
        effectiveScores = calculated;
      }
    }

    return {
      for: forCount,
      against: againstCount,
      neutral: neutralCount,
      total: forCount + againstCount + neutralCount,
      rows: matchedRows,
      scores: effectiveScores
    };
  };

  const voteCounts = getVoteCounts(resultsData, selectedStatementForResults || statements[0]?.statementID);

  const chartData = {
    labels: ['Agree (For)', 'Disagree (Against)', 'Neutral'],
    datasets: [
      {
        label: 'Votes',
        data: [
          voteCounts.for,
          voteCounts.against,
          voteCounts.neutral
        ],
        backgroundColor: [
          '#16a34a', // Green for Agree
          '#dc2626', // Red for Disagree
          '#64748b'  // Slate Gray for Neutral
        ],
        borderColor: [
          '#15803d',
          '#b91c1c',
          '#475569'
        ],
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="p-4 sm:p-8 w-full max-w-5xl bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-3 pb-4 border-b-2 border-slate-200">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-extrabold text-slate-900">Judge Dashboard</h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
            Live Database Sync
          </span>
        </div>
        <button
          onClick={onLogout}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-semibold text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 font-semibold text-sm">
          {success}
        </div>
      )}

      {/* Judge Instructions & Feature Guide */}
      <div className="bg-orange-50/70 border border-orange-200 p-4 rounded-xl mb-8 text-slate-800 text-xs shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 text-orange-900 font-bold text-sm">
            <span>⚖️ Judge Panel Guidelines & Rules</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 pt-2 border-t border-orange-200/60 leading-relaxed font-medium">
          <div className="bg-white/80 p-2.5 rounded-lg border border-orange-100">
            <p className="font-bold text-orange-900 mb-0.5">1. Publish Motions</p>
            <p className="text-slate-600">Set statement text, select your hidden stance (Agree/Disagree), and set duration minutes.</p>
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-orange-100">
            <p className="font-bold text-orange-900 mb-0.5">2. Motion Control</p>
            <p className="text-slate-600">Activate or deactivate motions anytime. Participants receive new active motions automatically.</p>
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-orange-100">
            <p className="font-bold text-orange-900 mb-0.5">3. Live Leaderboard</p>
            <p className="text-slate-600">Scoring: <strong>+2.5 pts</strong> for correct stance, <strong>-0.5 pts</strong> for incorrect stance, <strong>0 pts</strong> for neutral, and <strong>+1.25 pts</strong> on changed votes.</p>
          </div>
        </div>
      </div>

      {/* Set New Statement */}
      <div className="bg-white border-2 border-slate-200 p-6 rounded-xl mb-8 shadow-sm">
        <h3 className="text-lg font-bold mb-4 text-slate-900">Set New Statement</h3>
        <form onSubmit={handleSetStatement} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Statement Text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter motion / statement"
              className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative custom-dropdown">
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Judge Stance</label>
              <div
                className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 cursor-pointer flex justify-between items-center"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="font-medium">
                  {judgeVote ? (judgeVote === 'agree' ? '✓ Agree' : '✗ Disagree') : 'Select stance'}
                </span>
                <span className="text-slate-400">▼</span>
              </div>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div
                    className="p-3 hover:bg-slate-100 cursor-pointer text-sm font-medium text-slate-700"
                    onClick={() => { setJudgeVote(''); setIsDropdownOpen(false); }}
                  >
                    Clear selection
                  </div>
                  <div
                    className="p-3 hover:bg-green-50 text-green-700 font-bold cursor-pointer text-sm"
                    onClick={() => { setJudgeVote('agree'); setIsDropdownOpen(false); }}
                  >
                    ✓ Agree
                  </div>
                  <div
                    className="p-3 hover:bg-red-50 text-red-700 font-bold cursor-pointer text-sm"
                    onClick={() => { setJudgeVote('disagree'); setIsDropdownOpen(false); }}
                  >
                    ✗ Disagree
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Duration (Minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Duration (e.g. 30)"
                className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                min="1"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-colors shadow-sm"
          >
            Publish Statement
          </button>
        </form>
      </div>

      {/* Statements Management */}
      <div className="bg-white border-2 border-slate-200 p-6 rounded-xl mb-8 shadow-sm">
        <h3 className="text-lg font-bold mb-4 text-slate-900">Statements Management</h3>
        {statements.length > 0 ? (
          <div className="space-y-3">
            {statements.map((s) => {
              const isExpired = s.expiresAt && new Date() >= s.expiresAt;
              const timeRemaining = s.expiresAt && s.isActive ? Math.max(0, Math.floor((s.expiresAt - new Date()) / 60000)) : 0;
              
              return (
                <div
                  key={s.statementID || s.StatementID}
                  className={`flex flex-col sm:flex-row sm:justify-between items-start sm:items-center p-4 bg-slate-50 border border-slate-200 rounded-lg gap-3 ${
                    !s.isActive ? 'bg-slate-100' : ''
                  }`}
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {s.text || s.Text} <span className="font-mono text-xs text-slate-500 font-normal">({s.statementID || s.StatementID})</span>
                    </p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">
                      Judge Stance: <span className="capitalize text-orange-600 font-bold">{s.judgeVote || s.JudgeVote || 'None'}</span> | Status: {
                        s.isActive ? (
                          <span className="text-green-600 font-bold">Active ({timeRemaining}m remaining)</span>
                        ) : (
                          <span className="text-slate-500 font-bold">Closed / Inactive</span>
                        )
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(s.statementID || s.StatementID, s.isActive)}
                    className={`px-4 py-2 rounded-lg font-bold text-xs text-white transition-colors ${
                      s.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {s.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No statements recorded yet.</p>
        )}
      </div>

      {/* Voting Outcome & Analytics */}
      <div className="bg-white border-2 border-slate-200 p-6 rounded-xl mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <h3 className="text-lg font-bold text-slate-900">Voting Outcome & Analytics</h3>
          <span className="text-xs text-orange-600 font-bold bg-orange-50 px-3 py-1 rounded-md border border-orange-200 w-fit">
            Google Sheets Database Synced
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <select
            value={selectedStatementForResults || (statements[0]?.statementID || statements[0]?.StatementID) || ''}
            onChange={(e) => {
              setSelectedStatementForResults(e.target.value);
              handleGetResults(e.target.value);
            }}
            className="flex-1 p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:border-orange-500 outline-none"
          >
            {statements.length > 0 ? (
              statements.map((s) => (
                <option key={s.statementID || s.StatementID} value={s.statementID || s.StatementID}>
                  [{s.statementID || s.StatementID}] {(s.text || s.Text || '').slice(0, 50)}... ({s.isActive ? 'Active' : 'Closed'})
                </option>
              ))
            ) : (
              <option value="">All Statements (S001 - S006)</option>
            )}
          </select>
          <button
            onClick={() => handleGetResults(selectedStatementForResults)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-lg font-bold text-sm"
          >
            Refresh Results
          </button>
        </div>

        <div className="space-y-6">
          {/* Only render breakdown charts if vote total > 0 */}
          {voteCounts.total > 0 && (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                  <p className="text-xs font-bold text-green-700 uppercase">AGREE (FOR)</p>
                  <p className="text-3xl font-black text-green-700 mt-1">{voteCounts.for}</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-center">
                  <p className="text-xs font-bold text-red-700 uppercase">DISAGREE (AGAINST)</p>
                  <p className="text-3xl font-black text-red-700 mt-1">{voteCounts.against}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-100 border border-slate-200 text-center">
                  <p className="text-xs font-bold text-slate-700 uppercase">NEUTRAL</p>
                  <p className="text-3xl font-black text-slate-700 mt-1">{voteCounts.neutral}</p>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 text-center">
                  <p className="text-xs font-bold text-orange-700 uppercase">TOTAL VOTES</p>
                  <p className="text-3xl font-black text-orange-700 mt-1">{voteCounts.total}</p>
                </div>
              </div>

              {/* Chart */}
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { color: '#334155', precision: 0 },
                        grid: { color: '#f1f5f9' }
                      },
                      x: {
                        ticks: { color: '#0f172a', font: { weight: 'bold', size: 12 } },
                        grid: { display: false }
                      }
                    },
                    plugins: {
                      legend: { display: false },
                      title: {
                        display: true,
                        text: `Voting Outcome Breakdown (${selectedStatementForResults || 'All Statements'})`,
                        color: '#0f172a',
                        font: { size: 14, weight: 'bold' }
                      }
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* Participant Scores & Leaderboard */}
          {voteCounts.scores && voteCounts.scores.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex justify-between items-center">
                <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                  Participant Scores Leaderboard ({voteCounts.scores.length} Participants)
                </h4>
                <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded border border-orange-200">
                  Google Sheet Synced
                </span>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">User ID</th>
                      <th className="p-3">Username</th>
                      <th className="p-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {voteCounts.scores.map((user, idx) => (
                      <tr key={user.userID || idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-500">#{idx + 1}</td>
                        <td className="p-3 font-mono text-slate-900 font-bold">{user.userID}</td>
                        <td className="p-3 text-slate-700 capitalize font-semibold">{user.username}</td>
                        <td className={`p-3 font-black text-sm ${
                          Number(user.score) > 0 ? 'text-green-600' :
                          Number(user.score) < 0 ? 'text-red-600' : 'text-slate-600'
                        }`}>
                          {Number(user.score) > 0 ? `+${user.score}` : user.score} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Google Sheets Detailed Votes Log Table */}
          {voteCounts.rows && voteCounts.rows.length > 0 && (
            <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Google Sheet Records Log ({voteCounts.rows.length} votes)
                </h4>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3">VoteID</th>
                      <th className="p-3">UserID</th>
                      <th className="p-3">StatementID</th>
                      <th className="p-3">Vote</th>
                      <th className="p-3">Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {voteCounts.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">{row.VoteID || row.voteID || `V${idx+1}`}</td>
                        <td className="p-3 font-mono text-slate-700">{row.UserID || row.userID}</td>
                        <td className="p-3 font-mono text-orange-600 font-bold">{row.StatementID || row.statementID}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            (String(row.Vote||row.vote).toLowerCase() === 'agree' || String(row.Vote||row.vote).toLowerCase() === 'for') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {row.Vote || row.vote}
                          </span>
                        </td>
                        <td className="p-3 font-bold">{row.marks ?? row.Marks ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleReactivateSubmit}
        title="Reactivate Statement"
        submitText="Activate"
      >
        <input
          type="number"
          value={modalDuration}
          onChange={(e) => setModalDuration(e.target.value)}
          placeholder="Duration (minutes)"
          className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-orange-500 outline-none"
          min="1"
        />
      </Modal>
    </div>
  );
}

export default JudgeDashboard;