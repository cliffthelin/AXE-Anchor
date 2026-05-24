
const axeDataElement = document.getElementById('axe-data');
const axeDataRaw = axeDataElement ? axeDataElement.textContent : '{}';
const axeDataJson = axeDataRaw.trim()
  ? new TextDecoder().decode(Uint8Array.from(atob(axeDataRaw.trim()), c => c.charCodeAt(0)))
  : '{}';
const axeData = JSON.parse(axeDataJson);

const DATA = axeData.DATA || { documents: {} };
const VALIDATION_RULES = axeData.RULES || { rules: [] };
const VALIDATION_REPORT = axeData.REPORT || { violations: [], status: 'PASS' };
const CONFIG = axeData.CONFIG || {};
const REVIEWS_DB = axeData.REVIEWS || {};
const BUILDER_TIMEOUT_MS = 15 * 60 * 1000;

// ==========================================
// LAZY CHUNK LOADING
// ==========================================
const _chunkIndex = DATA._chunk_index || {};
const _chunkFiles = DATA._chunk_files || [];
const _chunksDir = DATA._chunks_dir || 'chunks';
const _loadedChunks = {};  // chunk_number -> {path: {content, ...}}
const _loadingChunks = {}; // chunk_number -> Promise

function getChunkUrl(chunkNum) {
  if (window.location.protocol === 'file:') {
    return null; // file:// cannot load external files
  }
  return '/' + _chunksDir + '/' + _chunkFiles[chunkNum];
}

async function loadChunk(chunkNum) {
  if (_loadedChunks[chunkNum]) return _loadedChunks[chunkNum];
  if (_loadingChunks[chunkNum]) return _loadingChunks[chunkNum];

  let url = getChunkUrl(chunkNum);
  if (!url) return null; // file:// mode — data should already be embedded

  let promise = fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(chunkData => {
      _loadedChunks[chunkNum] = chunkData;
      for (let path in chunkData) {
        if (DATA.documents[path]) {
          Object.assign(DATA.documents[path], chunkData[path]);
        }
      }
      delete _loadingChunks[chunkNum];
      return chunkData;
    })
    .catch(err => {
      console.warn('[Chunk] Failed to load chunk ' + chunkNum + ':', err.message);
      delete _loadingChunks[chunkNum];
      return null;
    });

  _loadingChunks[chunkNum] = promise;
  return promise;
}

// Load document content on demand. Returns a promise.
window.ensureDocContent = async function(filePath) {
  let doc = DATA.documents[filePath];
  if (!doc) return null;
  // Already has content loaded
  if (doc.content !== undefined || doc.base64 !== undefined || doc.rows !== undefined) return doc;
  // Find which chunk has it
  let chunkNum = _chunkIndex[filePath];
  if (chunkNum === undefined) return doc; // No content available
  await loadChunk(chunkNum);
  return DATA.documents[filePath];
};

// Preload all chunks in background (non-blocking)
let _allChunksLoaded = false;
let _chunksLoadedCount = 0;
let _allChunksPromise = null;
window._allChunksLoaded = false;

function preloadChunksInBackground() {
  // Load ALL chunks immediately via Web Worker (off main thread, non-blocking)
  let remaining = _chunkFiles.length;
  if (remaining === 0) {
    _allChunksLoaded = true;
    window._allChunksLoaded = true;
    return;
  }
  for (let i = 0; i < _chunkFiles.length; i++) {
    loadChunk(i).then(() => {
      remaining--;
      _chunksLoadedCount++;
      let pct = Math.round((_chunksLoadedCount / _chunkFiles.length) * 100);
      let indicator = document.getElementById('chunkLoadIndicator');
      if (indicator) {
        if (remaining <= 0) {
          indicator.style.display = 'none';
          _allChunksLoaded = true;
          window._allChunksLoaded = true;
        } else {
          indicator.textContent = `Loading data: ${pct}%`;
        }
      } else if (remaining <= 0) {
        _allChunksLoaded = true;
        window._allChunksLoaded = true;
      }
    });
  }
}

// Wait for all content to be available (for search)
window.ensureAllContentLoaded = function() {
  if (_allChunksLoaded) return Promise.resolve();
  // Return a promise that resolves when all chunks are done
  return new Promise(resolve => {
    let check = setInterval(() => {
      if (_allChunksLoaded || _chunksLoadedCount >= _chunkFiles.length) {
        clearInterval(check);
        _allChunksLoaded = true;
        window._allChunksLoaded = true;
        resolve();
      }
    }, 100);
  });
};

if (_chunkFiles.length > 0 && window.location.protocol !== 'file:') {
  preloadChunksInBackground();
} else {
  // file:// mode or no chunks — data is already fully embedded
  _allChunksLoaded = true;
  window._allChunksLoaded = true;
}

async function probeBuilderServer(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(url + '/watch-id', { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}

async function resolveBuilderServerUrl() {
  if (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file://')) {
    return window.location.origin;
  }

  const candidates = [
    CONFIG.builder_server_url,
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'http://127.0.0.1:8768',
    'http://localhost:8768'
  ].filter(Boolean);

  for (const url of candidates) {
    if (await probeBuilderServer(url)) return url;
  }
  return null;
}


window.runBuilder = async function() {
  const btn = document.getElementById('btnRunBuilder');
  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Building...';
  btn.style.opacity = '0.7';

  try {
    const host = await resolveBuilderServerUrl();
    if (!host) {
      throw new Error('Builder server not reachable');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BUILDER_TIMEOUT_MS);
    const res = await fetch(host + '/run-builder', { method: 'POST', signal: controller.signal });
    clearTimeout(timeoutId);
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
    const appRoot = CONFIG.app_root || 'the AXE-Anchor folder';
    alert('Failed to run builder: ' + err.message + '\n\nLaunch AXE-Anchor with the builder orchestrator, then use the page from that server:\ncd ' + appRoot + '\npython3 builder.py\n\nIt will build, start the local server, and open:\nhttp://127.0.0.1:8000/');
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
