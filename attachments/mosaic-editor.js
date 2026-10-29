/* WCSpedia authoring layout/toolbar/expanded-canvas pattern, adapted for native
 * Mosaic pages. Content remains native storage; no Markdown round-trip or WCS
 * metadata/workflow is copied. Files are uploaded only to a confirmed page ID. */
(function (root) {
  'use strict';
  var TAGS = 'p div span h2 h3 h4 strong b em i u s strike blockquote pre code ul ol li table tbody thead tfoot tr th td caption br hr a img'.split(' ');
  var ATTRS = ['href','title','colspan','rowspan','src','alt','width','height'];
  var FORMATS = [{value:'p',label:'Normal text'},{value:'h2',label:'Heading 2'},{value:'h3',label:'Heading 3'},{value:'h4',label:'Heading 4'}];
  var IMAGE_TYPES = /^(?:image\/png|image\/jpeg|image\/webp|image\/gif)$/;
  var FILE_EXTENSIONS = /\.(?:pdf|txt|md|markdown|csv|doc|docx|xls|xlsx|ppt|pptx|png|jpe?g|webp|gif)$/i;
  var IMAGE_EXTENSIONS = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
  var FILE_MIME = {pdf:['application/pdf'],txt:['text/plain'],md:['text/plain','text/markdown'],markdown:['text/plain','text/markdown'],csv:['text/plain','text/csv','application/vnd.ms-excel'],doc:['application/msword'],docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip'],xls:['application/vnd.ms-excel'],xlsx:['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/zip'],ppt:['application/vnd.ms-powerpoint'],pptx:['application/vnd.openxmlformats-officedocument.presentationml.presentation','application/zip']};
  // Only live editor bodies registered here may opt out of the space-wide guard.
  // Authored markup cannot opt in by copying a class or data attribute.
  var dropTargets = new WeakMap(), handledDrops = new WeakSet(), dropHighlights = new Set();
  function clearDropHighlights() { dropHighlights.forEach(function (body) { body.classList.remove('is-file-drop'); }); dropHighlights.clear(); }
  function dropTarget(event) {
    if (!event || !['dragenter','dragover','drop'].includes(event.type)) return null;
    var node = event.target;
    while (node && node.nodeType) { var registration = dropTargets.get(node); if (registration) return registration; node = node.parentNode; }
    return null;
  }
  function acceptsFileDrop(event) { var target = dropTarget(event); return !!target && carriesFiles(event.dataTransfer) && target.accepts(); }
  function handleFileDrop(event) {
    // The window guard calls this even for rejected outside targets. Clear the
    // previous body's hover here because its capture block prevents bubbling.
    if (!acceptsFileDrop(event)) { clearDropHighlights(); return false; }
    if (handledDrops.has(event)) return true;
    clearDropHighlights(); handledDrops.add(event); dropTarget(event).handle(event); return true;
  }
  function carriesFiles(transfer) { return !!transfer && (!!transfer.files?.length || Array.from(transfer.types || []).includes('Files') || Array.from(transfer.items || []).some(function (item) { return item.kind === 'file'; })); }
  var ICONS = {
    bold:'M6 4h7a4 4 0 0 1 0 8H6zm0 8h8a4 4 0 0 1 0 8H6z',italic:'M10 4h10M4 20h10M15 4 9 20',underline:'M6 4v7a6 6 0 0 0 12 0V4M4 21h16',strike:'M18 6c-1-2-3-3-6-3-4 0-6 2-6 5 0 2 2 3 6 4m-7 5c1 3 4 4 7 4 4 0 6-2 6-5M3 12h18',link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',quote:'M4 7h6v6H4c0 4 2 5 4 5M14 7h6v6h-6c0 4 2 5 4 5',code:'m8 8-5 4 5 4m8-8 5 4-5 4M14 5l-4 14',image:'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M16 7h.01',file:'M14 3H5v18h14V8zM14 3v5h5M8 13h8M8 17h6',list:'M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01',ordered:'M10 6h11M10 12h11M10 18h11M3 3h2v6M3 9h4M3 14c0-2 4-2 4 0 0 1-4 4-4 6h4',codeblock:'M7 3H3v18h4M17 3h4v18h-4m-7-7-3-2 3-2m4 4 3-2-3-2',table:'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',divider:'M3 12h18',clear:'m5 4 14 16M8 4h12M14 4l-4 16M5 20h9M3 3l18 18',undo:'M3 10h12a6 6 0 0 1 0 12M3 10l5-5M3 10l5 5',redo:'M21 10H9a6 6 0 0 0 0 12M21 10l-5-5M21 10l-5 5',expand:'M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6',close:'m6 6 12 12M18 6 6 18',arrow:'M4 12h16m-6-6 6 6-6 6',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m7 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0'
  };
  function icon(name) { return '<svg class="mosaic-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>'; }
  function tool(attribute, value, label, name) { return '<button type="button" ' + attribute + '="' + value + '" aria-label="' + label + '" title="' + label + '"' + (attribute === 'data-open' ? ' aria-haspopup="dialog" aria-expanded="false"' : '') + ' disabled>' + icon(name) + '</button>'; }
  function nativeURL(config, page, parentId) {
    var context = String(config.contextPath || '/confluence').replace(/\/+$/, '');
    return page && page.id ? context + '/pages/editpage.action?pageId=' + encodeURIComponent(page.id) : context + '/pages/createpage.action?' + new URLSearchParams({spaceKey:config.spaceKey,fromPageId:parentId || config.pages.insights});
  }
  function sanitizeHTML(value, purifier, doc) {
    if (!purifier || typeof purifier.sanitize !== 'function') throw new Error('The article editor could not load its content sanitizer. Reload the page to try again.');
    var clean = purifier.sanitize(String(value || ''), {ALLOWED_TAGS:TAGS,ALLOWED_ATTR:ATTRS,ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,KEEP_CONTENT:true,FORBID_TAGS:['script','style','iframe','object','embed','svg','math']});
    var box = doc.createElement('div'); box.innerHTML = clean;
    box.querySelectorAll('a[href]').forEach(function (link) { if (!root.MosaicAPI.safeURL(link.getAttribute('href'))) link.removeAttribute('href'); });
    box.querySelectorAll('img').forEach(function (img) {
      if (!root.MosaicAPI.safeImageURL || !root.MosaicAPI.safeImageURL(img.getAttribute('src'))) { img.remove(); return; }
      ['width','height'].forEach(function (key) { if (img.hasAttribute(key) && (!/^[1-9]\d{0,3}$/.test(img.getAttribute(key)) || Number(img.getAttribute(key)) > 8192)) img.removeAttribute(key); });
    });
    box.querySelectorAll('[colspan],[rowspan]').forEach(function (cell) { ['colspan','rowspan'].forEach(function (key) { if (cell.hasAttribute(key) && !/^[1-9]\d?$/.test(cell.getAttribute(key))) cell.removeAttribute(key); }); });
    return box.innerHTML.replace(/<(br|hr)>/g, '<$1 />').replace(/<img\b([^>]*?)(?:\s*\/)?\s*>/gi,'<img$1 />');
  }
  function mount(container, options) {
    options = options || {};
    if (!container || !options.api || !options.config) throw new Error('Provide an editor container, Mosaic API and configuration.');
    var doc = container.ownerDocument, win = doc.defaultView, api = options.api, config = options.config, page = options.page || null;
    var lifecycle = new win.AbortController(), destroyed = false, busy = false, uncertain = false, ready = false, purifier = null, selection = null, baseline = null, popovers = [], formatPicker = null, destinationPicker = null;
    var files = [], renderedPending = '', nativeFiles = [], nativeMore = false, nativeStart = 0, nativeBusy = false, nativeError = false, sequence = 0, expanded = false, previewing = false, savedOverflow = null, selectedImage = null, selectedLink = null, selectedImageFile = null, selectedFiles = [], imagePreviewURL = '', activeDialog = null, dialogSequence = 0, activeTable = null, dialogTable = null, internalTextDrag = false, uploadIncomplete = false;
    var pending = !page && typeof api.getPendingPublication === 'function' ? api.getPendingPublication() : null;
    var source = page || pending || {title:'',html:''};
    var parentId = String(source.parentId || options.parentId || config.pages.insights);
    var collection = String(parentId) === String(config.pages.resources) ? 'Resources' : 'Insights';
    if (![config.pages.insights,config.pages.resources].map(String).includes(parentId)) throw new Error('Choose the configured Insights or Resources collection.');
    var section = doc.createElement('section'); section.className = 'mosaic-editor';
    section.innerHTML = '<form class="mosaic-editor-form" novalidate><div class="mosaic-editor-topbar"><div class="mosaic-editor-heading"><h1>' + (page ? 'Edit page' : 'Create a page') + '</h1><p class="mosaic-editor-eyebrow">Mosaic · ' + collection + '</p></div><div class="mosaic-editor-actions"><button type="button" class="mosaic-editor-focus-exit" hidden>Exit expanded view</button><button type="button" class="mosaic-editor-cancel">Cancel</button><button type="button" class="mosaic-editor-preview-toggle" disabled>Preview</button><button type="submit" class="mosaic-editor-publish" disabled><span class="mosaic-editor-spinner" aria-hidden="true" hidden></span><span data-publish-label>Publish</span>' + icon('arrow') + '</button></div></div>' +
      '<div class="mosaic-editor-status" role="status" aria-live="polite">Preparing editor…</div><div class="mosaic-editor-main">' +
      (!page && !pending ? '<div class="mosaic-editor-destination"><span class="mosaic-editor-field-label">Publish in</span><div data-destination></div></div>' : '') +
      '<div class="mosaic-editor-fields"><label class="mosaic-editor-title-label">Title<input class="mosaic-editor-title" name="title" maxlength="255" placeholder="Give your page a clear, useful title" autocomplete="off" disabled></label>' +
      '<label class="mosaic-editor-summary-label">Summary <span>Optional</span><textarea class="mosaic-editor-summary" name="summary" maxlength="1000" rows="2" placeholder="A short introduction to your page" disabled></textarea></label></div>' +
      '<div class="mosaic-editor-content-label">Content</div><div class="mosaic-editor-writing"><div class="mosaic-editor-toolbar" role="toolbar" aria-label="Article formatting"><div class="mosaic-editor-format" data-format></div>' +
      tool('data-command','bold','Bold · Ctrl / ⌘ B','bold') + tool('data-command','italic','Italic · Ctrl / ⌘ I','italic') + tool('data-command','underline','Underline · Ctrl / ⌘ U','underline') + tool('data-command','strikeThrough','Strikethrough','strike') + '<span class="mosaic-editor-divider"></span>' +
      tool('data-open','link','Insert link','link') + tool('data-action','quote','Block quote','quote') + tool('data-action','code','Inline code','code') + tool('data-open','image','Insert image','image') + tool('data-open','files','Attach files','file') + '<span class="mosaic-editor-toolbar-break"></span>' +
      tool('data-command','insertUnorderedList','Bulleted list','list') + tool('data-command','insertOrderedList','Numbered list','ordered') + tool('data-action','codeblock','Code block','codeblock') + tool('data-open','table','Insert table','table') + tool('data-action','divider','Horizontal divider','divider') + tool('data-command','removeFormat','Clear formatting','clear') + '<span class="mosaic-editor-divider"></span>' +
      tool('data-command','undo','Undo','undo') + tool('data-command','redo','Redo','redo') + tool('data-action','expand','Expand editor','expand') + '</div>' +
      '<div class="mosaic-editor-insert" data-panel="link" hidden><label>Link text<input type="text" data-link-text maxlength="300"></label><label>Resource URL<input type="url" data-link-url placeholder="https://… or /confluence/…" autocomplete="off"></label><p class="mosaic-editor-dialog-error" role="alert" hidden></p><div class="mosaic-editor-dialog-actions"><button type="button" data-close>Cancel</button><button type="button" data-insert-link data-dialog-primary>Insert link</button></div><button type="button" data-remove-link class="mosaic-editor-dialog-remove" hidden>Remove link</button></div>' +
      '<div class="mosaic-editor-insert" data-panel="table" hidden><p class="mosaic-editor-dialog-intro" data-table-intro>The first row contains column headings. Edit any cell directly in the document.</p><div class="mosaic-editor-dialog-grid" data-new-table><label>Rows<input type="number" data-table-rows min="2" max="12" value="3"></label><label>Columns<input type="number" data-table-cols min="1" max="8" value="3"></label></div><div class="mosaic-editor-dialog-table-tools" data-edit-table hidden><button type="button" data-table="row">Add row</button><button type="button" data-table="column">Add column</button><button type="button" data-table="before">Text before table</button><button type="button" data-table="after">Text after table</button><button type="button" data-table="remove" class="mosaic-editor-dialog-remove">Remove table</button></div><p class="mosaic-editor-dialog-error" role="alert" hidden></p><div class="mosaic-editor-dialog-actions"><button type="button" data-close>Cancel</button><button type="button" data-insert-table data-dialog-primary>Insert table</button></div></div>' +
      '<div class="mosaic-editor-insert" data-panel="image" hidden><p class="mosaic-editor-dialog-intro">Add an image where your cursor is. Its description is included for readers using assistive technology.</p><label class="mosaic-editor-dialog-upload">' + icon('image') + '<span data-image-choice>Choose PNG, JPG, WebP, or GIF</span><input type="file" data-image-file accept="image/png,image/jpeg,image/webp,image/gif" class="mosaic-editor-sr"></label><img data-image-preview class="mosaic-editor-dialog-image-preview" alt="" hidden><label>Or use an image URL<input type="url" data-image-url placeholder="/confluence/download/attachments/…" autocomplete="off"></label><label>Image description<input type="text" data-image-alt maxlength="500" placeholder="Describe what this image shows"></label><p class="mosaic-editor-file-hint">Up to 5 MB · images are saved as native page attachments.</p><p class="mosaic-editor-dialog-error" role="alert" hidden></p><div class="mosaic-editor-dialog-actions"><button type="button" data-close>Cancel</button><button type="button" data-insert-image data-dialog-primary>Insert image</button></div><button type="button" data-remove-image class="mosaic-editor-dialog-remove" hidden>Remove image</button></div>' +
      '<div class="mosaic-editor-insert" data-panel="files" hidden><div class="mosaic-editor-files-empty" data-files-empty><span class="mosaic-editor-files-empty-icon">' + icon('file') + '</span><h3>No files yet</h3><p>Add supporting documents, templates or training materials to your page.</p></div><label class="mosaic-editor-dialog-upload mosaic-editor-files-chooser">' + icon('file') + '<span>Choose files</span><input type="file" data-files multiple accept=".pdf,.txt,.md,.markdown,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif" class="mosaic-editor-sr"></label><ul class="mosaic-editor-selected-files" data-selected-files aria-label="Selected files" hidden></ul><div data-file-list aria-label="Page attachments"></div><p class="mosaic-editor-file-hint" data-attachment-status role="status" hidden></p><button type="button" data-more-attachments hidden>More attachments</button><p class="mosaic-editor-file-hint">PDF, Office, text, Markdown, CSV and images · up to 5 MB per file</p><p class="mosaic-editor-dialog-error" role="alert" hidden></p><div class="mosaic-editor-dialog-actions"><button type="button" data-close>Close</button><button type="button" data-insert-files data-dialog-primary hidden>Add files</button></div></div>' +
      '<div class="mosaic-editor-table-tools" hidden><span>Table</span><button type="button" data-table="edit">Edit table</button><button type="button" data-table="row">Add row</button><button type="button" data-table="column">Add column</button><button type="button" data-table="before">Text before</button><button type="button" data-table="after">Text after</button><button type="button" data-table="remove">Remove table</button></div>' +
      '<div class="mosaic-editor-body" role="textbox" aria-label="Article body" aria-multiline="true" contenteditable="false" spellcheck="true" data-placeholder="Write here, paste formatted text, or drop images and files…"></div>' +
      '<div class="mosaic-editor-body-bottom"><span>Drop images or files here. Paste images or formatted text. Up to 5 MB per file.</span><span data-word-count>0 words</span></div></div>' +
      '<article class="mosaic-editor-preview" tabindex="-1" aria-label="Article preview" hidden></article>' +
      '</div></form>';
    container.replaceChildren(section);
    var title = section.querySelector('.mosaic-editor-title'), summary = section.querySelector('.mosaic-editor-summary'), body = section.querySelector('.mosaic-editor-body'), status = section.querySelector('.mosaic-editor-status'), form = section.querySelector('form');
    var toolbar = section.querySelector('.mosaic-editor-toolbar'), publish = section.querySelector('.mosaic-editor-publish'), cancel = section.querySelector('.mosaic-editor-cancel'), previewButton = section.querySelector('.mosaic-editor-preview-toggle');
    var fileInput = section.querySelector('[data-files]'), imageInput = section.querySelector('[data-image-file]'), imageAlt = section.querySelector('[data-image-alt]');
    var panelParking = doc.createElement('div'); panelParking.hidden = true; panelParking.className = 'mosaic-editor-panel-parking';
    section.querySelectorAll('[data-panel]').forEach(function (panel) { panelParking.append(panel); }); section.append(panelParking);
    title.value = source.title || ''; summary.value = source.summary || '';
    function on(node, event, listener) { node.addEventListener(event, listener, {signal:lifecycle.signal}); }
    function locked() { return !ready || busy || uncertain || destroyed; }
    function canDropFiles() { return !locked() && !previewing && !activeDialog && body.isConnected && section.contains(body) && body.contentEditable === 'true'; }
    function clearFileDrop() { body.classList.remove('is-file-drop'); dropHighlights.delete(body); }
    dropTargets.set(body,{accepts:canDropFiles,handle:handleFilesGesture});
    function dirty() { return busy || uncertain || uploadIncomplete || !!(baseline && (title.value !== baseline.title || summary.value !== baseline.summary || body.innerHTML !== baseline.html || parentId !== baseline.parentId)); }
    on(win, 'beforeunload', function (event) { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
    function message(text, error) {
      if (activeDialog && error) { var notice = activeDialog.panel.querySelector('.mosaic-editor-dialog-error'); notice.textContent = text; notice.hidden = !text; return; }
      status.textContent = text; status.hidden = !text; status.classList.toggle('is-error', !!error); status.setAttribute('role', error ? 'alert' : 'status');
    }
    function updateControls() {
      var disabled = locked();
      if (disabled) clearFileDrop();
      title.disabled = disabled; summary.disabled = disabled; body.contentEditable = disabled ? 'false' : 'true';
      toolbar.querySelectorAll('button').forEach(function (node) { node.disabled = disabled; });
      if (formatPicker) formatPicker.setDisabled(disabled);
      if (destinationPicker) destinationPicker.setDisabled(disabled || !!page);
      section.querySelectorAll('.mosaic-editor-insert input,.mosaic-editor-insert button,.mosaic-editor-table-tools button,[data-files],[data-remove-file],[data-insert-attachment]').forEach(function (node) { node.disabled = disabled; });
      section.querySelector('[data-more-attachments]').disabled = disabled || nativeBusy;
      publish.disabled = !ready || busy; cancel.disabled = busy; previewButton.disabled = !ready || busy;
      section.querySelector('.mosaic-editor-spinner').hidden = !busy;
      section.querySelector('[data-publish-label]').textContent = busy ? 'Publishing…' : uncertain ? 'Check publication' : uploadIncomplete ? 'Retry publication' : page ? 'Publish changes' : 'Publish';
      form.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
    function closePanels(restoreFocus) {
      var previous = activeDialog; activeDialog = null;
      if (previous) {
        previous.events.abort(); previous.panel.hidden = true; panelParking.append(previous.panel); previous.layer.remove();
        previous.inert.forEach(function (entry) { entry[0].inert = entry[1]; });
        if (doc.body.style.overflow === 'hidden') doc.body.style.overflow = previous.overflow;
        if (restoreFocus && previous.trigger && previous.trigger.isConnected && !previous.trigger.disabled) previous.trigger.focus({preventScroll:true});
      }
      if (imagePreviewURL) { win.URL.revokeObjectURL(imagePreviewURL); imagePreviewURL = ''; }
      section.querySelectorAll('[data-panel]').forEach(function (panel) { panel.hidden = true; }); section.querySelectorAll('[data-open]').forEach(function (button) { button.setAttribute('aria-expanded','false'); });
      selectedImage = null; selectedLink = null; selectedImageFile = null; selectedFiles = []; dialogTable = null;
    }
    function sizeDialog() {
      if (!activeDialog) return; var viewport = win.visualViewport, layer = activeDialog.layer;
      layer.style.top = (viewport ? viewport.offsetTop : 0) + 'px'; layer.style.left = (viewport ? viewport.offsetLeft : 0) + 'px'; layer.style.width = (viewport ? viewport.width : win.innerWidth) + 'px'; layer.style.height = (viewport ? viewport.height : win.innerHeight) + 'px';
    }
    function openDialog(kind, heading, trigger) {
      if (locked()) return null; clearFileDrop(); closePanels(false); popovers.forEach(function (popover) { popover.close(false); }); rememberSelection();
      var panel = section.querySelector('[data-panel="' + kind + '"]'), layer = doc.createElement('div'), dialog = doc.createElement('section'), header = doc.createElement('div'), titleId = 'mosaic-editor-dialog-' + (++dialogSequence), events = new win.AbortController();
      layer.className = 'mosaic-editor-dialog-backdrop'; layer.setAttribute('data-mosaic-owned',''); dialog.className = 'mosaic-editor-dialog'; dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true'); dialog.setAttribute('aria-labelledby',titleId); dialog.tabIndex = -1;
      header.className = 'mosaic-editor-dialog-heading'; var label = doc.createElement('h2'), close = doc.createElement('button'); label.id = titleId; label.textContent = heading; close.type = 'button'; close.className = 'mosaic-editor-dialog-close'; close.setAttribute('aria-label','Close dialog'); close.innerHTML = icon('close'); header.append(label,close);
      panel.hidden = false; panel.querySelector('.mosaic-editor-dialog-error').hidden = true; dialog.append(header,panel); layer.append(dialog); section.append(layer);
      var inert = [form].map(function (node) { var entry = [node,!!node.inert]; node.inert = true; return entry; });
      activeDialog = {panel:panel,layer:layer,dialog:dialog,events:events,inert:inert,trigger:trigger || doc.activeElement,overflow:doc.body.style.overflow}; doc.body.style.overflow = 'hidden'; sizeDialog();
      var opener = section.querySelector('[data-open="' + kind + '"]'); if (opener) opener.setAttribute('aria-expanded','true');
      function focusables() { return Array.from(dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(function (node) { return !node.closest('[hidden]'); }); }
      function firstFocus() { var first = focusables().find(function (node) { return panel.contains(node); }); (first || dialog).focus({preventScroll:true}); }
      close.addEventListener('click',function () { closePanels(true); },{signal:events.signal});
      layer.addEventListener('pointerdown',function (event) { if (event.target === layer) closePanels(true); },{signal:events.signal});
      dialog.addEventListener('keydown',function (event) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closePanels(true); }
        else if (event.key === 'Tab') { var all = focusables(), index = all.indexOf(doc.activeElement); if (!all.length) { event.preventDefault(); dialog.focus(); } else if (event.shiftKey && index <= 0) { event.preventDefault(); all[all.length - 1].focus(); } else if (!event.shiftKey && index === all.length - 1) { event.preventDefault(); all[0].focus(); } }
        else if (event.key === 'Enter' && event.target.tagName === 'INPUT' && event.target.type !== 'file') { event.preventDefault(); var primary = panel.querySelector('[data-dialog-primary]'); if (primary && !primary.hidden) primary.click(); }
      },{signal:events.signal});
      doc.addEventListener('focusin',function (event) { if (activeDialog && activeDialog.dialog === dialog && !dialog.contains(event.target)) firstFocus(); },{signal:events.signal});
      firstFocus(); return panel;
    }
    function rememberSelection() {
      var current = doc.getSelection();
      if (current && current.rangeCount && body.contains(current.getRangeAt(0).commonAncestorContainer)) {
        selection = current.getRangeAt(0).cloneRange();
        var node = current.anchorNode, element = node && (node.nodeType === 1 ? node : node.parentElement), block = element && element.closest('p,h2,h3,h4');
        if (formatPicker) formatPicker.setValue(block && body.contains(block) ? block.tagName.toLowerCase() : 'p');
        activeTable = element && element.closest('table'); if (activeTable && !body.contains(activeTable)) activeTable = null;
        section.querySelector('.mosaic-editor-table-tools').hidden = !activeTable;
      }
    }
    function restoreSelection() {
      body.focus();
      var current = doc.getSelection();
      if (selection && body.contains(selection.commonAncestorContainer)) { current.removeAllRanges(); current.addRange(selection); }
      else { var range = doc.createRange(); range.selectNodeContents(body); range.collapse(false); current.removeAllRanges(); current.addRange(range); }
    }
    function changed() { var count = body.textContent.trim().split(/\s+/).filter(Boolean).length; section.querySelector('[data-word-count]').textContent = count + (count === 1 ? ' word' : ' words'); rememberSelection(); if((files.length||renderedPending)&&referencedFiles().map(function(item){return item.id;}).join('|')!==renderedPending)renderFiles(); }
    function command(name, value) {
      if (locked()) return; restoreSelection();
      if (typeof doc.execCommand !== 'function') { message('This browser cannot apply formatting here. Your text remains unchanged.',true); return; }
      doc.execCommand(name, false, value || null); changed();
    }
    function insertHTML(html) {
      if (locked()) return; restoreSelection();
      var current = doc.getSelection();
      if (typeof doc.execCommand === 'function' && doc.execCommand('insertHTML', false, html)) { changed(); return; }
      var range = current.getRangeAt(0), fragment = range.createContextualFragment(html), end = fragment.lastChild;
      range.deleteContents(); range.insertNode(fragment);
      if (end) { range.setStartAfter(end); range.collapse(true); current.removeAllRanges(); current.addRange(range); }
      changed();
    }
    function setExpanded(value) {
      if (destroyed || expanded === value) return;
      expanded = value; section.classList.toggle('is-expanded',expanded);
      section.querySelector('.mosaic-editor-focus-exit').hidden = !expanded;
      var expandButton = section.querySelector('[data-action="expand"]'); expandButton.setAttribute('aria-pressed',String(expanded)); expandButton.setAttribute('aria-label',expanded ? 'Exit expanded editor' : 'Expand editor'); expandButton.title = expandButton.getAttribute('aria-label');
      if (expanded) { savedOverflow = doc.body.style.overflow; doc.body.style.overflow = 'hidden'; sizeExpanded(); }
      else { if (doc.body.style.overflow === 'hidden') doc.body.style.overflow = savedOverflow || ''; savedOverflow = null; }
    }
    function sizeExpanded() {
      sizeDialog();
      if (!expanded || destroyed) return; var viewport = win.visualViewport;
      [['top',viewport ? viewport.offsetTop : 0],['left',viewport ? viewport.offsetLeft : 0],['width',viewport ? viewport.width : win.innerWidth],['height',viewport ? viewport.height : win.innerHeight]].forEach(function (pair) { section.style.setProperty('--mosaic-editor-viewport-' + pair[0],pair[1] + 'px'); });
    }
    on(win,'resize',sizeExpanded); if (win.visualViewport) { on(win.visualViewport,'resize',sizeExpanded); on(win.visualViewport,'scroll',sizeExpanded); }
    on(section.querySelector('.mosaic-editor-focus-exit'),'click',function () { setExpanded(false); section.querySelector('[data-action="expand"]').focus(); });
    on(section,'keydown',function (event) { if (event.key === 'Escape' && !activeDialog && expanded) { event.preventDefault(); setExpanded(false); } });
    function pendingNodes(box, id) { return Array.from(box.querySelectorAll('[data-mosaic-pending]')).filter(function (node) { return node.getAttribute('data-mosaic-pending') === id; }); }
    function referencedFiles() {
      var ids=new Set(Array.from(body.querySelectorAll('[data-mosaic-pending]'),function(node){return node.getAttribute('data-mosaic-pending');}));
      // Keep removed local records until publication/teardown so native Undo can
      // restore a reference, but never upload a file absent from the current body.
      return files.filter(function(item){return ids.has(item.id);});
    }
    function revoke(item) { if (item.objectURL) { win.URL.revokeObjectURL(item.objectURL); item.objectURL = ''; } }
    function updateFilesEmpty() { section.querySelector('[data-files-empty]').hidden = !!(nativeFiles.length || referencedFiles().length || selectedFiles.length || nativeBusy || nativeError); }
    function renderFiles() {
      var list = section.querySelector('[data-file-list]'); list.replaceChildren();
      function heading(text) { var title = doc.createElement('h3'); title.className = 'mosaic-editor-files-heading'; title.textContent = text; list.append(title); }
      if (nativeFiles.length) heading('On this page');
      nativeFiles.forEach(function (item) {
        var row = doc.createElement('div'); row.className = 'mosaic-editor-file'; var label = doc.createElement('div'), name = doc.createElement('a'), state = doc.createElement('span'), insert = doc.createElement('button');
        var displayName = item.displayName || item.name;
        name.textContent = displayName; name.href = item.url; name.target = '_blank'; name.rel = 'noopener'; state.textContent = Math.max(1,Math.round(item.size / 1024)) + ' KB'; label.append(name,state);
        insert.type = 'button'; insert.dataset.insertAttachment = item.id; insert.textContent = IMAGE_TYPES.test(item.mediaType) ? 'Insert image' : 'Insert link'; insert.setAttribute('aria-label',insert.textContent + ': ' + displayName); insert.disabled = locked(); row.append(label,insert); list.append(row);
      });
      var visibleFiles=referencedFiles();renderedPending=visibleFiles.map(function(item){return item.id;}).join('|');
      if (visibleFiles.length) heading('In this draft');
      visibleFiles.forEach(function (item) {
        var row = doc.createElement('div'); row.className = 'mosaic-editor-file'; var label = doc.createElement('div'), name = doc.createElement('strong'), state = doc.createElement('span'), remove = doc.createElement('button');
        name.textContent = item.file.name; state.textContent = Math.max(1,Math.round(item.file.size / 1024)) + ' KB · ' + (item.uploaded ? 'Uploaded' : 'Ready to upload'); label.append(name,state); remove.type = 'button'; remove.dataset.removeFile = item.id; remove.setAttribute('aria-label','Remove ' + item.file.name); remove.innerHTML = icon('close'); remove.disabled = locked();
        row.append(label,remove); list.append(row);
      });
      updateFilesEmpty();
    }
    async function loadNativeFiles() {
      if (!page || typeof api.listAttachments !== 'function' || nativeBusy || destroyed) return;
      nativeBusy = true; nativeError = false; var feedback = section.querySelector('[data-attachment-status]'), more = section.querySelector('[data-more-attachments]');
      feedback.hidden = false; feedback.textContent = 'Loading attachments…'; more.disabled = true; updateFilesEmpty();
      try {
        var result = await api.listAttachments({pageId:page.id,start:nativeStart,limit:100,signal:lifecycle.signal}); if (destroyed) return;
        result.results.forEach(function (item) { if (!nativeFiles.some(function (known) { return known.id === item.id; })) nativeFiles.push(item); });
        nativeMore = result.hasMore; nativeStart = result.nextStart; feedback.hidden = true; renderFiles();
      } catch (error) { if (destroyed) return; nativeError = true; feedback.textContent = error.message || 'Attachments could not be loaded.'; }
      finally { nativeBusy = false; if (!destroyed) { more.hidden = !nativeMore && !nativeError; more.textContent = nativeError ? 'Retry attachments' : 'More attachments'; updateFilesEmpty(); updateControls(); } }
    }
    function imageType(file) { return IMAGE_EXTENSIONS[String(file && file.name || '').split('.').pop().toLowerCase()] || ''; }
    function validFile(file, imageOnly) {
      if (!file || typeof file.name !== 'string' || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > 5 * 1024 * 1024 || typeof file.slice !== 'function' || !FILE_EXTENSIONS.test(file.name || '') || file.name.length > 180 || /[\/\\\u0000-\u001f\u007f]/.test(file.name)) return false;
      var image = imageType(file), type = String(file.type || '').toLowerCase(), extension = file.name.split('.').pop().toLowerCase();
      if (image) return !type || type === image;
      return !imageOnly && (!type || type === 'application/octet-stream' || (FILE_MIME[extension] || []).includes(type));
    }
    function removeUnusedPending(id) { if (id && !pendingNodes(body,id).length) { files = files.filter(function (item) { if (item.id !== id) return true; revoke(item); return false; }); renderFiles(); } }
    function stageFiles(incoming, imageOnly, description, replacement) {
      if (locked()) return 0;
      if (typeof api.uploadAttachment !== 'function' || typeof root.MosaicAPI.createAttachmentHTML !== 'function') { message('Attachment uploads are unavailable. Reload the page to try again.',true); return 0; }
      var incomingFiles = Array.from(incoming || []), rejected = incomingFiles.filter(function (file) { return !validFile(file,imageOnly); });
      if (rejected.length) { message('No files were added. Choose supported files up to 5 MB each.',true); return 0; }
      var prepared = [], markup = [];
      try { incomingFiles.forEach(function (file) {
        var image = !!imageType(file);
        var item = {id:'file-' + (++sequence),file:file,image:image,alt:description == null ? file.name.replace(/\.[^.]+$/,'') : description,uploaded:null,objectURL:''};
        prepared.push(item);
        var node = doc.createElement(image ? 'img' : 'a'); node.setAttribute('data-mosaic-pending',item.id);
        if (image) { node.alt = item.alt; if (typeof win.URL.createObjectURL === 'function') { item.objectURL = win.URL.createObjectURL(file); node.src = item.objectURL; } }
        else { node.href = '#'; node.textContent = file.name; }
        item.node = node;
      }); } catch (_) { prepared.forEach(revoke); message('The files could not be prepared. No files were added; try the file chooser.',true); return 0; }
      prepared.forEach(function (item) {
        var node = item.node; delete item.node; files.push(item);
        if (replacement && body.contains(replacement)) { var oldId = replacement.getAttribute('data-mosaic-pending'); replacement.replaceWith(node); replacement = null; removeUnusedPending(oldId); }
        else markup.push('<p>' + node.outerHTML + '</p><p><br /></p>');
      });
      // A multi-file insertion is one native edit transaction, preserving Undo.
      if (markup.length) insertHTML(markup.join(''));
      renderFiles(); changed();
      message(''); return prepared.length;
    }
    function serializableBody(includeUploaded) {
      var clone = body.cloneNode(true);
      clone.querySelectorAll('[data-mosaic-pending]').forEach(function (node) {
        var item = files.find(function (value) { return value.id === node.getAttribute('data-mosaic-pending'); });
        if (includeUploaded && item && item.uploaded) node.outerHTML = root.MosaicAPI.createAttachmentHTML(item.uploaded,{image:item.image,alt:node.hasAttribute('alt') ? node.getAttribute('alt') : item.alt});
        else node.remove();
      });
      if (!clone.textContent.trim() && !clone.querySelector('img')) return '';
      return sanitizeHTML(clone.innerHTML,purifier,doc);
    }
    function fillPreview(target) {
      var clone = body.cloneNode(true), images = [];
      clone.querySelectorAll('[data-mosaic-pending]').forEach(function (node) {
        var item = files.find(function (value) { return value.id === node.getAttribute('data-mosaic-pending'); });
        if (!item) { node.remove(); return; }
        if (item.uploaded) { node.outerHTML = root.MosaicAPI.createAttachmentHTML(item.uploaded,{image:item.image,alt:node.getAttribute('alt') || ''}); return; }
        if (!item.image || !item.objectURL) { node.replaceWith(doc.createTextNode(item.file.name)); return; }
        // Sanitize the document first, then insert only this editor's known local
        // object URLs. Pasted blob/data URLs never receive this exception.
        var marker = 'mosaic-local-preview-' + item.id + '-' + images.length, placeholder = doc.createElement('span'); placeholder.textContent = marker; node.replaceWith(placeholder);
        images.push({marker:marker,url:item.objectURL,alt:node.getAttribute('alt') || ''});
      });
      target.innerHTML = sanitizeHTML(clone.innerHTML,purifier,doc);
      images.forEach(function (item) { var marker = Array.from(target.querySelectorAll('span')).find(function (node) { return node.textContent === item.marker; }); if (marker) { var img = doc.createElement('img'); img.src = item.url; img.alt = item.alt; marker.replaceWith(img); } });
      target.querySelectorAll('a').forEach(function (link) { link.target = '_blank'; link.rel = 'noopener'; });
    }
    function imageURL(value) {
      if (!page) return null;
      try { var url = new URL(value,win.location.href), context = String(config.contextPath || '/confluence').replace(/\/+$/,'');
        if (url.origin !== win.location.origin || url.username || url.password || url.hash || !url.pathname.startsWith(context + '/download/attachments/' + page.id + '/')) return null;
        var relative = url.pathname + url.search; return root.MosaicAPI.safeImageURL(relative) ? relative : null;
      } catch (_) { return null; }
    }
    function showImagePreview() {
      var preview = section.querySelector('[data-image-preview]'); if (imagePreviewURL) { win.URL.revokeObjectURL(imagePreviewURL); imagePreviewURL = ''; }
      var src = selectedImage && selectedImage.getAttribute('src') || '';
      if (selectedImageFile && validFile(selectedImageFile,true) && typeof win.URL.createObjectURL === 'function') { imagePreviewURL = win.URL.createObjectURL(selectedImageFile); src = imagePreviewURL; }
      else if (!selectedImageFile && section.querySelector('[data-image-url]').value.trim()) src = imageURL(section.querySelector('[data-image-url]').value.trim()) || '';
      preview.hidden = !src; if (src) preview.src = src; else preview.removeAttribute('src'); preview.alt = imageAlt.value || '';
    }
    function showImagePanel(existing, file) {
      if (!openDialog('image',existing ? 'Edit image' : 'Insert image',section.querySelector('[data-open="image"]'))) return;
      selectedImage = existing || null; selectedImageFile = file || null; imageInput.value = ''; imageAlt.value = existing ? existing.alt : file ? file.name.replace(/\.[^.]+$/,'') : '';
      section.querySelector('[data-image-url]').value = existing && imageURL(existing.getAttribute('src')) || '';
      section.querySelector('[data-image-choice]').textContent = file ? file.name : existing ? 'Choose a replacement image' : 'Choose PNG, JPG, WebP, or GIF';
      section.querySelector('[data-insert-image]').textContent = existing ? 'Update image' : 'Insert image'; section.querySelector('[data-remove-image]').hidden = !existing; showImagePreview();
      if (existing) imageAlt.focus();
    }
    function showTablePanel(table) {
      if (!openDialog('table',table ? 'Edit table' : 'Insert table',section.querySelector('[data-open="table"]'))) return;
      dialogTable = table || null; section.querySelector('[data-new-table]').hidden = !!table; section.querySelector('[data-edit-table]').hidden = !table;
      section.querySelector('[data-table-intro]').textContent = table ? 'Edit cells directly in the document, or use these table controls.' : 'The first row contains column headings. Edit any cell directly in the document.';
      section.querySelector('[data-panel="table"] [data-close]').hidden = !!table;
      section.querySelector('[data-insert-table]').textContent = table ? 'Done' : 'Insert table';
      section.querySelector(table ? '[data-edit-table] [data-table="row"]' : '[data-table-rows]').focus({preventScroll:true});
    }
    function showFilesPanel(incoming) {
      if (!openDialog('files','Attachments',section.querySelector('[data-open="files"]'))) return;
      selectedFiles = Array.from(incoming || []); fileInput.value = ''; showSelectedFiles(); renderFiles();
    }
    function showSelectedFiles() { section.querySelector('[data-insert-files]').hidden = !selectedFiles.length; updateFilesEmpty(); var list = section.querySelector('[data-selected-files]'); list.replaceChildren(); list.hidden = !selectedFiles.length; selectedFiles.forEach(function (file) { var item = doc.createElement('li'); item.textContent = file.name + ' · ' + Math.max(1,Math.round(file.size / 1024)) + ' KB'; list.append(item); }); }
    function showLinkPanel(existing) {
      var text = existing ? existing.textContent : selection ? selection.toString() : '';
      if (!openDialog('link',existing ? 'Edit link' : 'Insert link',section.querySelector('[data-open="link"]'))) return;
      selectedLink = existing || null; section.querySelector('[data-link-text]').value = text; section.querySelector('[data-link-url]').value = existing ? existing.getAttribute('href') || '' : '';
      section.querySelector('[data-insert-link]').textContent = existing ? 'Update link' : 'Insert link'; section.querySelector('[data-remove-link]').hidden = !existing;
    }
    function selectedElement(tag) {
      if (!selection || !body.contains(selection.commonAncestorContainer)) return null;
      var node = selection.commonAncestorContainer.nodeType === 1 ? selection.commonAncestorContainer : selection.commonAncestorContainer.parentElement;
      var element = node.closest && node.closest(tag); if (element && body.contains(element)) return element;
      if (selection.startContainer === selection.endContainer && selection.endOffset === selection.startOffset + 1) { var child = selection.startContainer.childNodes[selection.startOffset]; if (child && child.nodeType === 1 && child.tagName.toLowerCase() === tag) return child; }
      return null;
    }
    on(body,'keyup',rememberSelection); on(body,'mouseup',rememberSelection); on(body,'focusout',rememberSelection); on(body,'input',changed);
    on(toolbar,'mousedown',function (event) { rememberSelection(); if (event.target.closest('button[data-command],button[data-open],button[data-action]')) event.preventDefault(); });
    on(toolbar,'click',function (event) {
      var button = event.target.closest('button'); if (!button || button.disabled || locked()) return;
      if (button.dataset.command) { closePanels(); command(button.dataset.command); return; }
      if (button.dataset.open) {
        rememberSelection(); var kind = button.dataset.open;
        if (kind === 'image') showImagePanel(selectedElement('img'));
        else if (kind === 'table') showTablePanel(activeTable);
        else if (kind === 'link') showLinkPanel(selectedElement('a'));
        else if (kind === 'files') showFilesPanel(); return;
      }
      closePanels(); var action = button.dataset.action;
      if (action === 'expand') { setExpanded(!expanded); restoreSelection(); }
      if (action === 'quote') command('formatBlock','blockquote');
      if (action === 'codeblock') command('formatBlock','pre');
      if (action === 'divider') insertHTML('<hr /><p><br /></p>');
      if (action === 'code') { var code = doc.createElement('code'); code.textContent = selection ? selection.toString() : ''; if (!code.textContent) code.textContent = 'code'; insertHTML(code.outerHTML); }
    });
    section.querySelectorAll('[data-close]').forEach(function (button) { on(button,'click',function () { closePanels(true); }); });
    on(section.querySelector('[data-insert-link]'),'click',function () {
      if (locked()) return; var href = section.querySelector('[data-link-url]').value.trim(), label = section.querySelector('[data-link-text]').value.trim() || href;
      if (!root.MosaicAPI.safeURL(href)) { message('Enter an https://, http://, mailto:, tel: or same-site link.',true); return; }
      var existing = selectedLink, link = doc.createElement('a'); link.href = href; link.textContent = label; closePanels(false);
      if (existing && body.contains(existing)) { existing.replaceWith(link); changed(); restoreSelection(); } else insertHTML(sanitizeHTML(link.outerHTML,purifier,doc)); message('');
    });
    on(section.querySelector('[data-remove-link]'),'click',function () { if (locked() || !selectedLink || !body.contains(selectedLink)) return; var link = selectedLink; closePanels(false); link.replaceWith(doc.createTextNode(link.textContent)); changed(); restoreSelection(); });
    on(section.querySelector('[data-insert-table]'),'click',function () {
      if (locked()) return; if (dialogTable) { closePanels(true); return; } var rows = Number(section.querySelector('[data-table-rows]').value), cols = Number(section.querySelector('[data-table-cols]').value);
      if (!Number.isInteger(rows) || rows < 2 || rows > 12 || !Number.isInteger(cols) || cols < 1 || cols > 8) { message('Choose 2–12 rows and 1–8 columns.',true); return; }
      var table = '<p><br /></p><table><tbody>';
      for (var row = 0; row < rows; row++) { table += '<tr>'; for (var col = 0; col < cols; col++) table += row === 0 ? '<th>Heading</th>' : '<td><br /></td>'; table += '</tr>'; }
      closePanels(false); insertHTML(table + '</tbody></table><p><br /></p>'); message('');
    });
    function tableParagraph(before) {
      if (!activeTable || !body.contains(activeTable)) return;
      var paragraph = before ? activeTable.previousElementSibling : activeTable.nextElementSibling;
      if (!paragraph || paragraph.tagName !== 'P') { paragraph = doc.createElement('p'); paragraph.append(doc.createElement('br')); activeTable.parentNode.insertBefore(paragraph,before ? activeTable : activeTable.nextSibling); }
      var range = doc.createRange(); range.selectNodeContents(paragraph); range.collapse(!before); selection = range; restoreSelection(); changed();
    }
    function editTable(event) {
      var button = event.target.closest('[data-table]'), table = dialogTable || activeTable; if (!button || locked() || !table || !body.contains(table)) return;
      var action = button.dataset.table; if (action === 'edit') { showTablePanel(table); return; }
      if (action === 'before' || action === 'after') { closePanels(false); activeTable = table; tableParagraph(action === 'before'); return; }
      if (action === 'remove') { closePanels(false); table.remove(); activeTable = null; section.querySelector('.mosaic-editor-table-tools').hidden = true; changed(); restoreSelection(); return; }
      // Merged cells need a grid-aware native edit. Never reinterpret their spans
      // or silently discard existing cell contents while extending a table.
      if (table.querySelector('[rowspan]:not([rowspan="1"]),[colspan]:not([colspan="1"])')) { message('Add rows or columns to merged tables in the native editor; the existing cells are preserved here.',true); return; }
      if (action === 'row' && table.rows.length < 100) { var row = table.insertRow(); for (var c = 0; c < table.rows[0].cells.length; c++) row.insertCell().append(doc.createElement('br')); }
      if (action === 'column' && table.rows.length && table.rows[0].cells.length < 20) Array.from(table.rows).forEach(function (row) { var cell = doc.createElement(row.cells.length && row.cells[0].tagName === 'TH' ? 'th' : 'td'); cell.append(doc.createElement('br')); row.append(cell); });
      changed();
    }
    on(section.querySelector('.mosaic-editor-table-tools'),'click',editTable); on(section.querySelector('[data-edit-table]'),'click',editTable);
    on(body,'keydown',function (event) {
      if (locked()) return; rememberSelection();
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && activeTable) { event.preventDefault(); tableParagraph(event.shiftKey); }
      if (event.key === 'Tab' && activeTable) {
        var current = doc.getSelection(), el = current.anchorNode && (current.anchorNode.nodeType === 1 ? current.anchorNode : current.anchorNode.parentElement), cell = el && el.closest('td,th'), cells = Array.from(activeTable.querySelectorAll('td,th')), index = cells.indexOf(cell);
        if (index < 0) return;
        event.preventDefault(); var next = cells[index + (event.shiftKey ? -1 : 1)];
        if (next) { var range = doc.createRange(); range.selectNodeContents(next); range.collapse(true); selection = range; restoreSelection(); }
        else tableParagraph(event.shiftKey);
      }
    });
    on(imageInput,'change',function () { selectedImageFile = imageInput.files[0] || null; section.querySelector('[data-image-choice]').textContent = selectedImageFile ? selectedImageFile.name : 'Choose PNG, JPG, WebP, or GIF'; if (selectedImageFile && !imageAlt.value) imageAlt.value = selectedImageFile.name.replace(/\.[^.]+$/,''); showImagePreview(); });
    on(section.querySelector('[data-image-url]'),'input',showImagePreview); on(imageAlt,'input',showImagePreview);
    on(section.querySelector('[data-insert-image]'),'click',function () {
      if (locked()) return;
      var existing = selectedImage, file = selectedImageFile, alt = imageAlt.value.trim(), urlValue = section.querySelector('[data-image-url]').value.trim(), sourceURL = urlValue ? imageURL(urlValue) : '';
      if (file) {
        if (!validFile(file,true)) { message('Choose a PNG, JPG, WebP or GIF image up to 5 MB.',true); return; }
        if (typeof api.uploadAttachment !== 'function') { message('Attachment uploads are unavailable. Reload the page to try again.',true); return; }
        closePanels(false); stageFiles([file],true,alt,existing); return;
      }
      if (urlValue && !sourceURL) { message('Use an image attached to this page, or choose an image file to upload.',true); return; }
      if (existing && body.contains(existing)) {
        var oldId = existing.getAttribute('data-mosaic-pending'); existing.alt = alt;
        if (sourceURL && existing.getAttribute('src') !== sourceURL) { existing.src = sourceURL; existing.removeAttribute('data-mosaic-pending'); removeUnusedPending(oldId); }
        closePanels(false); changed(); restoreSelection(); return;
      }
      if (!sourceURL) { message('Choose an image to insert.',true); return; }
      var img = doc.createElement('img'); img.src = sourceURL; img.alt = alt; closePanels(false); insertHTML('<p>' + sanitizeHTML(img.outerHTML,purifier,doc) + '</p><p><br /></p>');
    });
    on(section.querySelector('[data-remove-image]'),'click',function () {
      if (locked() || !selectedImage || !body.contains(selectedImage)) return;
      var id = selectedImage.getAttribute('data-mosaic-pending'); selectedImage.remove();
      removeUnusedPending(id); closePanels(false); changed(); restoreSelection();
    });
    on(body,'click',function (event) { if (!locked() && event.target.tagName === 'IMG') { rememberSelection(); showImagePanel(event.target); } else if (event.target.closest('a')) { event.preventDefault(); if (!locked()) { rememberSelection(); showLinkPanel(event.target.closest('a')); } } });
    on(fileInput,'change',function () { selectedFiles = Array.from(fileInput.files); showSelectedFiles(); });
    on(section.querySelector('[data-insert-files]'),'click',function () { if (locked()) return; if (!selectedFiles.length) { message('Choose files to attach.',true); return; } if (selectedFiles.some(function (file) { return !validFile(file,false); })) { message('Choose supported files up to 5 MB each.',true); return; } if (typeof api.uploadAttachment !== 'function') { message('Attachment uploads are unavailable. Reload the page to try again.',true); return; } var incoming = selectedFiles.slice(); closePanels(false); stageFiles(incoming,false); });
    on(section.querySelector('[data-file-list]'),'click',function (event) {
      var insert = event.target.closest('[data-insert-attachment]');
      if (insert && !locked()) { var attachment = nativeFiles.find(function (item) { return item.id === insert.dataset.insertAttachment; }); if (attachment) { closePanels(false); insertHTML('<p>' + root.MosaicAPI.createAttachmentHTML(attachment,{image:IMAGE_TYPES.test(attachment.mediaType)}) + '</p><p><br /></p>'); } return; }
      var button = event.target.closest('[data-remove-file]'); if (!button || locked()) return;
      var item = files.find(function (value) { return value.id === button.dataset.removeFile; }); if (!item) return;
      pendingNodes(body,item.id).forEach(function (node) { node.remove(); }); revoke(item); files = files.filter(function (value) { return value !== item; }); renderFiles(); changed(); fileInput.focus({preventScroll:true});
    });
    on(section.querySelector('[data-more-attachments]'),'click',function () { if (!locked()) loadNativeFiles(); });
    on(body,'paste',function (event) {
      event.preventDefault(); if (locked() || !event.clipboardData) return;
      if (event.clipboardData.files.length) { if (event.clipboardData.files.length === 1 && IMAGE_TYPES.test(event.clipboardData.files[0].type)) showImagePanel(null,event.clipboardData.files[0]); else showFilesPanel(event.clipboardData.files); return; }
      var html = event.clipboardData.getData('text/html');
      if (!html) { var text = doc.createElement('div'); text.textContent = event.clipboardData.getData('text/plain'); html = text.innerHTML.replace(/\r?\n/g,'<br />'); }
      var cleaned = sanitizeHTML(html,purifier,doc); insertHTML(cleaned);
      if (/<img\b/i.test(html) && !/<img\b/i.test(cleaned)) message('External images were not copied. Use Insert image to upload the original file.');
    });
    function dropSelection(event) {
      var range = null;
      try {
        if (typeof doc.caretPositionFromPoint === 'function') {
          var caret = doc.caretPositionFromPoint(event.clientX,event.clientY);
          if (caret && body.contains(caret.offsetNode)) { range = doc.createRange(); range.setStart(caret.offsetNode,caret.offset); range.collapse(true); }
        }
        if (!range && typeof doc.caretRangeFromPoint === 'function') range = doc.caretRangeFromPoint(event.clientX,event.clientY);
      } catch (_) { /* Use the last valid writing position when hit-testing is unavailable. */ }
      if (range && body.contains(range.commonAncestorContainer)) { selection = range.cloneRange(); selection.collapse(true); }
      else { rememberSelection(); if (selection && body.contains(selection.commonAncestorContainer)) { selection = selection.cloneRange(); selection.collapse(false); } }
    }
    function handleFilesGesture(event) {
      event.preventDefault(); event.stopImmediatePropagation();
      try { event.dataTransfer.dropEffect = 'copy'; } catch (_) {}
      if (event.type !== 'drop') { body.classList.add('is-file-drop'); dropHighlights.add(body); return; }
      clearFileDrop(); internalTextDrag = false;
      var incoming, items;
      try {
        incoming = Array.from(event.dataTransfer.files || []); items = Array.from(event.dataTransfer.items || []).filter(function (item) { return item.kind === 'file'; });
        if (!incoming.length || items.length > incoming.length || items.some(function (item) { var entry = typeof item.webkitGetAsEntry === 'function' && item.webkitGetAsEntry(); return entry && entry.isDirectory; })) { message('No files were added. Drop individual files rather than a folder.',true); return; }
      } catch (_) { message('The dropped files could not be read. Try the file chooser.',true); return; }
      if (incoming.some(function (file) { return !validFile(file,false); })) { message('No files were added. Choose supported files up to 5 MB each.',true); return; }
      dropSelection(event);
      var added = stageFiles(incoming,false);
      if (added) message(added + (added === 1 ? ' file added' : ' files added') + ' to the draft. Files upload when you publish.');
    }
    on(body,'dragenter',function (event) { handleFileDrop(event); });
    on(body,'dragover',function (event) { handleFileDrop(event); });
    on(body,'dragleave',function (event) { if (!event.relatedTarget || !body.contains(event.relatedTarget)) clearFileDrop(); });
    on(win,'dragend',clearFileDrop); on(win,'drop',clearFileDrop); on(win,'blur',clearFileDrop);
    on(win,'keydown',function (event) { if (event.key === 'Escape') clearFileDrop(); });
    on(body,'dragstart',function () { internalTextDrag = !locked(); }); on(body,'dragend',function () { internalTextDrag = false; });
    on(body,'drop',function (event) {
      if (carriesFiles(event.dataTransfer)) { if (!handleFileDrop(event)) { event.preventDefault(); event.stopImmediatePropagation(); clearFileDrop(); } return; }
      if (locked() || previewing || activeDialog || !event.dataTransfer) { event.preventDefault(); return; }
      if (internalTextDrag) { internalTextDrag = false; return; }
      event.preventDefault();
      dropSelection(event);
      var html = event.dataTransfer.getData('text/html'); if (!html) { var text = doc.createElement('div'); text.textContent = event.dataTransfer.getData('text/plain'); html = text.innerHTML.replace(/\r?\n/g,'<br />'); } if (html) insertHTML(sanitizeHTML(html,purifier,doc));
    });
    on(previewButton,'click',function () {
      if (!ready || busy) return; clearFileDrop(); closePanels(); previewing = !previewing;
      var preview = section.querySelector('.mosaic-editor-preview'); preview.replaceChildren();
      if (previewing) {
        var heading = doc.createElement('h1'), intro = doc.createElement('p'), content = doc.createElement('div'); heading.textContent = title.value || 'Untitled page'; intro.className = 'mosaic-editor-preview-summary'; intro.textContent = summary.value;
        fillPreview(content);
        preview.append(heading); if (summary.value) preview.append(intro); preview.append(content);
      }
      section.querySelector('.mosaic-editor-fields').hidden = previewing; section.querySelector('.mosaic-editor-content-label').hidden = previewing; section.querySelector('.mosaic-editor-writing').hidden = previewing;
      preview.hidden = !previewing; previewButton.textContent = previewing ? 'Edit' : 'Preview'; previewButton.setAttribute('aria-pressed',String(previewing)); if (!previewing) restoreSelection(); else preview.focus();
    });
    on(cancel,'click',function () { if (!busy && typeof options.onCancel === 'function') options.onCancel(); });
    on(form,'submit',async function (event) {
      event.preventDefault(); if (!ready || busy) return; closePanels();
      var html, toUpload, resumingAttachments = !!(pending && pending.attachmentsPending && !page && uncertain);
      try {
        if (!title.value.trim()) throw new Error('Enter an article title.');
        toUpload = referencedFiles();
        html = serializableBody(true);
        if (!toUpload.length && !resumingAttachments) { if (html || !summary.value.trim()) root.MosaicAPI.validateHTML(html); }
        else if (toUpload.length && typeof api.uploadAttachment !== 'function') throw new Error('Attachment uploads are unavailable. Reload the page to try again.');
      } catch (error) { message(error.message,true); return; }
      busy = true; updateControls(); message(uncertain ? 'Checking the original publication…' : 'Publishing to Confluence…');
      var published, beganWithPage = !!page;
      try {
        if (toUpload.length && !page) {
          page = await api.publish({title:title.value.trim(),summary:summary.value.trim(),html:html,parentId:parentId,attachmentsPending:true});
          if (destroyed) return; uncertain = false; uploadIncomplete = true;
        }
        for (var i = 0; i < toUpload.length; i++) {
          var item = toUpload[i]; if (item.uploaded) continue;
          message('Uploading ' + item.file.name + '…');
          item.uploaded = await api.uploadAttachment({pageId:page.id,file:item.file,signal:lifecycle.signal});
          if (destroyed) return; renderFiles(); uploadIncomplete = true;
        }
        html = serializableBody(true);
        published = await api.publish({id:page && page.id || undefined,title:title.value.trim(),summary:summary.value.trim(),html:html,version:page && page.version || undefined,parentId:parentId,attachmentsPending:resumingAttachments || undefined});
        if (destroyed) return;
        if (resumingAttachments) {
          page = published; published = null; pending = null; uncertain = false; uploadIncomplete = true;
          message('The original page is confirmed. Choose its files again to finish publishing; selected files are kept only in the current editor view.');
          return;
        }
        page = published; uncertain = false; uploadIncomplete = false;
        body.innerHTML = sanitizeHTML(published.editorHtml == null ? html : published.editorHtml,purifier,doc);
        files.forEach(revoke); files = []; renderFiles(); selection = null; activeTable = null; section.querySelector('.mosaic-editor-table-tools').hidden = true;
        baseline = {title:title.value,summary:summary.value,html:body.innerHTML,parentId:parentId};
        message('Article published.'); changed();
      } catch (error) {
        if (destroyed) return;
        uncertain = !!error.uncertain || error.code === 'PENDING_PUBLICATION';
        if (toUpload.length && page) uploadIncomplete = true;
        var prefix = uploadIncomplete ? (beganWithPage ? 'The page update is incomplete. ' : 'The page was created, but its attachments or final content are incomplete. ') : '';
        message(prefix + (error.message || 'Publication failed. Your content remains in this editor.') + (uploadIncomplete ? ' Retry publication to finish this same page.' : ''),true);
      } finally { busy = false; if (!destroyed) updateControls(); }
      if (published && !destroyed && typeof options.onPublished === 'function') options.onPublished(published);
    });
    (async function () {
      try {
        if (page && page.hasUnsupportedContent) { message('This page contains native content that this editor cannot safely change. Your content has not been modified.'); section.querySelector('.mosaic-editor-main').hidden = true; publish.hidden = true; previewButton.hidden = true; return; }
        if (!root.MosaicPopover || typeof root.MosaicPopover.mount !== 'function') throw new Error('The editor controls could not load. Reload the page to try again.');
        formatPicker = root.MosaicPopover.mount(section.querySelector('[data-format]'), {label:'Paragraph style',value:'p',options:FORMATS,retainFocus:false,onChange:function (value) { if (!FORMATS.some(function (item) { return item.value === value; })) return; closePanels(); command('formatBlock',value); }}); popovers.push(formatPicker);
        if (!page && !pending) {
          destinationPicker = root.MosaicPopover.mount(section.querySelector('[data-destination]'), {label:'Publish in',value:parentId,options:[{value:String(config.pages.insights),label:'Insights'},{value:String(config.pages.resources),label:'Resources'}],onChange:function (value) {
            if (locked() || page || ![config.pages.insights,config.pages.resources].map(String).includes(String(value))) { destinationPicker.setValue(parentId); return; }
            parentId = String(value); collection = parentId === String(config.pages.resources) ? 'Resources' : 'Insights'; section.querySelector('.mosaic-editor-eyebrow').textContent = 'Mosaic · ' + collection;
          }}); popovers.push(destinationPicker);
        }
        updateControls();
        if (!root.MosaicLibraries || typeof root.MosaicLibraries.load !== 'function') throw new Error('The content sanitizer is unavailable. Reload the page to try again.');
        var library = await root.MosaicLibraries.load('dompurify'); if (destroyed) return; purifier = root.DOMPurify || library;
        body.innerHTML = sanitizeHTML(source.editorHtml == null ? source.html || '<p><br /></p>' : source.editorHtml,purifier,doc);
        baseline = {title:title.value,summary:summary.value,html:body.innerHTML,parentId:parentId}; ready = true; uncertain = !!pending; changed();
        message(pending ? 'An earlier publication is unconfirmed. Check publication to reconcile it before editing.' : ''); updateControls(); loadNativeFiles();
      } catch (error) { if (!destroyed) message(error.message,true); }
    })();
    return Object.freeze({destroy:function () { if (destroyed) return; clearFileDrop(); dropTargets.delete(body); closePanels(false); setExpanded(false); destroyed = true; lifecycle.abort(); files.forEach(revoke); popovers.forEach(function (popover) { popover.destroy(); }); section.remove(); },hasUnsavedChanges:dirty,isPublishing:function () { return busy; }});
  }
  var editor = Object.freeze({mount:mount,sanitizeHTML:sanitizeHTML,nativeURL:nativeURL,acceptsFileDrop:acceptsFileDrop,handleFileDrop:handleFileDrop}); root.MosaicEditor = editor;
  if (typeof module === 'object' && module.exports) module.exports = editor;
})(typeof window !== 'undefined' ? window : globalThis);
