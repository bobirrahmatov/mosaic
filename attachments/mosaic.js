/* Mosaic space-wide file-drop guard. Use explicit file choosers to upload.
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
    notice.textContent='File drag-and-drop is disabled. Use Image or Attach file in the editor.';
    w.clearTimeout(timer);timer=w.setTimeout(function(){notice?.remove();notice=null;},5000);
  }
  function block(event){if(!active()||!files(event.dataTransfer))return;event.preventDefault();event.stopImmediatePropagation();try{event.dataTransfer.dropEffect='none';}catch(_){}if(event.type==='drop')inform();}
  function boot(){if(installed)return;installed=true;['dragenter','dragover','drop'].forEach(function(type){w.addEventListener(type,block,{capture:true,passive:false});});}
  function destroy(){installed=false;['dragenter','dragover','drop'].forEach(function(type){w.removeEventListener(type,block,true);});w.clearTimeout(timer);notice?.remove();notice=null;}
  w.MosaicFileDropGuard=Object.freeze({boot:boot,destroy:destroy,isActive:active});boot();
})(window,document);

;
/* Shared Mosaic deployment configuration. Keep page IDs in one place. */
(function(w){'use strict';
  if(w.MosaicConfig)return;
  var defaults={spaceKey:'mosaic',rootPageId:'3961414584',attachmentPageId:'3981001251',contextPath:'/confluence',pages:{home:'3961414584',about:'3981001532',team:'3981001536',resources:'3981001538',insights:'3981001542'},resources:[]};
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
  var STYLE_LABELS = ['hide-actions','hide-comments','hide-footer'];

  function fault(message, code, status) {
    var error = new Error(message); error.code = code || 'API_ERROR';
    if (status) error.status = status;
    return error;
  }
  function numeric(value, name) {
    if (!/^[1-9]\d{0,19}$/.test(String(value || ''))) throw fault('Configure a numeric ' + name + '.', 'CONFIGURATION');
    return String(value);
  }
  function quote(value) { return '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
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
    var excludes = Array.from(new Set([rootId, assetId].concat(config.excludePageIds || []).map(function (id) { return numeric(id, 'excluded page ID'); })));
    var excludedTrees = Array.from(new Set([assetId].concat(config.excludeAncestorIds || []).map(function (id) { return numeric(id, 'excluded ancestor ID'); })));
    var verifiedRoot = null, mutation = false, pending = null, uploads = new WeakMap(), uploadSequence = 0;
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
      if (!/^[1-9]\d*$/.test(id) || page.type !== 'page' || page.status !== 'current' || !page.space || page.space.key !== space || !Array.isArray(ancestors) || (id === rootId ? !allowRoot : !ancestors.some(function (item) { return String(item.id) === rootId; }))) throw fault('Confluence returned a page outside Mosaic.', 'INVALID_SCOPE');
      if (!allowExcluded && id !== rootId && excluded(page)) throw fault('This page is not part of the Mosaic content collection.', 'INVALID_SCOPE');
      if (parent && String(ancestors.at(-1) && ancestors.at(-1).id) !== parent) throw fault('Confluence returned a page outside the requested collection.', 'INVALID_SCOPE');
      return page;
    }
    async function ensureRoot(signal) {
      if (!verifiedRoot) {
        // Do not tie the shared identity read to one search caller's cancellation.
        verifiedRoot = request('/rest/api/content/' + rootId + '?expand=space,ancestors').then(function (page) {
          if (String(page.id) !== rootId) throw fault('The Mosaic root identity could not be verified.', 'INVALID_SCOPE');
          return scope(page, true);
        }).catch(function (error) { verifiedRoot = null; throw error; });
      }
      await verifiedRoot;
      if (signal && signal.aborted) throw fault('The request was cancelled.', 'ABORTED');
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
    function result(data, options, parent, subtree, topic) {
      if (!Array.isArray(data.results) || data.results.length > options.limit) throw fault('Confluence returned an invalid page collection.', 'INVALID_RESPONSE');
      var seen = new Set();
      var results = data.results.map(function (page) {
        scope(page, false, parent, true);
        if (subtree && !page.ancestors.some(function (item) { return String(item.id) === subtree; })) throw fault('Confluence returned a page outside the requested collection.', 'INVALID_SCOPE');
        if (topic && String(page.id) !== topic && !page.ancestors.some(function (item) { return String(item.id) === topic; })) throw fault('Confluence returned a page outside the requested topic.', 'INVALID_SCOPE');
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
      await ensureRoot(options.signal); if (parent) await getPage(parent, {signal:options.signal});
      var topic = options.topicId ? numeric(options.topicId, 'topic page ID') : null;
      if (topic) {
        if (!parent) throw fault('A topic needs a configured parent collection.', 'INVALID_SCOPE');
        var topicPage = await getPage(topic, {signal:options.signal});
        if (topicPage.parentId !== parent) throw fault('Choose a topic within the selected collection.', 'INVALID_SCOPE');
      }
      var clauses = ['type = page','space = ' + quote(space),'ancestor = ' + rootId,'id NOT IN (' + excludes.join(',') + ')','title != "navBar"'];
      excludedTrees.forEach(function (id) { clauses.push('ancestor != ' + id); });
      if (parent) clauses.push('ancestor = ' + parent);
      if (topic) clauses.push('(id = ' + topic + ' OR ancestor = ' + topic + ')');
      var term = String(query || '').trim(); if (term.length > 250) throw fault('Keep the search to 250 characters or fewer.', 'INVALID_QUERY');
      // CQL quoting is separate from its Lucene text expression escaping.
      if (term) clauses.push('text ~ ' + quote(term.replace(/([+\-!(){}\[\]^"~*?:\\/|&])/g, '\\$1')));
      var orders = {updated:'lastmodified DESC',newest:'created DESC',oldest:'created ASC',title:'title ASC'};
      if (options.sort && !Object.prototype.hasOwnProperty.call(orders,options.sort)) throw fault('Choose an available sort order.', 'INVALID_QUERY');
      var cql = clauses.join(' AND ') + ' ORDER BY ' + orders[options.sort || 'updated'];
      var data = await request('/rest/api/content/search?' + new URLSearchParams({cql:cql,start:page.start,limit:page.limit,expand:PAGE_EXPAND}), {signal:options.signal});
      return result(data, page, null, parent, topic);
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
      if (![pages.insights, pages.resources].map(String).includes(parentId)) throw fault('Choose the configured Insights or Resources collection.', 'INVALID_SCOPE');
      var id = input.id ? numeric(input.id, 'article page ID') : null;
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
    return Object.freeze({search:search,children:children,getPage:getPage,publish:publish,uploadAttachment:uploadAttachment,listAttachments:listAttachments,getPendingPublication:function () { return pending ? Object.assign({}, pending,storageParts(pending.html,pending.id,context)) : null; },user:async function () { await ensureRoot(); return request('/rest/api/user/current'); }});
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
/* Mosaic Confluence host integration. Styles the real page tree; native handlers
 * remain responsible for layout and collapse state. PAL icons retain the license
 * in attachments/licenses/sidebar-icons-LICENSE.txt. */
(function (w, d) {
  'use strict';
  if (w.MosaicHost) return;
  var ICONS = {"home":"M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z","about":"M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H18.5001C19.7427 20.75 20.7501 19.7426 20.7501 18.5V5.5C20.7501 4.25736 19.7427 3.25 18.5001 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H18.5001C18.9143 4.75 19.2501 5.08579 19.2501 5.5V18.5C19.2501 18.9142 18.9143 19.25 18.5001 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V5.5ZM6.25005 9.7143C6.25005 9.30008 6.58583 8.9643 7.00005 8.9643L17 8.96429C17.4143 8.96429 17.75 9.30008 17.75 9.71429C17.75 10.1285 17.4143 10.4643 17 10.4643L7.00005 10.4643C6.58583 10.4643 6.25005 10.1285 6.25005 9.7143ZM6.25005 14.2857C6.25005 13.8715 6.58583 13.5357 7.00005 13.5357H17C17.4143 13.5357 17.75 13.8715 17.75 14.2857C17.75 14.6999 17.4143 15.0357 17 15.0357H7.00005C6.58583 15.0357 6.25005 14.6999 6.25005 14.2857Z","team":"M8.80443 5.60156C7.59109 5.60156 6.60749 6.58517 6.60749 7.79851C6.60749 9.01185 7.59109 9.99545 8.80443 9.99545C10.0178 9.99545 11.0014 9.01185 11.0014 7.79851C11.0014 6.58517 10.0178 5.60156 8.80443 5.60156ZM5.10749 7.79851C5.10749 5.75674 6.76267 4.10156 8.80443 4.10156C10.8462 4.10156 12.5014 5.75674 12.5014 7.79851C12.5014 9.84027 10.8462 11.4955 8.80443 11.4955C6.76267 11.4955 5.10749 9.84027 5.10749 7.79851ZM4.86252 15.3208C4.08769 16.0881 3.70377 17.0608 3.51705 17.8611C3.48384 18.0034 3.5211 18.1175 3.60712 18.2112C3.70161 18.3141 3.86659 18.3987 4.07591 18.3987H13.4249C13.6343 18.3987 13.7992 18.3141 13.8937 18.2112C13.9797 18.1175 14.017 18.0034 13.9838 17.8611C13.7971 17.0608 13.4132 16.0881 12.6383 15.3208C11.8821 14.572 10.6899 13.955 8.75042 13.955C6.81096 13.955 5.61877 14.572 4.86252 15.3208ZM3.8071 14.2549C4.87163 13.2009 6.45602 12.455 8.75042 12.455C11.0448 12.455 12.6292 13.2009 13.6937 14.2549C14.7397 15.2906 15.2207 16.5607 15.4446 17.5202C15.7658 18.8971 14.6071 19.8987 13.4249 19.8987H4.07591C2.89369 19.8987 1.73504 18.8971 2.05628 17.5202C2.28015 16.5607 2.76117 15.2906 3.8071 14.2549ZM15.3042 11.4955C14.4702 11.4955 13.7006 11.2193 13.0821 10.7533C13.3742 10.3314 13.6054 9.86419 13.7632 9.36432C14.1597 9.75463 14.7039 9.99545 15.3042 9.99545C16.5176 9.99545 17.5012 9.01185 17.5012 7.79851C17.5012 6.58517 16.5176 5.60156 15.3042 5.60156C14.7039 5.60156 14.1597 5.84239 13.7632 6.23271C13.6054 5.73284 13.3741 5.26561 13.082 4.84371C13.7006 4.37777 14.4702 4.10156 15.3042 4.10156C17.346 4.10156 19.0012 5.75674 19.0012 7.79851C19.0012 9.84027 17.346 11.4955 15.3042 11.4955ZM19.9248 19.8987H16.3901C16.7014 19.4736 16.9159 18.969 16.9827 18.3987H19.9248C20.1341 18.3987 20.2991 18.3141 20.3936 18.2112C20.4796 18.1175 20.5169 18.0034 20.4837 17.861C20.2969 17.0607 19.913 16.088 19.1382 15.3208C18.4047 14.5945 17.261 13.9921 15.4231 13.9566C15.2232 13.6945 14.9995 13.437 14.7491 13.1891C14.5144 12.9566 14.262 12.7384 13.9916 12.5362C14.3853 12.4831 14.8044 12.4549 15.2503 12.4549C17.5447 12.4549 19.1291 13.2008 20.1936 14.2549C21.2395 15.2906 21.7206 16.5607 21.9444 17.5202C22.2657 18.8971 21.107 19.8987 19.9248 19.8987Z","resources":"M8.50391 4.25C8.50391 3.83579 8.83969 3.5 9.25391 3.5H15.2777C15.4766 3.5 15.6674 3.57902 15.8081 3.71967L18.2807 6.19234C18.4214 6.333 18.5004 6.52376 18.5004 6.72268V16.75C18.5004 17.1642 18.1646 17.5 17.7504 17.5H16.248V17.4993H14.748V17.5H9.25391C8.83969 17.5 8.50391 17.1642 8.50391 16.75V4.25ZM14.748 19H9.25391C8.01126 19 7.00391 17.9926 7.00391 16.75V6.49854H6.24805C5.83383 6.49854 5.49805 6.83432 5.49805 7.24854V19.75C5.49805 20.1642 5.83383 20.5 6.24805 20.5H13.998C14.4123 20.5 14.748 20.1642 14.748 19.75L14.748 19ZM7.00391 4.99854V4.25C7.00391 3.00736 8.01127 2 9.25391 2H15.2777C15.8745 2 16.4468 2.23705 16.8687 2.659L19.3414 5.13168C19.7634 5.55364 20.0004 6.12594 20.0004 6.72268V16.75C20.0004 17.9926 18.9931 19 17.7504 19H16.248L16.248 19.75C16.248 20.9926 15.2407 22 13.998 22H6.24805C5.00541 22 3.99805 20.9926 3.99805 19.75V7.24854C3.99805 6.00589 5.00541 4.99854 6.24805 4.99854H7.00391Z","insights":"M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H18.5001C19.7427 20.75 20.7501 19.7426 20.7501 18.5V5.5C20.7501 4.25736 19.7427 3.25 18.5001 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H18.5001C18.9143 4.75 19.2501 5.08579 19.2501 5.5V18.5C19.2501 18.9142 18.9143 19.25 18.5001 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V5.5ZM6.25005 9.7143C6.25005 9.30008 6.58583 8.9643 7.00005 8.9643L17 8.96429C17.4143 8.96429 17.75 9.30008 17.75 9.71429C17.75 10.1285 17.4143 10.4643 17 10.4643L7.00005 10.4643C6.58583 10.4643 6.25005 10.1285 6.25005 9.7143ZM6.25005 14.2857C6.25005 13.8715 6.58583 13.5357 7.00005 13.5357H17C17.4143 13.5357 17.75 13.8715 17.75 14.2857C17.75 14.6999 17.4143 15.0357 17 15.0357H7.00005C6.58583 15.0357 6.25005 14.6999 6.25005 14.2857Z"};
  var DEFAULTS = {spaceKey:'mosaic', rootPageId:'3961414584', contextPath:'/confluence',
    pageIds:{home:'3961414584',about:'3981001532',team:'3981001536',resources:'3981001538',insights:'3981001542'}};
  var nativeToggle = '.acs-side-bar-toggle,.ia-toggle-button,.expand-collapse-trigger';
  var floating = 'aui-dropdown-menu,.aui-dropdown2,.aui-layer,[role="menu"],[role="listbox"],[role="dialog"]';
  var cfg, state = {active:false,pending:false,pageId:'',isHome:false}, epoch=0, observer, resizeObserver, queued=false;
  var host, topSlot, topButton, toggleTarget, overlay, overlayTimer, overlayTarget, overlayAttrs, focusedBefore;
  var complete=false, checkController, readyBeforeBoot=false, fontMedia, readerTools, readerExport, pageAttributes;
  var marks=new Map(), links=new Map(), compactLinks=new Set(), collapsedHosts=new WeakSet();
  var tooltip, tooltipLink, tooltipDescription, bodyMarker, originalSurface, revealed=false, surfaceDirty=true;
  function meta(name) {
    try { var value=w.AJS && w.AJS.Meta && w.AJS.Meta.get(name); if(value) return String(value); } catch (_) {}
    var el=d.querySelector('meta[name="ajs-'+name+'"]');return el ? el.content : '';
  }
  function pageId() {
    var id=meta('page-id')||new URL(w.location.href).searchParams.get('pageId')||'';
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
      var response=await w.fetch(cfg.contextPath+'/rest/api/content/'+id+'?expand=space,ancestors,metadata.labels,version,history.createdBy',{credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});
      if(!response.ok)return false;
      var p=await response.json();
      var ancestors=p.ancestors||[],valid=generation===epoch && String(p.id)===id && p.type==='page' && p.status==='current' && p.space?.key===cfg.spaceKey &&
        (id===cfg.rootPageId || ancestors.some(function(a){return String(a.id)===cfg.rootPageId;}));
      if(valid){state.exportMetadata={pageId:id,version:renderedVersion,updatedAt:renderedVersion&&renderedVersion===String(p.version?.number)?p.version?.when||'':'',author:p.history?.createdBy?.displayName||'',status:'Published (Confluence)'};state.parentId=String(ancestors[ancestors.length-1]?.id||'');state.styleFlags=(p.metadata?.labels?.results||[]).map(function(label){return label.name;}).filter(function(name){return ['hide-actions','hide-comments','hide-footer'].includes(name);});}return valid;
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
    var p=d.createElementNS(el.namespaceURI,'path');p.setAttribute('d',ICONS[kind]||ICONS.resources);p.setAttribute('fill-rule','evenodd');p.setAttribute('clip-rule','evenodd');el.append(p);return el;
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
      var icon=svg(kind);a.append(icon,label);var record={label:label,icon:icon,aria:a.getAttribute('aria-label')};links.set(a,record);mark(a,'mosaic-native-link');
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
    syncNativePage();mountReaderTools();
    if(customEditor())w.MosaicScroll?.destroy();
    else w.MosaicScroll?.mount({root:d.querySelector('[data-mosaic-root]')||d.querySelector('#main-content')});
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
  function mountReaderTools() {
    if(readerTools&&!readerTools.isConnected){readerExport?.destroy();readerExport=null;readerTools=null;}
    if(customEditor()){readerExport?.destroy();readerExport=null;readerTools?.remove();readerTools=null;return;}
    if(known(state.pageId)||!w.MosaicExport||readerTools)return;
    var content=d.querySelector('#main-content .wiki-content,#main-content.wiki-content');if(!content)return;
    readerTools=d.createElement('div');readerTools.className='mosaic-native-reader-tools mosaic-native-page-tools';readerTools.setAttribute('data-mosaic-owned','');readerTools.setAttribute('role','group');readerTools.setAttribute('aria-label','Page actions');
    content.before(readerTools);readerExport=w.MosaicExport.mount(readerTools,{config:cfg,getContent:function(){return Object.assign({},state.exportMetadata||{},{element:content,title:d.querySelector('#title-text')?.textContent.trim()||d.title,author:state.exportMetadata?.author||meta('creator-display-name'),url:cfg.contextPath+'/pages/viewpage.action?pageId='+state.pageId});}});
    var resultsUrl=returnToResults();if(resultsUrl){var back=d.createElement('a');back.className='mosaic-native-results-link';back.href=resultsUrl;back.textContent='Back to search results';readerTools.prepend(back);}
    var nativeEdit=d.querySelector('#editPageLink');
    if(nativeEdit&&nativeEdit.hasAttribute('href')&&nativeEdit.getAttribute('aria-disabled')!=='true'){
      var edit=d.createElement('a');edit.className='mosaic-native-edit-link';edit.href=[String(cfg.pageIds.insights),String(cfg.pageIds.resources)].includes(state.parentId)?cfg.contextPath+'/pages/viewpage.action?pageId='+cfg.rootPageId+'#/edit/'+state.pageId:nativeEdit.href;edit.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" focusable="false"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/></svg><span>Edit page</span>';readerTools.prepend(edit);
    }
  }
  function syncNativePage(){
    var content=d.querySelector('#main-content .wiki-content,#main-content.wiki-content'),active=!customEditor()&&!known(state.pageId)&&!d.querySelector('[data-mosaic-root]')&&content;
    if(!active){if(pageAttributes){Object.keys(pageAttributes).forEach(function(name){restore(d.body,name,pageAttributes[name]);});pageAttributes=null;}return;}
    if(!pageAttributes){pageAttributes={};['data-mosaic-native-page','data-mosaic-style-flags'].forEach(function(name){pageAttributes[name]=d.body.getAttribute(name);});}
    d.body.setAttribute('data-mosaic-native-page','true');
    var marker=Array.from(content.querySelectorAll('[id],[name],[data-mosaic-document-page]')).some(function(el){if(el.closest('pre,code,textarea,[contenteditable=true],.mce-content-body,#editor,#content-editor,#macro-browser,.macro-preview'))return false;return el.hasAttribute('data-mosaic-document-page')||el.matches('a,span')&&(/(?:^|-)mosaic-page-style-v1$/.test(el.id)||el.getAttribute('name')==='mosaic-page-style-v1');});
    var flags=marker?['hide-actions','hide-comments','hide-footer']:state.styleFlags||[];
    if(flags.length)d.body.setAttribute('data-mosaic-style-flags',flags.join(' '));else d.body.removeAttribute('data-mosaic-style-flags');
  }
  function overlayKeys(event){if(overlay&&event.key==='Tab'){event.preventDefault();overlay.focus({preventScroll:true});}}
  function showOverlay() {
    if(!state.isHome||complete||forbidden()||customEditor()||overlay)return;
    overlayTarget=d.querySelector('[data-mosaic-root],#mosaic')||d.querySelector('#main-content')||d.body;
    overlayAttrs={busy:overlayTarget.getAttribute('aria-busy'),inert:overlayTarget.getAttribute('inert')};overlayTarget.setAttribute('aria-busy','true');if(overlayTarget!==d.body)overlayTarget.setAttribute('inert','');focusedBefore=d.activeElement;
    overlay=d.createElement('div');overlay.className='mosaic-loading-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Loading Mosaic');overlay.tabIndex=-1;
    overlay.innerHTML='<div class="mosaic-loading-panel"><p class="mosaic-loading-brand">MOSAIC</p><p class="mosaic-loading-message">Loading Mosaic…</p><div class="mosaic-loading-track" role="progressbar" aria-label="Loading Mosaic"><div class="mosaic-loading-fill"></div></div></div>';
    d.body.append(overlay);overlay.focus({preventScroll:true});d.addEventListener('keydown',overlayKeys,true);overlayTimer=w.setTimeout(function(){error('Mosaic is taking longer to load. You can refresh the page to try again.');},Math.max(100,Math.min(Number(cfg.loadingTimeoutMs)||15000,60000)));
  }
  function hideOverlay(){w.clearTimeout(overlayTimer);overlayTimer=null;var restoreFocus=overlay&&d.activeElement===overlay;overlay?.remove();overlay=null;d.removeEventListener('keydown',overlayKeys,true);if(overlayTarget&&overlayAttrs){restore(overlayTarget,'aria-busy',overlayAttrs.busy);if(overlayTarget!==d.body)restore(overlayTarget,'inert',overlayAttrs.inert);}if(restoreFocus&&focusedBefore?.isConnected)focusedBefore.focus({preventScroll:true});overlayTarget=null;overlayAttrs=null;focusedBefore=null;}
  function ready(){complete=true;readyBeforeBoot=true;hideOverlay();schedule();}
  function error(message){complete=true;readyBeforeBoot=true;hideOverlay();if(state.active){var event=new w.CustomEvent('mosaic:host-error',{detail:{message:String(message||'Mosaic could not finish loading.')}});d.dispatchEvent(event);} }
  function activate(generation) {
    if(generation!==epoch||forbidden())return;
    state.active=true;state.pending=false;bodyMarker=d.body.getAttribute('data-mosaic-host');d.body.setAttribute('data-mosaic-host','active');
    showOverlay();refresh();
    if(!state.active||generation!==epoch)return;
    observer=new w.MutationObserver(function(changes){
      var relevant=changes.some(function(c){
        if(c.type==='childList')return Array.from(c.addedNodes).concat(Array.from(c.removedNodes)).some(function(n){return n.nodeType===1&&!n.matches?.('[data-mosaic-owned],.mosaic-native-icon,.mosaic-native-label,.mosaic-native-tooltip,.mosaic-loading-overlay');});
        if(c.type==='attributes'){
          if(c.attributeName==='class'&&c.target===host){var old=(c.oldValue||'').replace(/\bmosaic-native-sidebar\b/g,'').replace(/\s+/g,' ').trim(),next=(c.target.getAttribute('class')||'').replace(/\bmosaic-native-sidebar\b/g,'').replace(/\s+/g,' ').trim();if(old===next)return false;}
          return c.target!==topButton && !c.target.closest?.('[data-mosaic-owned]') &&
          ['style','class','content','data-color-mode','data-theme'].includes(c.attributeName) &&
          (c.target===d.body||c.target===d.documentElement||c.target===host||c.target.matches?.('meta[name="ajs-space-key"],meta[name="ajs-page-id"],.acs-side-bar,.ia-splitter-left,.plugin_pagetree_current'));}
        return false;
      });if(relevant){surfaceDirty=true;schedule();}
    });observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class','style','content','data-color-mode','data-theme']});
    w.addEventListener('hashchange',onNavigate);w.addEventListener('popstate',onNavigate);w.addEventListener('resize',compact);w.addEventListener('scroll',hideTooltip,true);w.addEventListener('pagehide',onPageHide);w.addEventListener('pageshow',onPageShow);d.addEventListener('keydown',onKey);d.addEventListener('load',onStylesheet,true);
    if(w.matchMedia){fontMedia=w.matchMedia('(prefers-color-scheme: dark)');fontMedia.addEventListener?.('change',refreshSurface);}
  }
  function refreshSurface(){surfaceDirty=true;schedule();}
  function onPageHide(event){if(!event.persisted)destroy();else hideTooltip();}
  function onPageShow(event){if(event.persisted){surfaceDirty=true;schedule();}}
  function onStylesheet(event){if(event.target.matches?.('link[rel="stylesheet"]'))refreshSurface();}
  function onNavigate(){if(forbidden())destroy();else{if(customEditor())ready();schedule();}}
  function boot(config) {
    var next=normalize(config);if(!next)return state;
    var id=pageId();if(cfg&&state.pageId===id&&(state.active||state.pending)){if(forbidden())destroy();else{if(customEditor())ready();schedule();}return state;}
    destroy();cfg=next;complete=readyBeforeBoot;state={active:false,pending:false,pageId:id,isHome:id===cfg.rootPageId,verified:Promise.resolve(false)};
    if(customEditor()){complete=true;readyBeforeBoot=true;}
    if(!id||forbidden())return state;var generation=epoch;state.pending=true;
    state.verified=verify(id,meta('space-key'),generation).then(function(ok){if(generation!==epoch)return false;state.pending=false;if(ok)activate(generation);return ok;});return state;
  }
  function destroy(){epoch++;observer?.disconnect();observer=null;checkController?.abort();checkController=null;hideOverlay();w.MosaicScroll?.destroy();readerExport?.destroy();readerExport=null;readerTools?.remove();readerTools=null;cleanupSidebar();if(d.body&&bodyMarker!==undefined)restore(d.body,'data-mosaic-host',bodyMarker);bodyMarker=undefined;state.active=false;state.pending=false;
    if(pageAttributes){Object.keys(pageAttributes).forEach(function(name){restore(d.body,name,pageAttributes[name]);});pageAttributes=null;}
    w.removeEventListener('hashchange',onNavigate);w.removeEventListener('popstate',onNavigate);w.removeEventListener('resize',compact);w.removeEventListener('scroll',hideTooltip,true);w.removeEventListener('pagehide',onPageHide);w.removeEventListener('pageshow',onPageShow);d.removeEventListener('keydown',onKey);d.removeEventListener('load',onStylesheet,true);fontMedia?.removeEventListener?.('change',refreshSurface);fontMedia=null;
  }
  w.MosaicHost={boot:boot,ready:ready,error:error,destroy:destroy};
})(window,document);

;
/* Browser-side, structured exports from the visible article DOM. The parser reads
 * text and a small element allow-list; it never executes or reparses article HTML. */
(function (w,d) {
  'use strict';
  if(w.MosaicExport)return;
  var MAX_IMAGE_BYTES=10000000,serial=0;
  var ignored='script,style,noscript,template,button,input,select,textarea,form,nav,[hidden],[aria-hidden="true"],[data-mosaic-export],.mosaic-export-toolbar';
  function fail(message){throw new Error(message);}
  function clean(value){return String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');}
  function safeLink(value){if(typeof value!=='string'||!value.trim())return null;try{var u=new URL(value,w.location.href);return /^(https?:|mailto:)$/.test(u.protocol)&&!u.username&&!u.password?u.href:null;}catch(_){return null;}}
  function skip(el){return el.nodeType===1&&(el.matches(ignored)||el.style.display==='none'||el.style.visibility==='hidden');}
  function read(input) {
    var source=input&&input.element?input:{element:input},element=source.element;
    if(!element||element.nodeType!==1)fail('Choose an article before exporting.');
    var warnings=new Set(),title=clean(source.title||element.querySelector('h1')?.textContent||d.querySelector('#title-text')?.textContent||d.title||'Mosaic article').trim();
    var model={title:title,author:clean(source.author),updatedAt:clean(source.updatedAt),url:safeLink(source.url||w.location.href),blocks:[],warnings:[],images:[]};
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
        if(/^h[1-6]$/.test(tag)){if(tag==='h1'&&node.textContent.trim()===title&&out.length===0)return;out.push(...paragraphs(inline(node,{}),'heading',Number(tag[1])));}
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
      {image:logo.dataUrl,fit:[114,72],alignment:'center',margin:[0,0,0,18]},
      {text:model.title,style:'title',alignment:'center',margin:[0,0,0,12]}
    ];
    if(model.url)content.push({text:'Open source document',link:model.url,color:'#056DAE',decoration:'underline',fontSize:9,alignment:'center',margin:[0,0,0,22]});
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
      if(b.type==='image'){var result=[paragraph([imageRun(b.image,Math.min(610,width/15),420)])];if(b.image.alt)result.push(plain(b.image.alt,{spacing:{after:180}},{size:17,italics:true,color:'4D6072'}));return result;}
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
    var content=[paragraph([imageRun(logo,152,96)],{alignment:x.AlignmentType.CENTER,spacing:{before:0,after:270}}),plain(model.title,{style:'Title',alignment:x.AlignmentType.CENTER,spacing:{after:240}})];
    if(model.url)content.push(paragraph(inline([{text:'Open source document',link:model.url}],{size:18}),{alignment:x.AlignmentType.CENTER,spacing:{after:360}}));
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
    var toolbar=d.createElement('div');toolbar.className='mosaic-export-toolbar';toolbar.setAttribute('data-mosaic-export','');toolbar.setAttribute('aria-label','Article actions');
    function button(label,path,pending,success){var node=d.createElement('button'),icons=d.createElement('span'),labels=d.createElement('span');node.type='button';node.setAttribute('aria-label',label);node.dataset.exportState='idle';node.dataset.exportLabel=label;icons.className='mosaic-export-feedback-icon';labels.className='mosaic-export-feedback-label';icons.setAttribute('aria-hidden','true');labels.setAttribute('aria-hidden','true');
      [['idle',label,path],['pending',pending,'M21 12a9 9 0 1 1-9-9'],['success',success,'m5 12 4 4L19 6']].forEach(function(state){var svg=icon(state[2]),text=d.createElement('span');svg.dataset.feedback=state[0];text.dataset.feedback=state[0];text.textContent=state[1];if(state[0]==='success')svg.firstElementChild.setAttribute('pathLength','1');icons.append(svg);labels.append(text);});node.append(icons,labels);toolbar.append(node);return node;}
    var linkButton=button('Copy link','M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2','Copying…','Copied');
    var downloadButton=button('Download','M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5','Preparing…','Download started');downloadButton.setAttribute('aria-haspopup','menu');downloadButton.setAttribute('aria-expanded','false');
    var markdownButton=button('Copy Markdown','M9 3h11v14H9zM5 7H3v14h13v-2','Copying…','Copied');
    var status=d.createElement('span');status.className='mosaic-export-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');toolbar.append(status);container.append(toolbar);
    var busy=false,destroyed=false,panel=null,job=null,feedbackTimer=null,buttons=[linkButton,downloadButton,markdownButton],listeners=[],downloads=new Set();
    function feedback(node,state){node.dataset.exportState=state;var label=node.dataset.exportLabel;if(state!=='idle')label+=' — '+node.querySelector('.mosaic-export-feedback-label [data-feedback="'+state+'"]').textContent;node.setAttribute('aria-label',label);}
    function resetFeedback(){w.clearTimeout(feedbackTimer);feedbackTimer=null;buttons.forEach(function(node){feedback(node,'idle');});}
    function complete(node){if(destroyed)return;feedback(node,'success');feedbackTimer=w.setTimeout(function(){feedbackTimer=null;if(!destroyed)feedback(node,'idle');},2200);}
    function listen(node,type,handler,options){node.addEventListener(type,handler,options);listeners.push(function(){node.removeEventListener(type,handler,options);});}
    function close(restore){if(!panel)return;panel.remove();panel=null;downloadButton.setAttribute('aria-expanded','false');downloadButton.removeAttribute('aria-controls');d.removeEventListener('pointerdown',outside,true);d.removeEventListener('focusin',outside,true);w.removeEventListener('resize',position);w.removeEventListener('scroll',position,true);if(restore&&!destroyed&&downloadButton.isConnected)downloadButton.focus({preventScroll:true});}
    function outside(event){if(panel&&!panel.contains(event.target)&&!downloadButton.contains(event.target))close(false);}
    function position(){if(!panel)return;if(!downloadButton.isConnected){close(false);return;}var bounds=downloadButton.getBoundingClientRect(),width=w.visualViewport?.width||w.innerWidth,height=w.visualViewport?.height||w.innerHeight;panel.style.maxHeight=Math.max(100,height-24)+'px';panel.style.maxWidth=Math.max(160,width-24)+'px';var box=panel.getBoundingClientRect();panel.style.left=Math.max(12,Math.min(bounds.left,width-box.width-12))+'px';panel.style.top=Math.max(12,Math.min(bounds.bottom+8+box.height>height-12?bounds.top-box.height-8:bounds.bottom+8,height-box.height-12))+'px';}
    function open(last){if(busy||destroyed)return;if(panel){close(true);return;}panel=d.createElement('div');panel.className='mosaic-export-menu';panel.id='mosaic-export-menu-'+(++serial);panel.setAttribute('role','menu');panel.setAttribute('aria-label','Download article');
      [['md','Markdown','Plain .md article'],['mdx','MDX source','Article text and metadata'],['word','Word document','Editable .docx file'],['pdf','PDF document','Ready to read and share']].forEach(function(item){var node=d.createElement('button');node.type='button';node.setAttribute('role','menuitem');node.tabIndex=-1;node.dataset.exportFormat=item[0];node.append(icon('M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h6'));var label=d.createElement('span'),strong=d.createElement('strong'),small=d.createElement('small');strong.textContent=item[1];small.textContent=item[2];label.append(strong,small);node.append(label);node.addEventListener('click',function(){close(true);perform(item[0]);});panel.append(node);});
      panel.addEventListener('keydown',function(event){var all=Array.from(panel.querySelectorAll('[role=menuitem]')),at=all.indexOf(d.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();var index=event.key==='Home'?0:event.key==='End'?all.length-1:(at+(event.key==='ArrowDown'?1:-1)+all.length)%all.length;all[index].focus({preventScroll:true});all[index].scrollIntoView?.({block:'nearest'});}else if(event.key==='Escape'){event.preventDefault();close(true);}else if(event.key==='Tab'){close(false);downloadButton.focus({preventScroll:true});}});
      d.body.append(panel);downloadButton.setAttribute('aria-controls',panel.id);downloadButton.setAttribute('aria-expanded','true');position();d.addEventListener('pointerdown',outside,true);d.addEventListener('focusin',outside,true);w.addEventListener('resize',position);w.addEventListener('scroll',position,true);var all=panel.querySelectorAll('[role=menuitem]');all[last?all.length-1:0].focus({preventScroll:true});
    }
    async function perform(format) {
      if(busy||destroyed)return null;close(false);resetFeedback();busy=true;job=new w.AbortController();var active=format==='link'?linkButton:format==='markdown'?markdownButton:downloadButton;feedback(active,'pending');buttons.forEach(function(b){b.setAttribute('aria-disabled','true');});toolbar.setAttribute('aria-busy','true');status.removeAttribute('data-error');status.removeAttribute('data-warning');status.textContent=format==='link'?'Copying link…':format==='markdown'?'Copying Markdown…':'Preparing '+({pdf:'PDF',word:'Word',mdx:'MDX',md:'Markdown'}[format])+'…';
      try {
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
    var api={destroy:function(){if(destroyed)return;destroyed=true;if(job)job.abort();w.clearTimeout(feedbackTimer);downloads.forEach(function(release){release();});close(false);listeners.forEach(function(remove){remove();});toolbar.remove();},exportPDF:function(){return perform('pdf');},exportWord:function(){return perform('word');},exportMDX:function(){return perform('mdx');},exportMarkdown:function(){return perform('md');},copyLink:function(){return perform('link');},copyMarkdown:function(){return perform('markdown');}};
    toolbar.mosaicExport=api;listen(linkButton,'click',api.copyLink);listen(markdownButton,'click',api.copyMarkdown);listen(downloadButton,'click',function(){open(false);});listen(downloadButton,'keydown',function(event){if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!panel)open(event.key==='ArrowUp');}else if(event.key==='Escape')close(true);});return api;
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
    return space==='mosaic'&&w.top===w.self&&
      !/\/(?:admin|plugins\/servlet\/admin|spaces\/permissions)(?:\/|$)/i.test(w.location.pathname)&&
      !/(?:editpage|createpage|createblogpost|viewpagehistory|diffpages|viewpreviousversions|preview|spacepermissions)\.action$/i.test(w.location.pathname)&&
      !/[?&](?:pageVersion|preview|mosaicNativeUi)=/.test(w.location.search)&&
      !d.querySelector('#editpageform,#createpageform,#content-editor,body.contenteditor');
  }
  function visibility(){widgets.forEach(function(item){item.host.hidden=!allowed()||/^#\/(?:new|edit)(?:[/?]|$)/.test(w.location.hash);if(item.host.hidden)item.menu.close(false);});}
  function boot(config){if(!allowed()){visibility();return;}if(!w.MosaicPopover)return;var cfg=w.MosaicConfig.resolve(config);d.querySelectorAll('[data-mosaic-add-page]').forEach(function(host){if(widgets.some(function(item){return item.host===host;}))return;var menu=w.MosaicPopover.mount(host,{label:'Add page',placeholder:'Add page',options:[{value:'insights',label:'Insight'},{value:'resources',label:'Resource'}],retainFocus:false,onChange:function(parent){w.location.assign(w.MosaicConfig.page(cfg,'home')+'#/new?parent='+parent);}});var plus=w.MosaicSearch.icon('M12 5v14M5 12h14');plus.classList.add('mosaic-add-icon');menu.trigger.prepend(plus);widgets.push({host:host,menu:menu});});if(!started){w.addEventListener('hashchange',visibility);started=true;}visibility();}
  function destroy(){widgets.splice(0).forEach(function(item){item.menu.destroy();});w.removeEventListener('hashchange',visibility);started=false;}
  w.MosaicNavbar={boot:boot,destroy:destroy};
})(window,document);

;
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
  var ICONS = {
    bold:'M6 4h7a4 4 0 0 1 0 8H6zm0 8h8a4 4 0 0 1 0 8H6z',italic:'M10 4h10M4 20h10M15 4 9 20',underline:'M6 4v7a6 6 0 0 0 12 0V4M4 21h16',strike:'M18 6c-1-2-3-3-6-3-4 0-6 2-6 5 0 2 2 3 6 4m-7 5c1 3 4 4 7 4 4 0 6-2 6-5M3 12h18',link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',quote:'M4 7h6v6H4c0 4 2 5 4 5M14 7h6v6h-6c0 4 2 5 4 5',code:'m8 8-5 4 5 4m8-8 5 4-5 4M14 5l-4 14',image:'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M16 7h.01',file:'M14 3H5v18h14V8zM14 3v5h5M8 13h8M8 17h6',list:'M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01',ordered:'M10 6h11M10 12h11M10 18h11M3 3h2v6M3 9h4M3 14c0-2 4-2 4 0 0 1-4 4-4 6h4',codeblock:'M7 3H3v18h4M17 3h4v18h-4m-7-7-3-2 3-2m4 4 3-2-3-2',table:'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',divider:'M3 12h18',clear:'m5 4 14 16M8 4h12M14 4l-4 16M5 20h9M3 3l18 18',undo:'M3 10h12a6 6 0 0 1 0 12M3 10l5-5M3 10l5 5',redo:'M21 10H9a6 6 0 0 0 0 12M21 10l-5-5M21 10l-5 5',expand:'M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6',close:'m6 6 12 12M18 6 6 18',arrow:'M4 12h16m-6-6 6 6-6 6',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m7 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0'
  };
  function icon(name) { return '<svg class="mosaic-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>'; }
  function tool(attribute, value, label, name) { return '<button type="button" ' + attribute + '="' + value + '" aria-label="' + label + '" title="' + label + '" disabled>' + icon(name) + '</button>'; }
  function nativeURL(config, page, parentId) {
    var context = String(config.contextPath || '/confluence').replace(/\/+$/, '');
    return page && page.id ? context + '/pages/editpage.action?pageId=' + encodeURIComponent(page.id) : context + '/pages/createpage.action?' + new URLSearchParams({spaceKey:config.spaceKey,fromPageId:parentId || config.pages.insights});
  }
  function sanitizeHTML(value, purifier, doc) {
    if (!purifier || typeof purifier.sanitize !== 'function') throw new Error('The article editor could not load its content sanitizer. Use the native Confluence editor.');
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
    var files = [], nativeFiles = [], nativeMore = false, nativeStart = 0, nativeBusy = false, nativeError = false, sequence = 0, expanded = false, previewing = false, savedOverflow = null, selectedImage = null, selectedLink = null, selectedImageFile = null, selectedFiles = [], imagePreviewURL = '', activeDialog = null, dialogSequence = 0, activeTable = null, dialogTable = null, internalTextDrag = false, uploadIncomplete = false;
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
      tool('data-open','link','Insert link','link') + tool('data-action','quote','Block quote','quote') + tool('data-action','code','Inline code','code') + tool('data-open','image','Insert image','image') + tool('data-action','files','Attach files','file') + '<span class="mosaic-editor-toolbar-break"></span>' +
      tool('data-command','insertUnorderedList','Bulleted list','list') + tool('data-command','insertOrderedList','Numbered list','ordered') + tool('data-action','codeblock','Code block','codeblock') + tool('data-open','table','Insert table','table') + tool('data-action','divider','Horizontal divider','divider') + tool('data-command','removeFormat','Clear formatting','clear') + '<span class="mosaic-editor-divider"></span>' +
      tool('data-command','undo','Undo','undo') + tool('data-command','redo','Redo','redo') + tool('data-action','expand','Expand editor','expand') + '</div>' +
      '<div class="mosaic-editor-insert" data-panel="link" hidden><label>Link text<input type="text" data-link-text maxlength="300"></label><label>Resource URL<input type="url" data-link-url placeholder="https://… or /confluence/…" autocomplete="off"></label><p class="mosaic-editor-dialog-error" role="alert" hidden></p><div class="mosaic-editor-dialog-actions"><button type="button" data-close>Cancel</button><button type="button" data-insert-link data-dialog-primary>Insert link</button></div><button type="button" data-remove-link class="mosaic-editor-dialog-remove" hidden>Remove link</button></div>' +
      '<div class="mosaic-editor-insert" data-panel="table" hidden><p class="mosaic-editor-dialog-intro" data-table-intro>The first row contains column headings. Edit any cell directly in the document.</p><div class="mosaic-editor-dialog-grid" data-new-table><label>Rows<input type="number" data-table-rows min="2" max="12" value="3"></label><label>Columns<input type="number" data-table-cols min="1" max="8" value="3"></label></div><div class="mosaic-editor-dialog-table-tools" data-edit-table hidden><button type="button" data-table="row">Add row</button><button type="button" data-table="column">Add column</button><button type="button" data-table="before">Text before table</button><button type="button" data-table="after">Text after table</button><button type="button" data-table="remove" class="mosaic-editor-dialog-remove">Remove table</button></div><p class="mosaic-editor-dialog-error" role="alert" hidden></p><div class="mosaic-editor-dialog-actions"><button type="button" data-close>Cancel</button><button type="button" data-insert-table data-dialog-primary>Insert table</button></div></div>' +
      '<div class="mosaic-editor-insert" data-panel="image" hidden><p class="mosaic-editor-dialog-intro">Add an image where your cursor is. Its description is included for readers using assistive technology.</p><label class="mosaic-editor-dialog-upload">' + icon('image') + '<span data-image-choice>Choose PNG, JPG, WebP, or GIF</span><input type="file" data-image-file accept="image/png,image/jpeg,image/webp,image/gif" class="mosaic-editor-sr"></label><img data-image-preview class="mosaic-editor-dialog-image-preview" alt="" hidden><label>Or use an image URL<input type="url" data-image-url placeholder="/confluence/download/attachments/…" autocomplete="off"></label><label>Image description<input type="text" data-image-alt maxlength="500" placeholder="Describe what this image shows"></label><p class="mosaic-editor-file-hint">Up to 5 MB · images are saved as native page attachments.</p><p class="mosaic-editor-dialog-error" role="alert" hidden></p><div class="mosaic-editor-dialog-actions"><button type="button" data-close>Cancel</button><button type="button" data-insert-image data-dialog-primary>Insert image</button></div><button type="button" data-remove-image class="mosaic-editor-dialog-remove" hidden>Remove image</button></div>' +
      '<div class="mosaic-editor-insert" data-panel="files" hidden><p class="mosaic-editor-dialog-intro">Add supporting documents, templates, or training materials.</p><label class="mosaic-editor-dialog-upload">' + icon('file') + '<span>Choose files</span><input type="file" data-files multiple accept=".pdf,.txt,.md,.markdown,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif" class="mosaic-editor-sr"></label><ul class="mosaic-editor-selected-files" data-selected-files hidden></ul><p class="mosaic-editor-file-hint">PDF, Office, text, Markdown, CSV and images · up to 5 MB per file</p><p class="mosaic-editor-dialog-error" role="alert" hidden></p><div class="mosaic-editor-dialog-actions"><button type="button" data-close>Cancel</button><button type="button" data-insert-files data-dialog-primary>Add files</button></div></div>' +
      '<div class="mosaic-editor-table-tools" hidden><span>Table</span><button type="button" data-table="edit">Edit table</button><button type="button" data-table="row">Add row</button><button type="button" data-table="column">Add column</button><button type="button" data-table="before">Text before</button><button type="button" data-table="after">Text after</button><button type="button" data-table="remove">Remove table</button></div>' +
      '<div class="mosaic-editor-body" role="textbox" aria-label="Article body" aria-multiline="true" contenteditable="false" spellcheck="true" data-placeholder="Write here, paste formatted text, or insert an image…"></div>' +
      '<div class="mosaic-editor-body-bottom"><span>Paste images or formatted text.</span><span data-word-count>0 words</span></div></div>' +
      '<article class="mosaic-editor-preview" tabindex="-1" aria-label="Article preview" hidden></article>' +
      '<section class="mosaic-editor-attachments" aria-label="Attachments"><div class="mosaic-editor-attachments-heading"><h2>Attachments</h2><button type="button" data-add-files>' + icon('file') + 'Add files</button></div><div data-file-list></div><p class="mosaic-editor-file-hint" data-attachment-status role="status" hidden></p><button type="button" data-more-attachments hidden>More attachments</button><p class="mosaic-editor-file-hint">PDF, Office, text, Markdown, CSV and images · up to 5 MB per file</p></section></div></form>' +
      '<div class="mosaic-editor-native-options"><a class="mosaic-editor-native" target="_blank" rel="noopener" title="Open Confluence for other native macros. Unsaved text is not transferred.">Open native editor<span class="mosaic-editor-sr"> in a new tab; unsaved text is not transferred.</span></a></div>';
    container.replaceChildren(section);
    var title = section.querySelector('.mosaic-editor-title'), summary = section.querySelector('.mosaic-editor-summary'), body = section.querySelector('.mosaic-editor-body'), status = section.querySelector('.mosaic-editor-status'), form = section.querySelector('form');
    var toolbar = section.querySelector('.mosaic-editor-toolbar'), publish = section.querySelector('.mosaic-editor-publish'), cancel = section.querySelector('.mosaic-editor-cancel'), previewButton = section.querySelector('.mosaic-editor-preview-toggle');
    var fileInput = section.querySelector('[data-files]'), imageInput = section.querySelector('[data-image-file]'), imageAlt = section.querySelector('[data-image-alt]');
    var panelParking = doc.createElement('div'); panelParking.hidden = true; panelParking.className = 'mosaic-editor-panel-parking';
    section.querySelectorAll('[data-panel]').forEach(function (panel) { panelParking.append(panel); }); section.append(panelParking);
    section.querySelector('.mosaic-editor-native').href = nativeURL(config, page, parentId);
    title.value = source.title || ''; summary.value = source.summary || '';
    function on(node, event, listener) { node.addEventListener(event, listener, {signal:lifecycle.signal}); }
    function locked() { return !ready || busy || uncertain || destroyed; }
    function dirty() { return busy || uncertain || uploadIncomplete || !!(baseline && (title.value !== baseline.title || summary.value !== baseline.summary || body.innerHTML !== baseline.html || parentId !== baseline.parentId)); }
    on(win, 'beforeunload', function (event) { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
    function message(text, error) {
      if (activeDialog && error) { var notice = activeDialog.panel.querySelector('.mosaic-editor-dialog-error'); notice.textContent = text; notice.hidden = !text; return; }
      status.textContent = text; status.hidden = !text; status.classList.toggle('is-error', !!error); status.setAttribute('role', error ? 'alert' : 'status');
    }
    function updateControls() {
      var disabled = locked();
      title.disabled = disabled; summary.disabled = disabled; body.contentEditable = disabled ? 'false' : 'true';
      toolbar.querySelectorAll('button').forEach(function (node) { node.disabled = disabled; });
      if (formatPicker) formatPicker.setDisabled(disabled);
      if (destinationPicker) destinationPicker.setDisabled(disabled || !!page);
      section.querySelectorAll('.mosaic-editor-insert input,.mosaic-editor-insert button,.mosaic-editor-table-tools button,[data-add-files],[data-files],[data-remove-file],[data-insert-attachment]').forEach(function (node) { node.disabled = disabled; });
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
      if (locked()) return null; closePanels(false); popovers.forEach(function (popover) { popover.close(false); }); rememberSelection();
      var panel = section.querySelector('[data-panel="' + kind + '"]'), layer = doc.createElement('div'), dialog = doc.createElement('section'), header = doc.createElement('div'), titleId = 'mosaic-editor-dialog-' + (++dialogSequence), events = new win.AbortController();
      layer.className = 'mosaic-editor-dialog-backdrop'; layer.setAttribute('data-mosaic-owned',''); dialog.className = 'mosaic-editor-dialog'; dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true'); dialog.setAttribute('aria-labelledby',titleId); dialog.tabIndex = -1;
      header.className = 'mosaic-editor-dialog-heading'; var label = doc.createElement('h2'), close = doc.createElement('button'); label.id = titleId; label.textContent = heading; close.type = 'button'; close.className = 'mosaic-editor-dialog-close'; close.setAttribute('aria-label','Close dialog'); close.innerHTML = icon('close'); header.append(label,close);
      panel.hidden = false; panel.querySelector('.mosaic-editor-dialog-error').hidden = true; dialog.append(header,panel); layer.append(dialog); section.append(layer);
      var inert = [form,section.querySelector('.mosaic-editor-native-options')].map(function (node) { var entry = [node,!!node.inert]; node.inert = true; return entry; });
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
    function changed() { var count = body.textContent.trim().split(/\s+/).filter(Boolean).length; section.querySelector('[data-word-count]').textContent = count + (count === 1 ? ' word' : ' words'); rememberSelection(); }
    function command(name, value) {
      if (locked()) return; restoreSelection();
      if (typeof doc.execCommand !== 'function') { message('This browser cannot apply formatting here. Use the native editor.',true); return; }
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
    function revoke(item) { if (item.objectURL) { win.URL.revokeObjectURL(item.objectURL); item.objectURL = ''; } }
    function renderFiles() {
      var list = section.querySelector('[data-file-list]'); list.replaceChildren();
      nativeFiles.forEach(function (item) {
        var row = doc.createElement('div'); row.className = 'mosaic-editor-file'; var label = doc.createElement('div'), name = doc.createElement('a'), state = doc.createElement('span'), insert = doc.createElement('button');
        var displayName = item.displayName || item.name;
        name.textContent = displayName; name.href = item.url; name.target = '_blank'; name.rel = 'noopener'; state.textContent = Math.max(1,Math.round(item.size / 1024)) + ' KB'; label.append(name,state);
        insert.type = 'button'; insert.dataset.insertAttachment = item.id; insert.textContent = IMAGE_TYPES.test(item.mediaType) ? 'Insert image' : 'Insert link'; insert.setAttribute('aria-label',insert.textContent + ': ' + displayName); insert.disabled = locked(); row.append(label,insert); list.append(row);
      });
      files.forEach(function (item) {
        var row = doc.createElement('div'); row.className = 'mosaic-editor-file'; var label = doc.createElement('div'), name = doc.createElement('strong'), state = doc.createElement('span'), remove = doc.createElement('button');
        name.textContent = item.file.name; state.textContent = Math.max(1,Math.round(item.file.size / 1024)) + ' KB · ' + (item.uploaded ? 'Uploaded' : 'Ready to upload'); label.append(name,state); remove.type = 'button'; remove.dataset.removeFile = item.id; remove.setAttribute('aria-label','Remove ' + item.file.name); remove.innerHTML = icon('close'); remove.disabled = locked();
        row.append(label,remove); list.append(row);
      });
    }
    async function loadNativeFiles() {
      if (!page || typeof api.listAttachments !== 'function' || nativeBusy || destroyed) return;
      nativeBusy = true; nativeError = false; var feedback = section.querySelector('[data-attachment-status]'), more = section.querySelector('[data-more-attachments]');
      feedback.hidden = false; feedback.textContent = 'Loading attachments…'; more.disabled = true;
      try {
        var result = await api.listAttachments({pageId:page.id,start:nativeStart,limit:100,signal:lifecycle.signal}); if (destroyed) return;
        result.results.forEach(function (item) { if (!nativeFiles.some(function (known) { return known.id === item.id; })) nativeFiles.push(item); });
        nativeMore = result.hasMore; nativeStart = result.nextStart; feedback.hidden = true; renderFiles();
      } catch (error) { if (destroyed) return; nativeError = true; feedback.textContent = error.message || 'Attachments could not be loaded.'; }
      finally { nativeBusy = false; if (!destroyed) { more.hidden = !nativeMore && !nativeError; more.textContent = nativeError ? 'Retry attachments' : 'More attachments'; updateControls(); } }
    }
    function validFile(file, imageOnly) { return file && file.size > 0 && file.size <= 5 * 1024 * 1024 && FILE_EXTENSIONS.test(file.name || '') && (!imageOnly || IMAGE_TYPES.test(file.type || '')); }
    function removeUnusedPending(id) { if (id && !pendingNodes(body,id).length) { files = files.filter(function (item) { if (item.id !== id) return true; revoke(item); return false; }); renderFiles(); } }
    function stageFiles(incoming, imageOnly, description, replacement) {
      if (locked()) return 0;
      if (typeof api.uploadAttachment !== 'function' || typeof root.MosaicAPI.createAttachmentHTML !== 'function') { message('Attachment uploads are unavailable. Reload the page or use the native editor.',true); return 0; }
      var rejected = [], added = 0;
      Array.from(incoming || []).forEach(function (file) {
        var image = IMAGE_TYPES.test(file.type || '');
        if (!validFile(file,imageOnly)) { rejected.push(file.name || 'File'); return; }
        var item = {id:'file-' + (++sequence),file:file,image:image,alt:description == null ? file.name.replace(/\.[^.]+$/,'') : description,uploaded:null,objectURL:''};
        var node = doc.createElement(image ? 'img' : 'a'); node.setAttribute('data-mosaic-pending',item.id);
        if (image) { node.alt = item.alt; if (typeof win.URL.createObjectURL === 'function') { item.objectURL = win.URL.createObjectURL(file); node.src = item.objectURL; } }
        else { node.href = '#'; node.textContent = file.name; }
        files.push(item); added++;
        if (replacement && body.contains(replacement)) { var oldId = replacement.getAttribute('data-mosaic-pending'); replacement.replaceWith(node); replacement = null; removeUnusedPending(oldId); }
        else insertHTML('<p>' + node.outerHTML + '</p><p><br /></p>');
      });
      renderFiles(); changed();
      message(rejected.length ? 'Could not add ' + rejected.join(', ') + '. Choose supported files up to 5 MB.' : '',!!rejected.length);
      return added;
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
      if (!openDialog('files','Add attachments',section.querySelector('[data-add-files]'))) return;
      selectedFiles = Array.from(incoming || []); fileInput.value = ''; showSelectedFiles();
    }
    function showSelectedFiles() { var list = section.querySelector('[data-selected-files]'); list.replaceChildren(); list.hidden = !selectedFiles.length; selectedFiles.forEach(function (file) { var item = doc.createElement('li'); item.textContent = file.name + ' · ' + Math.max(1,Math.round(file.size / 1024)) + ' KB'; list.append(item); }); }
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
        else if (kind === 'link') showLinkPanel(selectedElement('a')); return;
      }
      closePanels(); var action = button.dataset.action;
      if (action === 'expand') { setExpanded(!expanded); restoreSelection(); }
      if (action === 'files') showFilesPanel();
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
        if (typeof api.uploadAttachment !== 'function') { message('Attachment uploads are unavailable. Reload the page or use the native editor.',true); return; }
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
    on(section.querySelector('[data-add-files]'),'click',function () { if (!locked()) { rememberSelection(); showFilesPanel(); } });
    on(fileInput,'change',function () { selectedFiles = Array.from(fileInput.files); showSelectedFiles(); });
    on(section.querySelector('[data-insert-files]'),'click',function () { if (locked()) return; if (!selectedFiles.length) { message('Choose files to attach.',true); return; } if (selectedFiles.some(function (file) { return !validFile(file,false); })) { message('Choose supported files up to 5 MB each.',true); return; } if (typeof api.uploadAttachment !== 'function') { message('Attachment uploads are unavailable. Reload the page or use the native editor.',true); return; } var incoming = selectedFiles.slice(); closePanels(false); stageFiles(incoming,false); });
    on(section.querySelector('[data-file-list]'),'click',function (event) {
      var insert = event.target.closest('[data-insert-attachment]');
      if (insert && !locked()) { var attachment = nativeFiles.find(function (item) { return item.id === insert.dataset.insertAttachment; }); if (attachment) insertHTML('<p>' + root.MosaicAPI.createAttachmentHTML(attachment,{image:IMAGE_TYPES.test(attachment.mediaType)}) + '</p><p><br /></p>'); return; }
      var button = event.target.closest('[data-remove-file]'); if (!button || locked()) return;
      var item = files.find(function (value) { return value.id === button.dataset.removeFile; }); if (!item) return;
      pendingNodes(body,item.id).forEach(function (node) { node.remove(); }); revoke(item); files = files.filter(function (value) { return value !== item; }); renderFiles(); changed();
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
    on(body,'dragstart',function () { internalTextDrag = !locked(); }); on(body,'dragend',function () { internalTextDrag = false; });
    on(body,'drop',function (event) {
      if (locked() || !event.dataTransfer) { event.preventDefault(); return; }
      if (event.dataTransfer.files.length) { event.preventDefault(); return; }
      if (internalTextDrag) { internalTextDrag = false; return; }
      event.preventDefault();
      var range = doc.caretRangeFromPoint && doc.caretRangeFromPoint(event.clientX,event.clientY); if (range && body.contains(range.commonAncestorContainer)) selection = range;
      var html = event.dataTransfer.getData('text/html'); if (!html) { var text = doc.createElement('div'); text.textContent = event.dataTransfer.getData('text/plain'); html = text.innerHTML.replace(/\r?\n/g,'<br />'); } if (html) insertHTML(sanitizeHTML(html,purifier,doc));
    });
    on(previewButton,'click',function () {
      if (!ready || busy) return; closePanels(); previewing = !previewing;
      var preview = section.querySelector('.mosaic-editor-preview'); preview.replaceChildren();
      if (previewing) {
        var heading = doc.createElement('h1'), intro = doc.createElement('p'), content = doc.createElement('div'); heading.textContent = title.value || 'Untitled page'; intro.className = 'mosaic-editor-preview-summary'; intro.textContent = summary.value;
        fillPreview(content);
        preview.append(heading); if (summary.value) preview.append(intro); preview.append(content);
      }
      section.querySelector('.mosaic-editor-fields').hidden = previewing; section.querySelector('.mosaic-editor-content-label').hidden = previewing; section.querySelector('.mosaic-editor-writing').hidden = previewing; section.querySelector('.mosaic-editor-attachments').hidden = previewing;
      preview.hidden = !previewing; previewButton.textContent = previewing ? 'Edit' : 'Preview'; previewButton.setAttribute('aria-pressed',String(previewing)); if (!previewing) restoreSelection(); else preview.focus();
    });
    on(cancel,'click',function () { if (!busy && typeof options.onCancel === 'function') options.onCancel(); });
    on(form,'submit',async function (event) {
      event.preventDefault(); if (!ready || busy) return; closePanels();
      var html, toUpload, resumingAttachments = !!(pending && pending.attachmentsPending && !page && uncertain);
      try {
        if (!title.value.trim()) throw new Error('Enter an article title.');
        toUpload = files.slice();
        html = serializableBody(true);
        if (!toUpload.length && !resumingAttachments) { if (html || !summary.value.trim()) root.MosaicAPI.validateHTML(html); }
        else if (toUpload.length && typeof api.uploadAttachment !== 'function') throw new Error('Attachment uploads are unavailable. Use the native editor.');
      } catch (error) { message(error.message,true); return; }
      busy = true; updateControls(); message(uncertain ? 'Checking the original publication…' : 'Publishing to Confluence…');
      var published, beganWithPage = !!page;
      try {
        if (toUpload.length && !page) {
          page = await api.publish({title:title.value.trim(),summary:summary.value.trim(),html:html,parentId:parentId,attachmentsPending:true});
          if (destroyed) return; uncertain = false; uploadIncomplete = true;
          section.querySelector('.mosaic-editor-native').href = nativeURL(config,page);
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
          section.querySelector('.mosaic-editor-native').href = nativeURL(config,page);
          message('The original page is confirmed. Choose its files again to finish publishing; selected files are kept only in the current editor view.');
          return;
        }
        page = published; uncertain = false; uploadIncomplete = false;
        body.innerHTML = sanitizeHTML(published.editorHtml == null ? html : published.editorHtml,purifier,doc);
        files.forEach(revoke); files = []; renderFiles(); selection = null; activeTable = null; section.querySelector('.mosaic-editor-table-tools').hidden = true;
        baseline = {title:title.value,summary:summary.value,html:body.innerHTML,parentId:parentId};
        section.querySelector('.mosaic-editor-native').href = nativeURL(config,published); message('Article published.'); changed();
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
        if (page && page.hasUnsupportedContent) { message('This article contains native content that this editor cannot safely change. Open the native editor to preserve it.'); section.querySelector('.mosaic-editor-main').hidden = true; publish.hidden = true; previewButton.hidden = true; return; }
        if (!root.MosaicPopover || typeof root.MosaicPopover.mount !== 'function') throw new Error('The editor controls could not load. Reload the page or use the native editor.');
        formatPicker = root.MosaicPopover.mount(section.querySelector('[data-format]'), {label:'Paragraph style',value:'p',options:FORMATS,retainFocus:false,onChange:function (value) { if (!FORMATS.some(function (item) { return item.value === value; })) return; closePanels(); command('formatBlock',value); }}); popovers.push(formatPicker);
        if (!page && !pending) {
          destinationPicker = root.MosaicPopover.mount(section.querySelector('[data-destination]'), {label:'Publish in',value:parentId,options:[{value:String(config.pages.insights),label:'Insights'},{value:String(config.pages.resources),label:'Resources'}],onChange:function (value) {
            if (locked() || page || ![config.pages.insights,config.pages.resources].map(String).includes(String(value))) { destinationPicker.setValue(parentId); return; }
            parentId = String(value); collection = parentId === String(config.pages.resources) ? 'Resources' : 'Insights'; section.querySelector('.mosaic-editor-eyebrow').textContent = 'Mosaic · ' + collection; section.querySelector('.mosaic-editor-native').href = nativeURL(config,null,parentId);
          }}); popovers.push(destinationPicker);
        }
        updateControls();
        if (!root.MosaicLibraries || typeof root.MosaicLibraries.load !== 'function') throw new Error('The content sanitizer is unavailable. Use the native Confluence editor.');
        var library = await root.MosaicLibraries.load('dompurify'); if (destroyed) return; purifier = root.DOMPurify || library;
        body.innerHTML = sanitizeHTML(source.editorHtml == null ? source.html || '<p><br /></p>' : source.editorHtml,purifier,doc);
        baseline = {title:title.value,summary:summary.value,html:body.innerHTML,parentId:parentId}; ready = true; uncertain = !!pending; changed();
        message(pending ? 'An earlier publication is unconfirmed. Check publication to reconcile it before editing.' : ''); updateControls(); loadNativeFiles();
      } catch (error) { if (!destroyed) message(error.message,true); }
    })();
    return Object.freeze({destroy:function () { if (destroyed) return; closePanels(false); setExpanded(false); destroyed = true; lifecycle.abort(); files.forEach(revoke); popovers.forEach(function (popover) { popover.destroy(); }); section.remove(); },hasUnsavedChanges:dirty,isPublishing:function () { return busy; }});
  }
  var editor = Object.freeze({mount:mount,sanitizeHTML:sanitizeHTML,nativeURL:nativeURL}); root.MosaicEditor = editor;
  if (typeof module === 'object' && module.exports) module.exports = editor;
})(typeof window !== 'undefined' ? window : globalThis);

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
    function start(){
      var current=++attempt;target.replaceChildren();target.setAttribute('aria-busy','true');
      var status=d.createElement('p');status.className='mo-status';status.setAttribute('role','status');status.textContent='Loading programme diagrams…';target.append(status);
      load(config).then(function(pkg){
        if(!active||current!==attempt||!target.isConnected)return;
        target.replaceChildren();component=pkg.renderer.mount(target,{data:pkg.data});
      }).catch(function(error){
        if(!active||current!==attempt||!target.isConnected)return;
        try{var base=baseFor(config);packages.delete(base);resources.delete(base+'mosaic-diagram-data.js?mosaicComponent='+revision);d.querySelectorAll('script[data-mosaic-component="diagrams"]').forEach(function(el){if(el.src.indexOf(base+'mosaic-diagram-data.js?')===0)el.remove();});}catch(_){}
        target.replaceChildren();var message=d.createElement('p');message.setAttribute('role','alert');message.textContent=error.message;var retry=d.createElement('button');retry.type='button';retry.className='mo-button mo-button-secondary';retry.textContent='Retry diagrams';retry.addEventListener('click',start);target.append(message,retry);
      }).finally(function(){if(active&&current===attempt)target.removeAttribute('aria-busy');});
    }
    var handle={destroy:function(){if(!active)return;active=false;attempt++;component?.destroy();target.removeAttribute('aria-busy');instances.delete(target);}};
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
    function start(){
      if(!active)return;
      var token=++attempt;target.replaceChildren();target.setAttribute('aria-busy','true');
      var p=d.createElement('p');p.className='mo-status';p.setAttribute('role','status');p.textContent='Loading Meet the team…';target.append(p);
      load(config).then(function(pkg){
        if(!active||token!==attempt||!target.isConnected)return;
        var settings=Object.assign({},config,{people:Object.assign({},pkg.settings,config.people||{})});
        settings.people.pagination=Object.assign({},pkg.settings.pagination,(config.people||{}).pagination||{});
        target.replaceChildren();component=pkg.renderer.mount(target,{config:settings});
      }).catch(function(error){
        if(!active||token!==attempt||!target.isConnected)return;
        try{var base=baseFor(config);packages.delete(base);clearScripts(base);}catch(_){}
        target.replaceChildren();var message=d.createElement('p');message.setAttribute('role','alert');message.textContent=error.message;
        var retry=d.createElement('button');retry.type='button';retry.className='mo-button mo-button-secondary';retry.textContent='Retry team';retry.addEventListener('click',start);target.append(message,retry);
      }).finally(function(){if(active&&token===attempt)target.removeAttribute('aria-busy');});
    }
    var handle={destroy:function(){if(!active)return;active=false;attempt++;if(component)component.destroy();target.removeAttribute('aria-busy');instances.delete(target);}};
    instances.set(target,handle);start();return handle;
  }
  w.MosaicTeamLoader={mount:mount};
})(window,document);

;
/* Mosaic Resources: native Confluence pages and explicitly configured links. */
(function (w) {
  'use strict';
  if (w.MosaicResources) return;
  var instances = new WeakMap(), sequence = 0;
  function text(value) { return typeof value === 'string' ? value.trim() : ''; }
  // Browse return contract: a positive start requires up to 100 ascending prior
  // cursors, beginning at 0. Search routes have a separate owner.
  function restorePosition() {
    var empty = {start:0,history:[]}, hash = w.location.hash.slice(1), parts = hash.split('?');
    if (parts.length > 2 || parts[0] && parts[0] !== '/') return empty;
    var params = new URLSearchParams(parts[1] || ''), known = new Set();
    for (var pair of params) { if (!['start','history'].includes(pair[0]) || known.has(pair[0])) return empty; known.add(pair[0]); }
    var raw = params.get('start'); if (raw === null) return empty;
    if (!/^(?:0|[1-9]\d{0,6})$/.test(raw) || Number(raw) > 1000000) return empty;
    var position = Number(raw); if (!position) return empty;
    var cursors = (params.get('history') || '').split(',');
    if (cursors.length > 100 || cursors.some(function (value) { return !/^(?:0|[1-9]\d{0,6})$/.test(value) || Number(value) >= position; })) return empty;
    var history = cursors.map(Number);
    if (history[0] !== 0 || history.some(function (value, index) { return index > 0 && value <= history[index - 1]; })) return empty;
    return {start:position,history:history};
  }
  function safeLink(value) {
    if (!text(value) || /[\u0000-\u001f\u007f]/.test(value)) return '';
    try { var url = new URL(value, w.location.href); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : ''; } catch (_) { return ''; }
  }
  function mount(target, options) {
    if (!target || target.nodeType !== 1) throw new Error('A Resources container is required.');
    options = options || {};
    var config = options.config || {}, api = options.api, parent = String((config.pages || {}).resources || ''), context = config.contextPath || '/confluence';
    if (!api || typeof api.children !== 'function' || !/^[1-9]\d{0,19}$/.test(parent) || !/^\/(?!\/)[a-z0-9/_-]*$/i.test(context)) throw new Error('Resources requires the configured native collection.');
    if (instances.has(target)) instances.get(target).destroy();
    var d = target.ownerDocument, uid = 'mrs-' + (++sequence), active = true, request = 0, pending = null, removers = [], start = 0, history = [], requestedStart = 0, requestedHistory = [], limit = 12;
    context = context.replace(/\/+$/, '');
    function el(tag, cls, value) { var n = d.createElement(tag); if (cls) n.className = cls; if (value !== undefined) n.textContent = value; return n; }
    function add(parentNode, tag, cls, value) { var node = el(tag, cls, value); parentNode.append(node); return node; }
    function listen(node, event, handler) { node.addEventListener(event, handler); removers.push(function () { node.removeEventListener(event, handler); }); }
    function button(parentNode, label, action, cls) { var node = add(parentNode, 'button', cls || 'mrs-button', label); node.type = 'button'; node.dataset.action = action; return node; }
    function nativePage(id) { return context + '/pages/viewpage.action?pageId=' + encodeURIComponent(id); }
    function icon(kind) {
      var svg = d.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      var paths = {document:['M6 3h8l4 4v14H6z','M14 3v5h4','M9 12h6m-6 4h6'], link:['M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2','M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2'], arrow:['M4 12h15m-6-6 6 6-6 6'], search:['M16 16l5 5','M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0']};
      (paths[kind] || paths.document).forEach(function (shape) { var p = d.createElementNS(svg.namespaceURI, 'path'); p.setAttribute('d', shape); svg.append(p); }); return svg;
    }
    var root = el('section', 'mrs-root'); root.setAttribute('aria-label', 'Mosaic Resources');
    var breadcrumb = add(root, 'nav', 'mrs-breadcrumb'); breadcrumb.setAttribute('aria-label', 'Breadcrumb');
    var home = add(breadcrumb, 'a', '', 'Home'); home.href = nativePage(config.rootPageId || (config.pages || {}).home || '3961414584');
    add(breadcrumb, 'span', 'mrs-breadcrumb-divider', '/').setAttribute('aria-hidden', 'true'); add(breadcrumb, 'span', '', 'Resources').setAttribute('aria-current', 'page');
    var hero = add(root, 'div', 'mrs-hero'), image = add(hero, 'img', 'mrs-hero-image'); image.alt = ''; image.width = 800; image.height = 500; image.decoding = 'async'; image.loading = 'eager'; image.setAttribute('fetchpriority', 'high');
    var file = /^mosaic-[a-z0-9-]+\.webp$/.test(config.resourcesBanner || '') ? config.resourcesBanner : 'mosaic-cover-15.webp';
    var assetBase = config.assetBase || context + '/download/attachments/' + encodeURIComponent(config.attachmentPageId || '3981001251') + '/';
    try { var assetURL = new URL(assetBase.replace(/\/?$/, '/') + file, w.location.href); if (assetURL.origin !== w.location.origin || !/^https?:$/.test(assetURL.protocol) || assetURL.username || assetURL.password) throw Error(); image.src = assetURL.href; } catch (_) { image.hidden = true; }
    listen(image, 'error', function () { image.hidden = true; });
    add(hero, 'h1', 'mrs-title', 'Resources');
    var intro = add(root, 'div', 'mrs-intro'); add(intro, 'p', 'mrs-lead', 'Find the guides, documentation and useful links that support your work with Mosaic.');
    if (typeof options.onSearch === 'function') {
      var form = add(intro, 'form', 'mrs-search'); form.setAttribute('role', 'search'); form.append(icon('search'));
      var label = add(form, 'label', 'mrs-sr', 'Search resources'); label.htmlFor = uid + '-query';
      var query = add(form, 'input'); query.id = label.htmlFor; query.type = 'search'; query.name = 'q'; query.maxLength = 160; query.placeholder = 'Search resources'; query.autocomplete = 'off';
      var submit = add(form, 'button', 'mrs-search-submit', 'Search'); submit.type = 'submit';
      listen(form, 'submit', function (event) { event.preventDefault(); if (!active) return; var value = query.value.trim(); if (value) options.onSearch(value); else query.focus(); });
    }
    var links = Array.isArray(config.resources) ? config.resources.map(function (entry) { return entry && {title:text(entry.title),description:text(entry.description),url:safeLink(entry.url)}; }).filter(function (entry) { return entry && entry.title && entry.url; }) : [];
    function card(item, kind) {
      var a = el('a', 'mrs-card'); a.href = item.url; a.dataset.kind = kind;
      if (kind === 'page') a.setAttribute('data-mosaic-result', '');
      var mark = add(a, 'span', 'mrs-card-icon'); mark.append(icon(kind === 'page' ? 'document' : 'link'));
      add(a, 'span', 'mrs-card-kind', kind === 'page' ? 'Documentation' : 'Useful link');
      add(a, 'h3', 'mrs-card-title', item.title);
      add(a, 'p', 'mrs-card-description', item.description || (kind === 'page' ? 'Open this guide in Confluence.' : 'Open this resource.'));
      var action = add(a, 'span', 'mrs-card-action', kind === 'page' ? 'Read guide' : 'Open resource'); action.append(icon('arrow'));
      return a;
    }
    if (links.length) {
      var shortcuts = add(root, 'section', 'mrs-section'); shortcuts.setAttribute('aria-labelledby', uid + '-links');
      add(shortcuts, 'h2', 'mrs-heading', 'Tools & useful links').id = uid + '-links';
      var quickGrid = add(shortcuts, 'div', 'mrs-grid'); links.forEach(function (entry) { quickGrid.append(card(entry, 'link')); });
    }
    var collection = add(root, 'section', 'mrs-section'); collection.setAttribute('aria-labelledby', uid + '-guides');
    var sectionHeader = add(collection, 'div', 'mrs-section-header'), title = add(sectionHeader, 'h2', 'mrs-heading', 'Documentation & guides'); title.id = uid + '-guides'; title.tabIndex = -1;
    var result = add(collection, 'div', 'mrs-results'), pager = add(collection, 'nav', 'mrs-pagination'); pager.setAttribute('aria-label', 'Resource pages'); pager.hidden = true;
    var announcement = add(collection, 'span', 'mrs-sr'); announcement.setAttribute('role', 'status'); announcement.setAttribute('aria-live', 'polite');
    target.append(root);
    function fail(message) {
      result.replaceChildren(); pager.hidden = true;
      var box = add(result, 'div', 'mrs-state mrs-error'); box.setAttribute('role', 'alert'); add(box, 'h3', '', 'Resources could not load'); add(box, 'p', '', message || 'Try again when your connection is available.'); button(box, 'Try again', 'retry');
    }
    function normalize(data, position) {
      if (!data || !Array.isArray(data.results) || data.results.length > limit || typeof data.hasMore !== 'boolean' || data.hasMore && (!Number.isInteger(data.nextStart) || data.nextStart <= position)) throw new Error('Confluence returned an invalid resource list. Try again.');
      var seen = new Set();
      return data.results.map(function (page) {
        var id = page && String(page.id || '');
        if (!/^[1-9]\d{0,19}$/.test(id) || !text(page.title) || seen.has(id)) throw new Error('Confluence returned an invalid resource page. Try again.');
        seen.add(id); return {title:text(page.title),description:text(page.excerpt),url:nativePage(id)};
      });
    }
    function rememberPosition() {
      var params = new URLSearchParams();
      if (start) { params.set('start', String(start)); params.set('history', history.join(',')); }
      try { w.history.replaceState(w.history.state, '', '#/' + (params.size ? '?' + params.toString() : '')); } catch (_) { /* Native navigation can continue when history replacement is unavailable. */ }
    }
    async function load(position, moveFocus, positions) {
      if (!active) return;
      var nextHistory = (positions || history).slice();
      if (nextHistory.length > 100) nextHistory = [0].concat(nextHistory.slice(-99));
      requestedStart = position; requestedHistory = nextHistory;
      var token = ++request; if (pending) pending.abort(); pending = new w.AbortController();
      result.setAttribute('aria-busy', 'true'); pager.hidden = true; result.replaceChildren();
      var busy = add(result, 'p', 'mrs-loading', 'Loading resources…'); busy.setAttribute('role', 'status');
      try {
        var data = await api.children(parent, {start:position,limit:limit,signal:pending.signal});
        if (!active || token !== request) return;
        var pages = normalize(data, position); start = position; history = nextHistory; result.replaceChildren();
        if (pages.length) { var grid = add(result, 'div', 'mrs-grid'); pages.forEach(function (page) { grid.append(card(page, 'page')); }); }
        else { var empty = add(result, 'div', 'mrs-state'), morePages = position || data.hasMore; add(empty, 'h3', '', morePages ? 'No resources on this page' : 'The library starts here'); add(empty, 'p', '', morePages ? 'Use the page controls to continue browsing.' : 'Guides and documentation will appear here when they are published.'); }
        pager.replaceChildren();
        if (history.length || data.hasMore) {
          var previous = button(pager, 'Previous', 'previous'); previous.disabled = !history.length;
          add(pager, 'span', 'mrs-page-label', pages.length ? 'Showing ' + (position + 1) + '–' + (position + pages.length) : 'No resources on this page');
          var next = button(pager, 'Next', 'next'); next.disabled = !data.hasMore; if (data.hasMore) next.dataset.start = String(data.nextStart); pager.hidden = false;
        }
        announcement.textContent = pages.length + (pages.length === 1 ? ' resource loaded.' : ' resources loaded.');
        rememberPosition();
        if (moveFocus) title.focus({preventScroll:true});
      } catch (error) {
        if (!active || token !== request) return;
        fail(error && error.message ? String(error.message) : 'The resource list is unavailable.');
      } finally { if (active && token === request) result.removeAttribute('aria-busy'); }
    }
    listen(root, 'click', function (event) {
      var control = event.target.closest('button[data-action]'); if (!active || !control || !root.contains(control) || control.disabled) return;
      if (control.dataset.action === 'retry') load(requestedStart, true, requestedHistory);
      else if (control.dataset.action === 'next') load(Number(control.dataset.start), true, history.concat([start]));
      else if (control.dataset.action === 'previous' && history.length) load(history[history.length - 1], true, history.slice(0, -1));
    });
    function destroy() { if (!active) return; active = false; request++; if (pending) pending.abort(); removers.splice(0).forEach(function (remove) { remove(); }); root.remove(); if (instances.get(target) === handle) instances.delete(target); }
    var handle = Object.freeze({destroy:destroy}); instances.set(target, handle);
    if (options.signal) { listen(options.signal, 'abort', destroy); if (options.signal.aborted) destroy(); }
    if (active) { var restored = restorePosition(); load(restored.start, false, restored.history); }
    return handle;
  }
  w.MosaicResources = Object.freeze({mount:mount});
}(window));

;
/* Mosaic Insights: native topic sections, server-side search and ordered paging. */
(function(w,d){'use strict';if(w.MosaicInsights)return;
  function mount(target,options){
    var cfg=options.config,api=options.api,dead=false,controller=new w.AbortController(),menus=[],rows=[],nextStart=0,hasMore=false,busy=false,loadedPages=0,maxPages=50;
    var params=new URLSearchParams((w.location.hash.split('?')[1]||'')),query=(params.get('q')||'').slice(0,250),topic=params.get('topic')||'',sort=params.get('sort')||'newest',restore=Math.min(maxPages,Math.max(1,Number(params.get('pages'))||1));
    if(!['newest','oldest','title'].includes(sort))sort='newest';
    function el(tag,cls,text){var n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
    function add(parent,tag,cls,text){var n=el(tag,cls,text);parent.appendChild(n);return n;}
    function abort(){controller.abort();}if(options.signal){if(options.signal.aborted)abort();else options.signal.addEventListener('abort',abort,{once:true});}
    var root=add(target,'section','mi-root');var heading=add(root,'header','mi-heading');var title=add(heading,'div');add(title,'p','mo-eyebrow','From across Mosaic');add(title,'h1','','Insights');add(title,'p','mo-lead','Ideas, updates and perspectives shaping the future of custody.');
    var filters=add(root,'div','mi-filters'),form=add(filters,'form','mi-search');form.setAttribute('role','search');
    var label=add(form,'label','mo-sr','Search insights');label.htmlFor='mi-query';var input=add(form,'input');input.id='mi-query';input.type='search';input.name='q';input.value=query;input.placeholder='Search insights';input.maxLength=250;input.autocomplete='off';var submit=add(form,'button','mi-search-submit','Search');submit.type='submit';
    var topicHost=add(filters,'div','mi-topic'),sortHost=add(filters,'div','mi-sort');
    function route(change){if(dead||controller.signal.aborted)return;var p=new URLSearchParams();var next=Object.assign({q:query,topic:topic,sort:sort},change);if(next.q)p.set('q',next.q);if(next.topic)p.set('topic',next.topic);if(next.sort!=='newest')p.set('sort',next.sort);w.location.hash='/?'+p.toString();}
    form.addEventListener('submit',function(e){e.preventDefault();route({q:input.value.trim()});});
    var topicMenu=w.MosaicPopover.mount(topicHost,{label:'Filter by topic',value:topic,options:[{value:'',label:'All topics'}],onChange:function(v){route({topic:v});}});menus.push(topicMenu);
    menus.push(w.MosaicPopover.mount(sortHost,{label:'Sort insights',value:sort,options:[{value:'newest',label:'Newest first'},{value:'oldest',label:'Oldest first'},{value:'title',label:'Title A–Z'}],onChange:function(v){route({sort:v});}}));
    var topicNotice=add(root,'div','mi-topic-notice');topicNotice.hidden=true;var selected=add(root,'div','mi-selection');
    function selection(){selected.replaceChildren();if(query)add(selected,'span','mi-chip','Search: '+query);if(topic)add(selected,'span','mi-chip','Topic: '+(topicTitle||'Selected section'));if(query||topic){var clear=add(selected,'button','mo-quiet','Clear filters');clear.type='button';clear.addEventListener('click',function(){route({q:'',topic:''});});}}
    var topicTitle='';selection();var status=add(root,'p','mi-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');var grid=add(root,'div','mi-grid');
    var message=add(root,'div','mi-message');message.hidden=true;var paging=add(root,'div','mi-paging'),more=add(paging,'button','mo-button mo-button-secondary','Load more');more.type='button';more.hidden=true;
    function error(host,e,again){host.hidden=false;host.replaceChildren();host.setAttribute('role','alert');add(host,'p','',e.message||'Insights could not be loaded.');var retry=add(host,'button','mo-quiet','Try again');retry.type='button';retry.addEventListener('click',again);}
    async function topics(){if(dead||controller.signal.aborted)return;topicNotice.hidden=true;try{var start=0,seen=new Set(),all=[];for(var batch=0;batch<100;batch++){var result=await api.children(cfg.pages.insights,{start:start,limit:100,signal:controller.signal});if(dead||controller.signal.aborted)return;var added=0;result.results.forEach(function(p){if(!seen.has(p.id)){seen.add(p.id);all.push({value:p.id,label:p.title});added++;}});if(!result.hasMore)break;if(!added||result.nextStart<=start||batch===99)throw Error('Some topics could not be loaded. Search remains available.');start=result.nextStart;}
      if(dead||controller.signal.aborted)return;all.sort(function(a,b){return a.label.localeCompare(b.label);});var chosen=all.find(function(x){return x.value===topic;});topicTitle=chosen?chosen.label:'';if(topic&&!chosen)all.unshift({value:topic,label:'Selected section'});topicMenu.setOptions([{value:'',label:'All topics'}].concat(all));selection();grid.querySelectorAll('.mi-card-meta').forEach(function(meta){meta.textContent=topicTitle||'Mosaic';});
    }catch(e){if(!dead&&!controller.signal.aborted)error(topicNotice,e,topics);}}
    function card(p){var a=el('a','mi-card');var u;try{u=new URL(p.url,w.location.href);}catch(_){return null;}if(u.origin!==w.location.origin||u.pathname!==cfg.contextPath+'/pages/viewpage.action'||!/^\d+$/.test(u.searchParams.get('pageId')||''))return null;a.href=u.href;a.dataset.mosaicResult='';var media=add(a,'div','mi-card-media'),img=add(media,'img');img.src=w.MosaicConfig.cover(cfg,p.id);img.width=800;img.height=500;img.setAttribute('loading','lazy');img.setAttribute('decoding','async');img.alt='';add(media,'span','mi-card-arrow','↗').setAttribute('aria-hidden','true');var body=add(a,'div','mi-card-body');var stamp=new Date(p.created);add(body,'p','mi-card-meta',topicTitle||'Mosaic');add(body,'h2','',p.title);add(body,'p','mi-card-summary',p.excerpt||'Explore this insight from the Mosaic team.');if(p.created&&!isNaN(stamp))add(body,'time','mi-card-date',stamp.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})).dateTime=stamp.toISOString();return a;}
    function render(){grid.replaceChildren();rows.forEach(function(p){var c=card(p);if(c)grid.appendChild(c);});status.textContent=rows.length?rows.length+(rows.length===1?' insight':' insights')+(hasMore?' loaded':'')+(query?' for “'+query+'”':''):'';more.hidden=!hasMore||loadedPages>=maxPages;more.disabled=busy||loadedPages>=maxPages;}
    function rememberPages(){var p=new URLSearchParams((w.location.hash.split('?')[1]||''));if(loadedPages>1)p.set('pages',loadedPages);else p.delete('pages');w.history.replaceState(null,'','#/?'+p.toString());}
    async function load(count){if(dead||busy||controller.signal.aborted||loadedPages>=maxPages)return;count=Math.min(count,maxPages-loadedPages);busy=true;more.disabled=true;message.hidden=true;grid.setAttribute('aria-busy','true');status.textContent=rows.length?'Loading more insights…':'Loading insights…';
      var completed=0;try{for(var i=0;i<count;i++){var result=await api.search(query,{parentId:cfg.pages.insights,topicId:topic||undefined,sort:sort,start:nextStart,limit:12,signal:controller.signal});if(dead||controller.signal.aborted)return;var ids=new Set(rows.map(function(p){return p.id;})),incoming=result.results.filter(function(p){return !ids.has(p.id);});if(result.hasMore&&(!incoming.length||result.nextStart<=nextStart))throw Error('The insight list changed while loading. Clear filters or reload this page to continue.');rows=rows.concat(incoming);hasMore=result.hasMore;nextStart=hasMore?result.nextStart:nextStart+result.results.length;loadedPages++;completed++;render();if(!hasMore)break;}if(!rows.length){message.hidden=false;message.setAttribute('role','status');message.replaceChildren();add(message,'h2','',query||topic?'No matching insights':'More perspectives are on the way');add(message,'p','',query||topic?'Try another phrase or choose All topics.':'Published pages will appear here as the team adds them.');}else if(loadedPages>=maxPages&&hasMore){message.hidden=false;message.setAttribute('role','status');message.replaceChildren();add(message,'p','','To see more insights, narrow your search or choose a topic.');}rememberPages();
      }catch(e){if(!dead&&!controller.signal.aborted){error(message,e,function(){load(Math.max(1,count-completed));});status.textContent=rows.length?rows.length+' insights loaded.':'';}}
      finally{busy=false;if(!dead){grid.removeAttribute('aria-busy');more.disabled=loadedPages>=maxPages;more.hidden=!hasMore||loadedPages>=maxPages;}}
    }
    more.addEventListener('click',function(){load(1);});topics();load(restore);
    return {destroy:function(){dead=true;abort();menus.forEach(function(menu){menu.destroy();});if(options.signal)options.signal.removeEventListener('abort',abort);root.remove();}};
  }w.MosaicInsights={mount:mount};
})(window,document);

;
/* Mosaic Home / About / Resources. Native Confluence remains the content store. */
(function(w,d){'use strict';
  if(w.MosaicSite)return;
  var cfg,api,root,role,controller,editor,cleanup=[],generation=0,lastHash='',mounted=false;
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
  function bread(label){return '<nav class="mo-breadcrumb" aria-label="Breadcrumb"><a href="'+href('home')+'">Home</a><span aria-hidden="true">/</span>'+esc(label)+'</nav>';}
  function footer(){return '<footer class="mo-footer"><span>MOSAIC · Custody transformation</span><span>Internal · <a href="'+href('resources')+'">Resources</a> · <a href="'+href('team')+'">Meet the team</a></span></footer>';}
  function searchForm(value,label){return '<form class="mo-search-form" role="search">'+glass+'<label class="mo-sr" for="mo-query">'+esc(label||'Search Mosaic')+'</label><input id="mo-query" type="search" name="q" placeholder="'+esc(label||'Search Mosaic')+'" maxlength="160" autocomplete="off" value="'+esc(value)+'"><button class="mo-button" type="submit">Search</button></form>';}
  function bindSearch(parent){var form=root.querySelector('.mo-search-form');if(!form)return;form.addEventListener('submit',function(e){e.preventDefault();var q=form.elements.q.value.trim();navigate(q?'/search?q='+encodeURIComponent(q):'/');});}
  function statusBox(message,error){return '<div class="mo-empty'+(error?' mo-error':'')+'" role="'+(error?'alert':'status')+'"><p>'+esc(message)+'</p>'+(error?'<button class="mo-quiet" data-retry>Try again</button>':'')+'</div>';}
  function errors(target,error,retry){target.innerHTML=statusBox(error.message||'The content could not be loaded.',true);target.querySelector('[data-retry]').addEventListener('click',retry);}
  function card(p){var summary=p.excerpt||'Open this page to learn more.';return '<a class="mo-card" href="'+esc(p.url)+'"><img class="mo-card-image" src="'+esc(img(p.id))+'" width="1200" height="667" loading="lazy" decoding="async" alt=""><div class="mo-card-body"><div class="mo-meta">'+esc(date(p.created)||'Mosaic')+'</div><h3>'+esc(p.title)+'</h3><p>'+esc(summary)+'</p><span class="mo-link">Read article '+arrow+'</span></div></a>';}
  async function latest(target,token){target.setAttribute('aria-busy','true');try{var list=await api.children(cfg.pages.insights,{limit:3,signal:controller.signal});if(token!==generation)return;target.innerHTML=list.results.length?'<div class="mo-grid">'+list.results.map(card).join('')+'</div>':statusBox('Articles and updates will appear here when they are published.');}catch(e){if(token!==generation)return;errors(target,e,function(){latest(target,token);});}finally{if(token===generation)target.removeAttribute('aria-busy');}}
  function home(token){root.innerHTML='<section class="mo-home-intro"><p class="mo-eyebrow">Welcome to Mosaic</p><h1>A connected future<br>for custody.</h1><p class="mo-lead">Understand the programme, find useful resources and discover what the team is working on.</p>'+searchForm('')+'<p class="mo-search-note">Search Mosaic pages, guides and articles.</p><div class="mo-shortcuts"><a href="'+href('about')+'">New to Mosaic?</a><a href="'+href('resources')+'">Find a resource</a><a href="'+href('team')+'">Meet the team</a></div></section><section class="mo-section"><div class="mo-section-top"><h2>Explore Mosaic</h2></div><div class="mo-grid">'+[
    ['about','About us','Our purpose, the problems we are solving and how Mosaic fits together.','Discover Mosaic','mosaic-about'],
    ['resources','Resources','Find documentation, practical guides and links to the tools you need.','Explore resources','mosaic-resources'],
    ['team','Meet the team','Find the people and teams behind the programme.','Meet the team','mosaic-team']
  ].map(function(a){return '<a class="mo-card" href="'+href(a[0])+'"><img class="mo-card-image" src="'+img(a[4])+'" width="1200" height="667" loading="lazy" decoding="async" alt=""><div class="mo-card-body"><h3>'+a[1]+'</h3><p>'+a[2]+'</p><span class="mo-link">'+a[3]+arrow+'</span></div></a>';}).join('')+'</div></section><section class="mo-section mo-feature"><div class="mo-feature-title"><p class="mo-eyebrow">Built to work together</p><h2>Modular by design.<br>Connected by data.</h2><p>Explore the foundations of a more consistent, scalable custody platform.</p>'+link('about','Our approach')+'</div><div class="mo-feature-image" tabindex="0" aria-label="Explore Mosaic’s approach"><img src="'+img('mosaic-foundations')+'" width="1200" height="667" loading="lazy" alt=""><button class="mo-feature-hint" aria-label="Show Mosaic approach">'+arrow+'</button><div class="mo-feature-panel"><h3>One connected picture</h3><p>Shared utilities, a standard data model and coordinated workflows across the custody lifecycle.</p>'+link('about','Explore Mosaic','mo-button')+'</div></div></section><section class="mo-section"><div class="mo-section-top"><h2>From Mosaic</h2>'+link('insights','View all insights')+'</div><div id="mo-latest"><div class="mo-grid" aria-hidden="true"><div class="mo-skeleton"></div><div class="mo-skeleton"></div><div class="mo-skeleton"></div></div></div></section>'+footer();bindSearch();var feature=root.querySelector('.mo-feature-image');feature.querySelector('button').addEventListener('click',function(){feature.removeAttribute('data-dismissed');feature.setAttribute('data-open','');});feature.addEventListener('pointerenter',function(){feature.removeAttribute('data-dismissed');});feature.addEventListener('focusin',function(){feature.removeAttribute('data-dismissed');});feature.addEventListener('keydown',function(e){if(e.key==='Escape'){feature.removeAttribute('data-open');root.querySelector('.mo-feature-title a').focus({preventScroll:true});feature.setAttribute('data-dismissed','');}});latest(root.querySelector('#mo-latest'),token);}
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
    function pillars(items){return items.map(function(x){return '<article class="mo-card mo-pillar"><span class="mo-number">'+x[0]+'</span><h3>'+x[1]+'</h3><p>'+x[2]+'</p></article>';}).join('');}
    root.innerHTML='<div class="mo-about-page"><h1 class="mo-sr">About Mosaic</h1>'+
      '<section class="mo-cube" aria-label="The meaning of Mosaic"><video muted loop playsinline preload="metadata" aria-hidden="true" tabindex="-1"'+(cfg.mode==='preview'&&cfg.previewPoster?' poster="'+esc(cfg.previewPoster)+'"':'')+'><source src="'+esc(cfg.videoUrl||cfg.contextPath+'/download/attachments/'+cfg.attachmentPageId+'/cube.webm?api=v2')+'" type="video/webm"></video>'+
      '<div class="mo-cube-copy"><p class="mo-eyebrow">The foundations of our future</p><dl class="mo-acronym">'+acronym.map(function(row){return '<div><dt>'+row[0]+'</dt><dd>'+row[1]+(row[2]?' <small>'+row[2]+'</small>':'')+'</dd></div>';}).join('')+'</dl></div><button type="button" class="mo-video-toggle" hidden>Play animation</button><span class="mo-video-note" role="status"></span></section>'+
      '<div class="mo-about-body"><section class="mo-section mo-intro-split"><div><p class="mo-eyebrow">About us</p><h2>Powering the future<br>of custody.</h2></div><div><p>MOSAIC brings together modular technology and data-driven innovation to transform the custody lifecycle.</p><p>Our aim is a connected platform: reusable utilities, consistent data and coordinated workflows that help teams respond to change.</p></div></section>'+
      '<section class="mo-section"><div class="mo-section-top"><h2>Why Mosaic matters</h2></div><div class="mo-grid">'+pillars(challenges)+'</div></section>'+
      '<section class="mo-section mo-approach"><div><p class="mo-eyebrow">Our approach</p><h2>Build the foundations.<br>Connect the possibilities.</h2></div><ol class="mo-steps"><li><h3>Modular utilities</h3><p>Decompose monolithic applications into scalable services, each supporting a core function.</p></li><li><h3>A shared data model</h3><p>Place data where it belongs and connect platforms through a standard canonical model and event-driven integration.</p></li><li><h3>Coordinated workflows</h3><p>Process once across custody layers, with greater automation and a clearer view of operations.</p></li></ol></section>'+
      '<section class="mo-section"><div class="mo-section-top"><h2>What this enables</h2></div><p class="mo-lead">The programme aims to improve the experience for clients and the teams delivering custody services.</p><div class="mo-grid">'+benefits.map(function(x){return '<article class="mo-card mo-pillar"><h3>'+x[0]+'</h3><p>'+x[1]+'</p></article>';}).join('')+'</div></section>'+
      '<section class="mo-section"><div class="mo-section-top"><h2>Custody for what comes next</h2></div><div class="mo-use-cases"><article class="mo-card mo-pillar"><p class="mo-eyebrow">Use case 01</p><h3>Digital asset custody</h3><p>Develop custody capabilities for digital assets, with the Custody Securities Ledger as a foundation for the custody lifecycle.</p></article><article class="mo-card mo-pillar"><p class="mo-eyebrow">Use case 02</p><h3>Global custody</h3><p>Connect global custody with Direct Custody branches, third-party sub-custodians and token-capable services.</p></article></div></section>'+
      '<section class="mo-section mo-capabilities" aria-labelledby="mo-capabilities-title"><h2 id="mo-capabilities-title">Connected capabilities</h2><p class="mo-lead">The programme’s building blocks span the custody lifecycle.</p><ul class="mo-components">'+capabilities.map(function(item){return '<li><button type="button" class="mo-capability" data-capability="'+item.id+'" aria-pressed="false" aria-controls="mo-capability-panel" aria-describedby="mo-capability-hint">'+esc(item.name)+arrow+'</button></li>';}).join('')+'</ul><p id="mo-capability-hint" class="mo-capability-hint">Select a capability to keep its details open. Select it again to clear.</p><div id="mo-capability-panel" class="mo-capability-panel" role="region" aria-labelledby="mo-capability-title"><div class="mo-capability-copy" aria-live="polite" aria-atomic="true"><p class="mo-eyebrow" data-capability-state>Explore the building blocks</p><h3 id="mo-capability-title">How Mosaic connects</h3><p data-capability-description>Hover, focus or select a capability to learn more and find related resources.</p></div><a class="mo-link mo-capability-search" hidden>Search resources '+arrow+'</a></div></section>'+
      '<section class="mo-section mo-programme" id="mosaic-programme" aria-labelledby="mo-programme-title"><p class="mo-eyebrow">From strategy to delivery</p><h2 id="mo-programme-title">The programme in view.</h2><p class="mo-lead">Explore the approved rollout and the capabilities connecting Mosaic.</p><div data-mosaic-diagrams><p role="status">Loading programme diagrams…</p></div></section></div></div>';
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
    if(w.MosaicDiagramLoader){var diagrams=w.MosaicDiagramLoader.mount(root.querySelector('[data-mosaic-diagrams]'),cfg);cleanup.push(function(){diagrams.destroy();});}
  }
  function bindVideo(){var v=root.querySelector('video'),b=root.querySelector('.mo-video-toggle'),note=root.querySelector('.mo-video-note'),reduced=w.matchMedia('(prefers-reduced-motion: reduce)'),wanted=!reduced.matches,failed=false;
    function label(){b.textContent=v.paused?'Play animation':'Pause animation';b.setAttribute('aria-pressed',String(!v.paused));}
    function play(){if(failed)return;var promise=v.play();if(promise&&promise.catch)promise.catch(function(){label();});}
    function media(){wanted=!reduced.matches;if(wanted&&!d.hidden)play();else v.pause();label();}
    function visibility(){if(d.hidden)v.pause();else if(wanted)play();}
    function unavailable(){failed=true;b.hidden=true;note.textContent=cfg.mode==='preview'?'Static reference · live cube.webm playback requires Confluence.':'Animation unavailable. You can still explore Mosaic below.';}
    v.muted=true;v.loop=true;v.playsInline=true;v.autoplay=wanted;b.hidden=false;b.addEventListener('click',function(){wanted=v.paused;if(wanted)play();else v.pause();});v.addEventListener('play',label);v.addEventListener('pause',label);v.addEventListener('error',unavailable);v.querySelector('source').addEventListener('error',unavailable);reduced.addEventListener('change',media);d.addEventListener('visibilitychange',visibility);cleanup.push(function(){v.pause();reduced.removeEventListener('change',media);d.removeEventListener('visibilitychange',visibility);});if(wanted)play();label();}
  function resources(token,r){if(r.path==='/search'&&r.q){root.innerHTML=bread('Resources')+'<h1>Search resources</h1>'+searchForm(r.q,'Search resources')+'<a class="mo-link" href="#/">Back to resources</a><div id="mo-collection"></div>';bindSearch();collection(root.querySelector('#mo-collection'),token,r,cfg.pages.resources);return;}root.innerHTML='';var component=w.MosaicResources.mount(root,{config:cfg,api:api,signal:controller.signal,onSearch:function(q){navigate('/search?q='+encodeURIComponent(q));}});cleanup.push(function(){component.destroy();});}
  function insights(){root.innerHTML='';var component=w.MosaicInsights.mount(root,{config:cfg,api:api,signal:controller.signal});cleanup.push(function(){component.destroy();});}
  function results(token,r){root.innerHTML=bread('Search')+'<h1>Search Mosaic</h1>'+searchForm(r.q)+'<section class="mo-section"><div class="mo-results-top"><h2>Results for “'+esc(r.q)+'”</h2><a class="mo-link" href="#/">Back to home</a></div><div id="mo-collection"></div></section>'+footer();bindSearch();collection(root.querySelector('#mo-collection'),token,r);}
  async function collection(target,token,r,parent){target.setAttribute('aria-busy','true');target.innerHTML='<p class="mo-status" role="status">'+(r.q?'Searching…':'Loading pages…')+'</p>';try{var list=r.q?await api.search(r.q,{start:r.start,limit:12,signal:controller.signal,parentId:parent}):await api.children(parent,{start:r.start,limit:12,signal:controller.signal});if(token!==generation)return;target.innerHTML=list.results.length?list.results.map(function(p){return '<article class="mo-result"><div class="mo-meta">'+esc(date(p.updated)||'Mosaic page')+'</div><h3><a href="'+esc(p.url)+'">'+esc(p.title)+'</a></h3><p>'+esc(p.excerpt||'Open this page to learn more.')+'</p></article>';}).join(''):statusBox(r.q?'No matching pages. Try a shorter phrase or a different keyword.':'No resources have been published here yet.');if(list.results.length||r.start||list.hasMore){target.insertAdjacentHTML('beforeend','<nav class="mo-pagination" aria-label="Results pages"><span>'+(r.start?'':'')+'</span><span class="mo-meta">'+(list.results.length?'Showing '+(r.start+1)+'–'+(r.start+list.results.length):'No pages on this page')+'</span><span></span></nav>');var pager=target.querySelector('.mo-pagination');function page(start,label,slot){var a=d.createElement('a');a.className='mo-button mo-button-secondary';a.textContent=label;a.href=(r.q?'#/search?q='+encodeURIComponent(r.q)+'&':'#/?')+'start='+start;pager.children[slot].append(a);}if(r.start)page(Math.max(0,r.start-12),'Previous',0);if(list.hasMore)page(list.nextStart,'Next',2);}target.insertAdjacentHTML('afterbegin','<p class="mo-sr" role="status">'+list.results.length+' results loaded.</p>');}catch(e){if(token===generation)errors(target,e,function(){collection(target,token,r,parent);});}finally{if(token===generation)target.removeAttribute('aria-busy');}}
  async function writing(token,r){root.innerHTML='<p class="mo-status" role="status">Opening the editor…</p>';try{var id=(r.path.match(/^\/edit\/([1-9]\d*)$/)||[])[1],page=id?await api.getPage(id,{signal:controller.signal}):null;if(token!==generation)return;root.innerHTML='';editor=w.MosaicEditor.mount(root,{api:api,config:cfg,page:page,parentId:r.parent==='resources'?cfg.pages.resources:cfg.pages.insights,onCancel:function(){navigate('/');},onPublished:function(p){editor=null;w.location.assign(p.url||href(p.id));}});}catch(e){if(token===generation)errors(root,e,function(){writing(token,r);});}}
  function team(){root.innerHTML='<div data-mosaic-team></div>';var component=w.MosaicTeamLoader.mount(root.querySelector('[data-mosaic-team]'),cfg);cleanup.push(function(){component.destroy();});}
  function render(event){var restoreSearchFocus=!!d.activeElement?.matches('form.mosaic-search input[type="search"]');var r=route();if(editor&&editor.isPublishing&&editor.isPublishing()){w.history.replaceState(null,'',lastHash||'#/');return;}if(editor&&editor.hasUnsavedChanges()&&!w.confirm('Leave this article and discard your unsaved changes?')){w.history.replaceState(null,'',lastHash||'#/');return;}lastHash=w.location.hash;w.MosaicHost.boot(cfg);generation++;var token=generation;controller?.abort();controller=new AbortController();editor?.destroy();editor=null;cleanup.splice(0).forEach(function(fn){fn();});if(['home','resources','insights'].includes(role)&&(/^\/new$/.test(r.path)||/^\/edit\/[1-9]\d*$/.test(r.path))){w.MosaicHost.ready();writing(token,r);}else if(role==='about')about();else if(role==='resources')resources(token,r);else if(role==='team')team();else if(role==='insights')insights();else if(r.path==='/search'&&r.q.trim())results(token,r);else {home(token);}var searchControl=w.MosaicSearch?.enhance(root);if(searchControl)cleanup.push(function(){searchControl.destroy();});w.MosaicHost.ready();var heading=root.querySelector('h1');heading?.setAttribute('tabindex','-1');if(event&&event.type==='hashchange'){var focusTarget=restoreSearchFocus?root.querySelector('form.mosaic-search input[type=search]'):heading;(focusTarget||heading)?.focus({preventScroll:true});if(root.scrollIntoView)root.scrollIntoView({block:'start',behavior:'auto'});}}
  async function boot(){if(mounted)return;root=d.querySelector('[data-mosaic-root]');if(!root)return;cfg=w.MosaicConfig.resolve(w.MOSAIC_CONFIG);role=root.getAttribute('data-mosaic-role');if(!['home','about','resources','team','insights'].includes(role))return;var nativeId=(d.querySelector('meta[name="ajs-page-id"]')||{}).content;var nativeSpace=(d.querySelector('meta[name="ajs-space-key"]')||{}).content;try{nativeId=nativeId||(w.AJS&&w.AJS.Meta.get('page-id'));nativeSpace=nativeSpace||(w.AJS&&w.AJS.Meta.get('space-key'));}catch(_){}if(forbidden())return;if(String(nativeId||'')!==String(cfg.pages[role])||nativeSpace!==cfg.spaceKey){root.innerHTML='<p>This Mosaic layout is only available on its configured page.</p>';return;}mounted=true;w.MosaicLibraries.configure(cfg);api=w.MosaicAPI.create(cfg);w.MosaicHost.boot(cfg);w.addEventListener('hashchange',render);root.addEventListener('click',rememberReturn);render();}
  function rememberReturn(e){var a=e.target.closest('.mo-result a,[data-mosaic-result],.mrs-card,.mo-card');if(!a)return;var r=route();try{var u=new URL(a.href,w.location.href),id=u.searchParams.get('pageId');if(id)w.sessionStorage.setItem('mosaic.return-results',JSON.stringify({url:w.location.href,pageId:id,savedAt:Date.now()}));}catch(_){}}
  function destroy(){root?.removeEventListener('click',rememberReturn);generation++;controller?.abort();editor?.destroy();cleanup.splice(0).forEach(function(fn){fn();});w.removeEventListener('hashchange',render);mounted=false;}
  w.MosaicSite={boot:boot,destroy:destroy,_test:{escape:esc,route:route,safeLink:nativeLink}};
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);

;
/* Also runs from the existing navBar include on ordinary native article pages. */
(function(w,d){'use strict';
  function start(){var c=w.MOSAIC_CONFIG;w.MosaicLibraries.configure(c);w.MosaicNavbar.boot(c);if(d.querySelector('[data-mosaic-root]'))w.MosaicSite.boot();else{var s=w.MosaicHost.boot(c);if(!s.isHome)w.MosaicHost.ready();}}
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window,document);
