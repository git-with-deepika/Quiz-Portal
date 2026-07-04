// routes/quiz.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth'); // make sure you have auth middleware
const Topic = require('../models/Topic');
const Result = require('../models/Result');

// Require login for all quiz routes
router.use(verifyToken);

// GET /api/quiz/topics — list all topics with icon
router.get('/topics', async (req, res) => {
  try {
    const topics = await Topic.find({}, 'name slug iconUrl').sort({ name: 1 }).lean();
    res.json(topics);
  } catch (err) {
    console.error('QUIZ_TOPICS_ERROR:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// GET /api/quiz/topics/:slug — single topic with its subtopics + sets
// (read-only, available to any logged-in user — used by index.html/sets.html)
router.get('/topics/:slug', async (req, res) => {
  try {
    const topic = await Topic.findOne(
      { slug: req.params.slug },
      'name slug iconUrl subtopics'
    ).lean();
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json(topic);
  } catch (err) {
    console.error('QUIZ_TOPIC_ERROR:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

// POST /api/quiz/submit — save a finished quiz attempt
router.post('/submit', async (req, res) => {
  try {
    const { score, total, topic, subtopic, set } = req.body || {};
    if (typeof score !== 'number' || typeof total !== 'number') {
      return res.status(400).json({ error: 'score and total are required numbers' });
    }
    const result = await Result.create({
      user: req.user.sub,
      score,
      total,
      topic: topic || null,
      subtopic: subtopic || null,
      set: set || null
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('QUIZ_SUBMIT_ERROR:', err?.message || err);
    res.status(500).json({ error: 'Failed to save result' });
  }
});

// GET /api/quiz/results — current user's quiz history (most recent first)
router.get('/results', async (req, res) => {
  try {
    const results = await Result.find({ user: req.user.sub })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    res.json(results);
  } catch (err) {
    console.error('QUIZ_RESULTS_ERROR:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

module.exports = router;

