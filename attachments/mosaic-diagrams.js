/* Mosaic source-driven Strategic View. SVG only; no network or third-party runtime. */
(function (w) {
  'use strict';
  if (w.MosaicStrategyDiagram) return;
  var SVG = 'http://www.w3.org/2000/svg', sequence = 0, mounted = new WeakMap();
  var classifications = ['New Utility Module','Legacy','Consistent with Target'];
  var maturities = ['New Function','Function in Dev','Function Live'];

  function validate(input) {
    function fail(field) { throw new Error('Invalid Mosaic strategic diagram: ' + field + '.'); }
    function object(value, field) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field); return value; }
    function text(value, field, optional) { if (optional && (value === undefined || value === null || value === '')) return ''; if (typeof value !== 'string' || !value.trim()) fail(field); return value; }
    function id(value, field) { if (typeof value !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(value)) fail(field); return value; }
    function list(value, field) { if (!Array.isArray(value)) fail(field); return value; }
    function finite(value, field) { if (typeof value !== 'number' || !Number.isFinite(value)) fail(field); return value; }
    object(input, 'data'); var canvas = object(input.canvas, 'canvas'), width = finite(canvas.width, 'canvas width'), height = finite(canvas.height, 'canvas height');
    if (width <= 0 || height <= 0 || width > 20000 || height > 20000) fail('canvas dimensions');
    function box(value, field) {
      object(value, field); var result = {x:finite(value.x, field + ' x'),y:finite(value.y, field + ' y'),w:finite(value.w, field + ' width'),h:finite(value.h, field + ' height')};
      if (result.x < 0 || result.y < 0 || result.w <= 0 || result.h <= 0 || result.x + result.w > width + 0.01 || result.y + result.h > height + 0.01) fail(field + ' bounds');
      return result;
    }
    var seen = new Map();
    function node(row, container) {
      object(row, 'node'); var result = {id:id(row.id, 'node ID'),label:text(row.label, 'node label'),box:box(row.box, 'node box'),parent:text(row.parent, 'parent', true),description:text(row.description, 'description', true),container:container};
      if (seen.has(result.id)) fail('duplicate ID'); seen.set(result.id, result);
      if (row.labelBox !== undefined) result.labelBox = box(row.labelBox, 'label box');
      if (!container) {
        result.classification = text(row.classification, 'classification', true); result.maturity = text(row.maturity, 'maturity', true);
        if (result.classification && !classifications.includes(result.classification)) fail('classification');
        if (result.maturity && !maturities.includes(result.maturity)) fail('maturity');
        result.style = text(row.style, 'style', true); if (!['','bus','function','adapter','cloud','stack'].includes(result.style)) fail('style');
        result.sourceBorder = text(row.sourceBorder, 'source border', true); if (result.sourceBorder && result.sourceBorder !== 'green') fail('source border');
      }
      return result;
    }
    var containers = list(input.containers || [], 'containers').map(function (row) { return node(row, true); });
    var components = list(input.components, 'components').map(function (row) { return node(row, false); });
    var componentMap = new Map(components.map(function (row) { return [row.id,row]; }));
    seen.forEach(function (row) {
      var lineage = new Set([row.id]), parent = row.parent;
      while (parent) { if (!seen.has(parent) || lineage.has(parent)) fail('parent hierarchy'); lineage.add(parent); parent = seen.get(parent).parent; }
    });
    var connections = list(input.connections, 'connections').map(function (edge) {
      object(edge, 'connection'); if (!componentMap.has(edge.from) || !componentMap.has(edge.to)) fail('connection reference');
      var direction = text(edge.direction, 'direction', true); if (!['','none','undirected','forward','bidirectional'].includes(direction)) fail('connection direction');
      var result = {from:edge.from,to:edge.to,direction:direction,label:text(edge.label, 'connection label', true)};
      if (edge.points !== undefined) {
        result.points = list(edge.points, 'connection points').map(function (point) { object(point, 'connection point'); var x = finite(point.x, 'point x'), y = finite(point.y, 'point y'); if (x < 0 || x > width || y < 0 || y > height) fail('point bounds'); return {x:x,y:y}; });
        if (result.points.length < 2) fail('connection route');
        result.points.forEach(function (point, index) { if (index && point.x !== result.points[index - 1].x && point.y !== result.points[index - 1].y) fail('non-orthogonal connection route'); });
      }
      return result;
    });
    return {title:text(input.title, 'title', true) || 'Strategic View',width:width,height:height,containers:containers,components:components,connections:connections};
  }

  function mount(element, options) {
    if (!element || element.nodeType !== 1 || !element.ownerDocument) throw new Error('A strategic diagram container is required.');
    var data = validate(options && options.data);
    if (mounted.has(element)) mounted.get(element).destroy();
    var d = element.ownerDocument, uid = 'msg-' + (++sequence), removers = [], destroyed = false, scale = 1, fitMode = true, selected = null, focused = 0, drag = null, suppressClick = false;
    var layout = {width:0,height:0,left:12,top:12,stageWidth:0,stageHeight:0};
    var componentMap = new Map(data.components.map(function (row) { return [row.id,row]; })), nodeElements = new Map(), edgeElements = [];
    function html(tag, className, value) { var n = d.createElement(tag); if (className) n.className = className; if (value !== undefined) n.textContent = value; return n; }
    function add(parent, tag, className, value) { var n = html(tag, className, value); parent.appendChild(n); return n; }
    function svg(tag, attrs, value) { var n = d.createElementNS(SVG, tag); Object.keys(attrs || {}).forEach(function (key) { n.setAttribute(key, String(attrs[key])); }); if (value !== undefined) n.textContent = value; return n; }
    function shape(parent, tag, attrs, value) { var n = svg(tag, attrs, value); parent.appendChild(n); return n; }
    function on(node, event, fn, config) { node.addEventListener(event, fn, config); removers.push(function () { node.removeEventListener(event, fn, config); }); }
    function control(parent, label, title, action, className) { var n = add(parent, 'button', 'msg-control' + (className ? ' ' + className : ''), label); n.type = 'button'; n.setAttribute('aria-label', title); n.title = title; on(n, 'click', action); return n; }
    var root = html('div', 'msg-root'), heading = add(root, 'div', 'msg-heading');
    add(heading, 'p', 'msg-eyebrow', 'Architecture overview'); add(heading, 'h3', 'msg-title', data.title);
    var toolbar = add(root, 'div', 'msg-toolbar'); toolbar.setAttribute('role', 'toolbar'); toolbar.setAttribute('aria-label', 'Strategic diagram controls');
    var zoomControls = add(toolbar, 'div', 'msg-zoom-controls');
    var zoomOut = control(zoomControls, '−', 'Zoom out', function () { zoom(scale / 1.25); });
    var percentage = add(zoomControls, 'output', 'msg-percentage'); percentage.setAttribute('aria-label', 'Zoom level');
    var zoomIn = control(zoomControls, '+', 'Zoom in', function () { zoom(scale * 1.25); });
    control(zoomControls, 'Fit', 'Fit the full diagram', fit);
    control(zoomControls, '100%', 'Show diagram at actual size', function () { zoom(1); });
    var actions = add(toolbar, 'div', 'msg-actions');
    var expand = control(actions, 'Expand canvas', 'Expand diagram canvas', function () { var expanded = root.classList.toggle('msg-expanded'); expand.setAttribute('aria-expanded', String(expanded)); expand.textContent = expanded ? 'Reduce canvas' : 'Expand canvas'; expand.setAttribute('aria-label', expanded ? 'Reduce diagram canvas' : 'Expand diagram canvas'); refresh(); }); expand.setAttribute('aria-expanded', 'false');
    var clear = control(actions, 'Clear focus', 'Clear selected component', function () { select(null); }); clear.disabled = true;
    var help = add(root, 'p', 'msg-help', 'Drag empty canvas or use the scrollbars to pan. Use + / − to zoom and Fit for the full view. Select a component to follow its connections.'); help.id = uid + '-help';
    var viewport = add(root, 'div', 'msg-viewport'); viewport.id = uid + '-viewport'; viewport.tabIndex = 0; viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', 'Interactive strategic architecture diagram'); viewport.setAttribute('aria-describedby', help.id); expand.setAttribute('aria-controls', viewport.id);
    var stage = add(viewport, 'div', 'msg-stage');
    var drawing = svg('svg', {class:'msg-svg',viewBox:'0 0 ' + data.width + ' ' + data.height,role:'group','aria-labelledby':uid + '-title','aria-describedby':uid + '-description'}); stage.appendChild(drawing);
    shape(drawing, 'title', {id:uid + '-title'}, data.title);
    shape(drawing, 'desc', {id:uid + '-description'}, 'Connected architecture overview. Tab to the first component; arrow keys move between components, Enter or Space selects. On the canvas itself, arrow keys pan, plus and minus zoom, and 0 fits the diagram.');
    var defs = shape(drawing, 'defs');
    ['normal','active'].forEach(function (kind) { var marker = shape(defs, 'marker', {id:uid + '-arrow-' + kind,viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:7,markerHeight:7,orient:'auto-start-reverse',markerUnits:'userSpaceOnUse'}); shape(marker, 'path', {class:'msg-arrow msg-arrow-' + kind,d:'M0,0 L8,4 L0,8 Z'}); });
    var dots = shape(defs, 'pattern', {id:uid + '-dots',width:6,height:6,patternUnits:'userSpaceOnUse'}); shape(dots, 'rect', {class:'msg-pattern-background',width:6,height:6}); shape(dots, 'circle', {class:'msg-pattern-dot',cx:2,cy:2,r:0.65});
    var containersLayer = shape(drawing, 'g', {class:'msg-containers'}), parentsLayer = shape(drawing, 'g', {class:'msg-parents'}), edgesLayer = shape(drawing, 'g', {class:'msg-connections'}), nodesLayer = shape(drawing, 'g', {class:'msg-components'});
    function estimate(value, size) { return Array.from(value).reduce(function (total, char) { return total + (/\s/.test(char) ? 0.3 : /[ilI.,:;'!|]/.test(char) ? 0.28 : /[MW@%]/.test(char) ? 0.88 : 0.55) * size; }, 0); }
    function lines(value, width, size) {
      var output = [], current = '';
      value.split(/\n/).forEach(function (paragraph) {
        paragraph.split(/\s+/).filter(Boolean).forEach(function (word) {
          if (estimate(word, size) > width) {
            if (current) { output.push(current); current = ''; }
            Array.from(word).forEach(function (char) { if (current && estimate(current + char, size) > width) { output.push(current); current = ''; } current += char; });
          } else if (!current || estimate(current + ' ' + word, size) <= width) current += (current ? ' ' : '') + word;
          else { output.push(current); current = word; }
        });
        if (current) { output.push(current); current = ''; }
      });
      return output;
    }
    function label(parent, value, box, preferred, className, alignLeft) {
      var size = preferred, availableWidth = Math.max(10, box.w - 16), wrapped = lines(value, availableWidth, size);
      while (size > 8 && wrapped.length * size * 1.18 > box.h - 10) { size -= 0.5; wrapped = lines(value, availableWidth, size); }
      var x = alignLeft ? box.x + 10 : box.x + box.w / 2, lineHeight = size * 1.18, y = box.y + (box.h - wrapped.length * lineHeight) / 2 + size;
      var text = shape(parent, 'text', {class:className,x:x,y:y,'text-anchor':alignLeft ? 'start' : 'middle','font-size':size,'aria-hidden':'true'});
      wrapped.forEach(function (line, index) { shape(text, 'tspan', {x:x,dy:index ? lineHeight : 0}, line); });
      return text;
    }
    data.containers.forEach(function (item) { var group = shape(containersLayer, 'g', {class:'msg-container','data-container':item.id}), box = item.box; shape(group, 'rect', {x:box.x,y:box.y,width:box.w,height:box.h,rx:10}); label(group, item.label, item.labelBox || {x:box.x + 4,y:box.y + 2,w:box.w - 8,h:30}, 17, 'msg-container-label', true); });
    var parents = new Set(data.components.map(function (item) { return item.parent; }).filter(Boolean));
    function route(edge) {
      if (edge.points) return edge.points;
      var a = componentMap.get(edge.from).box, b = componentMap.get(edge.to).box, ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
      if (Math.abs(bx - ax) >= Math.abs(by - ay)) { var startX = ax < bx ? a.x + a.w : a.x, endX = ax < bx ? b.x : b.x + b.w, midX = (startX + endX) / 2; return [{x:startX,y:ay},{x:midX,y:ay},{x:midX,y:by},{x:endX,y:by}]; }
      var startY = ay < by ? a.y + a.h : a.y, endY = ay < by ? b.y : b.y + b.h, midY = (startY + endY) / 2; return [{x:ax,y:startY},{x:ax,y:midY},{x:bx,y:midY},{x:bx,y:endY}];
    }
    function arrows(path, edge, active) { var marker = 'url(#' + uid + '-arrow-' + (active ? 'active' : 'normal') + ')'; if (edge.direction === 'forward' || edge.direction === 'bidirectional') path.setAttribute('marker-end', marker); if (edge.direction === 'bidirectional') path.setAttribute('marker-start', marker); }
    data.connections.forEach(function (edge, index) { var points = route(edge), path = shape(edgesLayer, 'path', {class:'msg-connection',d:points.map(function (point, i) { return (i ? 'L' : 'M') + point.x + ',' + point.y; }).join(' '),'data-edge':index,'data-from':edge.from,'data-to':edge.to,'vector-effect':'non-scaling-stroke','aria-hidden':'true'}); shape(path, 'title', {}, componentMap.get(edge.from).label + ' ' + (edge.direction === 'bidirectional' ? '↔' : edge.direction === 'forward' ? '→' : '—') + ' ' + componentMap.get(edge.to).label + (edge.label ? ': ' + edge.label : '')); arrows(path, edge, false); edgeElements.push(path); });
    data.components.forEach(function (item, index) {
      var box = item.box, isParent = parents.has(item.id), category = classifications.indexOf(item.classification), maturity = maturities.indexOf(item.maturity);
      var node = shape(isParent ? parentsLayer : nodesLayer, 'g', {class:'msg-node' + (category >= 0 ? ' msg-class-' + category : '') + (maturity >= 0 ? ' msg-maturity-' + maturity : '') + (item.style ? ' msg-style-' + item.style : '') + (item.sourceBorder ? ' msg-source-green' : ''),'data-component':item.id,role:'button',tabindex:index ? -1 : 0,'aria-pressed':'false','aria-label':[item.label,item.classification,item.maturity].filter(Boolean).join('. ')});
      shape(node, 'title', {}, [item.label,item.description].filter(Boolean).join('\n'));
      shape(node, 'rect', {class:'msg-focus-ring',x:box.x - 4,y:box.y - 4,width:box.w + 8,height:box.h + 8,rx:12});
      var attrs = {class:'msg-node-shape',x:box.x,y:box.y,width:box.w,height:box.h,rx:item.style === 'cloud' ? Math.min(30,box.h / 2) : item.style === 'function' ? 4 : 8};
      if (maturity === 0 || maturity === 1) attrs.fill = 'url(#' + uid + '-dots)';
      if (item.style === 'stack') { shape(node, 'rect', {class:'msg-node-stack',x:box.x + 6,y:box.y - 6,width:box.w - 6,height:box.h,rx:8}); shape(node, 'rect', {class:'msg-node-stack',x:box.x + 3,y:box.y - 3,width:box.w - 3,height:box.h,rx:8}); }
      var rectangle = shape(node, 'rect', attrs); if (maturity === 0 || maturity === 1) rectangle.style.fill = 'url(#' + uid + '-dots)';
      var textBox = item.labelBox || (isParent ? {x:box.x,y:box.y,w:box.w,h:Math.min(36,box.h)} : box);
      label(node, item.label, textBox, item.style === 'function' || item.style === 'adapter' ? 13 : item.style === 'bus' ? 19 : 16, 'msg-node-label', false);
      nodeElements.set(item.id, node);
      on(node, 'focus', function () { focused = index; updateTabStops(); });
      on(node, 'click', function () { if (!suppressClick) select(selected === item.id ? null : item.id); });
      on(node, 'keydown', function (event) {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(selected === item.id ? null : item.id); }
        else if (event.key === 'Home' || event.key === 'End' || /^Arrow(Left|Right|Up|Down)$/.test(event.key)) { event.preventDefault(); event.stopPropagation(); var next = event.key === 'Home' ? 0 : event.key === 'End' ? data.components.length - 1 : nearest(index, event.key); focusNode(next); }
      });
    });
    function updateTabStops() { data.components.forEach(function (item, index) { nodeElements.get(item.id).setAttribute('tabindex', index === focused ? '0' : '-1'); }); }
    function nearest(index, key) { var box = data.components[index].box, x = box.x + box.w / 2, y = box.y + box.h / 2, best = index, score = Infinity; data.components.forEach(function (item, i) { if (i === index) return; var dx = item.box.x + item.box.w / 2 - x, dy = item.box.y + item.box.h / 2 - y, along = key === 'ArrowRight' ? dx : key === 'ArrowLeft' ? -dx : key === 'ArrowDown' ? dy : -dy, across = /^Arrow(Left|Right)$/.test(key) ? Math.abs(dy) : Math.abs(dx); if (along > 1 && along + across * 2 < score) { score = along + across * 2; best = i; } }); return best; }
    function focusNode(index) { if (!data.components[index]) return; focused = index; updateTabStops(); var item = data.components[index]; nodeElements.get(item.id).focus({preventScroll:true}); var box = item.box, left = layout.left + box.x * scale, top = layout.top + box.y * scale, right = layout.left + (box.x + box.w) * scale, bottom = layout.top + (box.y + box.h) * scale, scrollLeft = viewport.scrollLeft, scrollTop = viewport.scrollTop; if (left < scrollLeft) scrollLeft = left - 20; else if (right > scrollLeft + viewport.clientWidth) scrollLeft = right - viewport.clientWidth + 20; if (top < scrollTop) scrollTop = top - 20; else if (bottom > scrollTop + viewport.clientHeight) scrollTop = bottom - viewport.clientHeight + 20; scrollTo(scrollLeft, scrollTop); }
    var legend = add(root, 'div', 'msg-legend'); legend.setAttribute('aria-label', 'Source classification and function legend');
    [['Classification',classifications,'class'],['Function',maturities,'maturity']].forEach(function (set) { var group = add(legend, 'div', 'msg-legend-group'); add(group, 'strong', 'msg-legend-title', set[0]); set[1].forEach(function (name, index) { var item = add(group, 'span', 'msg-legend-item'); add(item, 'i', 'msg-swatch msg-swatch-' + set[2] + '-' + index).setAttribute('aria-hidden','true'); item.appendChild(d.createTextNode(name)); }); });
    var selection = add(root, 'div', 'msg-selection'); selection.setAttribute('role', 'status'); selection.setAttribute('aria-live', 'polite');
    var relationships = add(root, 'ul', 'msg-sr msg-relationships'); relationships.setAttribute('aria-label', 'Selected component relationships');
    function select(id) {
      selected = componentMap.has(id) ? id : null; var connected = new Set(), count = 0; relationships.replaceChildren();
      data.connections.forEach(function (edge, index) { var active = !!selected && (edge.from === selected || edge.to === selected); edgeElements[index].setAttribute('data-focus', selected ? (active ? 'active' : 'muted') : ''); arrows(edgeElements[index], edge, active); if (active) { connected.add(edge.from); connected.add(edge.to); count++; add(relationships, 'li', '', componentMap.get(edge.from).label + ' ' + (edge.direction === 'forward' ? 'to' : edge.direction === 'bidirectional' ? 'both ways with' : 'linked with') + ' ' + componentMap.get(edge.to).label + (edge.label ? ': ' + edge.label : '')); } });
      nodeElements.forEach(function (node, key) { node.setAttribute('aria-pressed', String(key === selected)); node.setAttribute('data-focus', selected ? (key === selected ? 'selected' : connected.has(key) ? 'connected' : 'muted') : ''); });
      clear.disabled = !selected; selection.replaceChildren();
      if (!selected) { add(selection, 'span', '', data.components.length + ' components · ' + data.connections.length + ' source connections'); return; }
      var item = componentMap.get(selected); add(selection, 'strong', '', item.label); add(selection, 'span', '', [item.classification,item.maturity,count + ' direct ' + (count === 1 ? 'connection' : 'connections')].filter(Boolean).join(' · '));
      if (!count) add(selection, 'span', '', 'No relationships are included for this component in this overview.');
    }
    function scrollTo(left, top) { viewport.scrollLeft = Math.max(0,Math.min(left,layout.stageWidth - viewport.clientWidth)); viewport.scrollTop = Math.max(0,Math.min(top,layout.stageHeight - viewport.clientHeight)); }
    function minimumScale() { return Math.max(0.01,Math.min(0.1,(viewport.clientWidth - 24) / data.width,(viewport.clientHeight - 24) / data.height)); }
    function applyScale(next, preserveCenter) {
      var cx = (viewport.scrollLeft + layout.width / 2 - layout.left) / scale, cy = (viewport.scrollTop + layout.height / 2 - layout.top) / scale;
      scale = Math.max(minimumScale(),Math.min(3,next));
      var width = data.width * scale, height = data.height * scale, viewportWidth = viewport.clientWidth, viewportHeight = viewport.clientHeight;
      layout = {width:viewportWidth,height:viewportHeight,stageWidth:Math.max(viewportWidth,width + 24),stageHeight:Math.max(viewportHeight,height + 24)};
      layout.left = (layout.stageWidth - width) / 2; layout.top = (layout.stageHeight - height) / 2;
      stage.style.width = layout.stageWidth + 'px'; stage.style.height = layout.stageHeight + 'px';
      drawing.setAttribute('width', String(width)); drawing.setAttribute('height', String(height)); drawing.style.width = width + 'px'; drawing.style.height = height + 'px'; drawing.style.left = layout.left + 'px'; drawing.style.top = layout.top + 'px';
      percentage.textContent = Math.round(scale * 100) + '%'; zoomOut.disabled = scale <= minimumScale(); zoomIn.disabled = scale >= 3;
      if (preserveCenter) scrollTo(layout.left + cx * scale - viewportWidth / 2,layout.top + cy * scale - viewportHeight / 2);
      else scrollTo(0,0);
    }
    function zoom(next) { fitMode = false; applyScale(next, true); }
    function fit() { if (destroyed) return; fitMode = true; if (!viewport.clientWidth || !viewport.clientHeight) return; applyScale(Math.min(1,(viewport.clientWidth - 24) / data.width,(viewport.clientHeight - 24) / data.height), false); }
    function refresh() { if (destroyed || !viewport.clientWidth || !viewport.clientHeight) return; if (fitMode) fit(); else applyScale(scale, true); }
    on(viewport, 'keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(scale * 1.25); }
      else if (event.key === '-' || event.key === '_') { event.preventDefault(); zoom(scale / 1.25); }
      else if (event.key === '0') { event.preventDefault(); fit(); }
      else if (event.key === 'Escape' && selected) { event.preventDefault(); select(null); }
      else if (event.target === viewport && /^Arrow(Left|Right|Up|Down)$/.test(event.key)) { event.preventDefault(); var amount = event.shiftKey ? 160 : 64; scrollTo(viewport.scrollLeft + (event.key === 'ArrowRight' ? amount : event.key === 'ArrowLeft' ? -amount : 0),viewport.scrollTop + (event.key === 'ArrowDown' ? amount : event.key === 'ArrowUp' ? -amount : 0)); }
    });
    on(viewport, 'pointerdown', function (event) { if (event.button !== 0 || event.pointerType === 'touch' || event.target.closest('.msg-node')) return; suppressClick = false; drag = {id:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false}; if (viewport.setPointerCapture) { try { viewport.setPointerCapture(event.pointerId); } catch (_) {} } });
    on(viewport, 'pointermove', function (event) { if (!drag || drag.id !== event.pointerId) return; var dx = event.clientX - drag.x, dy = event.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; if (drag.moved) { root.classList.add('msg-dragging'); scrollTo(drag.left - dx,drag.top - dy); event.preventDefault(); } });
    function endDrag(event) { if (!drag || event.pointerId !== drag.id) return; suppressClick = event.type !== 'pointercancel' && drag.moved; drag = null; root.classList.remove('msg-dragging'); if (viewport.releasePointerCapture && viewport.hasPointerCapture && viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId); }
    on(viewport, 'pointerup', endDrag); on(viewport, 'pointercancel', endDrag); on(viewport, 'lostpointercapture', function () { drag = null; root.classList.remove('msg-dragging'); });
    on(viewport, 'click', function () { suppressClick = false; });
    element.appendChild(root); applyScale(1, false); select(null); fit();
    if (typeof w.ResizeObserver === 'function') { var observer = new w.ResizeObserver(refresh); observer.observe(viewport); removers.push(function () { observer.disconnect(); }); } else on(w, 'resize', refresh);
    var handle = Object.freeze({refresh:refresh,destroy:function () { if (destroyed) return; destroyed = true; drag = null; removers.splice(0).forEach(function (remove) { remove(); }); root.remove(); if (mounted.get(element) === handle) mounted.delete(element); }});
    mounted.set(element, handle); return handle;
  }
  w.MosaicStrategyDiagram = Object.freeze({mount:mount});
})(window);

;
/* Mosaic programme diagrams. Separate source data, keyboard controls and scoped lifecycle. */
(function(w){
  'use strict';
  if(w.MosaicDiagrams)return;
  var sequence=0,mounted=new WeakMap();
  function validate(input){
    function fail(field){throw Error('Invalid Mosaic diagram data: '+field+'.');}
    function str(v,field,optional){if(optional&&(v==null||v===''))return '';if(typeof v!=='string'||!v.trim())fail(field);return v;}
    function list(v,field){if(!Array.isArray(v))fail(field);return v;}
    function id(v){if(typeof v!=='string'||!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(v))fail('ID');return v;}
    if(!input||input.version!==1||!input.rollout||!input.strategy)fail('version or source');
    var r=input.rollout,range=list(r.range,'range').slice();
    if(range.length!==2||!range.every(Number.isInteger)||range[1]<range[0]||range[1]-range[0]>30)fail('range');
    function pos(v){if(typeof v!=='number'||!Number.isFinite(v)||v<range[0]||v>range[1]+1)fail('position');return v;}
    var ids=new Set(),activities=list(r.activities,'activities').map(function(a){
      var row={id:id(a.id),label:str(a.label,'activity label'),group:str(a.group,'activity group'),start:pos(a.start),end:pos(a.end)};
      if(ids.has(row.id)||row.end<=row.start)fail('activity ID or interval');ids.add(row.id);
      if(a.extensionEnd!=null){row.extensionEnd=pos(a.extensionEnd);if(row.extensionEnd<row.end)fail('extension interval');}return row;
    });
    var activityIds=new Set(ids),milestones=list(r.milestones,'milestones').map(function(m){var row={id:id(m.id),label:str(m.label,'milestone label'),lane:str(m.lane,'lane'),position:pos(m.position)};if(ids.has(row.id))fail('duplicate ID');ids.add(row.id);return row;});
    var dependencies=list(r.dependencies,'dependencies').map(function(e){if(!activityIds.has(e.from)||!activityIds.has(e.to))fail('dangling dependency');return{from:e.from,to:e.to,label:str(e.label,'dependency label')};});
    return{revision:str(input.revision,'revision',true),rollout:{title:str(r.title,'title'),approval:str(r.approval,'approval',true),range:range,note:str(r.note,'note',true),activities:activities,milestones:milestones,dependencies:dependencies},strategy:input.strategy};
  }
  function mount(target,options){
    if(!target||target.nodeType!==1)throw Error('A diagram container element is required.');
    var data=validate(options&&options.data||w.MosaicDiagramData);
    if(!w.MosaicStrategyDiagram)throw Error('The Strategic View renderer did not initialise.');
    var d=target.ownerDocument,uid='mdg-'+(++sequence),listeners=[],disposed=false,resize=null,strategyHandle,zoom=1,fitMode=true,basePlot=900,labelWidth=270;
    var r=data.rollout,start=r.range[0],end=r.range[1]+1,years=end-start,activityMap=new Map(r.activities.map(function(a){return[a.id,a];}));
    function node(tag,cls,text){var n=d.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
    function add(p,tag,cls,text){var n=node(tag,cls,text);p.append(n);return n;}
    function on(n,event,fn,opts){n.addEventListener(event,fn,opts);listeners.push(function(){n.removeEventListener(event,fn,opts);});}
    function button(p,cls,text,label){var b=add(p,'button',cls,text);b.type='button';if(label){b.setAttribute('aria-label',label);b.title=label;}return b;}
    function svg(tag,attrs,p){var n=d.createElementNS('http://www.w3.org/2000/svg',tag);Object.keys(attrs||{}).forEach(function(k){n.setAttribute(k,attrs[k]);});if(p)p.append(n);return n;}
    function year(n){return Math.floor(n)+' (approx.)';}
    function interval(a){return year(a.start)+' – '+year(a.end-0.0000001);}
    function percent(n){return(100*(n-start)/years).toFixed(4)+'%';}
    var root=node('div','mdg-root');root.dataset.sourceRevision=data.revision;
    var tabsWrap=add(root,'div','mdg-tabs');tabsWrap.setAttribute('role','tablist');tabsWrap.setAttribute('aria-label','Mosaic programme views');
    var panels=[],tabs=[];
    [['rollout','Roll-Out'],['strategy','Strategic View']].forEach(function(entry,i){var b=button(tabsWrap,'mdg-tab',entry[1]);b.id=uid+'-tab-'+entry[0];b.setAttribute('role','tab');b.setAttribute('aria-controls',uid+'-panel-'+entry[0]);var panel=add(root,'section','mdg-panel mdg-'+entry[0]);panel.id=uid+'-panel-'+entry[0];panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',b.id);panels.push(panel);tabs.push(b);on(b,'click',function(){choose(i,false);});on(b,'keydown',function(e){var next=e.key==='ArrowRight'?(i+1)%2:e.key==='ArrowLeft'?(i+1)%2:e.key==='Home'?0:e.key==='End'?1:null;if(next!==null&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();choose(next,true);}});});
    function choose(i,focus){tabs.forEach(function(b,index){b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;panels[index].hidden=i!==index;});if(focus)tabs[i].focus();if(i===0)geometry();else strategyHandle?.refresh();}
    var panel=panels[0],heading=add(panel,'div','mdg-heading');
    var titlebox=add(heading,'div','mdg-heading-copy');add(titlebox,'p','mdg-eyebrow','Programme roadmap');add(titlebox,'h3','mdg-title',r.title);
    if(r.approval)add(heading,'span','mdg-approval',r.approval);
    var toolbar=add(panel,'div','mdg-toolbar');
    var range=add(toolbar,'span','mdg-range',start+' — '+r.range[1]);range.title=r.note;
    var controls=add(toolbar,'div','mdg-controls');controls.setAttribute('role','group');controls.setAttribute('aria-label','Timeline controls');
    var dependencyToggle=button(controls,'mdg-dependencies-toggle','Dependencies');dependencyToggle.setAttribute('aria-pressed','true');
    var minus=button(controls,'mdg-icon-button','−','Zoom out timeline'),zoomText=add(controls,'output','mdg-zoom','100%'),plus=button(controls,'mdg-icon-button','+','Zoom in timeline'),fit=button(controls,'mdg-fit','Fit','Fit timeline');
    zoomText.setAttribute('aria-label','Timeline zoom');
    var wrap=add(panel,'div','mdg-timeline-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Roll-Out timeline. Use arrow keys to scroll.');
    var timeline=add(wrap,'div','mdg-timeline');timeline.style.setProperty('--years',years);timeline.style.setProperty('--label-width',labelWidth+'px');
    var axis=add(timeline,'div','mdg-axis-row');add(axis,'div','mdg-row-label','Workstream');var axisYears=add(axis,'div','mdg-year-axis');
    for(var y=start;y<end;y++)add(axisYears,'span','mdg-year',String(y));
    var plot=add(timeline,'div','mdg-plot'),rows=new Map(),buttons=new Map(),groups=Array.from(new Set(r.activities.map(function(a){return a.group;})));
    var edgeSvg=svg('svg',{'class':'mdg-dependency-lines','aria-hidden':'true',preserveAspectRatio:'none'},plot),defs=svg('defs',{},edgeSvg),marker=svg('marker',{id:uid+'-arrow',viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:6,markerHeight:6,orient:'auto'},defs);svg('path',{d:'M1 1 L7 4 L1 7',fill:'none',stroke:'#8b98b1','stroke-width':1.2},marker);
    var paths=r.dependencies.map(function(edge){return{edge:edge,node:svg('path',{'class':'mdg-dependency','marker-end':'url(#'+uid+'-arrow)'},edgeSvg)};});
    r.activities.forEach(function(a,index){
      var row=add(plot,'div','mdg-gantt-row');row.dataset.activity=a.id;row.style.setProperty('--group-color',groups.indexOf(a.group)%3===0?'#3476df':groups.indexOf(a.group)%3===1?'#7362ce':'#199c92');rows.set(a.id,row);
      var label=add(row,'div','mdg-row-label'),b=button(label,'mdg-activity',a.label);b.setAttribute('aria-pressed','false');buttons.set(a.id,b);
      var lane=add(row,'div','mdg-lane');var bar=button(lane,'mdg-bar',a.label,a.label+': '+interval(a));bar.style.setProperty('--start',percent(a.start));bar.style.setProperty('--span',(100*(a.end-a.start)/years).toFixed(4)+'%');bar.setAttribute('aria-pressed','false');bar.dataset.activityBar=a.id;
      if(a.extensionEnd>a.end){var ext=add(lane,'span','mdg-extension');ext.style.setProperty('--start',percent(a.end));ext.style.setProperty('--span',(100*(a.extensionEnd-a.end)/years).toFixed(4)+'%');ext.title='Hatched extension shown in the plan';ext.setAttribute('aria-hidden','true');}
      on(b,'click',function(){selectActivity(a.id);});on(bar,'click',function(){selectActivity(a.id);});
    });
    var lanes=new Map(),milestoneButtons=new Map();
    r.milestones.forEach(function(m){if(!lanes.has(m.lane)){var row=add(timeline,'div','mdg-milestone-row');add(row,'div','mdg-row-label',m.lane);lanes.set(m.lane,add(row,'div','mdg-lane mdg-benefit-lane'));}var b=button(lanes.get(m.lane),'mdg-milestone','',m.label+', '+m.lane+', '+year(m.position));b.style.setProperty('--position',percent(m.position));b.setAttribute('aria-pressed','false');add(b,'span','mdg-diamond').setAttribute('aria-hidden','true');add(b,'span','mdg-milestone-label',m.label);milestoneButtons.set(m.id,b);on(b,'click',function(){selectMilestone(m);});});
    var legend=add(panel,'div','mdg-legend');groups.forEach(function(group,i){var item=add(legend,'span');item.style.setProperty('--group-color',['#3476df','#7362ce','#199c92'][i%3]);add(item,'i','mdg-legend-bar');item.append(d.createTextNode(group));});var extensionLegend=add(legend,'span');add(extensionLegend,'i','mdg-legend-extension');extensionLegend.append(d.createTextNode('Hatched extension'));
    var detail=add(panel,'div','mdg-selection');detail.hidden=true;var detailBody=add(detail,'div','mdg-selection-body'),clear=button(detail,'mdg-clear','×','Clear timeline selection');on(clear,'click',function(){clearSelection();buttons.values().next().value?.focus({preventScroll:true});});
    var note=add(panel,'p','mdg-source-note','Year-scale plan · bar and milestone positions follow the slide; exact calendar dates are not provided.');note.title=r.note;
    var keyDeps=add(panel,'section','mdg-key-dependencies');add(keyDeps,'h4','','Key Dependencies');var dependencyList=add(keyDeps,'ul');r.dependencies.forEach(function(e){add(dependencyList,'li','',e.label);});
    var live=add(panel,'span','mdg-sr');live.setAttribute('role','status');live.setAttribute('aria-live','polite');
    function clearSelection(){rows.forEach(function(row){row.removeAttribute('data-selected');});buttons.forEach(function(b){b.setAttribute('aria-pressed','false');});plot.querySelectorAll('[data-activity-bar]').forEach(function(b){b.setAttribute('aria-pressed','false');});milestoneButtons.forEach(function(b){b.setAttribute('aria-pressed','false');});detail.hidden=true;}
    function selectActivity(id){clearSelection();var a=activityMap.get(id);rows.get(id).setAttribute('data-selected','');buttons.get(id).setAttribute('aria-pressed','true');plot.querySelector('[data-activity-bar="'+id+'"]').setAttribute('aria-pressed','true');detail.hidden=false;detailBody.replaceChildren();add(detailBody,'strong','',a.label);add(detailBody,'span','',interval(a)+(a.extensionEnd>a.end?' · hatched extension through '+year(a.extensionEnd-0.0000001):''));r.dependencies.filter(function(e){return e.from===id||e.to===id;}).forEach(function(e){add(detailBody,'p','',e.label);});live.textContent=a.label+' selected.';}
    function selectMilestone(m){clearSelection();milestoneButtons.get(m.id).setAttribute('aria-pressed','true');detail.hidden=false;detailBody.replaceChildren();add(detailBody,'strong','',m.label);add(detailBody,'span','',m.lane+' · '+year(m.position));live.textContent=m.label+' selected.';}
    function drawEdges(width){edgeSvg.setAttribute('viewBox','0 0 '+width+' '+(r.activities.length*60));edgeSvg.style.height=r.activities.length*60+'px';paths.forEach(function(p){var a=activityMap.get(p.edge.from),b=activityMap.get(p.edge.to),ai=r.activities.indexOf(a),bi=r.activities.indexOf(b),forward=bi>ai,ax=((a.start+a.end)/2-start)/years*width,bx=((b.start+b.end)/2-start)/years*width,ay=ai*60+(forward?44:16),by=bi*60+(forward?14:46),mid=(ay+by)/2;p.node.setAttribute('d','M '+ax+' '+ay+' C '+ax+' '+mid+' '+bx+' '+mid+' '+bx+' '+by);});}
    function geometry(){if(disposed||panels[0].hidden)return;var available=wrap.clientWidth;if(available>0){labelWidth=available<600?210:270;timeline.style.setProperty('--label-width',labelWidth+'px');basePlot=Math.max(660,available-labelWidth);}var width=Math.round(basePlot*zoom);timeline.style.width=(labelWidth+width)+'px';drawEdges(width);lanes.forEach(function(lane,name){var tracks=[];r.milestones.filter(function(m){return m.lane===name;}).sort(function(a,b){return a.position-b.position;}).forEach(function(m){var center=Math.max(49,Math.min(width-49,(m.position-start)/years*width)),track=0;while(tracks[track]!==undefined&&center-tracks[track]<104)track++;tracks[track]=center;milestoneButtons.get(m.id).style.top=(18+track*70)+'px';});lane.style.minHeight=(104+Math.max(0,tracks.length-1)*70)+'px';});zoomText.value=Math.round(zoom*100)+'%';zoomText.textContent=zoomText.value;minus.disabled=zoom<=1;plus.disabled=zoom>=3;fit.setAttribute('aria-pressed',String(fitMode));}
    function setZoom(next){var before=basePlot*zoom,center=Math.max(0,wrap.scrollLeft+wrap.clientWidth/2-labelWidth)/before;zoom=Math.max(1,Math.min(3,next));fitMode=zoom===1;geometry();wrap.scrollLeft=Math.max(0,labelWidth+center*basePlot*zoom-wrap.clientWidth/2);}
    on(plus,'click',function(){setZoom(zoom+.25);});on(minus,'click',function(){setZoom(zoom-.25);});on(fit,'click',function(){zoom=1;fitMode=true;geometry();wrap.scrollLeft=0;});on(dependencyToggle,'click',function(){var show=dependencyToggle.getAttribute('aria-pressed')!=='true';dependencyToggle.setAttribute('aria-pressed',String(show));edgeSvg.style.display=show?'':'none';});
    on(wrap,'keydown',function(e){if(e.target!==wrap||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(zoom+.25);}else if(e.key==='-'){e.preventDefault();setZoom(zoom-.25);}else if(e.key==='0'){e.preventDefault();fit.click();}});
    var strategyTarget=add(panels[1],'div','mdg-strategy-host');
    try{strategyHandle=w.MosaicStrategyDiagram.mount(strategyTarget,{data:data.strategy});}catch(error){listeners.splice(0).forEach(function(fn){fn();});throw error;}
    if(mounted.has(target))mounted.get(target).destroy();target.append(root);choose(0,false);
    if(w.ResizeObserver){resize=new w.ResizeObserver(geometry);resize.observe(wrap);}else on(w,'resize',geometry);
    var handle={destroy:function(){if(disposed)return;disposed=true;resize?.disconnect();listeners.splice(0).forEach(function(fn){fn();});strategyHandle?.destroy();root.remove();if(mounted.get(target)===handle)mounted.delete(target);}};mounted.set(target,handle);return handle;
  }
  w.MosaicDiagrams={mount:mount};
})(window);
