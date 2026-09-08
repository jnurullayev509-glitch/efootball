# eFootball Premier League Telegram Bot — Vercel + Supabase

## 1. Kerak bo‘ladiganlar
- Telegram BotFather'dan bot token
- Vercel account
- Supabase project
- GitHub repository

## 2. Supabase
SQL Editor'da `supabase.sql` faylini to‘liq ishga tushiring.

## 3. Vercel Environment Variables
`.env.example` dagi qiymatlarni Vercel → Settings → Environment Variables ga kiriting:
- BOT_TOKEN
- ADMIN_IDS
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- WEBHOOK_SECRET
- CRON_SECRET

## 4. Deploy
GitHub'ga shu loyiha fayllarini yuklang va Vercel'da repo'ni import qiling.

## 5. Telegram webhook
Deploydan keyin quyidagiga o‘xshash URL orqali Telegram webhook'ni bir marta o‘rnating:
`https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<YOUR-VERCEL-DOMAIN>/api/webhook&secret_token=<WEBHOOK_SECRET>`

## 6. Mavsum yaratish
Supabase SQL Editor'da `new_season.sql` dagi blokni ishlating. Bu 20 klubni, 38 roundni va 380 matchni yaratadi.

## Muhim
- Telegram inline button ichida haqiqiy rasm/emblem ko‘rsatib bo‘lmaydi. `clubs.logo_url` ustuni keyin rasm URL'lari uchun tayyor.
- Har tur 24 soat. 1 soat qolganda ogohlantirish.
- Deadline'da tasdiqlanmagan match 0:0 bo‘ladi.
- 2 tur/kun qoidasi admin tomonidan 2 ta roundni ochish orqali boshqariladi.
