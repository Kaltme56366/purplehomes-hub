/**
 * Local Development API Server
 * Runs the Vercel serverless functions locally on port 3001
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Register ts-node ONCE at startup with transpileOnly to skip type checking
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true,
  }
});

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Import handlers once at startup
const ghlHandler = require('./api/ghl/index.ts').default;

// Dynamically import and run the serverless functions
app.all('/api/ghl', async (req, res) => {
  try {
    await ghlHandler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import other handlers
const matchingHandler = require('./api/matching/index.ts').default;
const airtableHandler = require('./api/airtable/index.ts').default;
const cacheHandler = require('./api/cache/index.ts').default;

app.all('/api/matching', async (req, res) => {
  try {
    await matchingHandler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.all('/api/airtable', async (req, res) => {
  try {
    await airtableHandler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.all('/api/cache', async (req, res) => {
  try {
    await cacheHandler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`);
  console.log(`   - /api/ghl`);
  console.log(`   - /api/matching`);
  console.log(`   - /api/airtable`);
  console.log(`   - /api/cache\n`);
});
