export const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export const username=u=>u?.username?`@${esc(u.username)}`:esc([u?.first_name,u?.last_name].filter(Boolean).join(' ')||String(u?.telegram_id||''));
export const hoursLeft=until=>Math.max(0,Math.ceil((new Date(until)-Date.now())/3600000));
export function parseScore(s){const m=String(s).trim().match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);return m?{home:+m[1],away:+m[2]}:null;}
