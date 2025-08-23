import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Modal from './Modal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

function JudgeDashboard({ token, onLogout, setIsLoading }) {
  const [text, setText] = useState('');
  const [judgeVote, setJudgeVote] = useState('');
  const [duration, setDuration] = useState('');
  const [statements, setStatements] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatementID, setModalStatementID] = useState(null);
  const [modalDuration, setModalDuration] = useState('');

  useEffect(() => {
    const fetchStatements = async () => {
      setIsLoading({ active: true, message: 'Loading Statements' });
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getAllStatements', token }),
        });
        const data = await response.json();
        if (data.success) {
          setStatements(data.statements.map(s => ({
            ...s,
            expiresAt: s.createdAt && s.durationMinutes
              ? new Date(new Date(s.createdAt).getTime() + s.durationMinutes * 60 * 1000)
              : null
          })));
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Network error: ' + err.message);
      } finally {
        setIsLoading({ active: false, message: '' });
      }
    };
    fetchStatements();
  }, [setIsLoading]);

  const handleSetStatement = async (e) => {
    e.preventDefault();
    if (!duration || parseInt(duration) <= 0) {
      setError('Please enter a valid duration in minutes');
      return;
    }
    setIsLoading({ active: true, message: 'Setting Statement' });
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setStatement', token, text, judgeVote, durationMinutes: parseInt(duration) }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Statement set successfully');
        setError(null);
        setText('');
        setJudgeVote('');
        setDuration('');
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getAllStatements', token }),
        });
        const newData = await response.json();
        if (newData.success) {
          setStatements(newData.statements.map(s => ({
            ...s,
            expiresAt: s.createdAt && s.durationMinutes
              ? new Date(new Date(s.createdAt).getTime() + s.durationMinutes * 60 * 1000)
              : null
          })));
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

  const handleToggleActive = async (statementID, isActive) => {
    setIsLoading({ active: true, message: isActive ? 'Deactivating Statement' : 'Preparing to Reactivate Statement' });
    try {
      if (!isActive) {
        setModalStatementID(statementID);
        setIsModalOpen(true);
      } else {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggleStatementActive', token, statementID, isActive: false }),
        });
        const data = await response.json();
        if (data.success) {
          setSuccess(`Statement ${statementID} deactivated`);
          setError(null);
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getAllStatements', token }),
          });
          const newData = await response.json();
          if (newData.success) {
            setStatements(newData.statements.map(s => ({
              ...s,
              expiresAt: s.createdAt && s.durationMinutes
                ? new Date(new Date(s.createdAt).getTime() + s.durationMinutes * 60 * 1000)
                : null
            })));
          }
        } else {
          setError(data.error);
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
    setIsLoading({ active: true, message: 'Reactivating Statement' });
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reactivateStatement',
          token,
          statementID: modalStatementID,
          durationMinutes: parseInt(modalDuration)
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(`Statement ${modalStatementID} reactivated with ${modalDuration} minutes duration`);
        setError(null);
        setIsModalOpen(false);
        setModalDuration('');
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getAllStatements', token }),
        });
        const newData = await response.json();
        if (newData.success) {
          setStatements(newData.statements.map(s => ({
            ...s,
            expiresAt: s.createdAt && s.durationMinutes
              ? new Date(new Date(s.createdAt).getTime() + s.durationMinutes * 60 * 1000)
              : null
          })));
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

  const handleGetResults = async () => {
    setIsLoading({ active: true, message: 'Loading Results' });
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getResults', token }),
      });
      const data = await response.json();
      if (data.success) {
        setResults(data.scores);
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

  const chartData = {
    labels: results ? results.map((r) => r.username) : [],
    datasets: [
      {
        label: 'Scores',
        data: results ? results.map((r) => r.score) : [],
        backgroundColor: 'var(--chart-bg)',
        borderColor: 'var(--chart-border)',
        borderWidth: 1,
      },
    ],
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, type: 'spring', damping: 15 } }
  };

  return (
    <motion.div
      className="p-4 sm:p-8 w-full max-w-5xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between items-center mb-6">
        <motion.h2
          className="text-xl sm:text-2xl font-bold text-[var(--text-heading)]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Judge Dashboard
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
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, type: 'spring', damping: 15 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--text-heading)]">Set New Statement</h3>
        <form onSubmit={handleSetStatement} className="space-y-4">
          <motion.input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter statement"
            className="w-full p-3 liquid-input rounded-lg"
            whileFocus={{ scale: 1.02 }}
          />
          <motion.select
            value={judgeVote}
            onChange={(e) => setJudgeVote(e.target.value)}
            className="w-full p-3 liquid-input rounded-lg"
            whileFocus={{ scale: 1.02 }}
          >
            <option value="">Select vote</option>
            <option value="agree"> Agree</option>
            <option value="disagree">Disagree</option>
          </motion.select>
          <motion.input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Duration (minutes)"
            className="w-full p-3 liquid-input rounded-lg"
            min="1"
            whileFocus={{ scale: 1.02 }}
          />
          <motion.button
            type="submit"
            className="w-full bg-[var(--button-bg)] text-white p-3 rounded-lg hover:bg-[var(--button-hover)] transition font-medium liquid-hover"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Set Statement
          </motion.button>
        </form>
      </motion.div>
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, type: 'spring', damping: 15 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--text-heading)]">Statements</h3>
        {statements.length > 0 ? (
          <div className="space-y-4">
            {statements.map((s) => (
              <motion.div
                key={s.statementID}
                className="flex flex-col sm:flex-row sm:justify-between items-center p-4 glass-card rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, type: 'spring', damping: 15 }}
              >
                <div className="mb-2 sm:mb-0">
                  <p className="text-[var(--text-secondary)]">
                    <span className="font-medium">{s.text}</span> (ID: {s.statementID}, Judge Vote: {s.judgeVote})
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {s.isActive ? (
                      s.expiresAt ? (
                        <span>Active until {s.expiresAt.toLocaleString()}</span>
                      ) : (
                        <span>Active</span>
                      )
                    ) : (
                      <span>Inactive</span>
                    )}
                  </p>
                </div>
                <motion.button
                  onClick={() => handleToggleActive(s.statementID, s.isActive)}
                  className={`p-2 rounded-lg font-medium text-white ${
                    s.isActive ? 'bg-[var(--error)] hover:bg-red-700' : 'bg-[var(--success)] hover:bg-green-700'
                  } liquid-hover`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {s.isActive ? 'Deactivate' : 'Activate'}
                </motion.button>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-[var(--text-secondary)]">No statements available</p>
        )}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, type: 'spring', damping: 15 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--text-heading)]">View Results</h3>
        <motion.button
          onClick={handleGetResults}
          className="w-full bg-[var(--button-bg)] text-white p-3 rounded-lg hover:bg-[var(--button-hover)] transition font-medium liquid-hover"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Get Results
        </motion.button>
        {results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Bar
              data={chartData}
              options={{
                responsive: true,
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Score', color: 'var(--text)' }, ticks: { color: 'var(--text)' } }, x: { ticks: { color: 'var(--text)' } } },
                plugins: { title: { display: true, text: 'Participant Scores', color: 'var(--text)' }, legend: { labels: { color: 'var(--text)' } } },
              }}
            />
            <ul className="list-disc pl-5 mt-4 text-[var(--text-secondary)]">
              {results.map((result) => (
                <li key={result.userID}>
                  {result.username} (ID: {result.userID}): {result.score}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </motion.div>
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
          className="w-full p-3 liquid-input rounded-lg"
          min="1"
        />
      </Modal>
    </motion.div>
  );
}

export default JudgeDashboard;