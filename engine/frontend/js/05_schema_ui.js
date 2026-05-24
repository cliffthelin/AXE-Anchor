
const DATA = DATA_PLACEHOLDER;
const VALIDATION_RULES = RULES_PLACEHOLDER;
const VALIDATION_REPORT = VALIDATION_PLACEHOLDER;
const CONFIG = CONFIG_PLACEHOLDER;
const REVIEWS_DB = REVIEWS_PLACEHOLDER;

window.runBuilder = async function() {
  const btn = document.getElementById('btnRunBuilder');
  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Building...';
  btn.style.opacity = '0.7';

  if (window.isServerMode === false) {
    alert('The Python builder server is not running (Static Mode).\n\nTo rebuild the visualizer, open your terminal and run:\npython3 builder.py');
    btn.disabled = false;
    btn.innerHTML = oldText;
    btn.style.opacity = '1';
    return;
  }

  let host = window.location.origin;
  if (host === 'null' || host.startsWith('file://')) {
    host = 'http://127.0.0.1:8000';
  }

  try {
    const res = await fetch(host + '/run-builder', { method: 'POST' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.status === 'success') {
      btn.innerHTML = '✅ Success! Reloading...';
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      throw new Error(data.message || 'Unknown error');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to run builder: ' + err.message + '\n\nMake sure the builder server is running. Start it by running:\npython3 builder.py --serve');
    btn.disabled = false;
    btn.innerHTML = oldText;
    btn.style.opacity = '1';
  }
};

// Watch Mode client-side reloading
(function() {
  let host = window.location.origin;
  if (host === 'null' || host.startsWith('file://')) {
    // Abort watch polling when running from static file
    console.log('[Watch] Running from static file. Auto-rebuild polling disabled.');
    return;
  }
  async function pollWatchStatus() {
    try {
      const res = await fetch(host + '/watch-id');
      if (res.ok) {
        const data = await res.json();
        if (data.watch) {
          if (window._lastBuildId !== undefined && data.build_id !== window._lastBuildId) {
            console.log('[Watch] Build ID changed. Reloading page...');
            window.location.reload();
          }
          window._lastBuildId = data.build_id;
        }
      }
    } catch (e) {}
  }
  setInterval(pollWatchStatus, 1000);
})();


function esc(t) { return String(t).replace(/[&<>]/g, a => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[a])); }

// ==========================================
// FORMAT-AWARE DOCUMENT RENDERER
// ==========================================
function syntaxHighlight(text, lang) {
  let h = esc(text);
  lang = (lang || '').toLowerCase();
  if (lang === 'py' || lang === 'python') {
    h = h.replace(/#[^\\n]*/g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\\b(def|class|import|from|return|if|elif|else|for|while|with|as|try|except|finally|pass|break|continue|and|or|not|in|is|lambda|yield|global|nonlocal|raise|del|assert|None|True|False)\\b/g, '<span class="tok-kw">$1</span>');
    h = h.replace(/(&#39;(?:[^&#]|&(?!#))*?&#39;|&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="tok-str">$1</span>');
    h = h.replace(/\\b(\\d+(?:\\.\\d+)?)\\b/g, '<span class="tok-num">$1</span>');
  } else if (lang === 'ps1' || lang === 'powershell') {
    h = h.replace(/#[^\\n]*/g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/(\\$[\\w]+)/g, '<span class="tok-var">$1</span>');
    h = h.replace(/\\b(function|param|if|else|elseif|foreach|for|while|do|switch|try|catch|finally|return|throw|break|continue|exit)\\b/gi, '<span class="tok-kw">$1</span>');
    h = h.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="tok-str">$1</span>');
  } else if (lang === 'sql') {
    h = h.replace(/--[^\\n]*/g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\\/\\*[\\s\\S]*?\\*\\//g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|FULL|ON|GROUP|ORDER|BY|HAVING|UNION|ALL|INSERT|INTO|UPDATE|SET|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|VIEW|AS|AND|OR|NOT|IN|EXISTS|LIKE|BETWEEN|IS|NULL|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|WITH|VALUES|EXEC|PROCEDURE|FUNCTION|TRIGGER|BEGIN|COMMIT|ROLLBACK|DECLARE|CAST|CONVERT|COALESCE|ISNULL|TOP|LIMIT|OFFSET)\\b/gi, '<span class="tok-kw">$1</span>');
    h = h.replace(/(&#39;(?:[^&#]|&(?!#))*?&#39;)/g, '<span class="tok-str">$1</span>');
    h = h.replace(/\\b(\\d+(?:\\.\\d+)?)\\b/g, '<span class="tok-num">$1</span>');
  } else if (lang === 'xml' || lang === 'html') {
    h = h.replace(/(&lt;!--[\\s\\S]*?--&gt;)/g, '<span class="tok-cmt">$1</span>');
    h = h.replace(/(&lt;\\/?)([\\w:.-]+)/g, (_, p, t) => `${p}<span class="tok-tag">${t}</span>`);
    h = h.replace(/([\\w:-]+)(=&quot;)/g, '<span class="tok-attr">$1</span>$2');
    h = h.replace(/(=&quot;[^&]*&quot;|=&#39;[^&#]*&#39;)/g, '<span class="tok-str">$1</span>');
  } else if (lang === 'json') {
    h = h.replace(/(&quot;[^&]*&quot;)(\\s*:)/g, '<span class="tok-key">$1</span>$2');
    h = h.replace(/:\\s*(&quot;[^&]*&quot;)/g, (m, s) => m.replace(s, `<span class="tok-str">${s}</span>`));
    h = h.replace(/:\\s*(\\d+(?:\\.\\d+)?)/g, (m, n) => m.replace(n, `<span class="tok-num">${n}</span>`));
    h = h.replace(/:\\s*(true|false)\\b/g, (m, b) => m.replace(b, `<span class="tok-bool">${b}</span>`));
    h = h.replace(/:\\s*(null)\\b/g, (m, n) => m.replace(n, `<span class="tok-null">${n}</span>`));
  } else if (lang === 'yaml' || lang === 'yml') {
    h = h.replace(/#[^\\n]*/g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/^([\\w-]+):/gm, '<span class="tok-key">$1</span>:');
    h = h.replace(/(&#39;[^&#]*&#39;|&quot;[^&]*&quot;)/g, '<span class="tok-str">$1</span>');
  } else if (lang === 'cs' || lang === 'csharp' || lang === 'csproj' || lang === 'sln') {
    h = h.replace(/\\/\\/[^\\n]*/g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\\/\\*[\\s\\S]*?\\*\\//g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\\b(using|namespace|class|interface|struct|enum|public|private|protected|internal|static|readonly|volatile|virtual|override|abstract|sealed|new|this|base|string|int|long|short|bool|float|double|decimal|void|object|var|return|if|else|switch|case|default|for|foreach|while|do|break|continue|try|catch|finally|throw|typeof|sizeof|delegate|event|operator|implicit|explicit|null|true|false)\\b/g, '<span class="tok-kw">$1</span>');
    h = h.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;|&#39;(?:[^&#]|&(?!#))*?&#39;)/g, '<span class="tok-str">$1</span>');
    h = h.replace(/\\b(\\d+(?:\\.\\d+)?)\\b/g, '<span class="tok-num">$1</span>');
  } else if (lang === 'ts' || lang === 'typescript' || lang === 'js' || lang === 'javascript') {
    h = h.replace(/\\/\\/[^\\n]*/g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\\/\\*[\\s\\S]*?\\*\\//g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\\b(import|from|export|default|class|interface|enum|const|let|var|function|return|if|else|for|while|do|break|continue|try|catch|finally|throw|new|this|super|async|await|public|private|protected|readonly|any|string|number|boolean|void|null|undefined|true|false)\\b/g, '<span class="tok-kw">$1</span>');
    h = h.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;|&#39;(?:[^&#]|&(?!#))*?&#39;|`(?:[^`]|&(?!#))*?`)/g, '<span class="tok-str">$1</span>');
    h = h.replace(/\\b(\\d+(?:\\.\\d+)?)\\b/g, '<span class="tok-num">$1</span>');
  }
  return h;
}

function renderCode(text, lang) {
  let highlighted = syntaxHighlight(text, lang);
  let lines = highlighted.split('\\n');
  let numbered = lines.map((ln, i) =>
    `<span style="color:#555;user-select:none;padding-right:14px;text-align:right;display:inline-block;min-width:38px;border-right:1px solid #222;margin-right:10px;">${i+1}</span>${ln}`
  ).join('\\n');
  return `<pre style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:14px 12px;overflow:auto;font-size:12px;line-height:1.7;font-family:Consolas,monospace;">${numbered}</pre>`;
}

function renderJson(raw) {
  try {
    let pretty = JSON.stringify(JSON.parse(raw), null, 2);
    return renderCode(pretty, 'json');
  } catch(e) {
    return `<div style="color:#f44336;font-size:12px;margin-bottom:8px;">JSON parse error: ${esc(String(e))}</div>` + renderCode(raw, '');
  }
}

function renderCsv(doc) {
  if (!doc.rows || doc.rows.length === 0) return '<span style="color:#888;">Empty CSV</span>';
  let rows = doc.rows;
  let header = rows[0].map(h => `<th>${esc(h)}</th>`).join('');
  let body = rows.slice(1).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<div class="csv-wrap"><table class="csv-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderMarkdown(text) {
  let blocks = [];
  let t = text.replace(/```(\\w*)\\n?([\\s\\S]*?)```/g, (_, lang, code) => {
    let idx = blocks.length;
    blocks.push(`<pre><code>${syntaxHighlight(code.trim(), lang)}</code></pre>`);
    return `@@BLK${idx}@@`;
  });
  let h = esc(t);
  h = h.replace(/`([^`\\n]+)`/g, '<code>$1</code>');
  h = h.replace(/^######\\s+(.+)$/gm, '<h6>$1</h6>');
  h = h.replace(/^#####\\s+(.+)$/gm, '<h5>$1</h5>');
  h = h.replace(/^####\\s+(.+)$/gm, '<h4>$1</h4>');
  h = h.replace(/^###\\s+(.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^##\\s+(.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^#\\s+(.+)$/gm, '<h1>$1</h1>');
  h = h.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
  h = h.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
  h = h.replace(/\\*([^*\\n]+)\\*/g, '<em>$1</em>');
  h = h.replace(/~~(.+?)~~/g, '<del>$1</del>');
  h = h.replace(/^(---+|===+)$/gm, '<hr>');
  h = h.replace(/^&gt;\\s?(.+)$/gm, '<blockquote>$1</blockquote>');
  h = h.replace(/((?:\\|.+\\|[ \\t]*\\n?)+)/g, tableStr => {
    let rows = tableStr.trim().split('\\n').filter(r => r.trim());
    if (rows.length < 2) return tableStr;
    let out = '<table>';
    rows.forEach((row, ri) => {
      if (/^\\|[-|: ]+\\|$/.test(row.trim())) return;
      let cells = row.split('|').slice(1, -1);
      let tag = ri === 0 ? 'th' : 'td';
      out += `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
    });
    return out + '</table>';
  });
  h = h.replace(/((?:^[ \\t]*[-*]\\s.+\\n?)+)/gm, lb => {
    let items = lb.trim().split('\\n').map(l => `<li>${l.replace(/^[ \\t]*[-*]\\s/, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  h = h.replace(/((?:^\\d+\\.\\s.+\\n?)+)/gm, lb => {
    let items = lb.trim().split('\\n').map(l => `<li>${l.replace(/^\\d+\\.\\s/, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });
  h = h.replace(/!\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<img src="$2" alt="$1" style="max-width:100%;">');
  h = h.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');
  h = h.replace(/\\n{2,}/g, '</p><p>');
  h = '<p>' + h + '</p>';
  h = h.replace(/\\n/g, '<br>');
  blocks.forEach((block, idx) => { h = h.split(`@@BLK${idx}@@`).join(block); });
  h = h.replace(/<p>\\s*(<(?:h[1-6]|ul|ol|table|blockquote|pre|hr)[^>]*>)/g, '$1');
  h = h.replace(/(<\\/(?:h[1-6]|ul|ol|table|blockquote|pre)>)\\s*<\\/p>/g, '$1');
  h = h.replace(/<p>\\s*<\\/p>/g, '');
  return `<div class="md-body">${h}</div>`;
}

function renderDoc(filePath, doc) {
  if (!doc) return '<span style="color:#888;">(file not found)</span>';
  let ext = (doc.ext || '').toLowerCase();
  if (doc.base64) return `<div style="text-align:center;padding:10px;"><img src="${doc.base64}" style="max-width:100%;border:1px solid #444;border-radius:4px;" alt="${esc(filePath.split('/').pop())}"></div>`;
  let content = doc.content || '';
  if (ext === '.md' || ext === '.pdf' || ext === '.docx' || ext === '.doc' || ext === '.xlsx' || ext === '.xls')  return renderMarkdown(content);
  if (ext === '.json') return renderJson(content);
  if (ext === '.csv')  return renderCsv(doc);
  if (['.py','.ps1','.sql','.xml','.yaml','.yml','.cs','.csproj','.sln'].includes(ext)) return renderCode(content, ext.slice(1));
  return `<pre>${esc(content)}</pre>`;
}

// ==========================================
// RESIZERS
// ==========================================
function initResizer(resizerId, elementId, isHorizontal) {
  const resizer = document.getElementById(resizerId);
  const el = document.getElementById(elementId);
  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => { 
    isResizing = true; 
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'; 
    e.preventDefault(); 
  });
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    if(isHorizontal) {
      if (resizerId === 'nav-resizer') el.style.width = e.clientX + 'px';
      else el.style.width = (e.clientX - document.getElementById('content-area').getBoundingClientRect().left) + 'px';
    } else {
      let offsetTop = document.getElementById('right').getBoundingClientRect().top;
      el.style.height = (e.clientY - offsetTop) + 'px';
    }
  });
  document.addEventListener('mouseup', () => {
    if (isResizing) { isResizing = false; document.body.style.cursor = 'default'; window.dispatchEvent(new Event('resize')); }
  });
}
initResizer('nav-resizer', 'nav', true);
initResizer('content-resizer', 'left', true);
initResizer('proof-resizer', 'impact-top', false);

// ==========================================
// CONTEXT MENU
// ==========================================
let ctxMenu = document.getElementById('ctx-menu');
let ctxFilePath = null;
function showContextMenu(x, y, filePath) {
  ctxFilePath = filePath;
  ctxMenu.style.display = 'block';
  let mw = ctxMenu.offsetWidth || 178, mh = ctxMenu.offsetHeight || 72;
  ctxMenu.style.left = Math.min(x, window.innerWidth - mw - 6) + 'px';
  ctxMenu.style.top  = Math.min(y, window.innerHeight - mh - 6) + 'px';
}
document.addEventListener('click', () => { ctxMenu.style.display = 'none'; });
document.addEventListener('keydown', e => { if(e.key === 'Escape') ctxMenu.style.display = 'none'; });
document.getElementById('ctx-open').addEventListener('click', e => {
  e.stopPropagation();
  if(ctxFilePath) openFileInViewer(ctxFilePath);
  ctxMenu.style.display = 'none';
});
document.getElementById('ctx-graph').addEventListener('click', e => {
  e.stopPropagation();
  if(ctxFilePath) {
    let pending = ctxFilePath;
    nav('lineage');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if(window.setGraphFocus) window.setGraphFocus(pending);
    }));
  }
  ctxMenu.style.display = 'none';
});

function toggleFullScreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e=>{});
  else if (document.exitFullscreen) document.exitFullscreen();
}

// ==========================================
// UI NAVIGATION
// ==========================================
let currentView = 'explorer';

function nav(view) {
  currentView = view;
  const L = document.getElementById('left'), R = document.getElementById('right'), resizer = document.getElementById('content-resizer');
  L.innerHTML = ''; 
  document.getElementById('impact-top').innerHTML = 'Select a node on the graph.';
  document.getElementById('proof-content').innerHTML = 'Click an upstream or downstream file to see exactly how they are connected.';
  
  // Update active state of nav buttons
  const btnExplorer = document.getElementById('btnNavExplorer');
  const btnLineage = document.getElementById('btnNavLineage');
  const btnCompendium = document.getElementById('btnNavCompendium');
  const btnTodos = document.getElementById('btnNavTodos');
  const btnExport = document.getElementById('btnNavExport');
  const btnWorkspaces = document.getElementById('btnNavWorkspaces');
  
  if (btnExplorer) btnExplorer.classList.toggle('active', view === 'explorer' || view === 'search-results');
  if (btnLineage) btnLineage.classList.toggle('active', view === 'lineage');
  if (btnCompendium) btnCompendium.classList.toggle('active', view === 'compendium');
  if (btnTodos) btnTodos.classList.toggle('active', view === 'todos');
  if (btnExport) btnExport.classList.toggle('active', view === 'export');
  if (btnWorkspaces) btnWorkspaces.classList.toggle('active', view === 'workspaces');
  
  if(view === 'explorer') { 
    resizer.style.display = 'none'; R.style.display = 'none'; L.style.width = '100%'; L.style.padding = '15px';
    L.innerHTML = '<h3>Explorer</h3>Select a file from the sidebar.';
  } else if(view === 'search-results') {
    resizer.style.display = 'none'; R.style.display = 'none'; L.style.width = '100%'; L.style.padding = '15px';
    window.renderFullSearchResults(L);
  } else if(view === 'compendium') {
    resizer.style.display = 'none'; R.style.display = 'none'; L.style.width = '100%'; L.style.padding = '0';
    renderCompendium(L);
  } else if(view === 'todos') {
    resizer.style.display = 'none'; R.style.display = 'none'; L.style.width = '100%'; L.style.padding = '15px';
    renderTodoPanel(L);
  } else if(view === 'export') {
    resizer.style.display = 'none'; R.style.display = 'none'; L.style.width = '100%'; L.style.padding = '15px';
    renderExportPanel(L);
  } else if(view === 'workspaces') {
    resizer.style.display = 'none'; R.style.display = 'none'; L.style.width = '100%'; L.style.padding = '15px';
    renderWorkspacesPanel(L);
  } else { 
    resizer.style.display = 'block'; R.style.display = 'flex'; L.style.width = '65%'; L.style.padding = '15px';
    renderLineageUI(L);
  }
}

// ==========================================
// WORKSPACES & SECURITY PANEL RENDERER
// ==========================================
let workspacesData = [];
let editingWorkspaceName = null;



function renderWorkspacesPanel(container) {
  container.innerHTML = `
    <div style="max-width:1200px; margin:0 auto; padding:20px; font-family:Segoe UI, sans-serif;">
      <!-- Title & Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:15px; margin-bottom:25px;">
        <div>
          <h2 style="margin:0; color:#fff; font-size:24px;">💼 Workspaces & Repositories</h2>
          <p style="margin:5px 0 0; color:#888; font-size:13px;">Manage multi-folder projects, secure credentials, and synchronize with GitHub.</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button onclick="openWorkspaceModal()" style="background:#007acc; border:none; color:white; font-weight:bold; padding:8px 16px; border-radius:4px; display:flex; align-items:center; gap:6px; cursor:pointer;">
            ➕ Add Workspace
          </button>
          <button id="btnSyncAllWorkspaces" onclick="syncAllWorkspaces()" style="background:#2d2d2d; border:1px solid #444; color:#38bdf8; font-weight:bold; padding:8px 16px; border-radius:4px; display:flex; align-items:center; gap:6px; cursor:pointer;">
            🔄 Sync All
          </button>
        </div>
      </div>

      <div id="workspacesStaticBanner" style="display:none;"></div>

      <!-- Top Row: Settings Grid -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:25px;">
        
        <!-- GitHub Token Settings -->
        <div style="background:var(--panel); border:1px solid var(--border); border-radius:6px; padding:15px;">
          <h3 style="margin-top:0; color:#fff; font-size:16px; display:flex; align-items:center; gap:8px;">🔑 GitHub Authentication</h3>
          <p style="color:#aaa; font-size:12px; margin:5px 0 15px;">Set a Personal Access Token (PAT) for synchronizing private repositories. The token is stored securely in settings.json locally and never returned to the UI.</p>
          <div style="display:flex; gap:10px; align-items:center;">
            <input id="githubPatInput" type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" style="flex:1; background:#18181b; border:1px solid #3f3f46; color:#fff; padding:8px; border-radius:4px; font-size:13px;">
            <button onclick="saveGithubToken()" style="background:#10b981; border:none; color:white; font-weight:bold; padding:8px 14px; border-radius:4px;">Save Token</button>
          </div>
          <div id="githubPatStatus" style="font-size:11px; margin-top:8px; color:#888;">Checking configuration...</div>
        </div>

        <!-- Security Settings (Basic Auth Password Lock) -->
        <div style="background:var(--panel); border:1px solid var(--border); border-radius:6px; padding:15px;">
          <h3 style="margin-top:0; color:#fff; font-size:16px; display:flex; align-items:center; gap:8px;">🛡️ Security & Password Protection</h3>
          <p style="color:#aaa; font-size:12px; margin:5px 0 15px;">Secure access to the visualizer. If locked, users must authenticate with Basic Auth. The password is hashed using bcrypt.</p>
          
          <div id="securityLockStatus" style="font-weight:bold; font-size:12px; color:#aaa; margin-bottom:10px;">Checking status...</div>
          
          <div id="securityFormArea" style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; gap:8px;">
              <input id="securityPasswordInput" type="password" placeholder="New Password" style="flex:1; background:#18181b; border:1px solid #3f3f46; color:#fff; padding:6px; border-radius:4px; font-size:12px;">
              <button onclick="updateSecurityPassword()" style="background:#007acc; border:none; color:white; font-size:12px; padding:6px 12px; border-radius:4px;">Set Password</button>
              <button id="btnDisableSecurity" onclick="disableSecurityPassword()" style="background:#ef4444; border:none; color:white; font-size:12px; padding:6px 12px; border-radius:4px; display:none;">Disable Lock</button>
            </div>
            <div id="securityStatusMsg" style="font-size:11px; color:#888;"></div>
          </div>
        </div>

      </div>

      <!-- Workspaces Cards List -->
      <h3 style="color:#fff; font-size:18px; margin:20px 0 15px;">Workspaces</h3>
      <div id="workspacesGrid" style="display:flex; flex-direction:column; gap:20px;">
        <div style="color:#888; font-size:13px; text-align:center; padding:40px; background:var(--panel); border:1px dashed var(--border); border-radius:6px;">
          Loading workspaces...
        </div>
      </div>

      <!-- Add/Edit Workspace Modal (Hidden by default) -->
      <div id="workspaceModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; align-items:center; justify-content:center;">
        <div style="background:var(--panel); border:1px solid var(--border); border-radius:8px; width:700px; max-height:85vh; overflow-y:auto; padding:25px; box-shadow:0 10px 25px rgba(0,0,0,0.5); display:flex; flex-direction:column; gap:20px;">
          <h3 id="modalTitle" style="margin-top:0; color:#fff; font-size:20px; border-bottom:1px solid var(--border); padding-bottom:12px;">Edit Workspace</h3>
          
          <!-- Workspace Name -->
          <div>
            <label style="display:block; font-size:12px; color:#a1a1aa; margin-bottom:5px; font-weight:bold; text-transform:uppercase;">Workspace Name *</label>
            <input id="wsName" type="text" placeholder="e.g. Core Services Swarm" style="width:100%; box-sizing:border-box; background:#18181b; border:1px solid #3f3f46; color:#fff; padding:8px; border-radius:4px; font-size:13px;">
          </div>

          <!-- Context Folder -->
          <div style="background:#18181b; border:1px solid #27272a; border-radius:6px; padding:15px; display:flex; flex-direction:column; gap:12px;">
            <div style="font-weight:bold; font-size:12px; color:#e4e4e7; text-transform:uppercase; letter-spacing:0.5px;">📁 Context Folder Configuration</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label style="display:block; font-size:11px; color:#a1a1aa; margin-bottom:4px;">Display Name</label>
                <input id="wsCtxName" type="text" placeholder="e.g. UTREx Context" style="width:100%; box-sizing:border-box; background:#27272a; border:1px solid #3f3f46; color:#fff; padding:6px; border-radius:4px; font-size:12px;">
              </div>
              <div>
                <label style="display:block; font-size:11px; color:#a1a1aa; margin-bottom:4px;">Physical Path</label>
                <input id="wsCtxPath" type="text" placeholder="e.g. _reversa_sdd" style="width:100%; box-sizing:border-box; background:#27272a; border:1px solid #3f3f46; color:#fff; padding:6px; border-radius:4px; font-size:12px;">
              </div>
            </div>
          </div>

          <!-- Projects & Repositories Dynamic List -->
          <div style="background:#18181b; border:1px solid #27272a; border-radius:6px; padding:15px; display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:bold; font-size:12px; color:#e4e4e7; text-transform:uppercase; letter-spacing:0.5px;">🚀 Associated Projects & Git Repositories</div>
              <button type="button" onclick="addProjectRow()" style="background:#0969da; border:none; color:white; font-size:11px; font-weight:bold; padding:4px 10px; border-radius:4px; cursor:pointer;">+ Add Project</button>
            </div>
            
            <div id="projectsListContainer" style="display:flex; flex-direction:column; gap:10px; max-height:220px; overflow-y:auto; padding-right:5px;">
              <!-- Dynamic project rows go here -->
            </div>
          </div>

          <!-- Supporting Resources Dynamic List -->
          <div style="background:#18181b; border:1px solid #27272a; border-radius:6px; padding:15px; display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:bold; font-size:12px; color:#e4e4e7; text-transform:uppercase; letter-spacing:0.5px;">📚 Supporting Resources</div>
              <button type="button" onclick="addResourceRow()" style="background:#0969da; border:none; color:white; font-size:11px; font-weight:bold; padding:4px 10px; border-radius:4px; cursor:pointer;">+ Add Resource</button>
            </div>
            
            <div id="resourcesListContainer" style="display:flex; flex-direction:column; gap:8px; max-height:150px; overflow-y:auto; padding-right:5px;">
              <!-- Dynamic resource rows go here -->
            </div>
          </div>

          <!-- Actions -->
          <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid var(--border); padding-top:15px;">
            <button onclick="closeWorkspaceModal()" style="background:#2d2d2d; border:1px solid #444; color:#fff; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:bold;">Cancel</button>
            <button onclick="saveWorkspaceForm()" style="background:#007acc; border:none; color:#fff; font-weight:bold; padding:8px 16px; border-radius:4px; cursor:pointer;">Save Workspace</button>
          </div>
        </div>
      </div>

    </div>
  `;

  fetchWorkspacesData();
}



function closeWorkspaceModal() {
  document.getElementById('workspaceModal').style.display = 'none';
}

async function fetchWorkspacesData() {
  let isStatic = false;
  let data = null;
  try {
    const res = await fetch('/api/workspaces');
    if (!res.ok) throw new Error('Failed to load workspaces');
    data = await res.json();
  } catch(e) {
    console.log('[Workspaces] Server not running, switching to static mode:', e.message);
    isStatic = true;
    data = {
      workspaces: (typeof CONFIG !== 'undefined' ? CONFIG.workspaces : []) || [],
      github_token_configured: (typeof CONFIG !== 'undefined' ? CONFIG.github_token_configured : false) || false,
      password_protection_enabled: (typeof CONFIG !== 'undefined' ? CONFIG.password_protection_enabled : false) || false
    };
  }

  window.isServerMode = !isStatic;
  workspacesData = data.workspaces || [];

  // Update static warning banner visibility
  const banner = document.getElementById('workspacesStaticBanner');
  if (banner) {
    if (!window.isServerMode) {
      banner.innerHTML = `
        <div style="background:#451a03; border:1px solid #78350f; color:#fef3c7; padding:12px; border-radius:6px; margin-bottom:20px; font-size:13px; display:flex; align-items:center; gap:8px;">
          <span>⚠️</span>
          <div>
            <strong>Standalone Static Viewer (No Backend Server):</strong> Workspace configuration and Git synchronization are read-only.
            To enable full interactivity and saving in the UI, start the local server by running: 
            <code style="background:#1e1b4b; color:#c7d2fe; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:12px;">python3 builder.py --serve</code>
          </div>
        </div>
      `;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }

  const patStatus = document.getElementById('githubPatStatus');
  const patInput = document.getElementById('githubPatInput');
  const patBtn = patInput ? patInput.nextElementSibling : null;
  const lockStatus = document.getElementById('securityLockStatus');
  const btnDisable = document.getElementById('btnDisableSecurity');
  const pwdInput = document.getElementById('securityPasswordInput');
  const pwdBtn = pwdInput ? pwdInput.nextElementSibling : null;

  if (!window.isServerMode) {
    // Disable add/sync toolbar actions
    const btnAdd = document.querySelector('button[onclick="openWorkspaceModal()"]');
    if (btnAdd) { btnAdd.disabled = true; btnAdd.style.opacity = '0.5'; btnAdd.style.cursor = 'not-allowed'; btnAdd.style.pointerEvents = 'none'; }
    const btnSyncAll = document.getElementById('btnSyncAllWorkspaces');
    if (btnSyncAll) { btnSyncAll.disabled = true; btnSyncAll.style.opacity = '0.5'; btnSyncAll.style.cursor = 'not-allowed'; btnSyncAll.style.pointerEvents = 'none'; }

    // GitHub Token read-only state
    if (patInput) {
      patInput.disabled = true;
      patInput.placeholder = 'GitHub PAT is read-only in Static Mode';
      patInput.style.opacity = '0.5';
      patInput.style.cursor = 'not-allowed';
    }
    if (patBtn) { patBtn.disabled = true; patBtn.style.opacity = '0.5'; patBtn.style.cursor = 'not-allowed'; patBtn.style.pointerEvents = 'none'; }
    if (patStatus) {
      patStatus.innerHTML = data.github_token_configured 
        ? '<span style="color:#10b981; font-weight:bold;">● Configured</span> (Loaded statically from settings.json)' 
        : '<span style="color:#ef4444; font-weight:bold;">● Not Configured</span>';
    }

    // Security Password read-only state
    if (pwdInput) {
      pwdInput.disabled = true;
      pwdInput.placeholder = 'Password lock is read-only in Static Mode';
      pwdInput.style.opacity = '0.5';
      pwdInput.style.cursor = 'not-allowed';
    }
    if (pwdBtn) { pwdBtn.disabled = true; pwdBtn.style.opacity = '0.5'; pwdBtn.style.cursor = 'not-allowed'; pwdBtn.style.pointerEvents = 'none'; }
    if (btnDisable) { btnDisable.disabled = true; btnDisable.style.opacity = '0.5'; btnDisable.style.cursor = 'not-allowed'; btnDisable.style.pointerEvents = 'none'; }
    if (lockStatus) {
      if (data.password_protection_enabled) {
        lockStatus.innerHTML = '<span style="color:#10b981;">🛡️ Locked</span>: Access password is configured in settings.json (enforced if server runs).';
      } else {
        lockStatus.innerHTML = '<span style="color:#eab308;">🔓 Unlocked</span>: No access password configured.';
      }
    }
  } else {
    // Enable/configure normally in Server Mode
    const btnAdd = document.querySelector('button[onclick="openWorkspaceModal()"]');
    if (btnAdd) { btnAdd.disabled = false; btnAdd.style.opacity = '1'; btnAdd.style.cursor = 'pointer'; btnAdd.style.pointerEvents = 'auto'; }
    const btnSyncAll = document.getElementById('btnSyncAllWorkspaces');
    if (btnSyncAll) { btnSyncAll.disabled = false; btnSyncAll.style.opacity = '1'; btnSyncAll.style.cursor = 'pointer'; btnSyncAll.style.pointerEvents = 'auto'; }

    if (patStatus) {
      if (!data.password_protection_enabled) {
        patStatus.innerHTML = '<span style="color:#f59e0b; font-weight:bold;">⚠️ Access Password Required</span>: Set an access password in the Security panel first to enable storing GitHub credentials.';
        if (patInput) {
          patInput.disabled = true;
          patInput.placeholder = 'Please set an access password first';
          patInput.style.opacity = '0.5';
          patInput.style.cursor = 'not-allowed';
        }
        if (patBtn) {
          patBtn.disabled = true;
          patBtn.style.opacity = '0.5';
          patBtn.style.cursor = 'not-allowed';
          patBtn.style.pointerEvents = 'none';
        }
      } else {
        if (patInput) {
          patInput.disabled = false;
          patInput.placeholder = 'ghp_xxxxxxxxxxxxxxxxxxxx';
          patInput.style.opacity = '1';
          patInput.style.cursor = 'auto';
        }
        if (patBtn) {
          patBtn.disabled = false;
          patBtn.style.opacity = '1';
          patBtn.style.cursor = 'pointer';
          patBtn.style.pointerEvents = 'auto';
        }
        patStatus.innerHTML = data.github_token_configured 
          ? '<span style="color:#10b981; font-weight:bold;">● Configured</span> (Token is set and masked)' 
          : '<span style="color:#ef4444; font-weight:bold;">● Not Configured</span> (HTTPS clone/sync might fail for private repos)';
      }
    }

    if (pwdInput) {
      pwdInput.disabled = false;
      pwdInput.placeholder = 'New Password';
      pwdInput.style.opacity = '1';
      pwdInput.style.cursor = 'auto';
    }
    if (pwdBtn) { pwdBtn.disabled = false; pwdBtn.style.opacity = '1'; pwdBtn.style.cursor = 'pointer'; pwdBtn.style.pointerEvents = 'auto'; }
    if (btnDisable) { btnDisable.disabled = false; btnDisable.style.opacity = '1'; btnDisable.style.cursor = 'pointer'; btnDisable.style.pointerEvents = 'auto'; }

    if (lockStatus) {
      if (data.password_protection_enabled) {
        lockStatus.innerHTML = '<span style="color:#10b981;">🛡️ Locked</span>: Access password is configured using bcrypt.';
        if (btnDisable) btnDisable.style.display = 'inline-block';
      } else {
        lockStatus.innerHTML = '<span style="color:#eab308;">🔓 Unlocked</span>: No access password set. Anyone can view.';
        if (btnDisable) btnDisable.style.display = 'none';
      }
    }
  }

  renderWorkspacesGrid();
}

let projectsData = [];
let activeProjectId = '';

async function fetchProjectsData() {
  let isStatic = false;
  let data = null;
  try {
    const res = await fetch('/api/governance/projects');
    if (!res.ok) throw new Error('Failed to load projects');
    data = await res.json();
  } catch(e) {
    console.log('[Projects] Server not running or projects API unavailable:', e.message);
    isStatic = true;
    data = {
      projects: CONFIG.projects || [],
      active_project_id: CONFIG.active_project_id || ''
    };
  }

  projectsData = data.projects || [];
  activeProjectId = data.active_project_id || '';
  
  // Disable register project button if static
  const btnRegister = document.getElementById('btnRegisterProject');
  if (btnRegister) {
    if (isStatic) {
      btnRegister.disabled = true;
      btnRegister.style.opacity = '0.5';
      btnRegister.style.cursor = 'not-allowed';
      btnRegister.style.pointerEvents = 'none';
    } else {
      btnRegister.disabled = false;
      btnRegister.style.opacity = '1';
      btnRegister.style.cursor = 'pointer';
      btnRegister.style.pointerEvents = 'auto';
    }
  }

  renderProjectsGrid();
}

function renderProjectsGrid() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  
  if (projectsData.length === 0) {
    grid.innerHTML = `
      <div style="color:#888; font-size:13px; text-align:center; padding:40px; background:var(--panel); border:1px dashed var(--border); border-radius:6px; grid-column:span 2;">
        No projects registered.
      </div>
    `;
    return;
  }
  
  grid.innerHTML = projectsData.map(p => {
    const isActive = p.id === activeProjectId;
    const sourcesHtml = (p.sources || []).map(s => 
      `<div style="font-size:11px; color:#aaa; margin-top:2px;">• <strong style="color:#eee;">${s.type}:</strong> <code style="word-break:break-all;">${s.target}</code></div>`
    ).join('');
    
    return `
      <div style="background:var(--panel); border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}; border-radius:6px; padding:15px; display:flex; flex-direction:column; justify-content:space-between; position:relative; box-shadow:${isActive ? '0 0 10px rgba(0,122,204,0.3)' : 'none'};">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <h4 style="margin:0 0 8px; color:#fff; font-size:16px;">
              📁 ${p.name}
              ${isActive ? '<span style="background:#10b981; color:white; font-size:10px; padding:2px 6px; border-radius:10px; margin-left:8px; font-weight:bold; vertical-align:middle; text-transform:uppercase;">Active</span>' : ''}
            </h4>
          </div>
          <div style="font-size:12px; color:#aaa; margin-bottom:10px;">${p.description || 'No description provided.'}</div>
          <div style="margin-top:10px; padding:8px; background:#18181b; border-radius:4px;">
            <div style="font-size:11px; font-weight:bold; color:#fff; margin-bottom:4px;">Sources:</div>
            ${sourcesHtml}
          </div>
          <div style="margin-top:8px; font-size:11px; color:#666;">
            <strong>Target path:</strong> <code style="word-break:break-all;">${p.reversa_target || 'None'}</code>
          </div>
        </div>
        <div style="margin-top:15px; display:flex; justify-content:flex-end; gap:8px; border-top:1px solid var(--border); padding-top:10px;">
          ${!isActive && window.isServerMode ? `
            <button onclick="switchProject('${p.id}')" style="background:#007acc; border:none; color:white; font-size:11px; padding:6px 12px; border-radius:3px; cursor:pointer; font-weight:bold;">Activate</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function switchProject(projectId) {
  try {
    const res = await fetch('/api/governance/project/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to switch project');
    
    await fetchProjectsData();
    
    if (window.parent && typeof window.parent.syncActiveProject === 'function') {
      window.parent.syncActiveProject(projectId);
    }
    
    window.location.reload();
  } catch(e) {
    alert('Failed to switch active project: ' + e.message);
  }
}

function openProjectModal() {
  document.getElementById('projName').value = '';
  document.getElementById('projPath').value = '';
  document.getElementById('projDesc').value = '';
  document.getElementById('projectModal').style.display = 'flex';
}

function closeProjectModal() {
  document.getElementById('projectModal').style.display = 'none';
}

async function saveProjectForm() {
  const nameInput = document.getElementById('projName');
  const pathInput = document.getElementById('projPath');
  const descInput = document.getElementById('projDesc');
  const name = nameInput.value.trim();
  const path = pathInput.value.trim();
  const desc = descInput.value.trim();
  
  if (!name || !path) {
    alert('Project Name and Local Folder Path are required.');
    return;
  }
  
  try {
    const res = await fetch('/api/governance/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        sources: [
          { type: 'local_folder', target: path }
        ],
        description: desc
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to register project');
    closeProjectModal();
    await fetchProjectsData();
  } catch(e) {
    alert('Failed to register project: ' + e.message);
  }
}

function renderWorkspacesGrid() {
  const grid = document.getElementById('workspacesGrid');
  if (!grid) return;
  
  if (workspacesData.length === 0) {
    grid.innerHTML = `
      <div style="color:#888; font-size:13px; text-align:center; padding:40px; background:var(--panel); border:1px dashed var(--border); border-radius:6px;">
        No workspaces configured. Click "Add Workspace" to create one.
      </div>
    `;
    return;
  }
  
  grid.innerHTML = workspacesData.map(ws => {
    // Collect git syncing configuration across workspace projects
    const hasGit = ws.projects && ws.projects.some(p => p.type === 'github_repo');
    
    return `
      <div style="background:var(--panel); border:1px solid var(--border); border-radius:6px; padding:20px; display:flex; flex-direction:column; gap:15px; box-shadow:0 4px 6px rgba(0,0,0,0.15);">
        <!-- Workspace Title and Actions -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:10px;">
          <h3 style="margin:0; color:#38bdf8; font-size:18px; font-weight:bold;">💼 ${ws.name}</h3>
          <div style="display:flex; gap:8px;">
            ${window.isServerMode ? `
              <button onclick="openWorkspaceModal('${ws.name}')" style="background:#1e293b; border:1px solid #334155; color:#e2e8f0; font-size:11px; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; transition: background 0.2s;">✏️ Edit/Manage</button>
              <button onclick="deleteWorkspace('${ws.name}')" style="background:#7f1d1d; border:1px solid #b91c1c; color:#fecaca; font-size:11px; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; transition: background 0.2s;">🗑️ Delete</button>
              ${hasGit ? `<button onclick="syncWorkspace('${ws.name}')" style="background:#064e3b; border:1px solid #047857; color:#a7f3d0; font-size:11px; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; transition: background 0.2s;">🔄 Sync Git Repos</button>` : ''}
            ` : ''}
          </div>
        </div>

        <!-- Workspace Sub-items Grid -->
        <div style="display:grid; grid-template-columns: 1fr; gap:12px;">
          <!-- Context Folder -->
          <div style="background:#18181b; border:1px solid #27272a; border-radius:4px; padding:12px;">
            <div style="font-weight:bold; font-size:12px; color:#a1a1aa; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">📁 Context Folder</div>
            ${ws.context_folder ? `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <strong style="color:#f4f4f5; font-size:13px;">${ws.context_folder.name || 'Workspace Context'}</strong>
                  <code style="display:block; margin-top:2px; font-size:11px; color:#38bdf8;">${ws.context_folder.path}</code>
                </div>
              </div>
            ` : '<span style="font-size:12px; color:#71717a; font-style:italic;">No context folder configured.</span>'}
          </div>

          <!-- Projects & Repositories -->
          <div style="background:#18181b; border:1px solid #27272a; border-radius:4px; padding:12px;">
            <div style="font-weight:bold; font-size:12px; color:#a1a1aa; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">🚀 Projects & Repositories (${(ws.projects || []).length})</div>
            ${(ws.projects && ws.projects.length > 0) ? `
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${ws.projects.map(proj => {
                  const isGit = proj.type === 'github_repo';
                  const gitStatus = ws.git_statuses ? ws.git_statuses[proj.name] : null;
                  let badge = '';
                  if (isGit && gitStatus) {
                    let badgeColor = '#3f3f46';
                    if (gitStatus.status === 'up_to_date') badgeColor = '#064e3b';
                    else if (gitStatus.status === 'out_of_sync') badgeColor = '#7f1d1d';
                    else if (gitStatus.status === 'diverged') badgeColor = '#7c2d12';
                    else if (gitStatus.status === 'not_cloned') badgeColor = '#713f12';
                    badge = `<span style="background:${badgeColor}; color:#f4f4f5; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:bold; text-transform:uppercase; margin-left:8px;">${gitStatus.status.replace(/_/g, ' ')}</span>`;
                  }
                  return `
                    <div style="background:#27272a; border:1px solid #3f3f46; border-radius:4px; padding:8px; display:flex; justify-content:space-between; align-items:center;">
                      <div>
                        <div style="display:flex; align-items:center;">
                          <strong style="color:#f4f4f5; font-size:13px;">${isGit ? '🐱' : '📁'} ${proj.name}</strong>
                          ${badge}
                        </div>
                        <code style="display:block; margin-top:2px; font-size:11px; color:#a1a1aa;">Path: ${proj.path}</code>
                        ${isGit ? `<code style="display:block; font-size:11px; color:#71717a;">Repo: ${proj.github_repo} (${proj.github_branch || 'main'})</code>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : '<span style="font-size:12px; color:#71717a; font-style:italic;">No projects configured.</span>'}
          </div>

          <!-- Supporting Resources -->
          <div style="background:#18181b; border:1px solid #27272a; border-radius:4px; padding:12px;">
            <div style="font-weight:bold; font-size:12px; color:#a1a1aa; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">📚 Supporting Resources (${(ws.supporting_resources || []).length})</div>
            ${(ws.supporting_resources && ws.supporting_resources.length > 0) ? `
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${ws.supporting_resources.map(res => `
                  <div style="background:#27272a; border:1px solid #3f3f46; border-radius:4px; padding:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                      <strong style="color:#f4f4f5; font-size:13px;">📖 ${res.name}</strong>
                      <code style="display:block; margin-top:2px; font-size:11px; color:#a1a1aa;">Path: ${res.path}</code>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<span style="font-size:12px; color:#71717a; font-style:italic;">No supporting resources configured.</span>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openWorkspaceModal(editName = null) {
  editingWorkspaceName = editName;
  const modal = document.getElementById('workspaceModal');
  const title = document.getElementById('modalTitle');
  const nameInput = document.getElementById('wsName');
  const ctxName = document.getElementById('wsCtxName');
  const ctxPath = document.getElementById('wsCtxPath');
  
  // Clear dynamic lists
  document.getElementById('projectsListContainer').innerHTML = '';
  document.getElementById('resourcesListContainer').innerHTML = '';
  
  if (editName) {
    title.innerText = 'Edit Workspace: ' + editName;
    nameInput.value = editName;
    
    const ws = workspacesData.find(w => w.name === editName);
    if (ws) {
      if (ws.context_folder) {
        ctxName.value = ws.context_folder.name || '';
        ctxPath.value = ws.context_folder.path || '';
      } else {
        ctxName.value = '';
        ctxPath.value = '';
      }
      
      if (ws.projects && ws.projects.length > 0) {
        ws.projects.forEach(p => addProjectRow(p));
      } else {
        addProjectRow();
      }
      
      if (ws.supporting_resources) {
        ws.supporting_resources.forEach(r => addResourceRow(r));
      }
    }
  } else {
    title.innerText = 'Add Workspace';
    nameInput.value = '';
    ctxName.value = '';
    ctxPath.value = '';
    
    // Add one default empty project row
    addProjectRow();
  }
  
  modal.style.display = 'flex';
}

function addProjectRow(proj = null) {
  const container = document.getElementById('projectsListContainer');
  if (!container) return;
  
  const id = 'proj_' + Math.random().toString(36).substr(2, 9);
  const row = document.createElement('div');
  row.id = id;
  row.className = 'project-row-item';
  row.style.background = '#27272a';
  row.style.border = '1px solid #3f3f46';
  row.style.borderRadius = '4px';
  row.style.padding = '10px';
  row.style.display = 'flex';
  row.style.flexDirection = 'column';
  row.style.gap = '8px';
  row.style.position = 'relative';

  const name = proj ? (proj.name || '') : '';
  const type = proj ? (proj.type || 'local_folder') : 'local_folder';
  const path = proj ? (proj.path || '') : '';
  const repo = proj ? (proj.github_repo || '') : '';
  const branch = proj ? (proj.github_branch || 'main') : 'main';

  row.innerHTML = `
    <!-- Top row: Name, Type and Delete -->
    <div style="display:flex; gap:8px; align-items:center;">
      <input type="text" class="proj-name-input" placeholder="Project Display Name" value="${name}" style="flex:2; background:#18181b; border:1px solid #52525b; color:white; padding:5px; border-radius:3px; font-size:12px;">
      <select class="proj-type-select" onchange="window.toggleProjRowFields('${id}')" style="flex:1.5; background:#18181b; border:1px solid #52525b; color:white; padding:5px; border-radius:3px; font-size:12px;">
        <option value="local_folder" ${type === 'local_folder' ? 'selected' : ''}>📁 Local Folder</option>
        <option value="github_repo" ${type === 'github_repo' ? 'selected' : ''}>🐱 GitHub Repo</option>
      </select>
      <button type="button" onclick="document.getElementById('${id}').remove()" style="background:#7f1d1d; border:none; color:#fecaca; font-weight:bold; padding:5px 8px; border-radius:3px; cursor:pointer;">✕</button>
    </div>
    <!-- Bottom row: Path and Git config -->
    <div style="display:flex; gap:8px; align-items:center;">
      <input type="text" class="proj-path-input" placeholder="Physical Local Path" value="${path}" style="flex:2; background:#18181b; border:1px solid #52525b; color:white; padding:5px; border-radius:3px; font-size:12px;">
      
      <div class="git-fields-sub" style="flex:3; display:${type === 'github_repo' ? 'flex' : 'none'}; gap:6px;">
        <input type="text" class="proj-repo-input" placeholder="owner/repo" value="${repo}" style="flex:2; background:#18181b; border:1px solid #52525b; color:white; padding:5px; border-radius:3px; font-size:12px;">
        <input type="text" class="proj-branch-input" placeholder="branch" value="${branch}" style="flex:1; background:#18181b; border:1px solid #52525b; color:white; padding:5px; border-radius:3px; font-size:12px;">
      </div>
    </div>
  `;
  container.appendChild(row);
}

function toggleProjRowFields(rowId) {
  const row = document.getElementById(rowId);
  if (!row) return;
  const select = row.querySelector('.proj-type-select');
  const gitFields = row.querySelector('.git-fields-sub');
  if (select.value === 'github_repo') {
    gitFields.style.display = 'flex';
  } else {
    gitFields.style.display = 'none';
  }
}
window.toggleProjRowFields = toggleProjRowFields;

function addResourceRow(res = null) {
  const container = document.getElementById('resourcesListContainer');
  if (!container) return;
  
  const id = 'res_' + Math.random().toString(36).substr(2, 9);
  const row = document.createElement('div');
  row.id = id;
  row.style.background = '#27272a';
  row.style.border = '1px solid #3f3f46';
  row.style.borderRadius = '4px';
  row.style.padding = '8px';
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.style.alignItems = 'center';

  const name = res ? (res.name || '') : '';
  const path = res ? (res.path || '') : '';

  row.innerHTML = `
    <input type="text" class="res-name-input" placeholder="Resource Name" value="${name}" style="flex:1; background:#18181b; border:1px solid #52525b; color:white; padding:5px; border-radius:3px; font-size:12px;">
    <input type="text" class="res-path-input" placeholder="Physical Local Path" value="${path}" style="flex:1.5; background:#18181b; border:1px solid #52525b; color:white; padding:5px; border-radius:3px; font-size:12px;">
    <button type="button" onclick="document.getElementById('${id}').remove()" style="background:#7f1d1d; border:none; color:#fecaca; font-weight:bold; padding:5px 8px; border-radius:3px; cursor:pointer;">✕</button>
  `;
  container.appendChild(row);
}

async function saveWorkspaceForm() {
  const name = document.getElementById('wsName').value.trim();
  const ctxName = document.getElementById('wsCtxName').value.trim();
  const ctxPath = document.getElementById('wsCtxPath').value.trim();
  
  if (!name) {
    alert('Workspace Name is required');
    return;
  }
  
  let context_folder = null;
  if (ctxName || ctxPath) {
    context_folder = {
      name: ctxName || 'Workspace Context',
      path: ctxPath || ''
    };
  }
  
  const projects = [];
  const projectRows = document.querySelectorAll('#projectsListContainer > div');
  for (const row of projectRows) {
    const pName = row.querySelector('.proj-name-input').value.trim();
    const pType = row.querySelector('.proj-type-select').value;
    const pPath = row.querySelector('.proj-path-input').value.trim();
    
    if (!pName || !pPath) {
      alert('Project Display Name and Local Path are required.');
      return;
    }
    
    const projObj = {
      name: pName,
      type: pType,
      path: pPath
    };
    
    if (pType === 'github_repo') {
      projObj.github_repo = row.querySelector('.proj-repo-input').value.trim();
      projObj.github_branch = row.querySelector('.proj-branch-input').value.trim() || 'main';
    }
    projects.push(projObj);
  }
  
  const supporting_resources = [];
  const resourceRows = document.querySelectorAll('#resourcesListContainer > div');
  for (const row of resourceRows) {
    const rName = row.querySelector('.res-name-input').value.trim();
    const rPath = row.querySelector('.res-path-input').value.trim();
    
    if (!rName || !rPath) {
      alert('Supporting Resource Name and local path are required.');
      return;
    }
    
    supporting_resources.push({
      name: rName,
      path: rPath
    });
  }
  
  const payload = {
    name: name,
    context_folder: context_folder,
    projects: projects,
    supporting_resources: supporting_resources
  };
  
  if (editingWorkspaceName) {
    payload.old_name = editingWorkspaceName;
  }
  
  try {
    const res = await fetch('/api/workspaces/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Save failed');
    }
    
    closeWorkspaceModal();
    fetchWorkspacesData();
  } catch(e) {
    alert('Error saving workspace: ' + e.message);
  }
}


async function deleteWorkspace(name) {
  if (!confirm(`Are you sure you want to delete workspace "${name}"?`)) return;
  try {
    const res = await fetch('/api/workspaces/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Delete failed');
    fetchWorkspacesData();
  } catch(e) {
    alert(e.message);
  }
}

async function syncWorkspace(name) {
  const grid = document.getElementById('workspacesGrid');
  if (grid) {
    grid.innerHTML = `<div style="color:#38bdf8; text-align:center; padding:40px; grid-column:span 2;"><span style="display:inline-block; animation:spin 1s linear infinite; margin-right:8px;">🔄</span> Synchronizing workspace "${name}"... Please wait.</div>`;
  }
  try {
    const res = await fetch('/api/workspaces/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    alert('Sync response: ' + data.message);
    fetchWorkspacesData();
  } catch(e) {
    alert('Sync failed: ' + e.message);
    fetchWorkspacesData();
  }
}

async function syncAllWorkspaces() {
  const btn = document.getElementById('btnSyncAllWorkspaces');
  if (btn) btn.disabled = true;
  const grid = document.getElementById('workspacesGrid');
  if (grid) {
    grid.innerHTML = `<div style="color:#38bdf8; text-align:center; padding:40px; grid-column:span 2;"><span style="display:inline-block; animation:spin 1s linear infinite; margin-right:8px;">🔄</span> Synchronizing all workspaces in parallel... Please wait.</div>`;
  }
  try {
    const res = await fetch('/api/workspaces/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync_all: true })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    alert('Sync response: ' + data.message);
    fetchWorkspacesData();
  } catch(e) {
    alert('Sync failed: ' + e.message);
    fetchWorkspacesData();
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function saveGithubToken() {
  const token = document.getElementById('githubPatInput').value.trim();
  try {
    const res = await fetch('/api/github/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_token: token })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    
    document.getElementById('githubPatInput').value = '';
    const st = document.getElementById('githubPatStatus');
    if (st) st.innerHTML = '<span style="color:#10b981; font-weight:bold;">Token saved!</span> Checking statuses...';
    fetchWorkspacesData();
  } catch(e) {
    alert('Failed to save token: ' + e.message);
  }
}

async function updateSecurityPassword() {
  const pwd = document.getElementById('securityPasswordInput').value.trim();
  const msg = document.getElementById('securityStatusMsg');
  if (!pwd) {
    alert('Password cannot be empty');
    return;
  }
  msg.innerText = 'Updating password...';
  try {
    const res = await fetch('/api/security/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    
    document.getElementById('securityPasswordInput').value = '';
    msg.innerHTML = '<span style="color:#10b981;">Password saved successfully! Reloading to log in...</span>';
    setTimeout(() => { window.location.reload(); }, 1500);
  } catch(e) {
    msg.innerText = 'Error: ' + e.message;
  }
}

async function disableSecurityPassword() {
  if (!confirm('Are you sure you want to disable password protection? Access will be public.')) return;
  const msg = document.getElementById('securityStatusMsg');
  msg.innerText = 'Disabling protection...';
  try {
    const res = await fetch('/api/security/disable-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    
    msg.innerHTML = '<span style="color:#ef4444;">Password protection disabled!</span>';
    fetchWorkspacesData();
  } catch(e) {
    msg.innerText = 'Error: ' + e.message;
  }
}

// ==========================================
// COMPENDIUM RENDERER & INTERACTION
// ==========================================
function renderCompendium(container) {
  container.innerHTML = `
    <div class="compendium-layout">
      <!-- Sticky Left TOC -->
      <div class="compendium-toc">
        <div class="compendium-toc-search">
          <input type="text" id="compendiumSearch" placeholder="Search sections..." oninput="window.filterCompendiumTOC()">
        </div>
        <div class="compendium-toc-list" id="compendiumTOCList">
          <!-- TOC items will be rendered here dynamically -->
        </div>
      </div>
      <!-- Main Reader Area -->
      <div class="compendium-reader-container">
        <!-- Progress bar -->
        <div class="compendium-progress-container">
          <div class="compendium-progress-bar" id="compendiumProgressBar"></div>
        </div>
        <div class="compendium-reader" id="compendiumReader" onscroll="window.updateCompendiumScrollSpy()">
          <!-- Renders document contents here -->
        </div>
      </div>
    </div>
  `;

  const tocList = document.getElementById('compendiumTOCList');
  const reader = document.getElementById('compendiumReader');

  // Gather documents in alphabetical order
  const filePaths = Object.keys(DATA.documents).sort();
  
  let tocHtml = '';
  let readerHtml = '';

  filePaths.forEach((fp, idx) => {
    const doc = DATA.documents[fp];
    if (doc.base64) return; // Skip image files in reader flow

    const name = fp.split('/').pop();
    const cleanId = 'comp-doc-' + idx;

    // Render TOC item
    tocHtml += `
      <div class="compendium-toc-item" id="toc-${cleanId}" onclick="window.scrollToCompendiumSection('${cleanId}')" title="${esc(fp)}">
        📄 ${esc(name)}
      </div>
    `;

    // Render reader section
    readerHtml += `
      <div class="compendium-doc-section" id="${cleanId}" data-path="${esc(fp)}">
        <div class="compendium-section-header">
          <span class="compendium-section-title">${esc(name)}</span>
          <span class="compendium-section-path">${esc(fp)}</span>
        </div>
        <div class="md-body">
          ${renderDoc(fp, doc)}
        </div>
      </div>
    `;
  });

  tocList.innerHTML = tocHtml;
  reader.innerHTML = readerHtml;

  // Setup scroll spy and progress bar
  setTimeout(() => {
    window.updateCompendiumScrollSpy();
  }, 50);
}

window.scrollToCompendiumSection = function(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};

window.filterCompendiumTOC = function() {
  const q = document.getElementById('compendiumSearch').value.toLowerCase().trim();
  const filePaths = Object.keys(DATA.documents).sort();
  
  filePaths.forEach((fp, idx) => {
    const cleanId = 'comp-doc-' + idx;
    const name = fp.split('/').pop().toLowerCase();
    const path = fp.toLowerCase();
    const tocItem = document.getElementById('toc-' + cleanId);
    
    if (tocItem) {
      const isMatch = name.includes(q) || path.includes(q);
      tocItem.style.display = isMatch ? 'flex' : 'none';
    }
  });
};

window.updateCompendiumScrollSpy = function() {
  const reader = document.getElementById('compendiumReader');
  if (!reader) return;

  // Update progress bar
  const scrollTop = reader.scrollTop;
  const scrollHeight = reader.scrollHeight - reader.clientHeight;
  const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  const progressBar = document.getElementById('compendiumProgressBar');
  if (progressBar) {
    progressBar.style.width = progress + '%';
  }

  // Intersection scroll spy using bounding rects of sections within reader container
  const sections = reader.querySelectorAll('.compendium-doc-section');
  let activeSectionId = null;
  const readerRect = reader.getBoundingClientRect();

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const rect = sec.getBoundingClientRect();
    if (rect.top - readerRect.top <= 120) {
      activeSectionId = sec.id;
    }
  }

  if (activeSectionId) {
    // Remove active class from all TOC items
    const tocItems = document.querySelectorAll('.compendium-toc-item');
    tocItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to matching TOC item
    const activeToc = document.getElementById('toc-' + activeSectionId);
    if (activeToc) {
      activeToc.classList.add('active');
      // Scroll TOC to keep the active item visible
      const tocList = document.getElementById('compendiumTOCList');
      if (tocList) {
        const itemTop = activeToc.offsetTop;
        const listHeight = tocList.clientHeight;
        const listScroll = tocList.scrollTop;
        if (itemTop < listScroll || itemTop > listScroll + listHeight - 40) {
          tocList.scrollTop = itemTop - listHeight / 2;
        }
      }
    }
  }
};

// ==========================================
// TRUE COLLAPSIBLE FOLDER TREE
// ==========================================
function buildTree() {
  let root = {};
  for(let k in DATA.documents) {
    if (window._activeTypeFilter && DATA.documents[k].type !== window._activeTypeFilter) {
      continue;
    }
    let p = k.split('/'), n = root;
    p.forEach((x,i) => { if(!n[x]) n[x] = {}; if(i === p.length-1) n[x]._f = true; n = n[x]; });
  }
  return root;
}

function renderTree(node, container, prefix='') {
  const keys = Object.keys(node).filter(k => k !== '_f');
  keys.sort((a, b) => {
    const aIsFile = node[a]._f ? 1 : 0;
    const bIsFile = node[b]._f ? 1 : 0;
    if (aIsFile !== bIsFile) return aIsFile - bIsFile;
    return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  });

  for(let k of keys) {
    let div = document.createElement('div');
    if(node[k]._f) { 
      div.className = 'tree-file'; 
      div.innerHTML = '📄 ' + k;
      div.onclick = () => {
        openFileInViewer(prefix+k);
      };
      div.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); showContextMenu(e.clientX, e.clientY, prefix+k); };
      container.appendChild(div);
    } else { 
      let folderHeader = document.createElement('div');
      folderHeader.className = 'tree-folder';
      folderHeader.innerHTML = '📁 ' + k;
      folderHeader.dataset.path = prefix + k + '/';
      
      let childContainer = document.createElement('div');
      childContainer.className = 'tree-children';
      childContainer.style.display = 'none'; // Collapsed by default
      
      folderHeader.onclick = () => {
        let isHidden = childContainer.style.display === 'none';
        childContainer.style.display = isHidden ? 'block' : 'none';
        folderHeader.innerHTML = (isHidden ? '📂 ' : '📁 ') + k;
      };
      
      renderTree(node[k], childContainer, prefix+k+'/');
      container.appendChild(folderHeader);
      container.appendChild(childContainer);
    }
  }
}


function getSidebarSearchMode() {
  let el = document.getElementById('searchMode');
  return (el && el.value ? el.value : 'all').toLowerCase();
}

window.runGlobalSearch = function() {
  let el1 = document.getElementById('search');
  let el2 = document.getElementById('search2');
  window._sidebarSearchTerm1 = el1 ? String(el1.value || '') : '';
  window._sidebarSearchTerm2 = el2 ? String(el2.value || '') : '';
  filterTree(window._sidebarSearchTerm1, window._sidebarSearchTerm2);
  
  const L = document.getElementById('left');
  if (window._sidebarSearchTerm1 || window._sidebarSearchTerm2) {
    if (currentView !== 'search-results' && currentView === 'explorer') {
      nav('search-results');
    } else if (currentView === 'search-results') {
      window.renderFullSearchResults(L);
    }
  } else {
    if (currentView === 'search-results') {
      nav('explorer');
    }
  }
};

function ensureSidebarSchemaIndex() {
  let existing = window._schemaNodeMeta || {};
  if (Object.keys(existing).length) return existing;
  if (window._sidebarSchemaIndex && Object.keys(window._sidebarSchemaIndex).length) return window._sidebarSchemaIndex;

  let index = {};
  const ensure = (name, kind, schemaName, source) => {
    let clean = cleanSchemaName(name);
    if (!clean) return null;
    if (!index[clean]) {
      index[clean] = {
        columns: [],
        fkRefs: [],
        refs: [],
        kind: kind || 'table',
        schemaName: schemaName || 'dbo',
        sources: [],
        searchText: '',
        displayName: clean
      };
    }
    let meta = index[clean];
    if (kind && !meta.kind) meta.kind = kind;
    if (schemaName && !meta.schemaName) meta.schemaName = schemaName;
    if (source && !meta.sources.includes(source)) meta.sources.push(source);
    return meta;
  };
  const pushSearchText = (meta, text) => {
    if (!meta || !text) return;
    meta.searchText = ((meta.searchText || '') + ' ' + String(text)).trim();
  };

  let psisKey = Object.keys(DATA.documents).find(k => k.endsWith('psis-directory-schema-mapping.json') && !k.includes('versions'));
  if (psisKey && DATA.documents[psisKey].data) {
    (DATA.documents[psisKey].data || []).forEach(entry => {
      let tbl = cleanSchemaName(entry.Table || '');
      if (!tbl) return;
      let schemaName = tbl.includes('.') ? tbl.split('.')[0] : 'PSIS';
      let meta = ensure(tbl, inferSchemaKind(tbl, 'table'), schemaName, 'psis');
      if (!meta) return;
      meta.columns.push({ name: entry.Column || '', type: entry.DataType || '', note: entry.Notes || '' });
      pushSearchText(meta, [tbl, entry.Column || '', entry.DataType || '', entry.Notes || ''].join(' '));
      let fkM = (entry.Notes || '').match(/FK\\\\s*[→>]\\\\s*([A-Z][A-Z0-9_\\\\.]+)/i);
      if (fkM) {
        let ref = cleanSchemaName(fkM[1]);
        if (ref) {
          if (!meta.fkRefs.includes(ref)) meta.fkRefs.push(ref);
          if (!meta.refs.includes(ref)) meta.refs.push(ref);
        }
      }
    });
  }

  let erdKey = Object.keys(DATA.documents).find(k => k.endsWith('erd-complete.md'));
  if (erdKey) {
    let content = DATA.documents[erdKey].content || '';
    let inTable = null;
    content.split('\\n').forEach(line => {
      let ts = line.match(/^[ \\t]+([A-Z][A-Z0-9_a-z]+)[ \\t]*\\{/);
      if (ts) {
        inTable = ts[1];
        let meta = ensure(inTable, 'table', 'vrf_rc', 'erd');
        if (meta && !meta.sources.includes(erdKey)) meta.sources.push(erdKey);
        pushSearchText(meta, line);
        return;
      }
      if (line.trim() === '}') { inTable = null; return; }
      if (inTable) {
        let cm = line.match(/^[ \\t]+(\\w+)[ \\t]+(\\w+)/);
        if (cm) {
          let meta = ensure(inTable, 'table', 'vrf_rc', 'erd');
          if (meta) {
            meta.columns.push({ name: cm[2], type: cm[1], note: '' });
            pushSearchText(meta, line);
          }
        }
      }
      let rel = line.match(/([A-Z][A-Z0-9_a-z]+)\\s+[|o{}<\\-]+[|o{}<\\-]\\s+([A-Z][A-Z0-9_a-z]+)\\s*:/);
      if (rel && rel[1] !== rel[2]) {
        let a = cleanSchemaName(rel[1]);
        let b = cleanSchemaName(rel[2]);
        if (a && b) {
          let meta = ensure(a, 'table', 'vrf_rc', 'erd');
          if (meta) {
            if (!meta.refs.includes(b)) meta.refs.push(b);
            pushSearchText(meta, line);
          }
        }
      }
    });
  }

  Object.keys(DATA.documents).forEach(fp => {
    if (!fp.toLowerCase().endsWith('.sql')) return;
    let content = DATA.documents[fp].content || '';
    let defs = [...content.matchAll(/CREATE\\s+(?:OR\\s+ALTER\\s+)?(VIEW|PROC(?:EDURE)?|TABLE)\\s+([A-Za-z0-9_\\.\\[\\]]+)/gi)];
    if (!defs.length) return;
    let refs = [...content.matchAll(/\\b(?:FROM|JOIN|INTO|UPDATE|EXEC(?:UTE)?)\\s+([A-Za-z0-9_\\.\\[\\]]+)/gi)].map(m => cleanSchemaName(m[1]));
    defs.forEach(m => {
      let kind = inferSchemaKind(m[2], m[1]);
      let name = cleanSchemaName(m[2]);
      let schemaName = name.includes('.') ? name.split('.')[0] : 'dbo';
      let meta = ensure(name, kind, schemaName, fp);
      if (!meta) return;
      pushSearchText(meta, content);
      refs.forEach(r => {
        if (!r || r === name) return;
        if (!meta.refs.includes(r)) meta.refs.push(r);
      });
    });
  });

  window._sidebarSchemaIndex = index;
  return index;
}

function renderSidebarFileResults(term1, term2, mode) {
  let q1 = (term1 || '').trim().toLowerCase();
  let q2 = (term2 || '').trim().toLowerCase();
  if (!q1 && !q2) return '';
  let results = [];
  Object.keys(DATA.documents).forEach(fp => {
    let doc = DATA.documents[fp] || {};
    if (window._activeTypeFilter && doc.type !== window._activeTypeFilter) return;
    let content = String(doc.content || '');
    let name = fp.split('/').pop().toLowerCase();
    let path = fp.toLowerCase();
    
    let pm1 = q1 ? (path.includes(q1) || name.includes(q1)) : true;
    let pm2 = q2 ? (path.includes(q2) || name.includes(q2)) : true;
    let ch1 = (q1 && mode !== 'files') ? countTermHits(content, q1) : 0;
    let ch2 = (q2 && mode !== 'files') ? countTermHits(content, q2) : 0;
    
    let match1 = !q1 || pm1 || ch1 > 0;
    let match2 = !q2 || pm2 || ch2 > 0;
    
    if (match1 && match2) {
      if ((q1 && (pm1 || ch1 > 0)) || (q2 && (pm2 || ch2 > 0))) {
        let hits = (pm1 ? 1 : 0) + ch1 + (pm2 ? 1 : 0) + ch2;
        results.push({ fp, hits, ch1, ch2, pm1, pm2, content });
      }
    }
  });
  results.sort((a, b) => b.hits - a.hits || a.fp.localeCompare(b.fp));
  let html = `<div style="border:1px solid #333;border-radius:8px;background:#171717;padding:10px 12px;margin-bottom:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
      <div style="font-weight:bold;color:#ddd;">Context files</div>
      <div style="font-size:11px;color:#888;">${results.length} matched</div>
    </div>
    <div style="font-size:11px;color:#888;margin-bottom:8px;">Showing matches for <span style="color:var(--accent);font-weight:bold;">${esc(term1)}</span> ${term2 ? 'and <span style="color:var(--accent);font-weight:bold;">' + esc(term2) + '</span>' : ''}</div>`;
  html += results.length ? results.map(r => {
    let name = r.fp.split('/').pop();
    let dir = r.fp.includes('/') ? r.fp.substring(0, r.fp.lastIndexOf('/')) : '';
    let snippet = (r.ch1 && mode !== 'files' && q1) ? buildExcerpt(r.content, q1, 1) : ((r.ch2 && mode !== 'files' && q2) ? buildExcerpt(r.content, q2, 1) : '');
    return `<div class="assoc-item" style="align-items:flex-start;flex-direction:column;" onclick="openFileInViewer('${r.fp.replace(/'/g, "\\\\'")}')">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span style="color:#ddd;">${esc(name)}</span>
        ${dir ? `<span style="font-size:11px;color:#555;">${esc(dir)}</span>` : ''}
        <span style="font-size:11px;color:#888;">
          ${q1 ? (r.pm1 ? 'Name | ' : '') + r.ch1 + ' hits (1)' : ''}
          ${q1 && q2 ? ' • ' : ''}
          ${q2 ? (r.pm2 ? 'Name | ' : '') + r.ch2 + ' hits (2)' : ''}
        </span>
      </div>
      ${snippet ? `<div style="margin-top:4px;width:100%;">${snippet}</div>` : ''}
    </div>`;
  }).join('') : '<div style="padding:6px;color:#666;">No files matched.</div>';
  html += `</div>`;
  return html;
}

function renderSidebarSchemaResults(term1, term2) {
  let q1 = (term1 || '').trim().toLowerCase();
  let q2 = (term2 || '').trim().toLowerCase();
  if (!q1 && !q2) return '';
  let metaMap = ensureSidebarSchemaIndex();
  let names = Object.keys(metaMap).filter(name => {
    let meta = metaMap[name] || {};
    let m1 = !q1 || schemaMatchesTerms(meta, name, q1, q1);
    let m2 = !q2 || schemaMatchesTerms(meta, name, q2, q2);
    return m1 && m2;
  }).sort(schemaSortNodes);
  if (!names.length) {
    return `<div style="border:1px solid #333;border-radius:8px;background:#171717;padding:10px 12px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
        <div style="font-weight:bold;color:#ddd;">Schema objects</div>
        <div style="font-size:11px;color:#888;">0 matched</div>
      </div>
      <div style="font-size:11px;color:#666;">No schema objects matched <span style="color:var(--accent);font-weight:bold;">${esc(term1)}</span> ${term2 ? 'and <span style="color:var(--accent);font-weight:bold;">' + esc(term2) + '</span>' : ''}.</div>
    </div>`;
  }
  return `<div style="border:1px solid #333;border-radius:8px;background:#171717;padding:10px 12px;margin-bottom:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
      <div style="font-weight:bold;color:#ddd;">Schema objects</div>
      <div style="font-size:11px;color:#888;">${names.length} matched</div>
    </div>
    <div style="font-size:11px;color:#888;margin-bottom:8px;">Searching tables, views, stored procedures, and fields for <span style="color:var(--accent);font-weight:bold;">${esc(term1)}</span> ${term2 ? 'and <span style="color:var(--accent);font-weight:bold;">' + esc(term2) + '</span>' : ''}</div>
    ${renderSchemaGroupedTree(names, q1, q2)}
  </div>`;
}

function renderSidebarSearchResults(term1, term2, mode) {
  let sections = [];
  if (mode === 'files' || mode === 'context' || mode === 'all') {
    sections.push(renderSidebarFileResults(term1, term2, mode));
  }
  if (mode === 'schema' || mode === 'all') {
    sections.push(renderSidebarSchemaResults(term1, term2));
  }
  return sections.join('');
}

// ==========================================
// FILE SEARCH
// ==========================================
// ==========================================
// FILE SEARCH
// ==========================================
function filterTree(term1, term2) {
  let treeRoot = document.getElementById('tree');
  let q1 = String(term1 || '').trim();
  let q2 = String(term2 || '').trim();
  let mode = getSidebarSearchMode();
  if (!q1 && !q2) {
    treeRoot.innerHTML = '';
    renderTree(buildTree(), treeRoot);
    return;
  }

  let resultHtml = `<div style="font-size:11px;color:#888;padding:3px 6px 6px;border-bottom:1px solid #333;margin-bottom:6px;">
    <span style="color:#ddd;">Search</span> <span style="color:var(--accent);font-weight:bold;">${esc(q1)}</span>
    ${q2 ? ' <span style="color:#ddd;">&</span> <span style="color:var(--accent);font-weight:bold;">' + esc(q2) + '</span>' : ''}
    <span style="margin-left:8px;color:#666;">(${esc(mode)})</span>
  </div>`;
  let rendered = renderSidebarSearchResults(q1, q2, mode);
  treeRoot.innerHTML = resultHtml + (rendered || '<div style="padding:6px;color:#666;">No results.</div>');
}

// ==========================================
// PROOF ENGINE (Context Extractor + Provenance)
// ==========================================
function isHtmlFile(filePath) {
  return /\\.(html?|xhtml)$/i.test(filePath || '');
}

function renderProvenanceSectionForViewer(filePath) {
  if (isHtmlFile(filePath)) return '';
  let doc = DATA.documents[filePath];
  if (!doc) return '';
  let content = doc.content || '';
  let provHtml = buildProvenanceSection(filePath, content, filePath.split('/').pop());
  return provHtml ? `<div style="margin-top:10px;border-top:1px solid #333;padding-top:10px;">${provHtml}</div>` : '';
}


function renderNotesSection(filePath) {
  let noteText = localStorage.getItem('sdd_note_' + filePath) || '';
  return `
    <div style="margin-top:25px;border-top:1px solid #444;padding-top:15px;margin-bottom:20px;">
      <details open style="background:#222;border:1px solid #333;border-radius:6px;padding:10px;">
        <summary style="font-weight:bold;color:var(--accent);cursor:pointer;user-select:none;">
          📝 Developer Notes / Annotations
        </summary>
        <div style="margin-top:10px;">
          <textarea id="nodeNoteTextArea" placeholder="Write custom notes or annotations for this node (saved automatically)..." 
            style="width:96%;height:80px;background:#111;color:#fff;border:1px solid #444;border-radius:4px;padding:8px;font-family:inherit;font-size:13px;resize:vertical;"
            oninput="window.saveNodeNote('${filePath.replace(/'/g, "\\'")}', this.value)"
          >${esc(noteText)}</textarea>
          <div style="font-size:11px;color:#666;margin-top:4px;text-align:right;">Notes are saved in local browser storage.</div>
        </div>
      </details>
    </div>
  `;
}

window.saveNodeNote = (filePath, value) => {
  if (!value || value.trim() === '') {
    localStorage.removeItem('sdd_note_' + filePath);
  } else {
    localStorage.setItem('sdd_note_' + filePath, value);
  }
  if (window.updateNoteBadges) window.updateNoteBadges();
};

window.updateNoteBadges = () => {
  document.querySelectorAll('.tree-file').forEach(el => {
    let fpMatch = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || '';
    if (fpMatch) {
      let hasNote = !!localStorage.getItem('sdd_note_' + fpMatch);
      let badge = el.querySelector('.note-badge');
      if (hasNote) {
        if (!badge) {
          let b = document.createElement('span');
          b.className = 'note-badge';
          b.style.color = '#ffb74d';
          b.style.marginLeft = '5px';
          b.title = 'Has developer annotations';
          b.innerHTML = '📝';
          el.appendChild(b);
        }
      } else {
        if (badge) badge.remove();
      }
    }
  });

  document.querySelectorAll('.toc-item').forEach(el => {
    let fpMatch = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || '';
    if (fpMatch) {
      let hasNote = !!localStorage.getItem('sdd_note_' + fpMatch);
      let badge = el.querySelector('.note-badge');
      if (hasNote) {
        if (!badge) {
          let b = document.createElement('span');
          b.className = 'note-badge';
          b.style.color = '#ffb74d';
          b.style.marginLeft = '5px';
          b.title = 'Has developer annotations';
          b.innerHTML = '📝';
          el.appendChild(b);
        }
      } else {
        if (badge) badge.remove();
      }
    }
  });
};

// ==========================================
// BREADCRUMBS & BOOKMARKS & SEARCH RESULTS
// ==========================================
window.expandFolderInTree = (folderPath) => {
  let segments = folderPath.split('/').filter(Boolean);
  let currentPrefix = '';
  segments.forEach(seg => {
    currentPrefix += seg + '/';
    let headers = document.querySelectorAll('.tree-folder');
    for (let h of headers) {
      if (h.dataset.path === currentPrefix) {
        let childContainer = h.nextElementSibling;
        if (childContainer && childContainer.style.display === 'none') {
          h.click();
        }
        h.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });
};

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem('sdd_bookmarks') || '[]');
  } catch(e) {
    return [];
  }
}

window.toggleBookmark = (filePath) => {
  if (!filePath) return;
  let bookmarks = getBookmarks();
  if (bookmarks.includes(filePath)) {
    bookmarks = bookmarks.filter(p => p !== filePath);
  } else {
    bookmarks.push(filePath);
  }
  localStorage.setItem('sdd_bookmarks', JSON.stringify(bookmarks));
  if (window.renderBookmarkBar) window.renderBookmarkBar();
  updateBookmarkButtonState(filePath);
};

function updateBookmarkButtonState(filePath) {
  let isBookmarked = getBookmarks().includes(filePath);
  let pins = document.querySelectorAll('.bookmark-pin-btn');
  pins.forEach(pin => {
    if (pin.dataset.filepath === filePath) {
      pin.innerHTML = isBookmarked ? '★' : '☆';
      pin.style.color = isBookmarked ? 'var(--accent)' : '#555';
      pin.title = isBookmarked ? 'Unpin bookmark' : 'Pin bookmark';
    }
  });
}

function renderBookmarkBar() {
  let bookmarks = getBookmarks();
  if (bookmarks.length === 0) {
    return `<div id="bookmark-bar" style="display:flex; align-items:center; gap:8px; padding:4px 8px; background:#1a1a1a; border:1px dashed #2d2d2d; border-radius:4px; margin-bottom:8px; font-size:11px; color:#555;">
      ☆ No bookmarks pinned. Click the star next to any filename to pin it.
    </div>`;
  }
  let badges = bookmarks.map(fp => {
    let fn = fp.split('/').pop();
    return `
      <div class="bookmark-badge" onclick="openFileInViewer('${fp.replace(/'/g, "\\'")}')" title="${esc(fp)}">
        <span>📄 ${esc(fn)}</span>
        <span class="bookmark-unpin" onclick="event.stopPropagation(); window.toggleBookmark('${fp.replace(/'/g, "\\'")}')" title="Unpin bookmark">✕</span>
      </div>
    `;
  }).join('');
  return `<div id="bookmark-bar" style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:4px 0; margin-bottom:8px;">${badges}</div>`;
}

window.renderBookmarkBar = () => {
  let els = document.querySelectorAll('.bookmark-bar-container');
  els.forEach(el => {
    el.innerHTML = renderBookmarkBar();
  });
};

function renderBreadcrumbs(filePath) {
  let parts = filePath.split('/');
  let currentPath = '';
  let html = `<div class="breadcrumbs" style="font-size:11px; color:#666; margin-bottom:8px; display:flex; align-items:center; gap:4px; flex-wrap:wrap; user-select:none; font-family:var(--font-family);">`;
  parts.forEach((part, idx) => {
    if (idx < parts.length - 1) {
      currentPath += part + '/';
      let escapedPath = currentPath.replace(/'/g, "\\'");
      html += `<span class="breadcrumb-item" onclick="window.expandFolderInTree('${escapedPath}')" title="Show in sidebar">${esc(part)}</span>`;
      html += `<span style="color:#444;">/</span>`;
    } else {
      html += `<span style="color:#aaa; font-weight:normal;">${esc(part)}</span>`;
    }
  });
  html += `</div>`;
  return html;
}

window.renderFullSearchResults = function(container) {
  let q1 = String(window._sidebarSearchTerm1 || '').trim().toLowerCase();
  let q2 = String(window._sidebarSearchTerm2 || '').trim().toLowerCase();
  let mode = getSidebarSearchMode();
  
  if (!q1 && !q2) {
    container.innerHTML = `
      <div style="padding:40px; text-align:center; color:#888;">
        <h2>🔍 Full-Text Search</h2>
        <p>Type a search query in the sidebar to search across all documents.</p>
      </div>
    `;
    return;
  }
  
  let results = [];
  
  Object.keys(DATA.documents).forEach(fp => {
    let doc = DATA.documents[fp] || {};
    let content = String(doc.content || '');
    let name = fp.split('/').pop().toLowerCase();
    let path = fp.toLowerCase();
    
    let pm1 = q1 ? (path.includes(q1) || name.includes(q1)) : true;
    let pm2 = q2 ? (path.includes(q2) || name.includes(q2)) : true;
    
    let ch1 = (q1 && mode !== 'files') ? countTermHits(content, q1) : 0;
    let ch2 = (q2 && mode !== 'files') ? countTermHits(content, q2) : 0;
    
    let match1 = !q1 || pm1 || ch1 > 0;
    let match2 = !q2 || pm2 || ch2 > 0;
    
    if (match1 && match2) {
      if ((q1 && (pm1 || ch1 > 0)) || (q2 && (pm2 || ch2 > 0))) {
        let score = 0;
        if (q1) {
          if (name.includes(q1)) score += 100;
          else if (path.includes(q1)) score += 50;
          score += ch1;
        }
        if (q2) {
          if (name.includes(q2)) score += 100;
          else if (path.includes(q2)) score += 50;
          score += ch2;
        }
        
        results.push({ fp, score, ch1, ch2, pm1, pm2, content });
      }
    }
  });
  
  results.sort((a, b) => b.score - a.score || a.fp.localeCompare(b.fp));
  
  let headerHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:10px; margin-bottom:20px;">
      <div>
        <h2 style="margin:0; color:#fff; display:flex; align-items:center; gap:8px;">🔍 Search Results</h2>
        <div style="font-size:12px; color:#888; margin-top:4px;">
          Matched <span style="color:var(--accent); font-weight:bold;">${results.length}</span> file${results.length === 1 ? '' : 's'} 
          for <span style="color:#ddd; font-weight:bold;">"${esc(window._sidebarSearchTerm1)}"</span>
          ${window._sidebarSearchTerm2 ? ` and <span style="color:#ddd; font-weight:bold;">"${esc(window._sidebarSearchTerm2)}"</span>` : ''} 
          (Mode: ${mode})
        </div>
      </div>
      <button class="assoc-back-btn" onclick="nav('explorer')" style="padding:6px 12px; font-size:12px; background:#222; border:1px solid #444; color:#aaa;">✕ Close Search</button>
    </div>
  `;
  
  let cardsHtml = results.map(r => {
    let fn = r.fp.split('/').pop();
    let dir = r.fp.includes('/') ? r.fp.substring(0, r.fp.lastIndexOf('/')) : '';
    
    let snippets = [];
    if (r.content && mode !== 'files') {
      let lines = r.content.split(/\\r?\\n/);
      let matchCount = 0;
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let lineLower = line.toLowerCase();
        let isMatch = false;
        
        if (q1 && q2) {
          isMatch = lineLower.includes(q1) && lineLower.includes(q2);
        } else if (q1) {
          isMatch = lineLower.includes(q1);
        } else if (q2) {
          isMatch = lineLower.includes(q2);
        }
        
        if (isMatch) {
          matchCount++;
          let highlighted = esc(line);
          if (q1) {
            let regex = new RegExp(escapeRegExp(q1), 'gi');
            highlighted = highlighted.replace(regex, '<mark style="background:#ff9800; color:#000; border-radius:2px; padding:0 2px;">$&</mark>');
          }
          if (q2) {
            let regex = new RegExp(escapeRegExp(q2), 'gi');
            highlighted = highlighted.replace(regex, '<mark style="background:#ff5722; color:#000; border-radius:2px; padding:0 2px;">$&</mark>');
          }
          
          snippets.push(`
            <div style="display:flex; gap:10px; font-family:Consolas, monospace; font-size:11px; margin-top:4px; background:#1b1b1b; padding:4px 8px; border-radius:3px;">
              <span style="color:#555; width:40px; text-align:right; flex-shrink:0;">L${i + 1}</span>
              <span style="color:#ddd; overflow-x:auto; white-space:pre-wrap; word-break:break-all;">${highlighted}</span>
            </div>
          `);
          if (matchCount >= 3) break;
        }
      }
    }
    
    return `
      <div style="background:#171717; border:1px solid #333; border-radius:6px; padding:12px; margin-bottom:12px; transition:border-color 0.2s;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
          <div>
            <span style="font-weight:bold; font-size:14px; color:#38bdf8; cursor:pointer;" onclick="openFileInViewer('${r.fp.replace(/'/g, "\\'")}')">${esc(fn)}</span>
            ${dir ? `<span style="font-size:11px; color:#555; margin-left:8px;">${esc(dir)}</span>` : ''}
          </div>
          <span style="font-size:11px; color:#888; background:#222; border:1px solid #333; padding:2px 6px; border-radius:10px;">
            Score: ${r.score}
          </span>
        </div>
        ${snippets.length > 0 ? `<div style="margin-top:8px;">${snippets.join('')}</div>` : ''}
      </div>
    `;
  }).join('');
  
  container.innerHTML = headerHtml + (cardsHtml || `<div style="text-align:center; padding:40px; color:#666;">No ranked matches found.</div>`);
};

window.addToRecentHistory = (filePath) => {
  if (!filePath || filePath.endsWith('.provenance.json') || filePath.endsWith('.provenance.md') || filePath.endsWith('schema-origin-map.json')) return;
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem('sdd_recent') || '[]');
  } catch(e) {}
  if (!Array.isArray(recent)) recent = [];
  recent = recent.filter(x => x !== filePath);
  recent.unshift(filePath);
  recent = recent.slice(0, 10);
  localStorage.setItem('sdd_recent', JSON.stringify(recent));
  window.renderRecentHistory();
};

window.renderRecentHistory = () => {
  let container = document.getElementById('recentHistoryPanel');
  if (!container) return;
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem('sdd_recent') || '[]');
  } catch(e) {}
  if (!Array.isArray(recent) || recent.length === 0) {
    container.innerHTML = '';
    return;
  }
  let html = `<details open style="margin-bottom:10px;border:1px solid #333;border-radius:4px;padding:6px;background:#1e1e1e;">
    <summary style="cursor:pointer;font-size:12px;font-weight:bold;color:#888;user-select:none;">🕒 Recently Viewed</summary>
    <div style="display:block;margin-top:6px;max-height:120px;overflow-y:auto;">`;
  recent.forEach(filePath => {
    let fn = filePath.split('/').pop();
    let hasNoteBadge = '';
    if (localStorage.getItem('sdd_note_' + filePath)) {
      hasNoteBadge = ' <span style="flex-shrink:0;">📝</span>';
    }
    html += `<div class="recent-item" onclick="openFileInViewer('${filePath.replace(/'/g, "\\'")}')" title="${esc(filePath)}">` +
      `<span class="recent-item-text">📄 ${esc(fn)}</span>${hasNoteBadge}` +
    `</div>`;
  });
  html += `</div></details>`;
  container.innerHTML = html;
};

let currentLeftFile = null;
let currentRightFile = null;
window._splitMode = false;
window._activeSplitPane = 'left';

window.setActiveSplit = (pane) => {
  window._activeSplitPane = pane;
  let leftPane = document.getElementById('split-left');
  let rightPane = document.getElementById('split-right');
  if (leftPane) {
    leftPane.classList.toggle('active-pane', pane === 'left');
  }
  if (rightPane) {
    rightPane.classList.toggle('active-pane', pane === 'right');
  }
};

window.toggleSplitMode = (filePath) => {
  window._splitMode = !window._splitMode;
  if (window._splitMode) {
    currentLeftFile = filePath;
    currentRightFile = null;
    window._activeSplitPane = 'right';
    const L = document.getElementById('left');
    L.style.padding = '0';
    L.innerHTML = `
      <div class="split-pane-container" style="display:flex; height:100%; width:100%; position:relative; overflow:hidden;">
        <div id="split-left" class="split-pane" style="width:50%; overflow-y:auto; padding:15px;" onclick="window.setActiveSplit('left')"></div>
        <div id="split-divider" class="split-divider"></div>
        <div id="split-right" class="split-pane" style="width:calc(50% - 6px); overflow-y:auto; padding:15px;" onclick="window.setActiveSplit('right')"></div>
      </div>
    `;
    
    // Wire up draggable resizer
    let divider = document.getElementById('split-divider');
    let leftPane = document.getElementById('split-left');
    let rightPane = document.getElementById('split-right');
    let isDragging = false;
    
    divider.onmousedown = (e) => {
      e.preventDefault();
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      divider.style.background = 'var(--accent)';
      
      const onMouseMove = (eMove) => {
        if (!isDragging) return;
        let containerRect = L.getBoundingClientRect();
        let offsetX = eMove.clientX - containerRect.left;
        let pct = (offsetX / containerRect.width) * 100;
        if (pct < 15) pct = 15;
        if (pct > 85) pct = 85;
        leftPane.style.width = pct + '%';
        rightPane.style.width = 'calc(' + (100 - pct) + '% - 6px)';
      };
      
      const onMouseUp = () => {
        isDragging = false;
        document.body.style.cursor = '';
        divider.style.background = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };
    
    renderFileIntoPane('split-left', currentLeftFile);
    document.getElementById('split-right').innerHTML = `
      <div style="text-align:center; margin-top:50px; color:#666;">
        <h4>Split Pane Active</h4>
        <p>Select any file from the sidebar to open here.</p>
        <button class="assoc-back-btn" onclick="window.toggleSplitMode()" style="padding:6px 12px;background:#333;border:1px solid #444;color:#aaa;">Close Split</button>
      </div>
    `;
    window.setActiveSplit('right');
  } else {
    window._splitMode = false;
    const L = document.getElementById('left');
    L.style.padding = '15px';
    if (currentLeftFile) {
      openFileInViewer(currentLeftFile);
    } else {
      L.innerHTML = '<h3>Explorer</h3>Select a file from the sidebar.';
    }
  }
};

function renderFileIntoPane(paneId, filePath) {
  let doc = DATA.documents[filePath];
  if (!doc) return;
  
  let searchVal = window._sidebarSearchTerm1 || '';
  let searchVal2 = window._sidebarSearchTerm2 || '';
  
  let headerHtml = renderViewerSearchControlsForPane(paneId, filePath, doc.content || '');
  let rendered = renderDoc(filePath, doc);
  
  let splitBtnText = window._splitMode ? '✕ Close Split' : '⧉ Split View';
  let splitBtnAction = window._splitMode ? `window.toggleSplitMode()` : `window.toggleSplitMode('${filePath.replace(/'/g, "\\'")}')`;
  
  let isBookmarked = getBookmarks().includes(filePath);
  let pinBtnHtml = `<button class="bookmark-pin-btn" data-filepath="${filePath.replace(/'/g, "\\'")}" onclick="window.toggleBookmark('${filePath.replace(/'/g, "\\'")}')" style="background:transparent; border:none; color:${isBookmarked ? 'var(--accent)' : '#555'}; font-size:16px; cursor:pointer; padding:0 6px;" title="${isBookmarked ? 'Unpin bookmark' : 'Pin bookmark'}">${isBookmarked ? '★' : '☆'}</button>`;
  
  let titleBar = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:4px; border-bottom:1px solid #333; margin-bottom:6px; background:var(--bg);">
      <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;">
        ${pinBtnHtml}
        <span style="font-weight:bold; font-size:15px; color:#ddd;">${esc(filePath.split('/').pop())}</span>
      </div>
      <button onclick="${splitBtnAction}" class="assoc-back-btn" style="flex-shrink:0; font-size:11px; padding:3px 8px; margin-left:10px; background:#222; border:1px solid #444; color:#aaa; cursor:pointer;" title="Toggle split pane view">${splitBtnText}</button>
    </div>
  `;
  
  let fileReview = window.REVIEWS[filePath] || { status: 'Unreviewed', confidence: 3, comments: [] };
  let reviewHtml = renderReviewPanel(paneId, filePath, fileReview);

  document.getElementById(paneId).innerHTML = `
    <div style="position:sticky; top:0; z-index:70; background:var(--bg); padding-bottom:10px;">
      ${titleBar}
      ${renderBreadcrumbs(filePath)}
      <div class="bookmark-bar-container">${renderBookmarkBar()}</div>
      ${headerHtml}
    </div>
    <div id="fileReviewArea_${paneId}">${reviewHtml}</div>
    <div id="fileEditArea_${paneId}" style="display:none;margin-top:10px;"></div>
    <div class="pane-body-container" id="body_${paneId}">${rendered}${renderProvenanceSectionForViewer(filePath)}${renderNotesSection(filePath)}</div>
  `;
  
  if (window.updateNoteBadges) window.updateNoteBadges();
  
  requestAnimationFrame(() => {
    let body = document.getElementById(`body_${paneId}`);
    if (!body) return;
    
    // Highlight reviewer comments first
    highlightCommentsInDOM(body, paneId, fileReview.comments);

    applySearchHighlightsToContainer(body, [
      { kind: 'original', term: searchVal },
      { kind: 'frame', term: searchVal2 }
    ]);
  });
}

function renderViewerSearchControlsForPane(paneId, filePath, content) {
  let original = window._viewerSearch || '';
  let frame = window._viewerFrameSearch || '';
  let fileCount = original ? getTermMatches(content, original).length : 0;
  let frameCount = frame ? getTermMatches(content, frame).length : 0;
  if (!original && !frame) return '';
  return `<div style="font-size:11px;color:#888;background:#171717;padding:5px 10px;border-radius:4px;border:1px solid #333;margin-bottom:10px;">
    🔍 Hits: ${fileCount} original, ${frameCount} frame
  </div>`;
}

function renderTodoPanel(container) {
  let list = [];
  for (let filePath in DATA.documents) {
    let doc = DATA.documents[filePath];
    if (doc.todos && doc.todos.length > 0) {
      list.push({ filePath: filePath, todos: doc.todos });
    }
  }
  
  if (list.length === 0) {
    container.innerHTML = `<h3>📋 Action Items (TODOs)</h3><p style="color:#888;">No TODOs/FIXMEs found in the scanned files.</p>`;
    return;
  }
  
  let html = `<h3>📋 Action Items (TODOs)</h3><div style="max-width:900px;margin-top:15px;overflow-y:auto;max-height:calc(100vh - 120px);">`;
  list.forEach(item => {
    let fn = item.filePath.split('/').pop();
    html += `<div style="margin-bottom:15px;background:#252526;border:1px solid #444;border-radius:4px;overflow:hidden;">
      <div style="background:#2d2d2d;padding:6px 12px;border-bottom:1px solid #444;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:bold;color:#64b5f6;cursor:pointer;" onclick="openFileInViewer('${item.filePath.replace(/'/g, "\\'")}')">${esc(fn)}</span>
        <span style="font-size:10px;color:#666;margin-left:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(item.filePath)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">`;
      
    item.todos.forEach(todo => {
      let badgeClass = 'todo-tag-' + todo.tag.toLowerCase();
      html += `<tr style="border-bottom:1px solid #333;">
        <td style="padding:6px 12px;width:60px;font-weight:bold;" class="${badgeClass}">${esc(todo.tag)}</td>
        <td style="padding:6px 12px;width:80px;color:#888;">Line ${todo.line}</td>
        <td style="padding:6px 12px;color:#ddd;word-break:break-all;">${esc(todo.text)}</td>
      </tr>`;
    });
    
    html += `</table></div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

// ==========================================
// EXPORT PANEL (R1 Print · R2 Matrix · R3 Rules)
// ==========================================
function renderExportPanel(container) {
  var t1=window._sidebarSearchTerm1||'',t2=window._sidebarSearchTerm2||'',cur=window._viewerOpenFilePath||'';
  var nd=Object.keys(DATA.documents).filter(function(k){return !DATA.documents[k].is_code;}).length;
  var html='<div class="export-panel">';
  html+='<h2 style="margin:0 0 18px 0;color:#ddd;">&#x1F4E5; Reporting &amp; Export</h2>';
  // R1
  html+='<div class="export-card"><h3>&#x1F5A8; R1 &middot; Print to PDF</h3>';
  html+='<p class="card-desc">Paginated layout via browser native PDF engine &mdash; no server needed.</p>';
  html+='<div class="export-radio-group">';
  html+='<label><input type="radio" name="printTarget" value="all" checked> All documents ('+nd+' files)</label>';
  html+='<label><input type="radio" name="printTarget" value="filtered"'+(t1||t2?'':' disabled style="opacity:0.45"')+'> Filtered: '+(t1||t2?'&ldquo;'+esc(t1)+'&rdquo;'+(t2?' &amp; &ldquo;'+esc(t2)+'&rdquo;':''):'(no active filter)')+'</label>';
  html+='<label><input type="radio" name="printTarget" value="current"'+(cur?'':' disabled style="opacity:0.45"')+'> Current: '+(cur?'<code style="color:#38bdf8;font-size:11px;">'+esc(cur.split('/').pop())+'</code>':'(none open)')+'</label>';
  html+='</div>';
  html+='<button class="export-btn" onclick="window.runPrintToPDF()">&#x1F5A8; Generate &amp; Print PDF</button></div>';
  // R2
  html+='<div class="export-card"><h3>🔗 R2 &middot; Dependency Matrix</h3>';
  html+='<p class="card-desc">N&times;N coupling heatmap from embedded lineage data. Click a cell for details.</p>';
  html+='<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;">';
  html+='<input id="matrixFilter" type="text" placeholder="Filter by name\u2026" oninput="window.buildDepMatrix()" style="background:#2d2d2d;border:1px solid #444;color:#ddd;padding:5px 9px;border-radius:4px;font-size:12px;flex:1;min-width:120px;">';
  html+='<label style="font-size:12px;color:#aaa;">Show: <select id="matrixLimit" onchange="window.buildDepMatrix()" style="background:#2d2d2d;border:1px solid #444;color:#ddd;padding:4px;border-radius:3px;"><option>20</option><option selected>40</option><option>80</option></select></label>';
  html+='<label style="font-size:12px;color:#aaa;">Min coupling: <input id="matrixMin" type="number" value="1" min="0" oninput="window.buildDepMatrix()" style="width:48px;background:#2d2d2d;border:1px solid #444;color:#ddd;padding:4px;border-radius:3px;font-size:12px;"></label>';
  html+='<label style="font-size:12px;color:#aaa;"><input type="checkbox" id="matrixSort" onchange="window.buildDepMatrix()" checked> Sort by coupling</label>';
  html+='</div><div id="matrixWrap" class="matrix-wrap"></div><div id="matrixDetail" class="matrix-detail"></div></div>';
  // R3
  html+='<div class="export-card"><h3>\u2699\uFE0F R3 &middot; Validation Rule Editor</h3>';
  html+='<p class="card-desc">Edit rules, copy the JSON, save as <code style="color:#38bdf8;">rules.json</code> in the builder directory and rebuild.</p>';
  html+='<div style="display:grid;grid-template-columns:1fr 90px 110px 90px 32px;gap:5px;padding:3px 10px;font-size:10px;color:#555;margin-bottom:3px;"><span>ID</span><span>Type</span><span>Max Size</span><span>Severity</span><span></span></div>';
  html+='<div id="ruleRows"></div>';
  html+='<div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap;">';
  html+='<button class="export-btn" style="background:#1a3f1a;padding:7px 14px;" onclick="window.addRule()">+ Add Rule</button>';
  html+='<button class="export-btn" onclick="window.copyRulesJson()">📋 Copy rules.json</button>';
  html+='<span id="copyOk" class="copy-ok">✅ Copied!</span></div>';
  html+='<div id="rulesOut" class="rules-json"></div>';
  html+='<div style="margin-top:12px;font-size:11px;color:#555;margin-bottom:5px;">Violations from last build:</div>';
  html+='<div id="violReport"></div></div></div>';
  container.innerHTML = html;
  window.buildDepMatrix();
  window.initRuleEditor();
}

window.runPrintToPDF = function() {
  var tgt=document.querySelector('input[name="printTarget"]:checked')?.value||'all';
  var t1=(window._sidebarSearchTerm1||'').toLowerCase(),t2=(window._sidebarSearchTerm2||'').toLowerCase();
  var cur=window._viewerOpenFilePath||'';
  var all=Object.keys(DATA.documents),fps=[];
  if(tgt==='all') fps=all.filter(function(k){return !DATA.documents[k].is_code;}).sort();
  else if(tgt==='filtered') fps=all.filter(function(k){return !DATA.documents[k].is_code&&(!t1||k.toLowerCase().includes(t1))&&(!t2||k.toLowerCase().includes(t2));}).sort();
  else if(tgt==='current'&&cur) fps=[cur];
  if(!fps.length){alert('No documents to print.');return;}
  var el=document.getElementById('print-container');if(el)el.remove();
  var pc=document.createElement('div');pc.id='print-container';
  var h='<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;">';
  h+='<div style="margin-bottom:18px;padding-bottom:8px;border-bottom:3px solid #000;">';
  h+='<h1 style="margin:0;font-size:20px;">SDD Export Report</h1>';
  h+='<div style="font-size:11px;color:#555;">'+fps.length+' documents &middot; '+new Date().toLocaleString()+'</div></div>';
  fps.forEach(function(fp){
    var doc=DATA.documents[fp];if(!doc||doc.base64)return;
    var nm=fp.split('/').pop(),dir=fp.includes('/')?fp.substring(0,fp.lastIndexOf('/')):'';
    h+='<div class="print-page"><div class="print-hdr"><h2>'+esc(nm)+'</h2>'+(dir?'<div>'+esc(dir)+'</div>':'')+'</div>'+renderDoc(fp,doc)+'</div>';
  });
  h+='</div>';pc.innerHTML=h;document.body.appendChild(pc);
  window.onafterprint=function(){var e2=document.getElementById('print-container');if(e2)e2.remove();};
  window.print();
};

window.buildDepMatrix = function() {
  var q=(document.getElementById('matrixFilter')?.value||'').toLowerCase().trim();
  var lim=parseInt(document.getElementById('matrixLimit')?.value||'40',10);
  var minC=parseInt(document.getElementById('matrixMin')?.value||'1',10)||0;
  var doSort=document.getElementById('matrixSort')?.checked!==false;
  var wrap=document.getElementById('matrixWrap');if(!wrap)return;
  var cm={},all=Object.keys(DATA.documents);
  all.forEach(function(fp){
    var doc=DATA.documents[fp];if(!doc||doc.is_code)return;
    var deps=(doc.lineage&&doc.lineage.dependencies)||[];
    deps.forEach(function(dep){
      var tgt=all.find(function(f){return f===dep||f.endsWith('/'+dep);});
      if(tgt&&tgt!==fp){
        if(!cm[fp])cm[fp]={};if(!cm[tgt])cm[tgt]={};
        cm[fp][tgt]=(cm[fp][tgt]||0)+3;cm[tgt][fp]=(cm[tgt][fp]||0)+2;
      }
    });
  });
  var files=all.filter(function(k){return !DATA.documents[k].is_code&&(!q||k.toLowerCase().includes(q));});
  if(doSort) files.sort(function(a,b){var sa=Object.values(cm[a]||{}).reduce(function(s,v){return s+v;},0),sb=Object.values(cm[b]||{}).reduce(function(s,v){return s+v;},0);return sb-sa||a.localeCompare(b);});
  else files.sort();
  files=files.slice(0,lim);
  if(!files.length){wrap.innerHTML='<div style="padding:20px;color:#666;text-align:center;">No files match filter.</div>';return;}
  var maxC=1;
  files.forEach(function(a){files.forEach(function(b){if(a!==b)maxC=Math.max(maxC,(cm[a]&&cm[a][b])||0);});});
  function bg(s,mx){if(!s)return'transparent';var t=Math.min(s/mx,1);return'hsl('+(200+t*40)+','+(60+t*30)+'%,'+(15+t*22)+'%)';}
  var html='<table class="matrix-tbl"><thead><tr><th style="position:sticky;top:0;left:0;z-index:3;background:#111;min-width:100px;"></th>';
  files.forEach(function(fp){html+='<th title="'+esc(fp)+'" style="writing-mode:vertical-rl;transform:rotate(180deg);max-height:90px;overflow:hidden;">'+esc(fp.split('/').pop())+'</th>';});
  html+='</tr></thead><tbody>';
  files.forEach(function(a){
    var tot=files.reduce(function(s,b){return s+(a!==b?((cm[a]&&cm[a][b])||0):0);},0);
    html+='<tr><td class="rh" title="'+esc(a)+'">'+esc(a.split('/').pop())+' <span style="color:#444;font-size:9px;">('+tot+')</span></td>';
    files.forEach(function(b){
      if(a===b){html+='<td style="background:#141414;cursor:default;">·</td>';return;}
      var s=(cm[a]&&cm[a][b])||0;
      if(s<minC){html+='<td style="background:transparent;"></td>';return;}
      html+='<td style="background:'+bg(s,maxC)+';cursor:pointer;" title="Coupling: '+s+'" data-a="'+esc(a)+'" data-b="'+esc(b)+'" data-s="'+s+'" onclick="window.showMatDet(this)">'+s+'</td>';
    });
    html+='</tr>';
  });
  html+='</tbody></table>';
  wrap.innerHTML=html;
};

window.showMatDet = function(cell) {
  var a=cell.dataset.a,b=cell.dataset.b,strength=parseInt(cell.dataset.s||'0',10);
  var el=document.getElementById('matrixDetail');if(!el)return;
  var aDoc=DATA.documents[a]||{},bDoc=DATA.documents[b]||{};
  var aDeps=(aDoc.lineage&&aDoc.lineage.dependencies)||[],bDeps=(bDoc.lineage&&bDoc.lineage.dependencies)||[];
  var aHasB=aDeps.some(function(d){return b===d||b.endsWith('/'+d);});
  var bHasA=bDeps.some(function(d){return a===d||a.endsWith('/'+d);});
  var col=strength>6?'#ff7043':strength>3?'#ffb74d':'#7ec8e3';
  el.style.display='block';
  el.innerHTML='<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
    +'<span style="font-weight:bold;color:#38bdf8;">'+esc(a.split('/').pop())+'</span>'
    +'<span style="color:#555;">↔</span>'
    +'<span style="font-weight:bold;color:#38bdf8;">'+esc(b.split('/').pop())+'</span>'
    +'<span style="margin-left:auto;font-size:22px;font-weight:bold;color:'+col+';">'+strength+'</span></div>'
    +'<div style="font-size:11px;color:#888;margin-bottom:10px;">'
    +(aHasB?'<div>📎 '+esc(a.split('/').pop())+' → '+esc(b.split('/').pop())+' (direct dependency)</div>':'')
    +(bHasA?'<div>📎 '+esc(b.split('/').pop())+' → '+esc(a.split('/').pop())+' (reverse dependency)</div>':'')
    +(!aHasB&&!bHasA?'<div style="color:#555;">Indirect coupling via shared schema or keyword references.</div>':'')
    +'</div>'
    +'<div style="display:flex;gap:8px;">'
    +'<button class="export-btn-sm" data-fp="'+esc(a)+'" onclick="openFileInViewer(this.dataset.fp)">Open '+esc(a.split('/').pop())+'</button>'
    +'<button class="export-btn-sm" data-fp="'+esc(b)+'" onclick="openFileInViewer(this.dataset.fp)">Open '+esc(b.split('/').pop())+'</button>'
    +'</div>';
};

window.initRuleEditor = function() {
  var src=(typeof VALIDATION_RULES!=='undefined'&&VALIDATION_RULES&&VALIDATION_RULES.rules)?VALIDATION_RULES.rules:[];
  window._editRules=JSON.parse(JSON.stringify(src));
  window.renderRuleRows();
};

window.renderRuleRows = function() {
  var c=document.getElementById('ruleRows');if(!c)return;
  var rules=window._editRules||[];
  if(!rules.length){
    c.innerHTML='<div style="color:#555;font-size:12px;padding:5px 0;">No rules. Click &quot;Add Rule&quot; below.</div>';
  } else {
    c.innerHTML=rules.map(function(r,i){
      return '<div class="rule-row">'
        +'<input type="text" value="'+esc(r.id||'')+'" placeholder="Rule ID" onchange="window._editRules['+i+'].id=this.value;window.syncRulesJson()">'
        +'<select onchange="window._editRules['+i+'].type=this.value;window.syncRulesJson()"><option value="audit"'+(r.type==='audit'?' selected':'')+'>audit</option></select>'
        +'<input type="number" value="'+(r.max_size||'')+'" placeholder="max_size" onchange="window._editRules['+i+'].max_size=parseInt(this.value)||0;window.syncRulesJson()">'
        +'<select onchange="window._editRules['+i+'].severity=this.value;window.syncRulesJson()"><option value="warning"'+(r.severity==='warning'?' selected':'')+'>warning</option><option value="error"'+(r.severity==='error'?' selected':'')+'>error</option></select>'
        +'<button class="rule-del" onclick="window._editRules.splice('+i+',1);window.renderRuleRows()">×</button>'
        +'</div>';
    }).join('');
  }
  window.syncRulesJson();
  var vEl=document.getElementById('violReport');
  if(vEl){
    var rpt=(typeof VALIDATION_REPORT!=='undefined'&&VALIDATION_REPORT)?VALIDATION_REPORT:null;
    if(!rpt||!rpt.violations||!rpt.violations.length){
      vEl.innerHTML='<span style="color:#4caf50;font-size:12px;">✅ No violations in last build.</span>';
    } else {
      vEl.innerHTML=rpt.violations.map(function(v){
        return '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid #2a2a2a;display:flex;gap:6px;align-items:center;">'
          +'<span class="vbadge '+esc(v.severity)+'">'+esc(v.severity)+'</span>'
          +'<span style="color:#888;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(v.file)+'</span>'
          +'<span style="color:#666;font-size:11px;">'+esc(v.issue)+'</span></div>';
      }).join('');
    }
  }
};

window.addRule = function() {
  if(!window._editRules)window._editRules=[];
  window._editRules.push({id:'NEW_RULE',type:'audit',max_size:50000,severity:'warning'});
  window.renderRuleRows();
};

window.syncRulesJson = function() {
  var out=document.getElementById('rulesOut');if(!out)return;
  var payload={rules:(window._editRules||[]).map(function(r){
    var o={id:r.id||'',type:r.type||'audit',severity:r.severity||'warning'};
    if(r.max_size)o.max_size=r.max_size;return o;
  })};
  out.textContent=JSON.stringify(payload,null,2);
};

window.copyRulesJson = function() {
  var text=document.getElementById('rulesOut')?.textContent||'';
  function ok(){var m=document.getElementById('copyOk');if(m){m.classList.add('show');setTimeout(function(){m.classList.remove('show');},2500);}}
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(ok).catch(function(){
      try{var r=document.createRange();r.selectNodeContents(document.getElementById('rulesOut'));var s=window.getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}
    });
  } else {
    try{var r=document.createRange();r.selectNodeContents(document.getElementById('rulesOut'));var s=window.getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}
    ok();
  }
};


function openFileInViewer(filePath) {
  let doc = DATA.documents[filePath];
  if (!doc) return;
  if (window.addToRecentHistory) window.addToRecentHistory(filePath);
  
  if (window._splitMode && !document.getElementById('split-left')) {
    window._splitMode = false;
  }
  
  if (window._splitMode) {
    if (window._activeSplitPane === 'left') {
      currentLeftFile = filePath;
      renderFileIntoPane('split-left', filePath);
    } else {
      currentRightFile = filePath;
      renderFileIntoPane('split-right', filePath);
    }
    return;
  }
  
  if (currentView !== 'explorer') {
    nav('explorer');
  }
  window._viewerOpenFilePath = filePath;
  if (!window._viewerSearch && window._sidebarSearchTerm1) window._viewerSearch = window._sidebarSearchTerm1;
  if (!window._viewerFrameSearch && window._sidebarSearchTerm2) window._viewerFrameSearch = window._sidebarSearchTerm2;
  let content = doc.content || '';
  let header = renderViewerSearchControls(filePath, content);
  let rendered = renderDoc(filePath, doc);
  
  let splitBtnText = '⧉ Split View';
  let splitBtnAction = `window.toggleSplitMode('${filePath.replace(/'/g, "\\'")}')`;
  
  let isBookmarked = getBookmarks().includes(filePath);
  let pinBtnHtml = `<button class="bookmark-pin-btn" data-filepath="${filePath.replace(/'/g, "\\'")}" onclick="window.toggleBookmark('${filePath.replace(/'/g, "\\'")}')" style="background:transparent; border:none; color:${isBookmarked ? 'var(--accent)' : '#555'}; font-size:16px; cursor:pointer; padding:0 6px;" title="${isBookmarked ? 'Unpin bookmark' : 'Pin bookmark'}">${isBookmarked ? '★' : '☆'}</button>`;
  
  let fileReview = window.REVIEWS[filePath] || { status: 'Unreviewed', confidence: 3, comments: [] };
  let reviewPanel = renderReviewPanel('left', filePath, fileReview);

  document.getElementById('left').innerHTML =
    `<div style="position:sticky;top:0;z-index:70;background:var(--bg);padding-bottom:10px;">` +
      `<div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:4px;border-bottom:1px solid #333;margin-bottom:6px;background:var(--bg);">` +
        `<div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;">` +
          pinBtnHtml +
          `<span style="font-weight:bold;font-size:15px;color:#ddd;">${esc(filePath.split('/').pop())}</span>` +
        `</div>` +
        `<button onclick="${splitBtnAction}" class="assoc-back-btn" style="flex-shrink:0; font-size:11px; padding:3px 8px; margin-left:10px; background:#222; border:1px solid #444; color:#aaa; cursor:pointer;" title="Toggle split pane view">${splitBtnText}</button>` +
      `</div>` +
      renderBreadcrumbs(filePath) +
      `<div class="bookmark-bar-container">${renderBookmarkBar()}</div>` +
      header +
    `</div>` +
    `<div id="fileReviewArea_left">${reviewPanel}</div>` +
    `<div id="fileEditArea_left" style="display:none;margin-top:10px;"></div>` +
    `<div id="viewerDocBody">${rendered}${renderProvenanceSectionForViewer(filePath)}${renderNotesSection(filePath)}</div>`;
  if (window.updateNoteBadges) window.updateNoteBadges();
  requestAnimationFrame(() => {
    let body = document.getElementById('viewerDocBody');
    if (!body) return;
    
    // Highlight reviewer comments first
    highlightCommentsInDOM(body, 'left', fileReview.comments);

    applySearchHighlightsToContainer(body, [
      { kind: 'original', term: window._viewerSearch },
      { kind: 'frame', term: window._viewerFrameSearch }
    ]);
    let focusKind = window._lastViewerSearchKind || (window._viewerFrameSearch ? 'frame' : 'original');
    let focusIndex = focusKind === 'frame' ? window._viewerHitState.frame : window._viewerHitState.original;
    markActiveSearchHit(body, focusKind, focusIndex);
  });
}

function getHtmlPath(docPath) {
  let parts = docPath.split('/');
  if (parts[0] === '_reversa_sdd') parts.shift();
  return parts.join('/') + '.html';
}

function extractInlineProvenance(content) {
  let m = content.match(/<!-- TRACEABILITY_PROVENANCE_START -->([\\s\\S]*?)<!-- TRACEABILITY_PROVENANCE_END -->/);
  return m ? m[1].trim() : null;
}

function buildProvenanceSection(file, content, label) {
  if (isHtmlFile(file)) return '';
  let prov = extractInlineProvenance(content);
  let sjKey = file + '.provenance.json';
  let smKey = file + '.provenance.md';
  let out = '';
  if (prov)
    out += `<details style="margin-top:6px;"><summary style="color:#64b5f6;cursor:pointer;">\📋 ${esc(label)} \— Inline Provenance</summary><pre style="font-size:11px;color:#aaa;max-height:160px;overflow:auto;">${esc(prov)}</pre></details>`;
  if (DATA.documents[sjKey])
    out += `<details style="margin-top:4px;"><summary style="color:#64b5f6;cursor:pointer;">\📋 ${esc(label)} \— Sidecar JSON</summary><pre style="font-size:11px;color:#aaa;max-height:160px;overflow:auto;">${esc(DATA.documents[sjKey].content||'')}</pre></details>`;
  if (DATA.documents[smKey])
    out += `<details style="margin-top:4px;"><summary style="color:#64b5f6;cursor:pointer;">\📋 ${esc(label)} \— Sidecar MD</summary><pre style="font-size:11px;color:#aaa;max-height:160px;overflow:auto;">${esc(DATA.documents[smKey].content||'')}</pre></details>`;
  return out;
}

function showProof(sourceFile, targetFile) {
    let sourceContent = DATA.documents[sourceFile]?.content || "";
    let targetContent = DATA.documents[targetFile]?.content || "";
    let lines = sourceContent.split('\\n');
    let targetName = targetFile.split('/').pop().toLowerCase();

    let snippets = [];
    for(let i=0; i<lines.length; i++) {
        if(lines[i].toLowerCase().includes(targetName)) {
            let before = i > 0 ? esc(lines[i-1]) : '';
            let matchLine = esc(lines[i]);
            let after = i < lines.length - 1 ? esc(lines[i+1]) : '';
            let safeTarget = targetName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
            let regex = new RegExp(`(${safeTarget})`, 'gi');
            matchLine = matchLine.replace(regex, '<span class="highlight-code">$1</span>');
            snippets.push(`<div style="margin-bottom:10px;"><span style="color:#555">${i}:</span> ${before}<br><span style="color:#bbb">${i+1}:</span> ${matchLine}<br><span style="color:#555">${i+2}:</span> ${after}</div>`);
        }
    }

    let srcHtml = getHtmlPath(sourceFile);
    let tgtHtml = getHtmlPath(targetFile);
    let openLinks = `<div style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap;">
      <button onclick="openFileInViewer('${sourceFile.replace(/'/g,"\\\\'")}');" style="font-size:12px;padding:3px 10px;background:#333;border:1px solid #555;color:#aaa;border-radius:3px;cursor:pointer;">\📄 View: ${esc(sourceFile.split('/').pop())}</button>
      <a href="${esc(srcHtml)}" target="_blank" style="font-size:12px;padding:3px 10px;background:#333;border:1px solid #555;color:#aaa;border-radius:3px;text-decoration:none;">\🔗 Open Source HTML</a>
      <button onclick="openFileInViewer('${targetFile.replace(/'/g,"\\\\'")}');" style="font-size:12px;padding:3px 10px;background:#333;border:1px solid #555;color:#aaa;border-radius:3px;cursor:pointer;">\📄 View: ${esc(targetFile.split('/').pop())}</button>
      <a href="${esc(tgtHtml)}" target="_blank" style="font-size:12px;padding:3px 10px;background:#333;border:1px solid #555;color:#aaa;border-radius:3px;text-decoration:none;">\🔗 Open Target HTML</a>
    </div>`;

    let snippetHtml = snippets.length > 0
      ? `<b style="color:var(--accent);">Reference in ${esc(sourceFile.split('/').pop())}:</b><hr style="border:1px solid #333;"><pre style="max-height:220px;overflow:auto;">${snippets.join('<hr style="border:1px dashed #333;margin:8px 0;">')}</pre>`
      : `<span style="color:#888;">No explicit string match found. May be a structural or schema-derived dependency.</span>`;
    document.getElementById('proof-content').innerHTML = openLinks + snippetHtml;
}

// ==========================================
// ASSOCIATIONS + PROOF TABS
// ==========================================
function showProofTab(tab) {
  let connDiv = document.getElementById('proof-tab-conn');
  let kwDiv   = document.getElementById('proof-tab-kw');
  let pathDiv = document.getElementById('proof-tab-path');
  let ringsDiv = document.getElementById('proof-tab-rings');
  let tabConn = document.getElementById('tab-conn');
  let tabKw   = document.getElementById('tab-kw');
  let tabPath = document.getElementById('tab-path');
  let tabRings = document.getElementById('tab-rings');
  if(!connDiv || !kwDiv || !pathDiv) return;
  
  connDiv.style.display = 'none';
  kwDiv.style.display = 'none';
  pathDiv.style.display = 'none';
  if(ringsDiv) ringsDiv.style.display = 'none';
  if(tabConn) tabConn.classList.remove('active-tab');
  if(tabKw)   tabKw.classList.remove('active-tab');
  if(tabPath) tabPath.classList.remove('active-tab');
  if(tabRings) tabRings.classList.remove('active-tab');
  
  if(tab === 'conn') {
    connDiv.style.display = '';
    if(tabConn) tabConn.classList.add('active-tab');
  } else if(tab === 'kw') {
    kwDiv.style.display = '';
    if(tabKw)   tabKw.classList.add('active-tab');
  } else if(tab === 'path') {
    pathDiv.style.display = '';
    if(tabPath) tabPath.classList.add('active-tab');
  } else if(tab === 'rings') {
    if(ringsDiv) ringsDiv.style.display = '';
    if(tabRings) tabRings.classList.add('active-tab');
    if(window.renderRingsManager) window.renderRingsManager();
  }
}



window._assocItems = [];
window._assocContextNode = null;
window._assocOpenFilePath = null;
window._assocListHtml = '<span style="color:#666;font-style:italic;">Select a node on the graph.</span>';
window._assocSearch = '';
window._assocFrameSearch = '';
window._assocHitState = { original: 1, frame: 1 };
window._viewerOpenFilePath = null;
window._viewerSearch = '';
window._viewerFrameSearch = '';
window._viewerHitState = { original: 1, frame: 1 };

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
}

function highlightHtml(html, term) {
  let needle = esc(term || '');
  if (!needle) return html;
  let re = new RegExp(escapeRegExp(needle), 'gi');
  return String(html || '').replace(re, '<span class="highlight-code">$&</span>');
}

function countTermHits(content, term) {
  if (!term) return 0;
  let re = new RegExp(escapeRegExp(term), 'gi');
  let count = 0;
  let m;
  while ((m = re.exec(content || '')) !== null) {
    count++;
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return count;
}

function getTermMatches(content, term) {
  let matches = [];
  if (!term) return matches;
  let re = new RegExp(escapeRegExp(term), 'gi');
  let m;
  while ((m = re.exec(content || '')) !== null) {
    matches.push({ index: m.index, length: m[0].length });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return matches;
}

function buildExcerpt(content, term, hitIndex) {
  let matches = getTermMatches(content, term);
  if (!matches.length) return '<span style="color:#666;">No hits in this file.</span>';
  let idx = Math.max(0, Math.min(matches.length - 1, (parseInt(hitIndex, 10) || 1) - 1));
  let hit = matches[idx];
  let start = Math.max(0, hit.index - 90);
  let end = Math.min((content || '').length, hit.index + hit.length + 90);
  let excerpt = esc((content || '').slice(start, end));
  excerpt = excerpt.replace(new RegExp(escapeRegExp(term), 'gi'), '<span class="highlight-code">$&</span>');
  let prefix = start > 0 ? '...' : '';
  let suffix = end < (content || '').length ? '...' : '';
  return '<div style="font-size:11px;color:#aaa;white-space:pre-wrap;font-family:Consolas,monospace;">' + prefix + excerpt + suffix + '</div>';
}

function renderAssocSearchHeader(kind, label, term, content) {
  let matches = getTermMatches(content, term);
  let count = matches.length;
  let current = parseInt(window._assocHitState[kind] || 1, 10);
  if (!count) current = 0;
  else current = Math.max(1, Math.min(count, current));
  window._assocHitState[kind] = current || 0;
  let excerpt = count ? buildExcerpt(content, term, current) : '<div style="font-size:11px;color:#666;">No hits in this file.</div>';
  return `<div style="border:1px solid #2f2f2f;border-radius:8px;margin-bottom:10px;background:#1b1b1b;padding:10px 12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:7px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-weight:bold;color:#ddd;">${esc(label)}</span>
        <span style="color:var(--accent);font-weight:bold;">${esc(term)}</span>
        <span style="color:#888;font-size:11px;">${count} hit${count === 1 ? '' : 's'} in this file</span>
        <span style="color:#888;font-size:11px;">${count ? current : 0}/${count || 0}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <button class="assoc-back-btn" title="Previous hit" onclick="window.stepAssocHit('${kind}', -1)">&#8593;</button>
        <input id="assoc-${kind}-index" type="number" min="1" max="${Math.max(count, 1)}" value="${current || 0}" style="width:72px;text-align:center;" onchange="window.setAssocHitIndex('${kind}', this.value)">
        <button class="assoc-back-btn" title="Next hit" onclick="window.stepAssocHit('${kind}', 1)">&#8595;</button>
      </div>
    </div>
    ${excerpt}
  </div>`;
}

function renderAssocControls() {
  let originalSearch = window._assocSearch || '';
  let secondSearch = window._assocSearch2 || '';
  let fileCount = window._assocItems ? window._assocItems.length : 0;
  return `<div style="position:sticky;top:0;z-index:50;border:1px solid #333;border-radius:8px;padding:10px 12px;background:#171717;margin-bottom:10px;box-shadow:0 10px 20px rgba(0,0,0,0.35);">
    <div style="font-weight:bold;color:#ddd;margin-bottom:8px;">Association Search</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <span style="font-size:11px;color:#888;min-width:92px;">Search 1</span>
      <input id="assocSearchInput" type="text" autocomplete="off" placeholder="Search these files..." value="${esc(originalSearch)}" style="width:220px;font-size:13px;" onfocus="window._assocSearchFocused=true;" onblur="window._assocSearchFocused=false;" onkeydown="if(event.key==='Enter'){window.updateAssocSearch();}">
      <button class="assoc-back-btn" onclick="window.updateAssocSearch()">Search</button>
      <button class="assoc-back-btn" onclick="document.getElementById('assocSearchInput').value='';window.updateAssocSearch()">Clear</button>
      <span style="font-size:11px;color:#888;">${fileCount} file${fileCount === 1 ? '' : 's'}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <span style="font-size:11px;color:#888;min-width:92px;">Search 2</span>
      <input id="assocSearchInput2" type="text" autocomplete="off" placeholder="Secondary search..." value="${esc(secondSearch)}" style="width:220px;font-size:13px;" onfocus="window._assocSearch2Focused=true;" onblur="window._assocSearch2Focused=false;" onkeydown="if(event.key==='Enter'){window.updateAssocSearch();}">
      <button class="assoc-back-btn" onclick="window.updateAssocSearch()">Search</button>
      <button class="assoc-back-btn" onclick="document.getElementById('assocSearchInput2').value='';window.updateAssocSearch()">Clear</button>
    </div>
  </div>`;
}

window.stepAssocHit = function(kind, delta) {
  let openFile = window._assocOpenFilePath;
  if (!openFile) return;
  let doc = DATA.documents[openFile];
  if (!doc) return;
  let term = kind === 'frame' ? window._assocFrameSearch : window._assocSearch;
  let total = getTermMatches(doc.content || '', term).length;
  if (!total) return;
  let current = parseInt(window._assocHitState[kind] || 1, 10);
  if (!Number.isFinite(current) || current < 1) current = 1;
  current += delta;
  if (current < 1) current = total;
  if (current > total) current = 1;
  window._assocHitState[kind] = current;
  window.openAssocItem(openFile);
};

window.setAssocHitIndex = function(kind, value) {
  let openFile = window._assocOpenFilePath;
  if (!openFile) return;
  let doc = DATA.documents[openFile];
  if (!doc) return;
  let term = kind === 'frame' ? window._assocFrameSearch : window._assocSearch;
  let total = getTermMatches(doc.content || '', term).length;
  let n = parseInt(value, 10);
  if (!total || !Number.isFinite(n)) return;
  n = Math.max(1, Math.min(total, n));
  window._assocHitState[kind] = n;
  window.openAssocItem(openFile);
};

window.clearAssocSearch = function(kind) {
  if (kind === 'frame') {
    window._assocFrameSearch = '';
    window._assocFrameSearchFocused = false;
    window._assocHitState.frame = 0;
  } else {
    window._assocSearch = '';
    window._assocSearchFocused = false;
    window._assocHitState.original = 0;
  }
  if (window._assocOpenFilePath) {
    window.openAssocItem(window._assocOpenFilePath);
  } else {
    window.showAssocList();
  }
};


window.showAssocList = function() {
  let el = document.getElementById('impact-top');
  if (!el) return;

  if (window._graphMode === 'schema') {
    let metaMap = window._schemaNodeMeta || {};
    let nameTerm = (window._assocSearch || '').trim().toLowerCase();
    let nameTerm2 = (window._assocSearch2 || '').trim().toLowerCase();
    let fieldTerm = (window._schemaFieldSearch || '').trim().toLowerCase();
    
    let gk1 = document.getElementById('graphKeyword')?.value.toLowerCase().trim() || '';
    let gk2 = document.getElementById('graphKeyword2')?.value.toLowerCase().trim() || '';
    
    let names = Object.keys(metaMap).filter(name => {
      let meta = metaMap[name] || {};
      let kind = meta.kind || 'table';
      if (window._schemaVisibleKinds && Array.isArray(window._schemaVisibleKinds) && window._schemaVisibleKinds.length) {
        if (!window._schemaVisibleKinds.includes(kind)) return false;
      }
      
      // If keyword filter is active, only include nodes in window._assocItems
      if ((gk1 || gk2) && window._assocItems && window._assocItems.length) {
        if (!window._assocItems.includes(name)) return false;
      }
      
      let m1 = !nameTerm || schemaMatchesTerms(meta, name, nameTerm, '');
      let m2 = !nameTerm2 || schemaMatchesTerms(meta, name, nameTerm2, '');
      let mf = !fieldTerm || schemaMatchesTerms(meta, name, '', fieldTerm);
      return m1 && m2 && mf;
    }).sort(schemaSortNodes);

    let header = renderAssocControls();
    if (window._schemaSelectedNode && metaMap[window._schemaSelectedNode]) {
      el.innerHTML = header + renderSchemaObjectTree(window._schemaSelectedNode);
    } else {
      el.innerHTML = header + (names.length ? renderSchemaGroupedTree(names, nameTerm, fieldTerm) : '<div style="padding:8px;color:#666;">No schema objects matched.</div>');
    }
    let input = document.getElementById('assocSearchInput');
    if (input && window._assocSearchFocused) input.focus();
    return;
  }

  let originalSearch = window._assocSearch || '';
  let originalFiles = Array.isArray(window._assocItems) ? window._assocItems.slice() : [];

  if (!originalFiles.length) {
    el.innerHTML = `<div style="padding:4px 0 8px;">${window._assocListHtml}</div>${renderAssocControls()}`;
    return;
  }

  let secondSearch = window._assocSearch2 || '';
  let ranked = originalFiles.map(fp => {
    let doc = DATA.documents[fp];
    let content = (doc && doc.content) || '';
    let hits1 = countTermHits(content, originalSearch);
    let hits2 = countTermHits(content, secondSearch);
    return { fp, hits1, hits2, hits: hits1 + hits2 };
  });
  
  if (originalSearch.trim() || secondSearch.trim()) {
    ranked = ranked.filter(x => {
      let m1 = !originalSearch.trim() || x.hits1 > 0;
      let m2 = !secondSearch.trim() || x.hits2 > 0;
      return m1 && m2;
    });
  }
  ranked.sort((a, b) => b.hits - a.hits || a.fp.localeCompare(b.fp));

  let totalHits1 = ranked.reduce((sum, x) => sum + x.hits1, 0);
  let totalHits2 = ranked.reduce((sum, x) => sum + x.hits2, 0);
  let html = renderAssocControls();
  html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
    <div style="font-size:11px;color:#888;">
      Search 1: <span style="color:var(--accent);font-weight:bold;">${esc(originalSearch || '(empty)')}</span> (${totalHits1} hits)
      ${secondSearch ? ' • Search 2: <span style="color:var(--accent);font-weight:bold;">' + esc(secondSearch) + '</span> (' + totalHits2 + ' hits)' : ''}
    </div>
  </div>`;

  html += ranked.length ? ranked.map(x => {
    let fp = x.fp;
    let name = fp.split('/').pop();
    let dir = fp.includes('/') ? fp.substring(0, fp.lastIndexOf('/')) : '';
    return `<div class="assoc-item" onclick="window._assocHitState = { original: 1, frame: 1 }; window._lastAssocSearchKind = 'original'; window.openAssocItem('${fp.replace(/'/g, "\\'")}')">
      <span style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
        <span style="color:#ddd;">${esc(name)}</span>
        ${dir ? `<span style="font-size:11px;color:#555;">${esc(dir)}</span>` : ''}
        <span style="font-size:11px;color:#888;">
          ${originalSearch ? x.hits1 + ' hits (1)' : ''}
          ${originalSearch && secondSearch ? ' • ' : ''}
          ${secondSearch ? x.hits2 + ' hits (2)' : ''}
        </span>
      </span>
    </div>`;
  }).join('') : '<div style="padding:6px;color:#666;">No files matched.</div>';

  el.innerHTML = html;
  let input = document.getElementById('assocSearchInput');
  if (input && window._assocSearchFocused) input.focus();
};

window.updateAssocSearch = function() {
  let el1 = document.getElementById('assocSearchInput');
  let el2 = document.getElementById('assocSearchInput2');
  if (el1) window._assocSearch = el1.value;
  if (el2) window._assocSearch2 = el2.value;
  window._assocSearchFocused = true;
  window._assocOpenFilePath = null;
  window._assocHitState.original = 0;
  window._lastAssocSearchKind = 'original';
  window.showAssocList();
};

window.updateAssocFrameSearch = function(val) {
  window._assocFrameSearch = val;
  window._assocFrameSearchFocused = true;
  window._assocHitState.frame = 1;
  window._lastAssocSearchKind = 'frame';
  if (window._assocOpenFilePath) window.openAssocItem(window._assocOpenFilePath);
};

window.clearAssocSearch = function(kind) {
  if (kind === 'frame') {
    window._assocFrameSearch = '';
    window._assocFrameSearchFocused = false;
    window._assocHitState.frame = 0;
    window._lastAssocSearchKind = 'frame';
    if (window._assocOpenFilePath) window.openAssocItem(window._assocOpenFilePath);
    return;
  }
  window._assocSearch = '';
  window._assocSearchFocused = false;
  window._assocHitState.original = 0;
  window._assocOpenFilePath = null;
  window._lastAssocSearchKind = 'original';
  window.showAssocList();
};



function renderAssocSearchControls(filePath, content) {
  let original = window._assocSearch || '';
  let frame = window._assocFrameSearch || '';
  let fileCount = getTermMatches(content, original).length;
  let frameCount = getTermMatches(content, frame).length;
  
  let originalCurrent = parseInt(window._assocHitState.original || 1, 10);
  let frameCurrent = parseInt(window._assocHitState.frame || 1, 10);
  
  if (!fileCount) originalCurrent = 0; else originalCurrent = Math.max(1, Math.min(fileCount, originalCurrent));
  if (!frameCount) frameCurrent = 0; else frameCurrent = Math.max(1, Math.min(frameCount, frameCurrent));
  
  window._assocHitState.original = originalCurrent || 0;
  window._assocHitState.frame = frameCurrent || 0;
  
  return `<div style="position:sticky;top:0;z-index:50;border:1px solid #333;border-radius:8px;padding:10px 12px;background:#171717;margin-bottom:10px;box-shadow:0 10px 20px rgba(0,0,0,0.35);">
    <div style="font-weight:bold;color:#ddd;margin-bottom:8px;">Association Explore Search</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <span style="font-size:11px;color:#888;min-width:92px;">Original keyword</span>
      <input id="assocOriginalSearchInput" type="text" autocomplete="off" placeholder="Search the active file..." value="${esc(original)}" style="width:220px;font-size:13px;" onfocus="window._assocSearchFocused=true;" onblur="window._assocSearchFocused=false;" onkeydown="if(event.key==='Enter'){window.updateAssocOriginalSearch(this.value);}">
      <button class="assoc-back-btn" onclick="window.updateAssocOriginalSearch(document.getElementById('assocOriginalSearchInput').value)">Search</button>
      <button class="assoc-back-btn" onclick="window.clearAssocSearch('original')">Clear</button>
      <span style="font-size:11px;color:#888;">${fileCount} hit${fileCount === 1 ? '' : 's'} in this file</span>
      <button class="assoc-back-btn" title="Previous hit" onclick="window.stepAssocHit('original', -1)">&#8593;</button>
      <input id="assoc-original-index" type="number" min="1" max="${Math.max(fileCount, 1)}" value="${originalCurrent || 0}" style="width:72px;text-align:center;" onchange="window.setAssocHitIndex('original', this.value)">
      <button class="assoc-back-btn" title="Next hit" onclick="window.stepAssocHit('original', 1)">&#8595;</button>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <span style="font-size:11px;color:#888;min-width:92px;">Frame search</span>
      <input id="assocFrameSearchInput" type="text" autocomplete="off" placeholder="Search within active file..." value="${esc(frame)}" style="width:220px;font-size:13px;" onfocus="window._assocFrameSearchFocused=true;" onblur="window._assocFrameSearchFocused=false;" onkeydown="if(event.key==='Enter'){window.updateAssocFrameSearch(this.value);}">
      <button class="assoc-back-btn" onclick="window.updateAssocFrameSearch(document.getElementById('assocFrameSearchInput').value)">Search</button>
      <button class="assoc-back-btn" onclick="window.clearAssocSearch('frame')">Clear</button>
      <span style="font-size:11px;color:#888;">${frameCount} hit${frameCount === 1 ? '' : 's'} in this file</span>
      <button class="assoc-back-btn" title="Previous hit" onclick="window.stepAssocHit('frame', -1)">&#8593;</button>
      <input id="assoc-frame-index" type="number" min="1" max="${Math.max(frameCount, 1)}" value="${frameCurrent || 0}" style="width:72px;text-align:center;" onchange="window.setAssocHitIndex('frame', this.value)">
      <button class="assoc-back-btn" title="Next hit" onclick="window.stepAssocHit('frame', 1)">&#8595;</button>
    </div>
  </div>`;
}

window.updateAssocOriginalSearch = function(val) {
  window._assocSearch = String(val || '');
  window._assocSearchFocused = true;
  window._assocHitState.original = 1;
  window._lastAssocSearchKind = 'original';
  if (window._assocOpenFilePath) window.openAssocItem(window._assocOpenFilePath);
};

function renderViewerSearchPanel(kind, label, term, content) {
  let matches = getTermMatches(content, term);
  let count = matches.length;
  let current = parseInt(window._viewerHitState[kind] || 1, 10);
  if (!count) current = 0;
  else current = Math.max(1, Math.min(count, current));
  window._viewerHitState[kind] = current || 0;
  let excerpt = count ? buildExcerpt(content, term, current) : '<div style="font-size:11px;color:#666;">Type a term to search within the active file.</div>';
  return `<div style="border:1px solid #2f2f2f;border-radius:8px;margin-bottom:10px;background:#1b1b1b;padding:10px 12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:7px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-weight:bold;color:#ddd;">${esc(label)}</span>
        <span style="color:var(--accent);font-weight:bold;">${esc(term)}</span>
        <span style="color:#888;font-size:11px;">${count} hit${count === 1 ? '' : 's'} in this file</span>
        <span style="color:#888;font-size:11px;">${count ? current : 0}/${count || 0}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <button class="assoc-back-btn" title="Previous hit" onclick="window.stepViewerHit('${kind}', -1)">&#8593;</button>
        <input id="viewer-${kind}-index" type="number" min="1" max="${Math.max(count, 1)}" value="${current || 0}" style="width:72px;text-align:center;" onchange="window.setViewerHitIndex('${kind}', this.value)">
        <button class="assoc-back-btn" title="Next hit" onclick="window.stepViewerHit('${kind}', 1)">&#8595;</button>
      </div>
    </div>
    ${excerpt}
  </div>`;
}


function applySearchHighlightsToContainer(container, terms) {
  if (!container) return;
  let specs = Array.isArray(terms) ? terms : [];
  specs.forEach(spec => {
    let term = String(spec.term || '').trim();
    if (!term) return;
    let kind = spec.kind || 'original';
    let cls = kind === 'frame' ? 'search-hit-frame' : 'search-hit-original';
    let activeCls = cls + '-active';
    let nodes = [];
    let walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let regex = new RegExp(escapeRegExp(term), 'gi');
    nodes.forEach(node => {
      if (!node.parentElement) return;
      if (['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.parentElement.tagName)) return;
      if (!node.nodeValue || !node.nodeValue.trim()) return;
      let text = node.nodeValue;
      if (!regex.test(text)) return;
      regex.lastIndex = 0;
      let frag = document.createDocumentFragment();
      let last = 0;
      let m;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        let span = document.createElement('span');
        span.className = cls;
        span.dataset.searchKind = kind;
        span.dataset.searchTerm = term;
        span.textContent = m[0];
        frag.appendChild(span);
        last = m.index + m[0].length;
        if (m.index === regex.lastIndex) regex.lastIndex++;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });
  });
}

function markActiveSearchHit(container, kind, index) {
  if (!container) return;
  let cls = kind === 'frame' ? 'search-hit-frame' : 'search-hit-original';
  let activeCls = cls + '-active';
  let hits = Array.from(container.querySelectorAll('span.' + cls));
  hits.forEach(el => el.classList.remove(activeCls));
  if (!hits.length) return;
  let activeIndex = Math.max(1, Math.min(hits.length, parseInt(index, 10) || 1));
  let active = hits[activeIndex - 1];
  if (!active) return;
  active.classList.add(activeCls);
  active.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
}

function renderViewerSearchControls(filePath, content) {
  let original = window._viewerSearch || '';
  let frame = window._viewerFrameSearch || '';
  let fileCount = getTermMatches(content, original).length;
  let frameCount = getTermMatches(content, frame).length;
  let originalCurrent = parseInt(window._viewerHitState.original || 1, 10);
  let frameCurrent = parseInt(window._viewerHitState.frame || 1, 10);
  if (!fileCount) originalCurrent = 0; else originalCurrent = Math.max(1, Math.min(fileCount, originalCurrent));
  if (!frameCount) frameCurrent = 0; else frameCurrent = Math.max(1, Math.min(frameCount, frameCurrent));
  window._viewerHitState.original = originalCurrent || 0;
  window._viewerHitState.frame = frameCurrent || 0;
  return `<div style="position:sticky;top:0;z-index:50;border:1px solid #333;border-radius:8px;padding:10px 12px;background:#171717;margin-bottom:10px;box-shadow:0 10px 20px rgba(0,0,0,0.35);">
    <div style="font-weight:bold;color:#ddd;margin-bottom:8px;">Explore Search</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <span style="font-size:11px;color:#888;min-width:92px;">Original keyword</span>
      <input id="viewerOriginalSearchInput" type="text" autocomplete="off" placeholder="Search the active file..." value="${esc(original)}" style="width:220px;font-size:13px;" onfocus="window._viewerSearchFocused=true;" onblur="window._viewerSearchFocused=false;" onkeydown="if(event.key==='Enter'){window.updateViewerSearch(this.value);}">
      <button class="assoc-back-btn" onclick="window.updateViewerSearch(document.getElementById('viewerOriginalSearchInput').value)">Search</button>
      <button class="assoc-back-btn" onclick="window.clearViewerSearch('original')">Clear</button>
      <span style="font-size:11px;color:#888;">${fileCount} hit${fileCount === 1 ? '' : 's'} in this file</span>
      <button class="assoc-back-btn" title="Previous hit" onclick="window.stepViewerHit('original', -1)">&#8593;</button>
      <input id="viewer-original-index" type="number" min="1" max="${Math.max(fileCount, 1)}" value="${originalCurrent || 0}" style="width:72px;text-align:center;" onchange="window.setViewerHitIndex('original', this.value)">
      <button class="assoc-back-btn" title="Next hit" onclick="window.stepViewerHit('original', 1)">&#8595;</button>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <span style="font-size:11px;color:#888;min-width:92px;">Frame search</span>
      <input id="viewerFrameSearchInput" type="text" autocomplete="off" placeholder="Search within active file..." value="${esc(frame)}" style="width:220px;font-size:13px;" onfocus="window._viewerFrameSearchFocused=true;" onblur="window._viewerFrameSearchFocused=false;" onkeydown="if(event.key==='Enter'){window.updateViewerFrameSearch(this.value);}">
      <button class="assoc-back-btn" onclick="window.updateViewerFrameSearch(document.getElementById('viewerFrameSearchInput').value)">Search</button>
      <button class="assoc-back-btn" onclick="window.clearViewerSearch('frame')">Clear</button>
      <span style="font-size:11px;color:#888;">${frameCount} hit${frameCount === 1 ? '' : 's'} in this file</span>
      <button class="assoc-back-btn" title="Previous hit" onclick="window.stepViewerHit('frame', -1)">&#8593;</button>
      <input id="viewer-frame-index" type="number" min="1" max="${Math.max(frameCount, 1)}" value="${frameCurrent || 0}" style="width:72px;text-align:center;" onchange="window.setViewerHitIndex('frame', this.value)">
      <button class="assoc-back-btn" title="Next hit" onclick="window.stepViewerHit('frame', 1)">&#8595;</button>
    </div>
  </div>`;
}

window.updateViewerSearch = function(val) {
  window._viewerSearch = String(val || '');
  window._viewerSearchFocused = true;
  window._viewerHitState.original = 1;
  window._lastViewerSearchKind = 'original';
  if (window._viewerOpenFilePath) openFileInViewer(window._viewerOpenFilePath);
};

window.updateViewerFrameSearch = function(val) {
  window._viewerFrameSearch = String(val || '');
  window._viewerFrameSearchFocused = true;
  window._viewerHitState.frame = 1;
  window._lastViewerSearchKind = 'frame';
  if (window._viewerOpenFilePath) openFileInViewer(window._viewerOpenFilePath);
};

window.clearViewerSearch = function(kind) {
  if (kind === 'frame') {
    window._viewerFrameSearch = '';
    window._viewerFrameSearchFocused = false;
    window._viewerHitState.frame = 0;
  } else {
    window._viewerSearch = '';
    window._viewerSearchFocused = false;
    window._viewerHitState.original = 0;
  }
  window._lastViewerSearchKind = kind;
  if (window._viewerOpenFilePath) openFileInViewer(window._viewerOpenFilePath);
};

window.stepViewerHit = function(kind, delta) {
  let openFile = window._viewerOpenFilePath;
  if (!openFile) return;
  let doc = DATA.documents[openFile];
  if (!doc) return;
  let term = kind === 'frame' ? window._viewerFrameSearch : window._viewerSearch;
  let total = getTermMatches(doc.content || '', term).length;
  if (!total) return;
  let current = parseInt(window._viewerHitState[kind] || 1, 10);
  if (!Number.isFinite(current) || current < 1) current = 1;
  current += delta;
  if (current < 1) current = total;
  if (current > total) current = 1;
  window._viewerHitState[kind] = current;
  window._lastViewerSearchKind = kind;
  openFileInViewer(openFile);
};

window.setViewerHitIndex = function(kind, value) {
  let openFile = window._viewerOpenFilePath;
  if (!openFile) return;
  let doc = DATA.documents[openFile];
  if (!doc) return;
  let term = kind === 'frame' ? window._viewerFrameSearch : window._viewerSearch;
  let total = getTermMatches(doc.content || '', term).length;
  let n = parseInt(value, 10);
  if (!total || !Number.isFinite(n)) return;
  n = Math.max(1, Math.min(total, n));
  window._viewerHitState[kind] = n;
  window._lastViewerSearchKind = kind;
  openFileInViewer(openFile);
};




window.openAssocItem = function(filePath) {
  let doc = DATA.documents[filePath];
  if(!doc) return;
  window._assocOpenFilePath = filePath;
  if (!window._assocFrameSearch && window._assocSearch2) window._assocFrameSearch = window._assocSearch2;
  let content = doc.content || '';
  
  let searchControls = renderAssocSearchControls(filePath, content);
  let rendered = renderDoc(filePath, doc);

  document.getElementById('impact-top').innerHTML =
    '<div style="position:sticky;top:0;z-index:70;background:var(--bg);padding-bottom:10px;">' +
      '<div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--bg);">' +
      '<button class="assoc-back-btn" onclick="window._assocOpenFilePath = null; window.showAssocList()">&#8592; Back to list</button>' +
      '<span style="font-weight:bold;font-size:14px;color:#ddd;">' + esc(filePath.split('/').pop()) + '</span>' +
      '<span style="font-size:11px;color:#555;word-break:break-all;">' + esc(filePath) + '</span>' +
      '</div>' +
      searchControls +
    '</div>' +
    '<div id="assocDocBody">' + rendered + '</div>';

  requestAnimationFrame(() => {
    let body = document.getElementById('assocDocBody');
    if (!body) return;
    
    applySearchHighlightsToContainer(body, [
      { kind: 'original', term: window._assocSearch },
      { kind: 'frame', term: window._assocFrameSearch }
    ]);
    
    let focusKind = window._lastAssocSearchKind || (window._assocFrameSearch ? 'frame' : 'original');
    let focusIndex = focusKind === 'frame' ? window._assocHitState.frame : window._assocHitState.original;
    markActiveSearchHit(body, focusKind, focusIndex);
  });

  if(window._assocContextNode && window._assocContextNode !== filePath) {
    showProof(window._assocContextNode, filePath);
    let tabs = document.getElementById('proof-tabs');
    if(tabs) tabs.style.display = 'flex';
    showProofTab('conn');
  }
};

window.stepAssocHit = function(kind, delta) {
  let openFile = window._assocOpenFilePath;
  if (!openFile) return;
  let doc = DATA.documents[openFile];
  if (!doc) return;
  let term = kind === 'frame' ? window._assocFrameSearch : window._assocSearch;
  let total = getTermMatches(doc.content || '', term).length;
  if (!total) return;
  let current = parseInt(window._assocHitState[kind] || 1, 10);
  if (!Number.isFinite(current) || current < 1) current = 1;
  current += delta;
  if (current < 1) current = total;
  if (current > total) current = 1;
  window._assocHitState[kind] = current;
  window._lastAssocSearchKind = kind;
  window.openAssocItem(openFile);
};

window.setAssocHitIndex = function(kind, value) {
  let openFile = window._assocOpenFilePath;
  if (!openFile) return;
  let doc = DATA.documents[openFile];
  if (!doc) return;
  let term = kind === 'frame' ? window._assocFrameSearch : window._assocSearch;
  let total = getTermMatches(doc.content || '', term).length;
  let n = parseInt(value, 10);
  if (!total || !Number.isFinite(n)) return;
  n = Math.max(1, Math.min(total, n));
  window._assocHitState[kind] = n;
  window._lastAssocSearchKind = kind;
  window.openAssocItem(openFile);
};



function cleanSchemaName(name) {
  return String(name || '').replace(/[\\[\\]]/g, '').trim();
}

function inferSchemaKind(name, sourceKind) {
  let n = cleanSchemaName(name).toLowerCase();
  let source = String(sourceKind || '').toLowerCase();
  if (source.includes('view')) return 'view';
  if (source.includes('proc')) return 'proc';
  if (n.startsWith('vw_') || n.startsWith('view_') || n.endsWith('_view') || n.includes('.vw')) return 'view';
  if (n.startsWith('sp_') || n.startsWith('usp_') || n.startsWith('prc_') || n.endsWith('_proc') || n.endsWith('_sp')) return 'proc';
  return 'table';
}

function schemaSearchBlob(meta, name) {
  if (!meta) return String(name || '').toLowerCase();
  let parts = [
    name,
    meta.schemaName,
    meta.kind,
    meta.displayName,
    (meta.columns || []).map(c => [c.name, c.type, c.note].join(' ')).join(' '),
    meta.searchText || '',
    (meta.sources || []).join(' '),
    (meta.refs || []).join(' '),
    (meta.fkRefs || []).join(' ')
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function schemaMatchesTerms(meta, name, nameTerm, fieldTerm) {
  let blob = schemaSearchBlob(meta, name);
  if (nameTerm && !blob.includes(String(nameTerm).toLowerCase())) return false;
  if (fieldTerm && !blob.includes(String(fieldTerm).toLowerCase())) return false;
  return true;
}

function schemaSortNodes(a, b) {
  let am = (window._schemaNodeMeta || {})[a] || {};
  let bm = (window._schemaNodeMeta || {})[b] || {};
  let ak = (am.schemaName || '').localeCompare(bm.schemaName || '');
  if (ak) return ak;
  let at = (am.kind || 'table').localeCompare(bm.kind || 'table');
  if (at) return at;
  return a.localeCompare(b);
}

function renderSchemaNodeRow(name, meta, hits) {
  let kind = meta.kind || 'table';
  let badge = kind === 'view' ? 'View' : (kind === 'proc' ? 'Proc' : 'Table');
  let schemaName = meta.schemaName || 'dbo';
  let fieldCount = (meta.columns || []).length;
  return `<div class="assoc-item" style="align-items:flex-start;" onclick="window.openSchemaObject('${name.replace(/'/g, "\\'")}')">
    <span style="display:flex;flex-direction:column;gap:2px;">
      <span><span style="color:#ddd;font-weight:bold;">${esc(name)}</span> <span style="font-size:11px;color:#888;">(${esc(badge)})</span></span>
      <span style="font-size:11px;color:#666;">${esc(schemaName)} • ${fieldCount} field${fieldCount === 1 ? '' : 's'}${hits ? ` • ${hits} hit${hits === 1 ? '' : 's'}` : ''}</span>
    </span>
  </div>`;
}

function renderSchemaGroupedTree(filteredNames, nameTerm, fieldTerm) {
  let metaMap = window._schemaNodeMeta || {};
  let grouped = {};
  filteredNames.forEach(name => {
    let meta = metaMap[name] || {};
    let schema = meta.schemaName || 'dbo';
    let kind = meta.kind || 'table';
    if (!grouped[schema]) grouped[schema] = {};
    if (!grouped[schema][kind]) grouped[schema][kind] = [];
    grouped[schema][kind].push(name);
  });

  let serverName = (DATA.meta && DATA.meta.server_name) || 'Server';
  let html = `<div style="border:1px solid #333;border-radius:8px;background:#171717;padding:10px 12px;margin-bottom:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
      <div style="font-weight:bold;color:#ddd;">Association tree</div>
      <div style="font-size:11px;color:#888;">${filteredNames.length} object${filteredNames.length === 1 ? '' : 's'} matched</div>
    </div>
    <div style="margin-left:4px;border-left:1px dashed #444;padding-left:10px;">
      <div style="font-size:12px;color:#b8c6ff;">🖥 ${esc(serverName)}</div>`;

  Object.keys(grouped).sort().forEach(schema => {
    html += `<details open style="margin:6px 0 0 8px;">
      <summary style="cursor:pointer;color:#a5d6a7;font-size:12px;list-style:none;">📁 ${esc(schema)}</summary>
      <div style="margin-left:14px;border-left:1px dashed #333;padding-left:10px;">`;
    Object.keys(grouped[schema]).sort().forEach(kind => {
      let label = kind === 'view' ? 'Views' : (kind === 'proc' ? 'Stored Procedures' : 'Tables');
      html += `<details open style="margin:5px 0 0 8px;">
        <summary style="cursor:pointer;color:#64b5f6;font-size:11px;list-style:none;">${esc(label)}</summary>
        <div style="margin-left:14px;border-left:1px dashed #2f2f2f;padding-left:10px;">`;
      grouped[schema][kind].sort(schemaSortNodes).forEach(name => {
        let meta = metaMap[name] || {};
        let blob = schemaSearchBlob(meta, name);
        let hits = 0;
        if (nameTerm) hits += countTermHits(blob, nameTerm);
        if (fieldTerm && fieldTerm !== nameTerm) hits += countTermHits(blob, fieldTerm);
        html += renderSchemaNodeRow(name, meta, hits);
      });
      html += `</div></details>`;
    });
    html += `</div></details>`;
  });

  html += `</div></div></div>`;
  return html;
}

function renderSchemaObjectTree(nodeName) {
  let metaMap = window._schemaNodeMeta || {};
  let meta = metaMap[nodeName] || {};
  let serverName = (DATA.meta && DATA.meta.server_name) || 'Server';
  let schemaName = meta.schemaName || 'dbo';
  let kind = meta.kind || 'table';
  let label = kind === 'view' ? 'View' : (kind === 'proc' ? 'Stored Procedure' : 'Table');
  let fields = meta.columns || [];
  let refs = Array.from(new Set([...(meta.fkRefs || []), ...((meta.refs || []))])).filter(Boolean);

  let fieldRows = fields.length ? fields.map((c, idx) => {
    return `<div class="assoc-item" style="margin-left:26px;" onclick="window.openSchemaField('${nodeName.replace(/'/g, "\\'")}', ${idx})">
      <span style="display:flex;flex-direction:column;gap:1px;">
        <span style="color:#ddd;">${esc(c.name || '')}</span>
        <span style="font-size:10px;color:#777;">${esc(c.type || '')}${c.note ? ' • ' + esc(c.note) : ''}</span>
      </span>
    </div>`;
  }).join('') : '<div style="margin-left:26px;color:#666;font-size:11px;">No field metadata found.</div>';

  let refRows = refs.length ? refs.map(r => {
    let display = esc(r);
    return `<div class="assoc-item" style="margin-left:26px;" onclick="window.openSchemaObject('${String(r).replace(/'/g, "\\'")}')">
      <span style="display:flex;flex-direction:column;gap:1px;">
        <span style="color:#ddd;">${display}</span>
        <span style="font-size:10px;color:#777;">related object</span>
      </span>
    </div>`;
  }).join('') : '<div style="margin-left:26px;color:#666;font-size:11px;">No related objects found.</div>';

  return `<div style="border:1px solid #333;border-radius:8px;background:#171717;padding:10px 12px;margin-bottom:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
      <div style="font-weight:bold;color:#ddd;">Association tree</div>
      <button class="assoc-back-btn" onclick="window._schemaSelectedNode = null; window.showAssocList();">Back to list</button>
    </div>
    <div style="margin-left:4px;border-left:1px dashed #444;padding-left:10px;">
      <div style="font-size:12px;color:#b8c6ff;">🖥 ${esc(serverName)}</div>
      <details open style="margin:6px 0 0 8px;">
        <summary style="cursor:pointer;color:#a5d6a7;font-size:12px;list-style:none;">📁 ${esc(schemaName)}</summary>
        <div style="margin-left:14px;border-left:1px dashed #333;padding-left:10px;">
          <details open style="margin:5px 0 0 8px;">
            <summary style="cursor:pointer;color:var(--accent);font-size:11px;list-style:none;">${esc(nodeName)} <span style="color:#888;">(${esc(label)})</span></summary>
            <div style="margin-left:14px;border-left:1px dashed #2f2f2f;padding-left:10px;">
              <div style="font-size:11px;color:#888;margin:4px 0;">Fields (${fields.length})</div>
              ${fieldRows}
              <div style="font-size:11px;color:#888;margin:8px 0 4px;">Related objects (${refs.length})</div>
              ${refRows}
            </div>
          </details>
        </div>
      </details>
    </div>
  </div>`;
}

function renderSchemaDetailsPanel(nodeName) {
  let metaMap = window._schemaNodeMeta || {};
  let meta = metaMap[nodeName] || {};
  let fields = meta.columns || [];
  let refs = Array.from(new Set([...(meta.fkRefs || []), ...((meta.refs || []))])).filter(Boolean);
  let searchBlob = schemaSearchBlob(meta, nodeName);
  let sources = Array.from(new Set(meta.sources || [])).filter(Boolean);
  let body = `<div style="border:1px solid #333;border-radius:8px;background:#151515;padding:10px 12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
      <div style="font-weight:bold;color:#ddd;">Low-level details</div>
      <div style="font-size:11px;color:#888;">${esc(meta.kind || 'table')} • ${fields.length} field${fields.length === 1 ? '' : 's'}</div>
    </div>
    <div style="font-size:12px;color:#ddd;margin-bottom:6px;word-break:break-all;"><b>${esc(nodeName)}</b></div>
    <div style="font-size:11px;color:#888;margin-bottom:8px;">Schema: ${esc(meta.schemaName || 'dbo')} • Sources: ${sources.length ? sources.map(esc).join(', ') : 'none'}</div>
    <div style="font-size:11px;color:#888;margin-bottom:8px;">Search text: ${esc(searchBlob.slice(0, 240))}${searchBlob.length > 240 ? '…' : ''}</div>
    <div style="margin-bottom:8px;">
      <div style="font-size:11px;color:#888;margin-bottom:4px;">Fields</div>
      <div style="max-height:190px;overflow:auto;">${fields.length ? fields.map(c => `<div class="assoc-item"><span style="display:flex;flex-direction:column;gap:1px;"><span style="color:#ddd;">${esc(c.name || '')}</span><span style="font-size:10px;color:#777;">${esc(c.type || '')}${c.note ? ' • ' + esc(c.note) : ''}</span></span></div>`).join('') : '<div style="color:#666;font-size:11px;">No fields recorded.</div>'}</div>
    </div>
    <div>
      <div style="font-size:11px;color:#888;margin-bottom:4px;">Related objects</div>
      <div style="max-height:160px;overflow:auto;">${refs.length ? refs.map(r => `<div class="assoc-item" style="cursor:pointer;" onclick="window.openSchemaObject('${String(r).replace(/'/g, "\\'")}')"><span style="color:#ddd;">${esc(r)}</span></div>`).join('') : '<div style="color:#666;font-size:11px;">No related objects recorded.</div>'}</div>
    </div>
  </div>`;
  return body;
}

window.openSchemaObject = function(nodeName) {
  window._schemaSelectedNode = nodeName;
  let bottom = document.getElementById('impact-bottom');
  if (bottom) bottom.innerHTML = renderSchemaDetailsPanel(nodeName);
  window.showAssocList();
};

window.openSchemaField = function(nodeName, idx) {
  let metaMap = window._schemaNodeMeta || {};
  let meta = metaMap[nodeName] || {};
  let field = (meta.columns || [])[idx];
  if (!field) return;
  window._schemaSelectedNode = nodeName;
  let bottom = document.getElementById('impact-bottom');
  if (bottom) {
    bottom.innerHTML = `<div style="border:1px solid #333;border-radius:8px;background:#151515;padding:10px 12px;">
      <div style="font-weight:bold;color:#ddd;margin-bottom:6px;">Field detail</div>
      <div style="font-size:12px;color:#ddd;"><b>${esc(field.name || '')}</b></div>
      <div style="font-size:11px;color:#888;margin-top:4px;">Type: ${esc(field.type || '')}</div>
      ${field.note ? `<div style="font-size:11px;color:#888;margin-top:4px;">${esc(field.note)}</div>` : ''}
    </div>`;
  }
  window.showAssocList();
};

window.updateSchemaNodeMode = function() {
  if (window._graphMode !== 'schema') return;
  if (typeof window._schemaRebuild === 'function') {
    window._schemaSelectedNode = null;
    window._schemaRebuild();
  }
};

window.updateSchemaFieldSearch = function(val) {
  window._schemaFieldSearch = typeof val === 'string' ? val : (document.getElementById('schemaFieldSearch')?.value || '');
  if (window._graphMode !== 'schema') return;
  if (typeof window._schemaRebuild === 'function') {
    window._schemaRebuild();
  }
};

// ==========================================
// GRAPH ENGINE
// ==========================================
