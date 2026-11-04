// Tokens remain in memory; history contains only a non-sensitive overlay marker.
export function createHomeShell(doc=document){
 const menu=doc.getElementById('family-menu'),task=doc.getElementById('family-task'),trigger=doc.getElementById('menu-toggle'),body=doc.getElementById('task-body'),heading=doc.getElementById('task-heading');
 let origin=trigger,scroll=0,active=null,overlay=null,explicitHome=false;trigger.disabled=true;
 const focusHome=()=>{explicitHome=false;doc.getElementById('cookbook-heading').scrollIntoView({block:'start'});doc.getElementById('cookbook-heading').focus({preventScroll:true});};
 const marker='family-overlay';history.scrollRestoration='manual';
 function show(dialog){if(!overlay){history.pushState({[marker]:true},'',location.href);}else if(overlay!==dialog){const previous=overlay;overlay=dialog;previous.close();}overlay=dialog;if(!dialog.open)dialog.showModal();}
 function finish(dialog){if(overlay!==dialog)return;overlay=null;if(history.state?.[marker])history.back();}
 const hideMenu=()=>{if(menu.open)menu.close();trigger.setAttribute('aria-expanded','false');};
 const closeTask=()=>{if(task.open)task.close();};
 trigger.addEventListener('click',()=>{origin=trigger;show(menu);trigger.setAttribute('aria-expanded','true');});
 doc.getElementById('menu-close').addEventListener('click',hideMenu);
 menu.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');finish(menu);if(!overlay){if(explicitHome)focusHome();else trigger.focus();}});
 doc.getElementById('task-close').addEventListener('click',closeTask);
 for(const dialog of [menu,task])dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(n=>n.getClientRects().length);if(!items.length){e.preventDefault();return;}const first=items[0],last=items.at(-1);if(e.shiftKey&&(doc.activeElement===first||!items.includes(doc.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus();}});
 for(const dialog of [menu,task])dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 task.addEventListener('close',()=>{if(active)active.hidden=true;doc.getElementById('task-parking').append(...body.children);active=null;finish(task);if(explicitHome){focusHome();return;}window.scrollTo({top:scroll,behavior:'instant'});if(origin?.isConnected&&!origin.closest('dialog:not([open])'))origin.focus();else trigger.focus();});
 window.addEventListener('popstate',()=>{if(overlay&&!history.state?.[marker]){const previous=overlay;overlay=null;previous.close();}});
 const home=()=>{explicitHome=true;const wasOpen=menu.open||task.open;hideMenu();closeTask();if(!wasOpen)focusHome();};
 doc.querySelector('.wordmark').addEventListener('click',e=>{e.preventDefault();home();});
 return {ready(){trigger.disabled=false;},prepareNavigation(){overlay=null;if(history.state?.[marker])history.replaceState(null,'',location.href);hideMenu();closeTask();},menu:doc.getElementById('menu-actions'),open(title,panel){origin=menu.open?trigger:doc.activeElement;scroll=window.scrollY;if(active&&active!==panel){active.hidden=true;doc.getElementById('task-parking').append(active);}active=panel;panel.hidden=false;body.append(panel);heading.textContent=title;show(task);trigger.setAttribute('aria-expanded','false');task.scrollTop=0;heading.focus();},close:closeTask,closeMenu:hideMenu,clear(){hideMenu();closeTask();},signedIn(value){doc.getElementById('home-auth-note').textContent=value?'Welcome home. The full family cookbook is unlocked.':'A little glimpse for everyone. The full recipes are kept for family.';},home};
}
