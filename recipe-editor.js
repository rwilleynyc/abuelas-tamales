(() => {
  'use strict';
  const model = window.RecipeModel;
  const $ = id => document.getElementById(id);
  let draft = model.create();
  let active = true;
  let removed = null;
  let storage;
  let corruptedRaw = null;
  let saved = false;
  let exportUrl;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function feedback(message, error = false) {
    $('feedback').textContent = message;
    $('feedback').className = 'notice' + (error ? ' error' : '');
    $('feedback').hidden = !message;
  }
  function persist() {
    if (!active) return;
    if (corruptedRaw !== null) return;
    saved = storage ? model.save(storage, draft) : false;
    const status = saved ? 'Draft saved on this device' : 'Cannot save in this browser — download a copy before leaving.';
    if ($('save-status').textContent !== status) $('save-status').textContent = status;
    $('save-status').parentElement.classList.toggle('save-error', !saved);
  }
  function download(raw, name) {
    if (!active) return;
    try {
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      exportUrl = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const link = el('a');
      link.href = exportUrl;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      feedback('Download requested. Check your downloads for the JSON copy. Nothing was sent to the site.');
    } catch { feedback('The download could not start. Keep this page open and try again.', true); }
  }
  function displayName(part, index) { return part.name.trim() || 'Part ' + (index + 1); }
  function updatePartLabels(card, part, index) {
    const name = displayName(part, index);
    card.querySelector('h3').textContent = name;
    card.querySelectorAll('[data-action]').forEach(button => {
      const verb = { up: 'Move up', down: 'Move down', remove: 'Remove' }[button.dataset.action];
      button.setAttribute('aria-label', verb + ': ' + name);
    });
  }
  function renderComponents(focusId, focusAction = 'name') {
    if (!active) return;
    const fragment = document.createDocumentFragment();
    draft.components.forEach((part, index) => {
      const card = el('section', 'card component-card');
      card.dataset.partId = part.id;
      const titleId = 'heading-' + part.id;
      card.setAttribute('aria-labelledby', titleId);
      const top = el('div', 'component-top');
      const heading = el('h3'); heading.id = titleId;
      top.append(el('span', 'component-number', 'Part ' + (index + 1)), heading);
      card.append(top);
      const fields = [
        ['name', 'Name of this part', 'input', 'For example: Masa, Sauce, Filling, or simply Recipe.'],
        ['ingredientsText', 'Ingredients', 'textarea', 'One ingredient per line. Keep the amounts and words you remember.'],
        ['directionsText', 'Directions', 'textarea', 'Write the steps in order. Paragraphs or numbered steps are both fine.']
      ];
      fields.forEach(([key, labelText, tag, help]) => {
        const inputId = key + '-' + part.id;
        const label = el('label', '', labelText); label.htmlFor = inputId;
        const input = el(tag); input.id = inputId; input.name = key; input.value = part[key]; input.required = true;
        input.maxLength = key === 'name' ? 100 : 10000;
        if (tag === 'input') { input.type = 'text'; input.autocomplete = 'off'; }
        else input.rows = key === 'ingredientsText' ? 5 : 6;
        input.setAttribute('aria-describedby', inputId + '-help');
        const hint = el('p', 'field-help', help); hint.id = inputId + '-help';
        input.addEventListener('input', () => {
          part[key] = input.value;
          if (key === 'name') updatePartLabels(card, part, index);
          persist();
        });
        card.append(label, input, hint);
      });
      const controls = el('div', 'component-controls');
      [['up', '↑ Move up'], ['down', '↓ Move down'], ['remove', 'Remove part']].forEach(([action, text]) => {
        const button = el('button', action === 'remove' ? 'remove-button' : '', text);
        button.type = 'button'; button.dataset.action = action;
        button.disabled = action === 'up' ? index === 0 : action === 'down' ? index === draft.components.length - 1 : draft.components.length === 1;
        button.addEventListener('click', () => {
          if (action === 'remove') {
            removed = model.remove(draft, part.id);
            if (!removed) return;
            $('undo-message').textContent = displayName(part, index) + ' removed.';
            $('undo-area').hidden = false;
            persist(); renderComponents(); $('undo-remove').focus();
          } else if (model.move(draft, part.id, action === 'up' ? -1 : 1)) {
            persist(); renderComponents(part.id, action);
            feedback(displayName(part, index) + ' moved ' + (action === 'up' ? 'up.' : 'down.'));
          }
        });
        controls.append(button);
      });
      card.append(controls); updatePartLabels(card, part, index); fragment.append(card);
    });
    $('components').replaceChildren(fragment);
    $('component-count').textContent = draft.components.length + (draft.components.length === 1 ? ' part' : ' parts');
    $('add-component').disabled = draft.components.length >= model.MAX_COMPONENTS;
    if (focusId) {
      const card = [...$('components').children].find(c => c.dataset.partId === focusId);
      const button = card?.querySelector('[data-action="' + focusAction + '"]');
      const target = button && !button.disabled ? button : $('name-' + focusId);
      target?.focus();
    }
  }
  function renderDraft() {
    if (!active) return;
    $('recipe-title').value = draft.title;
    $('recipe-yield').value = draft.yieldText;
    $('recipe-notes').value = draft.notes;
    renderComponents();
  }
  function showPreview() {
    if (!active) return;
    const content = $('preview-content'); content.replaceChildren();
    const heading = el('h2', '', draft.title.trim() || 'Untitled recipe'); heading.id = 'preview-heading'; content.append(heading);
    let missing = !draft.title.trim();
    if (draft.yieldText.trim()) content.append(el('p', 'preview-meta', 'Makes: ' + draft.yieldText));
    draft.components.forEach((part, index) => {
      const section = el('section', 'preview-component'); section.append(el('h3', '', displayName(part, index)));
      [['Ingredients', part.ingredientsText], ['Directions', part.directionsText]].forEach(([label, value]) => {
        section.append(el('h4', '', label), el('p', value.trim() ? 'preview-text' : 'empty-copy', value.trim() ? value : 'Not entered yet.'));
        if (!value.trim()) missing = true;
      });
      if (!part.name.trim()) missing = true;
      content.append(section);
    });
    if (draft.notes.trim()) { const notes = el('section', 'preview-component'); notes.append(el('h3', '', 'Family notes'), el('p', 'preview-text', draft.notes)); content.append(notes); }
    if (missing) content.prepend(el('p', 'notice', 'This draft still has blank fields. You can keep editing or download it as it is.'));
    $('recipe-form').hidden = true; $('preview-panel').hidden = false; $('preview-panel').focus();
  }
  $('recipe-form').addEventListener('submit', event => event.preventDefault());
  [['recipe-title', 'title'], ['recipe-yield', 'yieldText'], ['recipe-notes', 'notes']].forEach(([inputId, key]) => {
    $(inputId).addEventListener('input', () => { draft[key] = $(inputId).value; persist(); });
  });
  $('add-component').addEventListener('click', () => {
    if (draft.components.length >= model.MAX_COMPONENTS) return;
    const part = model.component(); draft.components.push(part); persist(); renderComponents(part.id);
    feedback('A new recipe part was added.');
  });
  $('undo-remove').addEventListener('click', () => {
    if (!removed || draft.components.length >= model.MAX_COMPONENTS) { feedback('Remove another part before restoring this one.', true); return; }
    const partId = removed.part.id; draft.components.splice(Math.min(removed.index, draft.components.length), 0, removed.part);
    removed = null; $('undo-area').hidden = true; persist(); renderComponents(partId); feedback('Recipe part restored.');
  });
  $('preview-button').addEventListener('click', showPreview);
  $('edit-button').addEventListener('click', () => { $('preview-panel').hidden = true; $('recipe-form').hidden = false; $('preview-button').focus(); });
  document.querySelectorAll('.export-button').forEach(button => button.addEventListener('click', () => download(JSON.stringify(draft, null, 2) + '\n', 'abuelas-tamales-draft.json')));
  $('print-button').addEventListener('click', () => window.print());
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > model.MAX_BYTES) throw new Error('This file is too large. Choose a JSON draft smaller than 2 MB.');
      const incoming = model.parse(await file.text());
      if (!active) return;
      if (!window.confirm('Replace the draft on this device with this file? Download your current draft first if you want to keep both.')) { feedback('Import canceled. Your current draft has not changed.'); return; }
      draft = incoming; removed = null; $('undo-area').hidden = true; renderDraft(); persist(); feedback('Draft opened. Nothing was submitted or published.');
    } catch (error) { feedback(error.message || 'This file could not be read. Your current draft has not changed.', true); }
    finally { event.target.value = ''; }
  });
  $('recover-download').addEventListener('click', () => download(corruptedRaw || '', 'abuelas-tamales-original-draft.json'));
  $('recover-reset').addEventListener('click', () => {
    if (!active) return;
    if (!window.confirm('Start again? This replaces the saved data in this browser. Download the original first if you need to keep it.')) return;
    corruptedRaw = null; draft = model.create(); $('recovery').hidden = true; $('editor-layout').hidden = false; renderDraft(); persist(); $('recipe-title').focus();
  });
  window.addEventListener('beforeunload', event => { if (active && !saved && corruptedRaw === null) { event.preventDefault(); event.returnValue = ''; } });
  try { storage = window.RecipeScopedStorage || (document.body.dataset.production === 'true' ? undefined : window.localStorage); } catch { /* Browser privacy settings can deny storage. */ }
  const result = model.read(storage);
  if (result.state === 'invalid') {
    corruptedRaw = result.raw; $('recovery').hidden = false; $('editor-layout').hidden = true;
  } else {
    if (result.state === 'restored') { draft = result.draft; feedback('Your previous draft is ready to continue.'); }
    renderDraft(); persist();
  }
  // Local simulator bridge. Does not add any remote behavior by itself.
  window.RecipeEditor = Object.freeze({
    getDraft: () => structuredClone(draft),
    destroy: () => {active=false;draft=model.create();removed=null;corruptedRaw=null;storage=undefined;saved=true;if(exportUrl)URL.revokeObjectURL(exportUrl);},
    preview: showPreview,
    replaceDraft: incoming => {
      if (!active) throw new Error('Sign in again before restoring a draft.');
      if (corruptedRaw !== null) throw new Error('Recover the existing browser draft first.');
      draft = model.parse(JSON.stringify(incoming)); removed = null;
      $('undo-area').hidden = true; $('preview-panel').hidden = true; $('recipe-form').hidden = false;
      renderDraft(); persist();
    }
  });
})();
