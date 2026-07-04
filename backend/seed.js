// seed.js
// Populates initial Topics/Subtopics/Sets metadata + an admin user.
// Run with: node seed.js   (or: npm run seed)
//
// The actual quiz QUESTION content lives as static JSON files served by
// the front-end (see /quizzes/<topic>/<subtopic>/<set>.json at the project
// root). This script only seeds the matching metadata so the
// Topics -> Subtopics -> Sets navigation works end-to-end.

require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // fix for Node.js SRV lookup failing on some Windows setups
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Topic = require('./models/Topic');
const User = require('./models/User');

const topicsSeed = [
  {
    name: 'AWS',
    slug: 'aws',
    iconUrl: '/icons/aws.svg',
    subtopics: [
      {
        name: 'EC2',
        slug: 'ec2',
        sets: [
          { name: 'EC2 — Set 1', slug: 'set-1' },
          { name: 'EC2 — Set 2', slug: 'set-2' }
        ]
      },
      {
        name: 'S3',
        slug: 's3',
        sets: [{ name: 'S3 — Set 1', slug: 'set-1' }]
      },
      {
        name: 'IAM',
        slug: 'iam',
        sets: [{ name: 'IAM — Set 1', slug: 'set-1' }]
      }
    ]
  },
  {
    name: 'Docker',
    slug: 'docker',
    iconUrl: '',
    subtopics: [
      {
        name: 'Basics',
        slug: 'basics',
        sets: [{ name: 'Basics — Set 1', slug: 'set-1' }]
      }
    ]
  }
];

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set. Add it to your .env file before seeding.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected for seeding');

  for (const t of topicsSeed) {
    const existing = await Topic.findOne({ slug: t.slug });
    if (existing) {
      console.log(`↷ Topic "${t.slug}" already exists, skipping`);
      continue;
    }
    await Topic.create(t);
    console.log(`＋ Created topic "${t.slug}"`);
  }

  // Optional: create a first admin user from env vars, if provided
  // and not already present.
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existingAdmin) {
      console.log(`↷ Admin user "${ADMIN_EMAIL}" already exists, skipping`);
    } else {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await User.create({
        name: ADMIN_NAME || 'Admin',
        email: ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: 'admin'
      });
      console.log(`＋ Created admin user "${ADMIN_EMAIL}"`);
    }
  } else {
    console.log('ℹ No ADMIN_EMAIL/ADMIN_PASSWORD set — skipped admin user creation.');
    console.log('  To create one later: sign up normally, then in MongoDB set that user\'s role to "admin".');
  }

  await mongoose.disconnect();
  console.log('✅ Seeding complete');
}

run().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});