import { put, list } from '@vercel/blob';
import crypto from 'crypto';

const PATH = 'efpl/state.json';

function verifyTelegram(initData) {
  if (!initData || !process.env.BOT_TOKEN) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.BOT_TOKEN)
    .digest();

  const calculated = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  if (
    calculated.length !== hash.length ||
    !crypto.timingSafeEqual(
      Buffer.from(calculated),
      Buffer.from(hash)
    )
  ) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

async function readState() {
  const { blobs } = await list({
    prefix: PATH,
    limit: 10,
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  const blob = blobs.find(b => b.pathname === PATH);

  if (!blob) {
    return {
      players: {},
      results: {},
      chats: {},
      deadline: '00:00'
    };
  }

  const r = await fetch(blob.url, { cache: 'no-store' });

  if (!r.ok) {
    return {
      players: {},
      results: {},
      chats: {},
      deadline: '00:00'
    };
  }

  return await r.json();
}

function username(user) {
  return String(user?.username || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
}

function isAdmin(user) {
  const admins = String(process.env.ADMIN_IDS || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

  return admins.includes(String(user?.id));
}

function isParticipant(user, state) {
  const u = username(user);

  if (!u) return false;

  return Object.values(state.players || {}).some(
    p => username({ username: p.username }) === u
  );
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const state = await readState();
      return res.status(200).json(state);
    }

    if (req.method !== 'PUT') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const user = verifyTelegram(
      req.headers['x-telegram-init-data']
    );

    if (!user) {
      return res.status(401).json({
        error: 'Telegram authentication failed'
      });
    }

    const state =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body;

    if (!state || typeof state !== 'object') {
      return res.status(400).json({
        error: 'Invalid state'
      });
    }

    const admin = isAdmin(user);
    const participant = isParticipant(user, state);

    if (!admin && !participant) {
      return res.status(403).json({
        error: 'Siz ro‘yxatdan o‘tgan ishtirokchi emassiz'
      });
    }

    const current = await readState();

    if (!admin) {
      state.players = current.players || {};
      state.deadline = current.deadline || '00:00';
    }

    const blob = await put(
      PATH,
      JSON.stringify(state),
      {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        allowOverwrite: true
      }
    );

    return res.status(200).json({
      ok: true,
      url: blob.url
    });

  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: 'Server error'
    });
  }
}
