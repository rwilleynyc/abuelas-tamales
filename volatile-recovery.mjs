// Last-resort tab memory when browser storage fails. Never used to authenticate.
export function createVolatileRecovery(){let copy=null;return {
 update(reason,account,draft){if(reason==='expired'&&account)copy={subject:account.subject,recipe:structuredClone(draft)};else if(reason==='signed-out'||reason==='discard')copy=null;},
 get pending(){return copy!==null;},
 recipe(){return copy?structuredClone(copy.recipe):null;}
};}
