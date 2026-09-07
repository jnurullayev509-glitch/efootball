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
  ) {
    return null;
  }

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
      users: {}
    };
  }

  const r = await fetch(blob.url, {
    cache: 'no-store'
  });

  if (!r.ok) {
    return {
      players: {},
      results: {},
      users: {}
    };
  }

  const state = await r.json();

  if (!state.players) state.players = {};
  if (!state.results) state.results = {};
  if (!state.users) state.users = {};

  return state;
}

async function saveState(state) {
  return await put(
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
}

export default async function handler(req, res) {
  try {

    // =========================
    // GET — ma'lumotlarni olish
    // =========================
    if (req.method === 'GET') {
      const state = await readState();
      return res.status(200).json(state);
    }

    // =========================
    // POST — foydalanuvchini ro'yxatga olish
    // =========================
    if (req.method === 'POST') {

      const user = verifyTelegram(
        req.headers['x-telegram-init-data']
      );

      if (!user) {
        return res.status(401).json({
          error: 'Telegram authentication failed'
        });
      }

      const body =
        typeof req.body === 'string'
          ? JSON.parse(req.body)
          : req.body;

      if (body?.action !== 'register') {
        return res.status(400).json({
          error: 'Invalid action'
        });
      }

      const state = await readState();

      const userId = String(user.id);

      const fullName = [
        user.first_name,
        user.last_name
      ]
        .filter(Boolean)
        .join(' ');

      const username = user.username
        ? '@' + user.username
        : '';

      // Agar oldin ro'yxatdan o'tgan bo'lsa,
      // uning jamoasini saqlab qolamiz
      const oldUser = state.users[userId];

      state.users[userId] = {
        id: userId,
        name: fullName || username || 'Nomaʼlum',
        username: username,
        team: oldUser?.team || null
      };

      await saveState(state);

      return res.status(200).json({
        ok: true,
        user: {
          name: state.users[userId].name,
          username: state.users[userId].username,
          team: state.users[userId].team
        }
      });
    }

    // =========================
    // PUT — faqat admin uchun
    // =========================
    if (req.method === 'PUT') {

      const user = verifyTelegram(
        req.headers['x-telegram-init-data']
      );

      if (!user) {
        return res.status(401).json({
          error: 'Telegram authentication failed'
        });
      }

      const admins = String(
        process.env.ADMIN_IDS || ''
      )
        .split(',')
        .map(x => x.trim())
        .filter(Boolean);

      if (!admins.includes(String(user.id))) {
        return res.status(403).json({
          error: 'Admin only'
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

      // users yo'qolib ketmasligi uchun
      if (!state.users) {
        state.users = {};
      }

      const blob = await saveState(state);

      return res.status(200).json({
        ok: true,
        url: blob.url
      });
    }

    return res.status(405).json({
      error: 'Method not allowed'
    });

  } catch (e) {

    console.error(e);

    return res.status(500).json({
      error: 'Server error'
    });
  }
}
