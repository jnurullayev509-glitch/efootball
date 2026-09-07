import { put, list } from '@vercel/blob';
import crypto from 'crypto';

const PATH = 'efpl/state.json'; const TEAMS = [
  "AFC Bournemouth",
  "Arsenal",
  "Aston Villa",
  "Brentford",
  "Brighton & Hove Albion",
  "Chelsea",
  "Coventry City",
  "Crystal Palace",
  "Everton",
  "Fulham",
  "Hull City",
  "Ipswich Town",
  "Leeds United",
  "Liverpool",
  "Manchester City",
  "Manchester United",
  "Newcastle United",
  "Nottingham Forest",
  "Sunderland",
  "Tottenham Hotspur"
];

const EMPTY_STATE = {
  players: {},
  results: {},
  chats: {},
  deadline: '00:00'
};

function getUsername(user) {
  return String(user?.username || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
}

function verifyTelegram(initData) {
  if (!initData || !process.env.BOT_TOKEN) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) return null;

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
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

function isAdmin(user) {
  const admins = String(process.env.ADMIN_IDS || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

  return admins.includes(String(user?.id));
}

async function readState() {
  try {
    const { blobs } = await list({
      prefix: PATH,
      limit: 10,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    const blob = blobs.find(
      item => item.pathname === PATH
    );

    if (!blob) return { ...EMPTY_STATE };

    const response = await fetch(
      blob.url,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return { ...EMPTY_STATE };
    }

    const data = await response.json();

    return {
      players: data.players || {},
      results: data.results || {},
      chats: data.chats || {},
      deadline: data.deadline || '00:00'
    };

  } catch (error) {
    console.error('READ ERROR:', error);
    return { ...EMPTY_STATE };
  }
}

function cleanUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
}

function playerOwnsTeam(user, team, state) {
  const username = getUsername(user);

  if (!username) return false;

  const player = state.players?.[team];

  if (!player) return false;

  return cleanUsername(player.username) === username;
}

function userOwnsMatch(user, home, away, state) {
  return (
    playerOwnsTeam(user, home, state) ||
    playerOwnsTeam(user, away, state)
  );
}

function validatePlayers(players) {
  if (!players || typeof players !== 'object') {
    return {};
  }

  const output = {};

  for (const [team, player] of Object.entries(players)) {
    if (!player || typeof player !== 'object') continue;

    const username = cleanUsername(player.username);
    const name = String(player.name || '').trim();

    if (!username || !name) continue;

    output[team] = {
      name,
      username
    };
  }

  return output;
}

function validateResults(results) {
  if (!results || typeof results !== 'object') {
    return {};
  }

  const output = {};

  for (const [key, value] of Object.entries(results)) {
    if (!value || typeof value !== 'object') continue;

    const x = Number(value.x);
    const y = Number(value.y);

    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      y < 0
    ) {
      continue;
    }

    output[key] = {
      r: Number(value.r),
      h: String(value.h),
      a: String(value.a),
      x,
      y,
      updatedBy: String(value.updatedBy || ''),
      updatedAt: String(
        value.updatedAt || new Date().toISOString()
      )
    };
  }

  return output;
}

function validateChats(chats) {
  if (!chats || typeof chats !== 'object') {
    return {};
  }

  const output = {};

  for (const [key, messages] of Object.entries(chats)) {
    if (!Array.isArray(messages)) continue;

    output[key] = messages
      .filter(
        message =>
          message &&
          typeof message === 'object' &&
          String(message.text || '').trim()
      )
      .slice(-100)
      .map(message => ({
        username: cleanUsername(message.username),
        text: String(message.text).trim().slice(0, 1000),
        time: String(
          message.time || new Date().toISOString()
        )
      }));
  }

  return output;
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

    const current = await readState();

    const incoming =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body;

    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({
        error: 'Invalid state'
      });
    }

    const admin = isAdmin(user); /*
 * ISHTIROKCHINI O'ZI RO'YXATDAN O'TKAZISH
 *
 * Faqat Telegram username orqali aniqlanadi.
 * Ishtirokchi jamoani o'zi tanlaydi.
 */

if (incoming.action === 'register') {

  const username = getUsername(user);

  if (!username) {
    return res.status(403).json({
      error:
        'Telegram username mavjud emas. Avval Telegram profilingizga username qo‘ying.'
    });
  }

  const name = String(incoming.name || '').trim();
  const team = String(incoming.team || '').trim();

  if (!name) {
    return res.status(400).json({
      error: 'Ismingizni kiriting.'
    });
  }

  if (name.length > 50) {
    return res.status(400).json({
      error: 'Ism 50 belgidan oshmasligi kerak.'
    });
  }

  if (!TEAMS.includes(team)) {
    return res.status(400).json({
      error: 'Noto‘g‘ri jamoa tanlandi.'
    });
  }

  /*
   * Bu username oldin ro'yxatdan o'tganmi?
   */

  const alreadyRegistered = Object.entries(
    current.players || {}
  ).find(
    ([, player]) =>
      cleanUsername(player?.username) === username
  );

  if (alreadyRegistered) {
    return res.status(409).json({
      error:
        `Siz allaqachon ${alreadyRegistered[0]} jamoasiga ro‘yxatdan o‘tgansiz.`
    });
  }

  /*
   * Bu jamoani boshqa odam egallaganmi?
   */

  if (current.players?.[team]) {
    return res.status(409).json({
      error:
        `${team} jamoasi allaqachon tanlangan. Boshqa jamoani tanlang.`
    });
  }

  /*
   * Yangi ishtirokchini qo'shamiz.
   */

  const newState = {
    players: {
      ...(current.players || {}),
      [team]: {
        name,
        username
      }
    },
    results: current.results || {},
    chats: current.chats || {},
    deadline: current.deadline || '00:00'
  };

  const blob = await put(
    PATH,
    JSON.stringify(newState),
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
    message: 'Ro‘yxatdan o‘tish muvaffaqiyatli.',
    team,
    username,
    url: blob.url
  });
}

    const newState = {
      players: current.players || {},
      results: current.results || {},
      chats: current.chats || {},
      deadline: current.deadline || '00:00'
    };

    /*
     * ADMIN
     * Hammasini boshqarishi mumkin.
     */

    if (admin) {

      newState.players =
        validatePlayers(incoming.players);

      newState.results =
        validateResults(incoming.results);

      newState.chats =
        validateChats(incoming.chats);

      newState.deadline =
        String(incoming.deadline || '00:00');

    } else {

      /*
       * ISHTIROKCHI
       *
       * Jamoalarni o‘zgartira olmaydi.
       * Deadline'ni o‘zgartira olmaydi.
       * Faqat o‘z o‘yini natijasi va
       * o‘z o‘yinidagi chatni o‘zgartira oladi.
       */

      const username = getUsername(user);

      if (!username) {
        return res.status(403).json({
          error:
            'Telegram username mavjud emas. Telegram profilingizga username qo‘ying.'
        });
      }

      const participantTeams =
        Object.entries(current.players || {})
          .filter(
            ([, player]) =>
              cleanUsername(player.username) === username
          )
          .map(([team]) => team);

      if (participantTeams.length === 0) {
        return res.status(403).json({
          error:
            'Siz hali hech qaysi jamoaga biriktirilmagansiz.'
        });
      }

      const incomingResults =
        validateResults(incoming.results);

      for (const [key, value] of Object.entries(
        incomingResults
      )) {

        const owns =
          participantTeams.includes(value.h) ||
          participantTeams.includes(value.a);

        if (!owns) continue;

        newState.results[key] = value;
      }

      /*
       * Chatlar
       */

      const incomingChats =
        validateChats(incoming.chats);

      for (const [key, messages] of Object.entries(
        incomingChats
      )) {

        const parts = key.split('|');

        if (parts.length < 3) continue;

        const home = parts[1];
        const away = parts.slice(2).join('|');

        const owns =
          participantTeams.includes(home) ||
          participantTeams.includes(away);

        if (!owns) continue;

        newState.chats[key] = messages;
      }
    }

    const blob = await put(
      PATH,
      JSON.stringify(newState),
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

  } catch (error) {

    console.error('STATE ERROR:', error);

    return res.status(500).json({
      error: 'Server error'
    });
  }
    }
