import {createClient} from '@supabase/supabase-js';
import {env} from './config.js';
export const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
export async function one(table,filters){let q=db.from(table).select('*');for(const [k,v] of Object.entries(filters))q=q.eq(k,v);const {data,error}=await q.maybeSingle();if(error)throw error;return data;}
export async function many(table,filters={},order){let q=db.from(table).select('*');for(const [k,v] of Object.entries(filters))q=q.eq(k,v);if(order)q=q.order(order.col,{ascending:order.asc??true});const {data,error}=await q;if(error)throw error;return data||[];}
export async function ins(table,row){const {data,error}=await db.from(table).insert(row).select().single();if(error)throw error;return data;}
export async function upd(table,filters,patch){let q=db.from(table).update(patch);for(const [k,v] of Object.entries(filters))q=q.eq(k,v);const {data,error}=await q.select();if(error)throw error;return data;}
