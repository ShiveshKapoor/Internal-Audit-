/* ============================================
   AuditAI — Application Logic
   ============================================ */

(function () {
  'use strict';

  // ---- State ----
  const state = {
    grants: JSON.parse(localStorage.getItem('auditai_grants') || '[]'),
    entities: JSON.parse(localStorage.getItem('auditai_entities') || '[]'),
    recs: JSON.parse(localStorage.getItem('auditai_recs') || '[]'),
    docs: JSON.parse(localStorage.getItem('auditai_docs') || '[]'),
    chatHistory: JSON.parse(localStorage.getItem('auditai_chat') || '[]'),
    settings: JSON.parse(localStorage.getItem('auditai_settings') || '{}'),
    editingGrantIdx: -1,
    editingEntityIdx: -1,
  };

  function save(key, data) {
    localStorage.setItem('auditai_' + key, JSON.stringify(data));
  }

  // ---- Navigation ----
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const mod = btn.dataset.module;
      navItems.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
      document.getElementById('module-' + mod).classList.add('active');
    });
  });

  // ---- Tab Navigation ----
  document.querySelectorAll('.tab-bar').forEach(bar => {
    bar.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        const parent = bar.parentElement;
        bar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        parent.querySelector('#tab-' + tabId).classList.add('active');
      });
    });
  });

  // ---- Settings Modal ----
  const settingsModal = document.getElementById('settings-modal');
  document.getElementById('settings-btn').addEventListener('click', () => {
    settingsModal.classList.add('show');
    // Populate fields
    document.getElementById('api-provider').value = state.settings.provider || 'openai';
    document.getElementById('api-key').value = state.settings.apiKey || '';
    document.getElementById('api-endpoint').value = state.settings.endpoint || '';
    document.getElementById('api-model').value = state.settings.model || 'gpt-4o';
    toggleEndpoint();
  });
  document.getElementById('settings-close').addEventListener('click', () => settingsModal.classList.remove('show'));
  settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.classList.remove('show'); });

  const providerSelect = document.getElementById('api-provider');
  providerSelect.addEventListener('change', toggleEndpoint);
  function toggleEndpoint() {
    const ep = document.getElementById('api-endpoint-group');
    ep.style.display = (providerSelect.value === 'custom' || providerSelect.value === 'azure') ? 'block' : 'none';
  }

  document.getElementById('save-settings-btn').addEventListener('click', () => {
    state.settings = {
      provider: document.getElementById('api-provider').value,
      apiKey: document.getElementById('api-key').value,
      endpoint: document.getElementById('api-endpoint').value,
      model: document.getElementById('api-model').value,
    };
    save('settings', state.settings);
    const status = document.getElementById('settings-status');
    status.textContent = '✓ Settings saved successfully';
    status.className = 'settings-status success';
    setTimeout(() => settingsModal.classList.remove('show'), 1000);
  });

  // ---- LLM API Call ----
  async function callLLM(systemPrompt, userMessage) {
    const { provider, apiKey, endpoint, model } = state.settings;

    if (!apiKey) {
      return '⚠️ No API key configured. Click "API Settings" in the sidebar to connect your LLM provider.';
    }

    let url;
    if (provider === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions';
    } else if (provider === 'azure' || provider === 'custom') {
      if (!endpoint) return '⚠️ No API endpoint configured. Please set your endpoint in API Settings.';
      url = endpoint.endsWith('/') ? endpoint + 'chat/completions' : endpoint + '/chat/completions';
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (provider === 'azure') {
      headers['api-key'] = apiKey;
    } else {
      headers['Authorization'] = 'Bearer ' + apiKey;
    }

    const body = {
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    };

    try {
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.text();
        return '⚠️ API Error (' + res.status + '): ' + err.substring(0, 200);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '(No response from model)';
    } catch (err) {
      return '⚠️ Network error: ' + err.message;
    }
  }

  // Show typing indicator
  function showLoading(container) {
    const el = document.createElement('div');
    el.className = 'typing-indicator';
    el.id = 'loading-' + container.id;
    el.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }

  function removeLoading(container) {
    const el = document.getElementById('loading-' + container.id);
    if (el) el.remove();
  }

  // ---- Module 1: Institutional Memory ----
  const memoryChat = document.getElementById('memory-chat');
  const memoryInput = document.getElementById('memory-input');

  // Document upload
  document.getElementById('memory-upload-btn').addEventListener('click', () => {
    document.getElementById('memory-file-input').click();
  });

  document.getElementById('memory-file-input').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        state.docs.push({ name: f.name, size: f.size, content: ev.target.result.substring(0, 50000) });
        save('docs', state.docs);
        renderDocs();
      };
      reader.readAsText(f);
    });
    e.target.value = '';
  });

  function renderDocs() {
    const list = document.getElementById('memory-doc-list');
    if (state.docs.length === 0) {
      list.innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Upload audit reports, planning memos, working papers, and management responses</p></div>';
      return;
    }
    list.innerHTML = state.docs.map((d, i) => `
      <div class="doc-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span title="${d.name}">${d.name}</span>
        <button class="btn-icon remove-doc" data-idx="${i}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');
    list.querySelectorAll('.remove-doc').forEach(btn => {
      btn.addEventListener('click', () => {
        state.docs.splice(parseInt(btn.dataset.idx), 1);
        save('docs', state.docs);
        renderDocs();
      });
    });
  }
  renderDocs();

  // Chat suggestion chips
  document.querySelectorAll('#module-memory .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      memoryInput.value = chip.dataset.q;
      sendMemoryChat();
    });
  });

  document.getElementById('memory-send').addEventListener('click', sendMemoryChat);
  memoryInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMemoryChat(); }
  });

  async function sendMemoryChat() {
    const text = memoryInput.value.trim();
    if (!text) return;
    memoryInput.value = '';

    // Clear welcome
    const welcome = memoryChat.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.textContent = text;
    memoryChat.appendChild(userMsg);
    memoryChat.scrollTop = memoryChat.scrollHeight;

    // Build context from documents
    const docContext = state.docs.map(d => `--- Document: ${d.name} ---\n${d.content}`).join('\n\n');

    const systemPrompt = `You are an internal audit knowledge assistant for an Internal Audit Unit (IAU). You have access to the following audit documents:

${docContext || '(No documents uploaded yet)'}

When answering questions:
- Synthesise information across documents, don't just list links
- Reference specific documents and findings when relevant
- Identify patterns across offices and time periods
- Note any open recommendations or unresolved issues
- Be precise about dates, amounts, and responsible parties
- If the question cannot be answered from the available documents, say so clearly

If no documents are uploaded, explain that the user needs to upload audit documents first, and give an example of the kind of answer you could provide.`;

    showLoading(memoryChat);
    const response = await callLLM(systemPrompt, text);
    removeLoading(memoryChat);

    const aiMsg = document.createElement('div');
    aiMsg.className = 'chat-msg ai';
    aiMsg.innerHTML = '<div class="msg-label">AuditAI</div>' + formatResponse(response);
    memoryChat.appendChild(aiMsg);
    memoryChat.scrollTop = memoryChat.scrollHeight;

    // Save chat history
    state.chatHistory.push({ role: 'user', content: text }, { role: 'ai', content: response });
    save('chat', state.chatHistory);
  }

  // Re-render saved chat on load
  if (state.chatHistory.length > 0) {
    const welcome = memoryChat.querySelector('.chat-welcome');
    if (welcome) welcome.remove();
    state.chatHistory.forEach(msg => {
      const el = document.createElement('div');
      if (msg.role === 'user') {
        el.className = 'chat-msg user';
        el.textContent = msg.content;
      } else {
        el.className = 'chat-msg ai';
        el.innerHTML = '<div class="msg-label">AuditAI</div>' + formatResponse(msg.content);
      }
      memoryChat.appendChild(el);
    });
  }

  // ---- Module 2: Grant Risk Radar ----
  const grantModal = document.getElementById('grant-modal');
  document.getElementById('add-grant-btn').addEventListener('click', () => {
    state.editingGrantIdx = -1;
    document.getElementById('grant-modal-title').textContent = 'Add Grant';
    clearGrantForm();
    grantModal.classList.add('show');
  });
  document.getElementById('grant-close').addEventListener('click', () => grantModal.classList.remove('show'));
  grantModal.addEventListener('click', e => { if (e.target === grantModal) grantModal.classList.remove('show'); });

  function clearGrantForm() {
    ['grant-id', 'grant-name', 'grant-budget', 'grant-burn'].forEach(id => document.getElementById(id).value = '');
    ['grant-vendor', 'grant-late', 'grant-docs'].forEach(id => document.getElementById(id).value = 'no');
  }

  document.getElementById('save-grant-btn').addEventListener('click', () => {
    const grant = {
      id: document.getElementById('grant-id').value.trim(),
      name: document.getElementById('grant-name').value.trim(),
      budget: parseFloat(document.getElementById('grant-budget').value) || 0,
      burnRate: parseFloat(document.getElementById('grant-burn').value) || 0,
      singleVendor: document.getElementById('grant-vendor').value === 'yes',
      lateSpend: document.getElementById('grant-late').value === 'yes',
      docGaps: document.getElementById('grant-docs').value === 'yes',
    };
    if (!grant.id || !grant.name) return alert('Grant ID and Programme Name are required.');

    grant.riskScore = calculateGrantRisk(grant);

    if (state.editingGrantIdx >= 0) {
      state.grants[state.editingGrantIdx] = grant;
    } else {
      state.grants.push(grant);
    }
    save('grants', state.grants);
    renderGrants();
    grantModal.classList.remove('show');
  });

  function calculateGrantRisk(g) {
    let score = 0;
    // Burn rate scoring
    if (g.burnRate <= 5) score += 25; // Very low burn = high risk
    else if (g.burnRate >= 85) score += 20; // Very high burn = risk
    else if (g.burnRate >= 60 && g.burnRate < 85) score += 5;
    else if (g.burnRate > 5 && g.burnRate < 30) score += 15;

    if (g.singleVendor) score += 25;
    if (g.lateSpend) score += 20;
    if (g.docGaps) score += 25;

    // Budget size factor
    if (g.budget >= 20000000) score += 10;
    else if (g.budget >= 10000000) score += 5;

    return Math.min(score, 100);
  }

  function riskLevel(score) {
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  function renderGrants() {
    const tbody = document.getElementById('grants-tbody');
    if (state.grants.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state"><p>No grants added yet. Click "Add Grant" to begin monitoring.</p></div></td></tr>';
      updateGrantStats();
      return;
    }
    tbody.innerHTML = state.grants.map((g, i) => {
      const level = riskLevel(g.riskScore);
      return `<tr>
        <td style="color: var(--text-primary); font-weight: 500;">${g.id}</td>
        <td>${g.name}</td>
        <td>$${(g.budget).toLocaleString()}</td>
        <td>${g.burnRate}%</td>
        <td>${g.singleVendor ? '⚠️ Yes' : 'No'}</td>
        <td>${g.lateSpend ? '⚠️ Yes' : 'No'}</td>
        <td>${g.docGaps ? '⚠️ Yes' : 'No'}</td>
        <td><span class="risk-badge ${level}">${g.riskScore}</span></td>
        <td>
          <button class="btn-icon edit-grant" data-idx="${i}" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon del-grant" data-idx="${i}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.edit-grant').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        state.editingGrantIdx = idx;
        const g = state.grants[idx];
        document.getElementById('grant-modal-title').textContent = 'Edit Grant';
        document.getElementById('grant-id').value = g.id;
        document.getElementById('grant-name').value = g.name;
        document.getElementById('grant-budget').value = g.budget;
        document.getElementById('grant-burn').value = g.burnRate;
        document.getElementById('grant-vendor').value = g.singleVendor ? 'yes' : 'no';
        document.getElementById('grant-late').value = g.lateSpend ? 'yes' : 'no';
        document.getElementById('grant-docs').value = g.docGaps ? 'yes' : 'no';
        grantModal.classList.add('show');
      });
    });

    tbody.querySelectorAll('.del-grant').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this grant?')) {
          state.grants.splice(parseInt(btn.dataset.idx), 1);
          save('grants', state.grants);
          renderGrants();
        }
      });
    });

    updateGrantStats();
  }

  function updateGrantStats() {
    document.getElementById('stat-total-grants').textContent = state.grants.length;
    document.getElementById('stat-high-risk').textContent = state.grants.filter(g => riskLevel(g.riskScore) === 'high').length;
    document.getElementById('stat-medium-risk').textContent = state.grants.filter(g => riskLevel(g.riskScore) === 'medium').length;
    document.getElementById('stat-low-risk').textContent = state.grants.filter(g => riskLevel(g.riskScore) === 'low').length;
  }
  renderGrants();

  // Grant AI Analysis
  document.getElementById('analyze-grants-btn').addEventListener('click', async () => {
    const output = document.getElementById('grant-ai-output');
    if (state.grants.length === 0) {
      output.innerHTML = '<p class="muted">Add grants first to analyze the portfolio.</p>';
      return;
    }
    const grantData = state.grants.map(g => `${g.id} "${g.name}": Budget $${g.budget.toLocaleString()}, Burn Rate ${g.burnRate}%, Single Vendor: ${g.singleVendor}, Late Spend: ${g.lateSpend}, Doc Gaps: ${g.docGaps}, Risk Score: ${g.riskScore}`).join('\n');
    const prompt = `Analyze this grant portfolio from an internal audit risk perspective. Identify the highest-risk grants and explain why. Suggest which grants should be prioritized for audit and what specific risks should be examined. Be specific and actionable.\n\nGrant Portfolio:\n${grantData}`;

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM('You are an internal audit risk analyst. Provide concise, actionable risk analysis for grant portfolios. Focus on burn rate anomalies, concentration risks, documentation gaps, and fraud indicators.', prompt);
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  // ---- Module 3: Fraud Signal Detection ----
  document.getElementById('fraud-file-drop').addEventListener('click', () => document.getElementById('fraud-file-input').click());
  document.getElementById('fraud-file-drop').addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('dragging'); });
  document.getElementById('fraud-file-drop').addEventListener('dragleave', e => e.currentTarget.classList.remove('dragging'));
  document.getElementById('fraud-file-drop').addEventListener('drop', e => { e.preventDefault(); e.currentTarget.classList.remove('dragging'); });

  document.getElementById('fraud-analyze-btn').addEventListener('click', async () => {
    const type = document.getElementById('fraud-type').value;
    const input = document.getElementById('fraud-input').value.trim();
    const output = document.getElementById('fraud-results');
    if (!input) return alert('Please enter or paste data to analyze.');

    const typeLabels = {
      procurement: 'procurement narratives and vendor justifications',
      vendor: 'vendor payment patterns',
      loa: 'LOA documentation and due diligence compliance',
      email: 'email metadata for business email compromise indicators',
      partner: 'partner payment draw-downs and milestone alignment'
    };

    const systemPrompt = `You are a fraud signal detection AI for an NGO internal audit unit. You analyze ${typeLabels[type]} for anomaly patterns. Flag each anomaly clearly with a severity rating (High/Medium/Low). For each flag, explain what the anomaly is, why it matters, and what the auditor should investigate further. Be specific — reference actual data points from the input. Structure your output clearly with headers and bullet points.`;

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM(systemPrompt, `Analyze the following ${typeLabels[type]} for fraud signals and anomalies:\n\n${input}`);
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  // ---- Module 4: Remote Audit ----
  document.getElementById('remote-doc-analyze').addEventListener('click', async () => {
    const input = document.getElementById('remote-doc-input').value.trim();
    const output = document.getElementById('remote-doc-output');
    if (!input) return alert('Please enter document data to analyze.');

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM(
      'You are a document consistency analysis AI for internal auditors conducting remote fieldwork. Scan the provided evidence for: internal inconsistencies, unusual patterns, missing mandatory fields, suspicious formatting, and data anomalies. Present findings clearly with severity ratings.',
      `Analyze these audit evidence documents for consistency:\n\n${input}`
    );
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  document.getElementById('remote-interview-gen').addEventListener('click', async () => {
    const office = document.getElementById('remote-office').value.trim();
    const context = document.getElementById('remote-context').value.trim();
    const output = document.getElementById('remote-interview-output');
    if (!context) return alert('Please provide background information.');

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM(
      'You are an interview preparation assistant for internal auditors. Given background documents and context about an audit engagement, generate a structured fieldwork interview brief. Include: key questions organized by area, known risk signals to probe, prior commitments to follow up on, areas where documentary evidence is incomplete, and suggested interview sequencing.',
      `Generate an interview preparation brief for the audit of: ${office || '(not specified)'}\n\nBackground Information:\n${context}`
    );
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  document.getElementById('remote-compare-btn').addEventListener('click', async () => {
    const evidence = document.getElementById('remote-evidence').value.trim();
    const statements = document.getElementById('remote-statements').value.trim();
    const output = document.getElementById('remote-compare-output');
    if (!evidence || !statements) return alert('Please provide both documentary evidence and interviewee statements.');

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM(
      'You are a real-time audit flag comparison tool. Compare interviewee statements against documentary evidence. Flag any inconsistencies, contradictions, or areas where statements differ from documented facts. For each flag, state what was said vs. what the documents show, and suggest follow-up questions.',
      `DOCUMENTARY EVIDENCE:\n${evidence}\n\nINTERVIEWEE STATEMENTS:\n${statements}\n\nIdentify all inconsistencies, contradictions, and areas requiring follow-up.`
    );
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  // ---- Module 5: Predictive Risk Scoring ----
  const entityModal = document.getElementById('entity-modal');
  document.getElementById('add-entity-btn').addEventListener('click', () => {
    state.editingEntityIdx = -1;
    document.getElementById('entity-modal-title').textContent = 'Add Entity';
    ['entity-name', 'entity-last-audit', 'entity-open-recs', 'entity-turnover', 'entity-budget-vol', 'entity-security', 'entity-complaints'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('entity-region').value = 'Africa';
    entityModal.classList.add('show');
  });
  document.getElementById('entity-close').addEventListener('click', () => entityModal.classList.remove('show'));
  entityModal.addEventListener('click', e => { if (e.target === entityModal) entityModal.classList.remove('show'); });

  document.getElementById('save-entity-btn').addEventListener('click', () => {
    const entity = {
      name: document.getElementById('entity-name').value.trim(),
      region: document.getElementById('entity-region').value,
      lastAudit: document.getElementById('entity-last-audit').value,
      openRecs: parseInt(document.getElementById('entity-open-recs').value) || 0,
      turnover: parseFloat(document.getElementById('entity-turnover').value) || 0,
      budgetVol: parseInt(document.getElementById('entity-budget-vol').value) || 1,
      security: parseInt(document.getElementById('entity-security').value) || 1,
      complaints: parseInt(document.getElementById('entity-complaints').value) || 0,
    };
    if (!entity.name) return alert('Entity name is required.');

    entity.riskScore = calculateEntityRisk(entity);
    entity.trend = 'stable';

    if (state.editingEntityIdx >= 0) {
      const prev = state.entities[state.editingEntityIdx];
      entity.trend = entity.riskScore > (prev.riskScore || 0) ? 'up' : entity.riskScore < (prev.riskScore || 0) ? 'down' : 'stable';
      state.entities[state.editingEntityIdx] = entity;
    } else {
      state.entities.push(entity);
    }
    save('entities', state.entities);
    renderEntities();
    entityModal.classList.remove('show');
  });

  function calculateEntityRisk(e) {
    let score = 0;

    // Time since last audit (in months)
    if (e.lastAudit) {
      const months = Math.floor((Date.now() - new Date(e.lastAudit).getTime()) / (1000 * 60 * 60 * 24 * 30));
      if (months > 36) score += 20;
      else if (months > 24) score += 12;
      else if (months > 12) score += 5;
    } else {
      score += 20; // Never audited
    }

    // Open recommendations
    if (e.openRecs > 5) score += 15;
    else if (e.openRecs > 2) score += 8;
    else if (e.openRecs > 0) score += 3;

    // Staff turnover
    if (e.turnover > 40) score += 15;
    else if (e.turnover > 20) score += 8;
    else if (e.turnover > 10) score += 3;

    // Budget volatility
    score += e.budgetVol * 2;

    // Security index
    score += e.security * 4;

    // Complaints
    if (e.complaints > 3) score += 15;
    else if (e.complaints > 1) score += 8;
    else if (e.complaints > 0) score += 3;

    return Math.min(score, 100);
  }

  function renderEntities() {
    const tbody = document.getElementById('entity-tbody');
    if (state.entities.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="11"><div class="empty-state"><p>Add entities from your audit universe to begin risk scoring.</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = state.entities.map((e, i) => {
      const level = riskLevel(e.riskScore);
      const trendIcon = e.trend === 'up' ? '↑' : e.trend === 'down' ? '↓' : '→';
      const trendClass = e.trend === 'up' ? 'trend-up' : e.trend === 'down' ? 'trend-down' : 'trend-stable';
      return `<tr>
        <td style="color: var(--text-primary); font-weight: 500;">${e.name}</td>
        <td>${e.region}</td>
        <td>${e.lastAudit || 'Never'}</td>
        <td>${e.openRecs}</td>
        <td>${e.turnover}%</td>
        <td>${e.budgetVol}/10</td>
        <td>${e.security}/5</td>
        <td>${e.complaints}</td>
        <td><span class="risk-badge ${level}">${e.riskScore}</span></td>
        <td class="${trendClass}" style="font-size: 1.2rem; font-weight: 600;">${trendIcon}</td>
        <td>
          <button class="btn-icon edit-entity" data-idx="${i}" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon del-entity" data-idx="${i}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.edit-entity').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        state.editingEntityIdx = idx;
        const e = state.entities[idx];
        document.getElementById('entity-modal-title').textContent = 'Edit Entity';
        document.getElementById('entity-name').value = e.name;
        document.getElementById('entity-region').value = e.region;
        document.getElementById('entity-last-audit').value = e.lastAudit;
        document.getElementById('entity-open-recs').value = e.openRecs;
        document.getElementById('entity-turnover').value = e.turnover;
        document.getElementById('entity-budget-vol').value = e.budgetVol;
        document.getElementById('entity-security').value = e.security;
        document.getElementById('entity-complaints').value = e.complaints;
        entityModal.classList.add('show');
      });
    });

    tbody.querySelectorAll('.del-entity').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this entity?')) {
          state.entities.splice(parseInt(btn.dataset.idx), 1);
          save('entities', state.entities);
          renderEntities();
        }
      });
    });
  }
  renderEntities();

  // Entity AI Analysis
  document.getElementById('analyze-entities-btn').addEventListener('click', async () => {
    const output = document.getElementById('entity-ai-output');
    if (state.entities.length === 0) {
      output.innerHTML = '<p class="muted">Add entities first.</p>';
      return;
    }
    const data = state.entities.map(e => `${e.name} (${e.region}): Last Audit ${e.lastAudit || 'Never'}, Open Recs: ${e.openRecs}, Turnover: ${e.turnover}%, Budget Vol: ${e.budgetVol}/10, Security: ${e.security}/5, Complaints: ${e.complaints}, Risk Score: ${e.riskScore}, Trend: ${e.trend}`).join('\n');

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM(
      'You are a predictive risk analyst for an internal audit unit. Analyze audit universe entities and provide: a prioritized ranking of entities requiring attention, key risk drivers for each high-risk entity, recommendations for mid-year plan adjustments, and any compounding risk signals that suggest emerging issues. Align with IIA Global Standards requirements for flexible audit planning.',
      `Analyze this audit universe for risk prioritization:\n\n${data}`
    );
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  // ---- Module 6: Interview Prep & Triangulation ----
  document.getElementById('interview-gen-btn').addEventListener('click', async () => {
    const engagement = document.getElementById('interview-engagement').value.trim();
    const source = document.getElementById('interview-source').value.trim();
    const output = document.getElementById('interview-brief-output');
    if (!source) return alert('Please provide source material.');

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM(
      `You are an internal audit interview preparation assistant. Given source documents for an audit engagement, you generate a comprehensive structured interview brief. Output format:

1. **KEY QUESTIONS BY AREA** — grouped by functional area (finance, procurement, HR, operations, compliance)
2. **RISK SIGNALS TO PROBE** — specific red flags from the source material requiring follow-up
3. **PRIOR COMMITMENTS** — management actions from prior audits that need verification
4. **EVIDENCE GAPS** — areas where documentary evidence is incomplete and interviews must fill the gap
5. **SUGGESTED INTERVIEW SEQUENCE** — recommended order of interviews for maximum effectiveness`,
      `Audit Engagement: ${engagement || '(not specified)'}\n\nSource Material:\n${source}`
    );
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  document.getElementById('triangulation-btn').addEventListener('click', async () => {
    const docs = document.getElementById('triangulation-docs').value.trim();
    const interviews = document.getElementById('triangulation-interviews').value.trim();
    const commitments = document.getElementById('triangulation-commitments').value.trim();
    const output = document.getElementById('triangulation-output');
    if (!docs || !interviews) return alert('Please provide both documentary findings and interview notes.');

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM(
      `You are a post-interview triangulation tool for internal auditors. Your job is to compare documentary evidence against interview statements and flag:

1. **DIRECT CONTRADICTIONS** — where interviewee accounts differ from documented facts
2. **INCONSISTENT ACCOUNTS** — where multiple interviewees gave conflicting responses
3. **UNACTED COMMITMENTS** — where prior management commitments appear not to have been followed through
4. **UNSUPPORTED CLAIMS** — where interviewee statements cannot be verified from available evidence
5. **SUGGESTED FOLLOW-UPS** — specific additional inquiries or evidence requests

Be precise, reference specific claims vs. evidence, and rate the severity of each finding.`,
      `DOCUMENTARY FINDINGS:\n${docs}\n\nINTERVIEW NOTES:\n${interviews}${commitments ? '\n\nPRIOR MANAGEMENT COMMITMENTS:\n' + commitments : ''}\n\nRun triangulation analysis.`
    );
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  // ---- Module 7: Report Drafting & QC ----
  document.getElementById('draft-gen-btn').addEventListener('click', async () => {
    const title = document.getElementById('draft-title').value.trim();
    const risk = document.getElementById('draft-risk').value;
    const notes = document.getElementById('draft-notes').value.trim();
    const output = document.getElementById('draft-output');
    if (!notes) return alert('Please enter your working notes.');

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM(
      `You are an audit report drafting assistant for an Internal Audit Unit (IAU). You write in the IAU house style which is: accurate, objective, clear, concise, constructive, and timely. Given working notes, generate a structured audit finding with these sections:

1. **FINDING TITLE**: Clear, descriptive title
2. **RISK RATING**: ${risk.toUpperCase()} — with brief justification
3. **CONDITION**: What was found (factual, evidence-based)
4. **CRITERIA**: What should have been in place (standards, policies, regulations)
5. **ROOT CAUSE**: Why the issue occurred
6. **EFFECT/IMPACT**: Consequences (actual or potential)
7. **RECOMMENDATION**: Specific, actionable, constructive recommendation
8. **MANAGEMENT ACTION PLAN**: Suggested management response framework

Use professional, constructive language. Be concise but thorough.`,
      `Finding Title: ${title || '(to be determined)'}\nRisk Rating: ${risk}\n\nWorking Notes:\n${notes}`
    );
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  // QC Check
  document.getElementById('qc-check-btn').addEventListener('click', async () => {
    const input = document.getElementById('qc-input').value.trim();
    const output = document.getElementById('qc-output');
    if (!input) return alert('Please enter draft report content.');

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM(
      `You are a quality control reviewer for internal audit reports. Review the draft finding/report against these quality criteria:

**COMPLETENESS CHECK:**
- Does the finding have a root cause?
- Is the risk rating consistent with the severity described?
- Does the management action plan address the recommendation?
- Are all required elements present (condition, criteria, cause, effect, recommendation)?

**CONSISTENCY CHECK:**
- Are risk ratings aligned with standard definitions (High = significant impact, Medium = moderate impact, Low = minor impact)?
- Is terminology used consistently?
- Are amounts, dates, and references accurate and consistent?

**TONE CHECK:**
- Is the language constructive rather than accusatory?
- Does the writing meet 'accurate, objective, clear, concise, constructive' standards?

For each issue found, rate severity (Critical/Major/Minor) and suggest specific corrections.`,
      `Review this draft audit report content for quality:\n\n${input}`
    );
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  // ---- Recommendation Tracker ----
  const recModal = document.getElementById('rec-modal');
  document.getElementById('add-rec-btn').addEventListener('click', () => {
    ['rec-report', 'rec-finding', 'rec-recommendation', 'rec-owner', 'rec-due'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('rec-status').value = 'open';
    recModal.classList.add('show');
  });
  document.getElementById('rec-close').addEventListener('click', () => recModal.classList.remove('show'));
  recModal.addEventListener('click', e => { if (e.target === recModal) recModal.classList.remove('show'); });

  document.getElementById('save-rec-btn').addEventListener('click', () => {
    const rec = {
      report: document.getElementById('rec-report').value.trim(),
      finding: document.getElementById('rec-finding').value.trim(),
      recommendation: document.getElementById('rec-recommendation').value.trim(),
      owner: document.getElementById('rec-owner').value.trim(),
      due: document.getElementById('rec-due').value,
      status: document.getElementById('rec-status').value,
    };
    if (!rec.report || !rec.finding) return alert('Report and Finding are required.');
    state.recs.push(rec);
    save('recs', state.recs);
    renderRecs();
    recModal.classList.remove('show');
  });

  function renderRecs() {
    const tbody = document.getElementById('rec-tbody');
    if (state.recs.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8"><div class="empty-state"><p>No recommendations tracked yet.</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = state.recs.map((r, i) => {
      const dueDate = r.due ? new Date(r.due) : null;
      const today = new Date();
      let daysText = '-';
      if (dueDate) {
        const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        daysText = diff > 0 ? `${diff}d left` : diff === 0 ? 'Today' : `${Math.abs(diff)}d overdue`;
        if (diff < 0 && r.status !== 'closed') r.status = 'overdue';
      }
      return `<tr>
        <td style="color: var(--text-primary); font-weight: 500;">${r.report}</td>
        <td>${r.finding}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.recommendation}">${r.recommendation}</td>
        <td>${r.owner}</td>
        <td>${r.due || '-'}</td>
        <td><span class="status-badge ${r.status}">${r.status.replace('-', ' ')}</span></td>
        <td>${daysText}</td>
        <td>
          <button class="btn-icon del-rec" data-idx="${i}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.del-rec').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this recommendation?')) {
          state.recs.splice(parseInt(btn.dataset.idx), 1);
          save('recs', state.recs);
          renderRecs();
        }
      });
    });
  }
  renderRecs();

  // Recommendation AI
  document.getElementById('rec-ai-btn').addEventListener('click', async () => {
    const output = document.getElementById('rec-ai-output');
    if (state.recs.length === 0) {
      output.innerHTML = '<p class="muted">Add recommendations first.</p>';
      return;
    }
    const data = state.recs.map(r => `Report: ${r.report} | Finding: ${r.finding} | Rec: ${r.recommendation} | Owner: ${r.owner} | Due: ${r.due || 'Not set'} | Status: ${r.status}`).join('\n');

    output.innerHTML = '';
    showLoading(output);
    const response = await callLLM(
      'You are a recommendation follow-up analyst for an internal audit unit. Analyze the recommendation tracker and highlight: overdue items requiring escalation, items approaching deadline, patterns of non-implementation, and suggestions for follow-up approach. This directly addresses PwC quality review findings on follow-up tracking.',
      `Analyze these audit recommendations for follow-up priorities:\n\n${data}`
    );
    removeLoading(output);
    output.innerHTML = formatResponse(response);
  });

  // ---- Utility: Format AI Response ----
  function formatResponse(text) {
    if (!text) return '';
    // Basic markdown-style formatting
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h4>$1</h4>')
      .replace(/^# (.+)$/gm, '<h4>$1</h4>')
      .replace(/^[-•] (.+)$/gm, '  • $1')
      .replace(/^\d+\.\s(.+)$/gm, '  $&')
      .replace(/\n/g, '<br>');
  }

})();
