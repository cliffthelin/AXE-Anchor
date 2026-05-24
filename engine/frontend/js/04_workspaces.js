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

      <div style="background:var(--panel); border:1px solid var(--border); border-radius:6px; padding:15px; margin-bottom:25px;">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap;">
          <div>
            <h3 style="margin:0 0 6px; color:#fff; font-size:16px;">🗄️ Database Schema Gate & Dependency Hub</h3>
            <div id="dbVaultStatus" style="font-size:12px;color:#888;">Checking vault...</div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
            <button onclick="installDbDriverPlugin()" style="background:#065f46; border:1px solid #047857; color:#d1fae5; font-size:11px; padding:6px 12px; border-radius:4px;">Install Python Drivers</button>
            <button onclick="refreshDbVaultStatus()" style="background:#2d2d2d; border:1px solid #444; color:#38bdf8; font-size:11px; padding:6px 12px; border-radius:4px;">Refresh</button>
          </div>
        </div>
        <pre id="dbDriverInstallResult" style="display:none; margin:12px 0 0; max-height:160px; overflow:auto; white-space:pre-wrap; background:#09090b; border:1px solid #27272a; color:#d4d4d8; padding:10px; border-radius:4px; font-size:11px;"></pre>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-top:12px;">
          <div style="background:#18181b; border:1px solid #27272a; border-radius:4px; padding:10px;">
            <div style="font-size:12px;font-weight:bold;color:#e4e4e7;margin-bottom:6px;">Vault Gate</div>
            <input id="dbVaultGatePassword" type="password" placeholder="New vault password" style="width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;padding:6px;border-radius:3px;margin-bottom:6px;">
            <button onclick="setDbVaultGate()" style="background:#007acc;border:none;color:#fff;padding:6px 10px;border-radius:3px;font-size:11px;">Set / Rotate Gate</button>
          </div>
          <div style="background:#18181b; border:1px solid #27272a; border-radius:4px; padding:10px;">
            <div style="font-size:12px;font-weight:bold;color:#e4e4e7;margin-bottom:6px;">Store Connection</div>
            <input id="dbConnName" placeholder="Connection name" style="width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;padding:5px;border-radius:3px;margin-bottom:5px;">
            <select id="dbConnDriver" style="width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;padding:5px;border-radius:3px;margin-bottom:5px;">
              <option value="sqlite">SQLite</option>
              <option value="sqlserver">SQL Server</option>
              <option value="postgres">Postgres</option>
              <option value="mysql">MySQL</option>
            </select>
            <input id="dbConnDatabase" placeholder="Database / SQLite path" style="width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;padding:5px;border-radius:3px;margin-bottom:5px;">
            <input id="dbConnHost" placeholder="Host" style="width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;padding:5px;border-radius:3px;margin-bottom:5px;">
            <input id="dbConnUser" placeholder="Username" style="width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;padding:5px;border-radius:3px;margin-bottom:5px;">
            <input id="dbConnPassword" type="password" placeholder="Database password" style="width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;padding:5px;border-radius:3px;margin-bottom:5px;">
            <input id="dbVaultPasswordStore" type="password" placeholder="Vault password" style="width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;padding:5px;border-radius:3px;margin-bottom:6px;">
            <button onclick="storeDbConnection()" style="background:#10b981;border:none;color:#fff;padding:6px 10px;border-radius:3px;font-size:11px;">Encrypt & Store</button>
          </div>
          <div style="background:#18181b; border:1px solid #27272a; border-radius:4px; padding:10px;">
            <div style="font-size:12px;font-weight:bold;color:#e4e4e7;margin-bottom:6px;">Schema Check</div>
            <select id="dbSchemaConnection" style="width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;padding:5px;border-radius:3px;margin-bottom:5px;"></select>
            <input id="dbVaultPasswordCheck" type="password" placeholder="Vault password" style="width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;padding:5px;border-radius:3px;margin-bottom:6px;">
            <button onclick="checkDbSchema()" style="background:#7c3aed;border:none;color:#fff;padding:6px 10px;border-radius:3px;font-size:11px;">Check Schema & Notify</button>
            <div id="dependencyNotifications" style="font-size:11px;color:#aaa;margin-top:8px;max-height:100px;overflow:auto;"></div>
          </div>
        </div>
      </div>

      <!-- Folder and File Filters -->
      <div style="background:var(--panel); border:1px solid var(--border); border-radius:6px; padding:15px; margin-bottom:25px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; color:#fff; font-size:16px; display:flex; align-items:center; gap:8px;">📂 Folder and File Filters</h3>
          <div style="display:flex; gap:8px;">
            <button onclick="window.rebuildWithCurrentFilters()" style="background:#1e40af; border:1px solid #2563eb; color:#dbeafe; font-size:11px; padding:5px 10px; border-radius:4px; cursor:pointer;">🔄 Rebuild with current filters</button>
            <button onclick="window.resetGraphFilters()" style="background:#2d2d2d; border:1px solid #444; color:#f87171; font-size:11px; padding:5px 10px; border-radius:4px; cursor:pointer;">Reset All</button>
          </div>
        </div>
        <p style="color:#aaa; font-size:12px; margin:0 0 15px;">Control which folders and file types appear in the Graph view. Changes apply immediately and persist across sessions.</p>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
          <!-- Folder Tree Selector -->
          <div style="background:#18181b; border:1px solid #27272a; border-radius:4px; padding:12px; max-height:400px; overflow-y:auto;">
            <div style="font-weight:bold; font-size:12px; color:#e4e4e7; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
              <span>📂 Folder Visibility</span>
              <span style="font-size:10px; color:#888;">Click to toggle</span>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
              <button onclick="window.graphFolderSelectAll(true)" style="background:#064e3b; border:1px solid #047857; color:#a7f3d0; font-size:10px; padding:3px 8px; border-radius:3px; cursor:pointer;">All On</button>
              <button onclick="window.graphFolderSelectAll(false)" style="background:#7f1d1d; border:1px solid #b91c1c; color:#fecaca; font-size:10px; padding:3px 8px; border-radius:3px; cursor:pointer;">All Off</button>
            </div>
            <div id="graphFolderTree" style="font-size:12px; color:#d4d4d8;"></div>
          </div>

          <!-- File Type Filter -->
          <div style="background:#18181b; border:1px solid #27272a; border-radius:4px; padding:12px;">
            <div style="font-weight:bold; font-size:12px; color:#e4e4e7; margin-bottom:8px;">📄 File Type Visibility</div>
            <p style="font-size:11px; color:#888; margin:0 0 10px;">Toggle file types to include/exclude from the graph.</p>
            <div id="graphTypeFilterList" style="display:flex; flex-direction:column; gap:6px;"></div>
            <div style="border-top:1px solid #333; margin-top:12px; padding-top:10px;">
              <div style="font-size:11px; color:#aaa; margin-bottom:6px; font-weight:bold;">Add Custom Extension Filter:</div>
              <div style="display:flex; gap:6px;">
                <input id="graphCustomExtInput" placeholder=".log, .tmp, .bak" style="flex:1; background:#111; color:#fff; border:1px solid #444; padding:5px; border-radius:3px; font-size:11px;">
                <button onclick="window.addGraphCustomExtFilter()" style="background:#007acc; border:none; color:#fff; font-size:11px; padding:5px 10px; border-radius:3px; cursor:pointer;">Add</button>
              </div>
              <div id="graphCustomExtList" style="margin-top:8px; display:flex; flex-wrap:wrap; gap:4px;"></div>
            </div>
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
  refreshDbVaultStatus();
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
  } catch (e) {
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

async function refreshDbVaultStatus() {
  const statusEl = document.getElementById('dbVaultStatus');
  const sel = document.getElementById('dbSchemaConnection');
  const notesEl = document.getElementById('dependencyNotifications');
  if (!statusEl) return;
  if (location.protocol === 'file:' || window.isServerMode === false) {
    statusEl.textContent = 'Start the AXE-Anchor server to use direct database schema checks.';
    return;
  }
  try {
    const [vaultRes, notesRes] = await Promise.all([
      fetch('/api/db-vault/status'),
      fetch('/api/dependency-hub/notifications')
    ]);
    const vault = await vaultRes.json();
    statusEl.textContent = vault.configured
      ? `Vault configured. ${vault.connections.length} stored connection(s).`
      : 'Vault gate is not configured.';
    if (!vault.db_actions_enabled) {
      statusEl.textContent += ' Main app password required before DB actions are enabled.';
    }
    if (sel) {
      sel.innerHTML = (vault.connections || []).map(c =>
        `<option value="${esc(c.name)}">${esc(c.name)} (${esc(c.driver || 'unknown')})</option>`
      ).join('');
    }
    if (notesEl && notesRes.ok) {
      const notes = await notesRes.json();
      const list = (notes.notifications || []).slice(0, 5);
      notesEl.innerHTML = list.length
        ? list.map(n => `<div style="border-top:1px solid #333;padding:4px 0;"><b>${esc(n.connection || '')}</b>: ${esc(n.message || '')}<br><span style="color:#666;">${esc(n.created_at || '')}</span></div>`).join('')
        : '<span style="color:#666;">No dependency notifications.</span>';
    }
  } catch (e) {
    statusEl.textContent = 'Database vault status unavailable: ' + e.message;
  }
}

async function installDbDriverPlugin() {
  const out = document.getElementById('dbDriverInstallResult');
  if (location.protocol === 'file:' || window.isServerMode === false) {
    alert('Start the AXE-Anchor server to install Python database drivers.');
    return;
  }
  if (!confirm('Install optional Python database driver packages into the Python environment running AXE-Anchor?')) {
    return;
  }
  if (out) {
    out.style.display = 'block';
    out.textContent = 'Installing Python database drivers...';
  }
  try {
    const res = await fetch('/api/db-vault/install-drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    const parts = [
      data.message || data.status,
      data.python ? `Python: ${data.python}` : '',
      data.script ? `Script: ${data.script}` : '',
      data.stdout ? `stdout:\n${data.stdout}` : '',
      data.stderr ? `stderr:\n${data.stderr}` : ''
    ].filter(Boolean);
    if (out) out.textContent = parts.join('\n\n');
    if (data.status === 'error') {
      alert(data.message || 'Database driver installation failed.');
    }
    refreshDbVaultStatus();
  } catch (e) {
    if (out) out.textContent = 'Database driver installation request failed: ' + e.message;
    alert('Database driver installation request failed: ' + e.message);
  }
}

async function setDbVaultGate() {
  const pwd = document.getElementById('dbVaultGatePassword')?.value || '';
  if (!pwd) return alert('Enter a vault password.');
  const res = await fetch('/api/db-vault/set-gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pwd })
  });
  const data = await res.json();
  alert(data.message || data.status);
  document.getElementById('dbVaultGatePassword').value = '';
  refreshDbVaultStatus();
}

async function storeDbConnection() {
  const vaultPassword = document.getElementById('dbVaultPasswordStore')?.value || '';
  const driver = document.getElementById('dbConnDriver')?.value || 'sqlite';
  const database = document.getElementById('dbConnDatabase')?.value || '';
  const payload = {
    vault_password: vaultPassword,
    connection: {
      name: document.getElementById('dbConnName')?.value || '',
      driver,
      host: document.getElementById('dbConnHost')?.value || '',
      database,
      sqlite_path: driver === 'sqlite' ? database : '',
      username: document.getElementById('dbConnUser')?.value || '',
      password: document.getElementById('dbConnPassword')?.value || ''
    }
  };
  const res = await fetch('/api/db-vault/store-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  alert(data.message || data.status);
  document.getElementById('dbVaultPasswordStore').value = '';
  document.getElementById('dbConnPassword').value = '';
  refreshDbVaultStatus();
}

async function checkDbSchema() {
  const connectionName = document.getElementById('dbSchemaConnection')?.value || '';
  const vaultPassword = document.getElementById('dbVaultPasswordCheck')?.value || '';
  if (!connectionName || !vaultPassword) return alert('Choose a connection and enter the vault password.');
  const res = await fetch('/api/db-vault/check-schema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connection_name: connectionName, vault_password: vaultPassword })
  });
  const data = await res.json();
  if (data.status === 'error') return alert(data.message || 'Schema check failed.');
  alert(data.changed ? 'Schema changed. Dependency notifications were created.' : 'Schema checked. No changes detected.');
  document.getElementById('dbVaultPasswordCheck').value = '';
  refreshDbVaultStatus();
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
              ${hasGit ? `<button onclick="syncWorkspace('${ws.name}')" style="background:#064e3b; border:1px solid #047857; color:#a7f3d0; font-size:11px; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; transition: background 0.2s;">🔎 Check Git Candidate</button>` : ''}
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
      const enabled = proj.enabled !== false;
      const enabledBadge = enabled
        ? '<span style="background:#064e3b;color:#a7f3d0;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:bold;text-transform:uppercase;margin-left:8px;">Enabled</span>'
        : '<span style="background:#3f3f46;color:#a1a1aa;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:bold;text-transform:uppercase;margin-left:8px;">Disabled</span>';
      return `
                    <div style="background:#27272a; border:1px solid ${enabled ? '#3f3f46' : '#52525b'}; border-radius:4px; padding:8px; display:flex; justify-content:space-between; align-items:center; opacity:${enabled ? '1' : '0.68'};">
                      <div style="flex:1;">
                        <div style="display:flex; align-items:center;">
                          <strong style="color:#f4f4f5; font-size:13px;">${isGit ? '🐱' : '📁'} ${proj.name}</strong>
                          ${enabledBadge}
                          ${badge}
                        </div>
                        <code style="display:block; margin-top:2px; font-size:11px; color:#a1a1aa;">Path: ${proj.path}</code>
                        ${isGit ? `<code style="display:block; font-size:11px; color:#71717a;">Repo: ${proj.github_repo} (${proj.github_branch || 'main'})</code>` : ''}
                      </div>
                      ${window.isServerMode ? `<button onclick="window.removeProjectFromWorkspace('${ws.name.replace(/'/g, "\\'")}', '${proj.name.replace(/'/g, "\\'")}')" style="background:#451a03;border:1px solid #78350f;color:#fde68a;font-size:10px;padding:3px 8px;border-radius:3px;cursor:pointer;white-space:nowrap;" title="Remove from workspace (files stay intact)">✕ Remove</button>` : ''}
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
  const enabled = proj ? (proj.enabled !== false) : true;

  row.innerHTML = `
    <!-- Top row: Name, Type and Delete -->
    <div style="display:flex; gap:8px; align-items:center;">
      <input type="text" class="proj-name-input" placeholder="Project Display Name" value="${name}" style="flex:2; background:#18181b; border:1px solid #52525b; color:white; padding:5px; border-radius:3px; font-size:12px;">
      <select class="proj-type-select" onchange="window.toggleProjRowFields('${id}')" style="flex:1.5; background:#18181b; border:1px solid #52525b; color:white; padding:5px; border-radius:3px; font-size:12px;">
        <option value="local_folder" ${type === 'local_folder' ? 'selected' : ''}>📁 Local Folder</option>
        <option value="github_repo" ${type === 'github_repo' ? 'selected' : ''}>🐱 GitHub Repo</option>
      </select>
      <label style="display:flex;align-items:center;gap:4px;color:#d4d4d8;font-size:11px;white-space:nowrap;">
        <input type="checkbox" class="proj-enabled-input" ${enabled ? 'checked' : ''} style="margin:0;">
        Enabled
      </label>
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
      path: pPath,
      enabled: row.querySelector('.proj-enabled-input')?.checked !== false
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
  } catch (e) {
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
  } catch (e) {
    alert(e.message);
  }
}

async function syncWorkspace(name) {
  const grid = document.getElementById('workspacesGrid');
  if (grid) {
    grid.innerHTML = `<div style="color:#38bdf8; text-align:center; padding:40px; grid-column:span 2;"><span style="display:inline-block; animation:spin 1s linear infinite; margin-right:8px;">🔄</span> Checking Git candidate for workspace "${esc(name)}"... Original folders will not be changed.</div>`;
  }
  try {
    const res = await fetch('/api/workspaces/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    const staged = (data.staged_candidates || []).map(c => `${c.status}: ${c.candidate_path || c.message}`).join('\n');
    alert('Git candidate check: ' + data.message + (staged ? '\n\n' + staged : ''));
    fetchWorkspacesData();
  } catch (e) {
    alert('Sync failed: ' + e.message);
    fetchWorkspacesData();
  }
}

async function syncAllWorkspaces() {
  const btn = document.getElementById('btnSyncAllWorkspaces');
  if (btn) btn.disabled = true;
  const grid = document.getElementById('workspacesGrid');
  if (grid) {
    grid.innerHTML = `<div style="color:#38bdf8; text-align:center; padding:40px; grid-column:span 2;"><span style="display:inline-block; animation:spin 1s linear infinite; margin-right:8px;">🔄</span> Checking Git candidates for all workspaces... Original folders will not be changed.</div>`;
  }
  try {
    const res = await fetch('/api/workspaces/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync_all: true })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    const staged = (data.staged_candidates || []).map(c => `${c.status}: ${c.candidate_path || c.message}`).join('\n');
    alert('Git candidate check: ' + data.message + (staged ? '\n\n' + staged : ''));
    fetchWorkspacesData();
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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

  // Gather every document in alphabetical order. Large workspaces are rendered
  // in small batches so the view stays responsive without hiding documents.
  const filePaths = Object.keys(DATA.documents)
    .sort()
    .filter(fp => !DATA.documents[fp].base64);
  window._compendiumFilePaths = filePaths;

  let tocHtml = '';

  filePaths.forEach((fp, idx) => {
    const doc = DATA.documents[fp];
    const name = fp.split('/').pop();
    const cleanId = 'comp-doc-' + idx;

    // Render TOC item
    tocHtml += `
      <div class="compendium-toc-item" id="toc-${cleanId}" onclick="window.scrollToCompendiumSection('${cleanId}')" title="${esc(fp)}">
        📄 ${esc(name)}
      </div>
    `;
  });

  tocList.innerHTML = tocHtml;
  reader.innerHTML = `
    <div id="compendiumLoadStatus" style="padding:10px;background:#1f2937;border:1px solid #374151;border-radius:4px;color:#d6dde8;font-size:12px;margin-bottom:12px;">
      Loading 0 of ${filePaths.length} documents...
    </div>
  `;

  let nextIndex = 0;
  const batchSize = 25;
  const renderBatch = () => {
    const end = Math.min(nextIndex + batchSize, filePaths.length);
    let readerHtml = '';
    for (let idx = nextIndex; idx < end; idx++) {
      const fp = filePaths[idx];
      const doc = DATA.documents[fp];
      const name = fp.split('/').pop();
      const cleanId = 'comp-doc-' + idx;

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
    }

    reader.insertAdjacentHTML('beforeend', readerHtml);
    nextIndex = end;

    const status = document.getElementById('compendiumLoadStatus');
    if (status) {
      if (nextIndex < filePaths.length) {
        status.textContent = `Loading ${nextIndex} of ${filePaths.length} documents...`;
      } else {
        status.remove();
      }
    }

    window.updateCompendiumScrollSpy();
    if (nextIndex < filePaths.length) {
      setTimeout(renderBatch, 0);
    }
  };

  setTimeout(renderBatch, 0);

  // Setup scroll spy and progress bar
  setTimeout(() => {
    window.updateCompendiumScrollSpy();
  }, 50);
}

window.scrollToCompendiumSection = function (sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};

window.filterCompendiumTOC = function () {
  const q = document.getElementById('compendiumSearch').value.toLowerCase().trim();
  const filePaths = window._compendiumFilePaths || Object.keys(DATA.documents).sort();

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

window.updateCompendiumScrollSpy = function () {
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
  for (let k in DATA.documents) {
    if (window._activeTypeFilter && DATA.documents[k].type !== window._activeTypeFilter) {
      continue;
    }
    let p = k.split('/'), n = root;
    p.forEach((x, i) => { if (!n[x]) n[x] = {}; if (i === p.length - 1) n[x]._f = true; n = n[x]; });
  }
  (DATA.workspace_placeholders || []).forEach(ws => {
    const label = ws.name || ws.id || 'Workspace';
    if (!root[label]) root[label] = {};
    root[label]._workspacePlaceholder = ws;
  });
  return root;
}

function getActiveWorkspaceLabel() {
  const activeId = DATA.active_workspace_id || DATA.build_meta?.active_workspace_id || '';
  const workspaces = (typeof CONFIG !== 'undefined' && CONFIG.workspaces) ? CONFIG.workspaces : [];
  const active = workspaces.find(ws => ws.id === activeId || ws.name === activeId);
  return active ? (active.name || active.id) : activeId;
}

function getFolderScope(folderPath) {
  const parts = String(folderPath || '').split('/').filter(Boolean);
  const workspaces = (typeof CONFIG !== 'undefined' && CONFIG.workspaces) ? CONFIG.workspaces : [];
  if (!parts.length || parts[0] === '__platform__') {
    return {
      parts: [],
      groupType: 'Platform',
      title: 'AXE Platform',
      workspace: null,
      sourceName: '',
      source: null,
      sourceKind: 'platform'
    };
  }
  const workspace = workspaces.find(ws => ws.name === parts[0] || ws.id === parts[0]) || null;
  const sourceName = parts[1] || '';
  let source = null;
  let sourceKind = 'workspace';
  if (workspace && sourceName) {
    const projects = Array.isArray(workspace.projects) ? workspace.projects : [];
    source = projects.find(p => p.name === sourceName) || null;
    if (source) sourceKind = 'project';
    const supporting = Array.isArray(workspace.supporting_resources)
      ? workspace.supporting_resources
      : (workspace.supporting_resources ? [workspace.supporting_resources] : []);
    const support = supporting.find(r => r && r.name === sourceName);
    if (!source && support) {
      source = support;
      sourceKind = 'supporting resource';
    }
    if (!source && workspace.context_folder && workspace.context_folder.name === sourceName) {
      source = workspace.context_folder;
      sourceKind = 'context folder';
    }
  }
  const groupType = source ? (sourceKind === 'project' ? 'Project' : 'Workspace Resource') : 'Workspace';
  return { parts, groupType, title: parts[parts.length - 1] || parts[0], workspace, sourceName, source, sourceKind };
}

function getFolderPhysicalSuggestion(folderPath) {
  const scope = getFolderScope(folderPath);
  if (scope.groupType === 'Platform') {
    return (typeof CONFIG !== 'undefined' && CONFIG.app_root) ? CONFIG.app_root : '';
  }
  const tail = scope.parts.slice(2).join('/');
  let base = '';
  if (scope.source && scope.source.path) {
    base = scope.source.path;
  } else if (scope.workspace) {
    const firstEnabled = (scope.workspace.projects || []).find(p => p.enabled !== false && p.path);
    base = firstEnabled ? firstEnabled.path : (scope.workspace.context_folder?.path || '');
  }
  if (base && !base.startsWith('/') && typeof CONFIG !== 'undefined' && CONFIG.app_root) {
    base = [CONFIG.app_root, base === '.' ? '' : base].filter(Boolean).join('/');
  }
  return [base, tail].filter(Boolean).join('/').replace(/\/+/g, '/');
}

function folderReviewStats(folderPath) {
  const prefix = String(folderPath || '').replace(/\/+$/, '');
  const docKeys = Object.keys(DATA.documents || {}).filter(k => k === prefix || k.startsWith(prefix + '/'));
  const childFolders = new Set();
  let topLevelFiles = 0;
  docKeys.forEach(k => {
    const rest = k.slice(prefix.length).replace(/^\/+/, '');
    const parts = rest.split('/').filter(Boolean);
    if (parts.length > 1) childFolders.add(parts[0]);
    if (parts.length === 1) topLevelFiles++;
  });
  return {
    docKeys,
    childFolders: [...childFolders].sort(),
    topLevelFiles,
    nestedFiles: Math.max(0, docKeys.length - topLevelFiles)
  };
}

function folderAgentPrompt(folderPath) {
  const scope = getFolderScope(folderPath);
  const physical = getFolderPhysicalSuggestion(folderPath);
  return [
    `You are helping integrate or maintain a ${scope.groupType} group in AXE-Anchor.`,
    `Group scope: ${folderPath}`,
    `Group kind: ${scope.groupType}`,
    `Suggested local path: ${physical || '(choose a path under the workspace/project root)'}`,
    ``,
    `Inspect the folder/repository, identify install steps, runtime dependencies, test commands, documentation sources, support links, and maintenance risks.`,
    `If this is a GitHub project, verify clone/install instructions, suggest safe setup commands, and list training documents or websites that should be downloaded or linked as source material for using and troubleshooting it.`,
    `Do not replace existing workspace content without user approval. Prefer staged/candidate installs and report what changed.`
  ].join('\n');
}

function getActiveWorkspaceConfig() {
  const activeId = DATA.active_workspace_id || DATA.build_meta?.active_workspace_id || '';
  return (CONFIG.workspaces || []).find(w => w.id === activeId || w.name === activeId) || (CONFIG.workspaces || [])[0];
}

function defaultExistingFolderName(path) {
  return String(path || '').replace(/\/+$/, '').split('/').filter(Boolean).pop() || 'Existing Folder';
}

function platformGroupPath() {
  return '__platform__';
}

function workspaceGroupPath(ws) {
  return ws ? (ws.name || ws.id || '') : '';
}

function projectGroupPath(ws, project) {
  return [workspaceGroupPath(ws), project?.name || ''].filter(Boolean).join('/');
}

function groupLink(label, path, extra = '') {
  return `<button class="assoc-back-btn" style="padding:4px 8px;font-size:11px;" onclick="window.openGroupManagement('${String(path).replace(/'/g, "\\'")}')">${esc(label)}</button>${extra}`;
}

function renderGroupParentage(scope) {
  const workspaces = (CONFIG.workspaces || []);
  const placeholders = DATA.workspace_placeholders || [];
  if (scope.groupType === 'Platform') {
    const placeholderIds = new Set(placeholders.map(ws => ws.id || ws.name));
    const configured = workspaces.map(ws => {
      const label = ws.name || ws.id || 'Workspace';
      const active = ws.id === DATA.active_workspace_id || ws.name === DATA.active_workspace_id;
      if (active || !placeholderIds.has(ws.id || ws.name)) {
        return groupLink(label, workspaceGroupPath(ws), active ? ' <span class="workspace-active-pill">ACTIVE</span>' : '');
      }
      return `<button class="assoc-back-btn" style="padding:4px 8px;font-size:11px;color:#d1d5db;" onclick="window.loadWorkspaceOnDemand('${String(ws.id || ws.name).replace(/'/g, "\\'")}')">${esc(label)} <span style="color:#888;">load</span></button>`;
    }).join('');
    const extraPlaceholders = placeholders.filter(ws => !workspaces.some(cfg => (cfg.id || cfg.name) === (ws.id || ws.name))).map(ws => {
      const label = ws.name || ws.id || 'Workspace';
      return `<button class="assoc-back-btn" style="padding:4px 8px;font-size:11px;color:#d1d5db;" onclick="window.loadWorkspaceOnDemand('${String(ws.id || ws.name).replace(/'/g, "\\'")}')">${esc(label)} <span style="color:#888;">load</span></button>`;
    }).join('');
    return `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">${configured || '<span style="color:var(--text-dim);font-size:12px;">No configured workspaces</span>'}${extraPlaceholders}</div>`;
  }
  if (scope.groupType === 'Workspace') {
    return `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">${groupLink('AXE Platform', platformGroupPath())}</div>`;
  }
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">${groupLink('AXE Platform', platformGroupPath())}${scope.workspace ? groupLink(scope.workspace.name || scope.workspace.id || 'Workspace', workspaceGroupPath(scope.workspace)) : ''}</div>`;
}

function renderGroupDownstream(scope) {
  if (scope.groupType === 'Workspace' && scope.workspace) {
    const projects = Array.isArray(scope.workspace.projects) ? scope.workspace.projects : [];
    return projects.map(p => groupLink(p.name || p.path || 'Project', projectGroupPath(scope.workspace, p))).join('') || '<span style="color:var(--text-dim);font-size:12px;">No projects configured</span>';
  }
  return '';
}

window.openGroupManagement = function (folderPath) {
  currentView = 'group-management';
  const L = document.getElementById('left'), R = document.getElementById('right'), resizer = document.getElementById('content-resizer');
  if (!L) return;
  if (R) R.style.display = 'none';
  if (resizer) resizer.style.display = 'none';
  L.style.width = '100%';
  L.style.padding = '15px';
  const scope = getFolderScope(folderPath);
  const stats = folderReviewStats(folderPath);
  const suggested = getFolderPhysicalSuggestion(folderPath);
  const nextName = scope.groupType === 'Platform' ? 'new-workspace' : (scope.groupType === 'Workspace' ? 'new-project' : 'new-subfolder');
  const suggestedChild = [suggested, nextName].filter(Boolean).join('/').replace(/\/+/g, '/');
  const prompt = folderAgentPrompt(folderPath);
  const title = scope.title || folderPath.split('/').pop() || folderPath;
  const workspaceName = scope.workspace ? scope.workspace.name : '';
  const downstream = renderGroupDownstream(scope);
  const addTargetLabel = scope.groupType === 'Platform' ? 'Workspace' : (scope.groupType === 'Workspace' ? 'Project' : 'Project subfolder');
  const showWorkspaceActions = scope.groupType === 'Platform';
  const showProjectActions = scope.groupType === 'Workspace';
  const showProjectSubfolderActions = scope.groupType === 'Project';
  L.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;color:var(--text);">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
        <div>
          <h2 style="margin:0;color:var(--text-bright);font-size:22px;">${esc(scope.groupType)} Group Management</h2>
          <div style="font-size:13px;color:var(--accent);margin-top:4px;">${esc(folderPath)}</div>
        </div>
        <button class="assoc-back-btn" onclick="nav('explorer')">Back to Explorer</button>
      </div>

      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:14px;">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px;">Parentage</div>
        ${renderGroupParentage(scope)}
        ${downstream ? `<div style="font-size:11px;color:var(--text-dim);margin:10px 0 6px;">Downstream Projects</div><div style="display:flex;gap:6px;flex-wrap:wrap;">${downstream}</div>` : ''}
      </div>

      <div style="margin-bottom:14px;">
        <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:14px;">
          <h3 style="margin:0 0 10px;color:var(--text-bright);font-size:15px;">🔍 Scope</h3>
          <div style="display:grid;grid-template-columns:160px 1fr;gap:6px;font-size:12px;">
            <div style="color:var(--text-dim);">Name</div><div>${esc(title)}</div>
            <div style="color:var(--text-dim);">Group kind</div><div style="font-weight:bold;color:var(--text-bright);">${esc(scope.groupType)}</div>
            <div style="color:var(--text-dim);">Workspace</div><div>${esc(workspaceName || 'Unknown')}</div>
            <div style="color:var(--text-dim);">Physical path</div><code style="color:var(--accent);background:var(--panel-dark);padding:3px 5px;border-radius:3px;word-break:break-all;white-space:normal;display:block;">${esc(suggested || 'No physical folder mapping found')}</code>
            <div style="color:var(--text-dim);">Physical files</div><div id="groupPhysicalFiles">Checking server...</div>
            <div style="color:var(--text-dim);">Top-level physical files</div><div id="groupPhysicalDirect">Checking server...</div>
            <div style="color:var(--text-dim);">Physical folders</div><div id="groupPhysicalFolders">Checking server...</div>
            <div style="color:var(--text-dim);">Indexed entries</div><div>${stats.docKeys.length}</div>
            <div style="color:var(--text-dim);">Top-level indexed entries</div><div>${stats.topLevelFiles}</div>
            <div style="color:var(--text-dim);">Nested indexed entries</div><div>${stats.nestedFiles}</div>
            <div style="color:var(--text-dim);">Indexed subgroups</div><div>${stats.childFolders.length ? stats.childFolders.map(esc).join(', ') : 'None detected'}</div>
          </div>
          <div id="groupServerNotice" style="margin-top:12px;padding:10px;background:#451a03;border:1px solid #78350f;border-radius:4px;display:none;">
            <div style="color:#fef3c7;font-size:12px;margin-bottom:8px;"><strong>⚠️ Server not running</strong> — Physical file stats and folder creation require the AXE-Anchor server.</div>
            <div style="font-size:11px;color:#888;margin-bottom:6px;">Run this in your terminal:</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <code id="serverStartCmd" style="flex:1;font-size:11px;color:#fde68a;background:#1c1917;padding:6px 8px;border-radius:3px;font-family:monospace;user-select:all;">${(typeof window.getServerStartCommand === "function") ? window.getServerStartCommand() : "python3 builder.py --serve"}</code>
              <button onclick="navigator.clipboard.writeText(document.getElementById('serverStartCmd').textContent);this.textContent='✓ Copied';setTimeout(()=>this.textContent='📋 Copy',1500)" style="background:#2d2d2d;border:1px solid #444;color:#38bdf8;font-size:10px;padding:4px 8px;border-radius:3px;cursor:pointer;white-space:nowrap;">📋 Copy</button>
            </div>
            <div style="font-size:10px;color:#78716c;margin-top:6px;">After starting the server, click <button onclick="window.recheckServerAndRefresh()" style="background:#d97706;border:none;color:#fff;font-size:10px;padding:3px 8px;border-radius:3px;cursor:pointer;">🔄 Re-check Server</button></div>
          </div>
        </div>
      </div>

      ${showWorkspaceActions ? `
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:14px;">
        <h3 style="margin:0 0 10px;color:var(--text-bright);font-size:15px;">🏗️ Add Platform</h3>
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Create a new platform with a default root path where workspaces and projects will be organized.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11px;color:var(--text-dim);display:block;margin-bottom:4px;">Platform Name</label>
            <input id="groupPlatformName" placeholder="e.g. Enterprise Services Platform" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;color:var(--text-dim);display:block;margin-bottom:4px;">Default Root Path</label>
            <input id="groupPlatformPath" placeholder="/path/to/platform/root" style="width:100%;box-sizing:border-box;">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
          <div>
            <label style="font-size:11px;color:var(--text-dim);display:block;margin-bottom:4px;">Description</label>
            <input id="groupPlatformDesc" placeholder="Brief description of this platform" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;color:var(--text-dim);display:block;margin-bottom:4px;">Default Workspace Path Pattern</label>
            <input id="groupPlatformWsPattern" placeholder="e.g. {root}/workspaces/{name}" value="{root}/{name}" style="width:100%;box-sizing:border-box;">
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
          <button onclick="window.addPlatformFromGroup()" style="background:#7c3aed;border:1px solid #8b5cf6;color:#ede9fe;font-weight:bold;padding:7px 12px;border-radius:4px;">Create Platform</button>
          <span id="groupPlatformStatus" style="font-size:11px;color:var(--text-dim);"></span>
        </div>
      </div>

      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:14px;">
        <h3 style="margin:0 0 10px;color:var(--text-bright);font-size:15px;">Add Workspace</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <input id="groupWorkspaceName" placeholder="Workspace display name">
          <input id="groupWorkspacePath" placeholder="Workspace root path" value="${esc(suggestedChild || '')}">
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
          <button onclick="window.addWorkspaceFromGroup()" style="background:#1d4ed8;border:1px solid #2563eb;color:#dbeafe;font-weight:bold;padding:7px 12px;border-radius:4px;">Add Workspace</button>
          <span id="groupWorkspaceStatus" style="font-size:11px;color:var(--text-dim);"></span>
        </div>
      </div>` : ''}

      ${showProjectActions ? `
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:14px;">
        <h3 style="margin:0 0 10px;color:var(--text-bright);font-size:15px;">Add Project from Existing Folder</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr 160px;gap:10px;align-items:end;">
          <div>
            <label style="font-size:11px;color:var(--text-dim);display:block;margin-bottom:4px;">Display name</label>
            <input id="groupExistingName" placeholder="Project display name" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;color:var(--text-dim);display:block;margin-bottom:4px;">Existing local path</label>
            <input id="groupExistingPath" placeholder="/absolute/path or relative/path" value="${esc(suggested || '')}" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;color:var(--text-dim);display:block;margin-bottom:4px;">Group role</label>
            <select id="groupExistingRole" style="width:100%;box-sizing:border-box;">
              <option value="project">Project</option>
              <option value="supporting">Supporting resource</option>
              <option value="context">Context folder</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
          <button onclick="window.addExistingFolderToGroup()" style="background:#1d4ed8;border:1px solid #2563eb;color:#dbeafe;font-weight:bold;padding:7px 12px;border-radius:4px;">Add Existing Project Folder</button>
          <span id="groupExistingStatus" style="font-size:11px;color:var(--text-dim);"></span>
        </div>
      </div>

      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:14px;">
        <h3 style="margin:0 0 10px;color:var(--text-bright);font-size:15px;">Add GitHub Project to Workspace</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <input id="folderReviewGithubName" placeholder="Project display name">
          <input id="folderReviewGithubRepo" placeholder="owner/repo or https://github.com/owner/repo">
          <input id="folderReviewGithubBranch" placeholder="branch" value="main">
          <input id="folderReviewGithubPath" placeholder="local folder path" value="${esc((suggested ? suggested + '/new-github-project' : './new-github-project').replace(/\/+/g, '/'))}">
          <input id="folderReviewGithubToken" type="password" placeholder="Optional GitHub PAT for private repos">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);">
            <input id="folderReviewGithubSync" type="checkbox" checked>
            Check staged Git candidate after adding
          </label>
        </div>
        <textarea id="folderReviewTrainingSources" placeholder="Training docs, support URLs, GitHub docs folders, troubleshooting links. One per line." style="width:100%;box-sizing:border-box;height:72px;margin-top:10px;"></textarea>
        <textarea id="folderReviewInstallNotes" placeholder="Install notes or options to offer users, such as package managers, optional components, service setup, model downloads, or test commands." style="width:100%;box-sizing:border-box;height:72px;margin-top:8px;"></textarea>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
          <button onclick="window.addGithubProjectFromFolderReview()" style="background:#064e3b;border:1px solid #047857;color:#a7f3d0;font-weight:bold;padding:7px 12px;border-radius:4px;">Add to Workspace</button>
          <button onclick="window.copyFolderAgentPrompt()" class="assoc-back-btn">Copy Agent Prompt</button>
          <span id="folderReviewGithubStatus" style="font-size:11px;color:var(--text-dim);"></span>
        </div>
      </div>` : ''}

      ${showProjectSubfolderActions ? '' : ''}

      <!-- Folder and File Filters -->
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;color:var(--text-bright);font-size:15px;">📂 Folder and File Filters</h3>
          <button onclick="window.rebuildWithCurrentFilters()" style="background:#1e40af;border:1px solid #2563eb;color:#dbeafe;font-size:11px;padding:4px 10px;border-radius:4px;cursor:pointer;">🔄 Rebuild with current filters</button> <button onclick="window.resetGraphFiltersForGroup()" style="background:#2d2d2d;border:1px solid #444;color:#f87171;font-size:11px;padding:4px 10px;border-radius:4px;cursor:pointer;">Reset This Group</button>
        </div>
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Toggle subfolders and file types within <b style="color:var(--accent);">${esc(title)}</b> to show/hide them from the Graph.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div style="background:var(--panel-dark,#18181b);border:1px solid #27272a;border-radius:4px;padding:12px;max-height:400px;overflow-y:auto;">
            <div style="font-weight:bold;font-size:12px;color:var(--text-bright,#e4e4e7);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
              <span>📂 Subfolder Visibility</span>
              <span style="font-size:10px;color:#888;">Click to toggle</span>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:8px;">
              <button onclick="window.gmFolderSelectAll(true)" style="background:#064e3b;border:1px solid #047857;color:#a7f3d0;font-size:10px;padding:3px 8px;border-radius:3px;cursor:pointer;">All On</button>
              <button onclick="window.gmFolderSelectAll(false)" style="background:#7f1d1d;border:1px solid #b91c1c;color:#fecaca;font-size:10px;padding:3px 8px;border-radius:3px;cursor:pointer;">All Off</button>
            </div>
            <div id="gmGraphFolderTree" style="font-size:12px;color:#d4d4d8;"></div>
          </div>
          <div style="background:var(--panel-dark,#18181b);border:1px solid #27272a;border-radius:4px;padding:12px;">
            <div style="font-weight:bold;font-size:12px;color:var(--text-bright,#e4e4e7);margin-bottom:8px;">📄 File Type Visibility</div>
            <p style="font-size:11px;color:#888;margin:0 0 10px;">Toggle file types within this group.</p>
            <div id="gmGraphTypeFilterList" style="display:flex;flex-direction:column;gap:6px;"></div>
            <div style="border-top:1px solid #333;margin-top:12px;padding-top:10px;">
              <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:bold;">Exclude Extensions:</div>
              <div style="display:flex;gap:6px;">
                <input id="gmGraphCustomExtInput" placeholder=".log, .tmp, .bak" style="flex:1;background:#111;color:#fff;border:1px solid #444;padding:5px;border-radius:3px;font-size:11px;">
                <button onclick="window.addGraphCustomExtFilterGM()" style="background:#007acc;border:none;color:#fff;font-size:11px;padding:5px 10px;border-radius:3px;cursor:pointer;">Add</button>
              </div>
              <div id="gmGraphCustomExtList" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create New Folder (moved below filters) -->
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:14px;">
        <details id="excludedFilesReport">
          <summary style="cursor:pointer;font-size:14px;font-weight:bold;color:var(--text-bright);list-style:none;display:flex;align-items:center;gap:8px;">
            🚫 Excluded Files <span id="excludedFilesCount" style="font-size:11px;color:#888;font-weight:normal;"></span>
          </summary>
          <div id="excludedFilesList" style="margin-top:10px;max-height:300px;overflow-y:auto;font-size:11px;color:#aaa;"></div>
        </details>
      </div>

      <!-- Create New Folder -->
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:14px;">
        <h3 style="margin:0 0 10px;color:var(--text-bright);font-size:15px;">📁 Create New Folder</h3>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">Browse to a location within this project, then name and create a new folder.</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <label style="font-size:11px;color:var(--text-dim);white-space:nowrap;">Parent:</label>
          <select id="folderReviewParentSelect" style="flex:1;box-sizing:border-box;background:var(--panel-dark,#111);color:#fff;border:1px solid #444;padding:5px;border-radius:3px;font-size:11px;font-family:monospace;">
            <option value="${esc(suggested || '')}">${esc(suggested || folderPath)} (root)</option>
          </select>
          <button onclick="window.refreshFolderBrowseList()" style="background:#2d2d2d;border:1px solid #444;color:#38bdf8;font-size:10px;padding:4px 8px;border-radius:3px;cursor:pointer;" title="Refresh folder list">🔄</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="folderReviewNewName" placeholder="New folder name" style="flex:1;box-sizing:border-box;">
          <button id="btnCreateFolder" onclick="window.createFolderInParent()" style="background:var(--accent);border:none;color:var(--text-bright);font-weight:bold;padding:7px 12px;border-radius:4px;display:flex;align-items:center;gap:4px;">📂+ Create</button>
        </div>
        <div id="folderReviewCreateStatus" style="font-size:11px;color:var(--text-dim);margin-top:8px;"></div>
      </div>

      ${(showProjectActions && scope.workspace && scope.workspace.projects && scope.workspace.projects.some(p => p.type === 'github_repo')) ? `
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:14px;">
        <h3 style="margin:0 0 10px;color:var(--text-bright);font-size:15px;">AI Agent Prompt for Complex Installs</h3>
        <textarea id="folderReviewAgentPrompt" style="width:100%;box-sizing:border-box;height:150px;font-family:Consolas,monospace;font-size:12px;">${esc(prompt)}</textarea>
      </div>` : ''}
    </div>
  `;
  refreshGroupPhysicalStats(suggested);
  // Store current group path for scoped filter rendering
  window._gmCurrentGroupPath = folderPath;
  window._gmCurrentGroupPhysicalPath = suggested || '';
  // Render graph filter UIs scoped to this group
  setTimeout(() => {
    window.renderGraphFolderTreeGM();
    window.renderGraphTypeFilterGM();
    window.renderGraphCustomExtListGM();
    window.refreshFolderBrowseList();
    window.renderExcludedFilesReport();
  }, 50);
};

window.openFolderReview = window.openGroupManagement;

async function refreshGroupPhysicalStats(path) {
  const totalEl = document.getElementById('groupPhysicalFiles');
  const directEl = document.getElementById('groupPhysicalDirect');
  const folderEl = document.getElementById('groupPhysicalFolders');
  const serverNotice = document.getElementById('groupServerNotice');
  const createFolderBtn = document.getElementById('btnCreateFolder');
  const createFolderInputs = document.querySelectorAll('#folderReviewParentSelect, #folderReviewNewName');

  if (!totalEl || !directEl || !folderEl) return;
  if (!path) {
    totalEl.textContent = 'No mapped path';
    directEl.textContent = 'No mapped path';
    folderEl.textContent = 'No mapped path';
    return;
  }
  if (location.protocol === 'file:' || window.isServerMode === false) {
    totalEl.textContent = 'Server required';
    directEl.textContent = 'Server required';
    folderEl.textContent = 'Server required';
    // Show server notice
    if (serverNotice) serverNotice.style.display = '';
    // Disable create folder
    if (createFolderBtn) { createFolderBtn.disabled = true; createFolderBtn.style.opacity = '0.4'; createFolderBtn.style.cursor = 'not-allowed'; }
    createFolderInputs.forEach(el => { el.disabled = true; el.style.opacity = '0.4'; });
    return;
  }
  // Server is running — hide notice, enable create folder
  if (serverNotice) serverNotice.style.display = 'none';
  if (createFolderBtn) { createFolderBtn.disabled = false; createFolderBtn.style.opacity = '1'; createFolderBtn.style.cursor = 'pointer'; }
  createFolderInputs.forEach(el => { el.disabled = false; el.style.opacity = '1'; });
  try {
    const res = await fetch('/api/folder/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    totalEl.textContent = data.total_files;
    directEl.textContent = data.direct_files;
    folderEl.textContent = data.total_folders;
  } catch (e) {
    totalEl.textContent = 'Unavailable';
    directEl.textContent = 'Unavailable';
    folderEl.textContent = 'Unavailable';
  }
}

window.createReviewedFolder = async function () {
  const input = document.getElementById('folderReviewCreatePath');
  const status = document.getElementById('folderReviewCreateStatus');
  const path = input ? input.value.trim() : '';
  if (!path) return alert('Enter a folder path to create.');
  if (location.protocol === 'file:' || window.isServerMode === false) {
    return alert('Start AXE-Anchor with python3 builder.py to create folders from the GUI.');
  }
  try {
    const res = await fetch('/api/folder/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    if (status) status.textContent = data.message + ' ' + data.path;
  } catch (e) {
    if (status) status.textContent = 'Failed: ' + e.message;
    alert('Failed to create folder: ' + e.message);
  }
};

window.refreshFolderBrowseList = async function() {
  let suggested = window._gmCurrentGroupPhysicalPath || '';
  let select = document.getElementById('folderReviewParentSelect');
  if (!select || !suggested) return;
  if (location.protocol === 'file:' || window.isServerMode === false) {
    return;
  }
  try {
    const res = await fetch('/api/folder/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: suggested })
    });
    const data = await res.json();
    if (data.status === 'error') return;
    let folders = data.folders || [];
    let html = `<option value="${esc(suggested)}">${esc(suggested)} (root)</option>`;
    folders.sort().forEach(f => {
      let full = suggested + '/' + f;
      html += `<option value="${esc(full)}">${esc(f)}</option>`;
    });
    select.innerHTML = html;
  } catch (e) {}
};

window.createFolderInParent = async function() {
  let select = document.getElementById('folderReviewParentSelect');
  let nameInput = document.getElementById('folderReviewNewName');
  let status = document.getElementById('folderReviewCreateStatus');
  let parent = select ? select.value : '';
  let name = nameInput ? nameInput.value.trim() : '';
  if (!name) return alert('Enter a name for the new folder.');
  if (!parent) return alert('Select a parent folder.');
  let fullPath = parent + '/' + name;
  if (location.protocol === 'file:' || window.isServerMode === false) {
    return alert('Start AXE-Anchor with python3 builder.py to create folders from the GUI.');
  }
  try {
    const res = await fetch('/api/folder/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: fullPath })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    if (status) status.textContent = '✓ Created: ' + fullPath;
    if (nameInput) nameInput.value = '';
    window.refreshFolderBrowseList();
  } catch (e) {
    if (status) status.textContent = 'Failed: ' + e.message;
    alert('Failed to create folder: ' + e.message);
  }
};

window.addWorkspaceFromGroup = async function () {
  const status = document.getElementById('groupWorkspaceStatus');
  const name = document.getElementById('groupWorkspaceName')?.value.trim() || '';
  const path = document.getElementById('groupWorkspacePath')?.value.trim() || '';
  if (!name || !path) return alert('Workspace name and root path are required.');
  if (location.protocol === 'file:' || window.isServerMode === false) {
    return alert('Start AXE-Anchor with python3 builder.py to add workspaces from the GUI.');
  }
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workspace';
  const workspaces = JSON.parse(JSON.stringify(CONFIG.workspaces || []));
  if (workspaces.some(ws => ws.id === id || ws.name === name)) {
    return alert('A workspace with that name/id already exists.');
  }
  const workspace = {
    id,
    name,
    projects: [{
      type: 'local_folder',
      name: `${name} Root`,
      enabled: true,
      path
    }]
  };
  try {
    if (status) status.textContent = 'Adding workspace...';
    const saveRes = await fetch('/api/workspaces/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workspace)
    });
    const saveData = await saveRes.json();
    if (saveData.status === 'error') throw new Error(saveData.message);
    if (status) status.textContent = 'Workspace added. Click it in the tree to load it.';
  } catch (e) {
    if (status) status.textContent = 'Failed: ' + e.message;
    alert('Failed to add workspace: ' + e.message);
  }
};

window.addExistingFolderToGroup = async function () {
  const status = document.getElementById('groupExistingStatus');
  const path = document.getElementById('groupExistingPath')?.value.trim() || '';
  const role = document.getElementById('groupExistingRole')?.value || 'project';
  const nameInput = document.getElementById('groupExistingName')?.value.trim() || '';
  const name = nameInput || defaultExistingFolderName(path);
  if (!path) return alert('Enter the existing folder path to add.');
  if (location.protocol === 'file:' || window.isServerMode === false) {
    return alert('Start AXE-Anchor with python3 builder.py to add existing folders from the GUI.');
  }

  const ws = getActiveWorkspaceConfig();
  if (!ws) return alert('No workspace is available to update.');

  const updated = JSON.parse(JSON.stringify(ws));
  if (role === 'context') {
    updated.context_folder = { name, path };
  } else if (role === 'supporting') {
    const existing = updated.supporting_resources;
    const nextResource = { name, path };
    if (!existing) updated.supporting_resources = nextResource;
    else if (Array.isArray(existing)) updated.supporting_resources = [...existing, nextResource];
    else updated.supporting_resources = [existing, nextResource];
  } else {
    updated.projects = Array.isArray(updated.projects) ? updated.projects : [];
    updated.projects.push({
      type: 'local_folder',
      name,
      enabled: true,
      path
    });
  }

  try {
    if (status) status.textContent = 'Adding folder to workspace...';
    const saveRes = await fetch('/api/workspaces/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    const saveData = await saveRes.json();
    if (saveData.status === 'error') throw new Error(saveData.message);
    if (status) status.textContent = 'Existing folder added. Rebuilt workspace configuration.';
  } catch (e) {
    if (status) status.textContent = 'Failed: ' + e.message;
    alert('Failed to add existing folder: ' + e.message);
  }
};

window.addGithubProjectFromFolderReview = async function () {
  const status = document.getElementById('folderReviewGithubStatus');
  const repo = document.getElementById('folderReviewGithubRepo')?.value.trim() || '';
  const name = document.getElementById('folderReviewGithubName')?.value.trim() || repo.split('/').pop() || 'GitHub Project';
  const branch = document.getElementById('folderReviewGithubBranch')?.value.trim() || 'main';
  const path = document.getElementById('folderReviewGithubPath')?.value.trim() || '';
  const token = document.getElementById('folderReviewGithubToken')?.value.trim() || '';
  const trainingSources = (document.getElementById('folderReviewTrainingSources')?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
  const installNotes = document.getElementById('folderReviewInstallNotes')?.value || '';
  const shouldSync = document.getElementById('folderReviewGithubSync')?.checked !== false;
  if (!repo || !path) return alert('GitHub repo and local folder path are required.');
  if (location.protocol === 'file:' || window.isServerMode === false) return alert('Start AXE-Anchor with python3 builder.py to update workspaces.');
  const activeId = DATA.active_workspace_id || DATA.build_meta?.active_workspace_id || '';
  const ws = getActiveWorkspaceConfig();
  if (!ws) return alert('No workspace is available to update.');
  const updated = JSON.parse(JSON.stringify(ws));
  updated.projects = Array.isArray(updated.projects) ? updated.projects : [];
  updated.projects.push({
    name,
    type: 'github_repo',
    path,
    enabled: true,
    github_repo: repo.replace(/^https:\/\/github.com\//, '').replace(/\.git$/, ''),
    github_branch: branch,
    install_notes: installNotes,
    training_sources: trainingSources,
    agent_prompt: document.getElementById('folderReviewAgentPrompt')?.value || ''
  });
  try {
    if (status) status.textContent = 'Saving project...';
    if (token) {
      const authRes = await fetch('/api/github/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_token: token })
      });
      const authData = await authRes.json();
      if (authData.status === 'error') throw new Error(authData.message);
    }
    const saveRes = await fetch('/api/workspaces/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    const saveData = await saveRes.json();
    if (saveData.status === 'error') throw new Error(saveData.message);
    if (shouldSync) {
      if (status) status.textContent = 'Project saved. Checking staged Git candidate...';
      const syncRes = await fetch('/api/workspaces/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updated.name })
      });
      const syncData = await syncRes.json();
      if (syncData.status === 'error') throw new Error(syncData.message);
      if (status) status.textContent = 'Project saved. Git candidate check complete.';
    } else if (status) {
      status.textContent = 'Project saved.';
    }
  } catch (e) {
    if (status) status.textContent = 'Failed: ' + e.message;
    alert('Failed to add GitHub project: ' + e.message);
  }
};

window.copyFolderAgentPrompt = function () {
  const text = document.getElementById('folderReviewAgentPrompt')?.value || '';
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
  }
};

window.loadWorkspaceOnDemand = async function (workspaceId) {
  if (!workspaceId) return;
  const safeId = workspaceId.replace(/[^A-Za-z0-9_\-]/g, '_');

  if (location.protocol === 'file:' || window.isServerMode === false) {
    window.location.href = `workspace_${safeId}.html`;
    return;
  }

  const ok = confirm('Load this workspace now? AXE-Anchor will rebuild the dashboard for that workspace.');
  if (!ok) return;

  const indicator = document.getElementById('workspace-loading-indicator');
  const bar = document.getElementById('workspace-loading-bar');
  const text = document.getElementById('workspace-loading-text');

  if (indicator && bar && text) {
    indicator.style.display = 'block';
    text.innerText = `Building workspace "${workspaceId}"...`;
    bar.style.width = '0%';

    // Simulate progress for heavy builds
    let progress = 0;
    window._wsLoadInterval = setInterval(() => {
      progress += (100 - progress) * 0.1; // approach 99%
      bar.style.width = `${progress}%`;
      text.innerText = `Building workspace "${workspaceId}"... ${Math.floor(progress)}%`;
    }, 1000);
  }

  try {
    const res = await fetch('/api/workspace/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message || 'Workspace load failed.');

    if (bar && text) {
      clearInterval(window._wsLoadInterval);
      bar.style.width = '100%';
      text.innerText = 'Build complete! Loading...';
    }

    // Redirect to the newly generated file if provided, else fallback to reload
    if (data.filename) {
      setTimeout(() => { window.location.href = data.filename; }, 500);
    } else {
      setTimeout(() => { window.location.reload(); }, 500);
    }
  } catch (e) {
    if (window._wsLoadInterval) clearInterval(window._wsLoadInterval);
    if (indicator) indicator.style.display = 'none';
    alert('Failed to load workspace: ' + e.message);
  }
};

function renderTree(node, container, prefix = '') {
  const keys = Object.keys(node).filter(k => k !== '_f');
  const activeWorkspaceLabel = getActiveWorkspaceLabel();
  if (prefix === '') {
    const platformDiv = document.createElement('div');
    platformDiv.className = 'tree-folder';
    platformDiv.innerHTML = '🧭 AXE Platform';
    platformDiv.title = 'Open Platform Group Management';
    platformDiv.onclick = () => window.openGroupManagement(platformGroupPath());
    platformDiv.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); showContextMenu(e.clientX, e.clientY, platformGroupPath(), 'folder'); };
    container.appendChild(platformDiv);
  }
  keys.sort((a, b) => {
    if (prefix === '') {
      const aActive = a === activeWorkspaceLabel ? 1 : 0;
      const bActive = b === activeWorkspaceLabel ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
    }
    const aIsFile = node[a]._f ? 1 : 0;
    const bIsFile = node[b]._f ? 1 : 0;
    if (aIsFile !== bIsFile) return aIsFile - bIsFile;
    return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  });

  for (let k of keys) {
    let div = document.createElement('div');
    if (node[k]._workspacePlaceholder) {
      const ws = node[k]._workspacePlaceholder;
      div.className = 'tree-folder workspace-placeholder';
      div.title = ws.reason || 'Workspace is available on demand.';
      div.innerHTML = '📦 ' + esc(k) + ' <span style="font-size:10px;color:#777;">(click to load)</span>';
      div.onclick = () => window.loadWorkspaceOnDemand(ws.id || ws.name);
      div.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); showContextMenu(e.clientX, e.clientY, k, 'folder'); };
      container.appendChild(div);
    } else if (node[k]._f) {
      div.className = 'tree-file';
      div.innerHTML = '📄 ' + k;
      div.onclick = () => {
        openFileInViewer(prefix + k);
      };
      div.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); showContextMenu(e.clientX, e.clientY, prefix + k); };
      container.appendChild(div);
    } else {
      let folderHeader = document.createElement('div');
      folderHeader.className = 'tree-folder';
      const isActiveWorkspaceRoot = prefix === '' && k === activeWorkspaceLabel;
      if (isActiveWorkspaceRoot) folderHeader.classList.add('workspace-active');
      folderHeader.innerHTML = '📁 ' + esc(k) + (isActiveWorkspaceRoot ? ' <span class="workspace-active-pill">ACTIVE</span>' : '');
      folderHeader.dataset.path = prefix + k + '/';

      let childContainer = document.createElement('div');
      childContainer.className = 'tree-children';
      childContainer.style.display = 'none'; // Collapsed by default

      folderHeader.onclick = () => {
        let isHidden = childContainer.style.display === 'none';
        childContainer.style.display = isHidden ? 'block' : 'none';
        folderHeader.innerHTML = (isHidden ? '📂 ' : '📁 ') + esc(k) + (isActiveWorkspaceRoot ? ' <span class="workspace-active-pill">ACTIVE</span>' : '');
      };
      folderHeader.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); showContextMenu(e.clientX, e.clientY, prefix + k, 'folder'); };

      renderTree(node[k], childContainer, prefix + k + '/');
      container.appendChild(folderHeader);
      container.appendChild(childContainer);
    }
  }
}


function getSidebarSearchMode() {
  let el = document.getElementById('searchMode');
  return (el && el.value ? el.value : 'all').toLowerCase();
}

window.runGlobalSearch = function () {
  let el1 = document.getElementById('search');
  let el2 = document.getElementById('search2');
  window._sidebarSearchTerm1 = el1 ? String(el1.value || '') : '';
  window._sidebarSearchTerm2 = el2 ? String(el2.value || '') : '';

  // Ensure all content chunks are loaded before searching
  if (typeof window.ensureAllContentLoaded === 'function' && !window._allChunksLoaded) {
    let indicator = document.getElementById('chunkLoadIndicator');
    if (indicator) { indicator.style.display = ''; indicator.textContent = 'Loading search index...'; }
    window.ensureAllContentLoaded().then(() => {
      if (indicator) indicator.style.display = 'none';
      window.runGlobalSearch();
    });
    return;
  }

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
// GRAPH VISIBILITY FILTERS
// ==========================================

// Load persisted graph filters from localStorage
window._graphFolderFilter = JSON.parse(localStorage.getItem('axe_graph_folder_filter') || '{}');
window._graphTypeFilter = JSON.parse(localStorage.getItem('axe_graph_type_filter') || '{}');
window._graphCustomExtExclude = JSON.parse(localStorage.getItem('axe_graph_custom_ext_exclude') || '[]');
// "All File Types Not Listed" defaults: true = visible, false = hidden
window._graphUnlistedTypesVisible = JSON.parse(localStorage.getItem('axe_graph_unlisted_types_visible') || 'true');
window._anchorUnlistedTypesVisible = JSON.parse(localStorage.getItem('axe_anchor_unlisted_types_visible') || 'true');

function saveGraphFilters() {
  localStorage.setItem('axe_graph_folder_filter', JSON.stringify(window._graphFolderFilter));
  localStorage.setItem('axe_graph_type_filter', JSON.stringify(window._graphTypeFilter));
  localStorage.setItem('axe_graph_custom_ext_exclude', JSON.stringify(window._graphCustomExtExclude));
  localStorage.setItem('axe_graph_unlisted_types_visible', JSON.stringify(window._graphUnlistedTypesVisible));
  localStorage.setItem('axe_anchor_unlisted_types_visible', JSON.stringify(window._anchorUnlistedTypesVisible));
}

// Build folder tree from DATA.documents keys
function getGraphFolderTree() {
  let tree = {};
  for (let k in DATA.documents) {
    let parts = k.split('/');
    if (parts.length > 1) {
      let folder = parts[0];
      if (!tree[folder]) tree[folder] = new Set();
      if (parts.length > 2) {
        tree[folder].add(parts[1]);
      }
    }
  }
  return tree;
}

window.renderGraphFolderTree = function() {
  let container = document.getElementById('graphFolderTree');
  if (!container) return;

  let tree = getGraphFolderTree();
  let folders = Object.keys(tree).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  let html = '';
  folders.forEach(folder => {
    let enabled = window._graphFolderFilter[folder] !== false;
    let subfolders = [...tree[folder]].sort();
    let hasChildren = subfolders.length > 0;

    html += `<div style="margin-bottom:4px;">
      <div style="display:flex; align-items:center; gap:6px; padding:3px 0; cursor:pointer;" onclick="window.toggleGraphFolder('${folder.replace(/'/g, "\\'")}')">
        <span style="color:${enabled ? '#10b981' : '#ef4444'}; font-size:14px;">${enabled ? '☑' : '☐'}</span>
        <span style="color:${enabled ? '#e4e4e7' : '#71717a'}; font-weight:bold;">${esc(folder)}</span>
        <span style="color:#555; font-size:10px;">(${subfolders.length} sub)</span>
      </div>`;

    if (hasChildren && enabled) {
      html += `<div style="padding-left:18px; border-left:1px dashed #333; margin-left:8px;">`;
      subfolders.forEach(sub => {
        let subKey = folder + '/' + sub;
        let subEnabled = window._graphFolderFilter[subKey] !== false;
        html += `<div style="display:flex; align-items:center; gap:6px; padding:2px 0; cursor:pointer;" onclick="window.toggleGraphFolder('${subKey.replace(/'/g, "\\'")}')">
          <span style="color:${subEnabled ? '#10b981' : '#ef4444'}; font-size:12px;">${subEnabled ? '☑' : '☐'}</span>
          <span style="color:${subEnabled ? '#d4d4d8' : '#71717a'}; font-size:11px;">${esc(sub)}</span>
        </div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  });

  container.innerHTML = html || '<div style="color:#666;">No folders found.</div>';
};

window.toggleGraphFolder = function(folderPath) {
  let current = window._graphFolderFilter[folderPath];
  window._graphFolderFilter[folderPath] = (current === false) ? true : false;
  saveGraphFilters();
  window.renderGraphFolderTree();
  // If graph is active, trigger rebuild
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

window.graphFolderSelectAll = function(enabled) {
  let tree = getGraphFolderTree();
  for (let folder in tree) {
    window._graphFolderFilter[folder] = enabled;
    [...tree[folder]].forEach(sub => {
      window._graphFolderFilter[folder + '/' + sub] = enabled;
    });
  }
  saveGraphFilters();
  window.renderGraphFolderTree();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

// File type filter
window.renderGraphTypeFilter = function() {
  let container = document.getElementById('graphTypeFilterList');
  if (!container) return;

  let typeCounts = {};
  for (let k in DATA.documents) {
    let t = DATA.documents[k].type || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  let typeIcons = { markdown: '📝', csv: '📊', json: '⚙️', text: '📄', code: '💻', image: '🖼️', data_artifact: '📦' };
  let types = Object.keys(typeCounts).sort();

  let html = '';
  // "All File Types Not Listed" dual toggle
  html += `<div style="padding:6px 8px;background:#0f172a;border:1px solid #1e3a5f;border-radius:4px;margin-bottom:6px;">
    <div style="font-size:11px;font-weight:bold;color:#93c5fd;margin-bottom:4px;">All File Types Not Listed:</div>
    <div style="display:flex;gap:12px;">
      <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:#d4d4d8;cursor:pointer;">
        <input type="checkbox" ${window._graphUnlistedTypesVisible ? 'checked' : ''} onchange="window.toggleUnlistedTypes('graph', this.checked)" style="margin:0;">
        Show in Graph
      </label>
      <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:#d4d4d8;cursor:pointer;">
        <input type="checkbox" ${window._anchorUnlistedTypesVisible ? 'checked' : ''} onchange="window.toggleUnlistedTypes('anchor', this.checked)" style="margin:0;">
        Include in AXE Anchor
      </label>
    </div>
  </div>`;

  types.forEach(type => {
    let enabled = window._graphTypeFilter[type] !== false;
    let icon = typeIcons[type] || '📄';
    html += `<label style="display:flex; align-items:center; gap:8px; padding:4px 6px; background:${enabled ? '#1e293b' : '#18181b'}; border:1px solid ${enabled ? '#334155' : '#27272a'}; border-radius:4px; cursor:pointer; transition:all 0.15s;">
      <input type="checkbox" ${enabled ? 'checked' : ''} onchange="window.toggleGraphType('${type}', this.checked)" style="margin:0;">
      <span style="font-size:13px;">${icon}</span>
      <span style="color:${enabled ? '#e4e4e7' : '#71717a'}; font-size:12px; flex:1;">${type}</span>
      <span style="color:#555; font-size:10px;">${typeCounts[type]}</span>
    </label>`;
  });

  container.innerHTML = html;
};

window.toggleUnlistedTypes = function(scope, enabled) {
  if (scope === 'graph') {
    window._graphUnlistedTypesVisible = enabled;
  } else {
    window._anchorUnlistedTypesVisible = enabled;
  }
  saveGraphFilters();
  window.renderGraphTypeFilter();
  window.renderGraphTypeFilterGM();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

window.toggleGraphType = function(type, enabled) {
  window._graphTypeFilter[type] = enabled;
  saveGraphFilters();
  window.renderGraphTypeFilter();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

// Custom extension exclusion
window.renderGraphCustomExtList = function() {
  let container = document.getElementById('graphCustomExtList');
  if (!container) return;

  let html = '';
  (window._graphCustomExtExclude || []).forEach((ext, idx) => {
    html += `<span style="background:#7f1d1d; color:#fecaca; font-size:10px; padding:3px 6px; border-radius:3px; display:inline-flex; align-items:center; gap:4px;">
      ${esc(ext)}
      <span onclick="window.removeGraphCustomExt(${idx})" style="cursor:pointer; font-weight:bold; color:#f87171;">✕</span>
    </span>`;
  });
  container.innerHTML = html;
};

window.addGraphCustomExtFilter = function() {
  let input = document.getElementById('graphCustomExtInput');
  if (!input) return;
  let val = input.value.trim();
  if (!val) return;

  // Parse comma-separated extensions
  let exts = val.split(',').map(e => {
    e = e.trim().toLowerCase();
    if (e && !e.startsWith('.')) e = '.' + e;
    return e;
  }).filter(e => e && !window._graphCustomExtExclude.includes(e));

  window._graphCustomExtExclude.push(...exts);
  input.value = '';
  saveGraphFilters();
  window.renderGraphCustomExtList();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

window.removeGraphCustomExt = function(idx) {
  window._graphCustomExtExclude.splice(idx, 1);
  saveGraphFilters();
  window.renderGraphCustomExtList();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

window.resetGraphFilters = function() {
  window._graphFolderFilter = {};
  window._graphTypeFilter = {};
  window._graphCustomExtExclude = [];
  saveGraphFilters();
  window.renderGraphFolderTree();
  window.renderGraphTypeFilter();
  window.renderGraphCustomExtList();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

// Initialize filter UI when workspaces panel renders
let _origRenderWorkspacesPanel = renderWorkspacesPanel;
renderWorkspacesPanel = function(container) {
  _origRenderWorkspacesPanel(container);
  // Render filter UIs after DOM is ready
  setTimeout(() => {
    window.renderGraphFolderTree();
    window.renderGraphTypeFilter();
    window.renderGraphCustomExtList();
  }, 50);
};

// ==========================================
// GRAPH FILE FILTER INTEGRATION
// ==========================================
// This function is called by the graph's selectedGraphFiles() to apply folder/type filters
window.applyGraphVisibilityFilters = function(files) {
  // Get the set of explicitly listed types (those that appear in the type filter checkboxes)
  let listedTypes = new Set();
  for (let k in DATA.documents) {
    let t = DATA.documents[k].type || 'unknown';
    listedTypes.add(t);
  }

  return files.filter(fp => {
    // Folder filter - check each path segment recursively
    let parts = fp.split('/');
    for (let depth = 1; depth < parts.length; depth++) {
      let folderPath = parts.slice(0, depth).join('/');
      if (window._graphFolderFilter[folderPath] === false) return false;
    }

    // Type filter
    let doc = DATA.documents[fp];
    if (doc) {
      let type = doc.type || 'unknown';

      // Check if this type is explicitly listed in the filter
      if (window._graphTypeFilter[type] === false) return false;

      // If the type is NOT in the explicit filter list and "unlisted types" is off, hide it
      if (window._graphTypeFilter[type] === undefined && !listedTypes.has(type)) {
        if (!window._graphUnlistedTypesVisible) return false;
      }

      // Custom extension exclusion
      let ext = (doc.ext || '').toLowerCase();
      if (ext && window._graphCustomExtExclude.includes(ext)) return false;
    }

    return true;
  });
};

// ==========================================
// GROUP MANAGEMENT PAGE FILTER RENDERERS (scoped to current group)
// ==========================================

// Build a recursive folder tree for files under a given prefix
function buildScopedFolderTree(prefix) {
  let tree = {};
  let prefixWithSlash = prefix ? prefix + '/' : '';
  for (let k in DATA.documents) {
    if (prefix && !k.startsWith(prefixWithSlash)) continue;
    let rel = prefix ? k.substring(prefixWithSlash.length) : k;
    let parts = rel.split('/');
    if (parts.length > 1) {
      let node = tree;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!node[parts[i]]) node[parts[i]] = {};
        node = node[parts[i]];
      }
    }
  }
  return tree;
}

function renderRecursiveFolderTree(tree, pathPrefix, depth) {
  if (depth > 6) return ''; // safety limit
  let keys = Object.keys(tree).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  if (keys.length === 0) return '';
  let html = '';
  keys.forEach(folder => {
    let fullPath = pathPrefix ? pathPrefix + '/' + folder : folder;
    let enabled = window._graphFolderFilter[fullPath] !== false;
    let children = tree[folder];
    let hasChildren = Object.keys(children).length > 0;
    let indent = depth * 14;

    html += `<div style="margin-left:${indent}px;margin-bottom:2px;">
      <div style="display:flex;align-items:center;gap:5px;padding:2px 0;">
        <span style="color:${enabled ? '#10b981' : '#ef4444'};font-size:${depth === 0 ? '14' : '12'}px;cursor:pointer;" onclick="window.toggleGraphFolderGM('${fullPath.replace(/'/g, "\\'")}')">${enabled ? '☑' : '☐'}</span>
        <span style="color:${enabled ? (depth === 0 ? '#e4e4e7' : '#d4d4d8') : '#71717a'};font-size:${depth === 0 ? '12' : '11'}px;${depth === 0 ? 'font-weight:bold;' : ''}cursor:pointer;" onclick="window.toggleGraphFolderGM('${fullPath.replace(/'/g, "\\'")}')">${esc(folder)}</span>
        ${hasChildren ? `<span style="color:#555;font-size:9px;">(${Object.keys(children).length})</span>` : ''}
        <span onclick="window.toggleFolderIgnoreForAnchoring('${fullPath.replace(/'/g, "\\'")}', ${enabled})" style="cursor:pointer;font-size:9px;padding:1px 4px;border-radius:2px;margin-left:auto;background:${enabled ? '#1e293b' : '#7f1d1d'};color:${enabled ? '#94a3b8' : '#fecaca'};border:1px solid ${enabled ? '#334155' : '#b91c1c'};" title="${enabled ? 'Ignore from graph AND indexing' : 'Currently ignored'}">${enabled ? 'ignore' : 'ignored'}</span>
      </div>`;

    if (hasChildren && enabled) {
      html += renderRecursiveFolderTree(children, fullPath, depth + 1);
    }
    html += `</div>`;
  });
  return html;
}

window.renderGraphFolderTreeGM = function() {
  let container = document.getElementById('gmGraphFolderTree');
  if (!container) return;
  let groupPath = window._gmCurrentGroupPath || '';
  let tree = buildScopedFolderTree(groupPath);
  let html = renderRecursiveFolderTree(tree, groupPath, 0);
  container.innerHTML = html || '<div style="color:#666;font-size:11px;">No subfolders in this group.</div>';
};

window.toggleGraphFolderGM = function(folderPath) {
  let current = window._graphFolderFilter[folderPath];
  window._graphFolderFilter[folderPath] = (current === false) ? true : false;
  saveGraphFilters();
  window.renderGraphFolderTreeGM();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

window.gmFolderSelectAll = function(enabled) {
  let groupPath = window._gmCurrentGroupPath || '';
  let tree = buildScopedFolderTree(groupPath);
  function walkTree(node, prefix) {
    for (let key in node) {
      let fullPath = prefix ? prefix + '/' + key : key;
      window._graphFolderFilter[fullPath] = enabled;
      walkTree(node[key], fullPath);
    }
  }
  walkTree(tree, groupPath);
  saveGraphFilters();
  window.renderGraphFolderTreeGM();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

window.resetGraphFiltersForGroup = function() {
  let groupPath = window._gmCurrentGroupPath || '';
  let prefixWithSlash = groupPath ? groupPath + '/' : '';
  // Only clear filters that belong to this group
  for (let key in window._graphFolderFilter) {
    if (key.startsWith(prefixWithSlash) || key === groupPath) {
      delete window._graphFolderFilter[key];
    }
  }
  saveGraphFilters();
  window.renderGraphFolderTreeGM();
  window.renderGraphTypeFilterGM();
  window.renderGraphCustomExtListGM();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

window.renderGraphTypeFilterGM = function() {
  let container = document.getElementById('gmGraphTypeFilterList');
  if (!container) return;

  // Count types only within this group, respecting ignored toggle
  let groupPath = window._gmCurrentGroupPath || '';
  let prefixWithSlash = groupPath ? groupPath + '/' : '';
  let showIgnored = window._showIgnoredInTypeFilter !== false; // default on
  let typeCounts = {};
  let ignoredCount = 0;
  let totalCount = 0;
  for (let k in DATA.documents) {
    if (groupPath && !k.startsWith(prefixWithSlash)) continue;
    let doc = DATA.documents[k];
    let isIgnored = doc._ignored || (window._graphFolderFilter && (function() {
      let parts = k.split('/');
      for (let d = 1; d < parts.length; d++) {
        if (window._graphFolderFilter[parts.slice(0, d).join('/')] === false) return true;
      }
      return false;
    })());
    if (isIgnored) {
      ignoredCount++;
      if (!showIgnored) continue;
    }
    totalCount++;
    let t = doc.type || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  let typeIcons = { markdown: '📝', csv: '📊', json: '⚙️', text: '📄', code: '💻', image: '🖼️', data_artifact: '📦' };
  let types = Object.keys(typeCounts).sort();

  let html = '';

  // Ignored files toggle
  html += `<div style="padding:6px 8px;background:#1c1917;border:1px solid #44403c;border-radius:4px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
    <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#d6d3d1;cursor:pointer;">
      <input type="checkbox" ${showIgnored ? 'checked' : ''} onchange="window.toggleShowIgnoredInTypes(this.checked)" style="margin:0;">
      <span>Show Ignored Files</span>
    </label>
    <span style="font-size:10px;color:#78716c;">${ignoredCount} ignored</span>
  </div>`;

  // "All File Types Not Listed" dual toggle
  html += `<div style="padding:6px 8px;background:#0f172a;border:1px solid #1e3a5f;border-radius:4px;margin-bottom:6px;">
    <div style="font-size:11px;font-weight:bold;color:#93c5fd;margin-bottom:4px;">All File Types Not Listed:</div>
    <div style="display:flex;gap:12px;">
      <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:#d4d4d8;cursor:pointer;">
        <input type="checkbox" ${window._graphUnlistedTypesVisible ? 'checked' : ''} onchange="window.toggleUnlistedTypes('graph', this.checked)" style="margin:0;">
        Show in Graph
      </label>
      <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:#d4d4d8;cursor:pointer;">
        <input type="checkbox" ${window._anchorUnlistedTypesVisible ? 'checked' : ''} onchange="window.toggleUnlistedTypes('anchor', this.checked)" style="margin:0;">
        Include in AXE Anchor
      </label>
    </div>
  </div>`;

  types.forEach(type => {
    let enabled = window._graphTypeFilter[type] !== false;
    let icon = typeIcons[type] || '📄';
    html += `<label style="display:flex;align-items:center;gap:8px;padding:4px 6px;background:${enabled ? '#1e293b' : '#18181b'};border:1px solid ${enabled ? '#334155' : '#27272a'};border-radius:4px;cursor:pointer;">
      <input type="checkbox" ${enabled ? 'checked' : ''} onchange="window.toggleGraphTypeGM('${type}', this.checked)" style="margin:0;">
      <span style="font-size:13px;">${icon}</span>
      <span style="color:${enabled ? '#e4e4e7' : '#71717a'};font-size:12px;flex:1;">${type}</span>
      <span style="color:#555;font-size:10px;">${typeCounts[type]}</span>
    </label>`;
  });

  html += `<div style="margin-top:6px;font-size:10px;color:#666;text-align:right;">${totalCount} files shown</div>`;

  container.innerHTML = html || '<div style="color:#666;font-size:11px;">No files in this group.</div>';
};

window.toggleShowIgnoredInTypes = function(show) {
  window._showIgnoredInTypeFilter = show;
  window.renderGraphTypeFilterGM();
  window.renderGraphTypeFilter();
};

window.toggleGraphTypeGM = function(type, enabled) {
  window._graphTypeFilter[type] = enabled;
  saveGraphFilters();
  window.renderGraphTypeFilterGM();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

window.renderGraphCustomExtListGM = function() {
  let container = document.getElementById('gmGraphCustomExtList');
  if (!container) return;

  let html = '';
  (window._graphCustomExtExclude || []).forEach((ext, idx) => {
    html += `<span style="background:#7f1d1d;color:#fecaca;font-size:10px;padding:3px 6px;border-radius:3px;display:inline-flex;align-items:center;gap:4px;">
      ${esc(ext)}
      <span onclick="window.removeGraphCustomExtGM(${idx})" style="cursor:pointer;font-weight:bold;color:#f87171;">✕</span>
    </span>`;
  });
  container.innerHTML = html;
};

window.addGraphCustomExtFilterGM = function() {
  let input = document.getElementById('gmGraphCustomExtInput');
  if (!input) return;
  let val = input.value.trim();
  if (!val) return;

  let exts = val.split(',').map(e => {
    e = e.trim().toLowerCase();
    if (e && !e.startsWith('.')) e = '.' + e;
    return e;
  }).filter(e => e && !window._graphCustomExtExclude.includes(e));

  window._graphCustomExtExclude.push(...exts);
  input.value = '';
  saveGraphFilters();
  window.renderGraphCustomExtListGM();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

window.removeGraphCustomExtGM = function(idx) {
  window._graphCustomExtExclude.splice(idx, 1);
  saveGraphFilters();
  window.renderGraphCustomExtListGM();
  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
};

// ==========================================
// REMOVE PROJECT FROM WORKSPACE
// ==========================================
window.removeProjectFromWorkspace = async function(workspaceName, projectName) {
  if (!confirm(`Remove "${projectName}" from "${workspaceName}"?\n\nProject files will NOT be deleted. The project will appear as an orphan that can be re-assigned later.`)) return;
  try {
    const res = await fetch('/api/workspaces/remove-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_name: workspaceName, project_name: projectName })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    alert(data.message);
    fetchWorkspacesData();
  } catch (e) {
    alert('Failed to remove project: ' + e.message);
  }
};

// ==========================================
// ORPHAN PROJECTS (sidebar bottom)
// ==========================================
window.renderOrphanProjects = function() {
  let container = document.getElementById('orphanProjectsSection');
  if (!container) return;

  let orphans = (typeof CONFIG !== 'undefined' && CONFIG.orphan_projects) ? CONFIG.orphan_projects : [];
  if (orphans.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  let html = '<div style="font-size:11px;color:#888;font-weight:bold;margin-bottom:6px;border-top:1px solid var(--border);padding-top:8px;">📦 Unassigned Projects</div>';
  orphans.forEach(o => {
    html += `<div style="padding:4px 6px;margin-bottom:4px;background:#1e1e1e;border:1px solid #333;border-radius:3px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:12px;color:#ddd;">${esc(o.name)}</div>
        <div style="font-size:10px;color:#666;">${esc(o.path || '')}</div>
      </div>
      <button onclick="window.adoptOrphanProject('${(o.name || '').replace(/'/g, "\\'")}')" style="background:#1d4ed8;border:none;color:#dbeafe;font-size:10px;padding:3px 8px;border-radius:3px;cursor:pointer;white-space:nowrap;">+ Assign</button>
    </div>`;
  });
  container.innerHTML = html;
};

window.adoptOrphanProject = async function(projectName) {
  let workspaces = (typeof CONFIG !== 'undefined' && CONFIG.workspaces) ? CONFIG.workspaces : [];
  if (workspaces.length === 0) return alert('No workspaces available. Create a workspace first.');

  let wsNames = workspaces.map(w => w.name);
  let choice = prompt('Assign "' + projectName + '" to which workspace?\\n\\nAvailable:\\n' + wsNames.map((n, i) => (i + 1) + '. ' + n).join('\\n') + '\\n\\nEnter the number:');
  if (!choice) return;
  let idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= wsNames.length) return alert('Invalid selection.');

  try {
    const res = await fetch('/api/orphan-projects/adopt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_name: projectName, workspace_name: wsNames[idx] })
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    alert(data.message);
    window.location.reload();
  } catch (e) {
    alert('Failed: ' + e.message);
  }
};

// ==========================================
// IGNORE FOR ANCHORING (per-folder)
// ==========================================
window.toggleFolderIgnoreForAnchoring = async function(folderPath, ignore) {
  // Update local filter
  window._graphFolderFilter[folderPath] = !ignore;
  saveGraphFilters();

  // Also persist to server if available
  if (window.isServerMode) {
    try {
      await fetch('/api/settings/ignored-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: ignore ? 'add' : 'remove', path: folderPath })
      });
    } catch (e) {}
  }

  if (typeof window.updateGraphMode === 'function') window.updateGraphMode();
  window.renderGraphFolderTreeGM();
  window.renderGraphFolderTree();
};

// ==========================================
// ADD PLATFORM
// ==========================================
window.addPlatformFromGroup = async function() {
  let name = document.getElementById('groupPlatformName')?.value.trim() || '';
  let path = document.getElementById('groupPlatformPath')?.value.trim() || '';
  let desc = document.getElementById('groupPlatformDesc')?.value.trim() || '';
  let wsPattern = document.getElementById('groupPlatformWsPattern')?.value.trim() || '{root}/{name}';
  let status = document.getElementById('groupPlatformStatus');

  if (!name) return alert('Platform name is required.');
  if (!path) return alert('Default root path is required.');

  if (location.protocol === 'file:' || window.isServerMode === false) {
    return alert('Start AXE-Anchor server to create platforms.');
  }

  // Create the platform as a top-level workspace with platform metadata
  let id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let payload = {
    name: name,
    id: id,
    is_platform: true,
    description: desc,
    default_root_path: path,
    workspace_path_pattern: wsPattern,
    context_folder: { name: name + ' Context', path: path },
    projects: [],
    supporting_resources: []
  };

  try {
    // Create the folder
    await fetch('/api/folder/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path })
    });

    // Save as workspace
    const res = await fetch('/api/workspaces/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message);
    if (status) status.textContent = '✓ Platform "' + name + '" created at ' + path;
    document.getElementById('groupPlatformName').value = '';
    document.getElementById('groupPlatformDesc').value = '';
  } catch (e) {
    if (status) status.textContent = 'Failed: ' + e.message;
    alert('Failed to create platform: ' + e.message);
  }
};

// ==========================================
// EXCLUDED FILES REPORT
// ==========================================
window.renderExcludedFilesReport = function() {
  let countEl = document.getElementById('excludedFilesCount');
  let listEl = document.getElementById('excludedFilesList');
  let detailsEl = document.getElementById('excludedFilesReport');
  if (!countEl || !listEl) return;

  let groupPath = window._gmCurrentGroupPath || '';
  let prefixWithSlash = groupPath ? groupPath + '/' : '';

  // Gather all files in this group that are excluded by current filters
  let excluded = [];
  for (let k in DATA.documents) {
    if (groupPath && !k.startsWith(prefixWithSlash)) continue;

    let doc = DATA.documents[k];
    let isExcluded = false;
    let reason = '';

    // Check folder filter
    let parts = k.split('/');
    for (let depth = 1; depth < parts.length; depth++) {
      let folderPath = parts.slice(0, depth).join('/');
      if (window._graphFolderFilter[folderPath] === false) {
        isExcluded = true;
        reason = 'Folder disabled: ' + folderPath;
        break;
      }
    }

    // Check type filter
    if (!isExcluded && doc) {
      let type = doc.type || 'unknown';
      if (window._graphTypeFilter[type] === false) {
        isExcluded = true;
        reason = 'Type disabled: ' + type;
      }
    }

    // Check extension exclusion
    if (!isExcluded && doc) {
      let ext = (doc.ext || '').toLowerCase();
      if (ext && window._graphCustomExtExclude.includes(ext)) {
        isExcluded = true;
        reason = 'Extension excluded: ' + ext;
      }
    }

    if (isExcluded) {
      excluded.push({ path: k, reason: reason });
    }
  }

  countEl.textContent = `(${excluded.length} files excluded)`;

  if (excluded.length === 0) {
    listEl.innerHTML = '<div style="color:#666;font-style:italic;">No files are currently excluded from this group.</div>';
    return;
  }

  if (excluded.length > 50) {
    // Show summary + link to full report
    listEl.innerHTML = `
      <div style="color:#fbbf24;font-size:12px;margin-bottom:8px;">⚠️ ${excluded.length} files excluded — showing first 50. <a href="#" onclick="window.downloadExcludedReport(); return false;" style="color:var(--accent);">Download full report</a></div>
      ${excluded.slice(0, 50).map(f => `<div style="padding:2px 0;border-bottom:1px solid #222;display:flex;justify-content:space-between;"><span style="color:#aaa;word-break:break-all;">${esc(f.path)}</span><span style="color:#666;font-size:10px;white-space:nowrap;margin-left:8px;">${esc(f.reason)}</span></div>`).join('')}
    `;
  } else {
    listEl.innerHTML = excluded.map(f => `<div style="padding:2px 0;border-bottom:1px solid #222;display:flex;justify-content:space-between;"><span style="color:#aaa;word-break:break-all;">${esc(f.path)}</span><span style="color:#666;font-size:10px;white-space:nowrap;margin-left:8px;">${esc(f.reason)}</span></div>`).join('');
  }
};

window.downloadExcludedReport = function() {
  let groupPath = window._gmCurrentGroupPath || '';
  let prefixWithSlash = groupPath ? groupPath + '/' : '';
  let lines = ['Path,Reason'];

  for (let k in DATA.documents) {
    if (groupPath && !k.startsWith(prefixWithSlash)) continue;
    let doc = DATA.documents[k];
    let reason = '';

    let parts = k.split('/');
    for (let depth = 1; depth < parts.length; depth++) {
      let folderPath = parts.slice(0, depth).join('/');
      if (window._graphFolderFilter[folderPath] === false) {
        reason = 'Folder disabled: ' + folderPath;
        break;
      }
    }
    if (!reason && doc) {
      let type = doc.type || 'unknown';
      if (window._graphTypeFilter[type] === false) reason = 'Type disabled: ' + type;
    }
    if (!reason && doc) {
      let ext = (doc.ext || '').toLowerCase();
      if (ext && window._graphCustomExtExclude.includes(ext)) reason = 'Extension excluded: ' + ext;
    }
    if (reason) {
      lines.push('"' + k.replace(/"/g, '""') + '","' + reason.replace(/"/g, '""') + '"');
    }
  }

  let blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  let link = document.createElement('a');
  link.download = 'excluded_files_report.csv';
  link.href = URL.createObjectURL(blob);
  link.click();
};

// ==========================================
// SERVER RE-CHECK
// ==========================================
window.recheckServerAndRefresh = async function() {
  let serverUrl = await resolveBuilderServerUrl();
  if (serverUrl) {
    window.isServerMode = true;
    // Re-open the same group management page to refresh all sections
    if (window._gmCurrentGroupPath && typeof window.openGroupManagement === 'function') {
      window.openGroupManagement(window._gmCurrentGroupPath);
    } else {
      window.location.reload();
    }
  } else {
    alert('Server still not reachable. Make sure you ran the command in your terminal and the server is listening.');
  }
};

// ==========================================
// PLATFORM-AWARE SERVER START COMMAND
// ==========================================
window.getServerStartCommand = function() {
  let appRoot = (typeof CONFIG !== 'undefined' && CONFIG.app_root) ? CONFIG.app_root : '';
  let platform = (typeof CONFIG !== 'undefined' && CONFIG.platform) ? CONFIG.platform : '';

  // Detect platform from CONFIG or navigator
  if (!platform) {
    let ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) platform = 'windows';
    else if (ua.includes('mac')) platform = 'darwin';
    else platform = 'linux';
  }

  let pythonCmd = (platform === 'windows') ? 'python' : 'python3';
  let cdCmd = '';
  let separator = '';

  if (appRoot) {
    if (platform === 'windows') {
      // Windows: use backslashes and && separator
      let winPath = appRoot.replace(/\//g, '\\');
      cdCmd = 'cd /d "' + winPath + '"';
      separator = ' && ';
    } else {
      // Linux/Mac: use forward slashes
      cdCmd = 'cd "' + appRoot + '"';
      separator = ' && ';
    }
  }

  let runCmd = pythonCmd + ' builder.py --serve';
  return cdCmd ? (cdCmd + separator + runCmd) : runCmd;
};

// ==========================================
// SYNC FOLDER FILTERS TO SERVER
// ==========================================
// Push all disabled folders from localStorage to server's graph_ignored_paths
window.syncFolderFiltersToServer = async function() {
  if (!window.isServerMode) return;
  let disabled = [];
  for (let path in window._graphFolderFilter) {
    if (window._graphFolderFilter[path] === false) {
      disabled.push(path);
    }
  }
  try {
    await fetch('/api/settings/ignored-paths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', paths: disabled })
    });
  } catch (e) {}
};

// Auto-sync when server is available
(async function() {
  if (window.location.protocol !== 'file:') {
    try {
      let res = await fetch('/watch-id');
      if (res.ok) {
        window.isServerMode = true;
        window.syncFolderFiltersToServer();
      }
    } catch(e) {}
  }
})();

// ==========================================
// EXPORT/IMPORT FILTER SETTINGS (web → builder)
// ==========================================
// Exports filters, triggers builder, and reloads the page
window.rebuildWithCurrentFilters = async function() {
  let settings = {
    _export_source: 'axe-anchor-web-ui',
    _export_date: new Date().toISOString(),
    graph_folder_filter: window._graphFolderFilter || {},
    graph_type_filter: window._graphTypeFilter || {},
    graph_custom_ext_exclude: window._graphCustomExtExclude || [],
    graph_unlisted_types_visible: window._graphUnlistedTypesVisible,
    anchor_unlisted_types_visible: window._anchorUnlistedTypesVisible,
    graph_ignored_paths: []
  };

  // Build the ignored paths list from disabled folders
  for (let path in settings.graph_folder_filter) {
    if (settings.graph_folder_filter[path] === false) {
      settings.graph_ignored_paths.push(path);
    }
  }

  // Step 1: Sync ignored paths to server
  if (window.isServerMode) {
    try {
      await fetch('/api/settings/ignored-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', paths: settings.graph_ignored_paths })
      });
    } catch (e) {}
  }

  // Step 2: Save the export file (for offline/file:// use)
  let json = JSON.stringify(settings, null, 2);
  let blob = new Blob([json], { type: 'application/json' });
  let link = document.createElement('a');
  link.download = 'axe_filter_settings.json';
  link.href = URL.createObjectURL(blob);
  link.click();

  // Step 3: Run the builder
  if (window.isServerMode) {
    try {
      let btn = event && event.target;
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Building...'; }
      let res = await fetch('/run-builder', { method: 'POST' });
      let data = await res.json();
      if (data.status === 'success') {
        // Step 4: Reload to the same page
        window.location.reload();
      } else {
        alert('Build failed: ' + (data.message || 'Unknown error'));
        if (btn) { btn.disabled = false; btn.textContent = '🔄 Rebuild with current filters'; }
      }
    } catch (e) {
      alert('Builder not reachable. Place axe_filter_settings.json in the AXE-Anchor folder and run: python3 builder.py');
      if (event && event.target) { event.target.disabled = false; event.target.textContent = '🔄 Rebuild with current filters'; }
    }
  } else {
    alert('Filter settings exported. Place axe_filter_settings.json in the AXE-Anchor root folder and run:\n\npython3 builder.py\n\nThen reload the page.');
  }
};

// Keep legacy name as alias
window.exportFilterSettings = window.rebuildWithCurrentFilters;
