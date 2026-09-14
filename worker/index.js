import {validateSubscription,sendPush,b64} from './webpush.js';
const DAY=86400000,ID=/^[0-9a-f-]{36}$/;
const json=(value,status=200)=>Response.json(value,{status});
const hash=async(value)=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
async function limitedJson(request){const reader=request.body?.getReader();if(!reader)throw new Error('Missing body');let size=0;const parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new Error('Too large')}parts.push(value)}const buffer=new Uint8Array(size);let at=0;for(const p of parts){buffer.set(p,at);at+=p.length}return JSON.parse(new TextDecoder().decode(buffer))}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin');if(origin!==env.ALLOWED_ORIGIN)return json({error:'Origin not allowed'},403);
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin','Cache-Control':'no-store'};
 const finish=response=>{for(const[k,v]of Object.entries(headers))response.headers.set(k,v);return response};
 if(request.method==='OPTIONS')return finish(new Response(null,{status:204}));
 if(env.ENABLED!=='true')return finish(json({error:'Service paused'},503));
 const route=new URL(request.url).pathname;
 if(request.method==='GET'&&route==='/public-key')return finish(json({publicKey:env.VAPID_PUBLIC_KEY}));
 if(request.method!=='POST'||!['/register','/schedule','/remove'].includes(route))return finish(json({error:'Not found'},404));
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return finish(json({error:'JSON required'},415));
 try{
  const body=await limitedJson(request);
  // Daily-secret HMAC makes the rate-limit identity unlinkable across days.
  const ip=request.headers.get('CF-Connecting-IP')||'unknown',day=Math.floor(Date.now()/DAY);
  const hmacKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.RATE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const ipKey=b64(new Uint8Array(await crypto.subtle.sign('HMAC',hmacKey,new TextEncoder().encode(day+':'+ip))));
  const rate=env.TIMERS.get(env.TIMERS.idFromName('rate:'+ipKey));
  const allowance=await rate.fetch(new Request('https://internal/rate',{method:'POST',body:JSON.stringify({register:route==='/register'})}));
  if(!allowance.ok)return finish(json({error:'Too many requests'},429));
  if(route==='/register'){
   const subscription=validateSubscription(body.subscription);
   await crypto.subtle.importKey('raw',Uint8Array.from(atob(subscription.keys.p256dh.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),{name:'ECDH',namedCurve:'P-256'},false,[]);
   const id=crypto.randomUUID(),token=b64(crypto.getRandomValues(new Uint8Array(32))),stub=env.TIMERS.get(env.TIMERS.idFromName('timer:'+id));
   await stub.fetch(new Request('https://internal/init',{method:'POST',body:JSON.stringify({subscription,tokenHash:await hash(token)})}));return finish(json({id,token},201));
  }
  if(typeof body.id!=='string'||!ID.test(body.id))return finish(json({error:'Invalid identifier'},400));
  const auth=request.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(auth))return finish(json({error:'Unauthorized'},401));
  const stub=env.TIMERS.get(env.TIMERS.idFromName('timer:'+body.id));
  return finish(await stub.fetch(new Request('https://internal'+route,{method:'POST',body:JSON.stringify({...body,tokenHash:await hash(auth.slice(7))})})));
 }catch{return finish(json({error:'Invalid request or service unavailable'},400))}
}};
export class TimerAlarm{
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.chain=Promise.resolve()}
 fetch(request){const operation=this.chain.catch(()=>{}).then(()=>this.handle(request));this.chain=operation;return operation}
 async handle(request){const data=await request.json(),path=new URL(request.url).pathname,now=Date.now();
  if(path==='/rate'){let rate=await this.ctx.storage.get('rate');if(!rate||now-rate.since>3600000)rate={since:now,count:0,registrations:0};rate.count++;if(data.register)rate.registrations++;if(rate.count>1000||rate.registrations>30)return json({error:'Rate limit'},429);await this.ctx.storage.put('rate',rate);await this.ctx.storage.setAlarm(rate.since+3600000);return json({ok:true})}
  if(path==='/init'){await this.ctx.storage.put('record',{...data,expires:now+DAY,version:0,deadline:null});await this.ctx.storage.setAlarm(now+DAY);return json({ok:true})}
  const record=await this.ctx.storage.get('record');if(!record||record.tokenHash!==data.tokenHash||record.expires<now)return json({error:'Unauthorized'},401);
  if(path==='/remove'){await this.ctx.storage.deleteAlarm();await this.ctx.storage.deleteAll();return json({ok:true})}
  if(path!=='/schedule')return json({error:'Not found'},404);
  if(!Number.isSafeInteger(data.version)||data.version<=record.version)return json({error:'Stale request'},409);
  if(data.deadline!==null&&(!Number.isFinite(data.deadline)||data.deadline<now||data.deadline>now+600000||!Number.isInteger(data.total)||data.total<1||data.total>600))return json({error:'Invalid time'},400);
  record.version=data.version;record.deadline=data.deadline;record.total=data.total;record.expires=now+DAY;record.attempts=0;
  await this.ctx.storage.put('record',record);await this.ctx.storage.setAlarm(record.deadline??record.expires);return json({ok:true});
 }
 alarm(){const operation=this.chain.catch(()=>{}).then(()=>this.deliver());this.chain=operation;return operation}
 async deliver(){
  const rate=await this.ctx.storage.get('rate');if(rate){await this.ctx.storage.deleteAll();return}
  const record=await this.ctx.storage.get('record');if(!record)return;const now=Date.now();
  if(record.expires<=now){await this.ctx.storage.deleteAll();return}
  if(!record.deadline){await this.ctx.storage.setAlarm(record.expires);return}
  if(record.deadline>now){await this.ctx.storage.setAlarm(record.deadline);return}
  if(now-record.deadline>30000||this.env.ENABLED!=='true'){record.deadline=null;await this.ctx.storage.put('record',record);await this.ctx.storage.setAlarm(record.expires);return}
  let result;try{result=await sendPush(record.subscription,{expires:record.deadline+30000},this.env)}catch{result={status:503,ok:false}}
  if([404,410].includes(result.status)){await this.ctx.storage.deleteAll();return}
  if(!result.ok&&[429,500,502,503,504].includes(result.status)&&record.attempts<2){record.attempts++;await this.ctx.storage.put('record',record);await this.ctx.storage.setAlarm(Date.now()+record.attempts*3000);return}
  record.deadline=null;await this.ctx.storage.put('record',record);await this.ctx.storage.setAlarm(record.expires);
 }
}
