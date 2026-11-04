// A delayed photo response must never repaint private text after account changes.
export async function renderPrivateRecipe({recipe,listing,node,image,isCurrent}){
 if(!isCurrent())return false;
 listing.replaceChildren(node('h2',recipe.title),node('p',recipe.description));
 for(const p of recipe.photos||[]){await image(p,listing);if(!isCurrent())return false;}
 if(!isCurrent())return false;
 for(const p of recipe.parts){const section=node('section');section.className='recipe-component';if(p.name)section.append(node('h3',p.name));section.append(node('h4','Ingredients'));const ingredients=node('ul'),steps=node('ol');p.ingredients.forEach(i=>ingredients.append(node('li',[i.amount,i.unit,i.name,i.note].filter(Boolean).join(' '))));p.steps.forEach(s=>steps.append(node('li',s)));section.append(ingredients,node('h4','Directions'),steps);listing.append(section);}
 if(recipe.notes)listing.append(node('h3','Family notes'),node('p',recipe.notes));listing.tabIndex=-1;listing.focus();return true;
}
