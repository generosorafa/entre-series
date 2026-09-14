import {mkdir,writeFile} from 'node:fs/promises';
import {b64} from '../worker/webpush.js';
const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const secrets={VAPID_PRIVATE_JWK:JSON.stringify(await crypto.subtle.exportKey('jwk',keys.privateKey)),VAPID_PUBLIC_KEY:b64(new Uint8Array(await crypto.subtle.exportKey('raw',keys.publicKey))),RATE_SECRET:b64(crypto.getRandomValues(new Uint8Array(32)))};
await mkdir('work',{recursive:true});await writeFile('work/push-secrets-private.json',JSON.stringify(secrets),{mode:0o600,flag:'wx'});
console.log('Segredos criados em work/push-secrets-private.json, ignorado pelo Git. Não compartilhe esse arquivo.');
