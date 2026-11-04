// Only use invitations returned by the authenticated pending-invitations API.
// The accept endpoint independently checks identity, expiry and inviter access.
export async function joinFamily({invitations,request,continueSignIn}) {
  const invite=Array.isArray(invitations)?invitations[0]:null;
  if(!invite||typeof invite.requestId!=='string')throw Error('No active invitation is available. Ask a family editor for help.');
  const result=await request('/invitations/accept','POST',{requestId:invite.requestId});
  if(result.accepted!==true)throw Error('Your invitation could not be confirmed. Please try again.');
  await continueSignIn();
}
