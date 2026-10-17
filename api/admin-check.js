import { verifySession } from '../server-lib/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json({ authenticated: verifySession(req) });
}
