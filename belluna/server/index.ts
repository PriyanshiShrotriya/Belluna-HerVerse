import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 8788;

app.use(express.json({ limit: '10kb' }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local'
  );
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', aiProviderEnabled: process.env.AI_PROVIDER_ENABLED === 'true' });
});

app.post('/api/health-ai', async (req, res) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token || token.length > 8192) {
      res.status(401).json({ error: 'Invalid access token.' });
      return;
    }

    const question = req.body?.question;

    if (
      typeof question !== 'string' ||
      question.trim().length === 0 ||
      question.length > 1000
    ) {
      res.status(400).json({
        error: 'Question must contain 1–1000 characters.',
      });
      return;
    }

    // Create a client scoped to this user's access token.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the token with Supabase Auth.
    const { data: userData, error: authError } =
      await userClient.auth.getUser(token);

    if (authError || !userData.user) {
      res.status(401).json({ error: 'Invalid or expired session.' });
      return;
    }

    // Keep provider calls disabled until a provider and safety checks
    // have been implemented. Do not consume quota for a disabled feature.
    if (process.env.AI_PROVIDER_ENABLED !== 'true') {
      res.status(503).json({
        error: 'AI assistance is temporarily unavailable.',
        code: 'AI_PROVIDER_DISABLED',
      });
      return;
    }

    // This RPC runs under the authenticated user's JWT.
    // Any RPC error or non-true result must stop the request.
    const { data: quotaAllowed, error: quotaError } =
      await userClient.rpc('consume_ai_quota');

    if (quotaError || quotaAllowed !== true) {
      if (quotaError) {
        console.error('AI quota check failed:', quotaError.message);
      }

      res.status(quotaError ? 503 : 429).json({
        error: quotaError
          ? 'Unable to verify usage limits. Please try again later.'
          : 'Your daily AI usage limit has been reached.',
        code: quotaError ? 'QUOTA_CHECK_FAILED' : 'QUOTA_EXCEEDED',
      });
      return;
    }

    // SAFETY: The quota check is in place, but provider integration
    // is intentionally not implemented yet.
    res.status(503).json({
      error: 'AI provider integration is not implemented yet.',
      code: 'PROVIDER_NOT_IMPLEMENTED',
    });
  } catch (error) {
    console.error('Health AI API error:', error);

    res.status(500).json({
      error: 'An unexpected server error occurred.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`HerVerse API listening on http://localhost:${PORT}`);
});
