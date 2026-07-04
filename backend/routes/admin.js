// routes/admin.js
const express = require('express');
const Topic   = require('../models/Topic');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');

// Every route below requires a logged-in admin.
// (Previously these routes had NO auth check at all — anyone could
// create/delete topics. This closes that gap.)
router.use(verifyToken, requireRole('admin'));

// List all topics
router.get('/topics', async (req, res) => {
  try {
    const topics = await Topic.find();
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// Create topic
router.post('/topics', async (req, res) => {
  const { name, slug, iconUrl } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  try {
    const topic = new Topic({ name, slug, iconUrl });
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete topic
router.delete('/topics/:topicSlug', async (req, res) => {
  const deleted = await Topic.findOneAndDelete({ slug: req.params.topicSlug });
  if (!deleted) return res.status(404).json({ error: 'Topic not found' });
  res.json({ success: true });
});

// Add subtopic
router.post('/topics/:topicSlug/subtopics', async (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  const topic = await Topic.findOne({ slug: req.params.topicSlug });
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  topic.subtopics.push({ name, slug, sets: [] });
  await topic.save();
  res.json(topic);
});

// Delete subtopic
router.delete(
  '/topics/:topicSlug/subtopics/:subSlug',
  async (req, res) => {
    const { topicSlug, subSlug } = req.params;
    const topic = await Topic.findOne({ slug: topicSlug });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    topic.subtopics = topic.subtopics.filter(st => st.slug !== subSlug);
    await topic.save();
    res.json({ success: true });
  }
);

// Add set
router.post(
  '/topics/:topicSlug/subtopics/:subSlug/sets',
  async (req, res) => {
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
    const topic = await Topic.findOne({ slug: req.params.topicSlug });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    const sub = topic.subtopics.find(st => st.slug === req.params.subSlug);
    if (!sub) return res.status(404).json({ error: 'Subtopic not found' });
    sub.sets.push({ name, slug });
    await topic.save();
    res.json(sub);
  }
);

// Delete set
router.delete(
  '/topics/:topicSlug/subtopics/:subSlug/sets/:setSlug',
  async (req, res) => {
    const { topicSlug, subSlug, setSlug } = req.params;
    const topic = await Topic.findOne({ slug: topicSlug });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    const sub = topic.subtopics.find(st => st.slug === subSlug);
    if (!sub) return res.status(404).json({ error: 'Subtopic not found' });
    sub.sets = sub.sets.filter(s => s.slug !== setSlug);
    await topic.save();
    res.json({ success: true });
  }
);

module.exports = router;

