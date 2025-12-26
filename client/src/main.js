import './style.css'

const API_BASE = 'http://localhost:3001/api-gateway';

// Components
const renderKey = (key) => `
    <div class="list-item">
        <div>
            <div style="font-weight: 600;">${key.name}</div>
            <code style="font-size: 0.8rem; color: var(--accent);">${key.key}</code>
        </div>
        <button class="revoke-btn" data-id="${key.id}" style="background: var(--error); padding: 0.4rem 0.8rem; font-size: 0.8rem;">Revoke</button>
    </div>
`;

const renderRoute = (route) => `
    <div class="list-item">
        <div>
            <div style="font-weight: 600;">${route.path}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${route.target}</div>
        </div>
        <button class="delete-btn" data-id="${route.id}" style="background: var(--error); padding: 0.4rem 0.8rem; font-size: 0.8rem;">Delete</button>
    </div>
`;

const renderLog = (log) => `
    <div class="log-entry">
        <span style="color: var(--accent); font-weight: bold;">[${log.method}]</span> 
        ${log.path} - 
        <span class="badge ${log.status >= 400 ? 'badge-error' : 'badge-success'}">${log.status}</span> 
        <span style="color: var(--text-muted); margin-left: auto;">${log.duration}ms</span>
    </div>
`;

// State & Actions
async function fetchData() {
  try {
    const [stats, keys, routes] = await Promise.all([
      fetch(`${API_BASE}/stats`).then(r => r.json()),
      fetch(`${API_BASE}/keys`).then(r => r.json()),
      fetch(`${API_BASE}/routes`).then(r => r.json())
    ]);

    // Update Stats
    document.getElementById('total-requests').innerText = stats.totalRequests;
    document.getElementById('avg-latency').innerText = `${stats.averageLatency} ms`;
    document.getElementById('error-rate').innerText = `${stats.errorRate}%`;

    // Update Keys
    document.getElementById('keys-list').innerHTML = keys.map(k => renderKey(k)).join('');

    // Update Routes
    document.getElementById('routes-list').innerHTML = routes.map(r => renderRoute(r)).join('');

    // Update Logs
    document.getElementById('logs-viewer').innerHTML = stats.recentLogs.map(l => renderLog(l)).join('') || '<div class="log-entry">No recent traffic</div>';

    attachEventListeners();
  } catch (e) {
    console.error('Failed to fetch data', e);
  }
}

function attachEventListeners() {
  document.querySelectorAll('.revoke-btn').forEach(btn => {
    btn.onclick = async () => {
      await fetch(`${API_BASE}/keys/${btn.dataset.id}`, { method: 'DELETE' });
      fetchData();
    };
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async () => {
      await fetch(`${API_BASE}/routes/${btn.dataset.id}`, { method: 'DELETE' });
      fetchData();
    };
  });
}

document.getElementById('add-key-btn').onclick = async () => {
  const name = document.getElementById('new-key-name').value;
  if (!name) return alert('Please enter a name');
  await fetch(`${API_BASE}/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  document.getElementById('new-key-name').value = '';
  fetchData();
};

document.getElementById('add-route-btn').onclick = async () => {
  const path = document.getElementById('route-path').value;
  const target = document.getElementById('route-target').value;
  if (!path || !target) return alert('Please enter path and target');
  await fetch(`${API_BASE}/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, target, name: path })
  });
  document.getElementById('route-path').value = '';
  document.getElementById('route-target').value = '';
  fetchData();
};

// Polling
setInterval(fetchData, 3000);
fetchData();
