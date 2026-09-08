export const env = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_IDS: (process.env.ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean),
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  CRON_SECRET: process.env.CRON_SECRET
};
export function isAdmin(id){ return env.ADMIN_IDS.includes(String(id)); }
