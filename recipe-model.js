/* Portable recipe data. No network, credentials, or publication behavior. */
(function (root) {
  'use strict';
  const KEY = 'abuelas-tamales.local-prototype.draft.v1';
  const MAX_COMPONENTS = 50;
  const MAX_BYTES = 2 * 1024 * 1024;
  const id = () => globalThis.crypto.randomUUID();
  const component = () => ({ id: id(), name: '', ingredientsText: '', directionsText: '' });
  const create = () => ({ schemaVersion: 1, recipeId: 'christmas-tamales', title: 'Abuela’s tamales', yieldText: '', components: [component()], notes: '', videoId: 'christmas-tamales' });
  function text(value, max, field) {
    if (typeof value !== 'string' || value.length > max) throw new Error('Invalid ' + field + '.');
    return value;
  }
  function parse(raw) {
    if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error('This draft is too large. Choose a JSON file smaller than 2 MB.');
    let value;
    try { value = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON. Your current draft has not changed.'); }
    if (!value || value.schemaVersion !== 1 || value.recipeId !== 'christmas-tamales' || value.videoId !== 'christmas-tamales') throw new Error('This is not a supported recipe draft (version 1). Your current draft has not changed.');
    if (!Array.isArray(value.components) || value.components.length < 1 || value.components.length > MAX_COMPONENTS) throw new Error('A draft must have between 1 and 50 recipe parts.');
    const ids = new Set();
    const components = value.components.map(part => {
      if (!part || typeof part !== 'object') throw new Error('A recipe part is invalid.');
      const partId = typeof part.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(part.id) && !ids.has(part.id) ? part.id : id();
      ids.add(partId);
      return { id: partId, name: text(part.name, 100, 'part name'), ingredientsText: text(part.ingredientsText, 10000, 'ingredients'), directionsText: text(part.directionsText, 10000, 'directions') };
    });
    return { schemaVersion: 1, recipeId: 'christmas-tamales', title: text(value.title, 160, 'recipe name'), yieldText: text(value.yieldText, 200, 'yield'), components, notes: text(value.notes, 10000, 'notes'), videoId: 'christmas-tamales' };
  }
  function move(draft, partId, delta) {
    const index = draft.components.findIndex(p => p.id === partId);
    const next = index + delta;
    if (index < 0 || ![-1, 1].includes(delta) || next < 0 || next >= draft.components.length) return false;
    [draft.components[index], draft.components[next]] = [draft.components[next], draft.components[index]];
    return true;
  }
  function remove(draft, partId) {
    const index = draft.components.findIndex(p => p.id === partId);
    if (draft.components.length === 1 || index < 0) return null;
    return { part: draft.components.splice(index, 1)[0], index };
  }
  function save(storage, draft) {
    try { storage.setItem(KEY, JSON.stringify(draft)); return true; } catch { return false; }
  }
  function read(storage) {
    let raw;
    try { raw = storage.getItem(KEY); } catch { return { state: 'unavailable' }; }
    if (raw === null) return { state: 'empty' };
    try { return { state: 'restored', draft: parse(raw) }; } catch (error) { return { state: 'invalid', raw, message: error.message }; }
  }
  const api = { KEY, MAX_COMPONENTS, MAX_BYTES, create, component, parse, move, remove, save, read };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RecipeModel = api;
})(typeof window === 'undefined' ? globalThis : window);
