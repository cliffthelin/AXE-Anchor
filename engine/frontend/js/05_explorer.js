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
      window.ensureDocContent(filePath).then(() => renderFileIntoPane('split-left', filePath));
    } else {
      currentRightFile = filePath;
      window.ensureDocContent(filePath).then(() => renderFileIntoPane('split-right', filePath));
    }
    return;
  }
  
  if (currentView !== 'explorer') {
    nav('explorer');
  }

  // Show loading indicator immediately
  document.getElementById('left').innerHTML = `<div style="padding:40px;text-align:center;color:#888;"><div style="font-size:24px;margin-bottom:10px;">⏳</div>Loading ${esc(filePath.split('/').pop())}...</div>`;

  // Load content then render
  window.ensureDocContent(filePath).then(() => {
    _renderFileContent(filePath);
  });
}

function _renderFileContent(filePath) {
  let doc = DATA.documents[filePath];
  if (!doc) return;
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
  let doc = DATA.documents[file] || {};
  let generatedAt = DATA.build_meta && DATA.build_meta.generated_at ? DATA.build_meta.generated_at : '';
  if (generatedAt || doc.stale) {
    out += `<details open style="margin-top:6px;"><summary style="color:#64b5f6;cursor:pointer;">📋 ${esc(label)} — Build Trace</summary><pre style="font-size:11px;color:#aaa;max-height:160px;overflow:auto;">${esc(JSON.stringify({
      generated_at: generatedAt,
      active_workspace_id: DATA.active_workspace_id || '',
      stale: doc.stale || null
    }, null, 2))}</pre></details>`;
  }
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
