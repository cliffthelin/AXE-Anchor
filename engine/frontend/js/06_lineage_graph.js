function renderLineageUI(L) {
  L.innerHTML = `
    <div id="canvas-container">
      <div class="graph-controls">
        <select id="graphMode" onchange="window.updateGraphMode()">
          <option value="standard">Standard View</option>
          <option value="leadership">Architecture (Color-Coded)</option>
          <option value="onboarding">Heatmap (Sized by Impact)</option>
          <option value="schema">&#128200; Schema Graph</option>
          <option value="code">&#128187; Code Architecture</option>
        </select>
        <div id="codeGraphOptions" style="display:none;align-items:center;gap:6px;">
          <label style="font-size:11px;color:#aaa;cursor:pointer;"><input id="chkIncludeDocs" type="checkbox" onchange="window.updateGraphMode()" style="vertical-align:middle;"> Docs</label>
          <label style="font-size:11px;color:#aaa;cursor:pointer;"><input id="chkUmlMode" type="checkbox" onchange="window.updateGraphMode()" style="vertical-align:middle;"> UML (Inherits)</label>
        </div>
        <div id="ringGraphOptions" style="display:none;align-items:center;gap:6px;">
          <label style="font-size:11px;color:#aaa;cursor:pointer;"><input id="chkNamespaceRings" type="checkbox" checked onchange="window.updateGraphMode()" style="vertical-align:middle;"> Rings</label>
        </div>
        <details id="graphProjectFilter" style="align-self:center;position:relative;">
          <summary style="font-size:11px;color:#d6dde8;cursor:pointer;list-style:none;border:1px solid #444;border-radius:3px;padding:4px 8px;background:#202735;">Sources</summary>
          <div id="graphProjectFilterMenu" style="position:absolute;top:24px;left:0;z-index:30;min-width:220px;max-height:260px;overflow:auto;background:#141922;border:1px solid #2f3746;border-radius:4px;padding:8px;box-shadow:0 8px 20px rgba(0,0,0,0.45);"></div>
        </details>
        <select id="schemaNodeMode" onchange="window.updateSchemaNodeMode()" style="font-size:11px;padding:3px 6px;display:none;">
          <option value="table">Tables only</option>
          <option value="tableview">Tables + Views</option>
          <option value="tableproc">Tables + Stored Procs</option>
          <option value="all">Tables + Views + Procs</option>
        </select>
        <input id="schemaFieldSearch" placeholder="Field search..." style="width:170px;display:none;" oninput="window.updateSchemaFieldSearch(this.value)">
        <input id="graphSearch" placeholder="Focus: file name..." style="width:160px;" oninput="window.updateGraphFilter()">
        <input id="graphKeyword" placeholder="Keyword 1..." style="width:140px;" oninput="window.updateKeywordFocus()">
        <input id="graphKeyword2" placeholder="Keyword 2..." style="width:140px;" oninput="window.updateKeywordFocus()">
        <select id="kwViewMode" onchange="window.updateKeywordFocus()" style="font-size:11px;padding:3px 6px;">
          <option value="color">Kw: Color heatmap</option>
          <option value="size">Kw: Size heatmap</option>
        </select>
        <select id="graphMetricsView" onchange="window.updateGraphMetricsView()" style="font-size:11px;padding:3px 6px;">
          <option value="none">Size: Default</option>
          <option value="loc">Size: LOC / Length</option>
          <option value="chars">Size: Characters</option>
        </select>
        <select id="graphColorView" onchange="window.updateGraphColorView()" style="font-size:11px;padding:3px 6px;">
          <option value="none">Color: Default</option>
          <option value="heatmap">Color: LOC Heatmap</option>
        </select>
        <span style="font-size:11px;color:#aaa;align-self:center;display:inline-flex;align-items:center;gap:6px;">
          <span style="color:#00e676;">■</span> Direct
          <span style="color:#ff7043;">■</span> 1-hop
          <span style="border-left:1px solid #444;height:12px;margin:0 4px;"></span>
          <span style="color:#ff7043;">■</span> ETL
          <span style="color:#00e5ff;">■</span> API
          <span style="color:#00e676;">■</span> DB
        </span>
        <button id="btnFreeze" onclick="window.toggleFreeze()">❄ Freeze</button>
        <button onclick="window.downloadGraphPng()" style="font-size:11px;padding:3px 6px;background:#333;" title="Download PNG">&#128247; PNG</button>
        <button onclick="window.downloadGraphSvg()" style="font-size:11px;padding:3px 6px;background:#333;" title="Download SVG">&#128247; SVG</button>
        <span id="graphLimitNotice" style="font-size:11px;color:#fbbf24;align-self:center;"></span>
      </div>
      <canvas id="graphCanvas"></canvas>      <div id="graph-nav">
        <div class="dpad-btn" id="btnZoomIn" title="Zoom In">&#43;</div>
        <div class="dpad-empty"></div>
        <div class="dpad-btn" id="btnZoomOut" title="Zoom Out">&#8722;</div>
        <div class="dpad-empty"></div>
        <div class="dpad-btn" id="btnPanUp" title="Pan Up">▲</div>
        <div class="dpad-empty"></div>
        <div class="dpad-btn" id="btnPanLeft" title="Pan Left">◀</div>
        <div class="dpad-btn dpad-center" id="btnCenter" title="Center on Selected">⊙</div>
        <div class="dpad-btn" id="btnPanRight" title="Pan Right">▶</div>
        <div class="dpad-empty"></div>
        <div class="dpad-btn" id="btnPanDown" title="Pan Down">▼</div>
        <div class="dpad-empty"></div>
      </div>    </div>`;

  // Ensure proof-tab-path element exists for shift+click path tracing
  if (!document.getElementById('proof-tab-path')) {
    let proofBottom = document.getElementById('impact-bottom');
    if (proofBottom) {
      let pathDiv = document.createElement('div');
      pathDiv.id = 'proof-tab-path';
      pathDiv.style.display = 'none';
      pathDiv.innerHTML = '<div id="proof-path-content" style="color:#666;font-style:italic;">Shift+Click two nodes in the graph to trace the shortest dependency path.</div>';
      proofBottom.appendChild(pathDiv);
    }
  }
  // Ensure proof-tab-rings element exists for ring management
  if (!document.getElementById('proof-tab-rings')) {
    let proofBottom = document.getElementById('impact-bottom');
    if (proofBottom) {
      let ringsDiv = document.createElement('div');
      ringsDiv.id = 'proof-tab-rings';
      ringsDiv.style.display = 'none';
      ringsDiv.innerHTML = '<div id="proof-rings-content" style="color:#ccc;padding:5px 0;">Select graph nodes to configure namespace / schema rings.</div>';
      proofBottom.appendChild(ringsDiv);
    }
  }
  // Ensure tab buttons exist for Path Trace and Rings
  let proofTabsEl = document.getElementById('proof-tabs');
  if (proofTabsEl && !document.getElementById('tab-path')) {
    let pathBtn = document.createElement('button');
    pathBtn.id = 'tab-path';
    pathBtn.className = 'proof-tab';
    pathBtn.onclick = function() { showProofTab('path'); };
    pathBtn.innerHTML = '&#128279; Path Trace';
    proofTabsEl.appendChild(pathBtn);
  }
  if (proofTabsEl && !document.getElementById('tab-rings')) {
    let ringsBtn = document.createElement('button');
    ringsBtn.id = 'tab-rings';
    ringsBtn.className = 'proof-tab';
    ringsBtn.onclick = function() { showProofTab('rings'); };
    ringsBtn.innerHTML = '&#9673; Rings';
    proofTabsEl.appendChild(ringsBtn);
  }

  let graphCanvas = document.getElementById('graphCanvas');
  let ctx = graphCanvas.getContext('2d');

  let cw = 800;
  let ch = 500;
  let nodes = [];
  let edges = [];
  let positions = {};
  let degrees = {};
  let schemaNodeMeta = {};  // populated in buildSchemaGraph()

  let hoveredNode = null;
  let selectedNode = null;
  let isFrozen = false;
  let currentMode = 'standard';
  let focusNodes = null;
  let keywordDirectNodes = null;
  let keywordRelatedNodes = null;
  let keywordCounts = {};
  let keywordViewMode = 'color';
  let zoomLevel = 1.0;
  let panX = 0, panY = 0;
  let currentMetricsView = 'none';
  let currentColorView = 'none';

  function resizeCanvas() {
    graphCanvas.width = document.getElementById('canvas-container').clientWidth || 800;
    graphCanvas.height = document.getElementById('canvas-container').clientHeight || 500;
    cw = graphCanvas.width; ch = graphCanvas.height;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  let allFiles = Object.keys(DATA.documents);
  let workspacePrefix = getActiveWorkspaceLabelForGraph();
  let graphSources = getGraphSources();
  window._graphSelectedSources = window._graphSelectedSources || {};
  graphSources.forEach(src => {
    if (window._graphSelectedSources[src] === undefined) window._graphSelectedSources[src] = true;
  });

  function getActiveWorkspaceLabelForGraph() {
    const activeId = DATA.active_workspace_id || DATA.build_meta?.active_workspace_id || '';
    const workspaces = (typeof CONFIG !== 'undefined' && CONFIG.workspaces) ? CONFIG.workspaces : [];
    const active = workspaces.find(ws => ws.id === activeId || ws.name === activeId);
    return active ? (active.name || active.id) : '';
  }

  function graphSourceForFile(filePath) {
    const parts = String(filePath || '').split('/');
    if (workspacePrefix && parts[0] === workspacePrefix && parts.length > 1) return parts[1];
    return parts[0] || 'Root';
  }

  function getGraphSources() {
    const sources = new Set();
    allFiles.forEach(fp => sources.add(graphSourceForFile(fp)));
    return [...sources].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
  }

  function selectedGraphFiles() {
    let files = allFiles.filter(fp => window._graphSelectedSources[graphSourceForFile(fp)] !== false);
    // Apply folder/type/extension visibility filters from the Workspaces page
    if (typeof window.applyGraphVisibilityFilters === 'function') {
      files = window.applyGraphVisibilityFilters(files);
    }
    return files;
  }

  function knownFiles() {
    return selectedGraphFiles().filter(k => !DATA.documents[k].is_code);
  }

  function codeFiles() {
    return selectedGraphFiles().filter(k => DATA.documents[k].is_code);
  }

  function renderGraphProjectFilter() {
    const menu = document.getElementById('graphProjectFilterMenu');
    if (!menu) return;
    menu.innerHTML = graphSources.map(src => `
      <label style="display:flex;align-items:center;gap:6px;color:#d6dde8;font-size:12px;padding:3px 0;cursor:pointer;">
        <input type="checkbox" ${window._graphSelectedSources[src] !== false ? 'checked' : ''} onchange="window.toggleGraphSource('${src.replace(/'/g, "\\'")}', this.checked)">
        <span>${esc(src)}</span>
      </label>
    `).join('') || '<div style="font-size:12px;color:#7d8796;">No sources</div>';
  }

  window.toggleGraphSource = function (sourceName, enabled) {
    window._graphSelectedSources[sourceName] = enabled;
    window.updateGraphMode();
  };

  function graphDisplayFiles(files, label) {
    let notice = document.getElementById('graphLimitNotice');
    if (notice) {
      notice.textContent = files.length > 750
        ? `Rendering all ${files.length} ${label}. Use search or Sources only if you want to focus the view.`
        : '';
    }
    return files;
  }


  function buildFileGraph() {
    nodes.length = 0; edges.length = 0;
    for (let k in positions) delete positions[k];
    for (let k in degrees) delete degrees[k];
    let sourceFiles = selectedGraphFiles();
    let graphFiles = graphDisplayFiles(sourceFiles, 'documents');

    // Build a suffix lookup map for O(1) dependency resolution instead of O(n) find()
    let suffixMap = {};
    graphFiles.forEach(k => {
      nodes.push(k);
      degrees[k] = 0;
      positions[k] = { x: Math.random() * cw, y: Math.random() * ch, vx: 0, vy: 0 };
      // Index by filename for fast lookup
      let filename = k.split('/').pop();
      if (!suffixMap[filename]) suffixMap[filename] = [];
      suffixMap[filename].push(k);
    });

    let edgeSet = new Set();
    graphFiles.forEach(k => {
      let lin = DATA.documents[k].lineage;
      if (lin && lin.dependencies) lin.dependencies.forEach(dep => {
        let depName = dep.split('/').pop();
        let candidates = suffixMap[depName];
        if (!candidates) return;
        let t = candidates.find(f => f.endsWith(dep)) || candidates[0];
        if (t && t !== k) {
          let key = k + '||' + t;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ a: k, b: t });
            degrees[k]++;
            degrees[t]++;
          }
        }
      });
    });
    window._activeGraphNodes = nodes.slice();
    window._debugPositions = positions;
    window._debugEdges = edges;
    window._getGraphViewCoords = () => ({ panX, panY, zoomLevel });
    window._getSelectedNode = () => selectedNode;
  }

  function buildCodeGraph() {
    nodes.length = 0; edges.length = 0;
    for (let k in positions) delete positions[k];
    for (let k in degrees) delete degrees[k];

    let includeDocs = document.getElementById('chkIncludeDocs')?.checked || false;
    let umlMode = document.getElementById('chkUmlMode')?.checked || false;

    let sourceCodeFiles = codeFiles();
    let graphCodeFiles = graphDisplayFiles(sourceCodeFiles, 'code files');
    let graphCodeSet = new Set(graphCodeFiles);

    graphCodeFiles.forEach(k => {
      nodes.push(k);
      degrees[k] = 0;
      positions[k] = { x: Math.random() * cw, y: Math.random() * ch, vx: 0, vy: 0 };
    });

    graphCodeFiles.forEach(k => {
      let doc = DATA.documents[k];
      if (!doc) return;
      let meta = doc.code_meta || {};
      let lin = doc.lineage;

      if (lin && lin.dependencies) {
        lin.dependencies.forEach(dep => {
          let isInheritance = meta.inheritance_deps && meta.inheritance_deps.includes(dep);
          if (umlMode && !isInheritance) return;

          let t = allFiles.find(f => f.endsWith(dep));
          if (t && t !== k) {
            let isCodeNode = graphCodeSet.has(t);
            if (isCodeNode) {
              if (!edges.some(e => e.a === k && e.b === t)) {
                edges.push({ a: k, b: t, isInheritance: isInheritance });
                degrees[k]++; degrees[t]++;
              }
            } else if (includeDocs) {
              if (!nodes.includes(t)) {
                nodes.push(t);
                degrees[t] = 0;
                positions[t] = { x: Math.random() * cw, y: Math.random() * ch, vx: 0, vy: 0 };
              }
              if (!edges.some(e => e.a === k && e.b === t)) {
                edges.push({ a: k, b: t, isDocLink: true });
                degrees[k]++; degrees[t]++;
              }
            }
          }
        });
      }
    });
    window._activeGraphNodes = nodes.slice();
  }

  renderGraphProjectFilter();
  buildFileGraph();

  function getSchemaModeKinds() {
    let mode = document.getElementById('schemaNodeMode')?.value || 'table';
    let allowed = new Set(['table']);
    if (mode === 'tableview' || mode === 'all') {
      allowed.add('view');
    }
    if (mode === 'tableproc' || mode === 'all') {
      allowed.add('proc');
    }
    return allowed;
  }

  function buildSchemaGraph() {
    nodes.length = 0; edges.length = 0;
    for (let k in positions) delete positions[k];
    for (let k in degrees) delete degrees[k];
    for (let k in schemaNodeMeta) delete schemaNodeMeta[k];

    let allowedKinds = getSchemaModeKinds();

    const ensureMeta = (name, kind, schemaName, source) => {
      let cleanName = cleanSchemaName(name);
      if (!cleanName) return null;
      if (!schemaNodeMeta[cleanName]) {
        schemaNodeMeta[cleanName] = {
          columns: [],
          fkRefs: [],
          refs: [],
          kind: kind || 'table',
          schemaName: schemaName || 'dbo',
          sources: [],
          searchText: '',
          displayName: cleanName
        };
      }
      let meta = schemaNodeMeta[cleanName];
      if (kind && !meta.kind) meta.kind = kind;
      if (schemaName && !meta.schemaName) meta.schemaName = schemaName;
      if (source && !meta.sources.includes(source)) meta.sources.push(source);
      return meta;
    };

    const addRef = (from, to) => {
      let a = cleanSchemaName(from);
      let b = cleanSchemaName(to);
      if (!a || !b || a === b) return;
      let meta = schemaNodeMeta[a];
      if (meta && !meta.refs.includes(b)) meta.refs.push(b);
    };

    const pushSearchText = (meta, text) => {
      if (!meta || !text) return;
      meta.searchText = ((meta.searchText || '') + ' ' + String(text)).trim();
    };
    const scopedFiles = selectedGraphFiles();

    // Source 1: psis-directory-schema-mapping.json
    let psisKey = scopedFiles.find(k => k.endsWith('psis-directory-schema-mapping.json') && !k.includes('versions'));
    if (psisKey && DATA.documents[psisKey].data) {
      (DATA.documents[psisKey].data || []).forEach(entry => {
        let tbl = cleanSchemaName(entry.Table || '');
        if (!tbl) return;
        let schemaName = tbl.includes('.') ? tbl.split('.')[0] : 'PSIS';
        let meta = ensureMeta(tbl, inferSchemaKind(tbl, 'table'), schemaName, 'psis');
        if (!meta) return;
        meta.columns.push({ name: entry.Column || '', type: entry.DataType || '', note: entry.Notes || '' });
        pushSearchText(meta, [entry.Column || '', entry.DataType || '', entry.Notes || '', tbl].join(' '));
        let fkM = (entry.Notes || '').match(/FK\\s*[→>]\\s*([A-Z][A-Z0-9_\\.]+)/i);
        if (fkM) {
          let ref = cleanSchemaName(fkM[1]);
          if (ref) {
            if (!meta.fkRefs.includes(ref)) meta.fkRefs.push(ref);
            if (!meta.refs.includes(ref)) meta.refs.push(ref);
          }
        }
      });
    }

    // Source 2: erd-complete.md (vrf_rc + SIF objects)
    let erdKey = scopedFiles.find(k => k.endsWith('erd-complete.md'));
    let erdEdges = [];
    if (erdKey) {
      let content = DATA.documents[erdKey].content || '';
      let inTable = null;
      content.split('\\n').forEach(line => {
        let ts = line.match(/^[ \t]+([A-Z][A-Z0-9_a-z]+)[ \t]*\\{/);
        if (ts) {
          inTable = ts[1];
          let meta = ensureMeta(inTable, 'table', 'vrf_rc', 'erd');
          if (meta && !meta.sources.includes(erdKey)) meta.sources.push(erdKey);
          return;
        }
        if (line.trim() === '}') { inTable = null; return; }
        if (inTable) {
          let cm = line.match(/^[ \\t]+(\\w+)[ \\t]+(\\w+)/);
          if (cm) {
            let meta = ensureMeta(inTable, 'table', 'vrf_rc', 'erd');
            if (meta) {
              meta.columns.push({ name: cm[2], type: cm[1], note: '' });
              pushSearchText(meta, [cm[1], cm[2], line].join(' '));
            }
          }
        }
        let rel = line.match(/([A-Z][A-Z0-9_a-z]+)\\s+[|o{}<\\-]+[|o{}<\\-]\\s+([A-Z][A-Z0-9_a-z]+)\\s*:/);
        if (rel && rel[1] !== rel[2]) erdEdges.push({ a: rel[1], b: rel[2] });
      });
    }

    // Source 3: SQL objects - views and stored procedures
    scopedFiles.forEach(fp => {
      if (!fp.toLowerCase().endsWith('.sql')) return;
      let content = DATA.documents[fp].content || '';
      let defs = [...content.matchAll(/CREATE\\s+(?:OR\\s+ALTER\\s+)?(VIEW|PROC(?:EDURE)?|TABLE)\\s+([A-Za-z0-9_\\.\\[\\]]+)/gi)];
      if (!defs.length) return;
      let refs = [...content.matchAll(/\\b(?:FROM|JOIN|INTO|UPDATE|EXEC(?:UTE)?)\\s+([A-Za-z0-9_\\.\\[\\]]+)/gi)].map(m => cleanSchemaName(m[1]));
      defs.forEach(m => {
        let kind = inferSchemaKind(m[2], m[1]);
        let name = cleanSchemaName(m[2]);
        let schemaName = name.includes('.') ? name.split('.')[0] : 'dbo';
        let meta = ensureMeta(name, kind, schemaName, fp);
        if (!meta) return;
        pushSearchText(meta, content);
        refs.forEach(r => {
          if (!r || r === name) return;
          if (!meta.refs.includes(r)) meta.refs.push(r);
        });
      });
    });

    // Source 4: Parse data-dictionary.md and other Markdown files for tables/columns
    scopedFiles.forEach(fp => {
      if (!fp.endsWith('.md')) return;
      let content = DATA.documents[fp].content || '';
      let currentTable = null;
      let currentSchema = 'dbo';

      content.split('\\n').forEach(line => {
        let dbMatch = line.match(/^##\\s+(?:External\\s+)?Database:\\s*`?([A-Za-z0-9_]+)`?/i);
        if (dbMatch) {
          currentSchema = dbMatch[1];
        }
        let modMatch = line.match(/^##\\s+Module:\\s*`?([A-Za-z0-9_]+)`?/i);
        if (modMatch) {
          currentSchema = modMatch[1];
        }

        let tblMatch = line.match(/^###\\s+Table:\\s*`?([A-Za-z0-9_\\.\\-\\[\\]]+)`?/i);
        if (tblMatch) {
          let rawTbl = cleanSchemaName(tblMatch[1]);
          let schemaName = rawTbl.includes('.') ? rawTbl.split('.')[0] : currentSchema;
          currentTable = rawTbl;
          ensureMeta(currentTable, 'table', schemaName, fp);
          return;
        }

        if (currentTable && line.trim().startsWith('|')) {
          let parts = line.split('|').map(p => p.trim());
          if (parts.length > 2 && !parts[1].startsWith('--') && parts[1] !== 'Column' && parts[1] !== 'Table') {
            let colName = parts[1];
            let colType = parts[2] || '';
            let colNote = parts[parts.length - 2] || '';
            let meta = ensureMeta(currentTable, 'table', null, fp);
            if (meta) {
              if (!meta.columns.some(c => c.name === colName)) {
                meta.columns.push({ name: colName, type: colType, note: colNote });
                pushSearchText(meta, [colName, colType, colNote].join(' '));
              }
            }
          }
        }
      });
    });

    // Build nodes
    Object.keys(schemaNodeMeta).forEach(tbl => {
      let meta = schemaNodeMeta[tbl];
      if (!allowedKinds.has(meta.kind || 'table')) return;
      nodes.push(tbl);
      if (!positions[tbl]) {
        positions[tbl] = { x: cw * 0.1 + Math.random() * cw * 0.8, y: ch * 0.1 + Math.random() * ch * 0.8, vx: 0, vy: 0 };
      }
      degrees[tbl] = 0;
    });

    // Build edges
    let seen = new Set();
    const addEdge = (a, b) => {
      let na = nodes.find(n => n.endsWith('.' + a) || n === a);
      let nb = nodes.find(n => n.endsWith('.' + b) || n === b);
      if (!na || !nb || na === nb) return;
      let key = [na, nb].sort().join('||');
      if (!seen.has(key)) {
        edges.push({ a: na, b: nb });
        degrees[na] = (degrees[na] || 0) + 1;
        degrees[nb] = (degrees[nb] || 0) + 1;
        seen.add(key);
      }
    };

    Object.keys(schemaNodeMeta).forEach(tbl => {
      let meta = schemaNodeMeta[tbl];
      if (!allowedKinds.has(meta.kind || 'table')) return;
      (meta.fkRefs || []).forEach(ref => addEdge(tbl, ref));
      (meta.refs || []).forEach(ref => addEdge(tbl, ref));
    });
    erdEdges.forEach(e => addEdge(e.a, e.b));

    window._schemaNodeMeta = schemaNodeMeta;
    window._schemaVisibleKinds = Array.from(allowedKinds);
    window._activeGraphNodes = nodes.slice();
  }

  window._schemaRebuild = () => { buildSchemaGraph(); window.showAssocList(); };

  function getHashColor(str, opacity = 1.0) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let hue = Math.abs(hash % 360);
    return `hsla(${hue}, 70%, 50%, ${opacity})`;
  }


  window.updateGraphMetricsView = () => { currentMetricsView = document.getElementById('graphMetricsView')?.value || 'none'; };
  window.updateGraphColorView = () => { currentColorView = document.getElementById('graphColorView')?.value || 'none'; };

  function scopeForDocument(path) {
    let scopedMaps = DATA.schema_origin_maps || {};
    let bestScope = '';
    Object.keys(scopedMaps).forEach(scope => {
      if (scope === '__root__') return;
      if ((path === scope || path.startsWith(scope + '/')) && scope.length > bestScope.length) {
        bestScope = scope;
      }
    });
    if (bestScope) return bestScope;
    let parts = String(path || '').split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : 'AXE-Anchor';
  }

  function getGraphNodeRing(n) {
    if (window._nodeRings && window._nodeRings[n]) return window._nodeRings[n];

    if (currentMode === 'schema') {
      let meta = (window._schemaNodeMeta || schemaNodeMeta || {})[n];
      if (meta) {
        let sources = meta.sources || [];
        if (sources.length) return scopeForDocument(sources[0]);
        return meta.schemaName || 'dbo';
      }
    }

    let doc = DATA.documents[n];
    if (doc) {
      if (currentMode === 'code' && doc.is_code && doc.code_meta?.namespace) {
        return doc.code_meta.namespace;
      }
      return scopeForDocument(n);
    }

    return currentMode || 'Graph';
  }
  window._getGraphNodeRing = getGraphNodeRing;

  window.toggleFreeze = () => { isFrozen = !isFrozen; document.getElementById('btnFreeze').innerText = isFrozen ? '▶ Unfreeze' : '❄ Freeze'; };
  window.downloadGraphPng = () => {
    let link = document.createElement('a');
    link.download = 'graph_architecture.png';
    link.href = graphCanvas.toDataURL('image/png');
    link.click();
  };
  window.downloadGraphSvg = () => {
    let svgLines = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${graphCanvas.width} ${graphCanvas.height}" width="100%" height="100%" style="background:#111;">`
    ];
    edges.forEach(e => {
      let p1 = positions[e.a], p2 = positions[e.b];
      if (!p1 || !p2) return;
      let stroke = '#333';
      let strokeDash = '';
      if (e.isInheritance) { stroke = '#ab47bc'; strokeDash = 'stroke-dasharray="4,4"'; }
      else if (e.isDocLink) { stroke = '#ffb74d'; strokeDash = 'stroke-dasharray="2,4"'; }
      svgLines.push(`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke}" stroke-width="1.2" ${strokeDash} />`);
    });
    nodes.forEach(n => {
      let p = positions[n];
      if (!p) return;
      let r = getNodeRadius(n);
      let col = getNodeColor(n, false, false);
      let name = n.split('/').pop();
      svgLines.push(`<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${col}" stroke="#222" stroke-width="1" />`);
      svgLines.push(`<text x="${p.x}" y="${p.y - r - 4}" fill="#aaa" font-size="9" font-family="Segoe UI, sans-serif" text-anchor="middle">${esc(name)}</text>`);
    });
    svgLines.push('</svg>');
    let blob = new Blob([svgLines.join('\n')], { type: 'image/svg+xml' });
    let link = document.createElement('a');
    link.download = 'graph_architecture.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  window.updateGraphMode = () => {
    let newMode = document.getElementById('graphMode').value;
    let wasSchema = currentMode === 'schema', willSchema = newMode === 'schema';
    let wasCode = currentMode === 'code', willCode = newMode === 'code';
    currentMode = newMode;
    window._graphMode = newMode;

    let schemaModeSel = document.getElementById('schemaNodeMode');
    let schemaFieldInput = document.getElementById('schemaFieldSearch');
    if (schemaModeSel) schemaModeSel.style.display = willSchema ? '' : 'none';
    if (schemaFieldInput) schemaFieldInput.style.display = willSchema ? '' : 'none';

    let codeOpts = document.getElementById('codeGraphOptions');
    if (codeOpts) codeOpts.style.display = willCode ? 'inline-flex' : 'none';
    let ringOpts = document.getElementById('ringGraphOptions');
    if (ringOpts) ringOpts.style.display = (willCode || willSchema) ? 'inline-flex' : 'none';

    if (willSchema) {
      buildSchemaGraph();
    } else if (willCode) {
      buildCodeGraph();
    } else {
      if (wasSchema || wasCode) {
        buildFileGraph();
      }
    }

    hoveredNode = null; selectedNode = null;
    panX = 0; panY = 0; zoomLevel = 1.0;
    keywordDirectNodes = null; keywordRelatedNodes = null; keywordCounts = {};
    window._assocListHtml = willSchema
      ? '<span style="color:#888;font-style:italic;">Select a schema object to inspect its tree.</span>'
      : (willCode
        ? '<span style="color:#888;font-style:italic;">Select a code file to inspect its associations.</span>'
        : '<span style="color:#666;font-style:italic;">Select a node on the graph.</span>');
    window._schemaSelectedNode = null;
    window._assocItems = [];
    window._assocSearch = '';
    window._assocSearch2 = '';
    let gk1 = document.getElementById('graphKeyword');
    let gk2 = document.getElementById('graphKeyword2');
    if (gk1) gk1.value = '';
    if (gk2) gk2.value = '';
    if (window.showAssocList) window.showAssocList();
    let tabs = document.getElementById('proof-tabs');
    if (tabs) tabs.style.display = 'none';
    showProofTab('conn');
  };
  window.updateGraphFilter = () => {
    let term = document.getElementById('graphSearch').value.toLowerCase().trim();
    let fieldTerm = (window._graphMode === 'schema' ? (document.getElementById('schemaFieldSearch')?.value || '').toLowerCase().trim() : '');
    if (!term && !fieldTerm) { focusNodes = null; return; }
    focusNodes = new Set();
    nodes.forEach(n => {
      let meta = (window._schemaNodeMeta || {})[n] || {};
      let blob = (n + ' ' + (meta.searchText || '') + ' ' + (meta.columns || []).map(c => [c.name, c.type, c.note].join(' ')).join(' ')).toLowerCase();
      let ok = true;
      if (term) ok = blob.includes(term);
      if (ok && fieldTerm) ok = blob.includes(fieldTerm);
      if (ok) {
        focusNodes.add(n);
        edges.forEach(e => { if (e.a === n) focusNodes.add(e.b); if (e.b === n) focusNodes.add(e.a); });
      }
    });
  };
  window.updateKeywordFocus = () => {
    let el1 = document.getElementById('graphKeyword');
    let el2 = document.getElementById('graphKeyword2');
    let term1 = el1 ? el1.value.toLowerCase().trim() : '';
    let term2 = el2 ? el2.value.toLowerCase().trim() : '';
    keywordViewMode = document.getElementById('kwViewMode')?.value || 'color';
    if (!term1 && !term2) {
      keywordDirectNodes = null; keywordRelatedNodes = null; keywordCounts = {};
      window._assocContextNode = null;
      if (!window._assocSearchFocused) window._assocSearch = '';
      if (!window._assocSearch2Focused) window._assocSearch2 = '';
      let tabs = document.getElementById('proof-tabs');
      if (tabs) tabs.style.display = 'none';
      showProofTab('conn');
      window.showAssocList();
      return;
    }
    keywordDirectNodes = new Set();
    keywordRelatedNodes = new Set();
    keywordCounts = {};
    window._assocContextNode = null;
    let safeTerm1 = term1 ? term1.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') : '';
    let safeTerm2 = term2 ? term2.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') : '';
    let re1 = safeTerm1 ? new RegExp(safeTerm1, 'g') : null;
    let re2 = safeTerm2 ? new RegExp(safeTerm2, 'g') : null;
    nodes.forEach(n => {
      let blob = '';
      if (window._graphMode === 'schema') {
        let meta = (window._schemaNodeMeta || {})[n] || {};
        blob = (n + ' ' + (meta.searchText || '') + ' ' + (meta.columns || []).map(c => [c.name, c.type, c.note].join(' ')).join(' ')).toLowerCase();
      } else {
        let doc = DATA.documents[n] || {};
        blob = (doc.content || '').toLowerCase();
      }

      let nameHits1 = re1 ? (n.toLowerCase().match(re1) || []).length : 0;
      let contentHits1 = re1 ? (blob.match(re1) || []).length : 0;
      let nameHits2 = re2 ? (n.toLowerCase().match(re2) || []).length : 0;
      let contentHits2 = re2 ? (blob.match(re2) || []).length : 0;

      let match1 = !term1 || (nameHits1 + contentHits1 > 0);
      let match2 = !term2 || (nameHits2 + contentHits2 > 0);

      if (match1 && match2) {
        if ((term1 && (nameHits1 + contentHits1 > 0)) || (term2 && (nameHits2 + contentHits2 > 0))) {
          let total = nameHits1 + contentHits1 + nameHits2 + contentHits2;
          keywordDirectNodes.add(n);
          keywordCounts[n] = total;
        }
      }
    });
    edges.forEach(e => {
      if (keywordDirectNodes.has(e.a) && !keywordDirectNodes.has(e.b)) keywordRelatedNodes.add(e.b);
      if (keywordDirectNodes.has(e.b) && !keywordDirectNodes.has(e.a)) keywordRelatedNodes.add(e.a);
    });
    // Build sorted match list for associations panel
    let sorted = [...keywordDirectNodes].sort((a, b) => (keywordCounts[b] || 0) - (keywordCounts[a] || 0));
    window._assocItems = sorted;
    // Set default assoc search to keyword if not set, but do NOT focus or overwrite if user is typing in assoc search
    if (term1 && !window._assocSearchFocused) window._assocSearch = term1;
    if (term2 && !window._assocSearch2Focused) window._assocSearch2 = term2;
    window.showAssocList();
    // Build keyword-hits content for the proof panel Keyword tab
    let kwHtml = '<div style="font-size:11px;color:#888;margin-bottom:8px;">'
      + keywordDirectNodes.size + ' files contain <b style="color:var(--accent);">' + esc(term1) + '</b>' + (term2 ? ' and <b style="color:var(--accent);">' + esc(term2) + '</b>' : '') + '</div>';
    sorted.slice(0, 30).forEach(fp => {
      let lines = [];
      if (window._graphMode === 'schema') {
        let meta = (window._schemaNodeMeta || {})[fp] || {};
        lines.push('Kind: ' + (meta.kind || 'table'));
        (meta.columns || []).forEach(c => {
          lines.push(c.name + ' (' + c.type + ')' + (c.note ? ' - ' + c.note : ''));
        });
      } else {
        lines = (DATA.documents[fp]?.content || '').split('\\n');
      }
      let snips = [];
      for (let i = 0; i < lines.length && snips.length < 3; i++) {
        if ((term1 && lines[i].toLowerCase().includes(term1)) || (term2 && lines[i].toLowerCase().includes(term2))) {
          let raw = esc(lines[i].trim().substring(0, 150));
          if (term1) {
            let safeEsc1 = esc(term1).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
            raw = raw.replace(new RegExp(safeEsc1, 'gi'), m => '<span class="highlight-code">' + m + '</span>');
          }
          if (term2) {
            let safeEsc2 = esc(term2).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
            raw = raw.replace(new RegExp(safeEsc2, 'gi'), m => '<span class="highlight-code">' + m + '</span>');
          }
          snips.push('<div style="font-size:11px;color:#aaa;padding:2px 0;font-family:Consolas,monospace;"><span style="color:#555;">' + (i + 1) + ':</span> ' + raw + '</div>');
        }

      }
      kwHtml += '<details style="margin-bottom:5px;border:1px solid #2e2e2e;border-radius:3px;">'
        + '<summary style="cursor:pointer;padding:5px 8px;background:#1c1c1c;list-style:none;display:flex;justify-content:space-between;">'
        + '<span style="font-size:12px;font-weight:bold;color:var(--accent);">' + esc(fp.split('/').pop()) + '</span>'
        + '<span style="font-size:11px;color:#555;">' + keywordCounts[fp] + ' hit' + (keywordCounts[fp] > 1 ? 's' : '') + '</span></summary>'
        + '<div style="padding:5px 8px;"><div style="font-size:11px;color:#555;margin-bottom:3px;">' + esc(fp) + '</div>'
        + (snips.join('') || '<div style="font-size:11px;color:#555;">(name match only)</div>') + '</div></details>';
    });
    let kwEl = document.getElementById('proof-kw-content');
    if (kwEl) kwEl.innerHTML = kwHtml;
    let tabs = document.getElementById('proof-tabs');
    if (tabs) tabs.style.display = 'flex';
    showProofTab('kw');
  };

  window.setGraphFocus = (filePath) => {
    if (!positions[filePath]) return;
    selectedNode = filePath;
    focusNodes = new Set([filePath]);
    edges.forEach(e => {
      if (e.a === filePath) focusNodes.add(e.b);
      if (e.b === filePath) focusNodes.add(e.a);
    });
    let p = positions[filePath];
    panX = graphCanvas.width / 2 - p.x * zoomLevel;
    panY = graphCanvas.height / 2 - p.y * zoomLevel;
  };

  function getNodeClass(n) {
    let lowerN = n.toLowerCase();
    let doc = DATA.documents[n] || {};
    let content = String(doc.content || '').toLowerCase();

    let isEtl = lowerN.includes('etl') || lowerN.includes('sync') || lowerN.includes('export') || lowerN.includes('import') || lowerN.includes('extract') || lowerN.includes('load') || lowerN.includes('transform') || lowerN.includes('cactus') || content.includes('etl') || content.includes('extract-transform-load');
    if (isEtl) return 'etl';

    let isApi = lowerN.includes('api') || lowerN.includes('endpoint') || lowerN.includes('controller') || lowerN.includes('http') || lowerN.includes('rest') || lowerN.includes('client') || lowerN.includes('webservice') || lowerN.includes('sif') || content.includes('endpoint') || content.includes('api controller');
    if (isApi) return 'api';

    let isDb = lowerN.includes('db') || lowerN.includes('database') || lowerN.includes('connection') || lowerN.includes('sql') || lowerN.includes('dbo') || lowerN.includes('schema') || lowerN.includes('table') || lowerN.includes('procedure') || lowerN.includes('query') || n.endsWith('.sql') || content.includes('connectionstring') || content.includes('select ') || content.includes('insert ');
    if (isDb) return 'db';

    return 'other';
  }

  function getNodeRadius(n) {
    if (currentMode === 'schema') {
      let colCount = (schemaNodeMeta[n] && schemaNodeMeta[n].columns.length) || 1;
      return Math.max(8, Math.min(30, 8 + Math.log(colCount + 1) * 4.5));
    }
    if (currentMetricsView === 'loc' || currentMetricsView === 'chars') {
      let doc = DATA.documents[n];
      let val = 1;
      if (doc && doc.metrics) {
        val = currentMetricsView === 'loc' ? (doc.metrics.loc || 1) : (doc.metrics.chars || 1);
      }
      let maxVal = 1;
      nodes.forEach(nodeKey => {
        let d = DATA.documents[nodeKey];
        if (d && d.metrics) {
          let v = currentMetricsView === 'loc' ? (d.metrics.loc || 1) : (d.metrics.chars || 1);
          if (v > maxVal) maxVal = v;
        }
      });
      return Math.max(5, Math.min(28, 5 + (Math.log(val + 1) / Math.log(maxVal + 1)) * 23));
    }
    let cls = getNodeClass(n);
    if (cls !== 'other') {
      return 10; // Make ETL/API/DB stand out
    }
    if (currentMode === 'code') return Math.min(22, 6 + (degrees[n] * 1.5));
    if (currentMode === 'onboarding') return Math.min(25, 4 + (degrees[n] * 1.5));
    if (keywordDirectNodes && keywordDirectNodes.has(n) && keywordViewMode === 'size') {
      let cnt = keywordCounts[n] || 1;
      let maxCnt = Math.max(1, ...Object.values(keywordCounts));
      return Math.max(5, Math.min(22, 5 + (Math.log(cnt + 1) / Math.log(maxCnt + 1)) * 17));
    }
    return 5;
  }
  function getNodeColor(n, isHovered, isRelated) {
    if (isHovered || n === selectedNode) return '#ff9800';
    if (isRelated) return '#ffcc80';
    if (currentColorView === 'heatmap') {
      let doc = DATA.documents[n];
      let val = doc && doc.metrics ? (doc.metrics.loc || 1) : 1;
      let maxVal = 1;
      nodes.forEach(nodeKey => {
        let d = DATA.documents[nodeKey];
        if (d && d.metrics && (d.metrics.loc || 1) > maxVal) {
          maxVal = d.metrics.loc || 1;
        }
      });
      let t = Math.log(val + 1) / Math.log(maxVal + 1);
      let r = Math.round(t * 220);
      let g = Math.round((1 - t) * 180 + 40);
      let b = Math.round((1 - t) * 50);
      return `rgb(${r},${g},${b})`;
    }
    if (currentMode === 'schema') {
      let meta = schemaNodeMeta[n] || {};
      if (meta.kind === 'view') return '#26a69a';
      if (meta.kind === 'proc') return '#ab47bc';
      let sn = (meta.schemaName) || '';
      let originMap = getSchemaOriginMapForNode(n);
      if (originMap[sn]) return originMap[sn].color;
      if (n.startsWith('REF_') && originMap['REF_*']) return originMap['REF_*'].color;
      if (n.match(/^(LEA|School|Student|Staff)/) && originMap['SIF']) return originMap['SIF'].color;
      if (originMap['default']) return originMap['default'].color;
      return '#37474f';
    }

    // Class-based coloring for non-schema views (ETL/API/DB indicators)
    let cls = getNodeClass(n);
    if (cls === 'etl') return '#ff7043'; // Bright Orange for ETL
    if (cls === 'api') return '#00e5ff'; // Bright Cyan for API
    if (cls === 'db') return '#00e676';  // Bright Green for DB

    if (currentMode === 'code') {
      let ext = (DATA.documents[n] && DATA.documents[n].ext || '').toLowerCase();
      if (ext === '.cs') {
        let name = n.split('/').pop();
        if (name.startsWith('I') && name[1] === name[1].toUpperCase()) return '#ab47bc';
        return '#007acc';
      }
      if (ext === '.sql') return '#4caf50';
      if (ext === '.ts') return '#3178c6';
      if (ext === '.py') return '#3572a5';
      return '#37474f';
    }
    if (keywordDirectNodes && keywordDirectNodes.has(n)) {
      if (keywordViewMode === 'color') {
        let cnt = keywordCounts[n] || 1;
        let maxCnt = Math.max(1, ...Object.values(keywordCounts));
        let t = Math.log(cnt + 1) / Math.log(maxCnt + 1);
        let r = Math.round(t < 0.5 ? 0 : (t - 0.5) * 2 * 220);
        let g = Math.round(t < 0.5 ? 80 + t * 2 * 170 : 250 - (t - 0.5) * 2 * 200);
        let b = Math.round(t < 0.5 ? 200 - t * 2 * 200 : 0);
        return `rgb(${r},${g},${b})`;
      }
      return '#00e676';
    }
    if (keywordRelatedNodes && keywordRelatedNodes.has(n)) return '#ff7043';
    if (currentMode === 'leadership') {
      if (degrees[n] === 0) return '#f44336';
      let ext = DATA.documents[n].ext;
      if (['.sql', '.csv', '.json'].includes(ext)) return '#4caf50';
      if (['.py', '.ps1'].includes(ext)) return '#2196f3';
      return '#9e9e9e';
    }
    return '#007acc';
  }

  function getSchemaOriginMapForNode(n) {
    let scopedMaps = DATA.schema_origin_maps || {};
    let meta = schemaNodeMeta[n] || {};
    let sources = meta.sources || [];
    let bestScope = '';

    sources.forEach(source => {
      Object.keys(scopedMaps).forEach(scope => {
        if (scope === '__root__') return;
        if ((source === scope || source.startsWith(scope + '/')) && scope.length > bestScope.length) {
          bestScope = scope;
        }
      });
    });

    if (bestScope && scopedMaps[bestScope]) return scopedMaps[bestScope];
    return DATA.schema_origin_map || scopedMaps.__root__ || {};
  }

  let isDraggingCanvas = false;
  let dragStartMouseX = 0, dragStartMouseY = 0;
  let dragStartPanX = 0, dragStartPanY = 0;
  let draggedNode = null;
  let hasDragged = false;

  graphCanvas.onmousedown = (e) => {
    let rect = graphCanvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;
    let mx = (mouseX - panX) / zoomLevel;
    let my = (mouseY - panY) / zoomLevel;

    let clickedNode = nodes.find(n => Math.hypot(positions[n].x - mx, positions[n].y - my) < (getNodeRadius(n) + 5));
    if (clickedNode) {
      draggedNode = clickedNode;
      let idx = nodes.indexOf(draggedNode);
      if (idx !== -1) {
        nodes.splice(idx, 1);
        nodes.push(draggedNode);
      }
    } else {
      isDraggingCanvas = true;
      dragStartMouseX = mouseX;
      dragStartMouseY = mouseY;
      dragStartPanX = panX;
      dragStartPanY = panY;
    }
    hasDragged = false;
  };

  graphCanvas.onmousemove = (e) => {
    let rect = graphCanvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;
    let mx = (mouseX - panX) / zoomLevel;
    let my = (mouseY - panY) / zoomLevel;

    if (draggedNode) {
      positions[draggedNode].x = mx;
      positions[draggedNode].y = my;
      hasDragged = true;
    } else if (isDraggingCanvas) {
      panX = dragStartPanX + (mouseX - dragStartMouseX);
      panY = dragStartPanY + (mouseY - dragStartMouseY);
      hasDragged = true;
    } else {
      hoveredNode = nodes.find(n => Math.hypot(positions[n].x - mx, positions[n].y - my) < (getNodeRadius(n) + 5));
      graphCanvas.style.cursor = hoveredNode ? 'pointer' : (isDraggingCanvas ? 'grabbing' : 'grab');
    }
  };

  const handleRelease = (e) => {
    if (draggedNode && !hasDragged) {
      handleNodeClick(draggedNode, e);
    }
    draggedNode = null;
    isDraggingCanvas = false;
  };

  graphCanvas.onmouseup = handleRelease;
  graphCanvas.onmouseleave = handleRelease;

  function handleNodeClick(clickedNode, e) {
    if (e.shiftKey && selectedNode && selectedNode !== clickedNode) {
      let trace = findShortestPath(selectedNode, clickedNode, edges);
      if (trace) {
        window._activePathTrace = trace.path;
        let pathNames = trace.path.map(fp => fp.split('/').pop()).join(' ➔ ');
        document.getElementById('proof-path-content').innerHTML = `
          <div style="padding:10px;background:#1e1e1e;border:1px solid #444;border-radius:4px;">
            <h4 style="margin:0 0 8px 0;color:#00f0ff;">Shortest Dependency Path</h4>
            <div style="font-size:12px;color:#ddd;margin-bottom:8px;line-height:1.4;">${esc(pathNames)}</div>
            <div style="font-size:11px;color:#888;">
              Path type: <b>${trace.directed ? 'Directed' : 'Undirected (Weak connection)'}</b> (${trace.path.length} nodes)
            </div>
            <button onclick="window.clearPathTrace()" class="assoc-back-btn" style="margin-top:10px;padding:4px 8px;font-size:11px;">Clear Path Highlight</button>
          </div>
        `;
      } else {
        window._activePathTrace = null;
        document.getElementById('proof-path-content').innerHTML = `
          <div style="padding:10px;background:#1e1e1e;border:1px solid #ef5350;border-radius:4px;color:#ef9a9a;font-size:12px;">
            No dependency path found between <b>${esc(selectedNode.split('/').pop())}</b> and <b>${esc(clickedNode.split('/').pop())}</b>.
          </div>
        `;
      }
      let tabs = document.getElementById('proof-tabs');
      if (tabs) tabs.style.display = 'flex';
      showProofTab('path');
      return;
    }

    selectedNode = clickedNode;
    if (currentMode === 'schema') {
      window._schemaSelectedNode = selectedNode;
      window.openSchemaObject(selectedNode);
      document.getElementById('proof-content').innerHTML =
        '<span style="color:#888;font-style:italic;">Schema object selected: <b>' + esc(selectedNode) + '</b>. The association tree is shown above and the selected object details appear below.</span>';
      let tabs = document.getElementById('proof-tabs'); if (tabs) tabs.style.display = 'none';
      return;
    }
    let upstream = edges.filter(ed => ed.b === selectedNode).map(ed => ed.a);
    let downstream = edges.filter(ed => ed.a === selectedNode).map(ed => ed.b);
    let allConnected = [...upstream, ...downstream];
    window._assocContextNode = selectedNode;
    window._assocItems = allConnected;
    let items = allConnected.map((fp, idx) => {
      let name = fp.split('/').pop();
      let dir = fp.includes('/') ? fp.substring(0, fp.lastIndexOf('/')) : '';
      let isUp = upstream.includes(fp);
      return '<div class="assoc-item" onclick="window.openAssocItem(window._assocItems[' + idx + '])">'
        + '<span><span style="color:' + (isUp ? '#64b5f6' : '#a5d6a7') + ';">' + (isUp ? '&#8679;' : '&#8681;') + '</span>'
        + ' <span style="color:#ddd;">' + esc(name) + '</span>'
        + (dir ? '<span style="font-size:11px;color:#555;margin-left:6px;">' + esc(dir) + '</span>' : '')
        + '</span></div>';
    }).join('');
    window._assocListHtml = '<div style="padding-bottom:5px;border-bottom:1px solid #444;margin-bottom:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
      + '<span style="font-size:14px;font-weight:bold;color:var(--accent);">' + esc(selectedNode.split('/').pop()) + '</span>'
      + '<span style="font-size:11px;color:#888;">' + allConnected.length + ' connection' + (allConnected.length !== 1 ? 's' : '') + '</span>'
      + '<span style="font-size:11px;color:#555;">&nbsp;&mdash;&nbsp;'
      + '<span style="color:#64b5f6;">&#8679; upstream</span>&nbsp;'
      + '<span style="color:#a5d6a7;">&#8681; downstream</span></span></div>'
      + '<div style="font-size:11px;color:#666;margin-bottom:5px;">Click file to view &mdash; &#8592; Back returns here</div>'
      + (items || '<div style="padding:6px;color:#666;">No connections.</div>');
    window.showAssocList();
    document.getElementById('proof-content').innerHTML = '<span style="color:#888;font-style:italic;">Select a file from the list above to see connection proof.</span>';
    let tabs = document.getElementById('proof-tabs');
    if (tabs) tabs.style.display = 'flex';
    showProofTab('conn');
  }

  window.clickDependency = (source, target) => { showProof(source, target); };

  function runBFS(startNode, endNode, edges, undirected) {
    let adj = {};
    edges.forEach(ed => {
      if (!adj[ed.a]) adj[ed.a] = [];
      adj[ed.a].push(ed.b);
      if (undirected) {
        if (!adj[ed.b]) adj[ed.b] = [];
        adj[ed.b].push(ed.a);
      }
    });

    let queue = [[startNode]];
    let visited = new Set([startNode]);

    while (queue.length > 0) {
      let path = queue.shift();
      let node = path[path.length - 1];
      if (node === endNode) return path;

      let neighbors = adj[node] || [];
      for (let n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...path, n]);
        }
      }
    }
    return null;
  }

  function findShortestPath(startNode, endNode, edges) {
    let path = runBFS(startNode, endNode, edges, false);
    if (path) return { path, directed: true };
    path = runBFS(startNode, endNode, edges, true);
    if (path) return { path, directed: false };
    return null;
  }

  window.clearPathTrace = () => {
    window._activePathTrace = null;
    document.getElementById('proof-path-content').innerHTML = '<span style="color:#666;font-style:italic;">Shift+Click two nodes in the graph to trace the shortest dependency path.</span>';
  };

  // Mouse wheel zoom (canvas only — does not bubble to page scroll)
  graphCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    let rect = graphCanvas.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    let my = e.clientY - rect.top;
    let factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    panX = mx - (mx - panX) * factor;
    panY = my - (my - panY) * factor;
    zoomLevel = Math.max(0.08, Math.min(12, zoomLevel * factor));
  }, { passive: false });

  // D-pad button handlers
  const PAN_STEP = 60;
  document.getElementById('btnZoomIn').addEventListener('click', () => {
    let cx = graphCanvas.width / 2, cy = graphCanvas.height / 2, f = 1.3;
    panX = cx - (cx - panX) * f; panY = cy - (cy - panY) * f;
    zoomLevel = Math.min(12, zoomLevel * f);
  });
  document.getElementById('btnZoomOut').addEventListener('click', () => {
    let cx = graphCanvas.width / 2, cy = graphCanvas.height / 2, f = 1 / 1.3;
    panX = cx - (cx - panX) * f; panY = cy - (cy - panY) * f;
    zoomLevel = Math.max(0.08, zoomLevel * f);
  });
  document.getElementById('btnPanUp').addEventListener('click', () => { panY += PAN_STEP; });
  document.getElementById('btnPanDown').addEventListener('click', () => { panY -= PAN_STEP; });
  document.getElementById('btnPanLeft').addEventListener('click', () => { panX += PAN_STEP; });
  document.getElementById('btnPanRight').addEventListener('click', () => { panX -= PAN_STEP; });
  document.getElementById('btnCenter').addEventListener('click', () => {
    let target = selectedNode || (keywordDirectNodes && keywordDirectNodes.size > 0 ? [...keywordDirectNodes][0] : null);
    if (target && positions[target]) {
      panX = graphCanvas.width / 2 - positions[target].x * zoomLevel;
      panY = graphCanvas.height / 2 - positions[target].y * zoomLevel;
    } else {
      // Reset to show all nodes
      panX = 0; panY = 0; zoomLevel = 1.0;
    }
  });

  function simulate() {
    cw = graphCanvas.width; ch = graphCanvas.height;
    if (!isFrozen) {
      // Force-directed layout: N-body repulsion + edge springs (matching builder behavior)
      // Skip expensive N-body for large graphs (>500 nodes) — use only edge springs + gravity
      let useFullRepulsion = nodes.length <= 500;
      for (let i = 0; i < nodes.length; i++) {
        let p1 = positions[nodes[i]];
        if (!p1 || nodes[i] === draggedNode) continue;
        // Gravity toward center
        p1.vx += (cw / 2 - p1.x) * 0.0005;
        p1.vy += (ch / 2 - p1.y) * 0.0005;
        // Repulsion between nodes (only for smaller graphs)
        if (useFullRepulsion) {
          for (let j = i + 1; j < nodes.length; j++) {
            let p2 = positions[nodes[j]];
            if (!p2) continue;
            let dx = p2.x - p1.x, dy = p2.y - p1.y;
            let distSq = dx * dx + dy * dy || 1;
            if (distSq < 6000) {
              let force = 2.5 / distSq;
              if (nodes[j] !== draggedNode) {
                p2.vx += dx * force;
                p2.vy += dy * force;
              }
              p1.vx -= dx * force;
              p1.vy -= dy * force;
            }
          }
        }
      }
      // Edge spring forces
      edges.forEach(e => {
        let p1 = positions[e.a], p2 = positions[e.b];
        if (!p1 || !p2) return;
        let dx = p2.x - p1.x, dy = p2.y - p1.y;
        if (e.a !== draggedNode) { p1.vx += dx * 0.003; p1.vy += dy * 0.003; }
        if (e.b !== draggedNode) { p2.vx -= dx * 0.003; p2.vy -= dy * 0.003; }
      });

      // Apply namespace clustering force when rings are enabled (code/schema modes)
      let ringsEnabled = document.getElementById('chkNamespaceRings')?.checked || false;
      if (ringsEnabled && (currentMode === 'code' || currentMode === 'schema')) {
        let nsCenters = {};
        let nsCounts = {};
        nodes.forEach(n => {
          let ns = getGraphNodeRing(n);
          if (ns) {
            if (!nsCenters[ns]) {
              nsCenters[ns] = { x: 0, y: 0 };
              nsCounts[ns] = 0;
            }
            nsCenters[ns].x += positions[n].x;
            nsCenters[ns].y += positions[n].y;
            nsCounts[ns]++;
          }
        });
        for (let ns in nsCenters) {
          nsCenters[ns].x /= nsCounts[ns];
          nsCenters[ns].y /= nsCounts[ns];
        }
        nodes.forEach(n => {
          if (n === draggedNode) return;
          let ns = getGraphNodeRing(n);
          if (ns && nsCenters[ns] && nsCounts[ns] > 1) {
            let p = positions[n];
            let center = nsCenters[ns];
            p.vx += (center.x - p.x) * 0.0008;
            p.vy += (center.y - p.y) * 0.0008;
          }
        });
      }
    }

    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoomLevel, zoomLevel);

    // Render namespace rings/bubbles dynamically from actual node positions
    let ringsEnabled = document.getElementById('chkNamespaceRings')?.checked || false;
    if (ringsEnabled && (currentMode === 'code' || currentMode === 'schema')) {
      let nsGroups = {};
      nodes.forEach(n => {
        let ns = getGraphNodeRing(n);
        if (ns && positions[n]) {
          if (!nsGroups[ns]) nsGroups[ns] = [];
          nsGroups[ns].push({ x: positions[n].x, y: positions[n].y, r: getNodeRadius(n) });
        }
      });

      for (let ns in nsGroups) {
        let pts = nsGroups[ns];
        if (pts.length === 0) continue;

        let cx = 0, cy = 0;
        pts.forEach(p => { cx += p.x; cy += p.y; });
        cx /= pts.length;
        cy /= pts.length;

        let r = 50;
        if (pts.length > 1) {
          let maxDist = 0;
          pts.forEach(p => {
            let dx = p.x - cx;
            let dy = p.y - cy;
            let dist = Math.sqrt(dx * dx + dy * dy) + p.r;
            if (dist > maxDist) maxDist = dist;
          });
          r = maxDist + 45;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fillStyle = getHashColor(ns, 0.06);
        ctx.fill();

        ctx.strokeStyle = getHashColor(ns, 0.35);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.stroke();

        ctx.font = "10px monospace";
        ctx.fillStyle = getHashColor(ns, 0.85);
        ctx.textAlign = "center";
        let displayName = (window._ringNames && window._ringNames[ns]) || ns;
        ctx.fillText(displayName, cx, cy - r - 8);
        ctx.restore();
      }
    }

    edges.forEach(e => {
      if (focusNodes && !focusNodes.has(e.a) && !focusNodes.has(e.b)) return;
      let isActive = (hoveredNode || selectedNode) && (e.a === hoveredNode || e.b === hoveredNode || e.a === selectedNode || e.b === selectedNode);
      let isPathEdge = false;
      if (window._activePathTrace) {
        let idxA = window._activePathTrace.indexOf(e.a);
        let idxB = window._activePathTrace.indexOf(e.b);
        if (idxA !== -1 && idxB !== -1 && Math.abs(idxA - idxB) === 1) {
          isPathEdge = true;
        }
      }
      ctx.beginPath();
      let baseStroke = '#333';
      let dashed = false;
      if (e.isInheritance) {
        baseStroke = '#ab47bc';
        dashed = true;
      } else if (e.isDocLink) {
        baseStroke = '#ffb74d';
        dashed = true;
      }
      ctx.strokeStyle = isPathEdge ? '#00f0ff' : (isActive ? '#ff9800' : baseStroke);
      ctx.lineWidth = isPathEdge ? 3.0 : (isActive ? 1.5 : 1);
      if (focusNodes && !focusNodes.has(e.a) && !focusNodes.has(e.b)) ctx.strokeStyle = 'rgba(51,51,51,0.1)';
      ctx.save();
      if (dashed) {
        ctx.setLineDash(e.isInheritance ? [4, 4] : [2, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(positions[e.a].x, positions[e.a].y);
      ctx.lineTo(positions[e.b].x, positions[e.b].y);
      ctx.stroke();
      ctx.restore();
    });

    nodes.forEach(n => {
      let p = positions[n];
      if (!isFrozen) {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.5; p.vy *= 0.5;
        p.x = Math.max(15, Math.min(cw - 15, p.x));
        p.y = Math.max(15, Math.min(ch - 15, p.y));
      }
      let inFocus = !focusNodes || focusNodes.has(n);
      let inKw = !keywordDirectNodes || keywordDirectNodes.has(n) || (keywordRelatedNodes && keywordRelatedNodes.has(n));
      ctx.globalAlpha = (inFocus && inKw) ? 1.0 : 0.07;
      let targetNode = hoveredNode || selectedNode;
      let isRelated = targetNode && edges.some(e => (e.a === targetNode && e.b === n) || (e.b === targetNode && e.a === n));
      let radius = getNodeRadius(n);
      let isPathNode = window._activePathTrace && window._activePathTrace.includes(n);

      ctx.beginPath();
      ctx.arc(p.x, p.y, (n === targetNode ? radius + 3 : (isRelated ? radius + 1 : radius)), 0, 2 * Math.PI);
      ctx.fillStyle = getNodeColor(n, n === targetNode, isRelated);
      ctx.fill();
      ctx.lineWidth = isPathNode ? 2.5 : 1;
      ctx.strokeStyle = isPathNode ? '#00f0ff' : '#222';
      ctx.stroke();

      if (isPathNode) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    });
    ctx.restore();

    if (hoveredNode) {
      ctx.font = "13px Arial";
      let text = hoveredNode.split('/').pop();
      let cls = getNodeClass(hoveredNode);
      let clsLabel = cls === 'etl' ? ' [ETL]' : (cls === 'api' ? ' [API]' : (cls === 'db' ? ' [DB]' : ''));
      let hitLabel = (keywordDirectNodes && keywordDirectNodes.has(hoveredNode) && keywordCounts[hoveredNode])
        ? ` [${keywordCounts[hoveredNode]} hits]` : '';
      let label = text + clsLabel + hitLabel;
      let tw = ctx.measureText(label).width;
      let sx = positions[hoveredNode].x * zoomLevel + panX;
      let sy = positions[hoveredNode].y * zoomLevel + panY;
      ctx.fillStyle = "rgba(0,0,0,0.92)";
      ctx.fillRect(sx + 12, sy - 16, tw + 10, 22);
      ctx.fillStyle = '#ff9800';
      ctx.fillText(label, sx + 17, sy + 2);
    }
    // Only continue animation if the canvas is still in the DOM (graph view is active)
    if (document.getElementById('graphCanvas')) {
      requestAnimationFrame(simulate);
    }
  }
  simulate();
}

window.renderRingsManager = function () {
  let container = document.getElementById('proof-rings-content');
  if (!container) return;

  // 1. Gather all existing graph boundaries for the active mode.
  let rings = new Set();
  let activeNodes = window._activeGraphNodes || Object.keys(DATA.documents || {});
  activeNodes.forEach(n => {
    let ns = window._getGraphNodeRing ? window._getGraphNodeRing(n) : null;
    if (ns) rings.add(ns);
  });

  // Add any rings that have custom names or overrides but might not have active nodes
  if (window._ringNames) {
    for (let r in window._ringNames) rings.add(r);
  }
  if (window._nodeRings) {
    for (let n in window._nodeRings) {
      rings.add(window._nodeRings[n]);
    }
  }

  let ringList = Array.from(rings).sort();

  // 2. Build HTML
  let html = `<div style="display:flex; flex-direction:column; gap:10px; max-height:280px; overflow-y:auto; padding:5px 0;">`;

  // Rename Rings Section
  html += `<div>
    <div style="font-weight:bold; color:var(--accent); margin-bottom:5px; font-size:12px;">✏️ Rename Graph Boundaries:</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">`;
  ringList.forEach(r => {
    let customName = (window._ringNames && window._ringNames[r]) || '';
    html += `<div style="display:flex; align-items:center; gap:6px;">
      <span style="font-family:monospace; color:#aaa; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;" title="${esc(r)}">${esc(r)}:</span>
      <input type="text" placeholder="Custom display name" value="${esc(customName)}" oninput="window.setRingName('${r.replace(/'/g, "\\'")}', this.value)" style="flex:1; font-size:11px; padding:3px 6px; background:#111; color:#fff; border:1px solid #444; border-radius:3px;">
    </div>`;
  });
  html += `</div></div>`;

  // Assign Node Section
  html += `<div style="border-top:1px solid #333; padding-top:8px; margin-top:5px;">
    <div style="font-weight:bold; color:var(--accent); margin-bottom:5px; font-size:12px;">⭕ Assign Node to Boundary:</div>
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
      <label style="font-size:11px; color:#aaa;">Node:</label>
      <select id="ringSelectNode" style="max-width:180px; background:#111; color:#fff; border:1px solid #444; border-radius:3px; padding:3px 6px; font-size:11px;">`;

  // Nodes dropdown
  let activeNodesList = activeNodes.slice().sort();
  activeNodesList.forEach(n => {
    let name = n.split('/').pop();
    let isSel = (n === selectedNode);
    html += `<option value="${esc(n)}"${isSel ? ' selected' : ''}>${esc(name)}</option>`;
  });
  html += `</select>
      
      <label style="font-size:11px; color:#aaa;">Ring:</label>
      <select id="ringSelectRing" onchange="window.onRingSelectChange(this.value)" style="width:130px; background:#111; color:#fff; border:1px solid #444; border-radius:3px; padding:3px 6px; font-size:11px;">`;
  ringList.forEach(r => {
    html += `<option value="${esc(r)}">${esc(r)}</option>`;
  });
  html += `<option value="__new_ring__">+ New Custom Ring...</option>
      </select>
      
      <input id="newRingInput" type="text" placeholder="New Ring Name" style="display:none; width:120px; font-size:11px; padding:3px 6px; background:#111; color:#fff; border:1px solid #444; border-radius:3px;">
      
      <button onclick="window.assignNodeToRingClick()" style="font-size:11px; padding:4px 10px; background:#1b5e20; color:#fff; border:none; border-radius:3px; cursor:pointer;">Assign</button>
    </div>
  </div>`;

  // Current overrides listing
  let overrides = Object.keys(window._nodeRings || {});
  if (overrides.length > 0) {
    html += `<div style="border-top:1px solid #333; padding-top:8px; margin-top:5px;">
      <div style="font-weight:bold; color:var(--accent); margin-bottom:5px; font-size:12px;">Current Overrides:</div>
      <div style="display:flex; flex-direction:column; gap:4px; max-height:80px; overflow-y:auto;">`;
    overrides.forEach(nodeKey => {
      let r = window._nodeRings[nodeKey];
      let nodeName = nodeKey.split('/').pop();
      html += `<div style="display:flex; align-items:center; justify-content:space-between; background:#1e1e1e; padding:3px 8px; border-radius:3px; font-size:11px;">
        <span style="color:#aaa;">${esc(nodeName)} &rarr; <span style="color:var(--accent);">${esc(r)}</span></span>
        <button onclick="window.removeNodeRingOverride('${nodeKey.replace(/'/g, "\\'")}')" style="background:#b71c1c; border:none; color:#fff; border-radius:3px; padding:1px 5px; cursor:pointer; font-size:10px;">&times; Remove</button>
      </div>`;
    });
    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
};

window.setRingName = function (ring, val) {
  if (!window._ringNames) window._ringNames = {};
  if (val.trim() === '') {
    delete window._ringNames[ring];
  } else {
    window._ringNames[ring] = val.trim();
  }
  localStorage.setItem('sdd_ring_names', JSON.stringify(window._ringNames));
};

window.onRingSelectChange = function (val) {
  let input = document.getElementById('newRingInput');
  if (input) {
    input.style.display = (val === '__new_ring__') ? '' : 'none';
  }
};

window.assignNodeToRingClick = function () {
  let nodeSelect = document.getElementById('ringSelectNode');
  let ringSelect = document.getElementById('ringSelectRing');
  let newRingInput = document.getElementById('newRingInput');
  if (!nodeSelect || !ringSelect) return;

  let node = nodeSelect.value;
  let ring = ringSelect.value;
  if (ring === '__new_ring__') {
    ring = newRingInput ? newRingInput.value.trim() : '';
  }

  if (!node || !ring) return;

  if (!window._nodeRings) window._nodeRings = {};
  window._nodeRings[node] = ring;
  localStorage.setItem('sdd_node_rings', JSON.stringify(window._nodeRings));

  if (newRingInput) newRingInput.value = '';
  ringSelect.value = ringSelect.options[0].value;
  window.onRingSelectChange(ringSelect.value);

  if (typeof window.updateGraphMode === 'function') {
    window.updateGraphMode();
  }
  window.renderRingsManager();
};

window.removeNodeRingOverride = function (node) {
  if (window._nodeRings && window._nodeRings[node]) {
    delete window._nodeRings[node];
    localStorage.setItem('sdd_node_rings', JSON.stringify(window._nodeRings));

    if (typeof window.updateGraphMode === 'function') {
      window.updateGraphMode();
    }
    window.renderRingsManager();
  }
};

window.renderTypeFilters = function () {
  let showIgnored = window._showIgnoredInSidebarTypes !== false; // default on
  let counts = {};
  let ignoredTotal = 0;
  for (let k in DATA.documents) {
    let doc = DATA.documents[k];
    // Check if ignored
    let isIgnored = doc._ignored || (window._graphFolderFilter && (function() {
      let parts = k.split('/');
      for (let d = 1; d < parts.length; d++) {
        if (window._graphFolderFilter[parts.slice(0, d).join('/')] === false) return true;
      }
      return false;
    })());
    if (isIgnored) {
      ignoredTotal++;
      if (!showIgnored) continue;
    }
    let t = doc.type || 'unknown';
    counts[t] = (counts[t] || 0) + 1;
  }

  let container = document.getElementById('typeFilterContainer');
  if (!container) return;

  let html = '';
  // Ignored toggle
  html += `<div style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;box-sizing:border-box;">
    <label style="display:flex;align-items:center;gap:5px;font-size:10px;color:#a8a29e;cursor:pointer;">
      <input type="checkbox" ${showIgnored ? 'checked' : ''} onchange="window._showIgnoredInSidebarTypes=this.checked;window.renderTypeFilters();" style="margin:0;width:12px;height:12px;">
      Show Ignored
    </label>
    <span style="font-size:9px;color:#78716c;">${ignoredTotal} ignored</span>
  </div>`;

  html += `<div style="width:100%;font-size:11px;color:#aaa;margin-bottom:6px;font-weight:bold;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
    <span>📁 Filter by Type:</span>
    ${window._activeTypeFilter ? `<span onclick="window.toggleTypeFilter(null)" style="color:var(--accent);cursor:pointer;font-weight:normal;font-size:10px;">[Clear]</span>` : ''}
  </div>`;

  const typeIcons = {
    markdown: '📝',
    csv: '📊',
    json: '⚙️',
    text: '📄',
    code: '💻',
    image: '🖼️'
  };

  const typeLabels = {
    markdown: 'Doc',
    csv: 'CSV',
    json: 'JSON',
    text: 'Text',
    code: 'Code',
    image: 'Img'
  };

  for (let type in counts) {
    let count = counts[type];
    if (count === 0) continue;
    let active = window._activeTypeFilter === type;
    let icon = typeIcons[type] || '📄';
    let label = typeLabels[type] || type;
    let bg = active ? 'var(--accent)' : '#1e293b';
    let color = active ? '#000' : '#ddd';
    let border = active ? '1px solid var(--accent)' : '1px solid #334155';

    html += `<button class="type-filter-btn" data-type="${type}" onclick="window.toggleTypeFilter('${type}')" style="
      background:${bg};
      color:${color};
      border:${border};
      padding:4px 8px;
      font-size:11px;
      border-radius:4px;
      cursor:pointer;
      transition:all 0.2s;
      display:inline-flex;
      align-items:center;
      gap:4px;
      margin-bottom:4px;
      margin-right:2px;
    " title="Show only ${label} files">${icon} ${label} (${count})</button>`;
  }

  container.innerHTML = html;
};

window.toggleTypeFilter = function (type) {
  if (window._activeTypeFilter === type) {
    window._activeTypeFilter = null;
  } else {
    window._activeTypeFilter = type;
  }

  window.renderTypeFilters();

  let treeRoot = document.getElementById('tree');
  if (treeRoot) {
    treeRoot.innerHTML = '';
    renderTree(buildTree(), treeRoot);
    if (window.updateNoteBadges) window.updateNoteBadges();
  }

  if (window._sidebarSearchTerm1 || window._sidebarSearchTerm2) {
    filterTree(window._sidebarSearchTerm1, window._sidebarSearchTerm2);
  }
};

// ==============================================================================
// REVIEWER & ADMIN FILE REVIEW / EDIT SYSTEM
// ==============================================================================
window.REVIEWS = REVIEWS_DB || {};
