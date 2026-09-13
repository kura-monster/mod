const state = {
  schema: [],
  values: {},
};

const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// ケース履歴(reason/targetLabel等)はDiscordメッセージ内容やニックネームに由来し、
// 荒らしが仕込んだHTML/JSが含まれ得るため、innerHTMLへ差し込む前に必ずエスケープする
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

function showToast(message, kind) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${kind ?? ''}`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 2500);
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('unauthorized');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `リクエストに失敗しました (status=${res.status})`);
  }
  return body;
}

function initTabs() {
  const buttons = document.querySelectorAll('.tab-button');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(`tab-${button.dataset.tab}`).classList.add('active');
      if (button.dataset.tab === 'stats') {
        loadStats();
      }
    });
  });
}

function renderInput(field) {
  const value = state.values[field.key];

  if (field.type === 'boolean') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(value);
    input.addEventListener('change', () => saveField(field, input.checked, input));
    return input;
  }

  if (field.type === 'select') {
    const select = document.createElement('select');
    for (const option of field.options ?? []) {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      if (option === value) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => saveField(field, select.value, select));
    return select;
  }

  const input = document.createElement('input');
  input.type = field.type === 'number' ? 'number' : 'text';

  if (field.type === 'stringList') {
    input.value = Array.isArray(value) ? value.join(', ') : '';
    input.placeholder = 'カンマ区切りで入力';
  } else {
    input.value = value ?? '';
  }

  input.addEventListener('change', () => {
    let newValue = input.value;
    if (field.type === 'number') {
      newValue = Number(input.value);
    } else if (field.type === 'stringList') {
      newValue = input.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    saveField(field, newValue, input);
  });

  return input;
}

async function saveField(field, value, inputEl) {
  const row = inputEl.closest('.field-row');
  const status = row.querySelector('.field-status');
  status.textContent = '…';

  try {
    const result = await api('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ key: field.key, value }),
    });
    state.values = result.values;
    status.textContent = '';
    showToast(`${field.label} を更新しました`, 'success');
  } catch (error) {
    status.textContent = '';
    showToast(error.message, 'error');
  } finally {
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  }
}

function renderSettings() {
  const container = document.getElementById('settings-groups');
  container.innerHTML = '';

  const groups = new Map();
  for (const field of state.schema) {
    if (!groups.has(field.group)) groups.set(field.group, []);
    groups.get(field.group).push(field);
  }

  for (const [groupName, fields] of groups) {
    const groupEl = document.createElement('div');
    groupEl.className = 'settings-group';

    const heading = document.createElement('h2');
    heading.textContent = groupName;
    groupEl.appendChild(heading);

    for (const field of fields) {
      const row = document.createElement('div');
      row.className = 'field-row';

      const label = document.createElement('div');
      label.className = 'field-label';
      label.innerHTML = `<span class="label-text">${field.label}</span><span class="env-var">${field.envVar}</span>`;

      const inputWrap = document.createElement('div');
      inputWrap.className = 'field-input';
      inputWrap.appendChild(renderInput(field));

      const status = document.createElement('span');
      status.className = 'field-status';
      inputWrap.appendChild(status);

      row.appendChild(label);
      row.appendChild(inputWrap);
      groupEl.appendChild(row);
    }

    container.appendChild(groupEl);
  }
}

async function loadSettings() {
  const data = await api('/api/settings');
  state.schema = data.schema;
  state.values = data.values;
  renderSettings();
}

const SEVERITY_LABELS = { minor: '軽度', moderate: '中度', severe: '重度' };

function severityBadge(severity) {
  // severityはCSSクラス名にそのまま使うため、既知の3値以外は安全な既定値へフォールバックする
  const safeSeverity = Object.prototype.hasOwnProperty.call(SEVERITY_LABELS, severity) ? severity : 'moderate';
  return `<span class="badge badge-${safeSeverity}">${escapeHtml(SEVERITY_LABELS[safeSeverity] ?? severity)}</span>`;
}

async function loadStats() {
  const days = document.getElementById('stats-days').value;
  const [stats, casesData] = await Promise.all([
    api(`/api/stats?days=${days}`),
    api('/api/cases?limit=50'),
  ]);

  const summary = document.getElementById('stats-summary');
  summary.innerHTML = `
    <div class="stat-card"><div class="value">${stats.total}</div><div class="label">総件数(${stats.days}日間)</div></div>
    <div class="stat-card"><div class="value">${stats.bySeverity.minor ?? 0}</div><div class="label">軽度</div></div>
    <div class="stat-card"><div class="value">${stats.bySeverity.moderate ?? 0}</div><div class="label">中度</div></div>
    <div class="stat-card"><div class="value">${stats.bySeverity.severe ?? 0}</div><div class="label">重度</div></div>
  `;

  const tbody = document.getElementById('cases-body');
  tbody.innerHTML = casesData.cases
    .map(
      (c) => `
    <tr>
      <td>#${escapeHtml(c.id)}</td>
      <td>${escapeHtml(c.action)}</td>
      <td>${severityBadge(c.severity)}</td>
      <td>${escapeHtml(c.targetLabel)}</td>
      <td>${escapeHtml(c.moderatorTag)}</td>
      <td>${escapeHtml(c.reason)}</td>
      <td>${escapeHtml(new Date(c.timestamp).toLocaleString('ja-JP'))}</td>
    </tr>
  `,
    )
    .join('');
}

async function init() {
  initTabs();

  try {
    const me = await api('/api/me');
    document.getElementById('username').textContent = `${me.username} でログイン中`;
  } catch {
    return;
  }

  await loadSettings();

  document.getElementById('stats-days').addEventListener('change', loadStats);
}

init();
