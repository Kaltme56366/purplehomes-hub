/**
 * Authentication API Handler
 *
 * Handles user authentication with Airtable Users table:
 * - signup: Register new users with hashed passwords
 * - login: Authenticate users and return user data
 *
 * Route: /api/auth?action=<action>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

const SALT_ROUNDS = 10;

/**
 * Fetch with automatic retry on rate limit errors (429)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[Auth] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(url, options);

      if (response.status === 429 && attempt < maxRetries) {
        console.warn(`[Auth] Rate limited (429) on attempt ${attempt + 1}/${maxRetries + 1}, will retry...`);
        lastError = new Error(`Rate limited: ${response.statusText}`);
        continue;
      }

      return response;
    } catch (error: any) {
      console.error(`[Auth] Fetch error on attempt ${attempt + 1}:`, error.message);
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Auth API] Request:', {
    method: req.method,
    action: req.query.action,
    timestamp: new Date().toISOString(),
  });

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('[Auth API] Missing credentials!');
    return res.status(500).json({
      error: 'Airtable credentials not configured',
    });
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const { action } = req.query;

  try {
    switch (action) {
      case 'signup':
        return handleSignup(req, res, headers);

      case 'login':
        return handleLogin(req, res, headers);

      case 'hash-password':
        // Utility endpoint to hash an existing plain text password
        return handleHashPassword(req, res);

      default:
        return res.status(400).json({ error: 'Unknown action', action });
    }
  } catch (error: any) {
    console.error('[Auth API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

async function handleSignup(req: VercelRequest, res: VercelResponse, headers: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['email', 'password', 'name'],
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  console.log(`[Auth] Signup attempt for: ${email}`);

  try {
    // Check if user already exists
    const checkFormula = encodeURIComponent(`{Email} = "${email}"`);
    const checkResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users?filterByFormula=${checkFormula}`,
      { headers }
    );

    if (!checkResponse.ok) {
      throw new Error(`Failed to check existing user: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();

    if (checkData.records && checkData.records.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the user in Airtable
    const createResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fields: {
            Email: email,
            Password: hashedPassword,
            Name: name,
            Role: role || 'User',
          },
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Auth] Create user error:', errorText);
      throw new Error(`Failed to create user: ${createResponse.status}`);
    }

    const userData = await createResponse.json();

    console.log(`[Auth] User created successfully: ${email}`);

    // Return user data (without password)
    return res.status(201).json({
      success: true,
      user: {
        id: userData.id,
        email: userData.fields.Email,
        name: userData.fields.Name,
        role: userData.fields.Role,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Signup error:', error);
    throw error;
  }
}

async function handleLogin(req: VercelRequest, res: VercelResponse, headers: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['email', 'password'],
    });
  }

  console.log(`[Auth] Login attempt for: ${email}`);

  try {
    // Find user by email
    const formula = encodeURIComponent(`{Email} = "${email}"`);
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users?filterByFormula=${formula}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      console.log(`[Auth] User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = data.records[0];
    const storedPassword = user.fields.Password;

    if (!storedPassword) {
      console.log(`[Auth] No password set for user: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare passwords
    // Check if password is hashed (bcrypt hashes start with $2)
    let isValidPassword = false;

    if (storedPassword.startsWith('$2')) {
      // Password is hashed, use bcrypt compare
      isValidPassword = await bcrypt.compare(password, storedPassword);
    } else {
      // Password is plain text (legacy) - compare directly
      // Note: This is for backward compatibility during migration
      isValidPassword = password === storedPassword;

      if (isValidPassword) {
        // Upgrade to hashed password
        console.log(`[Auth] Upgrading plain text password to hashed for: ${email}`);
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        await fetchWithRetry(
          `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users/${user.id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              fields: { Password: hashedPassword },
            }),
          }
        );
      }
    }

    if (!isValidPassword) {
      console.log(`[Auth] Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`[Auth] Login successful: ${email}`);

    // Return user data (without password)
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.fields.Email,
        name: user.fields.Name,
        role: user.fields.Role,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    throw error;
  }
}

async function handleHashPassword(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  return res.status(200).json({
    original: password,
    hashed: hashedPassword,
    message: 'Use this hashed password in your Airtable Users table',
  });
}
