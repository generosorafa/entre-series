// Web Push: RFC 8291 (aes128gcm) and RFC 8292 (VAPID), using Web Crypto.
const enc=new TextEncoder();
export const join=(...parts)=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length}return out};
export function b64(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
export function unb64(value){if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Invalid base64url');return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}
async function hmac(key,data){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}
export async function deriveKeys(secret,auth,salt,uaPublic,serverPublic){
 const prk=await hmac(auth,secret),ikm=await hmac(prk,join(enc.encode('WebPush: info\0'),uaPublic,serverPublic,new Uint8Array([1]))),prk2=await hmac(salt,ikm);
 return {key:(await hmac(prk2,join(enc.encode('Content-Encoding: aes128gcm\0'),new Uint8Array([1])))).slice(0,16),nonce:(await hmac(prk2,join(enc.encode('Content-Encoding: nonce\0'),new Uint8Array([1])))).slice(0,12)};
}
export function validateSubscription(value){
 if(!value||typeof value.endpoint!=='string'||value.endpoint.length>2048)throw new Error('Invalid subscription');
 const url=new URL(value.endpoint),host=url.hostname;
 const allowed=host==='web.push.apple.com'||host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.notify.windows.com');
 if(url.protocol!=='https:'||url.port||url.username||url.password||url.hash||!allowed)throw new Error('Unsupported push provider');
 const publicKey=unb64(value.keys?.p256dh),auth=unb64(value.keys?.auth);
 if(publicKey.length!==65||publicKey[0]!==4||auth.length!==16)throw new Error('Invalid subscription keys');
 return {endpoint:url.href,keys:{p256dh:value.keys.p256dh,auth:value.keys.auth}};
}
export async function encrypt(subscription,payload){
 const receiver=unb64(subscription.keys.p256dh),auth=unb64(subscription.keys.auth),salt=crypto.getRandomValues(new Uint8Array(16));
 const keys=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const publicKey=new Uint8Array(await crypto.subtle.exportKey('raw',keys.publicKey));
 const receiverKey=await crypto.subtle.importKey('raw',receiver,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const secret=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:receiverKey},keys.privateKey,256));
 const {key,nonce}=await deriveKeys(secret,auth,salt,receiver,publicKey);
 const aes=await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);
 const plain=join(enc.encode(JSON.stringify(payload)),new Uint8Array([2]));if(plain.length>3900)throw new Error('Payload too large');
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},aes,plain));
 const header=new Uint8Array(21);header.set(salt);new DataView(header.buffer).setUint32(16,4096);header[20]=65;
 return join(header,publicKey,encrypted);
}
export async function authorization(endpoint,privateJwk,publicKey,subject){
 const key=await crypto.subtle.importKey('jwk',privateJwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const head=b64(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),body=b64(enc.encode(JSON.stringify({aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+3600,sub:subject})));
 const input=head+'.'+body,signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(input)));
 return 'vapid t='+input+'.'+b64(signature)+', k='+publicKey;
}
export async function sendPush(subscription,payload,env){
 validateSubscription(subscription);
 return fetch(subscription.endpoint,{method:'POST',headers:{Authorization:await authorization(subscription.endpoint,JSON.parse(env.VAPID_PRIVATE_JWK),env.VAPID_PUBLIC_KEY,env.VAPID_SUBJECT),'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',TTL:'30',Urgency:'high',Topic:'xamai-rest'},body:await encrypt(subscription,payload),redirect:'error',signal:AbortSignal.timeout(7000)});
}
