// Mount only after authentication. Not included in the deployed/static candidate.
// request must attach the in-memory bearer and discard account-switch responses.
export function mountInvitations({root,accessRoot=null,request,owner=false,doc=document,confirm=window.confirm.bind(window),uuid=()=>crypto.randomUUID()}) {
  let alive=true,busy=false,pending=null;
  const el=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;return n;};
  const status=el('p','Invite family to read full recipes, add their own, and invite others.');status.setAttribute('role','status');
  const label=el('label','Family member’s email');
  const email=el('input','');email.type='email';email.autocomplete='email';email.maxLength=254;email.inputMode='email';email.autocapitalize='none';email.spellcheck=false;label.append(email);
  const controls=el('div',''),results=el('div',''),accessStatus=el('p',''),accessResults=el('div','');controls.className='invitation-actions';accessStatus.setAttribute('role','status');if(owner&&accessRoot)accessRoot.replaceChildren(el('p','See who has access to the cookbook and manage pending invitations.'),accessStatus,accessResults);
  function button(parent,text,action){const b=el('button',text);b.type='button';b.addEventListener('click',async()=>{
    if(!alive||busy)return;busy=true;b.disabled=true;
    try{await action();}catch{if(alive)status.textContent='The result could not be confirmed. Retry the same request; do not send a second invitation.';}
    finally{busy=false;if(alive)b.disabled=false;}
  });parent.append(b);return b;}
  const send=button(controls,'Send invitation',async()=>{
    if(!pending){
      if(!email.checkValidity()||!email.value.trim()){email.reportValidity();return;}
      const target=email.value.trim();
      if(!confirm(`Send an editor invitation to ${target}? They will be able to invite other family editors.`))return;
      pending={email:target,requestId:uuid()};email.disabled=true;
    }
    const result=await request('/invitations','POST',pending);
    if(!alive)return;
    status.textContent=result.status==='sent'?'AWS accepted the invitation email. Delivery to their inbox is not confirmed.':`Invitation status: ${result.status}. An owner can inspect or cancel uncertain requests.`;
    // Keep the ID across retries, including uncertain dispatch. No implicit resend.
    send.textContent='Check this invitation again';
    if(result.status==='sent'&&!controls.querySelector?.('[data-next-invite]')){const next=button(controls,'Invite another family member',async()=>{pending=null;email.disabled=false;email.value='';send.textContent='Send invitation';status.textContent='Choose another family member to invite.';next.remove();email.focus?.();});next.setAttribute('data-next-invite','true');}
  });
  async function showAccess(){
    if(!alive||!owner||!accessRoot)return;
    const status=accessStatus,results=accessResults;
    const data=await request('/access');if(!alive)return;results.replaceChildren();
    status.textContent='Family access is up to date.';
    results.append(el('h3','Family members'));if(!data.members.length)results.append(el('p','No other family members yet.'));
    for(const member of data.members){
      const row=el('div',`${member.sub} — ${member.active?'Active editor':'Revoked'}`);
      if(member.active)button(row,'Remove access',async()=>{
        if(!confirm(`Remove access for ${member.email||member.sub} and cancel their pending invitations? They will no longer be able to read or edit family recipes.`))return;
        await request('/access/revoke','POST',{subject:member.sub});if(alive)status.textContent='Editor access revoked. Refresh the list.';
      });results.append(row);
    }
    results.append(el('h3','Invitations'));if(!data.invitations.length)results.append(el('p','No pending invitations.'));
    for(const invite of data.invitations){
      const row=el('div',`${invite.email} — ${invite.status}`);
      if(['sent','active-delivery-unknown','pending-delivery-unknown'].includes(invite.status)) {
        let attemptId=null;
        button(row,'Resend invitation',async()=>{
          if(!attemptId){if(!confirm(`Send a new temporary password to ${invite.email}? Use this only if initial password setup is unfinished or expired. The old temporary password will stop working.`))return;attemptId=uuid();}
          const result=await request('/invitations/resend','POST',{requestId:invite.id,attemptId});
          if(alive)status.textContent=result.status==='sent'?'AWS accepted the new setup email. Inbox delivery is not confirmed.':'Resend outcome is uncertain. Do not start another resend; contact the owner.';
        });
      }
      if(['dispatching','needs-owner-recovery'].includes(invite.status)) {
        button(row,'Inspect without resending',async()=>{
          const result=await request('/invitations/recover','POST',{requestId:invite.id,action:'inspect'});if(!alive)return;
          status.textContent=result.matched?'Matching Cognito identity found. Email delivery remains unknown.':'No matching invitation identity found; access remains blocked.';
          if(result.canActivate)button(row,'Restore matching invitation',async()=>{
            if(!confirm(`Restore the matching invitation for ${invite.email}? They must still sign in and accept it. No email will be resent.`))return;
            await request('/invitations/recover','POST',{requestId:invite.id,action:'activate'});if(alive)status.textContent='Matching invitation restored. The recipient must still accept it; email delivery is unconfirmed.';
          });
        });
        button(row,'Cancel invitation',async()=>{
          if(!confirm(`Cancel access for ${invite.email}? Any email already sent cannot be recalled.`))return;
          await request('/invitations/recover','POST',{requestId:invite.id,action:'cancel'});if(alive)status.textContent='Invitation access canceled.';
        });
      }results.append(row);
    }
  }
  const heading=el('h2','Invite family');heading.tabIndex=-1;root.replaceChildren(heading,status,label,controls,results);
  return {showAccess,focusForm(){if(alive)heading.focus?.();},destroy(){alive=false;pending=null;email.value='';root.replaceChildren();accessRoot?.replaceChildren();}};
}
