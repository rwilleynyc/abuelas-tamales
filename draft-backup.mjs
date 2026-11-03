const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validBackup(v){
 const text=(x,n)=>typeof x==='string'&&x.length<=n;
 const r=v?.recipe;if(!v||!UUID.test(v.recipeId)||(v.version!==null&&!text(v.version,300))||!r||r.schemaVersion!==2||!text(r.title,160)||!text(r.description,240)||!text(r.notes,10000)||!Array.isArray(r.parts)||r.parts.length<1||r.parts.length>50)return false;
 const ids=new Set();for(const p of r.parts){if(!p||!UUID.test(p.id)||ids.has(p.id)||!text(p.name,100)||!Array.isArray(p.ingredients)||p.ingredients.length>200||!Array.isArray(p.steps)||p.steps.length>200||!p.steps.every(s=>text(s,10000)))return false;ids.add(p.id);for(const i of p.ingredients)if(!i||!text(i.amount,100)||!text(i.unit,100)||!text(i.name,300)||!text(i.note,500))return false;}
 if(r.photos!==undefined&&(!Array.isArray(r.photos)||r.photos.length>11||!r.photos.every(p=>p&&UUID.test(p.id)&&['cover','gallery'].includes(p.audience)&&text(p.alt,300))))return false;
 return true;
}
export function createDraftBackup({storage,key}){
 if(typeof key!=='string'||!key.startsWith('abuelas.private-draft.v1:'))throw Error('Account-scoped backup required');
 let blocked=false;
 return {
  read(){const raw=storage.getItem(key);if(raw===null)return null;try{if(raw.length>512*1024)throw Error();const v=JSON.parse(raw);if(!validBackup(v))throw Error();return v;}catch{blocked=true;throw Error('The browser backup could not be read. Download the original backup before replacing it.');}},
  raw:()=>storage.getItem(key),
  write(v){if(blocked)throw Error('Recovery backup is protected. Download and remove it before saving a new browser copy.');if(!validBackup(v))throw Error('Draft cannot be backed up yet. Check the recipe fields.');storage.setItem(key,JSON.stringify(v));},
  remove(){storage.removeItem(key);blocked=false;}
 };
}
