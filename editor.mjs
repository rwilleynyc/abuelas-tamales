const $=id=>document.getElementById(id),part=()=>({id:crypto.randomUUID(),name:'',ingredients:[{amount:'',unit:'',name:'',note:''}],steps:['']});
let draft={schemaVersion:2,title:'',description:'',notes:'',parts:[part()]},removed=null,dirty=false;
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function change(){dirty=true;$('status').textContent='Unsaved changes.';document.dispatchEvent(new Event('recipe-change'));}
function button(label,fn){const n=node('button',label);n.type='button';n.className='secondary';n.addEventListener('click',fn);return n;}
function field(label,value,onInput,multiline=false){const wrap=node('label',label),input=node(multiline?'textarea':'input');input.value=value;input.addEventListener('input',()=>{onInput(input.value);change();});wrap.append(input);return wrap;}
function render(){
 $('parts').replaceChildren();draft.parts.forEach((p,index)=>{
 const section=node('section');section.className='part';section.append(node('h3','Part '+(index+1)),field('Part name (optional)',p.name,v=>p.name=v));
 const controls=node('div');controls.className='actions';
 const move=delta=>{const target=index+delta;if(target<0||target>=draft.parts.length)return;[draft.parts[index],draft.parts[target]]=[draft.parts[target],draft.parts[index]];change();render();};
 const up=button('Move up',()=>move(-1)),down=button('Move down',()=>move(1));up.disabled=index===0;down.disabled=index===draft.parts.length-1;controls.append(up,down,button('Duplicate part',()=>{draft.parts.splice(index+1,0,{...structuredClone(p),id:crypto.randomUUID()});change();render();}));
 const remove=button('Remove part',()=>{if(draft.parts.length===1)return;const nonempty=p.name||p.ingredients.some(i=>Object.values(i).some(Boolean))||p.steps.some(Boolean);if(nonempty&&!confirm('Remove this part? You can undo this removal.'))return;removed={part:p,index};draft.parts.splice(index,1);$('undo').hidden=false;change();render();});remove.disabled=draft.parts.length===1;controls.append(remove);const options=node('details');options.className='part-options';options.append(node('summary','Arrange this part'),controls);section.append(options,node('h3','Ingredients'));
 p.ingredients.forEach((i,n)=>{const group=node('fieldset'),legend=node('legend','Ingredient '+(n+1));group.append(legend);for(const [k,label] of [['amount','Amount — fractions or words'],['unit','Unit (optional)'],['name','Ingredient'],['note','Preparation note (optional)']])group.append(field(label,i[k],v=>i[k]=v));group.append(button('Remove ingredient',()=>{p.ingredients.splice(n,1);change();render();}));section.append(group);});
 section.append(button('Add ingredient',()=>{p.ingredients.push({amount:'',unit:'',name:'',note:''});change();render();}),node('h3','Directions'));
 p.steps.forEach((s,n)=>{section.append(field('Step '+(n+1),s,v=>p.steps[n]=v,true),button('Remove step '+(n+1),()=>{p.steps.splice(n,1);change();render();}));});section.append(button('Add step',()=>{p.steps.push('');change();render();}));$('parts').append(section);
 });
}
for(const id of ['title','description','notes'])$(id).addEventListener('input',()=>{draft[id]=$(id).value;change();if(id==='description')$('description-count').textContent=(240-draft.description.length)+' characters remaining';});
$('add-part').addEventListener('click',()=>{draft.parts.push(part());change();render();});
$('undo').addEventListener('click',()=>{if(removed){draft.parts.splice(removed.index,0,removed.part);removed=null;$('undo').hidden=true;change();render();}});
$('review').addEventListener('click',()=>{const box=$('preview'),publicPreview=node('section');publicPreview.className='public-preview';publicPreview.append(node('h2','Public preview'),node('p','Visitors can see this introduction and your recipe photos.'),node('h3',draft.title||'Untitled recipe'),node('p',draft.description||'No introduction added.'));box.replaceChildren(publicPreview,node('h2','For signed-in family'));for(const p of draft.parts){const section=node('section');section.className='recipe-component';if(p.name)section.append(node('h3',p.name));section.append(node('h4','Ingredients'));const list=node('ul');p.ingredients.forEach(i=>list.append(node('li',[i.amount,i.unit,i.name,i.note].filter(Boolean).join(' '))));const steps=node('ol');p.steps.forEach(s=>steps.append(node('li',s)));section.append(list,node('h4','Directions'),steps);box.append(section);}if(draft.notes)box.append(node('h3','Family notes'),node('p',draft.notes));box.append(node('p','Ingredients, directions and family notes are visible only to signed-in family. Nothing is published until you choose Publish recipe.'));box.hidden=false;box.tabIndex=-1;box.focus();});
$('export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'})),a=node('a');a.href=url;a.download='family-recipe-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('status').textContent='Download requested. Check your downloads before closing this tab.';});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
if(window.top!==window.self){$('workspace').hidden=true;$('status').textContent='Open this preview directly in its own tab.';}else render();
export function getDraft(){return structuredClone(draft);}
export function setDraft(value){draft=structuredClone(value);for(const id of ['title','description','notes'])$(id).value=draft[id];$('description-count').textContent=(240-draft.description.length)+' characters remaining';removed=null;$('undo').hidden=true;dirty=false;render();}
export function saved(){dirty=false;}

export function setPhotos(photos){draft.photos=structuredClone(photos);change();}
export function hasUnsavedChanges(){return dirty;}
