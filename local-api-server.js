/**
 * Local Development API Server
 *
 * This server wraps the Vercel serverless functions for local testing.
 * Run with: node local-api-server.js
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Load environment variables from .env
require('dotenv').config();

// Import the matching API handler (we'll use tsx to run TypeScript)
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Local API server is running',
    timestamp: new Date().toISOString()
  });
});

// Matching API endpoint - proxies to the TypeScript function
app.all('/api/matching', async (req, res) => {
  try {
    console.log('[Local API] Matching request:', {
      method: req.method,
      action: req.query.action,
      body: req.body,
    });

    // Since we can't directly import TypeScript in Node.js without compilation,
    // we'll use a workaround: create a temp script that uses tsx to execute the function
    const { spawn } = require('child_process');

    // Create a bridge script that will execute the TypeScript function
    const reqData = {
      method: req.method,
      query: req.query,
      body: req.body,
    };

    const bridgeScript = `
const handler = require('./api/matching/index.ts').default;

const req = ${JSON.stringify(reqData)};

const res = {
  statusCode: 200,
  headers: {},
  setHeader: function(key, value) {
    this.headers[key] = value;
  },
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log(JSON.stringify({ statusCode: this.statusCode, data }));
  },
  end: function() {
    console.log(JSON.stringify({ statusCode: this.statusCode }));
  }
};

handler(req, res).catch(err => {
  console.error('Error:', err);
  console.log(JSON.stringify({
    statusCode: 500,
    data: { error: err.message, stack: err.stack }
  }));
});
    `;

    // Execute using tsx (TypeScript executor)
    const child = spawn('npx', ['tsx', '-e', bridgeScript], {
      cwd: __dirname,
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (stderr && !stdout) {
        console.error('[Local API] Error:', stderr);
        return res.status(500).json({
          error: 'Internal server error',
          details: stderr
        });
      }

      // Parse the last JSON output from stdout
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];

      try {
        const result = JSON.parse(lastLine);
        res.status(result.statusCode).json(result.data || {});
      } catch (parseError) {
        console.error('[Local API] Failed to parse response:', lastLine);
        res.status(500).json({
          error: 'Failed to parse API response',
          output: stdout,
          stderr: stderr
        });
      }
    });

  } catch (error) {
    console.error('[Local API] Error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Airtable API endpoints (if needed)
app.all('/api/airtable', async (req, res) => {
  res.status(501).json({
    error: 'Airtable API not implemented in local server yet',
    message: 'Use the deployed version or add the handler here'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║  Local Development API Server                  ║
║  ----------------------------------------      ║
║  Status:    Running ✓                          ║
║  Port:      ${PORT}                                 ║
║  API Base:  http://localhost:${PORT}/api           ║
║                                                ║
║  Endpoints:                                    ║
║  - GET  /api/health                            ║
║  - POST /api/matching?action=run               ║
║  - POST /api/matching?action=run-buyer         ║
║  - POST /api/matching?action=run-property      ║
║                                                ║
║  Environment:                                  ║
║  - AIRTABLE_API_KEY: ${process.env.AIRTABLE_API_KEY ? '✓ Set' : '✗ Not set'}           ║
║  - AIRTABLE_BASE_ID: ${process.env.AIRTABLE_BASE_ID ? '✓ Set' : '✗ Not set'}           ║
║                                                ║
║  Press Ctrl+C to stop                          ║
╚════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down local API server...');
  process.exit(0);
});
