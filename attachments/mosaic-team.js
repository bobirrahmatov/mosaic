/* Citi directory adapter for the explicitly configured Mosaic organisation.
 * Queries one person or one manager at a time; never searches the whole firm.
 * Directory text remains plain data. Cross-origin directory JSON uses
 * credential-free CORS; same-origin requests retain browser credentials. */
(function(w){
  'use strict';
  if(w.MosaicPeopleAPI)return;
  var SEARCH='https://ecs.search.citi.net/search/api/search/people';
  var PHOTO='https://globaldirectory.citigroup.net/globdir/photo-batch/photo/image';
  function error(code,message){var e=new Error(message);e.code=code;if(code==='ABORTED')e.name='AbortError';return e;}
  function abort(){return error('ABORTED','Directory loading was cancelled.');}
  function check(signal){if(signal&&signal.aborted)throw abort();}
  function id(value){if(typeof value!=='string'||!/^\d{1,20}$/.test(value.trim()))return '';return value.trim().replace(/^0+(?=\d)/,'');}
  function first(value){return typeof value==='string'?value.trim():Array.isArray(value)?value.filter(function(x){return typeof x==='string'&&x.trim();}).map(function(x){return x.trim();})[0]||'':'';}
  function number(value,fallback,min,max){return Number.isInteger(value)&&value>=min&&value<=max?value:fallback;}
  function issue(code,message,managerId){var result={code:code,message:message};if(managerId)result.managerId=managerId;return result;}
  function create(config){
    config=config||{};var options=config.people||{},location=new URL(w.location.href);
    var preview=config.mode==='preview'&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
    function endpoint(value,kind){
      if(kind==='photo'&&value===''&&preview)return '';
      var url;try{url=new URL(value,w.location.href);}catch(_){throw error('CONFIG','The directory '+kind+' URL is invalid.');}
      var live=new URL(kind==='search'?SEARCH:PHOTO);
      var allowed=url.origin===live.origin&&url.pathname===live.pathname&&url.protocol==='https:';
      var local=preview&&url.origin===location.origin&&url.pathname===(kind==='search'?'/preview/people-api':'/preview/person-photo.svg');
      if((!allowed&&!local)||url.username||url.password||url.search||url.hash)throw error('CONFIG','Directory requests must use the approved Citi endpoint or the explicit local preview fixture.');
      return url.href;
    }
    var searchUrl=endpoint(options.searchUrl===undefined?SEARCH:options.searchUrl,'search');
    var photoUrl=endpoint(options.photoUrl===undefined?PHOTO:options.photoUrl,'photo');
    var crossOrigin=new URL(searchUrl).origin!==location.origin;
    function authMessage(reason){return reason+(crossOrigin?' Cross-origin directory requests omit cookies to match this endpoint’s CORS policy. Ask the directory owner to confirm SSO/CORS support for Confluence; an approved same-origin integration may be required.':' Sign in to the directory and try again.');}
    function photoFor(geid){if(!photoUrl)return '';var image=new URL(photoUrl);image.searchParams.set('geid',geid);return image.href;}
    var topId=id(options.topGeid||'1001153649'),rootDefault=id(options.rootGeid||'1001397832');
    if(!topId||!rootDefault)throw error('CONFIG','Directory root and top GEIDs must be digit strings.');
    var timeout=number(options.timeoutMs,12000,1,60000),maxPeople=number(options.maxPeople,10000,1,100000),maxPages=number(options.maxPages,200,1,1000);
    var paging=options.pagination||{},pageSize=number(paging.pageSize,100,1,500);
    var startParam=paging.startParam===undefined?'start':paging.startParam,rowsParam=paging.rowsParam===undefined?'rows':paging.rowsParam;
    [startParam,rowsParam].forEach(function(param){if(param!==null&&(typeof param!=='string'||!/^[a-zA-Z][\w.-]{0,39}$/.test(param)||['q','q.mode'].includes(param)))throw error('CONFIG','Directory pagination parameter names are invalid.');});
    if(startParam&&startParam===rowsParam)throw error('CONFIG','Directory pagination parameters must be different.');
    var active=0,waiting=[],personIssues=new WeakMap(),sourceIds=new Map();
    function acquire(signal){
      return new Promise(function(resolve,reject){
        if(signal&&signal.aborted){reject(abort());return;}
        var ticket={start:function(){signal?.removeEventListener('abort',cancel);if(signal&&signal.aborted){reject(abort());advance();return;}active++;var released=false;resolve(function(){if(released)return;released=true;active--;advance();});}};
        function cancel(){var index=waiting.indexOf(ticket);if(index>=0){waiting.splice(index,1);reject(abort());}}
        signal?.addEventListener('abort',cancel,{once:true});if(active<3)ticket.start();else waiting.push(ticket);
      });
    }
    function advance(){while(active<3&&waiting.length)waiting.shift().start();}
    async function request(query,start,rows,signal){
      check(signal);var release=await acquire(signal),controller=new w.AbortController(),timedOut=false,timer;
      function cancel(){controller.abort();}
      try{
        check(signal);signal?.addEventListener('abort',cancel,{once:true});
        timer=w.setTimeout(function(){timedOut=true;controller.abort();},timeout);
        var url=new URL(searchUrl);url.searchParams.set('q',query);url.searchParams.set('q.mode','advanced');
        if(startParam)url.searchParams.set(startParam,String(start));if(rowsParam)url.searchParams.set(rowsParam,String(rows));
        var response=await w.fetch(url.href,{method:'GET',credentials:crossOrigin?'omit':'same-origin',mode:'cors',redirect:'manual',headers:{Accept:'application/json'},signal:controller.signal});
        check(signal);
        if(response.type==='opaqueredirect'||response.status>=300&&response.status<400)throw error('AUTH_REQUIRED',authMessage('The directory redirected the request, possibly to sign-in.'));
        if(response.status===401||response.status===403)throw error('AUTH_REQUIRED',authMessage('The Citi directory did not authorise this request (HTTP '+response.status+').'));
        if(!response.ok)throw error('DIRECTORY_HTTP','The Citi directory returned HTTP '+response.status+'. Try again when the service is available.');
        if(response.url){var finalUrl=new URL(response.url,url.href);if(finalUrl.origin!==url.origin||finalUrl.pathname!==url.pathname)throw error('AUTH_REQUIRED',authMessage('The directory redirected away from its API, possibly to sign-in.'));}
        var contentType=response.headers?.get('content-type')||'';
        if(/html/i.test(contentType))throw error('AUTH_REQUIRED',authMessage('The directory returned a sign-in page instead of people data.'));
        var body;try{body=await response.json();}catch(_){throw error('INVALID_RESPONSE',crossOrigin?'The directory response was not valid JSON. Ask the directory owner to check the endpoint and its SSO/CORS configuration, then retry.':'The directory response was not valid JSON. Check sign-in and the directory service, then retry.');}
        check(signal);var people=body&&body.people,hits=people&&people.hits;
        if(typeof hits==='string'&&/^\d+$/.test(hits))hits=Number(hits);
        if(!people||!Array.isArray(people.docs)||!Number.isSafeInteger(hits)||hits<0)throw error('INVALID_RESPONSE','The directory response did not contain a valid people.docs array and people.hits count.');
        return {docs:people.docs,hits:hits};
      }catch(e){
        if(signal&&signal.aborted)throw abort();if(timedOut)throw error('TIMEOUT','The directory request timed out. Try again on the Citi network.');
        if(e.code)throw e;if(e.name==='AbortError')throw abort();
        throw error('NETWORK_OR_CORS',crossOrigin?'The directory could not be reached or the browser blocked its CORS response. Check the Citi network. If this persists, ask the directory owner to verify SSO/CORS support for credential-free requests from Confluence.':'The directory could not be reached. Check the Citi network and the same-origin directory endpoint, then retry.');
      }finally{w.clearTimeout(timer);signal?.removeEventListener('abort',cancel);release();}
    }
    function normalize(doc){
      if(!doc||typeof doc!=='object'||Array.isArray(doc))throw error('INVALID_PERSON','The directory returned an invalid person record.');
      var rawId=first(doc.geid),personId=id(rawId);if(!personId)throw error('INVALID_PERSON','A directory record has no valid string GEID.');sourceIds.set(personId,rawId);
      var warnings=[],ancestors=[],seen=new Set(),hierarchy=first(doc.ql_managerialhierarchy);
      hierarchy.split(';').forEach(function(part){
        var split=part.indexOf('#');if(split<0){if(part.trim())warnings.push(issue('INVALID_HIERARCHY','A directory hierarchy entry could not be read.'));return;}
        var raw=part.slice(0,split).trim(),name=part.slice(split+1).trim();if(!raw&&!name)return;
        var ancestorId=id(raw);if(!ancestorId){warnings.push(issue('INVALID_HIERARCHY','A directory hierarchy entry has no valid GEID.'));return;}if(!sourceIds.has(ancestorId))sourceIds.set(ancestorId,raw);
        if(seen.has(ancestorId)){warnings.push(issue('HIERARCHY_CYCLE','The directory hierarchy repeats a person.'));return;}seen.add(ancestorId);ancestors.push({id:ancestorId,name:name});
      });
      var self=ancestors.findIndex(function(a){return a.id===personId;});if(self>=0)ancestors=ancestors.slice(0,self);
      var rawManager=first(doc.managergeid),manager=id(rawManager);if(manager&&!sourceIds.has(manager))sourceIds.set(manager,rawManager);
      if(rawManager&&!manager)warnings.push(issue('INVALID_MANAGER','A directory record has an invalid manager GEID.'));
      if(!manager&&ancestors.length)manager=ancestors[ancestors.length-1].id;
      var person={id:personId,name:first(doc.name),title:first(doc.jobtitle),location:first(doc.location),managerId:manager,ancestors:ancestors,photoUrl:photoFor(rawId)};
      personIssues.set(person,warnings);return person;
    }
    async function getPerson(geid,args){
      args=args||{};var personId=id(geid);if(!personId)throw error('INVALID_GEID','A person GEID must be a digit string.');
      var result=await request('geid:'+(sourceIds.get(personId)||geid.trim()),0,2,args.signal),matches=[];
      result.docs.forEach(function(doc){var person=normalize(doc);if(person.id===personId)matches.push(person);});
      if(!matches.length)throw error('NOT_FOUND','The directory did not return the requested person ('+personId+').');
      if(matches.length>1)throw error('AMBIGUOUS_PERSON','The directory returned multiple records for GEID '+personId+'.');
      return matches[0];
    }
    async function getReports(geid,args){
      args=args||{};var managerId=id(geid);if(!managerId)throw error('INVALID_GEID','A manager GEID must be a digit string.');
      var people=[],warnings=[],seen=new Set(),start=0,expected=null,page=0;
      while(true){
        check(args.signal);var result;
        try{result=await request('managergeid:'+(sourceIds.get(managerId)||geid.trim()),start,pageSize,args.signal);}catch(e){if(e.code==='ABORTED')throw e;if(!page)throw e;warnings.push(issue(e.code,e.message,managerId));break;}
        page++;if(expected===null)expected=result.hits;else if(expected!==result.hits){warnings.push(issue('RESULTS_CHANGED','The report count changed while loading this manager. Refresh to verify the complete list.',managerId));expected=Math.max(expected,result.hits);}
        if(result.docs.length>result.hits)warnings.push(issue('HITS_MISMATCH','The directory returned more records than its report count.',managerId));
        var progressed=0;
        result.docs.forEach(function(doc){
          var person;try{person=normalize(doc);}catch(e){warnings.push(issue(e.code,e.message,managerId));return;}
          if(seen.has(person.id)){warnings.push(issue('DUPLICATE_REPORT','A report was repeated across directory results.',managerId));return;}
          seen.add(person.id);progressed++;warnings.push(...(personIssues.get(person)||[]).map(function(x){return issue(x.code,x.message,managerId);}));
          if(person.managerId!==managerId){warnings.push(issue('MANAGER_MISMATCH','A returned person does not identify this manager; the record was excluded.',managerId));return;}
          people.push(person);
        });
        start+=result.docs.length;
        if(start>=expected){if(seen.size<expected)warnings.push(issue('TRUNCATED_RESULTS','Some directory records were missing or repeated; this manager’s report list is incomplete.',managerId));break;}
        if(!result.docs.length||!progressed){warnings.push(issue('PAGINATION_STALLED','Directory pagination made no progress. The supplied offset parameters may not be supported; reports remain incomplete.',managerId));break;}
        if(!startParam){warnings.push(issue('PAGINATION_UNCONFIGURED','The directory reports additional people, but no offset parameter is configured.',managerId));break;}
        if(page>=maxPages){warnings.push(issue('PAGE_LIMIT','The directory page limit was reached before all reports loaded.',managerId));break;}
      }
      return {people:people,hits:expected===null?0:expected,warnings:warnings,complete:warnings.length===0};
    }
    async function loadOrganization(rootGeid,args){
      args=args||{};var rootId=id(rootGeid||rootDefault);if(!rootId)throw error('INVALID_GEID','The organisation root GEID must be a digit string.');
      var root=await getPerson(rootGeid||rootDefault,{signal:args.signal}),people=new Map([[root.id,root]]),warnings=(personIssues.get(root)||[]).slice(),queried=0;
      function progress(pending){if(typeof args.onProgress==='function'){try{args.onProgress({loaded:people.size,queried:queried,pending:pending});}catch(_){/* A rendering callback must not interrupt discovery. */}}}
      async function ancestors(){
        if(root.id===topId)return [];
        var chain=root.ancestors,top=chain.findIndex(function(p){return p.id===topId;});
        var connectsToRoot=chain.length>0&&chain[chain.length-1].id===root.managerId;
        function knownChain(items){return items.map(function(p){return {id:p.id,name:p.name,photoUrl:photoFor(sourceIds.get(p.id)||p.id)};});}
        var profiles=new Map();
        function profile(personId){if(!profiles.has(personId))profiles.set(personId,getPerson(personId,{signal:args.signal}));return profiles.get(personId);}
        if(top>=0&&connectsToRoot){
          var known=chain.slice(top);
          if(known.length>100){known=known.slice(-100);warnings.push(issue('ANCESTOR_LIMIT','The known leadership chain exceeds the profile lookup limit; its highest part is not shown.'));}
          // The hierarchy establishes identities, but full cards need each person's own profile.
          // request() keeps these reads and descendant discovery within three active requests.
          var enriched=await Promise.all(known.map(async function(person){
            try{var full=await profile(person.id);warnings.push(...(personIssues.get(full)||[]));return full;}
            catch(e){if(e.code==='ABORTED')throw e;warnings.push(issue('ANCESTOR_PROFILE_UNAVAILABLE','A leadership profile could not be fully loaded ('+person.id+'): '+e.message,person.id));return knownChain([person])[0];}
          }));
          var changed=enriched.some(function(person,i){return i>0&&person.managerId&&person.managerId!==known[i-1].id;});
          if(!changed)return enriched;
          warnings.push(issue('ANCESTOR_CHAIN_CHANGED','A current leadership profile differs from the supplied hierarchy. Only its verified manager chain is shown.'));
          connectsToRoot=false;
        }
        var result=[],seen=new Set([root.id]),next=root.managerId;
        while(next){
          check(args.signal);if(seen.has(next)){warnings.push(issue('ANCESTOR_CYCLE','The manager chain contains a cycle; the ancestor path is incomplete.'));break;}seen.add(next);
          var person;try{person=await profile(next);}catch(e){if(e.code==='ABORTED')throw e;warnings.push(issue(e.code,'An ancestor could not be loaded: '+e.message,next));break;}
          result.push(person);warnings.push(...(personIssues.get(person)||[]));if(person.id===topId)return result.reverse();next=person.managerId;
          if(result.length>=100){warnings.push(issue('ANCESTOR_LIMIT','The manager chain exceeded the safety limit before the configured top person.'));break;}
        }
        warnings.push(issue('INCOMPLETE_ANCESTRY','The manager chain could not be verified through the configured top person.'));
        // A stale hierarchy must not draw a manager link contradicted by the root record.
        return result.length?result.reverse():connectsToRoot?knownChain(chain):[];
      }
      async function descendants(){
        var frontier=[root.id];progress(frontier.length);
        while(frontier.length){
          check(args.signal);var next=[],index=0,finished=0;
          async function worker(){
            while(index<frontier.length){var managerId=frontier[index++],reports;
              try{reports=await getReports(managerId,{signal:args.signal});}catch(e){if(e.code==='ABORTED')throw e;warnings.push(issue(e.code,e.message,managerId));queried++;finished++;progress(frontier.length-finished+next.length);continue;}
              queried++;finished++;warnings.push(...reports.warnings);
              reports.people.forEach(function(person){
                if(people.has(person.id)){warnings.push(issue(person.id===root.id?'REPORTING_CYCLE':'REPEATED_DESCENDANT','A person was encountered again in the reporting tree; that repeated branch was not followed.',managerId));return;}
                if(people.size>=maxPeople){if(!warnings.some(function(x){return x.code==='PEOPLE_LIMIT';}))warnings.push(issue('PEOPLE_LIMIT','The organisation limit was reached before all descendants loaded.'));return;}
                people.set(person.id,person);next.push(person.id);
              });progress(frontier.length-finished+next.length);
            }
          }
          await Promise.all(Array.from({length:Math.min(3,frontier.length)},worker));frontier=next;
        }
        progress(0);
      }
      var results=await Promise.all([ancestors(),descendants()]);check(args.signal);
      return {rootId:root.id,people:Array.from(people.values()),ancestors:results[0],warnings:warnings,complete:warnings.length===0};
    }
    return {getPerson:getPerson,getReports:getReports,loadOrganization:loadOrganization};
  }
  w.MosaicPeopleAPI={create:create};
})(window);

;
/* Mosaic team: complete source-backed hierarchy, native DOM, no UI runtime. */
(function (w) {
  'use strict';
  if (w.MosaicTeam) return;
  var mounted = new WeakMap();
  function id(value) { var s = value == null ? '' : String(value).trim(); return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : ''; }
  function text(value) { return typeof value === 'string' ? value.trim() : ''; }
  function displayName(value) { var name = text(value), parts = name.split(',').map(function (part) { return part.trim(); }); return parts.length === 2 && parts[0] && parts[1] ? parts[1] + ' ' + parts[0] : name; }
  function initials(name) { var words = name.trim().split(/\s+/).filter(Boolean); return words.length ? (Array.from(words[0])[0] + (words.length > 1 ? Array.from(words[words.length - 1])[0] : '')).toUpperCase() : '?'; }
  function photoURL(value, config) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      var u = new URL(value, w.location.href), here = new URL(w.location.href);
      var live = u.origin === 'https://globaldirectory.citigroup.net' && u.pathname === '/globdir/photo-batch/photo/image';
      var local = config.mode === 'preview' && ['localhost','127.0.0.1','[::1]'].includes(here.hostname) && u.origin === here.origin && u.pathname === '/preview/person-photo.svg';
      return (live || local) && !u.username && !u.password && !u.hash ? u.href : '';
    } catch (_) { return ''; }
  }
  function coverURL(config) {
    try {
      var base = config.assetBase || (config.contextPath || '/confluence') + '/download/attachments/' + (id(config.attachmentPageId) || '3981001251') + '/';
      var u = new URL(base.replace(/\/?$/, '/') + 'mosaic-cover-25.webp', w.location.href);
      return u.origin === w.location.origin && /^https?:$/.test(u.protocol) && !u.username && !u.password ? u.href : '';
    } catch (_) { return ''; }
  }

  function mount(target, options) {
    if (!target || target.nodeType !== 1 || !target.ownerDocument) throw new Error('A team container is required.');
    if (mounted.has(target)) mounted.get(target).destroy();
    var config = options && options.config || {}, peopleConfig = config.people || {};
    var rootId = id(peopleConfig.rootGeid || config.rootGeid || '1001397832');
    var preview = config.mode === 'preview' || peopleConfig.preview === true || config.preview === true;
    var d = target.ownerDocument, listeners = [], destroyed = false, controller = null, request = 0, loading = false;
    var state = null, nodes = [], nodeById = new Map(), frame = null, resizeObserver = null, centerOnLayout = false;
    function el(tag, cls, value) { var n = d.createElement(tag); if (cls) n.className = cls; if (value !== undefined) n.textContent = value; return n; }
    function add(parent, tag, cls, value) { var n = el(tag, cls, value); parent.appendChild(n); return n; }
    function retry(parent) { var n = add(parent, 'button', 'mt-button', 'Try again'); n.type = 'button'; n.dataset.action = 'retry'; return n; }
    function on(node, event, fn, capture) { node.addEventListener(event, fn, capture); listeners.push(function () { node.removeEventListener(event, fn, capture); }); }
    function personName(p) { return p.name || 'Person ' + p.id; }

    var root = el('section', 'mt-root'); root.setAttribute('aria-label', 'Mosaic team');
    var heading = add(root, 'header', 'mt-heading'); add(heading, 'h1', 'mt-title', 'Meet the team');
    add(heading, 'p', 'mt-intro', 'The people behind Mosaic and the connections that bring our work together.');
    if (preview) add(heading, 'p', 'mt-preview-note', 'Reference preview · based on the supplied organization chart. Live directory data has not been verified here.');
    var cover = coverURL(config);
    if (cover) { var hero = add(root, 'figure', 'mt-hero'), heroImage = add(hero, 'img'); heroImage.alt = ''; heroImage.width = 800; heroImage.height = 500; heroImage.decoding = 'async'; heroImage.loading = 'lazy'; heroImage.src = cover; }
    var chart = add(root, 'section', 'mt-chart'); add(chart, 'h2', 'mt-section-title', 'Organization chart');
    var workbench = add(chart, 'div', 'mt-workbench');
    var status = add(workbench, 'div', 'mt-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    var warning = add(workbench, 'div', 'mt-warning'); warning.hidden = true;
    var body = add(workbench, 'div', 'mt-body'); body.hidden = true;
    var viewport = add(body, 'div', 'mt-viewport'); viewport.tabIndex = 0; viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', 'Complete Mosaic team hierarchy. Scroll to explore. On a person, use Up and Down for adjacent people, Left for their manager, and Right for their first report.');
    var stage = add(viewport, 'div', 'mt-chart-stage');
    var announcement = add(root, 'span', 'mt-sr'); announcement.setAttribute('role', 'status'); announcement.setAttribute('aria-live', 'polite');
    target.appendChild(root);

    function normalize(result) {
      if (!result || id(result.rootId) !== rootId || !Array.isArray(result.people) || !Array.isArray(result.ancestors)) throw new Error('The people directory returned an unexpected team response.');
      var all = new Map(), ancestorIds = new Set(), ancestors = [], parent = new Map(), children = new Map(), notices = [], complete = result.complete === true;
      function issue(message) { complete = false; if (!notices.includes(message)) notices.push(message); }
      function copy(p) { if (!p || !id(p.id)) return null; return {id:id(p.id),name:displayName(p.name),title:text(p.title),location:text(p.location),managerId:id(p.managerId),photoUrl:photoURL(p.photoUrl, config)}; }
      result.people.forEach(function (p) { var person = copy(p); if (person) all.set(person.id, person); else issue('A directory record could not be displayed.'); });
      if (!all.has(rootId)) throw new Error('The directory response did not include the configured team lead.');
      result.ancestors.forEach(function (p) { var person = copy(p); if (person && !all.has(person.id)) { all.set(person.id, person); ancestorIds.add(person.id); ancestors.push(person); } });
      all.forEach(function (p) {
        if (p.id === rootId || ancestorIds.has(p.id)) return;
        if (p.managerId && all.has(p.managerId) && p.managerId !== p.id && !ancestorIds.has(p.managerId)) parent.set(p.id, p.managerId);
        else issue('Some reporting relationships are unavailable. Those people are shown without a connecting line.');
      });
      ancestors.forEach(function (p, i) { if (i) parent.set(p.id, ancestors[i - 1].id); });
      if (ancestors.length) parent.set(rootId, ancestors[ancestors.length - 1].id);
      // Iterative cycle detection keeps even malformed records visible without inventing relationships.
      var resolved = new Set();
      all.forEach(function (_p, personId) {
        var chain = [], positions = new Set(), cursor = personId;
        while (cursor && !resolved.has(cursor)) {
          if (positions.has(cursor)) { parent.delete(cursor); issue('A circular reporting relationship was returned. The affected branch is shown without that connection.'); break; }
          positions.add(cursor); chain.push(cursor); cursor = parent.get(cursor);
        }
        chain.forEach(function (item) { resolved.add(item); });
      });
      parent.forEach(function (managerId, personId) { if (!children.has(managerId)) children.set(managerId, []); children.get(managerId).push(personId); });
      function sort(a, b) { return personName(all.get(a)).localeCompare(personName(all.get(b))) || a.localeCompare(b); }
      children.forEach(function (list) { list.sort(sort); });
      var roots = Array.from(all.keys()).filter(function (personId) { return !parent.has(personId); }).sort(sort);
      var first = ancestors.length ? ancestors[0].id : rootId; roots.sort(function (a, b) { return a === first ? -1 : b === first ? 1 : sort(a, b); });
      if (Array.isArray(result.warnings)) result.warnings.forEach(function (item) { var message = typeof item === 'string' ? item.trim() : item && text(item.message); if (message && !notices.includes(message)) notices.push(message); });
      return {all:all,ancestors:ancestorIds,parent:parent,children:children,roots:roots,warnings:notices,complete:complete};
    }

    function renderStatus(kind, message, canRetry) {
      status.hidden = !message; status.className = 'mt-status' + (kind ? ' mt-status-' + kind : ''); status.replaceChildren();
      if (kind === 'loading') add(status, 'span', 'mt-spinner').setAttribute('aria-hidden', 'true');
      if (message) add(status, 'p', 'mt-status-message', message);
      if (canRetry) retry(status);
    }
    function renderWarnings() {
      warning.replaceChildren(); warning.hidden = state.complete && !state.warnings.length;
      if (warning.hidden) return;
      if (!state.complete) add(warning, 'p', 'mt-warning-title', 'Some team information could not be fully loaded. All people returned so far are shown below.');
      if (state.warnings.length) { var details = add(warning, 'details', 'mt-notices'); add(details, 'summary', '', 'Directory details'); var ul = add(details, 'ul'); state.warnings.forEach(function (notice) { add(ul, 'li', '', notice); }); }
      if (!state.complete) retry(warning);
    }
    function setLoading(value) { loading = value; body.setAttribute('aria-busy', String(value)); root.querySelectorAll('[data-action=retry]').forEach(function (b) { b.disabled = value; }); }
    async function load() {
      var serial = ++request; if (controller) controller.abort(); controller = new w.AbortController(); setLoading(true); renderStatus('loading', 'Loading people and reporting lines…');
      try {
        if (!rootId) throw new Error('A valid team lead ID is required.');
        if (!w.MosaicPeopleAPI || typeof w.MosaicPeopleAPI.create !== 'function') throw new Error('The people directory is unavailable. Try again after the page has finished loading.');
        var api = w.MosaicPeopleAPI.create(config);
        var result = await api.loadOrganization(rootId, {signal:controller.signal,onProgress:function () { if (!destroyed && serial === request && loading) renderStatus('loading', 'Loading people and reporting lines…'); }});
        if (destroyed || serial !== request) return;
        state = normalize(result); renderWarnings(); body.hidden = false; renderStatus('', ''); renderTree();
        announcement.textContent = state.complete ? 'Team hierarchy loaded.' : 'Team hierarchy loaded with some reporting lines incomplete.';
      } catch (error) {
        if (destroyed || serial !== request || (error && error.name === 'AbortError')) return;
        var message = error && error.message ? String(error.message) : 'The people directory could not be loaded.';
        renderStatus('error', (state ? 'Could not reload the team. Showing the previously loaded people. ' : '') + message, true);
        if (!state) body.hidden = true;
      } finally { if (!destroyed && serial === request) setLoading(false); }
    }

    function personCard(person) {
      var card = el('article', 'mt-card'); card.dataset.person = person.id; card.tabIndex = 0; card.setAttribute('role', 'group');
      var manager = state.all.get(state.parent.get(person.id)); card.setAttribute('aria-label', personName(person) + (manager ? '. Reports to ' + personName(manager) + '.' : '.'));
      if (person.id === rootId) card.dataset.root = 'true';
      var avatar = add(card, 'span', 'mt-avatar'); add(avatar, 'span', 'mt-initials', initials(personName(person))).setAttribute('aria-hidden', 'true');
      if (person.photoUrl) { var img = add(avatar, 'img', 'mt-photo'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.src = person.photoUrl; }
      var copy = add(card, 'div', 'mt-person-copy'); add(copy, 'span', 'mt-person-name', personName(person));
      if (person.title) add(copy, 'span', 'mt-person-title', person.title);
      if (person.location) add(copy, 'span', 'mt-person-location', person.location);
      return card;
    }
    function renderTree() {
      nodes = []; nodeById = new Map(); stage.replaceChildren();
      var svg = d.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('mt-connectors'); svg.setAttribute('aria-hidden', 'true'); stage.appendChild(svg);
      var fragment = d.createDocumentFragment(), pending = state.roots.slice().reverse().map(function (personId) { return {id:personId,depth:0}; });
      while (pending.length) {
        var item = pending.pop(), person = state.all.get(item.id), card = personCard(person);
        var node = {id:item.id,person:person,card:card,depth:item.depth,width:220,height:172,x:0,y:0,subtreeWidth:0,index:nodes.length};
        card.dataset.depth = String(item.depth); nodes.push(node); nodeById.set(item.id, node); fragment.appendChild(card);
        var children = state.children.get(item.id) || []; for (var i = children.length - 1; i >= 0; i--) pending.push({id:children[i],depth:item.depth + 1});
      }
      stage.appendChild(fragment); scheduleLayout(true);
    }
    function layout() {
      if (destroyed || !state || body.hidden || !nodes.length) return;
      var levelHeights = [], levelGaps = [], levelY = [], gap = 28, padding = 24;
      nodes.forEach(function (node) { node.height = node.card.offsetHeight || 172; levelHeights[node.depth] = Math.max(levelHeights[node.depth] || 0, node.height); levelGaps[node.depth] = 44; });
      for (var i = nodes.length - 1; i >= 0; i--) {
        var node = nodes[i], children = state.children.get(node.id) || [], total = 0;
        children.forEach(function (childId) { total += nodeById.get(childId).subtreeWidth; });
        node.subtreeWidth = Math.max(node.width, total + Math.max(0, children.length - 1) * gap);
      }
      levelHeights.forEach(function (height, depth) { levelY[depth] = depth ? levelY[depth - 1] + levelHeights[depth - 1] + levelGaps[depth - 1] : padding; });
      var forestWidth = 0; state.roots.forEach(function (personId) { forestWidth += nodeById.get(personId).subtreeWidth; }); forestWidth += Math.max(0, state.roots.length - 1) * 64;
      var naturalWidth = Math.max(620, forestWidth + padding * 2), naturalHeight = levelY[levelY.length - 1] + levelHeights[levelHeights.length - 1] + padding;
      var cursor = (naturalWidth - forestWidth) / 2;
      state.roots.forEach(function (personId) { var node = nodeById.get(personId); node.left = cursor; cursor += node.subtreeWidth + 64; });
      nodes.forEach(function (node) {
        node.x = node.left + (node.subtreeWidth - node.width) / 2; node.y = levelY[node.depth];
        node.card.style.left = node.x + 'px'; node.card.style.top = node.y + 'px';
        var children = state.children.get(node.id) || [], total = 0; children.forEach(function (childId) { total += nodeById.get(childId).subtreeWidth; }); total += Math.max(0, children.length - 1) * gap;
        var childLeft = node.left + (node.subtreeWidth - total) / 2; children.forEach(function (childId) { var child = nodeById.get(childId); child.left = childLeft; childLeft += child.subtreeWidth + gap; });
      });
      stage.style.width = naturalWidth + 'px'; stage.style.height = naturalHeight + 'px';
      var svg = stage.querySelector('.mt-connectors'); svg.replaceChildren(); svg.setAttribute('viewBox', '0 0 ' + naturalWidth + ' ' + naturalHeight); svg.style.width = naturalWidth + 'px'; svg.style.height = naturalHeight + 'px';
      var paths = d.createDocumentFragment();
      state.parent.forEach(function (managerId, personId) {
        var from = nodeById.get(managerId), to = nodeById.get(personId), startX = from.x + from.width / 2, startY = from.y + from.height, endX = to.x + to.width / 2, midY = levelY[to.depth] - levelGaps[from.depth] / 2;
        var path = d.createElementNS('http://www.w3.org/2000/svg', 'path'); path.dataset.from = managerId; path.dataset.to = personId; path.setAttribute('d', 'M ' + startX + ' ' + startY + ' V ' + midY + ' H ' + endX + ' V ' + to.y); paths.appendChild(path);
      }); svg.appendChild(paths);
      if (centerOnLayout) { var lead = nodeById.get(rootId), width = viewport.clientWidth || 700; viewport.scrollLeft = Math.max(0, lead.x + lead.width / 2 - width / 2); viewport.scrollTop = 0; centerOnLayout = false; }
    }
    function scheduleLayout(center) { centerOnLayout = centerOnLayout || !!center; if (frame !== null) return; frame = w.setTimeout(function () { frame = null; layout(); }, 0); }
    function focusNode(node) {
      if (!node) return; node.card.focus({preventScroll:true});
      var width = viewport.clientWidth || 700, height = viewport.clientHeight || 700, margin = 20;
      if (node.x < viewport.scrollLeft + margin) viewport.scrollLeft = Math.max(0, node.x - margin);
      else if (node.x + node.width > viewport.scrollLeft + width - margin) viewport.scrollLeft = node.x + node.width - width + margin;
      if (node.y < viewport.scrollTop + margin) viewport.scrollTop = Math.max(0, node.y - margin);
      else if (node.y + node.height > viewport.scrollTop + height - margin) viewport.scrollTop = node.y + node.height - height + margin;
      // Desktop uses the page's vertical scroll; mobile may also scroll the chart.
      if (typeof node.card.scrollIntoView === 'function') node.card.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
    }
    on(root, 'click', function (event) { var b = event.target.closest('button[data-action=retry]'); if (b && root.contains(b) && !b.disabled && !loading) load(); });
    on(root, 'error', function (event) { if (event.target && event.target.classList && event.target.classList.contains('mt-photo')) event.target.remove(); else if (event.target === heroImage && hero) hero.hidden = true; }, true);
    on(stage, 'keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      var card = event.target.closest('.mt-card'); if (!card || !stage.contains(card)) return;
      var node = nodeById.get(card.dataset.person), next;
      if (event.key === 'ArrowLeft') next = nodeById.get(state.parent.get(node.id));
      else if (event.key === 'ArrowRight') next = nodeById.get((state.children.get(node.id) || [])[0]);
      else if (event.key === 'ArrowUp') next = nodes[node.index - 1];
      else if (event.key === 'ArrowDown') next = nodes[node.index + 1];
      else if (event.key === 'Home') next = nodes[0];
      else if (event.key === 'End') next = nodes[nodes.length - 1];
      else return;
      event.preventDefault(); focusNode(next);
    });
    if (typeof w.ResizeObserver === 'function') { resizeObserver = new w.ResizeObserver(function () { scheduleLayout(true); }); resizeObserver.observe(viewport); }
    else on(w, 'resize', function () { scheduleLayout(true); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { if (!destroyed) scheduleLayout(false); });
    var handle = Object.freeze({destroy:function () { if (destroyed) return; destroyed = true; request++; if (controller) controller.abort(); if (frame !== null) w.clearTimeout(frame); if (resizeObserver) resizeObserver.disconnect(); listeners.splice(0).forEach(function (remove) { remove(); }); root.remove(); if (mounted.get(target) === handle) mounted.delete(target); }});
    mounted.set(target, handle); load(); return handle;
  }
  w.MosaicTeam = Object.freeze({mount:mount});
}(window));
