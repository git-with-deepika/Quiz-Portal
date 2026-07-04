// models/Topic.js
const mongoose = require('mongoose');

const SetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true }
});

const SubtopicSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  slug:     { type: String, required: true },
  sets:     { type: [SetSchema], default: [] }
});

const TopicSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  slug:      { type: String, required: true, unique: true },
  iconUrl:   { type: String, default: '' },       // ← URL to an SVG or image
  subtopics: { type: [SubtopicSchema], default: [] }
});

module.exports = mongoose.model('Topic', TopicSchema);

