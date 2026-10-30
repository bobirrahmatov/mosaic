/* Mosaic space-wide file-drop guard. Only a registered live editor body
 * accepts files; the editor validates and stages them until publication.
 * Blocks accidental native uploads/navigation; never changes permissions. */
(function(w,d){'use strict';
  if(w.MosaicFileDropGuard)return;
  var installed=false,notice,timer,lastNotice=-Infinity;
  function active(){
    if(w.top!==w.self)return false;
    var config=w.MOSAIC_CONFIG||{},key='',meta=d.querySelector('meta[name="ajs-space-key"]');
    if(config.fileDropGuard===false)return false;
    if(meta)key=meta.content;
    if(!key)try{key=w.AJS&&w.AJS.Meta&&w.AJS.Meta.get('space-key')||'';}catch(_){}
    if(!key){var url=new URL(w.location.href),match=url.pathname.match(/\/(?:spaces|display)\/([^/]+)(?:\/|$)/);try{key=match?decodeURIComponent(match[1]):url.searchParams.get('spaceKey')||'';}catch(_){return false;}}
    return key==='mosaic';
  }
  function files(transfer){return !!transfer&&(Array.from(transfer.types||[]).includes('Files')||Array.from(transfer.items||[]).some(function(item){return item.kind==='file';})||!!transfer.files?.length);}
  function inform(){
    if(Date.now()-lastNotice<3000||!d.body)return;lastNotice=Date.now();
    if(!notice){notice=d.createElement('div');notice.className='mosaic-drop-notice';notice.setAttribute('role','status');notice.setAttribute('data-mosaic-owned','');d.body.append(notice);}
    notice.textContent='Drop files into the article body, or use Image or Attach files in the editor.';
    w.clearTimeout(timer);timer=w.setTimeout(function(){notice?.remove();notice=null;},5000);
  }
  function block(event){
    if(!active()||!files(event.dataTransfer))return;
    // Always suppress the browser's file-navigation default, even when the
    // editor receives the event. Only the live module can register a target.
    event.preventDefault();event.stopImmediatePropagation();var accepted=false;
    try{accepted=w.MosaicEditor?.handleFileDrop(event)===true;}catch(_){}
    try{event.dataTransfer.dropEffect=accepted?'copy':'none';}catch(_){}
    if(accepted)return;
    if(event.type==='drop')inform();
  }
  function boot(){if(installed)return;installed=true;['dragenter','dragover','drop'].forEach(function(type){w.addEventListener(type,block,{capture:true,passive:false});});}
  function destroy(){installed=false;['dragenter','dragover','drop'].forEach(function(type){w.removeEventListener(type,block,true);});w.clearTimeout(timer);notice?.remove();notice=null;}
  w.MosaicFileDropGuard=Object.freeze({boot:boot,destroy:destroy,isActive:active});boot();
})(window,document);

;
/* Shared Mosaic deployment configuration. Keep page IDs in one place. */
(function(w){'use strict';
  if(w.MosaicConfig)return;
  var defaults={spaceKey:'mosaic',rootPageId:'3961414585',attachmentPageId:'3981001251',contextPath:'/confluence',pages:{home:'3961414585',about:'3981001532',team:'3981001536',resources:'3981001538',insights:'3981001542'},resources:[]};
  function resolve(overrides){var c=Object.assign({},defaults,overrides||{});c.pages=Object.assign({},defaults.pages,(overrides||{}).pages||{});c.pages.home=c.rootPageId;return c;}
  function asset(c,file){return (c.assetBase||c.contextPath+'/download/attachments/'+c.attachmentPageId+'/').replace(/\/?$/,'/')+encodeURIComponent(file);}
  function page(c,key){var id=c.pages[key]||key;return c.contextPath+'/pages/viewpage.action?pageId='+encodeURIComponent(id);}
  function cover(c,key){var hash=2166136261;String(key).split('').forEach(function(ch){hash=Math.imul(hash^ch.charCodeAt(0),16777619);});return asset(c,'mosaic-cover-'+String((hash>>>0)%50+1).padStart(2,'0')+'.webp');}
  w.MosaicConfig={resolve:resolve,asset:asset,page:page,cover:cover};w.MOSAIC_CONFIG=resolve(w.MOSAIC_CONFIG);
})(window);

;
/* Mosaic lazy attachment libraries. Vendor versions and notices live in attachments/licenses. */
(function (root) {
  'use strict';
  if (root.MosaicLibraries) return;

  var DEFAULT_BASE = '/confluence/download/attachments/3981001251/';
  var base = DEFAULT_BASE;
  var timeoutMs = 15000;
  var scripts = Object.create(null);
  var requests = Object.create(null);
  var files = Object.freeze({
    pdf: Object.freeze(['pdfmake-0.2.20.min.js', 'pdfmake-0.2.20-vfs-fonts.js']),
    word: Object.freeze(['docx-9.5.1.iife.js']),
    dompurify: Object.freeze(['dompurify-3.4.17.min.js'])
  });

  function absoluteBase(value) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('A local attachment base is required.');
    var page = new URL(root.location.href);
    var result = new URL(value, page);
    if (!/^https?:$/.test(result.protocol) || result.origin !== page.origin || result.username || result.password || result.search || result.hash) {
      throw new Error('Mosaic libraries must use a same-origin attachment base without query parameters.');
    }
    result.pathname = result.pathname.replace(/\/?$/, '/');
    return result.href;
  }

  function configure(config) {
    config = config || {};
    var nextBase = absoluteBase(config.assetBase === undefined ? base : config.assetBase);
    var nextTimeout = config.libraryTimeoutMs === undefined ? timeoutMs : Number(config.libraryTimeoutMs);
    if (!Number.isFinite(nextTimeout) || nextTimeout < 250 || nextTimeout > 60000) {
      throw new Error('Library timeout must be between 250 and 60000 milliseconds.');
    }
    base = nextBase;
    timeoutMs = nextTimeout;
    return api;
  }

  function script(url, duration) {
    if (scripts[url]) return scripts[url];
    var operation = new Promise(function (resolve, reject) {
      var element = root.document.createElement('script');
      var settled = false;
      var timer;
      function finish(error) {
        if (settled) return;
        settled = true;
        root.clearTimeout(timer);
        element.onload = element.onerror = null;
        if (error) {
          if (element.parentNode) element.parentNode.removeChild(element);
          reject(error);
        } else resolve(element);
      }
      element.async = true;
      element.src = url;
      element.setAttribute('data-mosaic-library', 'true');
      element.onload = function () { finish(); };
      element.onerror = function () { finish(new Error('Unable to load ' + new URL(url).pathname.split('/').pop() + '. Please retry.')); };
      timer = root.setTimeout(function () { finish(new Error('Loading the export or editor library timed out. Please retry.')); }, duration);
      try { (root.document.head || root.document.documentElement).appendChild(element); }
      catch (error) { finish(error); }
    });
    scripts[url] = operation.catch(function (error) {
      delete scripts[url];
      throw error;
    });
    return scripts[url];
  }

  function valueFor(kind) {
    if (kind === 'pdf' && root.pdfMake && typeof root.pdfMake.createPdf === 'function' && root.pdfMake.vfs && root.pdfMake.vfs['Roboto-Regular.ttf']) return root.pdfMake;
    if (kind === 'word' && root.docx && typeof root.docx.Document === 'function' && root.docx.Packer) return root.docx;
    if (kind === 'dompurify' && root.DOMPurify && root.DOMPurify.isSupported !== false && typeof root.DOMPurify.sanitize === 'function') return root.DOMPurify;
    return null;
  }

  function load(kind) {
    if (!Object.prototype.hasOwnProperty.call(files, kind)) return Promise.reject(new Error('Unknown Mosaic library: ' + kind));
    var localBase;
    try { localBase = absoluteBase(base); }
    catch (error) { return Promise.reject(error); }
    var key = localBase + '|' + kind;
    if (requests[key]) return requests[key];
    var urls = files[kind].map(function (file) { return localBase + file; });
    var duration = timeoutMs;
    var operation = urls.reduce(function (prior, url) {
      return prior.then(function () { return script(url, duration); });
    }, Promise.resolve()).then(function () {
      var value = valueFor(kind);
      if (!value) {
        // An HTTP 200 login page or an incompatible host module must not become a
        // permanently successful cache entry. The next attempt reloads the files.
        urls.forEach(function (url) {
          delete scripts[url];
          Array.prototype.forEach.call(root.document.querySelectorAll('script[data-mosaic-library]'), function (element) {
            if (element.src === url && element.parentNode) element.parentNode.removeChild(element);
          });
        });
        throw new Error('The ' + kind + ' library did not initialize. Please retry.');
      }
      return value;
    });
    requests[key] = operation.catch(function (error) {
      delete requests[key];
      throw error;
    });
    return requests[key];
  }

  var api = Object.freeze({ configure: configure, load: load, files: files });
  root.MosaicLibraries = api;
})(window);

;
/* Mosaic native Confluence client. No grants, workflow or remote service. */
(function (root) {
  'use strict';
  var PAGE_EXPAND = 'space,ancestors,version,history,body.storage,body.view';
  var BODY_TAGS = new Set('p div span h2 h3 h4 strong b em i u s strike blockquote pre code ul ol li table tbody thead tfoot tr th td caption br hr a img'.split(' '));
  var FILE_TYPES = {pdf:'application/pdf',txt:'text/plain',md:'text/markdown',markdown:'text/markdown',csv:'text/csv',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  var STYLE_MARKER = '<ac:structured-macro ac:name="anchor" ac:schema-version="1"><ac:parameter ac:name="">mosaic-page-style-v1</ac:parameter></ac:structured-macro>';
  var STYLE_LABELS = ['hide-actions','hide-comments','hide-footer','hide-title'];

  function fault(message, code, status) {
    var error = new Error(message); error.code = code || 'API_ERROR';
    if (status) error.status = status;
    return error;
  }
  function numeric(value, name) {
    if (!/^[1-9]\d{0,19}$/.test(String(value || ''))) throw fault('Configure a numeric ' + name + '.', 'CONFIGURATION');
    return String(value);
  }
  function safeURL(value) {
    var href = String(value || '').trim();
    return !!href && !/[\u0000-\u0020\u007f]/.test(href) && (/^(?:https?:\/\/|mailto:|tel:)/i.test(href) || /^\/(?!\/)/.test(href) || /^#[\w-]/.test(href));
  }
  function escapeXML(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]; }); }
  function decodeXML(value) { return String(value).replace(/&(amp|lt|gt|quot|apos|nbsp);|&#(\d+);|&#x([a-f0-9]+);/gi, function (full, name, dec, hex) { if (name) return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[name.toLowerCase()]; var n=parseInt(dec||hex,dec?10:16);return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):''; }); }
  function attributes(value) {
    var attrs = Object.create(null), expression = /\s+([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, found, at = 0;
    while ((found = expression.exec(value))) { var key=found[1].toLowerCase(); if (value.slice(at,found.index).trim() || Object.prototype.hasOwnProperty.call(attrs,key)) return null; attrs[key]=decodeXML(found[2]==null?found[3]:found[2]);at=expression.lastIndex; }
    return value.slice(at).trim() ? null : attrs;
  }
  function filename(value) { return typeof value === 'string' && !!value.trim() && value.length <= 240 && !/[\/\\\u0000-\u001f\u007f]/.test(value) && value !== '.' && value !== '..'; }
  function attachmentDisplayName(name) {
    // Strip only Mosaic's UUID or timestamp/sequence upload prefix; native references retain name.
    var generated = /^mosaic-(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-z0-9]{8,10}-[1-9]\d*)-(.+)$/i.exec(name);
    return generated && filename(generated[1]) ? generated[1] : name;
  }
  function attachmentURL(value) {
    var match = /^((?:\/[a-z0-9_-]+)*)\/download\/attachments\/([1-9]\d{0,19})\/([^/?#]+)(?:\?[^#]*)?$/i.exec(String(value || ''));
    if (!match) return null;
    var name; try { name=decodeURIComponent(match[3]); } catch (_) { return null; }
    return filename(name) ? {context:match[1],pageId:match[2],name:name} : null;
  }
  function safeImageURL(value) { var item=attachmentURL(value);return !!item && /\.(?:png|jpe?g|webp|gif)$/i.test(item.name); }
  function createAttachmentHTML(file, options) {
    options=options||{};var media=attachmentURL(file&&file.url);if(!media)throw fault('Use a native Confluence attachment.','INVALID_CONTENT');
    var label=file.displayName||file.name||media.name;
    if(!options.image)return '<a href="'+escapeXML(file.url)+'">'+escapeXML(label)+'</a>';
    if(!safeImageURL(file.url))throw fault('Choose a PNG, JPEG, WebP or GIF image.','INVALID_CONTENT');
    var size='';['width','height'].forEach(function(key){if(options[key]!=null){if(!/^[1-9]\d{0,3}$/.test(String(options[key]))||Number(options[key])>8192)throw fault('Choose a valid image size.','INVALID_CONTENT');size+=' '+key+'="'+options[key]+'"';}});
    return '<img src="'+escapeXML(file.url)+'" alt="'+escapeXML(options.alt==null?label:options.alt)+'"'+size+' />';
  }
  function storageParts(value, pageId, context) {
    var html=String(value||''),summary='',hasStyleMarker=false;
    html=html.replace(/^\s*<ac:structured-macro\b([^>]*)>\s*<ac:parameter\s+ac:name="">mosaic-page-style-v1<\/ac:parameter>\s*<\/ac:structured-macro>\s*/i,function(full,raw){var attrs=attributes(raw);if(!attrs||attrs['ac:name']!=='anchor'||Object.keys(attrs).some(function(key){return !['ac:name','ac:schema-version','ac:macro-id'].includes(key);}))return full;hasStyleMarker=true;return '';});
    html=html.replace(/^\s*<ac:structured-macro\b([^>]*)>([\s\S]*?)<\/ac:structured-macro>\s*/i,function(full,raw,inside){
      var attrs=attributes(raw),body=/^(?:\s*<ac:parameter\s+ac:name="hidden">false<\/ac:parameter>)?\s*<ac:rich-text-body>\s*<p>([^<]*)<\/p>\s*<\/ac:rich-text-body>\s*$/i.exec(inside);
      if(!attrs||attrs['ac:name']!=='excerpt'||Object.keys(attrs).some(function(key){return !['ac:name','ac:schema-version','ac:macro-id'].includes(key);})||!body)return full;
      var text=decodeXML(body[1]);if(text.length>1000)return full;summary=text;return '';
    });
    function nativeName(raw){var attrs=attributes(raw);return attrs&&Object.keys(attrs).every(function(key){return key==='ri:filename';})&&filename(attrs['ri:filename'])?attrs['ri:filename']:null;}
    html=html.replace(/<ac:image\b([^>]*)>\s*<ri:attachment\b([^>]*?)\s*\/>\s*<\/ac:image>/gi,function(full,raw,resource){
      var attrs=attributes(raw),name=nativeName(resource);if(!attrs||!name||!pageId||!context||Object.keys(attrs).some(function(key){return !['ac:alt','ac:title','ac:width','ac:height'].includes(key);}))return full;
      var url=context+'/download/attachments/'+pageId+'/'+encodeURIComponent(name)+'?api=v2';if(!safeImageURL(url))return full;
      try{var output=createAttachmentHTML({name:name,url:url},{image:true,alt:attrs['ac:alt']||'',width:attrs['ac:width'],height:attrs['ac:height']});if(attrs['ac:title'])output=output.replace(/ \/>$/,' title="'+escapeXML(attrs['ac:title'])+'" />');return output;}catch(_){return full;}
    });
    html=html.replace(/<ac:link>\s*<ri:attachment\b([^>]*?)\s*\/>\s*<ac:link-body>([\s\S]*?)<\/ac:link-body>\s*<\/ac:link>/gi,function(full,raw,label){
      var name=nativeName(raw);if(!name||!pageId||!context||/<\/?(?:ac|ri):/i.test(label))return full;try{validateHTML('<p>'+label+'</p>');}catch(_){return full;}
      return '<a href="'+escapeXML(context+'/download/attachments/'+pageId+'/'+encodeURIComponent(name)+'?api=v2')+'">'+label+'</a>';
    });
    return {summary:summary,editorHtml:html,hasStyleMarker:hasStyleMarker};
  }
  function toStorage(value, pageId, context, summary, marked) {
    var html=value;
    html=html.replace(/<img\b([^>]*?)\s*\/?\s*>/gi,function(full,raw){var attrs=attributes(raw),media=attrs&&attachmentURL(attrs.src);if(!media||media.context!==context||media.pageId!==pageId)throw fault('Images must be attached to this article before publishing.','INVALID_CONTENT');var outer='';['alt','title','width','height'].forEach(function(key){if(attrs[key]!=null)outer+=' ac:'+key+'="'+escapeXML(attrs[key])+'"';});return '<ac:image'+outer+'><ri:attachment ri:filename="'+escapeXML(media.name)+'" /></ac:image>';});
    html=html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi,function(full,raw,label){var attrs=attributes(raw),media=attrs&&attachmentURL(attrs.href);if(!media||media.context!==context||media.pageId!==pageId||Object.keys(attrs).some(function(key){return key!=='href';}))return full;return '<ac:link><ri:attachment ri:filename="'+escapeXML(media.name)+'" /><ac:link-body>'+label+'</ac:link-body></ac:link>';});
    return (marked?STYLE_MARKER:'')+(summary?'<ac:structured-macro ac:name="excerpt" ac:schema-version="1"><ac:parameter ac:name="hidden">false</ac:parameter><ac:rich-text-body><p>'+escapeXML(summary)+'</p></ac:rich-text-body></ac:structured-macro>'+html:html);
  }
  function plain(value) {
    return String(value || '').replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<ac:structured-macro\b[\s\S]*?<\/ac:structured-macro>/gi, '')
      .replace(/<!--[^]*?-->/g, '').replace(/<[^>]*>/g, ' ')
      .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, function (_, name) { return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[name]; })
      .replace(/&#(\d+);|&#x([a-f0-9]+);/gi, function (_, decimal, hex) { var n = parseInt(decimal || hex, decimal ? 10 : 16); return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : ''; })
      .replace(/\s+/g, ' ').trim();
  }
  function excerpt(html) {
    var result = storageParts(html).summary || plain(html);
    if (/(?:window|document)\s*\.|\b(?:MOSAIC_CONFIG|WCS_CONFIG)\b|\bfunction\s*\(|(?:class|style|src)\s*=\s*["']/i.test(result)) return '';
    return result.slice(0, 219) + (result.length > 219 ? '…' : '');
  }
  function unsupported(html) { try { if(String(html||'').trim())validateHTML(html);return false; } catch (_) { return true; } }
  function validateHTML(html) {
    if (typeof html !== 'string' || html.length > 500000 || !plain(html) && !/<img\b/i.test(html)) throw fault('Write some article content before publishing.', 'INVALID_CONTENT');
    if (/<!--|<\?|<!DOCTYPE|<\/?(?:ac|ri):|[\u0000]/i.test(html)) throw fault('This content requires the native Confluence editor.', 'UNSUPPORTED_CONTENT');
    var matched = html.match(/<[^>]*>/g) || [];
    matched.forEach(function (tag) {
      var start = tag.match(/^<\/?([a-z][a-z0-9]*)\b/i);
      if (!start || !BODY_TAGS.has(start[1].toLowerCase())) throw fault('This content requires the native Confluence editor.', 'UNSUPPORTED_CONTENT');
      var rest = tag.slice(start[0].length).replace(/\/?\s*>$/, '');
      var attributes = /\s+([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, position = 0, attribute, seen = new Set();
      while ((attribute = attributes.exec(rest))) {
        if (rest.slice(position, attribute.index).trim()) throw fault('The article contains unsupported formatting.', 'INVALID_CONTENT');
        var name = attribute[1].toLowerCase(), value = attribute[2] == null ? attribute[3] : attribute[2];
        if(seen.has(name))throw fault('The article contains duplicate attributes.','INVALID_CONTENT');seen.add(name);
        value=decodeXML(value);var image=start[1].toLowerCase()==='img';
        if (!['href','title','colspan','rowspan','src','alt','width','height'].includes(name) || name === 'href' && (start[1].toLowerCase() !== 'a' || !safeURL(value)) || /^(?:colspan|rowspan)$/.test(name) && !/^[1-9]\d?$/.test(value) || name==='src'&&(!image||!safeImageURL(value)) || ['alt','width','height'].includes(name)&&!image || /^(width|height)$/.test(name)&&(!/^[1-9]\d{0,3}$/.test(value)||Number(value)>8192)) throw fault('The article contains an unsupported link or attribute.', 'INVALID_CONTENT');
        position = attributes.lastIndex;
      }
      if (rest.slice(position).trim()) throw fault('The article contains unsupported formatting.', 'INVALID_CONTENT');
      if(start[1].toLowerCase()==='img'&&!/^<\//.test(tag)&&!seen.has('src'))throw fault('An image needs a native attachment URL.','INVALID_CONTENT');
    });
    return html;
  }
  function create(config, dependencies) {
    config = config || {}; dependencies = dependencies || {};
    var context = String(config.contextPath || '/confluence').replace(/\/+$/, '');
    if (!/^\/(?!\/)[a-z0-9/_-]*$/i.test(context)) throw fault('Use a same-origin Confluence context path.', 'CONFIGURATION');
    var space = String(config.spaceKey || ''), rootId = numeric(config.rootPageId, 'Mosaic root page ID');
    if (!space || /[\u0000-\u0020]/.test(space)) throw fault('Configure the Mosaic space key.', 'CONFIGURATION');
    var assetId = numeric(config.attachmentPageId, 'attachment page ID'), pages = config.pages || {};
    var fetcher = dependencies.fetch || root.fetch && root.fetch.bind(root);
    if (!fetcher) throw fault('This browser cannot connect to Confluence.', 'UNAVAILABLE');
    var location = dependencies.location || root.location;
    if (!location || !/^https?:$/.test(location.protocol)) throw fault('Open Mosaic inside Confluence to read or publish pages.', 'UNAVAILABLE');
    var storage = dependencies.storage;
    if (storage === undefined) try { storage = root.sessionStorage; } catch (_) { storage = null; }
    var excludes = Array.from(new Set([assetId].concat(config.excludePageIds || []).map(function (id) { return numeric(id, 'excluded page ID'); })));
    var excludedTrees = Array.from(new Set([assetId].concat(config.excludeAncestorIds || []).map(function (id) { return numeric(id, 'excluded ancestor ID'); })));
    var verifiedRoot = null, mutation = false, pending = null, uploads = new WeakMap(), uploadSequence = 0, insightSnapshot = null, insightRevision = 0, searchSnapshots = new Map();
    var pendingKey = 'mosaic.pending-publication.' + space + '.' + rootId;
    try { var stored = storage && storage.getItem(pendingKey); if (stored) pending = JSON.parse(stored); } catch (_) { /* Storage unavailable; retain this page's in-memory receipt. */ }
    if (pending && (!pending.title || !/^[1-9]\d*$/.test(pending.parentId || '') || typeof pending.html !== 'string')) pending = null;
    function savePending(value) {
      pending = value;
      try { if (storage) { if (value) storage.setItem(pendingKey, JSON.stringify(value)); else storage.removeItem(pendingKey); } } catch (_) { /* A blocked/full session store does not acknowledge a write. */ }
    }
    async function request(path, options) {
      options = options || {};
      var controller = new AbortController(), timeout = false, signal = options.signal;
      var abort = function () { controller.abort(signal && signal.reason); };
      if (signal && signal.aborted) abort();
      if (signal) signal.addEventListener('abort', abort, {once:true});
      var timer = setTimeout(function () { timeout = true; controller.abort(); }, options.method ? (config.writeTimeoutMs || 60000) : (config.readTimeoutMs || 15000));
      try {
        var response = await fetcher(context + path, {method:options.method || 'GET',credentials:'same-origin',signal:controller.signal,headers:Object.assign({Accept:'application/json'}, options.form ? {'X-Atlassian-Token':'nocheck'} : options.body ? {'Content-Type':'application/json'} : {}),body:options.form || (options.body ? JSON.stringify(options.body) : undefined)});
        var raw = await response.text(), data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch (_) { /* An HTML login page is an explicit failure. */ }
        if (!response.ok) {
          var message = response.status === 401 ? 'Your Confluence session has expired. Sign in and try again.' : response.status === 403 ? 'Confluence denied this action. Your native space and page permissions apply.' : response.status === 409 ? 'This page changed, or its title is already in use. Refresh the native page before trying again.' : response.status === 413 ? 'This file exceeds the native Confluence attachment size limit.' : 'Confluence could not complete this action (HTTP ' + response.status + ').';
          throw fault(message, response.status === 409 ? 'CONFLICT' : 'HTTP_ERROR', response.status);
        }
        if (!data || typeof data !== 'object') throw fault('Confluence returned an unexpected response. Check your session.', 'INVALID_RESPONSE');
        return data;
      } catch (error) {
        if (timeout) throw fault('Confluence did not confirm the request in time.', 'TIMEOUT');
        if (signal && signal.aborted) throw fault('The request was cancelled.', 'ABORTED');
        if (error.code) throw error;
        throw fault('Could not reach Confluence. Check your connection and try again.', 'NETWORK_ERROR');
      } finally { clearTimeout(timer); if (signal) signal.removeEventListener('abort', abort); }
    }
    function excluded(page) {
      return excludes.includes(String(page.id)) || page.ancestors.some(function (item) { return excludedTrees.includes(String(item.id)); }) || /^navbar$/i.test(String(page.title || '').trim());
    }
    function scope(page, allowRoot, parent, allowExcluded) {
      var id = String(page && page.id || ''), ancestors = page && page.ancestors;
      if (!/^[1-9]\d*$/.test(id) || page.type !== 'page' || page.status !== 'current' || !page.space || page.space.key !== space || !Array.isArray(ancestors) || id === rootId && !allowRoot) throw fault('Confluence returned a page outside Mosaic.', 'INVALID_SCOPE');
      if (!allowExcluded && id !== rootId && excluded(page)) throw fault('This page is not part of the Mosaic content collection.', 'INVALID_SCOPE');
      if (parent && String(ancestors.at(-1) && ancestors.at(-1).id) !== parent) throw fault('Confluence returned a page outside the requested collection.', 'INVALID_SCOPE');
      return page;
    }
    async function ensureRoot(signal) {
      if (signal && signal.aborted) throw fault('The request was cancelled.', 'ABORTED');
      if (!verifiedRoot) {
        // Do not tie the shared identity read to one search caller's cancellation.
        verifiedRoot = request('/rest/api/content/' + rootId + '?expand=space,ancestors').then(function (page) {
          if (String(page.id) !== rootId) throw fault('The Mosaic root identity could not be verified.', 'INVALID_SCOPE');
          return scope(page, true);
        }).catch(function (error) { verifiedRoot = null; throw error; });
      }
      if (!signal) { await verifiedRoot; return; }
      // Release one cancelled caller immediately without aborting the shared
      // identity read still needed by other page components.
      await new Promise(function (resolve,reject) {
        var settled = false;
        function finish(error) { if (settled) return; settled = true; signal.removeEventListener('abort',abort); if (error) reject(error); else resolve(); }
        function abort() { finish(fault('The request was cancelled.', 'ABORTED')); }
        signal.addEventListener('abort',abort,{once:true});
        if (signal.aborted) abort();
        verifiedRoot.then(function () { finish(); },finish);
      });
    }
    function card(page) {
      var html = page.body && page.body.storage && page.body.storage.value || '';
      var history = page.history || {}, version = page.version || {};
      return {id:String(page.id),title:String(page.title || ''),excerpt:excerpt(html),url:context + '/pages/viewpage.action?pageId=' + encodeURIComponent(page.id),created:history.createdDate || null,updated:version.when || null,author:history.createdBy && history.createdBy.displayName || null};
    }
    function detailed(page) {
      var html=page.body && page.body.storage && page.body.storage.value || '',parts=storageParts(html,String(page.id),context);
      return Object.assign(card(page), parts, {html:html,renderedHtml:page.body && page.body.view && page.body.view.value || '',version:page.version && page.version.number,parentId:String(page.ancestors.at(-1) && page.ancestors.at(-1).id || ''),nativeEditUrl:context + '/pages/editpage.action?pageId=' + encodeURIComponent(page.id),hasUnsupportedContent:unsupported(parts.editorHtml)});
    }
    function pagination(options) {
      var start = options.start == null ? 0 : options.start, limit = options.limit == null ? 12 : options.limit;
      if (!Number.isInteger(start) || start < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw fault('Choose a valid page size and position.', 'INVALID_PAGINATION');
      return {start:start,limit:limit};
    }
    function result(data, options, parent, subtree) {
      if (!Array.isArray(data.results) || data.results.length > options.limit) throw fault('Confluence returned an invalid page collection.', 'INVALID_RESPONSE');
      var seen = new Set();
      var results = data.results.map(function (page) {
        scope(page, false, parent, true);
        if (subtree && !page.ancestors.some(function (item) { return String(item.id) === subtree; })) throw fault('Confluence returned a page outside the requested collection.', 'INVALID_SCOPE');
        if (seen.has(String(page.id))) throw fault('Confluence returned a duplicate page.', 'INVALID_RESPONSE');
        seen.add(String(page.id)); return excluded(page) ? null : card(page);
      }).filter(Boolean);
      var hasMore = !!(data._links && data._links.next) || (!data._links && data.results.length === options.limit);
      if (hasMore && !data.results.length) throw fault('Confluence pagination did not advance.', 'INVALID_RESPONSE');
      return {results:results,start:options.start,limit:options.limit,hasMore:hasMore,nextStart:hasMore ? options.start + data.results.length : null};
    }
    async function getPage(id, options) {
      options = options || {}; id = numeric(id, 'page ID'); await ensureRoot(options.signal);
      var data = await request('/rest/api/content/' + id + '?expand=' + PAGE_EXPAND, options);
      if (String(data.id) !== id) throw fault('Confluence returned a different page.', 'INVALID_SCOPE');
      return detailed(scope(data, id === rootId));
    }
    async function children(parentId, options) {
      options = options || {}; parentId = numeric(parentId, 'parent page ID'); var page = pagination(options);
      await getPage(parentId, {signal:options.signal});
      var data = await request('/rest/api/content/' + parentId + '/child/page?' + new URLSearchParams({start:page.start,limit:page.limit,expand:PAGE_EXPAND}), {signal:options.signal});
      return result(data, page, parentId);
    }
    async function insights(query, options) {
      options=options||{};var position=pagination(options),parent=numeric(pages.insights,'Insights parent page ID');
      var term=String(query||'').trim(),sort=options.sort||'newest';
      if(term.length>250)throw fault('Keep the search to 250 characters or fewer.','INVALID_QUERY');
      if(!['newest','oldest','title'].includes(sort))throw fault('Choose an available sort order.','INVALID_QUERY');
      function alive(){if(options.signal?.aborted)throw fault('The request was cancelled.','ABORTED');}alive();
      // A native child read sees published pages independently of the CQL index.
      // Keep one successful snapshot per client so search, sort and pagination
      // use the same records. A reload or confirmed publication starts afresh.
      var snapshot=insightSnapshot;
      if(!snapshot){
        await getPage(parent,{signal:options.signal});alive();
        var revision=insightRevision,queue=[{parent:parent,start:0}],entries=[],seen=new Set(),seenByParent=new Map(),requests=0,warning='';
        while(queue.length&&!warning){
          alive();
          if(requests>=2000){warning='The Insights collection reached its loading limit. Some pages are not shown. Open the native page tree or try again after narrowing the collection.';break;}
          var jobs=queue.splice(0,Math.min(3,2000-requests));requests+=jobs.filter(function(job){return !job.data;}).length;
          var batches=await Promise.all(jobs.map(async function(job){
            try{
              var data=job.data||await request('/rest/api/content/'+job.parent+'/child/page?'+new URLSearchParams({start:job.start,limit:100,expand:PAGE_EXPAND+',children.page'}),{signal:options.signal});
              return {job:job,data:data,page:result(data,{start:job.start,limit:100},job.parent)};
            }catch(error){return {job:job,error:error};}
          }));alive();
          for(var batch of batches){
            if(batch.error){warning='Some insights could not be loaded. '+batch.error.message;continue;}
            var parentSeen=seenByParent.get(batch.job.parent)||new Set(),fresh=0;seenByParent.set(batch.job.parent,parentSeen);
            for(var record of batch.data.results){
              var id=String(record.id);if(parentSeen.has(id))continue;parentSeen.add(id);fresh++;
              if(excluded(record))continue;
              if(seen.has(id)){warning='The Insights page tree changed while loading. Try again to read the current collection.';continue;}
              if(entries.length>=1000){warning='Only the first 1,000 insights could be loaded. More pages exist in the native page tree.';break;}
              seen.add(id);
              var rendered=record.body?.view?.value,storage=record.body?.storage?.value||'',parts=storageParts(storage);
              entries.push({card:card(record),text:(String(record.title||'')+' '+parts.summary+' '+plain(rendered||parts.editorHtml)).toLocaleLowerCase()});
              var inline=record.children?.page,atStart=inline&&(inline.start==null||inline.start===0);
              if(atStart&&Array.isArray(inline.results)&&!inline.results.length&&inline.size===0&&!inline._links?.next)continue;
              // Expanded leaf lists avoid one request per article. Reuse inline
              // child records only when their content and metadata are present;
              // a partially expanded list needs the ordinary native endpoint.
              var reusable=atStart&&Array.isArray(inline.results)&&inline._links&&inline.results.length<=100&&inline.results.every(function(child){return child.space&&Array.isArray(child.ancestors)&&child.history&&child.version&&typeof child.body?.storage?.value==='string';});
              queue.push({parent:id,start:0,data:reusable?inline:null});
            }
            if(batch.page.hasMore){
              if(!fresh||batch.page.nextStart<=batch.job.start)warning='The Insights page tree changed while loading. Try again to read the current collection.';
              else queue.push({parent:batch.job.parent,start:batch.page.nextStart});
            }
          }
        }
        snapshot={entries:entries,warning:warning};
        if(!warning&&revision===insightRevision)insightSnapshot=snapshot;
      }
      alive();var words=term.toLocaleLowerCase().split(/\s+/).filter(Boolean),rows=snapshot.entries.filter(function(item){return words.every(function(word){return item.text.includes(word);});}).map(function(item){return item.card;});
      rows.sort(function(a,b){
        if(sort==='title')return a.title.localeCompare(b.title)||a.id.localeCompare(b.id);
        var left=Date.parse(a.created),right=Date.parse(b.created);
        if(!Number.isFinite(left))left=0;if(!Number.isFinite(right))right=0;
        return (sort==='oldest'?left-right:right-left)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id);
      });
      var hasMore=!snapshot.warning&&position.start+position.limit<rows.length;
      return {results:rows.slice(position.start,position.start+position.limit),start:position.start,limit:position.limit,hasMore:hasMore,nextStart:hasMore?position.start+position.limit:null,complete:!snapshot.warning,warning:snapshot.warning};
    }
    function attachment(record, pageId) {
      var ext=record&&record.extensions||{},size=ext.fileSize,mediaType=ext.mediaType||(record&&record.metadata&&record.metadata.mediaType),name=record&&record.title;
      if(!record||! /^[1-9]\d{0,19}$/.test(String(record.id||''))||record.type!=='attachment'||record.status!=='current'||!record.container||String(record.container.id)!==pageId||!filename(name)||!Number.isSafeInteger(size)||size<0||typeof mediaType!=='string'||!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mediaType))throw fault('Confluence returned an invalid attachment.','INVALID_RESPONSE');
      return {id:String(record.id),name:name,displayName:attachmentDisplayName(name),url:context+'/download/attachments/'+pageId+'/'+encodeURIComponent(name)+'?api=v2',mediaType:mediaType,size:size};
    }
    async function listAttachments(options) {
      options=options||{};var pageId=numeric(options.pageId,'attachment parent page ID'),position=pagination({start:options.start,limit:options.limit==null?100:options.limit});
      await getPage(pageId,{signal:options.signal});
      var data=await request('/rest/api/content/'+pageId+'/child/attachment?'+new URLSearchParams({start:position.start,limit:position.limit,expand:'container,version'}),{signal:options.signal});
      if(!Array.isArray(data.results)||data.results.length>position.limit)throw fault('Confluence returned an invalid attachment list.','INVALID_RESPONSE');
      var seen=new Set(),rows=data.results.map(function(item){var entry=attachment(item,pageId);if(seen.has(entry.id))throw fault('Confluence returned a duplicate attachment.','INVALID_RESPONSE');seen.add(entry.id);return entry;});
      var hasMore=!!(data._links&&data._links.next)||(!data._links&&rows.length===position.limit);if(hasMore&&!rows.length)throw fault('Confluence attachment pagination did not advance.','INVALID_RESPONSE');
      return {results:rows,start:position.start,limit:position.limit,hasMore:hasMore,nextStart:hasMore?position.start+rows.length:null};
    }
    async function uploadAttachment(input) {
      // Data Center attachment API: native permissions and multipart boundary.
      // https://developer.atlassian.com/server/confluence/rest/v951/api-group-attachments/
      // Retry uses a unique filename lookup; it never creates another page.
      input=input||{};var pageId=numeric(input.pageId,'attachment parent page ID'),file=input.file;
      if(!file||!filename(file.name)||file.name.length>180||!Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_FILE_BYTES||typeof file.slice!=='function')throw fault('Choose a file of up to 5 MB with a plain filename.','INVALID_FILE');
      var extension=file.name.split('.').pop().toLowerCase(),mediaType=FILE_TYPES[extension];
      if(!mediaType)throw fault('Choose a PDF, Office document, text, Markdown, CSV or raster image.','INVALID_FILE');
      if(input.signal&&input.signal.aborted)throw fault('The request was cancelled.','ABORTED');
      if(mediaType.startsWith('image/')&&file.type&&file.type!==mediaType)throw fault('The image type does not match its filename.','INVALID_FILE');
      var byPage=uploads.get(file);if(!byPage){byPage=new Map();uploads.set(file,byPage);}var receipt=byPage.get(pageId);
      if(!receipt){var token=root.crypto&&typeof root.crypto.randomUUID==='function'?root.crypto.randomUUID():Date.now().toString(36)+'-'+(++uploadSequence);receipt={name:'mosaic-'+token+'-'+file.name,attempted:false,promise:null,result:null};byPage.set(pageId,receipt);}
      if(receipt.result)return Object.assign({},receipt.result);
      if(receipt.promise)return receipt.promise;
      async function lookup(){var data=await request('/rest/api/content/'+pageId+'/child/attachment?'+new URLSearchParams({filename:receipt.name,expand:'container,version',limit:2}),{signal:input.signal});if(!Array.isArray(data.results)||data.results.length>1)throw fault('The attachment could not be verified.','INVALID_RESPONSE');if(!data.results.length)return null;var item=attachment(data.results[0],pageId);if(item.name!==receipt.name||item.size!==file.size)throw fault('The attachment response does not match this file.','INVALID_RESPONSE');return Object.assign(item,{displayName:file.name});}
      receipt.promise=(async function(){
        if(mediaType.startsWith('image/')){
          var header;try{header=new Uint8Array(await file.slice(0,16).arrayBuffer());}catch(_){throw fault('This image could not be read.','INVALID_FILE');}
          var signature=Array.from(header),valid=mediaType==='image/png'?signature.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':mediaType==='image/jpeg'?header[0]===255&&header[1]===216&&header[2]===255:mediaType==='image/gif'?String.fromCharCode.apply(null,header.slice(0,6))==='GIF87a'||String.fromCharCode.apply(null,header.slice(0,6))==='GIF89a':String.fromCharCode.apply(null,header.slice(0,4))==='RIFF'&&String.fromCharCode.apply(null,header.slice(8,12))==='WEBP';
          if(!valid)throw fault('Choose a valid PNG, JPEG, WebP or GIF image.','INVALID_FILE');
        }
        var targetPage=await getPage(pageId,{signal:input.signal});if(![pages.insights,pages.resources].map(String).includes(targetPage.parentId))throw fault('Attach files to an article in the selected publishing collection.','INVALID_SCOPE');
        if(input.signal&&input.signal.aborted)throw fault('The request was cancelled.','ABORTED');
        if(receipt.attempted){var recovered=await lookup();if(recovered){receipt.result=recovered;return Object.assign({},recovered);}}
        var Form=dependencies.FormData||root.FormData;if(typeof Form!=='function')throw fault('This browser cannot upload attachments. Use the native editor.','UNAVAILABLE');
        var form=new Form();try{var BlobType=dependencies.Blob||root.Blob,uploadFile=file.type===mediaType?file:new BlobType([file],{type:mediaType});form.append('file',uploadFile,receipt.name);}catch(_){throw fault('Choose a local file to attach.','INVALID_FILE');}
        form.append('comment','Uploaded from the Mosaic article editor');form.append('minorEdit','true');receipt.attempted=true;
        try{
          await request('/rest/api/content/'+pageId+'/child/attachment?'+new URLSearchParams({expand:'container,version',allowDuplicated:'false'}),{method:'POST',form:form,signal:input.signal});
          var confirmed=await lookup();if(!confirmed)throw fault('Confluence has not confirmed this attachment. Retry to check the same upload.','UNCERTAIN_UPLOAD');receipt.result=confirmed;return Object.assign({},confirmed);
        }catch(error){
          if(input.signal&&input.signal.aborted)throw error;
          if(!error.status||error.status>=500||error.status===409){try{var found=await lookup();if(found){receipt.result=found;return Object.assign({},found);}}catch(_){} }
          throw error;
        }
      })();
      try{return await receipt.promise;}finally{receipt.promise=null;}
    }
    async function search(query, options) {
      options = options || {}; var page = pagination(options), parent = options.parentId ? numeric(options.parentId, 'search parent ID') : null;
      var term = String(query || '').trim(); if (term.length > 250) throw fault('Keep the search to 250 characters or fewer.', 'INVALID_QUERY');
      var sort = options.sort || 'updated';
      if (!['updated','newest','oldest','title'].includes(sort)) throw fault('Choose an available sort order.', 'INVALID_QUERY');
      function alive() { if (options.signal && options.signal.aborted) throw fault('The request was cancelled.', 'ABORTED'); }
      function normalized(value) { return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
      alive(); await ensureRoot(options.signal); if (parent) await getPage(parent, {signal:options.signal}); alive();
      var words = normalized(term).split(/\s+/).filter(Boolean), key = JSON.stringify([parent,sort,words]), rows = page.start ? searchSnapshots.get(key) : null;
      if (!rows) {
        // Data Center's native space collection includes every page level and
        // newly published content without relying on the eventual CQL index.
        // https://docs.atlassian.com/ConfluenceServer/rest/7.8.0/#space/{spaceKey}/content/{type}
        var matches = [], seen = new Set(), technicalTrees = new Set(excludedTrees), start = 0, reads = 0, revision = insightRevision;
        for (;;) {
          alive();
          if (++reads > 200) throw fault('The Mosaic space is too large to search completely right now. Use the native page tree or try again.', 'SEARCH_INCOMPLETE');
          var data = await request('/rest/api/space/' + encodeURIComponent(space) + '/content/page?' + new URLSearchParams({depth:'all',start:start,limit:100,expand:PAGE_EXPAND}), {signal:options.signal});
          alive();
          if (!Array.isArray(data.results) || data.results.length > 100 || data.start != null && data.start !== start) throw fault('Confluence returned an invalid space page collection.', 'INVALID_RESPONSE');
          for (var record of data.results) {
            scope(record, true, null, true);
            var recordId = String(record.id);
            if (seen.has(recordId)) throw fault('The Mosaic page list changed while searching. Try the search again.', 'SEARCH_INCOMPLETE');
            if (seen.size >= 10000) throw fault('The Mosaic space has more than 10,000 pages. This search cannot be completed; use the native page tree.', 'SEARCH_INCOMPLETE');
            seen.add(recordId);
            if (/^navbar$/i.test(String(record.title || '').trim())) technicalTrees.add(recordId);
            if (excluded(record) || parent && !record.ancestors.some(function (item) { return String(item.id) === parent; })) continue;
            if (typeof record.title !== 'string' || !record.title.trim() || typeof record.body?.storage?.value !== 'string') throw fault('Confluence omitted page content needed for a complete search. Try again.', 'INVALID_RESPONSE');
            var parts = storageParts(record.body.storage.value), text = normalized(record.title + ' ' + parts.summary + ' ' + plain(record.body?.view?.value || parts.editorHtml));
            if (words.every(function (word) { return text.includes(word); })) matches.push({card:card(record),ancestors:record.ancestors.map(function (item) { return String(item.id); })});
          }
          var more = !!data._links?.next || !data._links && data.results.length === 100;
          if (!more) break;
          if (!data.results.length) throw fault('Confluence pagination did not advance. Try the search again.', 'SEARCH_INCOMPLETE');
          start += data.results.length;
        }
        rows = matches.filter(function (item) { return !item.ancestors.some(function (id) { return technicalTrees.has(id); }); }).map(function (item) { return item.card; });
        rows.sort(function (a,b) {
          if (sort === 'title') return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
          var left = Date.parse(sort === 'updated' ? a.updated : a.created), right = Date.parse(sort === 'updated' ? b.updated : b.created);
          if (!Number.isFinite(left)) left = 0; if (!Number.isFinite(right)) right = 0;
          return (sort === 'oldest' ? left-right : right-left) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
        });
        alive();
        // Cache only compact matched cards, never full bodies. A fresh search
        // starts at zero; continuation uses exactly that search's stable ordering.
        if (revision === insightRevision) { searchSnapshots.delete(key); searchSnapshots.set(key, rows); while (searchSnapshots.size > 3) searchSnapshots.delete(searchSnapshots.keys().next().value); }
      }
      alive(); var hasMore = page.start + page.limit < rows.length;
      return {results:rows.slice(page.start,page.start+page.limit),start:page.start,limit:page.limit,hasMore:hasMore,nextStart:hasMore ? page.start+page.limit : null};
    }
    function sameBody(first, second) {
      function canonical(value) {
        value = String(value || '').replace(/\r\n/g, '\n').replace(/<(br|hr)\s*\/?\s*>/gi, '<$1>').trim();
        var parts=storageParts(value,'1',context);value=parts.editorHtml;
        var Parser = dependencies.DOMParser || root.DOMParser;
        if (Parser) value=new Parser().parseFromString(value, 'text/html').body.innerHTML;
        return JSON.stringify([parts.hasStyleMarker,parts.summary,value]);
      }
      return canonical(first) === canonical(second);
    }
    function unknown() { var error = fault('Publication is not yet confirmed. Use Check publication to reconcile the original request; do not create a second copy. You can also inspect Insights in Confluence.', 'UNCERTAIN_WRITE'); error.uncertain = true; return error; }
    function unknownRevision() { var error = fault('This revision is not yet confirmed. Use Check publication to verify the original version, or inspect the page in Confluence.', 'UNCERTAIN_WRITE'); error.uncertain = true; return error; }
    async function readStyleLabels(id) {
      // Native Data Center labels are additive; never replace user labels.
      // https://developer.atlassian.com/server/confluence/rest/v927/api-group-content-labels/
      var found=new Set();
      for(var start=0;start<1000;){
        var data=await request('/rest/api/content/'+id+'/label?'+new URLSearchParams({start:start,limit:100}));
        if(!Array.isArray(data.results)||data.results.length>100||data.results.some(function(label){return !label||typeof label.name!=='string'||typeof label.prefix!=='string';}))throw fault('Confluence returned an invalid page label list.','INVALID_RESPONSE');
        data.results.forEach(function(label){if(label.prefix==='global')found.add(label.name);});
        if(!(data._links&&data._links.next)&&(data._links||data.results.length<100))return found;
        if(!data.results.length)throw fault('The page label list did not advance.','INVALID_RESPONSE');
        start+=data.results.length;
      }
      throw fault('The native page label list is too large to verify.','INVALID_RESPONSE');
    }
    async function finishPublication(page, receipt) {
      insightSnapshot=null;insightRevision++;searchSnapshots.clear();
      if(!page.hasStyleMarker){savePending(null);return page;}
      receipt=Object.assign({},receipt||{title:page.title,parentId:page.parentId,html:page.html},{id:page.id,version:page.version,labelsPending:true});savePending(receipt);
      try {
        var found=await readStyleLabels(page.id),missing=STYLE_LABELS.filter(function(name){return !found.has(name);});
        if(missing.length){
          var writeError=null;
          try{await request('/rest/api/content/'+page.id+'/label',{method:'POST',body:missing.map(function(name){return {prefix:'global',name:name};})});}catch(error){writeError=error;}
          found=await readStyleLabels(page.id);
          if(!STYLE_LABELS.every(function(name){return found.has(name);}))throw writeError||fault('Native page labels were not confirmed.','INVALID_RESPONSE');
        }
        savePending(null);return Object.assign(page,{styleLabels:STYLE_LABELS.slice()});
      } catch(error) {
        var failure=fault('The page is saved, but its presentation labels are not confirmed. Use Check publication to finish the same page. '+error.message,'PUBLICATION_LABELS',error.status);failure.uncertain=true;failure.pageId=page.id;throw failure;
      }
    }
    async function recover(receipt) {
      if (receipt.id) {
        var known = await getPage(receipt.id);
        if (known.title === receipt.title && known.parentId === receipt.parentId && (!receipt.labelsPending||known.version===receipt.version) && sameBody(known.html, receipt.html)) return finishPublication(known,receipt);
        throw unknown();
      }
      // Bounded, direct child reads avoid depending on an eventually consistent index.
      for (var start = 0; start < 1000;) {
        var data = await request('/rest/api/content/' + receipt.parentId + '/child/page?' + new URLSearchParams({start:start,limit:100,expand:PAGE_EXPAND}));
        if (!Array.isArray(data.results) || data.results.length > 100) throw unknown();
        var matches = data.results.filter(function (item) { scope(item, false, receipt.parentId); return item.title === receipt.title && sameBody(item.body && item.body.storage && item.body.storage.value, receipt.html); });
        if (matches.length === 1) return finishPublication(detailed(matches[0]),receipt);
        if (matches.length > 1) throw unknown();
        if (!(data._links && data._links.next) && (data._links || data.results.length < 100)) break;
        if (!data.results.length) break;
        start += data.results.length;
      }
      throw unknown();
    }
    async function publish(input) {
      input = input || {};
      if (mutation) throw fault('A publication is already in progress.', 'BUSY');
      var title = String(input.title || '').trim();
      if (!title || title.length > 255) throw fault('Enter a title of up to 255 characters.', 'INVALID_CONTENT');
      var summary=String(input.summary||'').trim();if(summary.length>1000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(summary))throw fault('Keep the summary to 1,000 characters of readable text or fewer.','INVALID_CONTENT');
      var attachmentsPending=input.attachmentsPending===true&&!input.id;
      var editorHtml=typeof input.html==='string'?input.html:'';if(editorHtml.trim())validateHTML(editorHtml);else if(!summary&&!attachmentsPending)throw fault('Write some article content or a summary before publishing.','INVALID_CONTENT');
      var parentId = numeric(input.parentId || pages.insights, 'Insights parent page ID');
      var id = input.id ? numeric(input.id, 'article page ID') : null;
      var legacyResource = parentId === String(pages.resources) && (id || pending && pending.parentId === parentId);
      if (parentId !== String(pages.insights) && !legacyResource) throw fault('New articles are published in Insights.', 'INVALID_SCOPE');
      if(id&&pending&&!pending.labelsPending)throw fault('Resolve the earlier unconfirmed publication before updating another page.','PENDING_PUBLICATION');
      var html=toStorage(editorHtml,id||(pending&&pending.labelsPending&&pending.id)||null,context,summary,!id);
      mutation = true;
      try {
        await getPage(parentId);
        if(pending&&pending.labelsPending){
          var pendingParts=storageParts(pending.html,pending.id,context),requested=toStorage(editorHtml,pending.id,context,input.summary===undefined?pendingParts.summary:summary,pendingParts.hasStyleMarker);
          if((id&&id!==pending.id)||pending.title!==title||pending.parentId!==parentId||!sameBody(pending.html,requested))throw fault('Finish the saved page’s presentation labels before publishing different content.','PENDING_PUBLICATION');
          return await recover(pending);
        }
        if (id) {
          var existing = await getPage(id);
          if (existing.parentId !== parentId) throw fault('This article is outside the selected publishing collection.', 'INVALID_SCOPE');
          if (existing.hasUnsupportedContent) throw fault('Use the native Confluence editor to preserve this page’s unsupported macros and media.', 'UNSUPPORTED_CONTENT');
          if(input.summary===undefined)summary=existing.summary;
          html=toStorage(editorHtml,id,context,summary,existing.hasStyleMarker);
          if (Number.isInteger(input.version) && existing.version === input.version + 1 && existing.title === title && sameBody(existing.html,html)) return await finishPublication(existing);
          if (!Number.isInteger(input.version) || input.version !== existing.version) throw fault('This article has changed. Open its latest native version before editing.', 'CONFLICT');
          try {
            await request('/rest/api/content/' + id, {method:'PUT',body:{id:id,type:'page',title:title,version:{number:input.version + 1},body:{storage:{value:html,representation:'storage'}}}});
          } catch (error) {
            if (error.status && error.status < 500) throw error;
            try {
              var current = await getPage(id);
              if (current.version === input.version + 1 && current.title === title && sameBody(current.html,html)) return await finishPublication(current);
            } catch (verificationError) { if(verificationError.code==='PUBLICATION_LABELS')throw verificationError; /* Preserve the original unconfirmed revision. */ }
            throw unknownRevision();
          }
          try {
            var verified = await getPage(id);
            if (verified.version === input.version + 1 && verified.title === title && sameBody(verified.html,html)) return await finishPublication(verified);
          } catch (error) { if(error.code==='PUBLICATION_LABELS')throw error; /* A successful PUT without a verified body is still unconfirmed. */ }
          throw unknownRevision();
        }
        if (pending) {
          if (pending.title !== title || pending.parentId !== parentId || !sameBody(pending.html, html)) throw fault('Resolve the previous unconfirmed publication before changing or creating another article.', 'PENDING_PUBLICATION');
          return await recover(pending);
        }
        var receipt = {title:title,parentId:parentId,html:html,createdAt:new Date().toISOString()};
        if(attachmentsPending)receipt.attachmentsPending=true;
        // Retain the exact request before dispatch so a lost response never leads to a blind second POST.
        savePending(receipt);
        try {
          var created = await request('/rest/api/content', {method:'POST',body:{type:'page',title:title,space:{key:space},ancestors:[{id:parentId}],body:{storage:{value:html,representation:'storage'}}}});
          receipt.id = numeric(created.id, 'created page ID'); savePending(receipt);
          var confirmed = await getPage(receipt.id);
          if (confirmed.parentId !== parentId || confirmed.title !== title || !sameBody(confirmed.html,html)) throw unknown();
          return await finishPublication(confirmed,receipt);
        } catch (error) {
          if(error.code==='PUBLICATION_LABELS')throw error;
          if (!receipt.id && error.status && error.status >= 400 && error.status < 500) { savePending(null); throw error; }
          try { return await recover(receipt); } catch (recoveryError) { if(recoveryError.code==='PUBLICATION_LABELS')throw recoveryError;throw unknown(); }
        }
      } finally { mutation = false; }
    }
    return Object.freeze({search:search,insights:insights,children:children,getPage:getPage,publish:publish,uploadAttachment:uploadAttachment,listAttachments:listAttachments,getPendingPublication:function () { return pending ? Object.assign({}, pending,storageParts(pending.html,pending.id,context)) : null; },user:async function () { await ensureRoot(); return request('/rest/api/user/current'); }});
  }
  var api = Object.freeze({create:create,validateHTML:validateHTML,safeURL:safeURL,safeImageURL:safeImageURL,createAttachmentHTML:createAttachmentHTML,excerpt:excerpt});
  root.MosaicAPI = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

;
/* Mosaic page scroll control, adapted from WCSpedia scroll-tools.js. The ring,
 * arrow and animations preserve the WCSpedia control (original ring reference:
 * the user's CodeFronts example). Uses the existing native scroll owner; adds
 * no scroll container, network request or hash navigation. */
(function (w,d) {
  'use strict';
  if(w.MosaicScroll)return;
  var instance=null;
  function allowed() {
    if(!d.body||d.body.getAttribute('data-mosaic-host')!=='active')return false;
    var space=d.querySelector('meta[name="ajs-space-key"]')?.content;
    try {space=space||(w.AJS&&w.AJS.Meta&&w.AJS.Meta.get('space-key'));}catch(_){}
    if(space&&space!=='mosaic')return false;
    var url=new URL(w.location.href);
    return !/\/(?:admin|plugins\/servlet\/admin)(?:\/|$)/i.test(url.pathname) &&
      !/(?:editpage|createpage|createblogpost|viewpreviousversions|diffpages|viewpagehistory|preview|spacepermissions)\.action$/i.test(url.pathname) &&
      !/[?&](?:pageVersion|preview|mosaicNativeUi)=/.test(url.search) &&
      !/(?:^|[/?#])(?:new|create|edit|editor)(?:[/?#=]|$)/i.test(url.hash) &&
      !d.querySelector('#editpageform,#createpageform,#content-editor,body.contenteditor,.mosaic-editor');
  }
  function mount(options) {
    options=options||{};
    if(instance){instance.setRoot(options.root);instance.refresh();return instance;}
    if(!allowed())return null;
    var suppliedRoot=options.root,button=d.createElement('button');
    button.id='mosaic-back-to-top';button.type='button';button.hidden=true;
    button.setAttribute('aria-label','Back to top');button.title='Back to top';button.setAttribute('data-mosaic-scroll-control','');button.setAttribute('data-mosaic-owned','');
    button.innerHTML='<svg class="mosaic-scroll-ring-svg" viewBox="0 0 52 52" aria-hidden="true" focusable="false"><circle class="mosaic-scroll-track" cx="26" cy="26" r="22" fill="none" stroke-width="3.5"/><circle class="mosaic-scroll-ring" cx="26" cy="26" r="22" fill="none" stroke-width="3.5" stroke-linecap="round"/></svg><svg class="mosaic-scroll-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>';
    d.body.append(button);
    var frame=null,idleTimer=null,disposed=false,pane=null,content=null,lastTop=0,activity=false,scrollPending=false,hovered=false;
    var resize,mutations,heading=null,headingAdded=false;
    var idleMs=Number.isFinite(options.idleMs)?Math.max(200,Math.min(10000,options.idleMs)):1400;
    function primary(){return suppliedRoot?.isConnected?suppliedRoot:d.querySelector('[data-mosaic-root],#mosaic')||d.querySelector('#main-content')||d.querySelector('.wiki-content')||d.querySelector('main')||d.body;}
    function owner(node){
      for(var el=node;el&&el!==d.body&&el!==d.documentElement;el=el.parentElement){
        if(/^(auto|scroll)$/.test(w.getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight)return el;
      }
      return d.scrollingElement||d.documentElement;
    }
    function documentPane(el){return el===d.scrollingElement||el===d.documentElement||el===d.body;}
    function modal(){return Array.from(d.querySelectorAll('[aria-modal="true"]')).some(function(el){var style=w.getComputedStyle(el);return !el.hidden&&style.display!=='none'&&style.visibility!=='hidden'&&el.getClientRects().length;});}
    function endActivity(){activity=false;w.clearTimeout(idleTimer);idleTimer=null;}
    function recordActivity(){activity=true;w.clearTimeout(idleTimer);idleTimer=w.setTimeout(function(){idleTimer=null;activity=false;schedule();},idleMs);}
    function update(){
      frame=null;if(disposed)return;if(!allowed()){destroy();return;}
      var moved=scrollPending;scrollPending=false;
      var nextContent=primary(),nextPane=owner(nextContent),changed=pane!==nextPane||content!==nextContent;
      if(changed){content=nextContent;pane=nextPane;endActivity();if(resize){resize.disconnect();resize.observe(content);if(pane!==content)resize.observe(pane);}}
      var viewport=documentPane(pane)?d.documentElement.clientHeight||w.innerHeight:pane.clientHeight;
      var top=documentPane(pane)?Math.max(w.scrollY||0,pane.scrollTop||0):pane.scrollTop;
      var max=Math.max(0,pane.scrollHeight-viewport),progress=max?Math.max(0,Math.min(1,top/max)):0;
      var longPage=viewport>0&&max>=Math.max(320,viewport);
      if(!changed&&moved&&Math.abs(top-lastTop)>0.5&&longPage&&progress>0.08)recordActivity();
      lastTop=top;button.style.setProperty('--mosaic-scroll-progress',progress.toFixed(4));
      if(!longPage||progress<=0.08||modal()){endActivity();button.hidden=true;return;}
      button.hidden=!(activity||hovered||d.activeElement===button);
    }
    function schedule(){if(!disposed&&frame===null)frame=w.requestAnimationFrame(update);}
    function scrolling(){scrollPending=true;schedule();}
    function pageHide(event){if(!event.persisted)destroy();}
    function pageShow(event){if(event.persisted){endActivity();hovered=false;}schedule();}
    function enter(){hovered=true;schedule();}
    function leave(){hovered=false;schedule();}
    function releaseHeading(){if(!heading)return;heading.removeEventListener('blur',releaseHeading);if(headingAdded&&heading.getAttribute('tabindex')==='-1')heading.removeAttribute('tabindex');heading=null;headingAdded=false;}
    function toTop(){
      if(disposed||!allowed()||modal())return;
      var target=primary(),scrollOwner=owner(target),behavior=w.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
      endActivity();hovered=false;
      if(documentPane(scrollOwner))w.scrollTo({top:0,behavior:behavior});else if(scrollOwner.scrollTo)scrollOwner.scrollTo({top:0,behavior:behavior});else scrollOwner.scrollTop=0;
      releaseHeading();heading=target.matches('h1,h2')?target:target.querySelector('h1,h2');
      if(heading){headingAdded=!heading.hasAttribute('tabindex');if(headingAdded)heading.setAttribute('tabindex','-1');heading.addEventListener('blur',releaseHeading,{once:true});heading.focus({preventScroll:true});}
      schedule();
    }
    function destroy(){
      if(disposed)return;disposed=true;endActivity();if(frame!==null)w.cancelAnimationFrame(frame);frame=null;
      resize?.disconnect();mutations?.disconnect();releaseHeading();
      d.removeEventListener('scroll',scrolling,true);w.removeEventListener('scroll',scrolling);w.removeEventListener('resize',schedule);w.removeEventListener('pageshow',pageShow);w.removeEventListener('pagehide',pageHide);w.removeEventListener('hashchange',schedule);w.removeEventListener('popstate',schedule);w.visualViewport?.removeEventListener('resize',schedule);
      button.removeEventListener('click',toTop);button.removeEventListener('mouseenter',enter);button.removeEventListener('mouseleave',leave);button.removeEventListener('focus',schedule);button.removeEventListener('blur',schedule);button.remove();instance=null;
    }
    button.addEventListener('click',toTop);button.addEventListener('mouseenter',enter);button.addEventListener('mouseleave',leave);button.addEventListener('focus',schedule);button.addEventListener('blur',schedule);
    d.addEventListener('scroll',scrolling,{capture:true,passive:true});w.addEventListener('scroll',scrolling,{passive:true});w.addEventListener('resize',schedule,{passive:true});w.addEventListener('pageshow',pageShow);w.addEventListener('pagehide',pageHide);w.addEventListener('hashchange',schedule);w.addEventListener('popstate',schedule);w.visualViewport?.addEventListener('resize',schedule,{passive:true});
    if(w.ResizeObserver)resize=new w.ResizeObserver(schedule);
    if(w.MutationObserver){mutations=new w.MutationObserver(function(changes){if(changes.some(function(c){return c.type==='childList'||(c.target!==button&&(c.target===d.body||c.target.closest?.('[aria-modal="true"]')));}))schedule();});mutations.observe(d.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-mosaic-host','class','hidden','aria-modal']});}
    instance={refresh:schedule,setRoot:function(root){if(root?.nodeType===1)suppliedRoot=root;},destroy:destroy};update();return instance;
  }
  w.MosaicScroll={mount:mount,destroy:function(){instance?.destroy();}};
})(window,document);

;
/* Mosaic decorative media: stable placeholders, eager visible covers, and one
 * decoded image reveal. No polling, global observer or layout reconstruction. */
(function(w){
  'use strict';
  if(w.MosaicMedia)return;
  var entries=new WeakMap();
  function prepare(image,frame,options){
    if(!image||image.tagName!=='IMG'||!frame)return null;
    if(entries.has(image))return entries.get(image);
    options=options||{};var active=true,settled=false,decoding=false,resolveReady;
    var ready=new Promise(function(resolve){resolveReady=resolve;});
    frame.setAttribute('data-mosaic-media-frame','');
    frame.setAttribute('data-mosaic-media-state','loading');
    image.setAttribute('data-mosaic-media','');image.decoding='async';
    image.setAttribute('loading',options.eager?'eager':'lazy');
    if(options.priority)image.setAttribute('fetchpriority','high');
    function remove(){image.removeEventListener('load',loaded);image.removeEventListener('error',failed);}
    function finish(state){if(!active||settled)return;settled=true;remove();frame.setAttribute('data-mosaic-media-state',state);resolveReady({status:state});}
    function failed(){finish('error');}
    function loaded(){
      if(!active||settled||decoding)return;
      if(!image.naturalWidth){failed();return;}
      if(typeof image.decode!=='function'){finish('ready');return;}
      decoding=true;
      // A failed decode does not discard an image the browser already loaded.
      Promise.resolve().then(function(){return image.decode();}).catch(function(){}).then(function(){if(active)finish(image.naturalWidth?'ready':'error');});
    }
    image.addEventListener('load',loaded);image.addEventListener('error',failed);
    var handle={ready:ready,destroy:function(){active=false;remove();resolveReady({status:'cancelled'});entries.delete(image);frame.removeAttribute('data-mosaic-media-state');}};entries.set(image,handle);
    if(image.complete){if(image.naturalWidth)loaded();else if(image.getAttribute('src'))failed();}
    return handle;
  }
  function mount(target){
    var handles=[];
    target.querySelectorAll('img[data-mosaic-media]').forEach(function(image){var frame=image.closest('[data-mosaic-media-frame]');if(frame)handles.push(prepare(image,frame,{eager:image.getAttribute('loading')==='eager',priority:image.getAttribute('fetchpriority')==='high'}));});
    return {destroy:function(){handles.forEach(function(handle){handle?.destroy();});}};
  }
  w.MosaicMedia=Object.freeze({prepare:prepare,mount:mount,ready:function(image){return entries.get(image)?.ready;}});
})(window);

;
/* Presentation for verified native Mosaic pages. Keep Confluence's rendered
 * nodes, macros and table layout; never rebuild article HTML or infer a title
 * from the first paragraph. Host verification owns activation and teardown. */
(function(w,d){
  'use strict';
  if(w.MosaicNativePage)return;
  var current=null;
  var excluded='nav,aside,[role=dialog],[role=menu],#comments-section,#add-comment,[contenteditable=true],#content-editor,.mce-content-body,.macro-preview';
  var titles='#title-heading,#title-text,[data-testid="title-text"],[data-testid="page-title"],#main-header h1';
  function allowed(node){return node&&node.isConnected&&!node.closest(excluded);}
  function articleNode(node){return node.nodeType===3&&node.textContent.trim()||node.nodeType===1&&!node.matches(titles+',script,style,[data-mosaic-owned],.mosaic-native-results-link,.page-actions,#comments-section,#add-comment');}
  function findContent(){
    var selectors=['#main-content.wiki-content','#main-content>.wiki-content','#main-content>.contentLayout2','#main-content>.contentLayout','#main-content .ak-renderer-document','#main-content .wiki-content','[data-testid="renderer-wrapper"] .ak-renderer-document','#content .ak-renderer-document','main .ak-renderer-document','#main-content [data-testid="renderer-wrapper"]'];
    for(var i=0;i<selectors.length;i++){var candidates=d.querySelectorAll(selectors[i]);for(var j=0;j<candidates.length;j++)if(allowed(candidates[j])){
      var candidate=candidates[j],container=candidate.closest('#main-content'),branch=candidate;
      if(container&&container!==candidate){while(branch.parentElement!==container)branch=branch.parentElement;if(Array.from(container.childNodes).some(function(node){return node!==branch&&articleNode(node);}))return container;}
      return candidate;
    }}
    var main=d.getElementById('main-content');
    if(allowed(main)&&Array.from(main.childNodes).some(articleNode))return main;
    return null;
  }
  function nativeTitles(content){return Array.from(d.querySelectorAll(titles)).filter(function(node){return allowed(node)&&!node.contains(content)&&!node.closest('[data-mosaic-owned]');}).filter(function(node,_,all){return !all.some(function(other){return other!==node&&other.contains(node);});});}
  function title(content){var node=content&&nativeTitles(content)[0];return node?node.textContent.trim():'';}
  function set(node,name,value){if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
  function mark(node,name,value){if(!current.marks.has(node))current.marks.set(node,new Map());var attrs=current.marks.get(node);if(!attrs.has(name))attrs.set(name,node.getAttribute(name));set(node,name,value);}
  function release(node,name){var attrs=current.marks.get(node);if(!attrs?.has(name))return;var prior=attrs.get(name);if(prior===null)node.removeAttribute(name);else node.setAttribute(name,prior);attrs.delete(name);if(!attrs.size)current.marks.delete(node);}
  function surfaceFor(content){
    if(current?.wrapper&&content.parentElement===current.wrapper)return current.wrapper;
    var main=content.closest('#main-content');if(main&&main!==content)return main;
    var renderer=content.closest('[data-testid="renderer-wrapper"]');if(renderer&&renderer!==content)return renderer;
    return null;
  }
  function element(tag,className,text){var node=d.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;}
  function date(value){var parsed=new Date(value||'');return Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(parsed):'';}
  function pageUrl(config,id){return /^[1-9]\d*$/.test(String(id||''))?(config.contextPath||'/confluence')+'/pages/viewpage.action?pageId='+id:'';}
  function coverUrl(article){
    var config=article.config||{},base=config.assetBase||(config.contextPath||'/confluence')+'/download/attachments/'+(config.attachmentPageId||'3981001251')+'/';
    try{var url=new URL(base,w.location.href);if(url.origin!==w.location.origin||url.username||url.password)return '';var hash=2166136261;Array.from(String(article.pageId||'')).forEach(function(ch){hash=Math.imul(hash^ch.charCodeAt(0),16777619);});return new URL('mosaic-cover-'+String((hash>>>0)%50+1).padStart(2,'0')+'.webp',url).href;}catch(_){return '';}
  }
  function readingTime(content){
    var walker=d.createTreeWalker(content,w.NodeFilter.SHOW_TEXT),words=0,node;
    while((node=walker.nextNode()))if(!node.parentElement.closest('script,style,[data-mosaic-owned],[data-mosaic-native-title-hidden]'))words+=(node.textContent.trim().match(/\S+/g)||[]).length;
    return words?Math.max(1,Math.ceil(words/200))+' min read':'';
  }
  function articlePresentation(text,article){
    var config=article.config||{},collection=article.collection==='insights'?'Insights':article.collection==='resources'?'Resources':'Mosaic';
    var published=date(article.createdAt),edited=date(article.updatedAt),reading=readingTime(current.content),cover=coverUrl(article);
    var signature=JSON.stringify([text,article.pageId,article.version,article.author,published,edited,article.updatedBy,collection,reading,cover,config.contextPath,config.pageIds]);
    if(current.signature===signature&&current.heading?.isConnected)return;
    current.signature=signature;current.media?.destroy();current.heading?.remove();
    var header=element('header','mosaic-native-document-heading');header.setAttribute('data-mosaic-owned','');
    // Host verification derives the collection from native page ancestors.
    if(article.collection==='insights'){
      var trail=element('nav','mosaic-native-breadcrumb');trail.setAttribute('aria-label','Breadcrumb');
      [['Mosaic',config.rootPageId],['Insights',config.pageIds?.insights]].forEach(function(item){var href=pageUrl(config,item[1]);if(!href)return;var link=element('a','',item[0]);link.href=href;trail.append(link);});
      var here=element('span','',text);here.setAttribute('aria-current','page');trail.append(here);header.append(trail);
    }
    header.append(element('p','mosaic-native-category',collection),element('h1','',text));
    // Keep verified native authorship beside the publication date. Do not add
    // a second metadata rail or borrow edit details from a newer revision.
    var editText=edited?'Last edited '+edited:'';
    if(article.updatedBy)editText+=(editText?' by ':'Last edited by ')+article.updatedBy;
    var byline=element('p','mosaic-native-byline');
    [article.author?'By '+article.author:'',published,reading,editText].filter(Boolean).forEach(function(value){byline.append(element('span','',value));});
    if(byline.childNodes.length)header.append(byline);
    if(cover){var frame=element('div','mosaic-native-cover-frame'),img=element('img','mosaic-native-cover');img.alt='';img.width=1600;img.height=560;img.loading='eager';img.decoding='async';img.setAttribute('fetchpriority','high');img.src=cover;frame.append(img);header.append(frame);current.media=w.MosaicMedia?.prepare(img,frame,{eager:true,priority:true});}
    current.heading=header;current.surface.prepend(header);
    mark(current.surface,'data-mosaic-native-editorial','true');
  }
  function destroy(){
    if(!current)return;var previous=current,focus=d.activeElement;current=null;previous.media?.destroy();previous.heading?.remove();
    previous.marks.forEach(function(attrs,node){attrs.forEach(function(value,name){if(value===null)node.removeAttribute(name);else node.setAttribute(name,value);});});
    if(previous.wrapper?.parentNode)previous.wrapper.replaceWith.apply(previous.wrapper,Array.from(previous.wrapper.childNodes));
    if(focus?.isConnected&&previous.content.contains(focus)&&d.activeElement!==focus)focus.focus({preventScroll:true});
  }
  function sync(options){
    var content=options&&options.content;if(!allowed(content)){destroy();return null;}
    var surface=surfaceFor(content);
    if(current&&(current.content!==content||current.surface!==surface||!current.surface.isConnected)){destroy();surface=surfaceFor(content);}
    if(!current){
      var wrapper=null;if(!surface){var focus=d.activeElement;wrapper=d.createElement('div');wrapper.setAttribute('data-mosaic-native-wrapper','');content.before(wrapper);wrapper.append(content);surface=wrapper;if(focus?.isConnected&&content.contains(focus)&&d.activeElement!==focus)focus.focus({preventScroll:true});}
      current={content:content,surface:surface,wrapper:wrapper,heading:null,signature:null,marks:new Map()};
      mark(surface,'data-mosaic-native-surface','true');mark(content,'data-mosaic-native-content','true');
    }
    var headingNodes=nativeTitles(content),text=String(options.title||title(content)||'').trim(),needsTitle=!!text&&(options.hideTitle||!headingNodes.length);
    if(needsTitle&&options.article)articlePresentation(text,options.article);
    else if(needsTitle){
      current.signature=null;release(surface,'data-mosaic-native-editorial');
      if(!current.heading){current.heading=element('header','mosaic-native-document-heading');current.heading.setAttribute('data-mosaic-owned','');current.heading.append(element('h1'));}
      var h1=current.heading.querySelector('h1');if(h1.textContent!==text)h1.textContent=text;
      if(current.heading.parentElement!==surface||surface.firstElementChild!==current.heading)surface.prepend(current.heading);
    }else{current.heading?.remove();current.heading=null;current.signature=null;release(surface,'data-mosaic-native-editorial');}
    var hidden=options.hideTitle&&needsTitle?new Set(headingNodes):new Set();
    Array.from(current.marks.keys()).forEach(function(node){if(!hidden.has(node))release(node,'data-mosaic-native-title-hidden');});
    hidden.forEach(function(node){mark(node,'data-mosaic-native-title-hidden','true');});
    var exportChrome=new Set(headingNodes.filter(function(node){return content.contains(node);}));
    Array.from(current.marks.keys()).forEach(function(node){if(!exportChrome.has(node))release(node,'data-mosaic-export');});
    exportChrome.forEach(function(node){mark(node,'data-mosaic-export','native-title');});
    // Style the rendered native excerpt in place. No summary copy is generated.
    var excerpt=Array.from(content.querySelectorAll('.conf-macro[data-macro-name="excerpt"],.excerpt,[data-macro-name="excerpt"]')).find(function(node){return !node.closest('pre,code,table,blockquote,[contenteditable=true],.macro-preview');});
    Array.from(current.marks.keys()).forEach(function(node){if(node!==excerpt)release(node,'data-mosaic-native-summary');});
    if(excerpt)mark(excerpt,'data-mosaic-native-summary','true');
    // Only the generated Anchor's own empty block may be hidden. User-authored
    // blank paragraphs and repeated summary/body text are never deduplicated.
    var markerOnly=new Set();content.querySelectorAll('span[id],a[id],a[name]').forEach(function(node){
      if(node.closest('pre,code,textarea,[contenteditable=true],.macro-preview')||!(/(?:^|-)mosaic-page-style-v1$/.test(node.id)||node.getAttribute('name')==='mosaic-page-style-v1'))return;
      if(!node.textContent.trim()&&!node.querySelector('img,video,iframe,object,button,input')){
        markerOnly.add(node);var parent=node.parentElement;
        if(parent?.matches('p')&&Array.from(parent.childNodes).every(function(child){return child===node||child.nodeType===3&&!child.textContent.trim()||child.nodeType===8||child.nodeType===1&&child.tagName==='BR';}))markerOnly.add(parent);
      }
    });
    Array.from(current.marks.keys()).forEach(function(node){if(!markerOnly.has(node))release(node,'data-mosaic-native-marker-only');});
    markerOnly.forEach(function(node){mark(node,'data-mosaic-native-marker-only','true');});
    return {surface:surface,content:content};
  }
  w.MosaicNativePage=Object.freeze({findContent:findContent,title:title,sync:sync,destroy:destroy});
})(window,document);

;
/* Mosaic Confluence host integration. Styles the real page tree; native handlers
 * remain responsible for layout and collapse state. PAL icons retain the license
 * in attachments/licenses/sidebar-icons-LICENSE.txt. */
(function (w, d) {
  'use strict';
  if (w.MosaicHost) return;
  var ICONS = {"home":"M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z","about":"M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H18.5001C19.7427 20.75 20.7501 19.7426 20.7501 18.5V5.5C20.7501 4.25736 19.7427 3.25 18.5001 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H18.5001C18.9143 4.75 19.2501 5.08579 19.2501 5.5V18.5C19.2501 18.9142 18.9143 19.25 18.5001 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V5.5ZM6.25005 9.7143C6.25005 9.30008 6.58583 8.9643 7.00005 8.9643L17 8.96429C17.4143 8.96429 17.75 9.30008 17.75 9.71429C17.75 10.1285 17.4143 10.4643 17 10.4643L7.00005 10.4643C6.58583 10.4643 6.25005 10.1285 6.25005 9.7143ZM6.25005 14.2857C6.25005 13.8715 6.58583 13.5357 7.00005 13.5357H17C17.4143 13.5357 17.75 13.8715 17.75 14.2857C17.75 14.6999 17.4143 15.0357 17 15.0357H7.00005C6.58583 15.0357 6.25005 14.6999 6.25005 14.2857Z","team":"M8.80443 5.60156C7.59109 5.60156 6.60749 6.58517 6.60749 7.79851C6.60749 9.01185 7.59109 9.99545 8.80443 9.99545C10.0178 9.99545 11.0014 9.01185 11.0014 7.79851C11.0014 6.58517 10.0178 5.60156 8.80443 5.60156ZM5.10749 7.79851C5.10749 5.75674 6.76267 4.10156 8.80443 4.10156C10.8462 4.10156 12.5014 5.75674 12.5014 7.79851C12.5014 9.84027 10.8462 11.4955 8.80443 11.4955C6.76267 11.4955 5.10749 9.84027 5.10749 7.79851ZM4.86252 15.3208C4.08769 16.0881 3.70377 17.0608 3.51705 17.8611C3.48384 18.0034 3.5211 18.1175 3.60712 18.2112C3.70161 18.3141 3.86659 18.3987 4.07591 18.3987H13.4249C13.6343 18.3987 13.7992 18.3141 13.8937 18.2112C13.9797 18.1175 14.017 18.0034 13.9838 17.8611C13.7971 17.0608 13.4132 16.0881 12.6383 15.3208C11.8821 14.572 10.6899 13.955 8.75042 13.955C6.81096 13.955 5.61877 14.572 4.86252 15.3208ZM3.8071 14.2549C4.87163 13.2009 6.45602 12.455 8.75042 12.455C11.0448 12.455 12.6292 13.2009 13.6937 14.2549C14.7397 15.2906 15.2207 16.5607 15.4446 17.5202C15.7658 18.8971 14.6071 19.8987 13.4249 19.8987H4.07591C2.89369 19.8987 1.73504 18.8971 2.05628 17.5202C2.28015 16.5607 2.76117 15.2906 3.8071 14.2549ZM15.3042 11.4955C14.4702 11.4955 13.7006 11.2193 13.0821 10.7533C13.3742 10.3314 13.6054 9.86419 13.7632 9.36432C14.1597 9.75463 14.7039 9.99545 15.3042 9.99545C16.5176 9.99545 17.5012 9.01185 17.5012 7.79851C17.5012 6.58517 16.5176 5.60156 15.3042 5.60156C14.7039 5.60156 14.1597 5.84239 13.7632 6.23271C13.6054 5.73284 13.3741 5.26561 13.082 4.84371C13.7006 4.37777 14.4702 4.10156 15.3042 4.10156C17.346 4.10156 19.0012 5.75674 19.0012 7.79851C19.0012 9.84027 17.346 11.4955 15.3042 11.4955ZM19.9248 19.8987H16.3901C16.7014 19.4736 16.9159 18.969 16.9827 18.3987H19.9248C20.1341 18.3987 20.2991 18.3141 20.3936 18.2112C20.4796 18.1175 20.5169 18.0034 20.4837 17.861C20.2969 17.0607 19.913 16.088 19.1382 15.3208C18.4047 14.5945 17.261 13.9921 15.4231 13.9566C15.2232 13.6945 14.9995 13.437 14.7491 13.1891C14.5144 12.9566 14.262 12.7384 13.9916 12.5362C14.3853 12.4831 14.8044 12.4549 15.2503 12.4549C17.5447 12.4549 19.1291 13.2008 20.1936 14.2549C21.2395 15.2906 21.7206 16.5607 21.9444 17.5202C22.2657 18.8971 21.107 19.8987 19.9248 19.8987Z","resources":"M8.50391 4.25C8.50391 3.83579 8.83969 3.5 9.25391 3.5H15.2777C15.4766 3.5 15.6674 3.57902 15.8081 3.71967L18.2807 6.19234C18.4214 6.333 18.5004 6.52376 18.5004 6.72268V16.75C18.5004 17.1642 18.1646 17.5 17.7504 17.5H16.248V17.4993H14.748V17.5H9.25391C8.83969 17.5 8.50391 17.1642 8.50391 16.75V4.25ZM14.748 19H9.25391C8.01126 19 7.00391 17.9926 7.00391 16.75V6.49854H6.24805C5.83383 6.49854 5.49805 6.83432 5.49805 7.24854V19.75C5.49805 20.1642 5.83383 20.5 6.24805 20.5H13.998C14.4123 20.5 14.748 20.1642 14.748 19.75L14.748 19ZM7.00391 4.99854V4.25C7.00391 3.00736 8.01127 2 9.25391 2H15.2777C15.8745 2 16.4468 2.23705 16.8687 2.659L19.3414 5.13168C19.7634 5.55364 20.0004 6.12594 20.0004 6.72268V16.75C20.0004 17.9926 18.9931 19 17.7504 19H16.248L16.248 19.75C16.248 20.9926 15.2407 22 13.998 22H6.24805C5.00541 22 3.99805 20.9926 3.99805 19.75V7.24854C3.99805 6.00589 5.00541 4.99854 6.24805 4.99854H7.00391Z","insights":"M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H18.5001C19.7427 20.75 20.7501 19.7426 20.7501 18.5V5.5C20.7501 4.25736 19.7427 3.25 18.5001 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H18.5001C18.9143 4.75 19.2501 5.08579 19.2501 5.5V18.5C19.2501 18.9142 18.9143 19.25 18.5001 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V5.5ZM6.25005 9.7143C6.25005 9.30008 6.58583 8.9643 7.00005 8.9643L17 8.96429C17.4143 8.96429 17.75 9.30008 17.75 9.71429C17.75 10.1285 17.4143 10.4643 17 10.4643L7.00005 10.4643C6.58583 10.4643 6.25005 10.1285 6.25005 9.7143ZM6.25005 14.2857C6.25005 13.8715 6.58583 13.5357 7.00005 13.5357H17C17.4143 13.5357 17.75 13.8715 17.75 14.2857C17.75 14.6999 17.4143 15.0357 17 15.0357H7.00005C6.58583 15.0357 6.25005 14.6999 6.25005 14.2857Z"};
  var DEFAULTS = {spaceKey:'mosaic', rootPageId:'3961414585', contextPath:'/confluence',
    pageIds:{home:'3961414585',about:'3981001532',team:'3981001536',resources:'3981001538',insights:'3981001542'}};
  var nativeToggle = '.acs-side-bar-toggle,.ia-toggle-button,.expand-collapse-trigger';
  var floating = 'aui-dropdown-menu,.aui-dropdown2,.aui-layer,[role="menu"],[role="listbox"],[role="dialog"]';
  var cfg, state = {active:false,pending:false,pageId:'',isHome:false}, epoch=0, observer, resizeObserver, queued=false;
  var host, topSlot, topButton, toggleTarget, overlay, overlayTimer, overlayTarget, overlayAttrs, focusedBefore;
  var overlayCycleFrame=0,overlayFrame=0,overlayCycleStarted=false,overlayCycleComplete=true,overlayReady=false,overlayFill;
  var complete=false, checkController, readyBeforeBoot=false, fontMedia, readerTools, readerExport, readerBack, readerSurface, readerSurfaceMarked, readerContent, readerWidget, pageAttributes, nativePresentation;
  var marks=new Map(), links=new Map(), compactLinks=new Set(), collapsedHosts=new WeakSet();
  var fluidMedia=new Map(),fluidContainers=new Map();
  var tooltip, tooltipLink, tooltipDescription, bodyMarker, originalSurface, revealed=false, surfaceDirty=true;
  function meta(name) {
    try { var value=w.AJS && w.AJS.Meta && w.AJS.Meta.get(name); if(value) return String(value); } catch (_) {}
    var el=d.querySelector('meta[name="ajs-'+name+'"]');return el ? el.content : '';
  }
  function pageId() {
    var url=new URL(w.location.href),id=meta('page-id')||url.searchParams.get('pageId')||(url.pathname.match(/^\/confluence\/spaces\/mosaic\/pages\/([1-9]\d*)(?:\/|$)/)||[])[1]||'';
    if(!id&&/^\/confluence\/spaces\/mosaic\/overview\/?$/.test(url.pathname)&&(!meta('space-key')||meta('space-key')==='mosaic'))id=DEFAULTS.rootPageId;
    return /^[1-9]\d*$/.test(id)?id:'';
  }
  function customEditor() {return /(?:^|[/?#])(?:new|create|edit|editor)(?:[/?#=]|$)/i.test(w.location.hash);}
  function forbidden() {
    var u=new URL(w.location.href),path=u.pathname;
    return w.top!==w.self || /\/(?:admin|plugins\/servlet\/admin|spaces\/permissions)(?:\/|$)/i.test(path) ||
      /(?:editpage|createpage|createblogpost|viewpreviousversions|diffpages|viewpagehistory|preview|spacepermissions)\.action$/i.test(path) ||
      /[?&](?:pageVersion|preview|mosaicNativeUi)=/.test(u.search) ||
      !!d.querySelector('#editpageform,#createpageform,#content-editor,body.contenteditor');
  }
  function normalize(config) {
    var c=Object.assign({},DEFAULTS,config||{});
    c.pageIds=Object.assign({},DEFAULTS.pageIds,(config||{}).pageIds||{},(config||{}).pages||{});
    c.rootPageId=String(c.rootPageId);c.pageIds.home=c.rootPageId;
    c.spaceKey=String(c.spaceKey||'');c.contextPath=String(c.contextPath||'/confluence').replace(/\/$/,'');
    if(!/^[1-9]\d*$/.test(c.rootPageId)||c.spaceKey!=='mosaic'||!/^\/(?:[\w-]+\/?)*$/.test(c.contextPath))return null;
    return c;
  }
  function known(id) { return Object.values(cfg.pageIds).some(function(v){return String(v)===id;}); }
  async function verify(id, space, generation) {
    if(space && space!==cfg.spaceKey) return false;
    if(known(id) && space===cfg.spaceKey) return true;
    // REST may already describe a newer revision than the rendered article.
    var renderedVersion=meta('page-version');if(!/^[1-9]\d*$/.test(renderedVersion))renderedVersion='';
    checkController=new AbortController();var controller=checkController;
    var timer=w.setTimeout(function(){controller.abort();},8000);
    try {
      var response=await w.fetch(cfg.contextPath+'/rest/api/content/'+id+'?expand=space,ancestors,metadata.labels,version,version.by,history,history.createdBy',{credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});
      if(!response.ok)return false;
      var p=await response.json();
      var ancestors=p.ancestors||[],valid=generation===epoch && String(p.id)===id && p.type==='page' && p.status==='current' && p.space?.key===cfg.spaceKey;
      if(valid){
        var sameRevision=!!renderedVersion&&renderedVersion===String(p.version?.number);
        var renderedTitle=meta('page-title')||w.MosaicNativePage?.title(w.MosaicNativePage.findContent())||'';
        state.pageTitle=sameRevision&&typeof p.title==='string'?p.title:renderedTitle|| (typeof p.title==='string'?p.title:'');
        state.exportMetadata={pageId:id,version:renderedVersion,createdAt:p.history?.createdDate||'',updatedAt:sameRevision?p.version?.when||'':'',updatedBy:sameRevision?p.version?.by?.displayName||'':'',author:p.history?.createdBy?.displayName||'',status:'Published (Confluence)'};
        state.parentId=String(ancestors[ancestors.length-1]?.id||'');
        state.collection=ancestors.some(function(a){return String(a.id)===String(cfg.pageIds.insights);})?'insights':ancestors.some(function(a){return String(a.id)===String(cfg.pageIds.resources);})?'resources':'';
        state.styleFlags=(p.metadata?.labels?.results||[]).map(function(label){return label.name;}).filter(function(name){return ['hide-actions','hide-comments','hide-footer','hide-title'].includes(name);});}return valid;
    } catch (_) { return false; } finally { w.clearTimeout(timer);if(checkController===controller)checkController=null; }
  }
  function restore(el,name,value) { if(value===null)el.removeAttribute(name);else el.setAttribute(name,value); }
  function mark(el,name) {
    if(!el||el.closest(floating))return;
    if(!marks.has(el))marks.set(el,{classes:new Set(),hadClass:el.hasAttribute('class')});
    if(!el.classList.contains(name)){el.classList.add(name);marks.get(el).classes.add(name);}
  }
  function svg(kind) {
    var el=d.createElementNS('http://www.w3.org/2000/svg','svg');el.setAttribute('viewBox','0 0 24 24');
    el.setAttribute('aria-hidden','true');el.setAttribute('focusable','false');el.classList.add('mosaic-native-icon');
    if(!kind){var dot=d.createElementNS(el.namespaceURI,'circle');dot.setAttribute('cx','12');dot.setAttribute('cy','12');dot.setAttribute('r','2.5');el.classList.add('mosaic-native-dot');el.append(dot);return el;}
    var p=d.createElementNS(el.namespaceURI,'path');p.setAttribute('d',ICONS[kind]);p.setAttribute('fill-rule','evenodd');p.setAttribute('clip-rule','evenodd');el.append(p);return el;
  }
  function linkId(a) {
    try {
      var u=new URL(a.getAttribute('href'),w.location.href);if(u.origin!==w.location.origin||u.hash)return '';
      var id=u.searchParams.get('pageId') || (u.pathname.match(/\/spaces\/[^/]+\/pages\/(\d+)/)||[])[1] || '';
      if(!id&&u.pathname.indexOf('/display/')>=0)id=(a.closest('.plugin_pagetree_children_span')?.id.match(/^childrenspan(\d+)-/)||[])[1]||'';
      return /^[1-9]\d*$/.test(id)?id:'';
    } catch (_) {return '';}
  }
  function controls() { return Array.from(host.querySelectorAll(nativeToggle)).filter(function(el){return !el.closest(floating+', [data-mosaic-owned]');}); }
  function enhanceToggle() {
    toggleTarget=controls().find(function(el){return el.matches('.expand-collapse-trigger');})||controls()[0];
    if(!toggleTarget){topSlot?.remove();topSlot=null;topButton=null;return;}
    if(!topSlot) {
      topSlot=d.createElement('div');topSlot.className='mosaic-native-toggle-slot';topSlot.setAttribute('data-mosaic-owned','');
      topButton=d.createElement('button');topButton.type='button';topButton.className='mosaic-native-top-toggle';
      topButton.innerHTML='<svg class="mosaic-native-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m14.25 5.25-6.75 6.75 6.75 6.75"/></svg><span class="mosaic-native-toggle-label"></span>';
      topButton.addEventListener('click',function(){if(toggleTarget?.isConnected&&!toggleTarget.disabled){toggleTarget.click();schedule();}});
      topSlot.append(topButton);
    }
    var rail=host.matches('.acs-side-bar')?host:host.querySelector('.acs-side-bar')||host;
    if(topSlot.parentElement!==rail||rail.firstElementChild!==topSlot)rail.prepend(topSlot);
    mark(toggleTarget,'mosaic-native-original-toggle');
  }
  function decorate() {
    enhanceToggle();
    host.querySelectorAll('a[href]').forEach(function(a){
      if(links.has(a)||a.closest(floating+', [data-mosaic-owned]')||a.matches(nativeToggle+', [role="button"], [aria-expanded], .plugin_pagetree_childtoggle'))return;
      var id=linkId(a),kind=Object.keys(cfg.pageIds).find(function(key){return String(cfg.pageIds[key])===id;});
      if(!id||(!kind&&!a.closest('.plugin_pagetree,.plugin_pagetree_children,.plugin_pagetree_children_content')))return;
      var label=d.createElement('span');label.className='mosaic-native-label';while(a.firstChild)label.append(a.firstChild);
      var icon=svg(kind);a.append(icon,label);var record={label:label,icon:icon,aria:a.getAttribute('aria-label')};links.set(a,record);mark(a,'mosaic-native-link');if(!kind)mark(a,'mosaic-native-child-link');
      if(record.aria===null)a.setAttribute('aria-label',label.textContent.trim());
      if(kind) {
        compactLinks.add(a);mark(a,'mosaic-native-compact-link');
        for(var p=a.parentElement;p&&p!==host;p=p.parentElement)mark(p,'mosaic-native-compact-path');
      }
      var row=a.closest('li');if(row){mark(row,'mosaic-native-item');}
      var content=a.closest('.plugin_pagetree_children_content');if(content){mark(content,'mosaic-native-content');var treeRow=content.parentElement;
        if(Array.from(treeRow.children).some(function(el){return el.classList.contains('plugin_pagetree_childtoggle_container');}))mark(treeRow,'mosaic-native-tree-row');
      }
    });
    host.querySelectorAll('.plugin_pagetree_childtoggle_container').forEach(function(el){if(!el.querySelector('a,button,[role="button"],[data-type="toggle"]'))mark(el,'mosaic-native-leaf-marker');});
    host.querySelectorAll('.acs-side-bar-content,.acs-side-bar-space-info,.acs-nav-wrapper,.ia-secondary-content,.acs-side-bar-footer,.acs-side-bar-bottom,.plugin_pagetree,.plugin_pagetree_children,.plugin_pagetree_children_container').forEach(function(el){mark(el,'mosaic-native-surface');});
    host.querySelectorAll('a,button,[role="button"]').forEach(function(el){
      if(el.closest(floating+', [data-mosaic-owned]')||el.matches(nativeToggle))return;
      var label=(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent).trim().replace(/\s+/g,' ');
      if(el.matches('[aria-controls="space-tools-menu"],[aria-owns="space-tools-menu"],#space-tools-menu-trigger')||/^(space tools|configure sidebar)$/i.test(label))mark(el,'mosaic-native-configure');
    });
    compactLinks.forEach(function(a){var row=a.closest('li'),selected=linkId(a)===state.pageId||!!row?.querySelector('.plugin_pagetree_current,a[aria-current="page"]')||row?.classList.contains('plugin_pagetree_current');a.classList.toggle('mosaic-native-selected',!!selected);});
  }
  function compact() {
    if(!host)return;
    var width=(host.querySelector('.acs-side-bar')||host).getBoundingClientRect().width;
    var value=host.matches('.ia-splitter-left-collapsed,.acs-side-bar-collapsed')||!!host.closest('.ia-splitter-left-collapsed')||(width>0&&width<=96);
    var next=String(value);if(host.getAttribute('data-mosaic-compact')!==next){host.setAttribute('data-mosaic-compact',next);hideTooltip();}
    if(topButton){var text=value?'Expand sidebar':'Collapse sidebar';if(topButton.getAttribute('aria-label')!==text){topButton.setAttribute('aria-label',text);topButton.title=text;topButton.querySelector('span').textContent=text;}topButton.setAttribute('aria-expanded',String(!value));}
  }
  function opaque(el) {if(!el)return '';var color=w.getComputedStyle(el).backgroundColor;return color&&color!=='transparent'&&!/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(color)?color:'';}
  function syncSurface() {
    if(!surfaceDirty)return;surfaceDirty=false;
    // Sample the real host before our skin, so a white native panel stays white
    // against a grey page. Temporarily disabling our class is synchronous and
    // does not change native geometry. Owned class mutations are ignored below.
    var decorated=host.classList.contains('mosaic-native-sidebar'),color='';
    if(decorated)host.classList.remove('mosaic-native-sidebar');
    try {
      color=opaque(host)||opaque(host.querySelector('.acs-side-bar'))||opaque(host.querySelector('.acs-side-bar-content'));
      if(!color){var el=d.querySelector('[data-mosaic-root],#mosaic,.mosaic-native-reader')||d.querySelector('#main-content .wiki-content')||d.querySelector('#main-content');for(;el&&!color;el=el.parentElement)color=opaque(el);}
    } finally {if(decorated)host.classList.add('mosaic-native-sidebar');}
    if(color&&host.style.getPropertyValue('--mosaic-sidebar-surface')!==color)host.style.setProperty('--mosaic-sidebar-surface',color);
  }
  function showTooltip(event) {
    var a=event.target.closest?.('.mosaic-native-compact-link');
    if(!host||host.getAttribute('data-mosaic-compact')!=='true'||!a||!host.contains(a))return;
    if(tooltipLink===a)return;hideTooltip();tooltipLink=a;tooltipDescription=a.getAttribute('aria-describedby');
    tooltip=d.createElement('div');tooltip.id='mosaic-native-tooltip';tooltip.className='mosaic-native-tooltip';tooltip.setAttribute('role','tooltip');tooltip.textContent=a.getAttribute('aria-label')||a.textContent.trim();d.body.append(tooltip);
    a.setAttribute('aria-describedby',[tooltipDescription,tooltip.id].filter(Boolean).join(' '));var rect=a.getBoundingClientRect();tooltip.style.left=Math.min(rect.right+10,Math.max(8,w.innerWidth-tooltip.offsetWidth-8))+'px';tooltip.style.top=Math.max(8,Math.min(rect.top,w.innerHeight-tooltip.offsetHeight-8))+'px';
  }
  function hideTooltip() {if(tooltipLink)restore(tooltipLink,'aria-describedby',tooltipDescription);tooltip?.remove();tooltip=null;tooltipLink=null;tooltipDescription=null;}
  function leaveTooltip(event){if(tooltipLink&&!tooltipLink.contains(event.relatedTarget))hideTooltip();}
  function onKey(event){if(event.key==='Escape')hideTooltip();}
  function cleanupSidebar() {
    hideTooltip();topSlot?.remove();topSlot=null;topButton=null;toggleTarget=null;resizeObserver?.disconnect();resizeObserver=null;
    if(host){host.removeEventListener('mouseover',showTooltip);host.removeEventListener('focusin',showTooltip);host.removeEventListener('mouseout',leaveTooltip);host.removeEventListener('focusout',leaveTooltip);host.removeAttribute('data-mosaic-compact');}
    links.forEach(function(r,a){r.icon.remove();if(r.label.parentNode===a)r.label.replaceWith(...Array.from(r.label.childNodes));restore(a,'aria-label',r.aria);a.classList.remove('mosaic-native-selected');});links.clear();compactLinks.clear();
    marks.forEach(function(r,el){r.classes.forEach(function(name){el.classList.remove(name);});if(!r.hadClass&&!el.className)el.removeAttribute('class');});marks.clear();
    if(host&&originalSurface){if(originalSurface.value)host.style.setProperty('--mosaic-sidebar-surface',originalSurface.value,originalSurface.priority);else host.style.removeProperty('--mosaic-sidebar-surface');if(!originalSurface.hadStyle&&!host.getAttribute('style'))host.removeAttribute('style');}
    host=null;originalSurface=null;if(revealed){d.body.classList.add('citi-hide-sidebar');revealed=false;}
  }
  function refresh() {
    if(!state.active)return;
    if(forbidden()||pageId()!==state.pageId||(meta('space-key')&&meta('space-key')!==cfg.spaceKey)){destroy();return;}
    syncNativePage();syncFluidContainers();mountReaderTools();
    if(customEditor())w.MosaicScroll?.destroy();
    else w.MosaicScroll?.mount({root:d.querySelector('[data-mosaic-root]')||nativePresentation?.surface||d.querySelector('#main-content')});
    var next=d.querySelector('.ia-fixed-sidebar,.acs-side-bar,#sidebar');if(!next){cleanupSidebar();return;}
    if(host!==next){cleanupSidebar();host=next;surfaceDirty=true;originalSurface={value:host.style.getPropertyValue('--mosaic-sidebar-surface'),priority:host.style.getPropertyPriority('--mosaic-sidebar-surface'),hadStyle:host.hasAttribute('style')};
      host.addEventListener('mouseover',showTooltip);host.addEventListener('focusin',showTooltip);host.addEventListener('mouseout',leaveTooltip);host.addEventListener('focusout',leaveTooltip);
      if(w.ResizeObserver){resizeObserver=new w.ResizeObserver(compact);resizeObserver.observe(host);}
    }
    mark(host,'mosaic-native-sidebar');if(d.body.classList.contains('citi-hide-sidebar')){d.body.classList.remove('citi-hide-sidebar');revealed=true;}
    decorate();compact();syncSurface();
    if(!collapsedHosts.has(host)&&toggleTarget&&!toggleTarget.disabled){collapsedHosts.add(host);if(host.getAttribute('data-mosaic-compact')!=='true'){toggleTarget.click();compact();}}
  }
  function schedule(){if(!queued){queued=true;Promise.resolve().then(function(){queued=false;refresh();});}}
  function returnToResults() {
    try {
      var saved=JSON.parse(w.sessionStorage.getItem('mosaic.return-results')||'null');
      if(!saved||String(saved.pageId)!==state.pageId||typeof saved.savedAt!=='number'||Date.now()-saved.savedAt>1800000||saved.savedAt>Date.now()+30000)return '';
      var url=new URL(saved.url,w.location.href);
      var destination=url.searchParams.get('pageId');
      if(url.origin!==w.location.origin||url.username||url.password||url.pathname!==cfg.contextPath+'/pages/viewpage.action'||![cfg.rootPageId,String(cfg.pageIds.resources),String(cfg.pageIds.insights)].includes(destination))return '';
      if(Array.from(url.searchParams.keys()).some(function(key){return key!=='pageId';}))return '';
      var hash=url.hash.slice(1),at=hash.indexOf('?'),route=at<0?hash:hash.slice(0,at),params=new URLSearchParams(at<0?'':hash.slice(at+1));
      if(destination===String(cfg.pageIds.insights)){
        if(url.searchParams.getAll('pageId').length!==1||!['/','/search'].includes(route))return '';
        var keys=Array.from(params.keys());
        if(keys.some(function(key){return !['q','topic','sort','pages'].includes(key)||params.getAll(key).length!==1;}))return '';
        if((params.get('q')||'').length>250)return '';
        if(params.has('topic')&&!/^[1-9]\d*$/.test(params.get('topic')))return '';
        if(params.has('sort')&&!['newest','oldest','title'].includes(params.get('sort')))return '';
        if(params.has('pages')&&!/^(?:[1-9]|[1-4]\d|50)$/.test(params.get('pages')))return '';
        return url.href;
      }
      if(destination===String(cfg.pageIds.resources)&&route==='/'){
        var resourceKeys=Array.from(params.keys());
        if(url.searchParams.getAll('pageId').length!==1||resourceKeys.some(function(key){return !['start','history'].includes(key)||params.getAll(key).length!==1;}))return '';
        function cursor(value){return /^(?:0|[1-9]\d{0,6})$/.test(value)&&Number(value)<=1000000;}
        var start=params.has('start')?params.get('start'):'0';if(!cursor(start))return '';
        if(Number(start)===0)return params.has('history')?'':url.href;
        if(!params.has('history'))return '';
        var previous=params.get('history').split(',');
        if(!previous.length||previous.length>100||previous[0]!=='0'||previous.some(function(value,index){return !cursor(value)||Number(value)>=Number(start)||index>0&&Number(value)<=Number(previous[index-1]);}))return '';
        return url.href;
      }
      if(Array.from(params.keys()).some(function(key){return !['q','start'].includes(key);}))return '';
      if(params.has('start')&&!/^\d{1,7}$/.test(params.get('start')))return '';
      if(route==='/search'&&params.get('q')?.trim())return url.href;
      if(route==='/'&&params.has('start'))return url.href;
    } catch (_) {}return '';
  }
  function removeReaderTools() {
    readerExport?.destroy();readerExport=null;readerTools?.remove();readerTools=null;readerBack?.remove();readerBack=null;
    if(readerSurface&&!readerSurfaceMarked)readerSurface.classList.remove('mosaic-article-surface');readerSurface=null;readerContent=null;readerWidget=null;readerSurfaceMarked=false;
  }
  function syncReaderEdit() {
    if(!readerTools)return;var nativeEdit=d.querySelector('#editPageLink'),edit=readerTools.querySelector('.mosaic-native-edit-link');
    if(!nativeEdit||!nativeEdit.hasAttribute('href')||nativeEdit.getAttribute('aria-disabled')==='true'){edit?.remove();return;}
    if(!edit){edit=d.createElement('a');edit.className='mosaic-native-edit-link';edit.setAttribute('aria-label','Edit page');edit.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" focusable="false"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/></svg><span class="mosaic-rail-label" aria-hidden="true">Edit page</span>';readerTools.prepend(edit);}
    edit.href=[String(cfg.pageIds.insights),String(cfg.pageIds.resources)].includes(state.parentId)?cfg.contextPath+'/pages/viewpage.action?pageId='+cfg.rootPageId+'#/edit/'+state.pageId:nativeEdit.href;
  }
  function syncFluidMedia(content) {
    var eligible=new Set();if(content)content.querySelectorAll('img,video').forEach(function(media){
      if(media.hasAttribute('width')||media.hasAttribute('height')||media.style.width||media.style.height||media.style.maxWidth||media.style.minWidth||media.closest('a,button,table,pre,code,[contenteditable=true]'))return;
      var parent=media.parentElement,standalone=parent===content||parent?.matches('p,figure')&&Array.from(parent.childNodes).every(function(node){return node===media||node.nodeType===3&&!node.textContent.trim()||node.nodeType===8;});
      if(standalone)eligible.add(media);
    });
    fluidMedia.forEach(function(original,media){if(!eligible.has(media)){restore(media,'data-mosaic-fluid-media',original);fluidMedia.delete(media);}});
    eligible.forEach(function(media){if(!fluidMedia.has(media))fluidMedia.set(media,media.getAttribute('data-mosaic-fluid-media'));media.setAttribute('data-mosaic-fluid-media','true');});
  }
  function syncFluidContainers() {
    var eligible=new Set(),root=d.querySelector('[data-mosaic-root]');
    var content=root?(String(cfg.pageIds[root.getAttribute('data-mosaic-role')])===state.pageId?root:null):nativeContent();
    for(var parent=content?.parentElement;parent&&parent!==d.body;parent=parent.parentElement){
      if(parent.matches('nav,aside,[role=dialog],[role=menu]'))break;
      if(Array.from(parent.classList).some(function(name){return /^max-w-screen(?:-[\w-]+)?$/.test(name);}))eligible.add(parent);
    }
    fluidContainers.forEach(function(original,element){if(!eligible.has(element)){restore(element,'data-mosaic-fluid-container',original);fluidContainers.delete(element);}});
    eligible.forEach(function(element){if(!fluidContainers.has(element))fluidContainers.set(element,element.getAttribute('data-mosaic-fluid-container'));if(element.getAttribute('data-mosaic-fluid-container')!=='true')element.setAttribute('data-mosaic-fluid-container','true');});
  }
  function nativeContent(){return w.MosaicNativePage?w.MosaicNativePage.findContent():d.querySelector('#main-content .wiki-content,#main-content.wiki-content');}
  function nativeTitle(content){return state.pageTitle||meta('page-title')||w.MosaicNativePage?.title(content)||d.querySelector('#title-text')?.textContent.trim()||d.title;}
  function mountReaderTools() {
    // The shared navBar owns this widget; portal its controls to body so a sticky,
    // transformed or clipped navbar cannot change the viewport edge positioning.
    // Recognise the prior Add page slot as well when only attachments are updated.
    var widget=d.querySelector('[data-mosaic-page-actions],[data-mosaic-add-page]'),root=d.querySelector('[data-mosaic-root]');
    var validRoot=root&&String(cfg.pageIds[root.getAttribute('data-mosaic-role')])===state.pageId;
    var content=validRoot?root:nativeContent();
    if(customEditor()||state.isHome||!widget||!w.MosaicExport||root&&!validRoot){removeReaderTools();return;}
    var surface=validRoot?root:nativePresentation?.surface||content?.closest('#content,.native-page')||content?.closest('#main-content')||content;
    if(readerTools&&(!readerTools.isConnected||!readerContent?.isConnected||readerContent!==content||readerWidget!==widget||readerSurface!==surface))removeReaderTools();
    if(readerTools){syncReaderEdit();return;}
    if(!content)return;readerWidget=widget;readerContent=content;readerSurface=surface;readerSurfaceMarked=readerSurface.classList.contains('mosaic-article-surface');readerSurface.classList.add('mosaic-article-surface');
    readerTools=d.createElement('div');readerTools.className='mosaic-native-reader-tools mosaic-native-page-tools mosaic-article-rail';readerTools.setAttribute('data-mosaic-owned','');readerTools.setAttribute('data-mosaic-navbar-widget','page-actions');readerTools.setAttribute('role','group');readerTools.setAttribute('aria-label','Page actions');
    d.body.append(readerTools);readerExport=w.MosaicExport.mount(readerTools,{layout:'rail',config:cfg,getContent:function(){return Object.assign({},state.exportMetadata||{},{element:readerContent,title:validRoot?readerContent.querySelector('h1')?.textContent.trim()||d.title:nativeTitle(readerContent),author:state.exportMetadata?.author||meta('creator-display-name'),url:cfg.contextPath+'/pages/viewpage.action?pageId='+state.pageId});}});
    var resultsUrl=!validRoot&&returnToResults();if(resultsUrl){readerBack=d.createElement('a');readerBack.className='mosaic-native-results-link';readerBack.setAttribute('data-mosaic-owned','');readerBack.href=resultsUrl;readerBack.textContent='Back to search results';content.before(readerBack);}
    syncReaderEdit();
  }
  function syncNativePage(){
    var content=nativeContent(),active=!customEditor()&&!known(state.pageId)&&!d.querySelector('[data-mosaic-root]')&&content;
    syncFluidMedia(active?content:null);
    if(!active){w.MosaicNativePage?.destroy();nativePresentation=null;if(pageAttributes){Object.keys(pageAttributes).forEach(function(name){restore(d.body,name,pageAttributes[name]);});pageAttributes=null;}return;}
    if(!pageAttributes){pageAttributes={};['data-mosaic-native-page','data-mosaic-style-flags'].forEach(function(name){pageAttributes[name]=d.body.getAttribute(name);});}
    d.body.setAttribute('data-mosaic-native-page','true');
    var marker=Array.from(content.querySelectorAll('[id],[name],[data-mosaic-document-page]')).some(function(el){if(el.closest('pre,code,textarea,[contenteditable=true],.mce-content-body,#editor,#content-editor,#macro-browser,.macro-preview'))return false;return el.hasAttribute('data-mosaic-document-page')||el.matches('a,span')&&(/(?:^|-)mosaic-page-style-v1$/.test(el.id)||el.getAttribute('name')==='mosaic-page-style-v1');});
    var flags=marker?['hide-actions','hide-comments','hide-footer','hide-title']:state.styleFlags||[];
    if(flags.length)d.body.setAttribute('data-mosaic-style-flags',flags.join(' '));else d.body.removeAttribute('data-mosaic-style-flags');
    nativePresentation=w.MosaicNativePage?.sync({content:content,title:nativeTitle(content),hideTitle:flags.includes('hide-title'),article:Object.assign({},state.exportMetadata||{},{collection:state.collection||'',config:cfg})})||null;
  }
  function overlayKeys(event){if(overlay&&event.key==='Tab'){event.preventDefault();overlay.focus({preventScroll:true});}if(overlay&&event.key==='Escape'){complete=true;readyBeforeBoot=true;hideOverlay();}}
  function settleOverlay(){if(!overlay||!overlayReady||!overlayCycleComplete||overlayFrame||d.hidden)return;if(!w.requestAnimationFrame)hideOverlay();else overlayFrame=w.requestAnimationFrame(function(){overlayFrame=w.requestAnimationFrame(hideOverlay);});}
  function endOverlayCycle(){if(!overlay)return;overlayCycleComplete=true;if(overlayCycleFrame)w.cancelAnimationFrame(overlayCycleFrame);overlayCycleFrame=0;overlay.setAttribute('data-cycle-complete','');overlay.removeAttribute('data-cycle-running');settleOverlay();}
  function startOverlayCycle(){if(!overlay||overlayCycleComplete||d.hidden||overlayCycleFrame)return;function run(){overlayCycleFrame=0;if(!overlay||overlayCycleComplete||d.hidden)return;overlayCycleStarted=true;overlay.removeAttribute('data-cycle-restart');overlay.setAttribute('data-cycle-running','');}if(w.requestAnimationFrame)overlayCycleFrame=w.requestAnimationFrame(function(){overlayCycleFrame=w.requestAnimationFrame(run);});else run();}
  function overlayAnimationEnded(event){if(event.target!==overlayFill||event.animationName!=='mosaic-loading-fill'||!overlayCycleStarted)return;if(d.hidden){overlayCycleStarted=false;overlay.setAttribute('data-cycle-restart','');return;}endOverlayCycle();}
  function overlayVisibilityChanged(){if(!overlay)return;if(d.hidden){overlay.removeAttribute('data-cycle-running');if(overlayCycleFrame)w.cancelAnimationFrame(overlayCycleFrame);overlayCycleFrame=0;if(overlayFrame)w.cancelAnimationFrame(overlayFrame);overlayFrame=0;}else{startOverlayCycle();settleOverlay();}}
  function showOverlay() {
    // The shared startup owns the whole loading lifecycle, including dismissal
    // and timeout. A late host download must not open a second overlay.
    if(complete||forbidden()||overlay||w.MosaicStartup||!d.querySelector('[data-mosaic-add-page],[data-mosaic-page-actions]'))return;
    overlayTarget=d.querySelector('[data-mosaic-root],#mosaic')||d.querySelector('#main-content')||d.body;
    overlayAttrs={busy:overlayTarget.getAttribute('aria-busy'),inert:overlayTarget.getAttribute('inert')};overlayTarget.setAttribute('aria-busy','true');if(overlayTarget!==d.body)overlayTarget.setAttribute('inert','');focusedBefore=d.activeElement;
    overlay=d.createElement('div');overlay.className='mosaic-loading-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Loading Mosaic');overlay.tabIndex=-1;
    var panel=d.createElement('div'),logo=d.createElement('img'),tagline=d.createElement('p'),track=d.createElement('span'),fill=d.createElement('span');
    panel.className='mosaic-loading-panel';logo.className='mosaic-loading-logo';logo.alt='Mosaic';logo.width=360;logo.height=75;logo.src=cfg.contextPath+'/download/attachments/'+(cfg.attachmentPageId||'3981001251')+'/mosaic-logo.svg';
    tagline.className='mosaic-loading-message';tagline.textContent='Connecting our capabilities.';track.className='mosaic-loading-track';track.setAttribute('aria-hidden','true');fill.className='mosaic-loading-fill';track.append(fill);panel.append(logo,tagline,track);overlay.append(panel);
    d.body.append(overlay);overlay.focus({preventScroll:true});d.addEventListener('keydown',overlayKeys,true);overlayFill=fill;overlayFill.addEventListener('animationend',overlayAnimationEnded);d.addEventListener('visibilitychange',overlayVisibilityChanged);overlayReady=false;overlayCycleStarted=false;overlayCycleComplete=false;startOverlayCycle();overlayTimer=w.setTimeout(function(){error('Mosaic is taking longer to load. You can refresh the page to try again.');},Math.max(100,Math.min(Number(cfg.loadingTimeoutMs)||15000,60000)));
  }
  function hideOverlay(){w.clearTimeout(overlayTimer);if(overlayCycleFrame)w.cancelAnimationFrame(overlayCycleFrame);if(overlayFrame)w.cancelAnimationFrame(overlayFrame);overlayFill?.removeEventListener('animationend',overlayAnimationEnded);d.removeEventListener('visibilitychange',overlayVisibilityChanged);overlayTimer=null;overlayCycleFrame=0;overlayFrame=0;overlayFill=null;overlayReady=false;var restoreFocus=overlay&&d.activeElement===overlay;overlay?.remove();overlay=null;d.removeEventListener('keydown',overlayKeys,true);if(overlayTarget&&overlayAttrs){restore(overlayTarget,'aria-busy',overlayAttrs.busy);if(overlayTarget!==d.body)restore(overlayTarget,'inert',overlayAttrs.inert);}if(restoreFocus&&focusedBefore?.isConnected)focusedBefore.focus({preventScroll:true});overlayTarget=null;overlayAttrs=null;focusedBefore=null;}
  function ready(){complete=true;readyBeforeBoot=true;if(state.active)refresh();if(forbidden())hideOverlay();else{overlayReady=true;settleOverlay();}w.MosaicStartup?.finish();schedule();}
  function error(message){complete=true;readyBeforeBoot=true;hideOverlay();w.MosaicStartup?.cancel();var pending=d.querySelector('[data-mosaic-root] [data-mosaic-loading]');if(pending){var notice=d.createElement('p');notice.setAttribute('role','alert');notice.textContent=String(message||'Mosaic could not finish loading.');pending.replaceWith(notice);}if(state.active){var event=new w.CustomEvent('mosaic:host-error',{detail:{message:String(message||'Mosaic could not finish loading.')}});d.dispatchEvent(event);} }
  function activate(generation) {
    if(generation!==epoch||forbidden())return;
    state.active=true;state.pending=false;bodyMarker=d.body.getAttribute('data-mosaic-host');d.body.setAttribute('data-mosaic-host','active');
    showOverlay();refresh();
    if(!state.active||generation!==epoch)return;
    observer=new w.MutationObserver(function(changes){
      var relevant=changes.some(function(c){
        if(c.target.parentElement?.closest('[data-mosaic-owned]')||c.target.nodeType===1&&c.target.closest?.('[data-mosaic-owned]'))return false;
        if(c.type==='characterData')return !!c.target.parentElement?.closest('#main-content,[data-mosaic-native-content],#title-heading,#title-text,[data-testid="page-title"],[data-testid="title-text"]');
        if(c.type==='childList')return Array.from(c.addedNodes).concat(Array.from(c.removedNodes)).some(function(n){return n.nodeType===1&&!n.matches?.('[data-mosaic-owned],.mosaic-native-icon,.mosaic-native-label,.mosaic-native-tooltip,.mosaic-loading-overlay')||n.nodeType===3&&!!c.target.closest?.('#main-content,[data-mosaic-native-content],#title-heading,#title-text,[data-testid="page-title"],[data-testid="title-text"]');});
        if(c.type==='attributes'){
          if(c.attributeName==='class'){
            var screenCap=function(name){return /^max-w-screen(?:-[\w-]+)?$/.test(name);};
            var previousCaps=(c.oldValue||'').split(/\s+/).filter(screenCap).sort().join(' '),currentCaps=Array.from(c.target.classList||[]).filter(screenCap).sort().join(' ');
            if(previousCaps!==currentCaps)return true;
          }
          if(c.target.id==='editPageLink'&&['href','aria-disabled'].includes(c.attributeName))return true;
          if(c.target.matches?.('img,video')&&c.target.closest('#main-content,[data-mosaic-native-content]')&&['width','height','style'].includes(c.attributeName))return true;
          if(c.attributeName==='class'&&c.target===host){var old=(c.oldValue||'').replace(/\bmosaic-native-sidebar\b/g,'').replace(/\s+/g,' ').trim(),next=(c.target.getAttribute('class')||'').replace(/\bmosaic-native-sidebar\b/g,'').replace(/\s+/g,' ').trim();if(old===next)return false;}
          return c.target!==topButton && !c.target.closest?.('[data-mosaic-owned]') &&
          ['style','class','content','data-color-mode','data-theme'].includes(c.attributeName) &&
          (c.target===d.body||c.target===d.documentElement||c.target===host||c.target.matches?.('meta[name="ajs-space-key"],meta[name="ajs-page-id"],meta[name="ajs-page-title"],.acs-side-bar,.ia-splitter-left,.plugin_pagetree_current'));}
        return false;
      });if(relevant){surfaceDirty=true;schedule();}
    });observer.observe(d.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true,attributeFilter:['class','style','content','data-color-mode','data-theme','width','height','href','aria-disabled']});
    w.addEventListener('hashchange',onNavigate);w.addEventListener('popstate',onNavigate);w.addEventListener('resize',compact);w.addEventListener('scroll',hideTooltip,true);w.addEventListener('pagehide',onPageHide);w.addEventListener('pageshow',onPageShow);d.addEventListener('keydown',onKey);d.addEventListener('load',onStylesheet,true);
    if(w.matchMedia){fontMedia=w.matchMedia('(prefers-color-scheme: dark)');fontMedia.addEventListener?.('change',refreshSurface);}
  }
  function refreshSurface(){surfaceDirty=true;schedule();}
  function onPageHide(event){if(overlay){complete=true;readyBeforeBoot=true;hideOverlay();}if(!event.persisted)destroy();else hideTooltip();}
  function onPageShow(event){if(event.persisted){surfaceDirty=true;schedule();}}
  function onStylesheet(event){if(event.target.matches?.('link[rel="stylesheet"]'))refreshSurface();}
  function onNavigate(){if(forbidden())destroy();else{if(overlay){complete=true;readyBeforeBoot=true;hideOverlay();}schedule();}}
  function boot(config) {
    var next=normalize(config);if(!next)return state;
    var id=pageId();if(cfg&&state.pageId===id&&(state.active||state.pending)){if(forbidden())destroy();else schedule();return state;}
    destroy();cfg=next;complete=readyBeforeBoot;state={active:false,pending:false,pageId:id,isHome:id===cfg.rootPageId,verified:Promise.resolve(false)};
    if(!id||forbidden())return state;var generation=epoch;state.pending=true;
    var space=meta('space-key'),path=w.location.pathname;
    if(!space&&id===cfg.rootPageId&&(path===cfg.contextPath+'/spaces/'+cfg.spaceKey+'/overview'||path===cfg.contextPath+'/spaces/'+cfg.spaceKey+'/overview/'))space=cfg.spaceKey;
    state.verified=verify(id,space,generation).then(function(ok){if(generation!==epoch)return false;state.pending=false;if(ok)activate(generation);return ok;});return state;
  }
  function destroy(){epoch++;observer?.disconnect();observer=null;checkController?.abort();checkController=null;hideOverlay();w.MosaicScroll?.destroy();removeReaderTools();w.MosaicNativePage?.destroy();nativePresentation=null;syncFluidMedia(null);fluidContainers.forEach(function(original,element){restore(element,'data-mosaic-fluid-container',original);});fluidContainers.clear();cleanupSidebar();if(d.body&&bodyMarker!==undefined)restore(d.body,'data-mosaic-host',bodyMarker);bodyMarker=undefined;state.active=false;state.pending=false;
    if(pageAttributes){Object.keys(pageAttributes).forEach(function(name){restore(d.body,name,pageAttributes[name]);});pageAttributes=null;}
    w.removeEventListener('hashchange',onNavigate);w.removeEventListener('popstate',onNavigate);w.removeEventListener('resize',compact);w.removeEventListener('scroll',hideTooltip,true);w.removeEventListener('pagehide',onPageHide);w.removeEventListener('pageshow',onPageShow);d.removeEventListener('keydown',onKey);d.removeEventListener('load',onStylesheet,true);fontMedia?.removeEventListener?.('change',refreshSurface);fontMedia=null;
  }
  w.MosaicHost={boot:boot,ready:ready,error:error,destroy:destroy};
})(window,document);

;
/* Mosaic initial-page readiness. Wait for useful content, not global network idle.
 * Every listener has one owner and is disposed on completion or navigation. */
(function(w,d){
  'use strict';
  if(w.MosaicPageReady)return;
  function scope(parent){
    var controller=new AbortController(),signal=controller.signal,cleanup=[],address=new URL(w.location.href);
    function abort(){controller.abort();}
    function hashIdentity(hash){return !hash||/^#\/?\??$/.test(hash)?'#/':hash;}
    function changed(){if(w.location.pathname!==address.pathname||w.location.search!==address.search||hashIdentity(w.location.hash)!==hashIdentity(address.hash))abort();}
    if(parent){if(parent.aborted)abort();else{parent.addEventListener('abort',abort,{once:true});cleanup.push(function(){parent.removeEventListener('abort',abort);});}}
    w.addEventListener('pagehide',abort,{once:true});cleanup.push(function(){w.removeEventListener('pagehide',abort);});
    ['hashchange','popstate'].forEach(function(name){w.addEventListener(name,changed);cleanup.push(function(){w.removeEventListener(name,changed);});});
    return {signal:signal,close:function(){abort();cleanup.forEach(function(fn){fn();});}};
  }
  function bounded(task,ms,signal){
    return new Promise(function(resolve){
      var done=false,timer;
      function finish(value){if(done)return;done=true;w.clearTimeout(timer);signal.removeEventListener('abort',cancel);resolve(value);}
      function cancel(){finish({status:'cancelled'});}
      if(signal.aborted){cancel();return;}
      signal.addEventListener('abort',cancel,{once:true});timer=w.setTimeout(function(){finish({status:'timeout'});},ms);
      Promise.resolve(task).then(function(value){finish({status:'ready',value:value});},function(error){finish({status:'error',error:error});});
    });
  }
  function nativeSurface(signal){
    return new Promise(function(resolve){
      var observer,done=false;
      function finish(value){if(done)return;done=true;observer?.disconnect();signal.removeEventListener('abort',cancel);resolve(value);}
      function cancel(){finish(null);}
      function check(){var surface=d.querySelector('[data-mosaic-native-surface]');if(surface)finish(surface);}
      if(signal.aborted){cancel();return;}
      signal.addEventListener('abort',cancel,{once:true});observer=new MutationObserver(check);observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-mosaic-native-surface']});check();
    });
  }
  function initialContent(options){
    // A denied host or cancelled component must release startup immediately,
    // even if the other independent request does not settle or honour abort.
    return new Promise(function(resolve,reject){
      var values=[],remaining=2;
      [options.initial,options.host?.verified].forEach(function(task,index){
        Promise.resolve(task).then(function(value){
          values[index]=value;
          if(index===1&&value===false||index===0&&value?.status==='cancelled'||!--remaining)resolve(values);
        },reject);
      });
    });
  }
  function visible(element){
    // Visibility is intentionally hidden by startup. Geometry remains available.
    var box=element.getBoundingClientRect();
    return box.width>0&&box.height>0&&box.bottom>0&&box.right>0&&box.top<w.innerHeight&&box.left<w.innerWidth;
  }
  function mediaReady(element,signal){
    var managed=element.tagName==='IMG'&&w.MosaicMedia?.ready(element);
    if(managed)return managed;
    return new Promise(function(resolve){
      var events=element.tagName==='VIDEO'?['loadeddata','error','abort']:['load','error'],done=false;
      function finish(){if(done)return;done=true;events.forEach(function(name){element.removeEventListener(name,finish);});signal.removeEventListener('abort',finish);resolve();}
      if(signal.aborted){finish();return;}
      signal.addEventListener('abort',finish,{once:true});events.forEach(function(name){element.addEventListener(name,finish);});
      if(element.tagName==='VIDEO'?(element.readyState>=2||element.error):(element.complete||!element.getAttribute('src')))finish();
    });
  }
  function paint(signal){
    return new Promise(function(resolve){
      var frame=0;
      function finish(){if(frame)w.cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);resolve();}
      if(signal.aborted||!w.requestAnimationFrame){finish();return;}
      signal.addEventListener('abort',finish,{once:true});frame=w.requestAnimationFrame(function(){frame=w.requestAnimationFrame(finish);});
    });
  }
  async function run(options){
    options=options||{};var life=scope(options.signal),signal=life.signal;
    try{
      var initial=await bounded(initialContent(options),12000,signal);
      if(signal.aborted)return {status:'cancelled'};
      if(initial.status==='error'){w.MosaicHost?.error(initial.error?.message);return initial;}
      if(initial.status==='ready'&&(initial.value[1]===false||initial.value[0]?.status==='cancelled')){w.MosaicStartup?.cancel();return {status:'cancelled'};}
      if(initial.status==='timeout'){w.MosaicHost?.error('Mosaic is taking longer to load. You can refresh the page to try again.');return initial;}
      var target=options.target;
      if(options.native){
        var native=await bounded(nativeSurface(signal),4000,signal);
        if(native.status==='timeout'){w.MosaicHost?.error('The Mosaic page content is not available yet. You can refresh the page to try again.');return native;}
        target=native.value;
      }
      if(signal.aborted)return {status:'cancelled'};
      // Visible media only: lazy offscreen covers and directory portraits do not
      // hold the whole page hostage. Their reserved frames handle later loading.
      var media=target?Array.from(target.querySelectorAll('img,video')).filter(function(element){return !element.matches('img.mt-photo')&&visible(element);}):[];
      await bounded(Promise.all(media.map(function(element){return mediaReady(element,signal);}).concat(d.fonts?.ready||[])),4000,signal);
      await bounded(paint(signal),250,signal);
      if(signal.aborted)return {status:'cancelled'};
      w.MosaicHost?.ready();return {status:'ready'};
    }finally{life.close();}
  }
  w.MosaicPageReady=Object.freeze({run:run});
})(window,document);

;
/* Browser-side, structured exports from the visible article DOM. The parser reads
 * text and a small element allow-list; it never executes or reparses article HTML. */
(function (w,d) {
  'use strict';
  if(w.MosaicExport)return;
  var MAX_IMAGE_BYTES=10000000,serial=0;
  var ignored='script,style,noscript,template,button,input,select,textarea,form,nav,[hidden],[aria-hidden="true"],[role~="status"],[data-mosaic-export],.mosaic-export-toolbar';
  function fail(message){throw new Error(message);}
  function clean(value){return String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');}
  function safeLink(value){if(typeof value!=='string'||!value.trim())return null;try{var u=new URL(value,w.location.href);return /^(https?:|mailto:)$/.test(u.protocol)&&!u.username&&!u.password?u.href:null;}catch(_){return null;}}
  function skip(el){return el.nodeType===1&&(el.matches(ignored)||el.style.display==='none'||el.style.visibility==='hidden');}
  function read(input) {
    var source=input&&input.element?input:{element:input},element=source.element;
    if(!element||element.nodeType!==1)fail('Choose an article before exporting.');
    var warnings=new Set(),titleHeadingSkipped=false,title=clean(source.title||element.querySelector('h1')?.textContent||d.querySelector('#title-text')?.textContent||d.title||'Mosaic article').trim();
    var model={title:title,author:clean(source.author),createdAt:clean(source.createdAt),updatedAt:clean(source.updatedAt),updatedBy:clean(source.updatedBy),url:safeLink(source.url||w.location.href),blocks:[],warnings:[],images:[]};
    var sourceId=source.pageId||new URL(model.url||w.location.href).searchParams.get('pageId');
    Object.assign(model,{reference:clean(source.reference)||(/^[1-9]\d*$/.test(String(sourceId))?'MOSAIC-'+sourceId:'Mosaic page'),version:clean(source.version),revision:clean(source.revision),type:clean(source.type)||'Page',business:clean(source.business)||'Mosaic',status:clean(source.status),owner:clean(source.owner),effectiveAt:clean(source.effectiveAt),nextReviewAt:clean(source.nextReviewAt),exportedAt:source.exportedAt||new Date().toISOString()});
    ['review','approval'].forEach(function(key){var person=source[key]||{};model[key]={name:clean(person.name),soeid:clean(person.soeid),date:clean(person.date)};});
    function inline(node,style){
      if(node.nodeType===3)return [{text:clean(node.nodeValue).replace(/\s+/g,' '),...style}];
      if(node.nodeType!==1||skip(node))return [];
      var tag=node.tagName.toLowerCase(),next=Object.assign({},style);
      if(tag==='br')return [{text:'\n',...next}];
      if(tag==='img')return [{image:addImage(node)}];
      if(['strong','b'].includes(tag))next.bold=true;
      if(['em','i'].includes(tag))next.italic=true;
      if(tag==='u')next.underline=true;
      if(['s','del','strike'].includes(tag))next.strike=true;
      if(tag==='code')next.code=true;
      if(tag==='a')next.link=safeLink(node.getAttribute('href'));
      if(['iframe','object','embed','canvas','svg','video','audio'].includes(tag)){warnings.add('Interactive media is available in the online article and is not reproduced in this export.');var href=safeLink(node.getAttribute('src')||node.querySelector('source')?.getAttribute('src'));return href?[{text:'Open media',link:href}]:[];}
      return Array.from(node.childNodes).flatMap(function(n){return inline(n,next);});
    }
    function addImage(img){
      var src=img.currentSrc||img.getAttribute('src')||'';if(!src)fail('An article image has no source.');
      var image={src:src,alt:clean(img.getAttribute('alt')||'Article image'),index:model.images.length};model.images.push(image);return image;
    }
    function paragraphs(runs,type,level){
      var result=[],text=[];function flush(){if(text.some(function(r){return r.text?.trim();})){result.push({type:type||'paragraph',level:level||0,runs:text});}text=[];}
      runs.forEach(function(r){if(r.image){flush();result.push({type:'image',image:r.image});}else text.push(r);});flush();return result;
    }
    function blocks(parent){
      var out=[],loose=[];function flush(){out.push(...paragraphs(loose));loose=[];}
      Array.from(parent.childNodes).forEach(function(node){
        if(node.nodeType===3){loose.push(...inline(node,{}));return;}
        if(node.nodeType!==1||skip(node))return;
        var tag=node.tagName.toLowerCase();
        if(['a','span','strong','b','em','i','u','s','del','code','br','img'].includes(tag)){loose.push(...inline(node,{}));return;}
        flush();
        if(/^h[1-6]$/.test(tag)){if(tag==='h1'&&!titleHeadingSkipped&&node.textContent.trim()===title){titleHeadingSkipped=true;return;}out.push(...paragraphs(inline(node,{}),'heading',Number(tag[1])));}
        else if(tag==='p'||tag==='figcaption')out.push(...paragraphs(inline(node,{})));
        else if(tag==='pre')out.push({type:'code',text:clean(node.textContent)});
        else if(tag==='blockquote')out.push({type:'quote',blocks:blocks(node)});
        else if(tag==='ul'||tag==='ol'){
          var items=Array.from(node.children).filter(function(n){return n.tagName==='LI';}).map(blocks);if(items.length)out.push({type:'list',ordered:tag==='ol',start:Math.max(1,parseInt(node.getAttribute('start'),10)||1),items:items});
        } else if(tag==='table') {
          var nativeRows=Array.from(node.rows),grid=[],rows=nativeRows.map(function(row,index){var current=grid[index]||(grid[index]=[]),column=0;
            Array.from(row.cells).forEach(function(cell){while(current[column])column++;var columns=Math.max(1,cell.colSpan),span=Math.min(nativeRows.length-index,cell.rowSpan===0?nativeRows.length-index:Math.max(1,cell.rowSpan));if(columns>10)fail('This table is too wide for a readable portrait export. Use Confluence’s native export.');var content=blocks(cell);content.colSpan=columns;content.rowSpan=span;content.header=cell.tagName==='TH';
              for(var y=0;y<span;y++)for(var x=0;x<columns;x++){var target=grid[index+y]||(grid[index+y]=[]);if(target[column+x])fail('This table has overlapping merged cells. Use Confluence’s native export.');if(!x&&!y)target[column+x]=content;else{var covered=[];covered.covered=true;target[column+x]=covered;}}column+=columns;});
            return {header:Array.from(row.cells).length>0&&Array.from(row.cells).every(function(cell){return cell.tagName==='TH';}),cells:current};});
          var width=Math.max(0,...rows.map(function(r){return r.cells.length;}));if(width>10)fail('This table is too wide for a readable portrait export. Use Confluence’s native export.');
          if(width){rows.forEach(function(r){for(var index=0;index<width;index++)if(!r.cells[index])r.cells[index]=[];});out.push({type:'table',rows:rows,columns:width});}
        } else if(tag==='hr')out.push({type:'rule'});
        else if(['iframe','object','embed','canvas','svg','video','audio'].includes(tag)){warnings.add('Interactive media is available in the online article and is not reproduced in this export.');var href=safeLink(node.getAttribute('src')||node.querySelector('source')?.getAttribute('src'));if(href)out.push({type:'paragraph',runs:[{text:'Open media',link:href}]});}
        else out.push(...blocks(node));
      });flush();return out;
    }
    model.blocks=blocks(element);model.warnings=Array.from(warnings);
    if(!model.blocks.length)fail('The article has no readable content to export.');return model;
  }
  function bytes(dataUrl){var raw=w.atob(dataUrl.split(',')[1]),result=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)result[i]=raw.charCodeAt(i);return result;}
  async function prepareImages(model,options) {
    var signal=options&&options.signal;function alive(){if(signal&&signal.aborted)fail('The export was cancelled.');}alive();
    for(var image of model.images){
      alive();
      var src=image.src,blob,objectUrl;
      if(/^data:image\/(png|jpeg|gif|webp);base64,/i.test(src)){
        var data=bytes(src);if(data.byteLength>MAX_IMAGE_BYTES)fail('An article image exceeds the 10 MB export limit.');blob=new w.Blob([data],{type:src.slice(5,src.indexOf(';'))});
      } else {
        var url;try{url=new URL(src,w.location.href);}catch(_){fail('An article image has an invalid address.');}
        if(url.origin!==w.location.origin||!/^https?:$/.test(url.protocol))fail('Export supports images attached to this Confluence site. An external image must be attached first.');
        var controller=new w.AbortController(),timer=w.setTimeout(function(){controller.abort();},10000),abort=function(){controller.abort();};if(signal)signal.addEventListener('abort',abort,{once:true});
        try {var response=await w.fetch(url.href,{credentials:'same-origin',signal:controller.signal});if(!response.ok)fail('An article image could not be downloaded ('+response.status+').');if(response.url&&new URL(response.url).origin!==w.location.origin)fail('An article image redirected outside Confluence.');blob=await response.blob();}
        catch(error){alive();if(error.name==='AbortError')fail('An article image took too long to load. Try exporting again.');throw error;}finally{w.clearTimeout(timer);if(signal)signal.removeEventListener('abort',abort);}
        if(!/^image\/(png|jpeg|gif|webp)$/i.test(blob.type))fail('An image uses an unsupported format. Attach a PNG, JPEG, GIF or WebP image before exporting.');
        if(blob.size>MAX_IMAGE_BYTES)fail('An article image exceeds the 10 MB export limit.');
      }
      try {
        alive();
        objectUrl=w.URL.createObjectURL(blob);var decoded=await new Promise(function(resolve,reject){var img=new w.Image(),timer=w.setTimeout(function(){img.onload=null;img.onerror=null;reject(new Error('An article image could not be decoded in time.'));},10000);img.onload=function(){w.clearTimeout(timer);resolve(img);};img.onerror=function(){w.clearTimeout(timer);reject(new Error('An article image could not be decoded.'));};img.src=objectUrl;});
        alive();if(!decoded.naturalWidth||!decoded.naturalHeight)fail('An article image has invalid dimensions.');
        var scale=Math.min(1,1800/Math.max(decoded.naturalWidth,decoded.naturalHeight)),canvas=d.createElement('canvas');
        canvas.width=Math.max(1,Math.round(decoded.naturalWidth*scale));canvas.height=Math.max(1,Math.round(decoded.naturalHeight*scale));
        var painter=canvas.getContext('2d');if(!painter)fail('This browser cannot prepare images for export.');painter.drawImage(decoded,0,0,canvas.width,canvas.height);image.dataUrl=canvas.toDataURL('image/png');image.width=canvas.width;image.height=canvas.height;
      } finally {if(objectUrl)w.URL.revokeObjectURL(objectUrl);}
    }return model;
  }
  function display(value){return clean(value).trim()||'Not recorded';}
  // These fields describe the native page. Never infer an author or date from
  // the downloader, today's date, or a different revision of the page.
  function documentDate(value){
    var source=clean(value).trim(),match=/^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2}))?$/.exec(source);
    if(!match||Number(match[2])<1||Number(match[2])>12||Number(match[3])<1||Number(match[3])>new Date(Date.UTC(Number(match[1]),Number(match[2]),0)).getUTCDate())return 'Not available';
    var date=new Date(source);if(!Number.isFinite(date.getTime()))return 'Not available';
    return date.getUTCDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getUTCMonth()]+' '+date.getUTCFullYear();
  }
  function documentRows(model){return [['Title',clean(model.title).trim()||'Not available'],['Author',clean(model.author).trim()||'Not available'],['Written date',documentDate(model.createdAt)],['Edited date',documentDate(model.updatedAt)],['Last edited by',clean(model.updatedBy).trim()||'Not available']];}
  function referenceLine(model){return display(model.reference)+(model.version?' | v'+model.version:'')+(model.revision?' r'+model.revision:'');}
  function requireLogo(model){if(!model.logo||!/^data:image\/png;base64,/.test(model.logo.dataUrl||'')||!model.logo.width||!model.logo.height)fail('The Citi logo is required for document export. Please retry after its attachment is available.');return model.logo;}
  async function prepareLogo(model,options){
    options=options||{};var config=options.config||{},base=config.assetBase||((config.contextPath||'/confluence')+'/download/attachments/'+(config.attachmentPageId||'3981001251')+'/');
    var logo={src:base.replace(/\/?$/,'/')+'citi-logo.png',alt:'Citi'};
    try{await prepareImages({images:[logo]},options);model.logo=logo;return model;}
    catch(error){if(options.signal&&options.signal.aborted)throw error;throw new Error('The Citi logo could not be loaded. Check the citi-logo.png attachment and retry. '+error.message);}
  }
  function tableLayout(){return {hLineWidth:function(){return .5;},vLineWidth:function(){return .5;},hLineColor:function(){return '#D9D9D9';},vLineColor:function(){return '#D9D9D9';},paddingLeft:function(){return 8;},paddingRight:function(){return 8;},paddingTop:function(){return 7;},paddingBottom:function(){return 7;}};}
  function leadingHeaders(rows){var count=0;for(var row of rows){if(!row.header)break;count++;}return count;}
  function compactRow(row,columns){return row.cells.every(function(cell){return !cell.some(function(block){return block.type==='image'||block.type==='table';})&&JSON.stringify(cell).length<Math.max(240,1800/columns);});}
  function pdfDefinition(model) {
    // Match WCSpedia's print template independently of the browser theme.
    var logo=requireLogo(model),pageWidth=499.28,continuationSizes=Object.create(null),continuationId=0;
    function continuation(node,height){node.id='mosaic-print-body-'+(++continuationId);continuationSizes[node.id]=height;return node;}
    function runs(items){return items.map(function(r){return {text:r.text||'',bold:r.bold||undefined,italics:r.italic||undefined,decoration:[r.underline?'underline':'',r.strike?'lineThrough':''].filter(Boolean),link:r.link||undefined,color:r.link?'#056DAE':undefined,background:r.code?'#F0F3F6':undefined};});}
    function blocks(items,width,inCell){return items.flatMap(function(b){
      if(b.type==='heading')return [{text:runs(b.runs),style:'h'+Math.min(3,b.level),headlineLevel:b.level,margin:[0,14,0,7]}];
      if(b.type==='paragraph')return [{text:runs(b.runs),margin:[0,0,0,inCell?0:8]}];
      if(b.type==='code')return [{text:b.text,fontSize:9,background:'#F0F3F6',margin:[8,4,8,12],preserveLeadingSpaces:true}];
      if(b.type==='quote')return [{stack:blocks(b.blocks,Math.max(20,width-14),inCell),italics:true,margin:[14,4,0,8]}];
      if(b.type==='image'){if(!b.image.dataUrl)fail('An article image has not finished loading.');var fitWidth=Math.min(width,480),imageHeight=Math.min(fitWidth/b.image.width,350/b.image.height)*b.image.height;var result=[continuation({image:b.image.dataUrl,fit:[fitWidth,350],margin:[0,6,0,8]},imageHeight+14)];if(b.image.alt)result.push({text:b.image.alt,style:'caption'});return result;}
      if(b.type==='list'){var list=b.items.map(function(item){return {stack:blocks(item,Math.max(20,width-18),inCell)};});return [Object.assign({margin:[0,0,0,8]},b.ordered?{ol:list,start:b.start}:{ul:list})];}
      if(b.type==='table')return [{table:{headerRows:leadingHeaders(b.rows),dontBreakRows:b.rows.every(function(row){return compactRow(row,b.columns);}),widths:Array(b.columns).fill('*'),body:b.rows.map(function(row,index){return row.cells.map(function(cell){return cell.covered?{}:{stack:blocks(cell,Math.max(10,width/b.columns*(cell.colSpan||1)-17),true),colSpan:cell.colSpan||1,rowSpan:cell.rowSpan||1,fillColor:cell.header?'#EFF5F9':index%2?'#FFFFFF':'#F8FAFC',bold:!!cell.header,color:'#222222'};});})},layout:tableLayout(),fontSize:b.columns>5?8:9.5,margin:[0,7,0,14]}];
      return [{canvas:[{type:'line',x1:0,y1:0,x2:width,y2:0,lineWidth:.5,lineColor:'#D9D9D9'}],margin:[0,10,0,10]}];
    }).map(function(node){if(node.id)return node;var fontSize=node.fontSize||({h1:18,h2:14,h3:12,caption:8.5}[node.style])||10.5;
      if(node.table){var headerRows=node.table.headerRows||0,firstRows=Math.min(node.table.body.length,Math.max(1,headerRows+1));return continuation(node,firstRows*(fontSize*1.5+14.5));}
      if(node.text)return continuation(node,fontSize*1.5);return node;
    });}
    var content=[
      {image:logo.dataUrl,fit:[96,56],alignment:'center',margin:[0,0,0,12]},
      {table:{headerRows:0,dontBreakRows:true,widths:[106,'*'],body:documentRows(model).map(function(row,index){return [{text:row[0],bold:true,fillColor:'#EFF5F9'},{text:row[1],bold:index===0,fontSize:index===0?14:9.5}];})},layout:tableLayout(),fontSize:9.5,margin:[0,0,0,12]}
    ];
    content.push({text:'Downloaded from the Mosaic Confluence page',fontSize:9,color:'#4D6072',margin:[0,0,0,3]});
    if(model.url)content.push({text:model.url,link:model.url,color:'#056DAE',decoration:'underline',fontSize:9,margin:[0,0,0,18]});
    else content.push({text:'Source URL not available',fontSize:9,color:'#4D6072',margin:[0,0,0,18]});
    model.warnings.forEach(function(message){content.push({text:message,fontSize:9,color:'#4D6072',margin:[0,0,0,10]});});
    content.push(...blocks(model.blocks,pageWidth,false));
    return {info:{title:model.title,author:model.author||'Mosaic',subject:referenceLine(model),creator:'Mosaic'},pageSize:'A4',pageMargins:[48,42,48,52],defaultStyle:{font:'Roboto',fontSize:10.5,lineHeight:1.2,color:'#222222'},styles:{title:{fontSize:21,bold:true,color:'#000000'},h1:{fontSize:18,bold:true,color:'#000000'},h2:{fontSize:14,bold:true,color:'#000000'},h3:{fontSize:12,bold:true,color:'#000000'},caption:{fontSize:8.5,italics:true,color:'#4D6072',margin:[0,0,0,12]}},content:content,
      footer:function(){return {text:'Internal',alignment:'center',fontSize:8,color:'#52667B',margin:[48,15,48,0]};},
      pageBreakBefore:function(node,following,next){
        if(!node.headlineLevel)return false;
        // pdfmake includes footer nodes and stale positions from moved table
        // headers. Count only our body content and require room to show it.
        var position=node.startPosition,candidate=following.find(function(item){return continuationSizes[item.id]&&item.startPosition&&(!position||item.startPosition.top>=position.top);});
        if(!candidate)return (next||[]).some(function(item){return continuationSizes[item.id];});
        var start=candidate.startPosition,remaining=start.pageInnerHeight*(1-start.verticalRatio);
        return remaining+0.5<continuationSizes[candidate.id];
      }};
  }
  function wordDocument(model,lib) {
    var x=lib||w.docx;if(!x?.Document||!x?.Packer)fail('The Word export library is unavailable.');var logo=requireLogo(model),numbering=[],sequence=0,pageWidth=9980;
    function inline(items,settings){return items.flatMap(function(r){var parts=String(r.text||'').split('\n').map(function(text,index){return new x.TextRun(Object.assign({},settings||{},{text:text,break:index?1:undefined,bold:r.bold||(settings&&settings.bold)||undefined,italics:r.italic||(settings&&settings.italics)||undefined,underline:r.underline||r.link?{type:x.UnderlineType.SINGLE}:undefined,strike:r.strike||undefined,font:r.code?'Courier New':'Arial',color:r.link?'056DAE':settings&&settings.color}));});return r.link?[new x.ExternalHyperlink({link:r.link,children:parts})]:parts;});}
    function paragraph(children,extra){return new x.Paragraph(Object.assign({children:children,spacing:{after:140,line:280}},extra||{}));}
    function plain(text,extra,settings){return paragraph(inline([{text:clean(text)}],settings),extra);}
    function imageRun(image,width,height){if(!image.dataUrl)fail('An article image has not finished loading.');var scale=Math.min(1,width/image.width,height/image.height);return new x.ImageRun({type:'png',data:bytes(image.dataUrl),transformation:{width:Math.max(1,Math.round(image.width*scale)),height:Math.max(1,Math.round(image.height*scale))},altText:{title:image.alt||'Citi',description:image.alt||'Document image',name:image.alt||'Document image'}});}
    var border={style:x.BorderStyle.SINGLE,size:4,color:'D9D9D9'};
    function cell(children,width,settings){return new x.TableCell(Object.assign({children:children,width:{size:width,type:x.WidthType.DXA},verticalAlign:x.VerticalAlign.CENTER,borders:{top:border,bottom:border,left:border,right:border},margins:{top:110,bottom:110,left:120,right:120}},settings||{}));}
    function blocks(items,depth,width,settings){settings=settings||{};return items.flatMap(function(b,index){
      if(b.type==='heading')return [paragraph(inline(b.runs,settings),{heading:x.HeadingLevel['HEADING_'+Math.min(3,b.level)],keepNext:true,spacing:{before:220,after:100}})];
      if(b.type==='paragraph'){
        var next=items[index+1],shortExample=next&&next.type==='code'&&next.text.length<=600&&next.text.split('\n').length<=6;
        return [paragraph(inline(b.runs,settings),Object.assign({},settings.cell?{spacing:{after:0,line:240}}:{},{keepNext:!!shortExample}))];
      }
      if(b.type==='code')return [paragraph(inline([{text:b.text,code:true}],{size:18}),{keepLines:b.text.length<=600&&b.text.split('\n').length<=6,shading:{fill:'F0F3F6'},spacing:{after:180},indent:{left:120}})];
      if(b.type==='quote')return blocks(b.blocks,depth,width,Object.assign({},settings,{italics:true}));
      if(b.type==='image'){var result=[paragraph([imageRun(b.image,Math.min(610,width/15),420)],{keepNext:!!b.image.alt})];if(b.image.alt)result.push(plain(b.image.alt,{spacing:{after:180}},{size:17,italics:true,color:'4D6072'}));return result;}
      if(b.type==='list') {
        var reference='mosaic-list-'+(++sequence),level=Math.min(depth||0,8);numbering.push({reference:reference,levels:[{level:level,format:b.ordered?x.LevelFormat.DECIMAL:x.LevelFormat.BULLET,text:b.ordered?'%'+(level+1)+'.':'•',start:b.start,alignment:x.AlignmentType.LEFT,style:{paragraph:{indent:{left:360*(level+1),hanging:240}}}}]});
        return b.items.flatMap(function(item){var result=[],first=item[0];
          if(first&&['paragraph','heading'].includes(first.type)){result.push(paragraph(inline(first.runs,settings),{numbering:{reference:reference,level:level},spacing:{after:100,line:280}}));item=item.slice(1);}else result.push(paragraph([new x.TextRun('')],{numbering:{reference:reference,level:level}}));
          return result.concat(blocks(item,(depth||0)+1,Math.max(300,width-360),settings));
        });
      }
      if(b.type==='table'){
        var widths=Array(b.columns).fill(Math.floor(width/b.columns));widths[widths.length-1]+=width-widths.reduce(function(a,b){return a+b;},0);
        return [new x.Table({width:{size:width,type:x.WidthType.DXA},columnWidths:widths,layout:x.TableLayoutType.FIXED,rows:b.rows.map(function(row,index){return new x.TableRow({tableHeader:index<leadingHeaders(b.rows),cantSplit:compactRow(row,b.columns),children:row.cells.flatMap(function(value,col){if(value.covered)return [];var cellWidth=widths.slice(col,col+(value.colSpan||1)).reduce(function(a,b){return a+b;},0),children=blocks(value,depth,Math.max(150,cellWidth-240),{cell:true,bold:!!value.header,size:b.columns>5?16:19});if(!children.length)children=[paragraph([])];return [cell(children,cellWidth,{columnSpan:value.colSpan||1,rowSpan:value.rowSpan||1,shading:{fill:value.header?'EFF5F9':index%2?'FFFFFF':'F8FAFC'}})];})});})}),plain('',{spacing:{after:120}})];
      }
      return [paragraph([],{border:{bottom:border},spacing:{after:160}})];
    });}
    var content=[paragraph([imageRun(logo,128,75)],{alignment:x.AlignmentType.CENTER,spacing:{before:0,after:240}}),new x.Table({width:{size:pageWidth,type:x.WidthType.DXA},columnWidths:[2300,pageWidth-2300],layout:x.TableLayoutType.FIXED,rows:documentRows(model).map(function(row,index){return new x.TableRow({cantSplit:true,children:[cell([plain(row[0],{spacing:{after:0,line:240}},{bold:true,size:19})],2300,{shading:{fill:'EFF5F9'}}),cell([plain(row[1],{spacing:{after:0,line:index===0?360:240}},{bold:index===0,size:index===0?28:19})],pageWidth-2300)]});})})];
    content.push(plain('Downloaded from the Mosaic Confluence page',{spacing:{before:200,after:60}},{size:18,color:'4D6072'}));
    if(model.url)content.push(paragraph(inline([{text:model.url,link:model.url}],{size:18}),{spacing:{after:300}}));
    else content.push(plain('Source URL not available',{spacing:{after:300}},{size:18,color:'4D6072'}));
    model.warnings.forEach(function(message){content.push(plain(message,undefined,{color:'4D6072',size:18}));});content.push(...blocks(model.blocks,0,pageWidth));
    function footerRun(text){return new x.TextRun({text:text,font:'Arial',size:16,color:'52667B'});}
    return new x.Document({creator:model.author||'Mosaic',title:model.title,subject:referenceLine(model),description:'Internal',styles:{default:{document:{run:{font:'Arial',size:21,color:'222222'},paragraph:{spacing:{after:140,line:280}}},title:{run:{font:'Arial',size:42,bold:true,color:'000000'}},heading1:{run:{font:'Arial',size:36,bold:true,color:'000000'}},heading2:{run:{font:'Arial',size:28,bold:true,color:'000000'}},heading3:{run:{font:'Arial',size:24,bold:true,color:'000000'}}},paragraphStyles:[{id:'MosaicFooter',name:'Mosaic Footer',basedOn:'Normal',run:{font:'Arial',size:16,color:'52667B'}}]},numbering:{config:numbering},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:840,right:963,bottom:1040,left:963,footer:480}}},footers:{default:new x.Footer({children:[paragraph([footerRun('Internal')],{alignment:x.AlignmentType.CENTER,style:'MosaicFooter'})]})},children:content}]});
  }
  function timed(promise,message,signal){var timer,cancel;return Promise.race([promise,new Promise(function(_,reject){cancel=function(){reject(new w.DOMException('Export cancelled.','AbortError'));};if(signal?.aborted){cancel();return;}timer=w.setTimeout(function(){reject(new Error(message));},45000);signal?.addEventListener('abort',cancel,{once:true});})]).finally(function(){w.clearTimeout(timer);signal?.removeEventListener('abort',cancel);});}
  function filename(title,ext){return (title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,100)||'Mosaic article')+'.'+ext;}
  function download(blob,name,onRelease){if(!blob||typeof blob.size!=='number'||blob.size<=0)fail('The export did not produce a file.');var url=w.URL.createObjectURL(blob),a=d.createElement('a'),timer,released=false;function release(){if(released)return;released=true;w.clearTimeout(timer);w.URL.revokeObjectURL(url);if(onRelease)onRelease(release);}a.href=url;a.download=name;a.hidden=true;d.body.append(a);try{a.click();}catch(error){release();throw error;}finally{a.remove();}timer=w.setTimeout(release,10000);return release;}
  function markdown(model,options) {
    options=options||{};
    function text(value){return clean(value).replace(/&/g,'&amp;').replace(/[\\`*_{}[\]<>#|~]/g,function(c){return '\\'+c;});}
    function destination(value){var href=safeLink(value);return href?href.replace(/[()<>\\]/g,function(c){return encodeURIComponent(c).replace(/\(/g,'%28').replace(/\)/g,'%29');}):null;}
    function htmlText(value){return clean(value).replace(/[&<>"{}]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','{':'&#123;','}':'&#125;'})[c];});}
    function htmlRuns(items){return items.map(function(r){var value=htmlText(r.text||'').replace(/\n/g,'<br />');if(r.code)value='<code>'+value+'</code>';if(r.bold)value='<strong>'+value+'</strong>';if(r.italic)value='<em>'+value+'</em>';if(r.strike)value='<s>'+value+'</s>';if(r.underline)value='<u>'+value+'</u>';var href=destination(r.link);return href?'<a href="'+htmlText(href)+'">'+value+'</a>':value;}).join('');}
    function htmlBlocks(items){return items.map(function(b){
      if(b.type==='paragraph')return '<p>'+htmlRuns(b.runs)+'</p>';
      if(b.type==='heading'){var tag='h'+Math.min(6,Math.max(1,b.level));return '<'+tag+'>'+htmlRuns(b.runs)+'</'+tag+'>';}
      if(b.type==='code')return '<pre><code>'+htmlText(b.text)+'</code></pre>';
      if(b.type==='quote')return '<blockquote>'+htmlBlocks(b.blocks)+'</blockquote>';
      if(b.type==='list'){var tag=b.ordered?'ol':'ul';return '<'+tag+(b.ordered?' start="'+b.start+'"':'')+'>'+b.items.map(function(item){return '<li>'+htmlBlocks(item)+'</li>';}).join('')+'</'+tag+'>';}
      if(b.type==='image'){var src=destination(b.image.src);return src?'<img src="'+htmlText(src)+'" alt="'+htmlText(b.image.alt)+'" />':'<p>Image: '+htmlText(b.image.alt)+'</p>';}
      if(b.type==='table')return '<table><tbody>'+b.rows.map(function(row){return '<tr>'+row.cells.filter(function(cell){return !cell.covered;}).map(function(cell){var tag=cell.header?'th':'td';return '<'+tag+(cell.colSpan>1?' colSpan="'+cell.colSpan+'"':'')+(cell.rowSpan>1?' rowSpan="'+cell.rowSpan+'"':'')+'>'+htmlBlocks(cell)+'</'+tag+'>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
      return '<hr />';
    }).join('');}
    function runs(items){return items.map(function(r){
      var raw=r.text||'',value=text(raw);
      if(r.code){var ticks='`'.repeat(Math.max(1,...(raw.match(/`+/g)||[]).map(function(x){return x.length+1;})));value=ticks+(/^[ `]|[ `]$/.test(raw)?' ':'')+raw+(/^[ `]|[ `]$/.test(raw)?' ':'')+ticks;}
      else {var edge=/^(\s*)([\s\S]*?)(\s*)$/.exec(value),core=edge[2];if(r.bold)core='**'+core+'**';if(r.italic)core='*'+core+'*';if(r.strike)core='~~'+core+'~~';if(r.underline)core='<u>'+core+'</u>';value=edge[1]+core+edge[3];}
      var href=destination(r.link);if(href)value='['+value+']('+href+')';return value;
    }).join('').replace(/\n/g,'  \n');}
    function blocks(items){return items.map(function(b){
      if(b.type==='paragraph'){var value=runs(b.runs).replace(/^(\s*)([-+])(?=\s)/,'$1\\$2').replace(/^(\s*\d+)([.)])(?=\s)/,'$1\\$2');return options.mdx?value.replace(/^(import|export)(?=\s)/gm,function(word){return '&#'+word.charCodeAt(0)+';'+word.slice(1);}):value;}
      if(b.type==='heading')return '#'.repeat(Math.min(6,Math.max(1,b.level)))+' '+runs(b.runs);
      if(b.type==='code'){var fence='`'.repeat(Math.max(3,...(b.text.match(/`+/g)||[]).map(function(x){return x.length+1;})));return fence+'\n'+b.text.replace(/\n?$/,'\n')+fence;}
      if(b.type==='quote')return blocks(b.blocks).split('\n').map(function(line){return '> '+line;}).join('\n');
      if(b.type==='list')return b.items.map(function(item,index){var marker=b.ordered?(b.start+index)+'. ':'- ';return blocks(item).split('\n').map(function(line,n){return (n?' '.repeat(marker.length):marker)+line;}).join('\n');}).join('\n');
      if(b.type==='image'){var href=destination(b.image.src);return href?'!['+text(b.image.alt)+']('+href+')':'Image: '+text(b.image.alt);}
      if(b.type==='table'){if(options.mdx||b.rows.some(function(row){return row.cells.some(function(cell){return cell.colSpan>1||cell.rowSpan>1;});}))return htmlBlocks([b]);var rows=b.rows.map(function(row){return row.cells.map(function(cell){return blocks(cell).replace(/\n+/g,'<br />');});});if(!b.rows[0].header)rows.unshift(Array(b.columns).fill(''));var line=function(row){return '| '+row.join(' | ')+' |';};return [line(rows[0]),line(Array(b.columns).fill('---'))].concat(rows.slice(1).map(line)).join('\n');}
      return '---';
    }).join('\n\n');}
    var header='# '+text(model.title)+'\n\n',meta=[model.author,model.updatedAt].filter(Boolean);if(meta.length)header+=text(meta.join(' · '))+'\n\n';if(model.url)header+='[View the online article]('+destination(model.url)+')\n\n';
    return header+blocks(model.blocks)+'\n'+(model.warnings.length?'\n'+model.warnings.map(function(message){return '> '+text(message);}).join('\n')+'\n':'');
  }
  function mdx(model){var metadata={title:model.title};if(model.author)metadata.author=model.author;if(model.updatedAt)metadata.updatedAt=model.updatedAt;if(model.url)metadata.sourceUrl=model.url;return 'export const metadata = '+JSON.stringify(metadata,null,2).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+';\n\n'+markdown(model,{mdx:true});}
  async function copy(value) {
    if(w.navigator.clipboard&&typeof w.navigator.clipboard.writeText==='function'){await w.navigator.clipboard.writeText(value);return;}
    var focused=d.activeElement,selection=w.getSelection(),ranges=[];if(selection)for(var i=0;i<selection.rangeCount;i++)ranges.push(selection.getRangeAt(i).cloneRange());
    var area=d.createElement('textarea');area.className='mosaic-export-copy-buffer';area.value=value;area.readOnly=true;area.setAttribute('aria-label','Copy article text');d.body.append(area);
    try{area.select();if(typeof d.execCommand!=='function'||!d.execCommand('copy'))fail('Clipboard access is unavailable. Use Download MDX to save the article.');}
    finally{area.remove();if(selection){selection.removeAllRanges();ranges.forEach(function(range){selection.addRange(range);});}if(focused&&focused.isConnected&&typeof focused.focus==='function')focused.focus({preventScroll:true});}
  }
  function icon(path){var svg=d.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','18');svg.setAttribute('height','18');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');var p=d.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',path);svg.append(p);return svg;}
  function mount(container,options) {
    if(!container||container.nodeType!==1)fail('An export toolbar needs a container.');options=options||{};if(typeof options.getContent!=='function')fail('An export toolbar needs article content.');
    var existing=container.querySelector('[data-mosaic-export]');if(existing?.mosaicExport)return existing.mosaicExport;
    var rail=options.layout==='rail',railHost=container.closest('.mosaic-article-rail')||container,toolbar=d.createElement('div');toolbar.className='mosaic-export-toolbar';toolbar.setAttribute('data-mosaic-export','');toolbar.setAttribute('aria-label',rail?'Page actions':'Article actions');if(rail)toolbar.setAttribute('data-export-layout','rail');
    function button(label,path,pending,success){var node=d.createElement('button'),icons=d.createElement('span'),labels=d.createElement('span');node.type='button';node.setAttribute('aria-label',label);node.dataset.exportState='idle';node.dataset.exportLabel=label;icons.className='mosaic-export-feedback-icon';labels.className='mosaic-export-feedback-label';icons.setAttribute('aria-hidden','true');labels.setAttribute('aria-hidden','true');
      [['idle',label,path],['pending',pending,'M21 12a9 9 0 1 1-9-9'],['success',success,'m5 12 4 4L19 6']].forEach(function(state){var svg=icon(state[2]),text=d.createElement('span');svg.dataset.feedback=state[0];text.dataset.feedback=state[0];text.textContent=state[1];if(state[0]==='success')svg.firstElementChild.setAttribute('pathLength','1');icons.append(svg);labels.append(text);});node.append(icons,labels);toolbar.append(node);return node;}
    var linkButton=button('Copy link','M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2','Copying…','Copied');
    var downloadButton=button('Download','M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5','Preparing…','Download started');downloadButton.setAttribute('aria-haspopup','menu');downloadButton.setAttribute('aria-expanded','false');
    var markdownButton=button('Copy Markdown','M9 3h11v14H9zM5 7H3v14h13v-2','Copying…','Copied');
    var printButton=rail?button('Print','M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v7H6zM17 12h1','Opening…','Print'):null;if(rail)toolbar.append(linkButton,markdownButton,printButton,downloadButton);
    var status=d.createElement('span');status.className='mosaic-export-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');toolbar.append(status);container.append(toolbar);
    var busy=false,destroyed=false,panel=null,job=null,feedbackTimer=null,buttons=[linkButton,downloadButton,markdownButton].concat(printButton?[printButton]:[]),listeners=[],downloads=new Set();
    function feedback(node,state){if(!node)return;node.dataset.exportState=state;var label=node.dataset.exportLabel;if(state!=='idle')label+=' — '+node.querySelector('.mosaic-export-feedback-label [data-feedback="'+state+'"]').textContent;node.setAttribute('aria-label',label);}
    function resetFeedback(){w.clearTimeout(feedbackTimer);feedbackTimer=null;buttons.forEach(function(node){feedback(node,'idle');});}
    function complete(node){if(destroyed)return;feedback(node,'success');feedbackTimer=w.setTimeout(function(){feedbackTimer=null;if(!destroyed)feedback(node,'idle');},2200);}
    function listen(node,type,handler,options){node.addEventListener(type,handler,options);listeners.push(function(){node.removeEventListener(type,handler,options);});}
    function close(restore){if(!panel)return;panel.remove();panel=null;downloadButton.setAttribute('aria-expanded','false');downloadButton.removeAttribute('aria-controls');d.removeEventListener('pointerdown',outside,true);d.removeEventListener('focusin',outside,true);w.removeEventListener('resize',position);w.removeEventListener('scroll',position,true);w.visualViewport?.removeEventListener?.('resize',position);w.visualViewport?.removeEventListener?.('scroll',position);if(restore&&!destroyed&&downloadButton.isConnected)downloadButton.focus({preventScroll:true});}
    function outside(event){if(panel&&!panel.contains(event.target)&&!downloadButton.contains(event.target))close(false);}
    function position(){if(!panel)return;if(!downloadButton.isConnected){close(false);return;}var bounds=downloadButton.getBoundingClientRect(),width=w.visualViewport?.width||w.innerWidth,height=w.visualViewport?.height||w.innerHeight,offsetX=w.visualViewport?.offsetLeft||0,offsetY=w.visualViewport?.offsetTop||0,dock=rail&&(w.innerWidth<=760||w.innerHeight<=480),anchor=rail?railHost.getBoundingClientRect():bounds;panel.style.maxHeight=Math.max(80,dock?Math.min(anchor.top-offsetY-24,height-24):height-24)+'px';panel.style.maxWidth=Math.max(0,width-24)+'px';var box=panel.getBoundingClientRect(),left=rail?(dock?anchor.left+(anchor.width-box.width)/2:anchor.left-box.width-12):bounds.left,top=rail?(dock?anchor.top-box.height-12:bounds.top+(bounds.height-box.height)/2):(bounds.bottom+8+box.height>offsetY+height-12?bounds.top-box.height-8:bounds.bottom+8);panel.style.left=Math.max(offsetX+12,Math.min(left,offsetX+width-box.width-12))+'px';panel.style.top=Math.max(offsetY+12,Math.min(top,offsetY+height-box.height-12))+'px';}
    function focusItem(node){node.focus({preventScroll:true});if(!panel)return;var top=node.offsetTop,bottom=top+node.offsetHeight;if(top<panel.scrollTop)panel.scrollTop=top;else if(bottom>panel.scrollTop+panel.clientHeight)panel.scrollTop=bottom-panel.clientHeight;}
    function open(last){if(busy||destroyed)return;if(panel){close(true);return;}panel=d.createElement('div');panel.className='mosaic-export-menu';panel.id='mosaic-export-menu-'+(++serial);panel.setAttribute('role','menu');panel.setAttribute('aria-label','Download article');
      [['md','Markdown','Plain .md article'],['mdx','MDX source','Article text and metadata'],['word','Word document','Editable .docx file'],['pdf','PDF document','Ready to read and share']].forEach(function(item){var node=d.createElement('button');node.type='button';node.setAttribute('role','menuitem');node.tabIndex=-1;node.dataset.exportFormat=item[0];node.append(icon('M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h6'));var label=d.createElement('span'),strong=d.createElement('strong'),small=d.createElement('small');strong.textContent=item[1];small.textContent=item[2];label.append(strong,small);node.append(label);node.addEventListener('click',function(){close(true);perform(item[0]);});panel.append(node);});
      panel.addEventListener('keydown',function(event){var all=Array.from(panel.querySelectorAll('[role=menuitem]')),at=all.indexOf(d.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();var index=event.key==='Home'?0:event.key==='End'?all.length-1:(at+(event.key==='ArrowDown'?1:-1)+all.length)%all.length;focusItem(all[index]);}else if(event.key==='Escape'){event.preventDefault();close(true);}else if(event.key==='Tab'){close(false);downloadButton.focus({preventScroll:true});}});
      d.body.append(panel);downloadButton.setAttribute('aria-controls',panel.id);downloadButton.setAttribute('aria-expanded','true');position();d.addEventListener('pointerdown',outside,true);d.addEventListener('focusin',outside,true);w.addEventListener('resize',position);w.addEventListener('scroll',position,true);w.visualViewport?.addEventListener?.('resize',position);w.visualViewport?.addEventListener?.('scroll',position);var all=panel.querySelectorAll('[role=menuitem]');focusItem(all[last?all.length-1:0]);
    }
    async function perform(format) {
      if(busy||destroyed)return null;close(false);resetFeedback();busy=true;job=new w.AbortController();var active=format==='link'?linkButton:format==='markdown'?markdownButton:format==='print'?printButton:downloadButton;feedback(active,'pending');buttons.forEach(function(b){b.setAttribute('aria-disabled','true');});toolbar.setAttribute('aria-busy','true');status.removeAttribute('data-error');status.removeAttribute('data-warning');status.textContent=format==='link'?'Copying link…':format==='markdown'?'Copying Markdown…':format==='print'?'Opening print dialog…':'Preparing '+({pdf:'PDF',word:'Word',mdx:'MDX',md:'Markdown'}[format])+'…';
      try {
        if(format==='print'){if(typeof w.print!=='function')fail('Printing is unavailable in this browser.');w.print();if(destroyed)return null;feedback(active,'idle');status.textContent='Print dialog requested.';return true;}
        var input=await options.getContent();if(destroyed)return null;
        if(format==='link'){var url=safeLink(input&&input.url||w.location.href);if(!url)fail('This page has no valid link to copy.');var canonical=new URL(url);canonical.hash='';url=canonical.href;await copy(url);if(!destroyed){status.textContent='Link copied.';complete(active);}return url;}
        var model=read(input);
        if(format==='markdown'){var value=markdown(model);await copy(value);if(!destroyed){status.textContent='Markdown copied.';complete(active);}return value;}
        var blob;
        if(format==='mdx'||format==='md')blob=new w.Blob([format==='mdx'?mdx(model):markdown(model)],{type:'text/markdown;charset=utf-8'});
        else {
          if(!w.MosaicLibraries?.load)fail('The local export library loader is unavailable.');
          var library=await w.MosaicLibraries.load(format==='pdf'?'pdf':'word');if(destroyed)return null;await prepareImages(model,{signal:job.signal});if(destroyed)return null;await prepareLogo(model,{config:options.config||w.MOSAIC_CONFIG,signal:job.signal});if(destroyed)return null;
          if(format==='pdf'){var pdfMake=w.pdfMake||library;if(!pdfMake?.createPdf)fail('The PDF export library is unavailable.');blob=await timed(new Promise(function(resolve,reject){try{pdfMake.createPdf(pdfDefinition(model)).getBlob(resolve);}catch(error){reject(error);}}),'PDF creation took too long. Try again.',job.signal);}
          else{var lib=w.docx||library;if(!lib?.Packer)fail('The Word export library is unavailable.');blob=await timed(lib.Packer.toBlob(wordDocument(model,lib)),'Word creation took too long. Try again.',job.signal);}
        }
        if(destroyed)return null;var release=download(blob,filename(model.title,format==='word'?'docx':format),function(done){downloads.delete(done);});if(destroyed){release();return null;}downloads.add(release);if(model.warnings.length)status.setAttribute('data-warning','true');status.textContent='Download started.'+(model.warnings.length?' '+model.warnings.join(' '):'');complete(active);return blob;
      } catch(error) {if(!destroyed){feedback(active,'idle');status.removeAttribute('data-warning');status.setAttribute('data-error','true');status.textContent=error.message||'The export could not be completed.';}return null;}
      finally{busy=false;job=null;if(!destroyed){buttons.forEach(function(b){b.removeAttribute('aria-disabled');});toolbar.removeAttribute('aria-busy');}}
    }
    var api={destroy:function(){if(destroyed)return;destroyed=true;if(job)job.abort();w.clearTimeout(feedbackTimer);downloads.forEach(function(release){release();});close(false);listeners.forEach(function(remove){remove();});toolbar.remove();},exportPDF:function(){return perform('pdf');},exportWord:function(){return perform('word');},exportMDX:function(){return perform('mdx');},exportMarkdown:function(){return perform('md');},copyLink:function(){return perform('link');},copyMarkdown:function(){return perform('markdown');},print:function(){return perform('print');}};
    toolbar.mosaicExport=api;listen(linkButton,'click',api.copyLink);listen(markdownButton,'click',api.copyMarkdown);if(printButton)listen(printButton,'click',api.print);listen(downloadButton,'click',function(){open(false);});listen(downloadButton,'keydown',function(event){if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!panel)open(event.key==='ArrowUp');}else if(event.key==='Escape')close(true);});return api;
  }
  w.MosaicExport={mount:mount,read:read,prepareImages:prepareImages,prepareLogo:prepareLogo,pdfDefinition:pdfDefinition,wordDocument:wordDocument,markdown:markdown,mdx:mdx};
})(window,document);

;
/* Mosaic Citi-style choices. Scoped, keyboard accessible and theme-aware. */
(function(w,d){'use strict';
  if(w.MosaicPopover)return;
  var active=null,serial=0;
  function mount(host,options){
    options=options||{};var value=String(options.value==null?'':options.value),items=options.options||[],dead=false,panel=null,typeBuffer='',typeTimer;
    var trigger=d.createElement('button');trigger.type='button';trigger.className='mo-choice';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
    var caption=d.createElement('span'),chevron=d.createElementNS('http://www.w3.org/2000/svg','svg');chevron.classList.add('mo-choice-chevron');chevron.setAttribute('aria-hidden','true');chevron.setAttribute('focusable','false');chevron.setAttribute('viewBox','0 0 24 24');chevron.setAttribute('width','18');chevron.setAttribute('height','18');chevron.setAttribute('fill','none');chevron.setAttribute('stroke','currentColor');chevron.setAttribute('stroke-width','1.7');chevron.setAttribute('stroke-linecap','round');chevron.setAttribute('stroke-linejoin','round');var chevronPath=d.createElementNS(chevron.namespaceURI,'path');chevronPath.setAttribute('d','m6 9 6 6 6-6');chevron.append(chevronPath);trigger.append(caption,chevron);host.appendChild(trigger);
    function label(){var item=items.find(function(x){return String(x.value)===value;});caption.textContent=options.placeholder||(item?item.label:options.label||'Choose');trigger.setAttribute('aria-label',(options.label||'Choose')+(item&&!options.placeholder?': '+item.label:''));}
    function close(restore){clearTimeout(typeTimer);typeBuffer='';if(!panel)return;panel.remove();panel=null;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-controls');d.removeEventListener('pointerdown',outside,true);d.removeEventListener('focusin',blur,true);w.removeEventListener('resize',position);w.removeEventListener('scroll',position,true);if(active===handle)active=null;if(restore&&trigger.isConnected)trigger.focus({preventScroll:true});}
    function outside(e){if(!trigger.contains(e.target)&&panel&&!panel.contains(e.target))close(false);}
    function blur(e){if(!trigger.contains(e.target)&&panel&&!panel.contains(e.target))close(false);}
    function position(){if(!panel)return;if(!trigger.isConnected){close(false);return;}var r=trigger.getBoundingClientRect(),v=w.visualViewport,width=v?v.width:w.innerWidth,height=v?v.height:w.innerHeight;panel.style.maxWidth=Math.max(160,width-24)+'px';panel.style.minWidth=Math.min(Math.max(r.width,220),width-24)+'px';panel.style.maxHeight=Math.max(100,Math.min(360,height-24))+'px';var size=panel.getBoundingClientRect();panel.style.left=Math.max(12,Math.min(r.left,width-size.width-12))+'px';panel.style.top=Math.max(12,Math.min(r.bottom+8+size.height>height-12?r.top-size.height-8:r.bottom+8,height-size.height-12))+'px';}
    function choices(){return panel?Array.from(panel.querySelectorAll('[role=option]:not(:disabled)')):[];}
    function focusAt(n){var all=choices();if(all.length)all[(n+all.length)%all.length].focus({preventScroll:true});var current=d.activeElement;if(current&&current.scrollIntoView)current.scrollIntoView({block:'nearest'});}
    function choose(item,button){if(dead||trigger.disabled||!panel||!panel.contains(button)||button.disabled)return;value=String(item.value);label();close(false);if(typeof options.onChange==='function')options.onChange(value);if(options.retainFocus!==false&&!dead&&trigger.isConnected)trigger.focus({preventScroll:true});}
    function open(last){if(dead||trigger.disabled)return;if(panel){close(true);return;}if(active)active.close(false);panel=d.createElement('div');panel.className='mo-choice-popover';panel.id='mosaic-choice-'+(++serial);panel.setAttribute('role','listbox');panel.setAttribute('aria-label',options.label||'Choose');trigger.setAttribute('aria-controls',panel.id);trigger.setAttribute('aria-expanded','true');
      items.forEach(function(item){var button=d.createElement('button');button.type='button';button.className='mo-choice-option';button.tabIndex=-1;button.setAttribute('role','option');button.setAttribute('aria-selected',String(String(item.value)===value));button.disabled=!!item.disabled;var text=d.createElement('span');text.className='mo-choice-option-label';text.textContent=item.label;var check=d.createElementNS('http://www.w3.org/2000/svg','svg');check.setAttribute('class','mo-choice-check');check.setAttribute('viewBox','0 0 24 24');check.setAttribute('width','18');check.setAttribute('height','18');check.setAttribute('aria-hidden','true');check.setAttribute('focusable','false');check.setAttribute('fill','none');check.setAttribute('stroke','currentColor');check.setAttribute('stroke-width','1.8');var path=d.createElementNS(check.namespaceURI,'path');path.setAttribute('d','m5 12 4 4L19 6');check.append(path);button.append(text,check);button.dataset.value=String(item.value);button.addEventListener('click',function(){choose(item,button);});panel.appendChild(button);});
      panel.addEventListener('keydown',function(e){var all=choices(),at=all.indexOf(d.activeElement);if(e.key==='Escape'){e.preventDefault();close(true);}else if(e.key==='Tab'){close(false);trigger.focus({preventScroll:true});}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();focusAt(e.key==='Home'?0:e.key==='End'?all.length-1:at+(e.key==='ArrowDown'?1:-1));}else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){clearTimeout(typeTimer);typeBuffer+=e.key.toLowerCase();typeTimer=w.setTimeout(function(){typeBuffer='';},650);var match=all.findIndex(function(b){return b.textContent.toLowerCase().startsWith(typeBuffer);});if(match>=0){e.preventDefault();focusAt(match);}}});
      d.body.appendChild(panel);active=handle;position();d.addEventListener('pointerdown',outside,true);d.addEventListener('focusin',blur,true);w.addEventListener('resize',position);w.addEventListener('scroll',position,true);var all=choices(),selected=all.findIndex(function(b){return b.dataset.value===value;});focusAt(last?all.length-1:Math.max(0,selected));
    }
    function click(){open(false);}function key(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!panel)open(e.key==='ArrowUp');}else if(e.key==='Escape')close(true);}
    trigger.addEventListener('click',click);trigger.addEventListener('keydown',key);label();
    var handle={trigger:trigger,close:close,setValue:function(v){value=String(v);label();if(panel)panel.querySelectorAll('[role=option]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.value===value));});},setOptions:function(next){items=next||[];close(false);label();},setDisabled:function(disabled){trigger.disabled=!!disabled;if(disabled)close(false);},destroy:function(){dead=true;close(false);clearTimeout(typeTimer);trigger.removeEventListener('click',click);trigger.removeEventListener('keydown',key);trigger.remove();}};
    return handle;
  }
  w.MosaicPopover={mount:mount};
})(window,document);

;
/* One Mosaic search field across Home, Resources and Insights. */
(function(w,d){'use strict';if(w.MosaicSearch)return;
  function icon(path){var svg=d.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','20');svg.setAttribute('height','20');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.classList.add('mosaic-ui-icon');var p=d.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',path);svg.append(p);return svg;}
  function enhance(root){var clean=[];root.querySelectorAll('form[role="search"]').forEach(function(form){if(form.hasAttribute('data-mosaic-search'))return;var input=form.querySelector('input[type="search"]'),submit=form.querySelector('button[type="submit"]');if(!input||!submit)return;form.dataset.mosaicSearch='';form.classList.add('mosaic-search');input.maxLength=250;input.setAttribute('enterkeyhint','search');
    var old=form.querySelector(':scope > svg');if(old)old.remove();var glass=icon('M10.5 3.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14M16 16l4.5 4.5');glass.classList.add('mosaic-search-glass');form.prepend(glass);var clear=d.createElement('button');clear.type='button';clear.className='mosaic-search-clear';clear.setAttribute('aria-label','Clear search');clear.append(icon('m6 6 12 12M18 6 6 18'));submit.before(clear);submit.classList.add('mosaic-search-submit');
    function sync(){clear.hidden=!input.value;}
    function reset(){input.value='';sync();input.focus();input.dispatchEvent(new w.Event('input',{bubbles:true}));form.requestSubmit?form.requestSubmit(submit):form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}
    input.addEventListener('input',sync);input.addEventListener('search',sync);clear.addEventListener('click',reset);sync();clean.push(function(){input.removeEventListener('input',sync);input.removeEventListener('search',sync);clear.removeEventListener('click',reset);clear.remove();glass.remove();form.classList.remove('mosaic-search');delete form.dataset.mosaicSearch;});
  });return {destroy:function(){clean.splice(0).forEach(function(fn){fn();});}};}
  w.MosaicSearch={enhance:enhance,icon:icon};
})(window,document);

;
/* Shared navBar Add page widget. Availability is immediate; Confluence owns permissions. */
(function(w,d){'use strict';if(w.MosaicNavbar)return;var widgets=[],started=false;
  function allowed(){
    var space=d.querySelector('meta[name="ajs-space-key"]')?.content;
    try{space=space||w.AJS?.Meta?.get('space-key');}catch(_){}
    if(!space&&/^\/confluence\/spaces\/mosaic\/(?:overview\/?|pages\/[1-9]\d*(?:\/.*)?)$/.test(w.location.pathname))space='mosaic';
    return space==='mosaic'&&w.top===w.self&&
      !/\/(?:admin|plugins\/servlet\/admin|spaces\/permissions)(?:\/|$)/i.test(w.location.pathname)&&
      !/(?:editpage|createpage|createblogpost|viewpagehistory|diffpages|viewpreviousversions|preview|spacepermissions)\.action$/i.test(w.location.pathname)&&
      !/[?&](?:pageVersion|preview|mosaicNativeUi)=/.test(w.location.search)&&
      !d.querySelector('#editpageform,#createpageform,#content-editor,body.contenteditor');
  }
  function reset(item){item.link.removeAttribute('aria-busy');item.label.textContent='Add page';item.spinner.hidden=true;}
  function visibility(){widgets.forEach(function(item){reset(item);item.host.hidden=!allowed()||/^#\/(?:new|edit)(?:[/?]|$)/.test(w.location.hash);});}
  function boot(config){
    if(!allowed()){visibility();return;}
    var cfg=w.MosaicConfig.resolve(config);
    d.querySelectorAll('[data-mosaic-add-page]').forEach(function(host){
      if(widgets.some(function(item){return item.host===host;}))return;
      var link=d.createElement('a');link.className='mo-choice mosaic-add-page';
      link.href=w.MosaicConfig.page(cfg,'home')+'#/new';link.setAttribute('aria-label','Add page');
      var plus=w.MosaicSearch.icon('M12 5v14M5 12h14');plus.classList.add('mosaic-add-icon');
      var label=d.createElement('span');label.setAttribute('data-mosaic-add-label','');label.textContent='Add page';
      var spinner=d.createElement('span');spinner.className='mosaic-add-spinner';spinner.setAttribute('aria-hidden','true');spinner.hidden=true;
      var item={host:host,link:link,label:label,spinner:spinner};
      function activate(event){
        if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        // Confluence's delegated navbar handler may cancel or rewrite an anchor.
        // Own this navigation while keeping modified clicks as native links.
        event.preventDefault();event.stopPropagation();
        if(!link.isConnected||host.hidden||!allowed()||link.getAttribute('aria-busy')==='true')return;
        link.setAttribute('aria-busy','true');label.textContent='Opening…';spinner.hidden=false;
        try{w.location.assign(link.href);}catch(_){reset(item);}
      }
      item.activate=activate;link.addEventListener('click',activate);
      link.append(plus,spinner,label);host.append(link);widgets.push(item);
    });
    if(!started){w.addEventListener('hashchange',visibility);w.addEventListener('pageshow',visibility);started=true;}visibility();
  }
  function destroy(){widgets.splice(0).forEach(function(item){item.link.removeEventListener('click',item.activate);item.link.remove();});w.removeEventListener('hashchange',visibility);w.removeEventListener('pageshow',visibility);started=false;}
  w.MosaicNavbar={boot:boot,destroy:destroy};
})(window,document);

;
/* Load authoring only when a Mosaic writing route needs it. */
(function(w,d){
  'use strict';
  if(w.MosaicEditorLoader)return;
  var pending=new Map(),completed=new Map();
  function current(){return w.MosaicEditor&&typeof w.MosaicEditor.mount==='function'?w.MosaicEditor:null;}
  function settings(config){
    config=config||{};
    var path=config.assetBase===undefined?(config.contextPath||'/confluence')+'/download/attachments/'+(config.attachmentPageId||'3981001251')+'/':config.assetBase;
    if(typeof path!=='string'||!path.trim())throw Error('The Mosaic editor requires a local attachment path.');
    var base=new URL(path,w.location.href);
    if(base.origin!==w.location.origin||!/^https?:$/.test(base.protocol)||base.username||base.password||base.search||base.hash)throw Error('The Mosaic editor requires a local attachment path.');
    base.pathname=base.pathname.replace(/\/?$/,'/');
    var url=new URL('mosaic-editor.min.js',base),css=new URL('mosaic-editor.css',base),revision=config.assetRevision;
    if(revision===undefined){var core=d.getElementById('mosaic-core');if(core&&core.src)revision=new URL(core.src,w.location.href).searchParams.get('v');}
    if(revision!==undefined&&revision!==null&&revision!==''){
      if(typeof revision!=='string'||!/^[A-Za-z0-9._-]{1,80}$/.test(revision))throw Error('The Mosaic editor attachment revision is invalid.');
      url.searchParams.set('v',revision);
      css.searchParams.set('v',revision);
    }
    var timeout=config.editorTimeoutMs===undefined?12000:Number(config.editorTimeoutMs);
    if(!Number.isFinite(timeout)||timeout<250||timeout>60000)throw Error('The Mosaic editor timeout must be between 250 and 60000 milliseconds.');
    return {url:url.href,css:css.href,timeout:timeout};
  }
  function load(config){
    var request;try{request=settings(config);}catch(error){return Promise.reject(error);}
    if(pending.has(request.url))return pending.get(request.url);
    var cached=completed.get(request.url),editor=current();
    if(cached&&cached.isConnected&&editor)return Promise.resolve(editor);
    if(cached){cached.remove();completed.delete(request.url);}
    var operation=new Promise(function(resolve,reject){
      var css=d.createElement('link'),script=editor?null:d.createElement('script'),settled=false,timer,cssReady=false,scriptReady=!!editor;
      css.rel='stylesheet';css.href=request.css;css.setAttribute('data-mosaic-component','editor');
      if(script){script.src=request.url;script.async=true;script.setAttribute('data-mosaic-component','editor');}
      function finish(error,api){
        if(settled)return;settled=true;w.clearTimeout(timer);css.onload=css.onerror=null;if(script)script.onload=script.onerror=null;
        if(error){css.remove();if(script)script.remove();reject(error);}else{completed.set(request.url,css);resolve(api);}
      }
      function ready(){if(cssReady&&scriptReady){var api=current();finish(api?null:Error('The Mosaic editor attachment did not initialise. Please retry or use the native Confluence editor.'),api);}}
      css.onload=function(){cssReady=true;ready();};
      css.onerror=function(){finish(Error('Unable to load the Mosaic editor styles. Please retry or use the native Confluence editor.'));};
      if(script){
        script.onload=function(){if(!current()){finish(Error('The Mosaic editor attachment did not initialise. Please retry or use the native Confluence editor.'));return;}scriptReady=true;ready();};
        script.onerror=function(){finish(Error('Unable to load the Mosaic editor. Please retry or use the native Confluence editor.'));};
      }
      timer=w.setTimeout(function(){finish(Error('Loading the Mosaic editor timed out. Please retry or use the native Confluence editor.'));},request.timeout);
      try{var parent=d.head||d.documentElement;parent.appendChild(css);if(script&&!settled)parent.appendChild(script);}catch(error){finish(error);}
    });
    pending.set(request.url,operation);
    function release(){if(pending.get(request.url)===operation)pending.delete(request.url);}
    operation.then(release,release);
    return operation;
  }
  w.MosaicEditorLoader=Object.freeze({load:load});
})(window,document);

;
/* Loads the independently replaceable Mosaic diagrams from the local attachment page. */
(function(w,d){
  'use strict';
  if(w.MosaicDiagramLoader)return;
  var revision=Date.now().toString(36),resources=new Map(),packages=new Map(),instances=new WeakMap();
  function baseFor(config){
    var value=config.assetBase||config.contextPath+'/download/attachments/'+config.attachmentPageId+'/';
    var url=new URL(value,w.location.href);
    if(url.origin!==w.location.origin||!/^https?:$/.test(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('Diagrams require a local attachment path.');
    return url.href.replace(/\/?$/,'/');
  }
  function resource(base,file,style){
    var url=base+file+'?mosaicComponent='+revision;
    if(resources.has(url))return resources.get(url);
    var promise=new Promise(function(resolve,reject){
      var el=d.createElement(style?'link':'script'),settled=false,timer;
      el.setAttribute('data-mosaic-component','diagrams');
      if(style){el.rel='stylesheet';el.href=url;}else{el.src=url;el.async=true;}
      function finish(error){if(settled)return;settled=true;w.clearTimeout(timer);el.onload=el.onerror=null;if(error){el.remove();reject(error);}else resolve(el);}
      el.onload=function(){finish();};el.onerror=function(){finish(Error('Could not load the programme diagrams. Please try again.'));};
      timer=w.setTimeout(function(){finish(Error('Loading the programme diagrams timed out. Please try again.'));},12000);
      d.head.append(el);
    }).catch(function(error){resources.delete(url);throw error;});
    resources.set(url,promise);return promise;
  }
  function load(config){
    var base;try{base=baseFor(config);}catch(error){return Promise.reject(error);}
    if(packages.has(base))return packages.get(base);
    var promise=Promise.allSettled([
      resource(base,'mosaic-diagrams.css',true),
      resource(base,'mosaic-diagrams.min.js',false).then(function(){return resource(base,'mosaic-diagram-data.js',false);})
    ]).then(function(results){
      var failure=results.find(function(result){return result.status==='rejected';});if(failure)throw failure.reason;
      if(!w.MosaicDiagrams||typeof w.MosaicDiagrams.mount!=='function'||!w.MosaicDiagramData)throw Error('The diagram attachments did not initialise. Please try again.');
      return {renderer:w.MosaicDiagrams,data:w.MosaicDiagramData};
    }).catch(function(error){
      packages.delete(base);
      // Retry HTTP-200 login pages or malformed attachments as well as network failures.
      ['mosaic-diagrams.min.js','mosaic-diagram-data.js'].forEach(function(file){var url=base+file+'?mosaicComponent='+revision;resources.delete(url);d.querySelectorAll('script[data-mosaic-component="diagrams"]').forEach(function(el){if(el.src===url)el.remove();});});
      throw error;
    });packages.set(base,promise);return promise;
  }
  function mount(target,config){
    if(instances.has(target))return instances.get(target);
    var active=true,component,attempt=0;
    var resolveReady,ready=new Promise(function(resolve){resolveReady=resolve;});
    function settleReady(status){if(resolveReady){resolveReady({status:status});resolveReady=null;}}
    function start(){
      if(!active)return;
      var current=++attempt;target.replaceChildren();target.setAttribute('aria-busy','true');
      var status=d.createElement('p');status.className='mo-status';status.setAttribute('role','status');status.textContent='Loading programme diagrams…';target.append(status);
      load(config).then(function(pkg){
        if(!active||current!==attempt||!target.isConnected){settleReady('cancelled');return;}
        target.replaceChildren();component=pkg.renderer.mount(target,{data:pkg.data});
        settleReady('ready');
      }).catch(function(error){
        if(!active||current!==attempt||!target.isConnected){settleReady('cancelled');return;}
        try{var base=baseFor(config);packages.delete(base);resources.delete(base+'mosaic-diagram-data.js?mosaicComponent='+revision);d.querySelectorAll('script[data-mosaic-component="diagrams"]').forEach(function(el){if(el.src.indexOf(base+'mosaic-diagram-data.js?')===0)el.remove();});}catch(_){}
        target.replaceChildren();var message=d.createElement('p');message.setAttribute('role','alert');message.textContent=error.message;var retry=d.createElement('button');retry.type='button';retry.className='mo-button mo-button-secondary';retry.textContent='Retry diagrams';retry.addEventListener('click',start);target.append(message,retry);
        settleReady('error');
      }).finally(function(){if(active&&current===attempt)target.removeAttribute('aria-busy');});
    }
    var handle={ready:ready,destroy:function(){if(!active)return;active=false;settleReady('cancelled');attempt++;component?.destroy();target.removeAttribute('aria-busy');instances.delete(target);}};
    instances.set(target,handle);start();return handle;
  }
  w.MosaicDiagramLoader={mount:mount};
})(window,document);

;
/* Independently replaceable Meet the Team renderer, styles and directory settings. */
(function(w,d){
  'use strict';
  if(w.MosaicTeamLoader)return;
  var revision=Date.now().toString(36),resources=new Map(),packages=new Map(),instances=new WeakMap();
  function baseFor(config){
    var url=new URL(config.assetBase||config.contextPath+'/download/attachments/'+config.attachmentPageId+'/',w.location.href);
    if(url.origin!==w.location.origin||!/^https?:$/.test(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('The team component requires a local attachment path.');
    return url.href.replace(/\/?$/,'/');
  }
  function resource(base,file,style){
    var url=base+file+'?mosaicComponent='+revision;if(resources.has(url))return resources.get(url);
    var promise=new Promise(function(resolve,reject){
      var el=d.createElement(style?'link':'script'),settled=false,timer;
      el.setAttribute('data-mosaic-component','team');
      if(style){el.rel='stylesheet';el.href=url;}else{el.src=url;el.async=true;}
      function finish(error){if(settled)return;settled=true;w.clearTimeout(timer);el.onload=el.onerror=null;if(error){el.remove();reject(error);}else resolve(el);}
      el.onload=function(){finish();};el.onerror=function(){finish(Error('Could not load Meet the team. Please try again.'));};
      timer=w.setTimeout(function(){finish(Error('Loading Meet the team timed out. Please try again.'));},12000);d.head.append(el);
    }).catch(function(error){resources.delete(url);throw error;});resources.set(url,promise);return promise;
  }
  function clearScripts(base){
    ['mosaic-team.min.js','mosaic-team-config.js'].forEach(function(file){
      var url=base+file+'?mosaicComponent='+revision;resources.delete(url);
      d.querySelectorAll('script[data-mosaic-component="team"]').forEach(function(el){if(el.src===url)el.remove();});
    });
  }
  function load(config){
    var base;try{base=baseFor(config);}catch(error){return Promise.reject(error);}
    if(packages.has(base))return packages.get(base);
    var promise=Promise.allSettled([resource(base,'mosaic-team.css',true),resource(base,'mosaic-team.min.js',false),resource(base,'mosaic-team-config.js',false)]).then(function(results){
      var failed=results.find(function(x){return x.status==='rejected';});if(failed)throw failed.reason;
      if(!w.MosaicTeam||typeof w.MosaicTeam.mount!=='function'||!w.MosaicPeopleAPI||!w.MosaicTeamConfig)throw Error('The team attachments did not initialise. Please try again.');
      return {renderer:w.MosaicTeam,settings:w.MosaicTeamConfig};
    }).catch(function(error){packages.delete(base);clearScripts(base);throw error;});packages.set(base,promise);return promise;
  }
  function mount(target,config){
    if(instances.has(target))return instances.get(target);
    var active=true,component,attempt=0;
    var resolveReady,ready=new Promise(function(resolve){resolveReady=resolve;});
    function settleReady(status){if(resolveReady){resolveReady({status:status});resolveReady=null;}}
    function start(){
      if(!active)return;
      var token=++attempt;target.replaceChildren();target.setAttribute('aria-busy','true');
      var p=d.createElement('p');p.className='mo-status';p.setAttribute('role','status');p.textContent='Loading Meet the team…';target.append(p);
      load(config).then(function(pkg){
        if(!active||token!==attempt||!target.isConnected){settleReady('cancelled');return;}
        var settings=Object.assign({},config,{people:Object.assign({},pkg.settings,config.people||{})});
        settings.people.pagination=Object.assign({},pkg.settings.pagination,(config.people||{}).pagination||{});
        target.replaceChildren();component=pkg.renderer.mount(target,{config:settings});
        return Promise.resolve(component&&component.ready).then(function(result){
          if(!active||token!==attempt||!target.isConnected){settleReady('cancelled');return;}
          settleReady(result&&['error','cancelled'].includes(result.status)?result.status:'ready');
        });
      }).catch(function(error){
        if(!active||token!==attempt||!target.isConnected){settleReady('cancelled');return;}
        try{var base=baseFor(config);packages.delete(base);clearScripts(base);}catch(_){}
        target.replaceChildren();var message=d.createElement('p');message.setAttribute('role','alert');message.textContent=error.message;
        var retry=d.createElement('button');retry.type='button';retry.className='mo-button mo-button-secondary';retry.textContent='Retry team';retry.addEventListener('click',start);target.append(message,retry);
        settleReady('error');
      }).finally(function(){if(active&&token===attempt)target.removeAttribute('aria-busy');});
    }
    var handle={ready:ready,destroy:function(){if(!active)return;active=false;settleReady('cancelled');attempt++;if(component)component.destroy();target.removeAttribute('aria-busy');instances.delete(target);}};
    instances.set(target,handle);start();return handle;
  }
  w.MosaicTeamLoader={mount:mount};
})(window,document);

;
/* Shared bookmarks: the native JSON attachment is canonical; this property only
 * serializes writes. Confluence attachment uploads do not expose a CAS version.
 * API references: developer.atlassian.com/server/confluence/rest/v1000/api-group-content-property/
 * and developer.atlassian.com/server/confluence/rest/v900/api-group-attachments/ . */
(function (root) {
  'use strict';
  var CATALOG='mosaic-resources.json', LOCK='mosaic-resources-write-v1';
  var MAX_IMAGE=5*1024*1024, MAX_JSON=2*1024*1024, MAX_LINKS=5000;
  var REQUEST_MS=15000, LEASE_MS=60000;
  function fault(message,code,status){var error=new Error(message);error.code=code;if(status)error.status=status;return error;}
  function cancelled(signal){if(signal?.aborted)throw fault('The request was cancelled.','ABORTED');}
  function text(value,name,max,required){if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw fault('Use a valid '+name+' of '+max+' characters or fewer.','INVALID_INPUT');value=value.trim();if(required&&!value)throw fault('Enter a '+name+'.','INVALID_INPUT');return value;}
  function linkURL(value){value=text(value,'URL',2048,true);var url;try{url=new URL(value);}catch(_){throw fault('Enter an absolute http or https URL.','INVALID_INPUT');}if(!/^https?:$/.test(url.protocol)||url.username||url.password||/[\u0000-\u0020\u007f\\]/.test(value))throw fault('Enter an http or https URL without credentials or spaces.','INVALID_INPUT');if(url.href.length>2048)throw fault('Use a URL of 2048 characters or fewer after URL encoding.','INVALID_INPUT');return url.href;}
  function create(config,dependencies){
    config=config||{};var env=dependencies||{},context=config.contextPath||'/confluence',pageId=String(config.attachmentPageId||'3981001251'),space=config.spaceKey||'mosaic';
    if(!/^\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/i.test(context)||!/^[1-9]\d{0,19}$/.test(pageId)||space!=='mosaic')throw fault('Configure the Mosaic attachment page and context path.','CONFIGURATION');
    var location=env.location||root.location,origin=location?.origin;
    if(!origin||!/^https?:\/\//.test(origin))throw fault('Open Resources on its Confluence site.','CONFIGURATION');
    var fetcher=env.fetch||root.fetch?.bind(root),Crypto=env.crypto||root.crypto,Form=env.FormData||root.FormData,BlobType=env.Blob||root.Blob,Controller=env.AbortController||root.AbortController;
    var setTimer=env.setTimeout||root.setTimeout.bind(root),clearTimer=env.clearTimeout||root.clearTimeout.bind(root),now=env.now||Date.now;
    if(!fetcher||!Controller)throw fault('This browser cannot load the shared resource library.','UNAVAILABLE');
    var base=context+'/rest/api/content/'+pageId,property=base+'/property/'+LOCK,busy=false;
    function imageURL(value){
      if(typeof value!=='string'||value.length>2300||/[\u0000-\u0020\u007f\\]/.test(value))throw fault('The resource image is not a valid Mosaic attachment.','INVALID_CATALOG');
      var url;try{url=new URL(value,origin);}catch(_){throw fault('The resource image is invalid.','INVALID_CATALOG');}
      var prefix=context+'/download/attachments/'+pageId+'/';
      if(url.origin!==origin||url.username||url.password||url.hash||!url.pathname.startsWith(prefix)||!/^mosaic-resource-[a-z0-9-]+\.(?:png|jpe?g|webp)$/i.test(url.pathname.slice(prefix.length)))throw fault('The resource image is outside the Mosaic attachment page.','INVALID_CATALOG');
      return url.pathname+url.search;
    }
    function normalizeLink(value){
      if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.id!=='string'||!/^resource-[a-f0-9]{32}$/.test(value.id))throw fault('The resource catalogue contains an invalid link.','INVALID_CATALOG');
      var result={id:value.id,title:text(value.title,'title',160,true),url:linkURL(value.url),description:text(value.description==null?'':value.description,'description',1000,false)};
      if(value.image!=null)result.image=imageURL(value.image);return result;
    }
    function catalog(value){
      if(!value||!Number.isSafeInteger(value.version)||value.version<1||!Array.isArray(value.links)||value.links.length>MAX_LINKS)throw fault('The resource catalogue has an unsupported format.','INVALID_CATALOG');
      var seen=new Set(),links=value.links.map(function(item){var link;try{link=normalizeLink(item);}catch(error){error.code='INVALID_CATALOG';throw error;}if(seen.has(link.id))throw fault('The resource catalogue contains duplicate identifiers.','INVALID_CATALOG');seen.add(link.id);return link;});return {version:value.version,links:links};
    }
    async function request(path,options){
      options=options||{};cancelled(options.signal);var controller=new Controller(),sent=false,timeout=false,timer,abort;
      var limit=new Promise(function(_,reject){timer=setTimer(function(){timeout=true;controller.abort();reject(fault('Confluence did not respond in time. Try again.','TIMEOUT'));},REQUEST_MS);abort=function(){controller.abort();reject(fault('The request was cancelled.','ABORTED'));};options.signal?.addEventListener('abort',abort,{once:true});});
      try{
        return await Promise.race([limit,(async function(){
          sent=true;options.onDispatch?.();var response=await fetcher(path,{method:options.method||'GET',credentials:'same-origin',redirect:'error',cache:'no-store',signal:controller.signal,headers:Object.assign({Accept:'application/json'},options.form?{'X-Atlassian-Token':'nocheck'}:options.body?{'Content-Type':'application/json'}:{ }),body:options.form||options.body&&JSON.stringify(options.body)});
          if(response.url&&new URL(response.url,origin).origin!==origin)throw fault('Confluence returned an unexpected location.','INVALID_RESPONSE');
          if(response.status===404&&options.missing)return null;
          if(!response.ok)throw fault(response.status===401||response.status===403?'Confluence did not allow this resource library request.':response.status===409?'The resource library changed during this request. Try again.':'Confluence could not complete the resource library request.','HTTP_ERROR',response.status);
          var raw=await response.text();if(raw.length>MAX_JSON)throw fault('The resource catalogue response is too large.','INVALID_RESPONSE');
          try{return JSON.parse(raw);}catch(_){throw fault('Confluence returned an unreadable response.','INVALID_RESPONSE');}
        })()]);
      }catch(error){if(!error.code)error=fault(timeout?'Confluence did not respond in time. Try again.':options.signal?.aborted?'The request was cancelled.':'Confluence could not be reached. Try again.',timeout?'TIMEOUT':options.signal?.aborted?'ABORTED':'NETWORK_ERROR');error.dispatched=sent;throw error;}
      finally{clearTimer(timer);options.signal?.removeEventListener('abort',abort);}
    }
    async function verify(signal){
      var page=await request(base+'?expand=space',{signal:signal});
      if(String(page?.id)!==pageId||page.type!=='page'||page.status!=='current'||page.space?.key!==space)throw fault('The configured attachment page is outside Mosaic.','INVALID_SCOPE');
    }
    function metadata(item,name){
      if(!item||!/^[1-9]\d*$/.test(String(item.id))||item.type!=='attachment'||item.status!=='current'||item.title!==name||String(item.container?.id)!==pageId||!Number.isSafeInteger(item.version?.number)||item.version.number<1)throw fault('Confluence returned an unexpected attachment.','INVALID_RESPONSE');
      return {id:String(item.id),version:item.version.number};
    }
    async function attachment(name,signal){
      var response=await request(base+'/child/attachment?'+new URLSearchParams({filename:name,expand:'container,version',limit:2}),{signal:signal});
      if(!Array.isArray(response?.results)||response.results.length>1||response._links?.next)throw fault('The resource attachment could not be uniquely identified.','INVALID_RESPONSE');
      return response.results.length?metadata(response.results[0],name):null;
    }
    async function snapshot(signal){
      var item=await attachment(CATALOG,signal);if(!item)return {value:{version:0,links:[]},attachment:null};
      var value=await request(context+'/download/attachments/'+pageId+'/'+CATALOG+'?'+new URLSearchParams({version:item.version,api:'v2'}),{signal:signal});
      return {value:catalog(value),attachment:item};
    }
    async function load(options){var signal=options?.signal;await verify(signal);return (await snapshot(signal)).value;}
    async function digest(bytes){var data=await Crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(data),function(byte){return byte.toString(16).padStart(2,'0');}).join('');}
    async function prepare(input,signal){
      if(!Form||!BlobType||!Crypto?.subtle||!Crypto?.getRandomValues||!(env.TextEncoder||root.TextEncoder))throw fault('This browser cannot save the shared resource library.','UNAVAILABLE');
      cancelled(signal);input=input||{};var link={title:text(input.title,'title',160,true),url:linkURL(input.url),description:text(input.description==null?'':input.description,'description',1000,false)},file=input.imageFile,extension='',imageHash='';
      if(file!=null){
        var match=typeof file.name==='string'&&/\.(png|jpe?g|webp)$/i.exec(file.name),types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
        if(!match||!Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_IMAGE||file.type&&file.type!==types[match[1].toLowerCase()]||typeof file.arrayBuffer!=='function')throw fault('Choose a PNG, JPEG or WebP image up to 5 MiB.','INVALID_IMAGE');
        extension=match[1].toLowerCase().replace('jpeg','jpg');var bytes=new Uint8Array(await file.arrayBuffer());cancelled(signal);
        var valid=extension==='png'?bytes.length>=8&&[137,80,78,71,13,10,26,10].every(function(n,i){return bytes[i]===n;}):extension==='jpg'?bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.length>=12&&String.fromCharCode.apply(null,bytes.slice(0,4))==='RIFF'&&String.fromCharCode.apply(null,bytes.slice(8,12))==='WEBP';
        if(!valid||bytes.length!==file.size)throw fault('The selected file is not a valid PNG, JPEG or WebP image.','INVALID_IMAGE');imageHash=await digest(bytes);
      }
      var Encoder=env.TextEncoder||root.TextEncoder,fingerprint=await digest(new Encoder().encode(JSON.stringify([link.title,link.url,link.description,imageHash])));cancelled(signal);
      link.id='resource-'+fingerprint.slice(0,32);if(file)link.image=context+'/download/attachments/'+pageId+'/mosaic-'+link.id+'.'+extension+'?api=v2';
      return {link:link,file:file,fingerprint:fingerprint,imageName:file?'mosaic-'+link.id+'.'+extension:''};
    }
    function token(){return Array.from(Crypto.getRandomValues(new Uint8Array(16)),function(n){return n.toString(16).padStart(2,'0');}).join('');}
    function sameLink(a,b){return a.id===b.id&&a.title===b.title&&a.url===b.url&&a.description===b.description&&(a.image||'')===(b.image||'');}
    function included(value,link){var item=value.links.find(function(candidate){return candidate.id===link.id;});if(item&&!sameLink(item,link))throw fault('The resource identifier already has different content.','CONFLICT');return !!item;}
    function lockRecord(record){
      var value=record?.value;
      if(record?.key!==LOCK||!Number.isSafeInteger(record.version?.number)||record.version.number<1||value?.schema!==1||!['idle','preparing','committing'].includes(value.phase))throw fault('The resource write coordinator has an unsupported format.','INVALID_LOCK');
      if(value.phase!=='idle'&&(!/^[a-f0-9]{32}$/.test(value.owner)||!/^[a-f0-9]{64}$/.test(value.fingerprint)||!Number.isSafeInteger(value.expiresAt)||value.phase==='preparing'&&value.expiresAt<1))throw fault('The resource write coordinator is invalid.','INVALID_LOCK');
      if(value.phase==='committing'){normalizeLink(value.link);if(!Number.isSafeInteger(value.catalogVersion)||value.catalogVersion<1)throw fault('The pending resource write is invalid.','INVALID_LOCK');}
      return record;
    }
    async function readLock(signal){var value=await request(property+'?expand=version',{signal:signal,missing:true});return value?lockRecord(value):null;}
    async function writeLock(previous,value,signal){
      var version=previous?previous.version.number+1:1,payload={key:LOCK,value:value};if(previous)payload.version={number:version};
      var result=await request(previous?property:base+'/property',{method:previous?'PUT':'POST',body:payload,signal:signal});
      function ordered(item){return item&&typeof item==='object'?Object.keys(item).sort().map(function(key){return [key,ordered(item[key])];}):item;}
      lockRecord(result);if(result.version.number!==version||JSON.stringify(ordered(result.value))!==JSON.stringify(ordered(value)))throw fault('The resource write coordinator returned a different revision.','INVALID_LOCK');return result;
    }
    async function release(lock){try{await writeLock(lock,{schema:1,phase:'idle'});}catch(_){/* A subsequent writer reconciles a confirmed commit or an expired preparation. */}}
    async function abandonUndispatched(owner){
      // This invocation knows that it never sent the catalogue binary. Advancing
      // the property revision also fences a delayed commit-marker PUT safely.
      for(var n=0;n<3;n++){try{var observed=await readLock();if(!observed||observed.value.phase==='idle'||observed.value.owner!==owner)return true;await writeLock(observed,{schema:1,phase:'idle'});return true;}catch(error){if(error.status!==409)return false;}}
      return false;
    }
    function uncertain(){return fault('Confluence has not confirmed the previous save yet. Retry save to check it; no duplicate link will be added.','SAVE_UNCERTAIN');}
    async function acquire(item,signal){
      for(var attempt=0;attempt<4;attempt++){
        cancelled(signal);var previous=await readLock(signal);
        if(previous?.value.phase==='committing'){
          var recovered=await snapshot(signal);
          if(!included(recovered.value,previous.value.link)||recovered.value.version<previous.value.catalogVersion)throw uncertain();
          try{await writeLock(previous,{schema:1,phase:'idle'},signal);}catch(error){if(error.status===409)continue;throw error;}
          if(included(recovered.value,item.link))return {recovered:recovered.value};continue;
        }
        if(previous?.value.phase==='preparing'&&previous.value.expiresAt>now())throw fault('Another resource is being saved. Try again in a moment.','WRITE_BUSY');
        var value={schema:1,phase:'preparing',owner:token(),fingerprint:item.fingerprint,expiresAt:now()+LEASE_MS};
        try{return {lock:await writeLock(previous,value,signal)};}catch(error){if(error.status===409)continue;if(!previous&&error.status===400&&await readLock(signal))continue;throw error;}
      }
      throw fault('The resource library is busy. Try again in a moment.','WRITE_BUSY');
    }
    async function upload(name,file,existing,signal,onDispatch){
      var form=new Form();form.append('file',file,name);form.append('minorEdit','true');form.append('comment','Mosaic shared resource library');
      return request(base+'/child/attachment'+(existing?'/'+existing.id+'/data':'')+'?expand=container,version',{method:'POST',form:form,signal:signal,onDispatch:onDispatch});
    }
    async function add(input,options){
      if(busy)throw fault('A resource is already being saved.','WRITE_BUSY');busy=true;var signal=options?.signal,lease=null,committing=false,binaryDispatched=false;
      try{
        var item=await prepare(input,signal);await verify(signal);var acquired=await acquire(item,signal);if(acquired.recovered)return acquired.recovered;lease=acquired.lock;
        var current=await snapshot(signal);if(included(current.value,item.link)){await release(lease);lease=null;return current.value;}
        if(current.value.links.length>=MAX_LINKS||current.value.version===Number.MAX_SAFE_INTEGER)throw fault('The resource library is full.','CATALOG_FULL');
        if(item.file){var image=await attachment(item.imageName,signal);if(!image)await upload(item.imageName,item.file,null,signal);}
        cancelled(signal);if(lease.value.expiresAt<=now())throw fault('The resource save took too long. Retry save.','WRITE_BUSY');
        var next={version:current.value.version+1,links:current.value.links.concat([item.link])},serialized=JSON.stringify(next);
        if(serialized.length>MAX_JSON)throw fault('The resource library is too large.','CATALOG_FULL');
        // The commit marker cannot expire: a timed-out attachment request can
        // still finish later. A newer writer must first observe this exact link.
        var commit={schema:1,phase:'committing',owner:lease.value.owner,fingerprint:item.fingerprint,expiresAt:0,link:item.link,catalogVersion:next.version};
        committing=true;
        try{lease=await writeLock(lease,commit,signal);}catch(error){
          if(error.status>=400&&error.status<500){committing=false;throw error;}
          // A lost coordinator response is recoverable while this invocation
          // can prove it has not dispatched the attachment request yet.
          var observed;try{observed=await readLock();}catch(_){throw error;}
          if(observed?.value.phase!=='committing'||observed.value.owner!==commit.owner||observed.value.catalogVersion!==commit.catalogVersion||!sameLink(observed.value.link,item.link))throw error;
          lease=observed;cancelled(signal);
        }
        try{await upload(CATALOG,new BlobType([serialized],{type:'application/json'}),current.attachment,signal,function(){binaryDispatched=true;});}
        catch(error){if(!error.dispatched)throw error;if(error.status>=400&&error.status<500){committing=false;throw error;}throw uncertain();}
        var confirmed=await snapshot(signal);if(confirmed.value.version<next.version||!included(confirmed.value,item.link))throw uncertain();
        await release(lease);lease=null;return confirmed.value;
      }catch(error){if(committing&&!binaryDispatched&&lease&&await abandonUndispatched(lease.value.owner)){committing=false;lease=null;}if(committing&&error.code!=='SAVE_UNCERTAIN')throw uncertain();throw error;}
      finally{if(lease&&!committing)await release(lease);busy=false;}
    }
    return Object.freeze({load:load,add:add});
  }
  var api=Object.freeze({create:create});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MosaicResourceStore=api;
})(typeof window!=='undefined'?window:globalThis);

;
/* Mosaic Resources: a shared bookmark library, independent of native page listings. */
(function(w){
  'use strict';
  if(w.MosaicResources)return;
  var instances=new WeakMap(),sequence=0,maximumImage=5*1024*1024;
  function text(value){return typeof value==='string'?value.trim():'';}
  function safeLink(value){
    if(!text(value)||value.length>2048||!/^https?:\/\//i.test(value)||/[\u0000-\u0020\u007f]/.test(value))return '';
    try{var url=new URL(value);return /^https?:$/.test(url.protocol)&&!url.username&&!url.password?url.href:'';}catch(_){return '';}
  }
  function imageError(file){
    if(!file)return '';
    var ext=(file.name||'').toLowerCase().match(/\.(png|jpe?g|webp)$/),types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
    if(!ext||file.type!==types[ext[1]])return 'Choose a PNG, JPEG or WebP image.';
    if(!file.size||file.size>maximumImage)return 'Choose an image larger than 0 bytes and no larger than 5 MiB.';
    return '';
  }
  function mount(target,options){
    if(!target||target.nodeType!==1)throw Error('A Resources container is required.');
    options=options||{};if(instances.has(target))instances.get(target).destroy();
    var d=target.ownerDocument,config=options.config||{},context=config.contextPath||'/confluence';
    if(!/^\/(?!\/)[a-z0-9/_-]*$/i.test(context))throw Error('Resources requires a local Confluence context path.');
    context=context.replace(/\/+$/,'');
    var uid='mrs-'+(++sequence),active=true,request=0,readController,saveController,store,links=[],loaded=false,removers=[],dialog=null,uncertainDraft=null;
    var resolveReady,ready=new Promise(function(resolve){resolveReady=resolve;});
    function settleReady(status){if(resolveReady){resolveReady({status:status});resolveReady=null;}}
    function el(tag,cls,value){var node=d.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node;}
    function add(parent,tag,cls,value){var node=el(tag,cls,value);parent.append(node);return node;}
    function listen(node,type,handler,list){node.addEventListener(type,handler);(list||removers).push(function(){node.removeEventListener(type,handler);});}
    function button(parent,label,action,cls){var node=add(parent,'button',cls||'mrs-button',label);node.type='button';if(action)node.dataset.action=action;return node;}
    function icon(kind){
      var svg=d.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
      var paths={link:['M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2','M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2'],arrow:['M5 12h14m-6-6 6 6-6 6'],search:['M16 16l5 5','M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],plus:['M12 5v14M5 12h14'],close:['m6 6 12 12M18 6 6 18'],image:['M3 4h18v16H3z','m3 16 5-5 4 4 3-3 6 6','M16 8h.01'],check:['m5 12 4 4L19 6']};
      (paths[kind]||paths.link).forEach(function(value){var path=d.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',value);svg.append(path);});return svg;
    }
    function getStore(){if(!store){if(!w.MosaicResourceStore?.create)throw Error('The bookmark library could not initialize. Refresh this page and try again.');store=w.MosaicResourceStore.create(config);}return store;}
    function safeImage(value){
      if(!text(value)||/[\u0000-\u001f\u007f]/.test(value))return '';
      try{var url=new URL(value,w.location.href),base=context+'/download/attachments/'+String(config.attachmentPageId||'3981001251')+'/';return url.origin===w.location.origin&&!url.username&&!url.password&&url.pathname.startsWith(base)&&/^mosaic-resource-[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i.test(url.pathname.slice(base.length))?url.href:'';}catch(_){return '';}
    }
    function normalize(data){
      if(!data||!Number.isInteger(data.version)||data.version<0||!Array.isArray(data.links))throw Error('The bookmark library returned invalid data. Try again.');
      var seen=new Set();return data.links.map(function(item){
        var id=item&&text(item.id),title=item&&text(item.title),url=item&&safeLink(item.url),description=item&&text(item.description);
        if(!id||seen.has(id)||!title||title.length>160||!url||description.length>1000)throw Error('The bookmark library contains an invalid link. Try again.');
        seen.add(id);return {id:id,title:title,url:url,description:description,image:safeImage(item.image)};
      });
    }
    var root=el('section','mrs-root');root.setAttribute('aria-label','Mosaic Resources');
    var hero=add(root,'div','mrs-hero mo-page-hero'),heroImage=add(hero,'img','mrs-hero-image');heroImage.alt='';heroImage.width=1200;heroImage.height=348;heroImage.loading='eager';heroImage.decoding='async';heroImage.setAttribute('fetchpriority','high');
    var banner=config.resourcesBanner||config.resourceBanner,file=/^mosaic-[a-z0-9-]+\.webp$/.test(banner||'')?banner:'mosaic-resources-banner.webp',assetBase=config.assetBase||context+'/download/attachments/'+encodeURIComponent(config.attachmentPageId||'3981001251')+'/';
    try{var assetURL=new URL(assetBase.replace(/\/?$/,'/')+file,w.location.href);if(assetURL.origin!==w.location.origin||!/^https?:$/.test(assetURL.protocol)||assetURL.username||assetURL.password)throw Error();heroImage.src=assetURL.href;}catch(_){heroImage.hidden=true;}
    listen(heroImage,'error',function(){heroImage.hidden=true;});var heroMedia=w.MosaicMedia?.prepare(heroImage,hero,{eager:true,priority:true});if(heroMedia)removers.push(function(){heroMedia.destroy();});
    add(hero,'span','mo-page-banner-label','Resources').setAttribute('aria-hidden','true');
    var pageBody=add(root,'div','mo-page-body'),heading=add(pageBody,'header','mo-page-intro');
    add(heading,'p','mo-eyebrow','Your Mosaic toolkit');add(heading,'h1','mrs-title','Resources');
    add(heading,'p','mo-lead','Useful tools, guidance and bookmarks, together in one place.');
    add(heading,'p','','Search the shared library to find what you need, or add a link for the team.');
    var library=add(pageBody,'div','mrs-library');
    var toolbar=add(library,'div','mrs-toolbar'),search=add(toolbar,'form','mrs-search');search.setAttribute('role','search');search.append(icon('search'));
    var queryLabel=add(search,'label','mrs-sr','Search saved links');queryLabel.htmlFor=uid+'-query';
    var query=add(search,'input');query.id=queryLabel.htmlFor;query.type='search';query.name='q';query.maxLength=250;query.placeholder='Search links';query.autocomplete='off';query.value=text(options.query).slice(0,250);
    var searchButton=button(search,'Search',null,'mrs-search-submit');searchButton.type='submit';
    var addLink=button(toolbar,'Add link','add','mrs-button mrs-button-primary mrs-add');addLink.prepend(icon('plus'));
    var feedback=add(library,'p','mrs-feedback');feedback.setAttribute('role','status');feedback.hidden=true;
    var result=add(library,'section','mrs-results');result.setAttribute('aria-label','Saved links');
    var announcement=add(root,'span','mrs-sr');announcement.setAttribute('role','status');announcement.setAttribute('aria-live','polite');
    target.append(root);
    function card(item){
      var anchor=el('a','mrs-card');anchor.href=item.url;anchor.dataset.kind='bookmark';
      var logo=add(anchor,'span','mrs-card-icon'),fallback=icon('link');logo.append(fallback);
      if(item.image){var image=add(logo,'img','mrs-card-logo');image.alt='';image.width=64;image.height=48;image.loading='lazy';image.decoding='async';image.src=item.image;fallback.setAttribute('hidden','');image.addEventListener('error',function(){image.hidden=true;fallback.removeAttribute('hidden');},{once:true});}
      var panel=add(anchor,'div','mrs-card-panel');add(panel,'h3','mrs-card-title',item.title);if(item.description)add(panel,'p','mrs-card-description',item.description);
      var action=add(panel,'span','mrs-card-action','Open link');action.append(icon('arrow'));return anchor;
    }
    function showState(title,message,error){result.replaceChildren();var box=add(result,'div','mrs-state'+(error?' mrs-error':''));if(error)box.setAttribute('role','alert');add(box,'h2','',title);add(box,'p','',message);return box;}
    function renderLinks(){
      if(!active||!loaded)return;
      var words=query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),filtered=links.filter(function(item){var value=[item.title,item.description,item.url].join(' ').toLocaleLowerCase();return words.every(function(word){return value.includes(word);});});
      result.replaceChildren();if(filtered.length){var grid=add(result,'div','mrs-grid');filtered.forEach(function(item){grid.append(card(item));});}
      else if(links.length)showState('No matching links','Try another title, description or web address.');
      else showState('Your resource library starts here','Add a useful link to share it with the Mosaic team.');
      announcement.textContent=filtered.length+(filtered.length===1?' link':' links')+(words.length?' found.':' available.');
    }
    listen(query,'input',renderLinks);listen(query,'search',renderLinks);listen(search,'submit',function(event){event.preventDefault();renderLinks();});
    var searchHandle=w.MosaicSearch?.enhance(root);if(searchHandle)removers.push(function(){searchHandle.destroy();});
    async function load(){
      if(!active)return;var token=++request;readController?.abort();readController=new w.AbortController();loaded=false;addLink.disabled=true;result.setAttribute('aria-busy','true');result.replaceChildren();add(result,'p','mrs-loading','Loading saved links…').setAttribute('role','status');
      try{var data=await getStore().load({signal:readController.signal});if(!active||token!==request)return;links=normalize(data);loaded=true;renderLinks();settleReady('ready');}
      catch(error){if(!active||token!==request)return;var box=showState('Resources could not load',text(error?.message)||'The bookmark library is unavailable. Try again.',true);button(box,'Try again','retry');settleReady('error');}
      finally{if(active&&token===request){result.removeAttribute('aria-busy');addLink.disabled=false;}}
    }
    function closeDialog(force){
      if(!dialog||dialog.saving&&!force)return;
      var current=dialog;dialog=null;current.events.splice(0).forEach(function(remove){remove();});if(current.previewURL)w.URL.revokeObjectURL(current.previewURL);current.layer.remove();
      current.inert.forEach(function(entry){if(entry.value===null)entry.node.removeAttribute('inert');else entry.node.setAttribute('inert',entry.value);});
      d.body.style.overflow=current.overflow;if(!force&&active&&current.trigger?.isConnected)current.trigger.focus({preventScroll:true});
    }
    function openDialog(){
      if(!active)return;if(dialog){dialog.panel.focus();return;}feedback.hidden=true;
      var events=[],layer=el('div','mrs-dialog-layer'),panel=add(layer,'section','mrs-dialog');layer.setAttribute('data-mosaic-owned','');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby',uid+'-dialog-title');panel.tabIndex=-1;
      var header=add(panel,'div','mrs-dialog-header');add(header,'h2','','Add a link').id=uid+'-dialog-title';var close=button(header,'',null,'mrs-dialog-close');close.setAttribute('aria-label','Close Add link');close.append(icon('close'));
      add(panel,'p','mrs-dialog-intro','Save a useful destination in the shared Mosaic library.');
      var form=add(panel,'form','mrs-dialog-form');form.noValidate=true;
      function field(label,name,tag,max){var wrap=add(form,'div','mrs-field'),caption=add(wrap,'label','',label),input=add(wrap,tag||'input');caption.htmlFor=uid+'-'+name;input.id=caption.htmlFor;input.name=name;input.maxLength=max;return input;}
      var title=field('Title','title','input',160),url=field('Web address','url','input',2048),description=field('Description (optional)','description','textarea',1000);title.required=true;url.required=true;url.type='url';url.placeholder='https://';description.rows=3;title.autocomplete='off';url.autocomplete='url';
      var upload=add(form,'div','mrs-field mrs-upload');add(upload,'span','mrs-field-label','Image or logo (optional)');
      var fileInput=add(upload,'input','mrs-file-input');fileInput.type='file';fileInput.accept='image/png,image/jpeg,image/webp';fileInput.hidden=true;
      var choose=button(upload,'Choose image',null,'mrs-button mrs-image-choose');choose.prepend(icon('image'));add(upload,'p','mrs-field-hint','PNG, JPEG or WebP · up to 5 MiB');
      var preview=add(upload,'div','mrs-image-preview');preview.hidden=true;var previewImage=add(preview,'img');previewImage.alt='Selected image preview';var filename=add(preview,'span'),remove=button(preview,'Remove image',null,'mrs-text-button');
      var message=add(form,'p','mrs-dialog-message');message.id=uid+'-dialog-message';message.setAttribute('role','alert');message.hidden=true;
      var actions=add(form,'div','mrs-dialog-actions'),cancel=button(actions,'Cancel',null,'mrs-button'),submit=button(actions,'Add link',null,'mrs-button mrs-button-primary');submit.type='submit';
      var current={layer:layer,panel:panel,events:events,saving:false,previewURL:'',file:null,trigger:addLink,overflow:d.body.style.overflow,inert:[]};dialog=current;
      d.body.append(layer);Array.from(d.body.children).forEach(function(node){if(node!==layer&&!['SCRIPT','STYLE','LINK'].includes(node.tagName)){current.inert.push({node:node,value:node.getAttribute('inert')});node.setAttribute('inert','');}});d.body.style.overflow='hidden';
      function showMessage(value,invalid){message.textContent=value;message.hidden=!value;[title,url,description].forEach(function(input){input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');});if(invalid){invalid.setAttribute('aria-invalid','true');invalid.setAttribute('aria-describedby',message.id);invalid.focus();}}
      function lock(saving,uncertain){current.saving=saving;form.setAttribute('aria-busy',String(saving));[title,url,description,choose,remove,fileInput].forEach(function(control){control.disabled=saving||uncertain;});close.disabled=cancel.disabled=submit.disabled=saving;submit.textContent=saving?'Saving…':uncertain?'Retry save':'Add link';}
      function setFile(file){
        if(current.previewURL){w.URL.revokeObjectURL(current.previewURL);current.previewURL='';}current.file=file;fileInput.value='';preview.hidden=!file;previewImage.removeAttribute('src');previewImage.hidden=false;filename.textContent=file?file.name:'';
        if(file&&w.URL.createObjectURL){current.previewURL=w.URL.createObjectURL(file);previewImage.src=current.previewURL;}else previewImage.hidden=true;
      }
      listen(choose,'click',function(){fileInput.click();},events);listen(remove,'click',function(){if(!current.saving&&!uncertainDraft){setFile(null);showMessage('');choose.focus();}},events);
      listen(fileInput,'change',function(){if(current.saving||uncertainDraft)return;var file=fileInput.files?.[0];if(!file)return;var invalid=imageError(file);if(invalid){fileInput.value='';showMessage(invalid);choose.focus();return;}setFile(file);showMessage('');},events);
      listen(previewImage,'error',function(){previewImage.hidden=true;},events);
      listen(close,'click',function(){closeDialog();},events);listen(cancel,'click',function(){closeDialog();},events);
      listen(layer,'click',function(event){if(event.target===layer)closeDialog();},events);
      listen(d,'keydown',function(event){
        if(dialog!==current)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}
        if(event.key==='Tab'){var focusable=Array.from(panel.querySelectorAll('button,input,textarea,a[href],[tabindex]')).filter(function(node){return !node.disabled&&!node.closest('[hidden]')&&node.type!=='file'&&node.tabIndex>=0;});if(!focusable.length){event.preventDefault();panel.focus();return;}var first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&(d.activeElement===first||!panel.contains(d.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(d.activeElement===last||!panel.contains(d.activeElement))){event.preventDefault();first.focus();}}
      },events);
      listen(d,'focusin',function(event){if(dialog===current&&!panel.contains(event.target))panel.focus({preventScroll:true});},events);
      listen(form,'submit',async function(event){
        event.preventDefault();if(!active||dialog!==current||current.saving)return;
        var draft=uncertainDraft||{title:text(title.value),url:text(url.value),description:text(description.value),imageFile:current.file||undefined};
        if(!draft.title||draft.title.length>160||/[\u0000-\u001f\u007f]/.test(draft.title)){showMessage('Enter a title of 1–160 characters.',title);return;}
        if(!safeLink(draft.url)){showMessage('Enter a complete http:// or https:// address, without a username or password.',url);return;}
        if(draft.description.length>1000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(draft.description)){showMessage('Keep the description to 1,000 readable characters.',description);return;}
        var invalid=imageError(draft.imageFile);if(invalid){showMessage(invalid);choose.focus();return;}
        showMessage('');lock(true,false);saveController=new w.AbortController();
        try{
          var data=await getStore().add(draft,{signal:saveController.signal});if(!active||dialog!==current)return;
          var updated=normalize(data);uncertainDraft=null;links=updated;loaded=true;++request;readController?.abort();result.removeAttribute('aria-busy');addLink.disabled=false;query.value='';query.dispatchEvent(new w.Event('input',{bubbles:true}));settleReady('ready');
          lock(false,false);closeDialog();feedback.textContent='Link added.';feedback.hidden=false;
        }catch(error){if(!active||dialog!==current)return;var uncertain=!!uncertainDraft||error?.code==='SAVE_UNCERTAIN';if(uncertain)uncertainDraft=draft;lock(false,uncertain);showMessage(text(error?.message)||'The link could not be saved. Try again.');submit.focus();}
      },events);
      if(uncertainDraft){title.value=uncertainDraft.title;url.value=uncertainDraft.url;description.value=uncertainDraft.description;setFile(uncertainDraft.imageFile||null);lock(false,true);showMessage('The previous save is awaiting confirmation. Retry save to check it before adding another link.');submit.focus();}else title.focus();
    }
    listen(root,'click',function(event){var control=event.target.closest('button[data-action]');if(!active||!control||!root.contains(control)||control.disabled)return;if(control.dataset.action==='add')openDialog();else if(control.dataset.action==='retry')load();});
    function destroy(){if(!active)return;active=false;settleReady('cancelled');++request;readController?.abort();saveController?.abort();closeDialog(true);removers.splice(0).forEach(function(remove){remove();});root.remove();if(instances.get(target)===handle)instances.delete(target);}
    var handle=Object.freeze({ready:ready,destroy:destroy});instances.set(target,handle);if(options.signal){listen(options.signal,'abort',destroy);if(options.signal.aborted)destroy();}if(active)load();return handle;
  }
  w.MosaicResources=Object.freeze({mount:mount});
})(window);

;
/* Mosaic Insights: native page discovery, full-text search and ordered paging. */
(function(w,d){'use strict';if(w.MosaicInsights)return;
  function mount(target,options){
    var cfg=options.config,api=options.api,dead=false,controller=new w.AbortController(),menus=[],mediaHandles=[],rows=[],nextStart=0,hasMore=false,busy=false,loadedPages=0,maxPages=50;
    var resolveReady,ready=new Promise(function(resolve){resolveReady=resolve;});
    function settleReady(status){if(resolveReady){resolveReady({status:status});resolveReady=null;}}
    var params=new URLSearchParams((w.location.hash.split('?')[1]||'')),query=(params.get('q')||'').slice(0,250),sort=params.get('sort')||'newest',restore=Math.min(maxPages,Math.max(1,Number(params.get('pages'))||1));
    if(!['newest','oldest','title'].includes(sort))sort='newest';
    // Old section links now open the full collection. Their page count referred
    // to a different result set, so keep the search/order and restart paging.
    if(params.has('topic')&&!options.signal?.aborted){params.delete('topic');params.delete('pages');restore=1;w.history.replaceState(null,'','#/?'+params.toString());}
    function el(tag,cls,text){var n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
    function add(parent,tag,cls,text){var n=el(tag,cls,text);parent.appendChild(n);return n;}
    function abort(){controller.abort();settleReady('cancelled');}if(options.signal){if(options.signal.aborted)abort();else options.signal.addEventListener('abort',abort,{once:true});}
    var root=add(target,'section','mi-root'),hero=add(root,'div','mi-hero mo-page-hero'),heroImage=add(hero,'img');
    heroImage.alt='';heroImage.width=1200;heroImage.height=348;heroImage.loading='eager';heroImage.decoding='async';heroImage.setAttribute('fetchpriority','high');
    try{var assetBase=cfg.assetBase||(cfg.contextPath||'/confluence')+'/download/attachments/'+(cfg.attachmentPageId||'3981001251')+'/';var imageURL=new URL(assetBase.replace(/\/?$/,'/')+'mosaic-cover-47.webp',w.location.href);if(imageURL.origin!==w.location.origin||!/^https?:$/.test(imageURL.protocol)||imageURL.username||imageURL.password)throw Error();heroImage.src=imageURL.href;}catch(_){heroImage.hidden=true;}
    function hideHero(){heroImage.hidden=true;}heroImage.addEventListener('error',hideHero);
    var heroMedia=w.MosaicMedia?.prepare(heroImage,hero,{eager:true,priority:true});
    add(hero,'span','mo-page-banner-label','Insights').setAttribute('aria-hidden','true');
    var pageBody=add(root,'div','mo-page-body'),heading=add(pageBody,'header','mi-heading mo-page-intro');
    add(heading,'p','mo-eyebrow','From across Mosaic');add(heading,'h1','','Insights');add(heading,'p','mo-lead','Ideas, updates and perspectives shaping the future of custody.');
    add(heading,'p','','Explore the latest articles from the Mosaic team, search a topic or browse what is new.');
    var filters=add(pageBody,'div','mi-filters'),form=add(filters,'form','mi-search');form.setAttribute('role','search');
    var label=add(form,'label','mo-sr','Search insights');label.htmlFor='mi-query';var input=add(form,'input');input.id='mi-query';input.type='search';input.name='q';input.value=query;input.placeholder='Search insights';input.maxLength=250;input.autocomplete='off';var submit=add(form,'button','mi-search-submit','Search');submit.type='submit';
    var sortHost=add(filters,'div','mi-sort');
    function route(change){if(dead||controller.signal.aborted)return;var p=new URLSearchParams();var next=Object.assign({q:query,sort:sort},change);if(next.q)p.set('q',next.q);if(next.sort!=='newest')p.set('sort',next.sort);w.location.hash='/?'+p.toString();}
    form.addEventListener('submit',function(e){e.preventDefault();route({q:input.value.trim()});});
    menus.push(w.MosaicPopover.mount(sortHost,{label:'Sort insights',value:sort,options:[{value:'newest',label:'Newest first'},{value:'oldest',label:'Oldest first'},{value:'title',label:'Title A–Z'}],onChange:function(v){route({sort:v});}}));
    var selected=add(pageBody,'div','mi-selection');
    if(query){add(selected,'span','mi-chip','Search: '+query);var clear=add(selected,'button','mo-quiet','Clear search');clear.type='button';clear.addEventListener('click',function(){route({q:''});});}
    var status=add(pageBody,'p','mi-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');var grid=add(pageBody,'div','mi-grid');
    var message=add(pageBody,'div','mi-message');message.hidden=true;var paging=add(pageBody,'div','mi-paging'),more=add(paging,'button','mo-button mo-button-secondary','Load more');more.type='button';more.hidden=true;
    function error(host,e,again){host.hidden=false;host.replaceChildren();host.setAttribute('role','alert');add(host,'p','',e.message||'Insights could not be loaded.');var retry=add(host,'button','mo-quiet','Try again');retry.type='button';retry.addEventListener('click',again);}
    function card(p,index){var a=el('a','mi-card');var u;try{u=new URL(p.url,w.location.href);}catch(_){return null;}if(u.origin!==w.location.origin||u.pathname!==cfg.contextPath+'/pages/viewpage.action'||!/^\d+$/.test(u.searchParams.get('pageId')||''))return null;a.href=u.href;a.dataset.mosaicResult='';var media=add(a,'div','mi-card-media'),img=add(media,'img');img.src=w.MosaicConfig.cover(cfg,p.id);img.width=800;img.height=500;img.setAttribute('loading',index<3?'eager':'lazy');img.setAttribute('decoding','async');img.alt='';var imageHandle=w.MosaicMedia?.prepare(img,media,{eager:index<3,priority:index===0});if(imageHandle)mediaHandles.push(imageHandle);add(media,'span','mi-card-arrow','↗').setAttribute('aria-hidden','true');var body=add(a,'div','mi-card-body');var stamp=new Date(p.created);add(body,'p','mi-card-meta','Mosaic');add(body,'h2','',p.title);add(body,'p','mi-card-summary',p.excerpt||'Explore this insight from the Mosaic team.');if(p.created&&!isNaN(stamp))add(body,'time','mi-card-date',stamp.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})).dateTime=stamp.toISOString();return a;}
    function render(){var present=new Set(Array.from(grid.children,function(card){return card.dataset.pageId;}));if(!rows.length){mediaHandles.splice(0).forEach(function(handle){handle.destroy();});grid.replaceChildren();}rows.forEach(function(p,index){if(present.has(String(p.id)))return;var c=card(p,index);if(c){c.dataset.pageId=String(p.id);grid.appendChild(c);}});status.textContent=rows.length?rows.length+(rows.length===1?' insight':' insights')+(hasMore?' loaded':'')+(query?' for “'+query+'”':''):'';more.hidden=!hasMore||loadedPages>=maxPages;more.disabled=busy||loadedPages>=maxPages;}
    function rememberPages(){var p=new URLSearchParams((w.location.hash.split('?')[1]||''));if(loadedPages>1)p.set('pages',loadedPages);else p.delete('pages');w.history.replaceState(null,'','#/?'+p.toString());}
    async function load(count){
      if(dead||busy||controller.signal.aborted||loadedPages>=maxPages)return;
      count=Math.min(count,maxPages-loadedPages);busy=true;more.disabled=true;message.hidden=true;grid.setAttribute('aria-busy','true');status.textContent=rows.length?'Loading more insights…':'Loading insights…';
      var completed=0,partial=false;
      try{
        for(var i=0;i<count;i++){
          var result=await api.insights(query,{sort:sort,start:nextStart,limit:12,signal:controller.signal});
          if(dead||controller.signal.aborted){settleReady('cancelled');return;}
          var ids=new Set(rows.map(function(p){return p.id;})),incoming=result.results.filter(function(p){if(ids.has(p.id))return false;ids.add(p.id);return true;});
          if(result.hasMore&&(!incoming.length||result.nextStart<=nextStart))throw Error('The insight list changed while loading. Reload this page to continue.');
          rows=rows.concat(incoming);hasMore=result.hasMore;nextStart=hasMore?result.nextStart:nextStart+result.results.length;loadedPages++;completed++;render();
          if(result.complete===false){
            partial=true;hasMore=false;more.hidden=true;
            error(message,{message:result.warning||'Some insights could not be loaded. Try again to load the full collection.'},function(){
              if(dead||busy||controller.signal.aborted)return;
              rows=[];nextStart=0;hasMore=false;loadedPages=0;render();load(restore);
            });
            status.textContent=rows.length?rows.length+' insights shown from an incomplete collection.':'';settleReady('error');break;
          }
          // A saved route may restore fifty pages. The first useful page is
          // sufficient for startup; subsequent restoration keeps its local busy state.
          if(rows.length)settleReady('ready');
          if(!hasMore)break;
        }
        if(!partial&&!rows.length){message.hidden=false;message.setAttribute('role','status');message.replaceChildren();add(message,'h2','',query?'No matching insights':'More perspectives are on the way');add(message,'p','',query?'Try another search phrase.':'Published pages will appear here as the team adds them.');}
        else if(!partial&&loadedPages>=maxPages&&hasMore){message.hidden=false;message.setAttribute('role','status');message.replaceChildren();add(message,'p','','To see more insights, narrow your search.');}
        rememberPages();
        settleReady('ready');
      }catch(e){if(!dead&&!controller.signal.aborted){error(message,e,function(){load(Math.max(1,count-completed));});status.textContent=rows.length?rows.length+' insights loaded.':'';settleReady('error');}else settleReady('cancelled');}
      finally{busy=false;if(!dead){grid.removeAttribute('aria-busy');more.disabled=loadedPages>=maxPages;more.hidden=!hasMore||loadedPages>=maxPages;}}
    }
    more.addEventListener('click',function(){load(1);});load(restore);
    return {ready:ready,destroy:function(){if(dead)return;dead=true;abort();heroImage.removeEventListener('error',hideHero);heroMedia?.destroy();mediaHandles.splice(0).forEach(function(handle){handle.destroy();});menus.forEach(function(menu){menu.destroy();});if(options.signal)options.signal.removeEventListener('abort',abort);root.remove();}};
  }w.MosaicInsights={mount:mount};
})(window,document);

;
/* Mosaic Home / About / Resources. Native Confluence remains the content store. */
(function(w,d){'use strict';
  if(w.MosaicSite)return;
  var cfg,api,root,role,controller,editor,cleanup=[],generation=0,lastHash='',mounted=false,pageReady;
  var arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  var glass='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.7"/><path d="m16 16 4.5 4.5"/></svg>';
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function href(key){return w.MosaicConfig.page(cfg,key);}
  function asset(file){return w.MosaicConfig.asset(cfg,file);}
  function img(key){var curated={'mosaic-about':'47','mosaic-resources':'01','mosaic-team':'25','mosaic-foundations':'47'};return curated[key]?asset('mosaic-cover-'+curated[key]+'.webp'):w.MosaicConfig.cover(cfg,key);}
  function date(value){var v=new Date(value);return value&&!isNaN(v)?v.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';}
  function route(){var h=w.location.hash.slice(1),at=h.indexOf('?'),path=at<0?h:h.slice(0,at),q=new URLSearchParams(at<0?'':h.slice(at+1));return {path:path||'/',q:q.get('q')||'',start:Math.max(0,Number(q.get('start'))||0),parent:q.get('parent')};}
  function forbidden(){
    return /\/(?:admin|plugins\/servlet\/admin|spaces\/permissions)(?:\/|$)/i.test(w.location.pathname)||
      /(?:editpage|createpage|createblogpost|viewpreviousversions|diffpages|viewpagehistory|preview|spacepermissions)\.action$/i.test(w.location.pathname)||
      /[?&](?:pageVersion|preview|mosaicNativeUi)=/.test(w.location.search)||
      !!d.querySelector('#editpageform,#createpageform,#content-editor,body.contenteditor')||
      (w.top!==w.self&&!(cfg.mode==='preview'&&/^(localhost|127\.0\.0\.1)$/.test(w.location.hostname)));
  }
  function navigate(hash){w.location.hash=hash;}
  function nativeLink(url){try{var u=new URL(url,w.location.href);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:'';}catch(_){return '';}}
  function link(key,label,cls){return '<a class="'+(cls||'mo-link')+'" href="'+href(key)+'">'+esc(label)+arrow+'</a>';}
  function searchForm(value,label){return '<form class="mo-search-form" role="search">'+glass+'<label class="mo-sr" for="mo-query">'+esc(label||'Search Mosaic')+'</label><input id="mo-query" type="search" name="q" placeholder="'+esc(label||'Search Mosaic')+'" maxlength="160" autocomplete="off" value="'+esc(value)+'"><button class="mo-button" type="submit">Search</button></form>';}
  function bindSearch(parent){var form=root.querySelector('.mo-search-form');if(!form)return;form.addEventListener('submit',function(e){e.preventDefault();var q=form.elements.q.value.trim();navigate(q?'/search?q='+encodeURIComponent(q):'/');});}
  function statusBox(message,error){return '<div class="mo-empty'+(error?' mo-error':'')+'" role="'+(error?'alert':'status')+'"><p>'+esc(message)+'</p>'+(error?'<button class="mo-quiet" data-retry>Try again</button>':'')+'</div>';}
  function errors(target,error,retry){target.innerHTML=statusBox(error.message||'The content could not be loaded.',true);target.querySelector('[data-retry]').addEventListener('click',retry);}
  function enhanceMedia(target){var media=w.MosaicMedia?.mount(target);if(media)cleanup.push(function(){media.destroy();});}
  function card(p){var summary=p.excerpt||'Open this page to learn more.';return '<a class="mo-card" href="'+esc(p.url)+'"><div class="mo-card-media" data-mosaic-media-frame><img data-mosaic-media class="mo-card-image" src="'+esc(img(p.id))+'" width="1200" height="667" loading="eager" decoding="async" alt=""></div><div class="mo-card-body"><div class="mo-meta">'+esc(date(p.created)||'Mosaic')+'</div><h3>'+esc(p.title)+'</h3><p>'+esc(summary)+'</p><span class="mo-link">Read article '+arrow+'</span></div></a>';}
  async function latest(target,token){target.setAttribute('aria-busy','true');try{var list=await api.children(cfg.pages.insights,{limit:3,signal:controller.signal});if(token!==generation)return;target.innerHTML=list.results.length?'<div class="mo-grid">'+list.results.map(card).join('')+'</div>':statusBox('Articles and updates will appear here when they are published.');enhanceMedia(target);}catch(e){if(token!==generation)return;errors(target,e,function(){latest(target,token);});}finally{if(token===generation)target.removeAttribute('aria-busy');}}
  function home(token){root.innerHTML='<section class="mo-home-intro"><p class="mo-eyebrow">Welcome to Mosaic</p><h1>A connected future<br>for custody.</h1><p class="mo-lead">Understand the programme, find useful resources and discover what the team is working on.</p>'+searchForm('')+'<p class="mo-search-note">Search pages and articles across the whole Mosaic space.</p></section><section class="mo-section"><div class="mo-section-top"><h2>Explore Mosaic</h2></div><div class="mo-grid">'+[
    ['about','About us','Our purpose, the problems we are solving and how Mosaic fits together.','Discover Mosaic','mosaic-about'],
    ['resources','Resources','Your shared collection of useful tools, bookmarks and links.','Explore resources','mosaic-resources'],
    ['team','Meet the team','Find the people and teams behind the programme.','Meet the team','mosaic-team']
  ].map(function(a){return '<a class="mo-card" href="'+href(a[0])+'"><div class="mo-card-media" data-mosaic-media-frame><img data-mosaic-media class="mo-card-image" src="'+img(a[4])+'" width="1200" height="667" loading="eager" decoding="async" alt=""></div><div class="mo-card-body"><h3>'+a[1]+'</h3><p>'+a[2]+'</p><span class="mo-link">'+a[3]+arrow+'</span></div></a>';}).join('')+'</div></section><section class="mo-section mo-feature"><div class="mo-feature-title"><p class="mo-eyebrow">Built to work together</p><h2>Modular by design.<br>Connected by data.</h2><p>Explore the foundations of a more consistent, scalable custody platform.</p>'+link('about','Our approach')+'</div><div class="mo-feature-image" data-mosaic-media-frame tabindex="0" aria-label="Explore Mosaic’s approach"><img data-mosaic-media src="'+img('mosaic-foundations')+'" width="1200" height="667" loading="lazy" alt=""><button class="mo-feature-hint" aria-label="Show Mosaic approach">'+arrow+'</button><div class="mo-feature-panel"><h3>One connected picture</h3><p>Shared utilities, a standard data model and coordinated workflows across the custody lifecycle.</p>'+link('about','Explore Mosaic','mo-button')+'</div></div></section><section class="mo-section"><div class="mo-section-top"><h2>From Mosaic</h2>'+link('insights','View all insights')+'</div><div id="mo-latest"><div class="mo-grid" aria-hidden="true"><div class="mo-skeleton"></div><div class="mo-skeleton"></div><div class="mo-skeleton"></div></div></div></section>';bindSearch();var feature=root.querySelector('.mo-feature-image');feature.querySelector('button').addEventListener('click',function(){feature.removeAttribute('data-dismissed');feature.setAttribute('data-open','');});feature.addEventListener('pointerenter',function(){feature.removeAttribute('data-dismissed');});feature.addEventListener('focusin',function(){feature.removeAttribute('data-dismissed');});feature.addEventListener('keydown',function(e){if(e.key==='Escape'){feature.removeAttribute('data-open');root.querySelector('.mo-feature-title a').focus({preventScroll:true});feature.setAttribute('data-dismissed','');}});return latest(root.querySelector('#mo-latest'),token);}
  function about(){
    var acronym=[['M','Modular',''],['O','Orchestration','of'],['S','Settlements,',''],['A','Accounts','and'],['I','Integrated data','for'],['C','Custody','']];
    var capabilities=[
      {id:'csl',name:'Custody Securities Ledger',description:'A shared securities ledger supporting custody positions and movements across the custody lifecycle.'},
      {id:'cdu',name:'Custody Data Utility',description:'A shared data capability that helps custody services work with consistent information across applications.'},
      {id:'cmh',name:'Custody Messaging Hub',description:'A common messaging capability connecting custody services and the systems they exchange information with.'},
      {id:'cash',name:'Cash Hub',description:'A shared cash capability connecting cash processing with the wider custody lifecycle.'},
      {id:'fx',name:'FX Hub',description:'A shared foreign exchange capability connecting FX processing with custody services.'},
      {id:'tax',name:'Citi Tax Suite',description:'A shared tax capability supporting tax processing within the custody lifecycle.'}
    ];
    var challenges=[
      ['01','Built for evolving markets','Shorter settlement cycles, emerging asset classes and changing client needs call for a custody platform that can adapt.'],
      ['02','Less complexity','Move beyond tightly connected legacy applications and duplicated processing towards reusable capabilities and clearer workflows.'],
      ['03','Consistent, timely data','Reduce fragmentation across applications with a standardised data model and more connected information flows.']
    ];
    var benefits=[
      ['Client experience','Support a more consistent, flexible service across markets, with capabilities that can evolve for new asset classes.'],
      ['Technology efficiency','Build scalable, reusable utilities to improve reliability and make technology change easier to deliver.'],
      ['Operational efficiency','Improve transparency, reduce duplicate handling and create more opportunities for automation across custody operations.']
    ];
    var steps=[
      ['Modular utilities','Decompose monolithic applications into scalable services, each supporting a core function.'],
      ['A shared data model','Place data where it belongs and connect platforms through a standard canonical model and event-driven integration.'],
      ['Coordinated workflows','Process once across custody layers, with greater automation and a clearer view of operations.']
    ];
    var useCases=[
      ['Digital asset custody','Develop custody capabilities for digital assets, with the Custody Securities Ledger as a foundation for the custody lifecycle.','mosaic-cover-01.webp'],
      ['Global custody','Connect global custody with Direct Custody branches, third-party sub-custodians and token-capable services.','mosaic-cover-47.webp']
    ];
    function heading(id,title,lead,eyebrow){return '<header class="mo-about-heading">'+(eyebrow?'<p class="mo-eyebrow">'+esc(eyebrow)+'</p>':'')+'<h2 id="'+id+'">'+esc(title)+'</h2>'+(lead?'<p class="mo-lead">'+esc(lead)+'</p>':'')+'</header>';}
    root.innerHTML='<div class="mo-about-page">'+
      '<section class="mo-cube" aria-label="The meaning of Mosaic"><video autoplay muted loop playsinline preload="auto" aria-hidden="true" tabindex="-1"'+(cfg.mode==='preview'&&cfg.previewPoster?' poster="'+esc(cfg.previewPoster)+'"':'')+'><source src="'+esc(cfg.videoUrl||cfg.contextPath+'/download/attachments/'+cfg.attachmentPageId+'/hero-cube.webm?api=v2')+'"></video>'+
      '<div class="mo-cube-copy"><p class="mo-eyebrow">The foundations of our future</p><dl class="mo-acronym">'+acronym.map(function(row){return '<div><dt>'+row[0]+'</dt><dd>'+row[1]+(row[2]?' <small>'+row[2]+'</small>':'')+'</dd></div>';}).join('')+'</dl></div><button type="button" class="mo-video-toggle" aria-label="Pause animation" hidden><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button><span class="mo-video-note" role="status"></span></section>'+
      '<div class="mo-about-body"><header class="mo-about-intro"><p class="mo-eyebrow">Powering the future of custody</p><h1>About Mosaic</h1><p class="mo-lead">MOSAIC brings together modular technology and data-driven innovation to transform the custody lifecycle.</p><p>Our aim is a connected platform: reusable utilities, consistent data and coordinated workflows that help teams respond to change.</p></header>'+
      '<section class="mo-section" aria-labelledby="mo-purpose-title">'+heading('mo-purpose-title','Why Mosaic matters')+'<div class="mo-about-pillars">'+challenges.map(function(x){return '<article class="mo-about-pillar"><span class="mo-about-index" aria-hidden="true">'+x[0]+'</span><h3>'+x[1]+'</h3><p>'+x[2]+'</p></article>';}).join('')+'</div></section>'+
      '<section class="mo-section mo-about-process" aria-labelledby="mo-approach-title">'+heading('mo-approach-title','Build the foundations. Connect the possibilities.','','Our approach')+'<ol class="mo-about-steps" role="list">'+steps.map(function(x,index){return '<li><span class="mo-about-step-number" aria-hidden="true">0'+(index+1)+'</span><h3>'+x[0]+'</h3><p>'+x[1]+'</p></li>';}).join('')+'</ol></section>'+
      '<section class="mo-section" aria-labelledby="mo-benefits-title">'+heading('mo-benefits-title','What this enables','The programme aims to improve the experience for clients and the teams delivering custody services.')+'<ol class="mo-about-benefits" role="list">'+benefits.map(function(x,index){return '<li><span class="mo-about-index" aria-hidden="true">0'+(index+1)+'</span><h3>'+x[0]+'</h3><p>'+x[1]+'</p></li>';}).join('')+'</ol></section>'+
      '<section class="mo-section" aria-labelledby="mo-use-cases-title">'+heading('mo-use-cases-title','Custody for what comes next')+'<div class="mo-about-use-cases">'+useCases.map(function(x,index){return '<article class="mo-about-use-case"><div class="mo-about-use-media" data-mosaic-media-frame><img data-mosaic-media src="'+esc(asset(x[2]))+'" width="800" height="500" loading="lazy" decoding="async" alt=""></div><div class="mo-about-use-copy"><p class="mo-eyebrow">Use case 0'+(index+1)+'</p><h3>'+x[0]+'</h3><p>'+x[1]+'</p></div></article>';}).join('')+'</div></section>'+
      '<section class="mo-section mo-capabilities" aria-labelledby="mo-capabilities-title">'+heading('mo-capabilities-title','Connected capabilities','The programme’s building blocks span the custody lifecycle.')+'<ul class="mo-components">'+capabilities.map(function(item){return '<li><button type="button" class="mo-capability" data-capability="'+item.id+'" aria-pressed="false" aria-controls="mo-capability-panel" aria-describedby="mo-capability-hint">'+esc(item.name)+arrow+'</button></li>';}).join('')+'</ul><p id="mo-capability-hint" class="mo-capability-hint">Select a capability to keep its details open. Select it again to clear.</p><div id="mo-capability-panel" class="mo-capability-panel" role="region" aria-labelledby="mo-capability-title"><div class="mo-capability-copy" aria-live="polite" aria-atomic="true"><p class="mo-eyebrow" data-capability-state>Explore the building blocks</p><h3 id="mo-capability-title">How Mosaic connects</h3><p data-capability-description>Hover, focus or select a capability to learn more and find related resources.</p></div><a class="mo-link mo-capability-search" hidden>Search resources '+arrow+'</a></div></section>'+
      '<section class="mo-section mo-programme" id="mosaic-programme" aria-labelledby="mo-programme-title">'+heading('mo-programme-title','The programme in view.','Explore the approved rollout and the capabilities connecting Mosaic.','From strategy to delivery')+'<div data-mosaic-diagrams><p role="status">Loading programme diagrams…</p></div></section></div></div>';
    var section=root.querySelector('.mo-capabilities'),buttons=Array.from(section.querySelectorAll('[data-capability]')),
      panel=section.querySelector('.mo-capability-panel'),title=section.querySelector('#mo-capability-title'),description=section.querySelector('[data-capability-description]'),
      state=section.querySelector('[data-capability-state]'),search=section.querySelector('.mo-capability-search'),selected=null,listeners=[];
    function itemFor(button){return capabilities.find(function(item){return item.id===button.getAttribute('data-capability');});}
    function show(item){
      buttons.forEach(function(button){var id=button.getAttribute('data-capability');button.setAttribute('aria-pressed',String(!!selected&&id===selected.id));button.setAttribute('data-preview',String(!!item&&id===item.id));});
      panel.setAttribute('data-active',String(!!item));
      state.textContent=item?(selected===item?'Selected capability':'Capability overview'):'Explore the building blocks';
      title.textContent=item?item.name:'How Mosaic connects';
      description.textContent=item?item.description:'Hover, focus or select a capability to learn more and find related resources.';
      search.hidden=!item;
      if(item){search.setAttribute('href',href('home')+'#/search?q='+encodeURIComponent(item.name));search.setAttribute('aria-label','Search resources for '+item.name);}
      else{search.removeAttribute('href');search.removeAttribute('aria-label');}
    }
    function listen(element,event,handler){element.addEventListener(event,handler);listeners.push(function(){element.removeEventListener(event,handler);});}
    buttons.forEach(function(button){
      var item=itemFor(button);
      listen(button,'pointerenter',function(event){if(event.pointerType!=='touch')show(item);});
      listen(button,'focus',function(){show(item);});
      listen(button,'click',function(){selected=selected===item?null:item;show(item);});
    });
    listen(section,'pointerleave',function(){var focused=buttons.find(function(button){return button===d.activeElement;});if(focused)show(itemFor(focused));else if(!section.contains(d.activeElement))show(selected);});
    listen(section,'focusout',function(event){if(!section.contains(event.relatedTarget))show(selected);});
    listen(section,'keydown',function(event){if(event.key==='Escape'){selected=null;show(null);event.preventDefault();}});
    cleanup.push(function(){listeners.splice(0).forEach(function(remove){remove();});selected=null;});
    bindVideo();
    if(w.MosaicDiagramLoader){var diagrams=w.MosaicDiagramLoader.mount(root.querySelector('[data-mosaic-diagrams]'),cfg);cleanup.push(function(){diagrams.destroy();});return diagrams.ready;}
  }
  function bindVideo(){
    var v=root.querySelector('video'),b=root.querySelector('.mo-video-toggle'),note=root.querySelector('.mo-video-note'),disposed=false,failed=false,userPaused=false,suspended=false,pending=false,queued=false,blocked=false,gestureTried=false,attempts=0,wasHidden=d.hidden,readyEvents=new Set(),listeners=[];
    function wanted(){return !disposed&&!failed&&!userPaused&&!suspended&&!d.hidden;}
    function pause(){try{v.pause();}catch(_){}b.hidden=true;}
    function listen(target,type,handler,capture){if(!target?.addEventListener)return;target.addEventListener(type,handler,!!capture);listeners.push(function(){target.removeEventListener(type,handler,!!capture);});}
    function configure(){
      // Set both default and live mute before autoplay/play. Some embedded
      // browsers inspect the attributes while choosing an autoplay policy.
      v.defaultMuted=true;v.muted=true;v.loop=true;v.playsInline=true;
      ['muted','loop','playsinline'].forEach(function(name){v.setAttribute(name,'');});
      v.preload=wanted()?'auto':'metadata';v.autoplay=wanted();
    }
    function settled(error){
      pending=false;if(!wanted()){queued=false;pause();return;}
      if(error){
        b.hidden=true;if(error.name==='NotSupportedError'){unavailable('This browser cannot play the video format returned by the attachment.');return;}
        blocked=error.name!=='AbortError';if(blocked)note.textContent=error.name==='NotAllowedError'?'Animation is paused by your browser.':'Animation could not start automatically.';
      }
      var retry=queued&&v.paused;queued=false;if(retry)play();
    }
    function play(){
      if(!wanted())return;
      if(pending){queued=true;return;}
      if(!v.paused&&!v.ended||attempts>=4)return;
      configure();attempts++;pending=true;var result;
      try{result=v.play();}catch(error){settled(error);return;}
      Promise.resolve(result).then(function(){settled(null);},settled);
    }
    function cycle(){attempts=0;readyEvents.clear();gestureTried=false;}
    function sync(){
      configure();if(wanted())play();
      else{queued=false;pause();}
    }
    function ready(event){if(readyEvents.has(event.type)||!wanted()||!v.paused)return;readyEvents.add(event.type);play();}
    function gesture(event){
      if(!blocked||gestureTried||!wanted()||event.defaultPrevented||event.target===b||b.contains(event.target))return;
      if(event.type==='keydown'&&(event.ctrlKey||event.metaKey||event.altKey||['Shift','Control','Alt','Meta','Escape'].includes(event.key)))return;
      gestureTried=true;attempts=0;play();
    }
    function unavailable(message){
      if(disposed)return;failed=true;queued=false;v.autoplay=false;pause();
      var code=v.error&&v.error.code;
      note.textContent=typeof message==='string'?message:code===2?'Animation could not be loaded. Check your connection or attachment access.':code===3?'This browser could not decode the animation.':code===4?'This browser cannot play the video format returned by the attachment.':'Animation unavailable. Check the attachment access and video format.';
    }
    listen(b,'click',function(){var focused=d.activeElement===b;userPaused=true;v.autoplay=false;pause();note.textContent='Animation paused.';if(focused){var hero=v.closest('.mo-cube');hero.tabIndex=-1;hero.focus({preventScroll:true});}});
    listen(v,'playing',function(){if(wanted()){blocked=false;b.hidden=false;note.textContent='';}else pause();});
    listen(v,'pause',function(){b.hidden=true;});['loadedmetadata','loadeddata','canplay','canplaythrough'].forEach(function(type){listen(v,type,ready);});
    listen(v,'ended',function(){if(!wanted())return;try{v.currentTime=0;}catch(_){}cycle();play();});
    listen(v,'error',unavailable);listen(v.querySelector('source'),'error',unavailable);
    listen(d,'visibilitychange',function(){if(wasHidden&&!d.hidden)cycle();wasHidden=d.hidden;sync();});
    listen(w,'pagehide',function(){suspended=true;v.autoplay=false;queued=false;pause();});
    listen(w,'pageshow',function(){suspended=false;cycle();sync();});
    listen(d,'pointerdown',gesture,true);listen(d,'keydown',gesture,true);
    cleanup.push(function(){disposed=true;v.autoplay=false;listeners.splice(0).forEach(function(remove){remove();});pause();});sync();
  }
  function resources(token,r){
    root.innerHTML='';var component=w.MosaicResources.mount(root,{config:cfg,signal:controller.signal,query:r.q});
    cleanup.push(function(){component.destroy();});return component.ready;
  }
  function insights(){root.innerHTML='';var component=w.MosaicInsights.mount(root,{config:cfg,api:api,signal:controller.signal});cleanup.push(function(){component.destroy();});return component.ready;}
  function results(token,r){root.innerHTML='<h1>Search Mosaic</h1>'+searchForm(r.q)+'<section class="mo-section"><div class="mo-results-top"><h2>Results for “'+esc(r.q)+'”</h2><a class="mo-link" href="#/">Back to home</a></div><div id="mo-collection"></div></section>';bindSearch();return collection(root.querySelector('#mo-collection'),token,r);}
  async function collection(target,token,r,parent){target.setAttribute('aria-busy','true');target.innerHTML='<p class="mo-status" role="status">'+(r.q?'Searching…':'Loading pages…')+'</p>';try{var list=r.q?await api.search(r.q,{start:r.start,limit:12,signal:controller.signal,parentId:parent}):await api.children(parent,{start:r.start,limit:12,signal:controller.signal});if(token!==generation)return;target.innerHTML=list.results.length?list.results.map(function(p){return '<article class="mo-result"><div class="mo-meta">'+esc(date(p.updated)||'Mosaic page')+'</div><h3><a href="'+esc(p.url)+'">'+esc(p.title)+'</a></h3><p>'+esc(p.excerpt||'Open this page to learn more.')+'</p></article>';}).join(''):statusBox(r.q?'No matching pages. Try a shorter phrase or a different keyword.':'No resources have been published here yet.');if(list.results.length||r.start||list.hasMore){target.insertAdjacentHTML('beforeend','<nav class="mo-pagination" aria-label="Results pages"><span>'+(r.start?'':'')+'</span><span class="mo-meta">'+(list.results.length?'Showing '+(r.start+1)+'–'+(r.start+list.results.length):'No pages on this page')+'</span><span></span></nav>');var pager=target.querySelector('.mo-pagination');function page(start,label,slot){var a=d.createElement('a');a.className='mo-button mo-button-secondary';a.textContent=label;a.href=(r.q?'#/search?q='+encodeURIComponent(r.q)+'&':'#/?')+'start='+start;pager.children[slot].append(a);}if(r.start)page(Math.max(0,r.start-12),'Previous',0);if(list.hasMore)page(list.nextStart,'Next',2);}target.insertAdjacentHTML('afterbegin','<p class="mo-sr" role="status">'+list.results.length+' results loaded.</p>');}catch(e){if(token===generation)errors(target,e,function(){collection(target,token,r,parent);});}finally{if(token===generation)target.removeAttribute('aria-busy');}}
  async function writing(token,r){
    root.innerHTML='<p class="mo-status" role="status">Opening the editor…</p>';
    try{
      var id=(r.path.match(/^\/edit\/([1-9]\d*)$/)||[])[1],
        moduleReady=w.MosaicEditorLoader?.load?w.MosaicEditorLoader.load(cfg):w.MosaicEditor?Promise.resolve(w.MosaicEditor):Promise.reject(new Error('The editor loader is unavailable. Refresh this page and try again.')),
        loaded=await Promise.all([id?api.getPage(id,{signal:controller.signal}):Promise.resolve(null),moduleReady]);
      if(token!==generation)return;
      var page=loaded[0],editorAPI=loaded[1]||w.MosaicEditor;
      if(!editorAPI||typeof editorAPI.mount!=='function')throw new Error('The editor could not finish loading. Try again.');
      root.innerHTML='';
      var instance=editorAPI.mount(root,{
        api:api,config:cfg,page:page,parentId:cfg.pages.insights,
        onCancel:function(){if(instance&&token===generation&&editor===instance)navigate('/');},
        onPublished:function(p){
          if(token!==generation||!instance||editor!==instance)return;
          // Release the specific editor before navigation. Clearing its shared
          // handle first also makes reentrant cleanup and late callbacks inert.
          var completed=instance;editor=null;instance=null;completed.destroy();
          if(token===generation)w.location.assign(p.url||href(p.id));
        }
      });
      editor=instance;
    }catch(e){if(token===generation)errors(root,e,function(){writing(token,r);});}
  }
  function team(){root.innerHTML='<div data-mosaic-team></div>';var component=w.MosaicTeamLoader.mount(root.querySelector('[data-mosaic-team]'),cfg);cleanup.push(function(){component.destroy();});return component.ready;}
  function render(event){
    var restoreSearchFocus=!!d.activeElement?.matches('form.mosaic-search input[type="search"]'),r=route();
    if(editor&&editor.isPublishing&&editor.isPublishing()){w.history.replaceState(null,'',lastHash||'#/');return pageReady;}
    if(editor&&editor.hasUnsavedChanges()&&!w.confirm('Leave this article and discard your unsaved changes?')){w.history.replaceState(null,'',lastHash||'#/');return pageReady;}
    lastHash=w.location.hash;var host=w.MosaicHost.boot(cfg);
    generation++;var token=generation;controller?.abort();controller=new AbortController();
    editor?.destroy();editor=null;cleanup.splice(0).forEach(function(fn){fn();});
    var initial;
    if(['home','resources','insights'].includes(role)&&(/^\/new$/.test(r.path)||/^\/edit\/[1-9]\d*$/.test(r.path)))initial=writing(token,r);
    else if(role==='about')initial=about();
    else if(role==='resources')initial=resources(token,r);
    else if(role==='team')initial=team();
    else if(role==='insights')initial=insights();
    else if(r.path==='/search'&&r.q.trim())initial=results(token,r);
    else initial=home(token);
    enhanceMedia(root);var searchControl=w.MosaicSearch?.enhance(root);
    if(searchControl)cleanup.push(function(){searchControl.destroy();});
    pageReady=w.MosaicPageReady?w.MosaicPageReady.run({target:root,initial:initial,host:host,signal:controller.signal}):Promise.resolve(initial).then(function(){if(token===generation)w.MosaicHost.ready();});
    var heading=root.querySelector('h1');heading?.setAttribute('tabindex','-1');
    if(event&&event.type==='hashchange'){
      var focusTarget=restoreSearchFocus?root.querySelector('form.mosaic-search input[type=search]'):heading;
      (focusTarget||heading)?.focus({preventScroll:true});
      if(root.scrollIntoView)root.scrollIntoView({block:'start',behavior:'auto'});
    }
    return pageReady;
  }
  async function boot(){if(mounted)return pageReady;root=d.querySelector('[data-mosaic-root]');if(!root)return;cfg=w.MosaicConfig.resolve(w.MOSAIC_CONFIG);role=root.getAttribute('data-mosaic-role');if(!['home','about','resources','team','insights'].includes(role))return;var nativeId=(d.querySelector('meta[name="ajs-page-id"]')||{}).content;var nativeSpace=(d.querySelector('meta[name="ajs-space-key"]')||{}).content;try{nativeId=nativeId||(w.AJS&&w.AJS.Meta.get('page-id'));nativeSpace=nativeSpace||(w.AJS&&w.AJS.Meta.get('space-key'));}catch(_){}var nativeURL=new URL(w.location.href),overview=nativeURL.pathname===cfg.contextPath+'/spaces/'+cfg.spaceKey+'/overview'||nativeURL.pathname===cfg.contextPath+'/spaces/'+cfg.spaceKey+'/overview/';nativeId=nativeId||nativeURL.searchParams.get('pageId');if(overview&&(!nativeSpace||nativeSpace===cfg.spaceKey)){nativeId=nativeId||cfg.pages.home;if(String(nativeId)===String(cfg.pages.home))nativeSpace=nativeSpace||cfg.spaceKey;}if(forbidden())return;if(String(nativeId||'')!==String(cfg.pages[role])||nativeSpace!==cfg.spaceKey){root.innerHTML='<p>This Mosaic layout is only available on its configured page.</p>';w.MosaicStartup?.cancel();return;}mounted=true;w.MosaicLibraries.configure(cfg);api=w.MosaicAPI.create(cfg);w.MosaicHost.boot(cfg);w.addEventListener('hashchange',render);root.addEventListener('click',rememberReturn);return render();}
  function rememberReturn(e){var a=e.target.closest('.mo-result a,[data-mosaic-result],.mrs-card,.mo-card');if(!a)return;var r=route();try{var u=new URL(a.href,w.location.href),id=u.searchParams.get('pageId');if(id)w.sessionStorage.setItem('mosaic.return-results',JSON.stringify({url:w.location.href,pageId:id,savedAt:Date.now()}));}catch(_){}}
  function destroy(){root?.removeEventListener('click',rememberReturn);generation++;controller?.abort();editor?.destroy();cleanup.splice(0).forEach(function(fn){fn();});w.removeEventListener('hashchange',render);mounted=false;}
  w.MosaicSite={boot:boot,destroy:destroy,_test:{escape:esc,route:route,safeLink:nativeLink}};
  // The shared navbar bootstrap owns DOM readiness and initial activation.
})(window,document);

;
/* The shared navbar boots both page macros and native published articles. */
(function(w,d){
  'use strict';
  if(w.MosaicBootstrap)return;
  var ready;
  function start(){
    var config=w.MOSAIC_CONFIG;
    w.MosaicLibraries.configure(config);w.MosaicNavbar.boot(config);
    if(d.querySelector('[data-mosaic-root]'))return w.MosaicSite.boot();
    var host=w.MosaicHost.boot(config);
    return w.MosaicPageReady.run({host:host,native:true});
  }
  function boot(){
    if(!ready)ready=d.readyState==='loading'?new Promise(function(resolve,reject){
      d.addEventListener('DOMContentLoaded',function(){try{resolve(start());}catch(error){reject(error);}},{once:true});
    }):Promise.resolve().then(start);
    // A navbar injected after a page macro adopts the existing readiness result.
    return ready.then(function(result){
      if(result?.status==='ready')w.MosaicStartup?.finish();else w.MosaicStartup?.cancel();
      return result;
    },function(error){w.MosaicStartup?.cancel();throw error;});
  }
  w.MosaicBootstrap=Object.freeze({boot:boot});
  boot().catch(function(error){w.MosaicHost?.error(error.message);});
})(window,document);
