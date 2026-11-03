// A delayed photo response must never repaint private text after account changes.
export async function renderPrivateRecipe({recipe,listing,node,image,isCurrent}){
 if(!isCurrent())return false;
 listing.replaceChildren(node('h2',recipe.title),node('p',recipe.description));
 for(const p of recipe.photos||[]){await image(p,listing);if(!isCurrent())return false;}
 if(!isCurrent())return false;
 for(const p of recipe.parts){if(p.name)listing.append(node('h3',p.name));const ingredients=node('ul'),steps=node('ol');p.ingredients.forEach(i=>ingredients.append(node('li',[i.amount,i.unit,i.name,i.note].filter(Boolean).join(' '))));p.steps.forEach(s=>steps.append(node('li',s)));listing.append(ingredients,steps);}
 if(recipe.notes)listing.append(node('h3','Family notes'),node('p',recipe.notes));listing.tabIndex=-1;listing.focus();return true;
}
