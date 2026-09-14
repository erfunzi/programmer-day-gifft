const encoder=new TextEncoder();
export const randomToken=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
function b64(a){return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function bytes(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}
export async function hash(s){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))))}
async function key(secret){if(!secret||secret.length<32)throw Error('SESSION_SECRET missing');return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode(secret)),{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function seal(value,secret){const iv=crypto.getRandomValues(new Uint8Array(12));return b64(iv)+'.'+b64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(secret),encoder.encode(value))))}
export async function unseal(value,secret){const [iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},await key(secret),bytes(data)))}
export function cookies(request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=')))}
export function cookie(name,value,origin,age){return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith('https:')?'; Secure':''}`}
