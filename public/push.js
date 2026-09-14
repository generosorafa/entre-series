import {PUSH_SERVER} from './config.js';
export const remoteAvailable=Boolean(PUSH_SERVER);
const KEY='xamai-push-v1';
let identity;try{identity=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
let queue=Promise.resolve(),version=Date.now();
export function remoteEnabled(){return Boolean(remoteAvailable&&identity?.id&&identity?.token)}
async function request(path,body,auth=true){const response=await fetch(PUSH_SERVER+path,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'Authorization':'Bearer '+identity.token}:{})},body:JSON.stringify({...body,...(auth?{id:identity.id}:{})}),signal:AbortSignal.timeout(6000)});if(!response.ok)throw new Error('Servidor de avisos indisponível ('+response.status+').');return response.json()}
function bytes(base64){return Uint8Array.from(atob(base64.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}
export async function enableRemote(registration){
  const response=await fetch(PUSH_SERVER+'/public-key',{signal:AbortSignal.timeout(6000)});if(!response.ok)throw new Error('Não foi possível conectar os avisos.');const {publicKey}=await response.json();
  const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(publicKey)});
  const result=await request('/register',{subscription:subscription.toJSON()},false);identity=result;try{localStorage.setItem(KEY,JSON.stringify(identity))}catch{throw new Error('O navegador precisa permitir armazenamento para manter os avisos.')}
}
export function scheduleRemote(deadline,total){
  if(!remoteEnabled())return Promise.resolve(false);const v=++version;
  queue=queue.catch(()=>{}).then(()=>request('/schedule',{deadline,total,version:v}));return queue.then(()=>true);
}
export function cancelRemote(){return scheduleRemote(null,0)}
export async function disableRemote(registration){if(remoteEnabled()){await queue.catch(()=>{});await request('/remove',{})}const s=await registration.pushManager.getSubscription();if(s)await s.unsubscribe();identity=null;try{localStorage.removeItem(KEY)}catch{}}
