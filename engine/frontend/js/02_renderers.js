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
    h = h.replace(/\/\*[\s\S]*?\*\//g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|FULL|ON|GROUP|ORDER|BY|HAVING|UNION|ALL|INSERT|INTO|UPDATE|SET|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|VIEW|AS|AND|OR|NOT|IN|EXISTS|LIKE|BETWEEN|IS|NULL|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|WITH|VALUES|EXEC|PROCEDURE|FUNCTION|TRIGGER|BEGIN|COMMIT|ROLLBACK|DECLARE|CAST|CONVERT|COALESCE|ISNULL|TOP|LIMIT|OFFSET)\\b/gi, '<span class="tok-kw">$1</span>');
    h = h.replace(/(&#39;(?:[^&#]|&(?!#))*?&#39;)/g, '<span class="tok-str">$1</span>');
    h = h.replace(/\\b(\\d+(?:\\.\\d+)?)\\b/g, '<span class="tok-num">$1</span>');
  } else if (lang === 'xml' || lang === 'html') {
    h = h.replace(/(&lt;!--[\\s\\S]*?--&gt;)/g, '<span class="tok-cmt">$1</span>');
    h = h.replace(/(&lt;\/?)([\w:.-]+)/g, (_, p, t) => `${p}<span class="tok-tag">${t}</span>`);
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
    h = h.replace(/\/\/[^\n]*/g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\/\*[\s\S]*?\*\//g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\\b(using|namespace|class|interface|struct|enum|public|private|protected|internal|static|readonly|volatile|virtual|override|abstract|sealed|new|this|base|string|int|long|short|bool|float|double|decimal|void|object|var|return|if|else|switch|case|default|for|foreach|while|do|break|continue|try|catch|finally|throw|typeof|sizeof|delegate|event|operator|implicit|explicit|null|true|false)\\b/g, '<span class="tok-kw">$1</span>');
    h = h.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;|&#39;(?:[^&#]|&(?!#))*?&#39;)/g, '<span class="tok-str">$1</span>');
    h = h.replace(/\\b(\\d+(?:\\.\\d+)?)\\b/g, '<span class="tok-num">$1</span>');
  } else if (lang === 'ts' || lang === 'typescript' || lang === 'js' || lang === 'javascript') {
    h = h.replace(/\/\/[^\n]*/g, m => `<span class="tok-cmt">${m}</span>`);
    h = h.replace(/\/\*[\s\S]*?\*\//g, m => `<span class="tok-cmt">${m}</span>`);
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
  h = h.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;">');
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  h = h.replace(/\\n{2,}/g, '</p><p>');
  h = '<p>' + h + '</p>';
  h = h.replace(/\\n/g, '<br>');
  blocks.forEach((block, idx) => { h = h.split(`@@BLK${idx}@@`).join(block); });
  h = h.replace(/<p>\\s*(<(?:h[1-6]|ul|ol|table|blockquote|pre|hr)[^>]*>)/g, '$1');
  h = h.replace(/(<\/(?:h[1-6]|ul|ol|table|blockquote|pre)>)\s*<\/p>/g, '$1');
  h = h.replace(/<p>\s*<\/p>/g, '');
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
