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
let ctxFolderPath = null;
function showContextMenu(x, y, filePath, kind='file') {
  ctxFilePath = filePath;
  ctxFolderPath = kind === 'folder' ? filePath : null;
  const openItem = document.getElementById('ctx-open');
  const folderItem = document.getElementById('ctx-folder-review');
  const graphItem = document.getElementById('ctx-graph');
  if (openItem) openItem.style.display = kind === 'folder' ? 'none' : 'block';
  if (folderItem) folderItem.style.display = kind === 'folder' ? 'block' : 'none';
  if (graphItem) graphItem.style.display = kind === 'folder' ? 'none' : 'block';
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
document.getElementById('ctx-folder-review').addEventListener('click', e => {
  e.stopPropagation();
  if(ctxFolderPath && window.openGroupManagement) window.openGroupManagement(ctxFolderPath);
  else if(ctxFolderPath && window.openFolderReview) window.openFolderReview(ctxFolderPath);
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

