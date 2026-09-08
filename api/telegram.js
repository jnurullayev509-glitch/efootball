import { env } from './config.js';
export async function tg(method, body={}) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const j = await r.json(); if(!j.ok) throw new Error(`${method}: ${j.description}`); return j.result;
}
export const send = (chat_id,text,extra={}) => tg('sendMessage',{chat_id,text,parse_mode:'HTML',...extra});
export const edit = (chat_id,message_id,text,extra={}) => tg('editMessageText',{chat_id,message_id,text,parse_mode:'HTML',...extra});
export const answer = (callback_query_id,text='') => tg('answerCallbackQuery',{callback_query_id,text});
