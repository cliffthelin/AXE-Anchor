async function fetchReviews() {
  if (location.protocol !== 'file:') {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        window.REVIEWS = await res.json();
        return;
      }
    } catch (e) {}
  }
  window.REVIEWS = JSON.parse(localStorage.getItem('sdd_reviews') || '{}');
}

async function updateReviews(filePath, status, confidence, comments) {
  let fallback = true;
  if (location.protocol !== 'file:') {
    try {
      const res = await fetch('/api/reviews/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, status, confidence, comments })
      });
      if (res.ok) {
        const data = await res.json();
        window.REVIEWS = data.reviews;
        fallback = false;
      }
    } catch (e) {}
  }
  if (fallback) {
    if (!window.REVIEWS) window.REVIEWS = {};
    window.REVIEWS[filePath] = { status, confidence, comments };
    localStorage.setItem('sdd_reviews', JSON.stringify(window.REVIEWS));
  }
  if (window._viewerOpenFilePath === filePath) {
    openFileInViewer(filePath);
  }
}

async function saveFileContent(filePath, newContent) {
  if (location.protocol === 'file:') {
    alert("Cannot edit files in Static Mode (No Backend Server). Run the python server to enable editing.");
    return;
  }
  try {
    const res = await fetch('/api/file/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, content: newContent })
    });
    if (res.ok) {
      alert("File saved and visualizer rebuilt successfully!");
      window.location.reload();
    } else {
      const err = await res.json();
      alert("Error saving file: " + (err.message || 'Unknown error'));
    }
  } catch (e) {
    alert("Failed to save file: " + e.message);
  }
}

window.updateFileReviewStatus = function(filePath, newStatus) {
  let r = window.REVIEWS[filePath] || { status: 'Unreviewed', confidence: 3, comments: [] };
  r.status = newStatus;
  updateReviews(filePath, r.status, r.confidence, r.comments);
};

window.updateFileReviewConfidence = function(filePath, newConfidence) {
  let r = window.REVIEWS[filePath] || { status: 'Unreviewed', confidence: 3, comments: [] };
  r.confidence = newConfidence;
  updateReviews(filePath, r.status, r.confidence, r.comments);
};

window.submitReviewComment = function(paneId, filePath) {
  const highlightInput = document.getElementById(`newCommentHighlight_${paneId}`);
  const textInput = document.getElementById(`newCommentText_${paneId}`);
  const highlight = highlightInput ? highlightInput.value : '';
  const text = textInput ? textInput.value : '';
  if (!text || text.trim() === '') return;
  
  let r = window.REVIEWS[filePath] || { status: 'Unreviewed', confidence: 3, comments: [] };
  if (!r.comments) r.comments = [];
  let newComment = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    highlight: highlight,
    text: text,
    created_at: new Date().toISOString(),
    author: window.getCurrentRole(),
    replies: []
  };
  r.comments.push(newComment);
  updateReviews(filePath, r.status, r.confidence, r.comments);
};

window.submitCommentReply = function(paneId, filePath, commentId) {
  const replyInput = document.getElementById(`replyInput_${commentId}_${paneId}`);
  const text = replyInput ? replyInput.value : '';
  if (!text || text.trim() === '') return;
  
  let r = window.REVIEWS[filePath] || { status: 'Unreviewed', confidence: 3, comments: [] };
  let comment = r.comments.find(c => c.id === commentId);
  if (comment) {
    if (!comment.replies) comment.replies = [];
    comment.replies.push({
      author: window.getCurrentRole(),
      text: text,
      created_at: new Date().toISOString()
    });
    updateReviews(filePath, r.status, r.confidence, r.comments);
  }
};

window.deleteReviewComment = function(filePath, commentId) {
  let r = window.REVIEWS[filePath] || { status: 'Unreviewed', confidence: 3, comments: [] };
  r.comments = r.comments.filter(c => c.id !== commentId);
  updateReviews(filePath, r.status, r.confidence, r.comments);
};

window.getSelectedTextForReview = function(paneId) {
  const sel = window.getSelection();
  if (!sel) return '';
  const text = sel.toString().trim();
  const bodyId = paneId === 'left' ? 'viewerDocBody' : `body_${paneId}`;
  const container = document.getElementById(bodyId);
  if (container && container.contains(sel.anchorNode)) {
    return text;
  }
  return '';
};

window.focusCommentHighlight = function(commentId) {
  const span = document.querySelector(`.review-highlight[data-comment-id="${commentId}"]`);
  if (span) {
    span.scrollIntoView({ behavior: 'smooth', block: 'center' });
    span.style.transition = 'background-color 0.2s';
    span.style.backgroundColor = 'rgba(234, 179, 8, 0.9)';
    setTimeout(() => {
      span.style.backgroundColor = 'rgba(234, 179, 8, 0.28)';
    }, 1000);
  }
};

window.focusCommentInPanel = function(commentId) {
  const card = document.getElementById(`comment_item_${commentId}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const details = card.closest('details');
    if (details) details.open = true;
    card.style.transition = 'box-shadow 0.2s, background-color 0.2s';
    card.style.boxShadow = '0 0 12px #2563eb';
    setTimeout(() => {
      card.style.boxShadow = 'none';
    }, 1500);
  }
};

window.highlightCommentsInDOM = function(container, paneId, comments) {
  if (!container || !comments || comments.length === 0) return;
  
  comments.forEach(comment => {
    const phrase = comment.highlight;
    if (!phrase || phrase.trim() === '') return;
    
    const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const nodesToReplace = [];
    
    while (node = walk.nextNode()) {
      const idx = node.nodeValue.indexOf(phrase);
      if (idx !== -1) {
        nodesToReplace.push({ node, idx, phrase, commentId: comment.id, commentText: comment.text });
      }
    }
    
    nodesToReplace.forEach(item => {
      const parent = item.node.parentNode;
      if (!parent || parent.classList.contains('review-highlight')) return;
      
      const val = item.node.nodeValue;
      const before = val.substring(0, item.idx);
      const after = val.substring(item.idx + item.phrase.length);
      
      const span = document.createElement('span');
      span.className = 'review-highlight';
      span.setAttribute('data-comment-id', item.commentId);
      span.title = `Comment: "${item.commentText}"`;
      span.innerText = item.phrase;
      span.onclick = (e) => {
        e.stopPropagation();
        window.focusCommentInPanel(item.commentId);
      };
      
      parent.insertBefore(document.createTextNode(before), item.node);
      parent.insertBefore(span, item.node);
      parent.insertBefore(document.createTextNode(after), item.node);
      parent.removeChild(item.node);
    });
  });
};

window.renderReviewPanelForFile = function(filePath) {
  if (window._viewerOpenFilePath === filePath) {
    openFileInViewer(filePath);
  }
};

window.startEditingFile = function(paneId, filePath) {
  const bodyId = paneId === 'left' ? 'viewerDocBody' : `body_${paneId}`;
  const bodyEl = document.getElementById(bodyId);
  if (bodyEl) bodyEl.style.display = 'none';
  
  const doc = DATA.documents[filePath];
  if (!doc) return;
  const content = doc.content || '';
  
  const editArea = document.getElementById(`fileEditArea_${paneId}`);
  if (editArea) {
    editArea.innerHTML = `
      <div style="background:#1a2332;border:1px solid #2b3a54;border-radius:6px;padding:12px;margin-bottom:10px;">
        <h3 style="margin-top:0;color:#90caf9;font-size:14px;">✏️ Edit File Content</h3>
        <textarea id="editDocTextArea_${paneId}" style="width:100%;height:450px;background:#0d1117;color:#cbd5e1;border:1px solid #2b3a54;border-radius:4px;padding:8px;font-family:Consolas,monospace;font-size:12px;line-height:1.5;box-sizing:border-box;resize:vertical;" placeholder="File content...">${esc(content)}</textarea>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
          <button onclick="window.cancelEditingFile('${paneId}')" style="background:#475569;border:none;padding:5px 12px;color:white;border-radius:3px;font-size:12px;">Cancel</button>
          <button onclick="window.saveEditedFile('${paneId}', '${filePath.replace(/'/g, "\\'")}')" style="background:#2563eb;border:none;padding:5px 12px;color:white;border-radius:3px;font-size:12px;">💾 Save Changes</button>
        </div>
      </div>
    `;
    editArea.style.display = 'block';
  }
};

window.cancelEditingFile = function(paneId) {
  const editArea = document.getElementById(`fileEditArea_${paneId}`);
  if (editArea) {
    editArea.style.display = 'none';
    editArea.innerHTML = '';
  }
  const bodyId = paneId === 'left' ? 'viewerDocBody' : `body_${paneId}`;
  const bodyEl = document.getElementById(bodyId);
  if (bodyEl) bodyEl.style.display = 'block';
};

window.saveEditedFile = async function(paneId, filePath) {
  const text = document.getElementById(`editDocTextArea_${paneId}`)?.value || '';
  await saveFileContent(filePath, text);
};

window.renderReviewPanel = function(paneId, filePath, fileReview) {
  const role = window.getCurrentRole();
  const status = fileReview.status || 'Unreviewed';
  const confidence = fileReview.confidence || 3;
  const comments = fileReview.comments || [];
  
  let statusBadge = '';
  if (status === 'Verified') statusBadge = '<span style="color:#4caf50;font-weight:bold;">✅ Verified</span>';
  else if (status === 'Needs Revision') statusBadge = '<span style="color:#ffb74d;font-weight:bold;">⚠️ Needs Revision</span>';
  else statusBadge = '<span style="color:#aaa;">⚪ Unreviewed</span>';
  
  let stars = '⭐'.repeat(confidence);
  
  let isOpen = (status === 'Needs Revision' || comments.length > 0) ? 'open' : '';
  
  let html = `
    <div style="margin-top:10px;margin-bottom:10px;">
      <details ${isOpen} style="background:#1a2332; border:1px solid #2b3a54; border-radius:6px; padding:10px;">
        <summary style="font-weight:bold;color:#64b5f6;cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;">
          <span>🔍 File Review Panel (${statusBadge} | Confidence: ${stars})</span>
          <span style="font-size:12px;color:#888;">${comments.length} comments</span>
        </summary>
        <div style="margin-top:10px;font-size:13px;display:flex;flex-direction:column;gap:10px;">
  `;
  
  if (role === 'Viewer') {
    html += `
          <div style="display:flex;gap:15px;align-items:center;">
            <div><strong>Status:</strong> ${statusBadge}</div>
            <div><strong>Confidence:</strong> ${stars} (${confidence}/5)</div>
          </div>
    `;
  } else {
    html += `
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#161d27;padding:8px;border-radius:4px;">
            <div style="display:flex;align-items:center;gap:5px;">
              <label style="font-weight:bold;color:#aaa;">Status:</label>
              <select onchange="window.updateFileReviewStatus('${filePath.replace(/'/g, "\\'")}', this.value)" style="padding:3px 6px;font-size:12px;background:#252d3a;">
                <option value="Unreviewed" ${status === 'Unreviewed' ? 'selected' : ''}>⚪ Unreviewed</option>
                <option value="Verified" ${status === 'Verified' ? 'selected' : ''}>✅ Verified</option>
                <option value="Needs Revision" ${status === 'Needs Revision' ? 'selected' : ''}>⚠️ Needs Revision</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:5px;">
              <label style="font-weight:bold;color:#aaa;">Confidence:</label>
              <select onchange="window.updateFileReviewConfidence('${filePath.replace(/'/g, "\\'")}', parseInt(this.value))" style="padding:3px 6px;font-size:12px;background:#252d3a;">
                <option value="1" ${confidence === 1 ? 'selected' : ''}>⭐ (1/5 - Low)</option>
                <option value="2" ${confidence === 2 ? 'selected' : ''}>⭐⭐ (2/5)</option>
                <option value="3" ${confidence === 3 ? 'selected' : ''}>⭐⭐⭐ (3/5)</option>
                <option value="4" ${confidence === 4 ? 'selected' : ''}>⭐⭐⭐⭐ (4/5)</option>
                <option value="5" ${confidence === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ (5/5 - High)</option>
              </select>
            </div>
    `;
    
    if (role === 'Admin') {
      html += `
            <button onclick="window.startEditingFile('${paneId}', '${filePath.replace(/'/g, "\\'")}')" style="background:#007acc;color:white;border:none;padding:4px 8px;font-size:12px;border-radius:3px;margin-left:auto;">✏️ Edit Content</button>
      `;
    }
    
    html += `
          </div>
    `;
  }
  
  html += `
          <div style="margin-top:5px;border-top:1px solid #2b3a54;padding-top:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="color:#90caf9;">💬 Review Comments & Annotations</strong>
              ${role !== 'Viewer' ? `<button onclick="document.getElementById('newCommentForm_${paneId}').style.display='block';this.style.display='none';" style="background:#2e7d32;border:none;padding:2px 8px;font-size:11px;color:white;border-radius:3px;">+ Add Comment</button>` : ''}
            </div>
  `;
  
  if (role !== 'Viewer') {
    html += `
            <div id="newCommentForm_${paneId}" style="display:none;background:#1e293b;border:1px solid #334155;border-radius:4px;padding:8px;margin-bottom:10px;">
              <div style="margin-bottom:6px;">
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">Highlighted text in document (optional):</label>
                <div style="display:flex;gap:4px;">
                  <input type="text" id="newCommentHighlight_${paneId}" placeholder="Highlight phrase..." style="flex:1;font-size:11px;padding:3px;background:#0f172a;border-color:#334155;">
                  <button onclick="document.getElementById('newCommentHighlight_${paneId}').value = window.getSelectedTextForReview('${paneId}');" style="padding:2px 6px;font-size:11px;background:#475569;border:none;" title="Grab currently selected text inside document">Grab Selection</button>
                </div>
              </div>
              <div style="margin-bottom:6px;">
                <textarea id="newCommentText_${paneId}" placeholder="Enter comment..." style="width:100%;height:50px;font-size:12px;background:#0f172a;border-color:#334155;box-sizing:border-box;resize:vertical;"></textarea>
              </div>
              <div style="display:flex;justify-content:flex-end;gap:5px;">
                <button onclick="document.getElementById('newCommentForm_${paneId}').style.display='none';window.renderReviewPanelForFile('${filePath.replace(/'/g, "\\'")}')" style="font-size:11px;background:#475569;border:none;padding:2px 8px;">Cancel</button>
                <button onclick="window.submitReviewComment('${paneId}', '${filePath.replace(/'/g, "\\'")}')" style="font-size:11px;background:#2563eb;border:none;padding:2px 8px;">Submit</button>
              </div>
            </div>
    `;
  }
  
  if (comments.length === 0) {
    html += `<div style="color:#666;font-style:italic;padding:5px 0;">No comments on this file yet.</div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
    comments.forEach(comment => {
      let highlightHtml = comment.highlight ? `<div style="background:rgba(234, 179, 8, 0.15);border-left:3px solid #eab308;padding:2px 6px;font-size:11px;font-family:Consolas,monospace;margin-bottom:4px;color:#eab308;">"${esc(comment.highlight)}"</div>` : '';
      
      let deleteBtn = (role === 'Admin' || (role === 'Reviewer' && comment.author === 'Reviewer')) ? 
        `<button onclick="window.deleteReviewComment('${filePath.replace(/'/g, "\\'")}', '${comment.id}')" style="background:transparent;border:none;color:#f87171;font-size:11px;cursor:pointer;padding:0;" title="Delete Comment">❌ Delete</button>` : '';
      
      let repliesHtml = '';
      if (comment.replies && comment.replies.length > 0) {
        repliesHtml += `<div style="margin-left:15px;margin-top:6px;border-left:2px solid #334155;padding-left:8px;display:flex;flex-direction:column;gap:4px;">`;
        comment.replies.forEach(reply => {
          repliesHtml += `
            <div style="background:#1e293b;padding:4px 6px;border-radius:3px;font-size:11px;">
              <span style="font-weight:bold;color:#a855f7;">${esc(reply.author)}:</span>
              <span>${esc(reply.text)}</span>
            </div>
          `;
        });
        repliesHtml += `</div>`;
      }
      
      let replyFormHtml = '';
      if (role !== 'Viewer') {
        replyFormHtml += `
          <div style="margin-left:15px;margin-top:4px;display:flex;gap:4px;">
            <input type="text" id="replyInput_${comment.id}_${paneId}" placeholder="Reply..." style="flex:1;font-size:11px;padding:2px;background:#0f172a;border-color:#334155;">
            <button onclick="window.submitCommentReply('${paneId}', '${filePath.replace(/'/g, "\\'")}', '${comment.id}')" style="font-size:11px;padding:2px 6px;background:#2563eb;border:none;">Reply</button>
          </div>
        `;
      }
      
      html += `
        <div id="comment_item_${comment.id}" onclick="window.focusCommentHighlight('${comment.id}')" style="background:#1e293b;border:1px solid #334155;border-radius:4px;padding:6px;cursor:pointer;transition:box-shadow 0.2s;">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;margin-bottom:4px;">
            <span><strong style="color:#60a5fa;">${esc(comment.author)}:</strong></span>
            <div style="display:flex;gap:10px;align-items:center;">
              <span>${new Date(comment.created_at).toLocaleTimeString()}</span>
              ${deleteBtn}
            </div>
          </div>
          ${highlightHtml}
          <div style="color:#e2e8f0;font-size:12px;margin-bottom:4px;">${esc(comment.text)}</div>
          ${repliesHtml}
          ${replyFormHtml}
        </div>
      `;
    });
    html += `</div>`;
  }
  
  html += `
          </div>
        </div>
      </details>
    </div>
  `;
  
  return html;
};

// INIT
const roleSel = document.getElementById('roleSelector');
if (roleSel) {
  roleSel.value = localStorage.getItem('user_role') || 'Viewer';
  roleSel.addEventListener('change', function() {
    localStorage.setItem('user_role', this.value);
    if (window._viewerOpenFilePath) {
      openFileInViewer(window._viewerOpenFilePath);
    }
  });
}
window.getCurrentRole = function() {
  return document.getElementById('roleSelector')?.value || 'Viewer';
};

let treeRoot = document.getElementById('tree');
treeRoot.innerHTML = '';
window._activeTypeFilter = null;
window.renderTypeFilters();
window._ringNames = JSON.parse(localStorage.getItem('sdd_ring_names') || '{}');
window._nodeRings = JSON.parse(localStorage.getItem('sdd_node_rings') || '{}');
renderTree(buildTree(), treeRoot);
if (window.updateNoteBadges) window.updateNoteBadges();
if (window.renderRecentHistory) window.renderRecentHistory();
nav('explorer');
