// Not loaded by the live page or local prototype. Refresh tokens are discarded.
// Access tokens exist only in memory. Reload uses hosted sign-in again.
export function createAuth({config,storage=sessionStorage,fetcher=fetch,location=window.location,cryptoApi=crypto,onAccountChange=()=>{}}) {
  let token=null,subject=null,expires=0,epoch=0,pendingIdentity=false;
  const key='abuelas.oauth.pending.v1';
  const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const random=()=>b64(cryptoApi.getRandomValues(new Uint8Array(32)));
  function enabled(){if(config.enabled!==true)throw new Error('Production feature is disabled');}
  async function signIn(){
    enabled();clear('signing-in');const state=random(),verifier=random();
    const challenge=b64(new Uint8Array(await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
    storage.setItem(key,JSON.stringify({state,verifier,createdAt:Date.now()}));
    const url=new URL('/oauth2/authorize',config.authOrigin);
    url.search=new URLSearchParams({response_type:'code',client_id:config.clientId,redirect_uri:config.redirectUri,scope:'openid recipes/write',state,code_challenge:challenge,code_challenge_method:'S256'});
    location.assign(url.href);
  }
  async function callback(urlString){
    enabled();const url=new URL(urlString),raw=storage.getItem(key);clear('callback');const active=epoch;
    // Remove code from address bar before any await, logs, navigation or media.
    if(globalThis.history)history.replaceState(null,'',new URL(config.redirectUri).pathname);
    let pending;try{pending=JSON.parse(raw);}catch{}
    if(!pending||Date.now()-pending.createdAt>600000||pending.createdAt>Date.now()||url.searchParams.get('state')!==pending.state||!url.searchParams.get('code')||url.searchParams.has('error'))throw new Error('Sign-in expired or could not be verified. Please try again.');
    const response=await fetcher(new URL('/oauth2/token',config.authOrigin),{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:config.clientId,redirect_uri:config.redirectUri,code:url.searchParams.get('code'),code_verifier:pending.verifier}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw new Error('Sign-in failed. Please try again.');
    const result=await response.json();
    if(result.token_type!=='Bearer'||typeof result.access_token!=='string'||!Number.isFinite(result.expires_in)||result.expires_in<=0)throw new Error('Invalid sign-in response');
    // Identity comes from authorized API response, never decoded unverified JWT.
    const session=await fetcher(new URL('/session',config.apiOrigin),{headers:{authorization:'Bearer '+result.access_token},cache:'no-store',credentials:'omit'});
    let account;
    if(session.ok)account=await session.json();
    else if(session.status===403 && config.invitationsEnabled===true){
      const pendingResponse=await fetcher(new URL('/invitations/pending',config.apiOrigin),{headers:{authorization:'Bearer '+result.access_token},cache:'no-store',credentials:'omit'});
      if(!pendingResponse.ok)throw new Error('This account does not have recipe access.');
      const pendingAccount=await pendingResponse.json();
      if(!Array.isArray(pendingAccount.items)||!pendingAccount.items.length)throw new Error('This cookbook is invitation-only. Ask a family editor to invite this email.');
      account={subject:pendingAccount.subject,pendingInvitations:pendingAccount.items,canContribute:false,canPublish:false,canReview:false};
    }else throw new Error('This account does not have recipe access.');
    if(!/^[a-zA-Z0-9-]{1,100}$/.test(account.subject||''))throw new Error('Invalid account response');
    if(active!==epoch)throw new Error('Sign-in was canceled.');
    token=result.access_token;expires=Date.now()+result.expires_in*1000;subject=account.subject;pendingIdentity=Boolean(account.pendingInvitations);onAccountChange(subject);
    return account;
  }
  function authorization(){enabled();if(!token||Date.now()>=expires){clear('expired');throw new Error('Sign in again. Your private draft remains saved.');}return 'Bearer '+token;}
  function clear(reason='signed-out'){epoch++;token=null;subject=null;pendingIdentity=false;expires=0;try{storage.removeItem(key);}catch{/* Tokens are already gone; UI must still clear. */}finally{onAccountChange(null,reason);}}
  function signOut(){clear();const url=new URL('/logout',config.authOrigin);url.search=new URLSearchParams({client_id:config.clientId,logout_uri:config.logoutUri});location.assign(url.href);}
  function draftKey(){if(!subject||pendingIdentity)throw new Error('Sign in with active membership before loading a private draft');return 'abuelas.private-draft.v1:'+config.clientId+':'+subject;}
  return {signIn,callback,authorization,clear,signOut,draftKey};
}
