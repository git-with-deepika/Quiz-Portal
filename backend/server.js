require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // fix for Node.js SRV lookup failing on some Windows setups
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const authRoutes    = require('./routes/auth');
const quizRoutes    = require('./routes/quiz');
const adminRoutes   = require('./routes/admin');   // <-- mount admin CRUD routes
const contactRoutes  = require('./routes/contact');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/admin', adminRoutes);             // <-- admin API
app.use('/api/contact', contactRoutes);

// Note: Your quiz front-end remains on S3, so we do NOT serve other static files here.
// The old standalone /admin static panel was removed because /api/admin/* now
// requires a logged-in admin (JWT + role check). Use the "Admin" link on the
// main site (admin.html) instead — it's the same feature set, but properly
// authenticated through the normal login flow.

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
