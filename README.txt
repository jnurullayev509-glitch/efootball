EFOOTBALL PREMIER LEAGUE — SHARED VERCEL VERSION

Bu loyiha Telegram Mini App uchun tayyorlangan umumiy (shared) versiya.

Nimalar bor:
- 20 ta 2026/27 Premier League jamoasi
- 38 tur
- 380 ta uy/safar o'yini
- avtomatik turnir jadvali
- Telegram foydalanuvchisini aniqlash
- server tomonda Telegram initData orqali ADMIN tekshiruvi
- admin panel: ishtirokchi biriktirish va natija kiritish
- barcha foydalanuvchilar uchun umumiy natijalar
- Vercel Blob orqali doimiy saqlash

DEPLOY:
1. Vercel'da yangi loyiha yarating va shu papkadagi fayllarni yuklang.
2. Vercel Storage/Marketplace orqali Blob Storage yarating va loyihaga ulang.
3. Environment Variables qo'shing:
   BOT_TOKEN = @BotFather bergan bot token
   ADMIN_IDS = sizning Telegram numeric ID'ingiz (bir nechta bo'lsa vergul bilan)
   BLOB_READ_WRITE_TOKEN = Blob ulanishidan keladigan token (Vercel ulashi mumkin)
4. Redeploy qiling.
5. Telegram botingizdagi Mini App/Web App URL'ni yangi Vercel domeniga o'zgartiring.

MUHIM:
- Oddiy foydalanuvchi Admin panelni ko'rmaydi.
- Admin huquqi server tomonda tekshiriladi; faqat HTML ichidagi ID'ga tayanilmaydi.
- Natijalar localStorage'da emas, umumiy server storage'da saqlanadi.
- Vercel Functions server-side API ishlatadi.
