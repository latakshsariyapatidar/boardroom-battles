const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Statement = require('../models/Statement');
const Vote = require('../models/Vote');

// POST /api (Handles all actions through single endpoint to match frontend pattern)
router.post('/', async (req, res) => {
  const { action, token, ...data } = req.body;

  try {
    // 1. LOGIN
    if (action === 'login') {
      const { username, password } = data;
      const user = await User.findOne({ username });
      if (!user || user.password !== password) {
        return res.json({ success: false, error: 'Invalid username or password' });
      }
      return res.json({ success: true, token: user.token, role: user.role });
    }

    // Auth check for protected routes
    let currentUser = null;
    if (token) {
      currentUser = await User.findOne({ token });
    }

    // 2. GET ACTIVE STATEMENT (For Participant)
    if (action === 'getStatement') {
      const statement = await Statement.findOne({ isActive: true }).sort({ createdAt: -1 });
      if (!statement) {
        return res.json({ success: false, error: 'No active statement available' });
      }

      let userVoteCount = 0;
      if (currentUser) {
        userVoteCount = await Vote.countDocuments({ 
          userID: currentUser.userID, 
          statementID: statement.statementID 
        });
      }

      return res.json({
        success: true,
        statementID: statement.statementID,
        text: statement.text,
        judgeVote: statement.judgeVote,
        durationMinutes: statement.durationMinutes,
        createdAt: statement.createdAt,
        isActive: statement.isActive,
        userVoteCount // Send how many times user voted on this specific statement
      });
    }

    // Ensure judge role for the rest (except vote)
    const isJudge = currentUser && currentUser.role === 'judge';

    // 3. GET ALL STATEMENTS (For Judge)
    if (action === 'getAllStatements') {
      if (!isJudge) return res.json({ success: false, error: 'Unauthorized' });
      const statements = await Statement.find().sort({ createdAt: -1 });
      return res.json({ success: true, statements });
    }

    // 4. SET STATEMENT (Judge creates new statement)
    if (action === 'setStatement') {
      if (!isJudge) return res.json({ success: false, error: 'Unauthorized' });
      const { text, judgeVote, durationMinutes } = data;
      
      // Deactivate all previous statements
      await Statement.updateMany({}, { isActive: false });

      const statementID = `ST-${Math.floor(1000 + Math.random() * 9000)}`;
      const newStatement = new Statement({
        statementID,
        text,
        judgeVote,
        durationMinutes,
        isActive: true
      });
      await newStatement.save();

      return res.json({ success: true, statementID });
    }

    // 5. TOGGLE STATEMENT ACTIVE
    if (action === 'toggleStatementActive') {
      if (!isJudge) return res.json({ success: false, error: 'Unauthorized' });
      const { statementID, isActive, durationMinutes } = data;
      
      if (isActive) {
        await Statement.updateMany({}, { isActive: false });
      }

      const updateData = { isActive };
      if (durationMinutes) updateData.durationMinutes = durationMinutes;

      await Statement.updateOne({ statementID }, { $set: updateData });
      return res.json({ success: true });
    }

    // 6. VOTE (Participant)
    if (action === 'vote') {
      if (!currentUser) return res.json({ success: false, error: 'Unauthorized' });
      const { statementID, vote } = data;

      const statement = await Statement.findOne({ statementID });
      if (!statement || !statement.isActive) {
        return res.json({ success: false, error: 'Statement is not active' });
      }

      // Enforce max 2 votes per statement
      const userVotes = await Vote.find({ userID: currentUser.userID, statementID }).sort({ createdAt: 1 });
      if (userVotes.length >= 2) {
        return res.json({ success: false, error: 'Maximum vote limit reached for this statement' });
      }

      let marks = 0;
      if (vote !== 'neutral' && vote !== 'no_vote') {
        const isUserAgree = vote === 'agree' || vote === 'for';
        const isUserDisagree = vote === 'disagree' || vote === 'against';
        const isJudgeAgree = statement.judgeVote === 'agree' || statement.judgeVote === 'for';
        const isJudgeDisagree = statement.judgeVote === 'disagree' || statement.judgeVote === 'against';
        const isCorrect = (isUserAgree && isJudgeAgree) || (isUserDisagree && isJudgeDisagree);

        if (isCorrect) {
          // If first vote: 2.5, if changed vote: 1.25
          marks = userVotes.length > 0 ? 1.25 : 2.5;
        } else {
          // Fixed penalty: -1.5 (was -2.5 before)
          marks = -1.5;
        }
      }

      const voteID = `V-${Math.floor(10000 + Math.random() * 90000)}`;
      const newVote = new Vote({
        voteID,
        userID: currentUser.userID,
        username: currentUser.username,
        statementID,
        vote,
        marks
      });
      await newVote.save();

      return res.json({ success: true });
    }

    // 7. GET RESULTS (Judge)
    if (action === 'getResults') {
      // Allow without judge token for real-time frontend recalculations, or enforce it
      const { statementID } = data;
      
      const statements = await Statement.find();
      const allVotes = await Vote.find().sort({ createdAt: 1 });
      
      const statementJudgeVoteMap = new Map();
      statements.forEach((s) => statementJudgeVoteMap.set(s.statementID, s.judgeVote));

      // Build scores list (deduplicated client-side style but computed server-side)
      const userVotesMap = new Map();
      allVotes.forEach((row) => {
        if (!userVotesMap.has(row.userID)) {
          userVotesMap.set(row.userID, { userID: row.userID, username: row.username, votesByStatement: new Map() });
        }
        const userObj = userVotesMap.get(row.userID);
        if (!userObj.votesByStatement.has(row.statementID)) {
          userObj.votesByStatement.set(row.statementID, []);
        }
        userObj.votesByStatement.get(row.statementID).push(row.vote);
      });

      const scores = [];
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
              totalScore += voteCount > 1 ? 1.25 : 2.5;
            } else {
              totalScore -= 1.5;
            }
          }
        });
        scores.push({
          userID: userObj.userID,
          username: userObj.username,
          score: Number(totalScore.toFixed(2))
        });
      });
      scores.sort((a, b) => b.score - a.score);

      // Current statement counts
      let forCount = 0;
      let againstCount = 0;
      let neutralCount = 0;
      let activeVotes = [];
      
      if (statementID) {
        const stmtVotes = allVotes.filter(v => v.statementID === statementID);
        const latestVoteByStmtUser = new Map();
        stmtVotes.forEach(v => {
          latestVoteByStmtUser.set(v.userID, v.vote);
        });

        latestVoteByStmtUser.forEach((v) => {
          const lv = String(v).toLowerCase();
          if (lv === 'agree' || lv === 'for') forCount++;
          else if (lv === 'disagree' || lv === 'against') againstCount++;
          else if (lv === 'neutral' || lv === 'no_vote') neutralCount++;
        });
        activeVotes = stmtVotes; // send all rows to frontend
      }

      return res.json({
        success: true,
        results: {
          for: forCount,
          against: againstCount,
          neutral: neutralCount,
          total: forCount + againstCount + neutralCount
        },
        votes: activeVotes, // Raw votes for JudgeDashboard matchedRows
        scores // Pre-calculated, correct deduplicated scores
      });
    }

    return res.json({ success: false, error: 'Unknown action' });

  } catch (error) {
    console.error('API Error:', error);
    return res.json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
