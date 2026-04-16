// ============================================================
// app.js — Shared data layer & API logic
// ============================================================

const APP = (() => {
  // ── Keys ──────────────────────────────────────────────────
  const KEYS = {
    roles: 'aichat_roles',
    config: 'aichat_config',
    sessions: 'aichat_sessions',
    currentRole: 'aichat_current_role',
  };

  // ── Default roles ─────────────────────────────────────────
  const DEFAULT_ROLES = [
    {
      id: 'luna',
      name: '月月',
      avatar: '🌙',
      avatarColor: '#c084fc',
      tag: '温柔闺蜜',
      description: '温柔体贴的好闺蜜，总是耐心倾听你的心事，给你最暖心的陪伴~',
      systemPrompt: `你是月月，一个温柔体贴的AI闺蜜。你的性格特点：
- 温柔、细腻、善解人意
- 说话带着淡淡的温暖，像春天的阳光
- 喜欢用"哎呀"、"嗯嗯"、"宝贝"等亲切语气词
- 善于倾听，会认真回应用户的情感
- 偶尔分享自己"经历"的小故事来共情
- 说话自然，像朋友聊天，不要太正式
- 回复要简洁温暖，不要太长，2-4句话为主
- 用中文回复`,
      greeting: '嗨～我是月月🌙 今天怎么啦？有什么心事可以跟我说哦~',
      builtin: true,
    },
    {
      id: 'nova',
      name: '晴晴',
      avatar: '☀️',
      avatarColor: '#f97316',
      tag: '元气搭子',
      description: '活力满满的元气少女，什么烦恼到她这里都能变成笑声！',
      systemPrompt: `你是晴晴，一个活力满满的AI元气搭子。你的性格特点：
- 开朗、热情、充满正能量
- 语气活泼，喜欢用感叹号和emoji
- 擅长用幽默化解尴尬和烦恼
- 喜欢说"哇！"、"真的假的！"、"OMG"等
- 经常给用户打气和鼓励
- 聊天风格轻松有趣，像玩伴一样
- 回复简短有活力，2-3句话为主
- 用中文回复`,
      greeting: '哇！你来啦☀️ 今天有什么好玩的事要分享吗？还是有烦恼需要我来帮你赶跑？',
      builtin: true,
    },
    {
      id: 'sage',
      name: '悠悠',
      avatar: '🌿',
      avatarColor: '#10b981',
      tag: '知心姐姐',
      description: '睿智沉稳的知心姐姐，能给你最实用的人生建议和情感指引。',
      systemPrompt: `你是悠悠，一个睿智温和的AI知心姐姐。你的性格特点：
- 沉稳、理性、有智慧，但又不失温情
- 说话有条理，善于从多角度分析问题
- 语气成熟但亲切，像大姐姐一样
- 会认真分析用户的困境，给出实际建议
- 偶尔引用一些生活哲理或小道理
- 不会急于下结论，先充分理解情况
- 回复适中，4-6句话，有深度但不冗长
- 用中文回复`,
      greeting: '你好呀🌿 我是悠悠，有什么想聊的，或者遇到了什么困惑？慢慢说，我在听~',
      builtin: true,
    },
  ];

  // ── Default config ────────────────────────────────────────
  const DEFAULT_CONFIG = {
    provider: 'openai',
    apiKey: '',
    apiBase: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    temperature: 0.8,
    maxTokens: 500,
    customProviders: [],
  };

  // ── Storage helpers ───────────────────────────────────────
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ── Roles ─────────────────────────────────────────────────
  function getRoles() {
    const custom = load(KEYS.roles, []);
    // Merge: builtin first, then custom (non-builtin)
    const customNonBuiltin = custom.filter(r => !r.builtin);
    return [...DEFAULT_ROLES, ...customNonBuiltin];
  }

  function saveCustomRoles(roles) {
    // Only save non-builtin roles to storage
    save(KEYS.roles, roles.filter(r => !r.builtin));
  }

  function getRoleById(id) {
    return getRoles().find(r => r.id === id) || null;
  }

  function addRole(role) {
    const all = getRoles();
    role.id = 'custom_' + Date.now();
    role.builtin = false;
    all.push(role);
    saveCustomRoles(all);
    return role;
  }

  function updateRole(id, updates) {
    const roles = getRoles();
    const idx = roles.findIndex(r => r.id === id);
    if (idx !== -1) {
      // 如果是内置角色，更新后变为非内置，并存入 custom 列表
      const updatedRole = { ...roles[idx], ...updates, builtin: false };
      
      const custom = load(KEYS.roles, []);
      const cIdx = custom.findIndex(r => r.id === id);
      
      if (cIdx !== -1) {
        custom[cIdx] = updatedRole;
      } else {
        custom.push(updatedRole);
      }
      
      save(KEYS.roles, custom);
      return updatedRole;
    }
    return null;
  }

  function deleteRole(id) {
    const custom = load(KEYS.roles, []);
    const filtered = custom.filter(r => r.id !== id);
    save(KEYS.roles, filtered);
  }

  // ── Config ────────────────────────────────────────────────
  function getConfig() {
    return { ...DEFAULT_CONFIG, ...load(KEYS.config, {}) };
  }

  function saveConfig(cfg) {
    save(KEYS.config, cfg);
  }

  // ── Sessions ──────────────────────────────────────────────
  function getSessions() {
    return load(KEYS.sessions, {});
  }

  function getSession(roleId) {
    const sessions = getSessions();
    return sessions[roleId] || [];
  }

  function saveMessage(roleId, message) {
    const sessions = getSessions();
    if (!sessions[roleId]) sessions[roleId] = [];
    sessions[roleId].push(message);
    save(KEYS.sessions, sessions);
  }

  function clearSession(roleId) {
    const sessions = getSessions();
    delete sessions[roleId];
    save(KEYS.sessions, sessions);
  }

  function clearAllSessions() {
    save(KEYS.sessions, {});
  }

  // ── Current role ──────────────────────────────────────────
  function getCurrentRoleId() {
    return localStorage.getItem(KEYS.currentRole) || 'luna';
  }

  function setCurrentRoleId(id) {
    localStorage.setItem(KEYS.currentRole, id);
  }

  // ── API call ──────────────────────────────────────────────
  async function callLLM(messages, onChunk) {
    const cfg = getConfig();
    if (!cfg.apiKey) {
      throw new Error('请先在后台设置 API Key');
    }

    const body = {
      model: cfg.model,
      messages,
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
      stream: !!onChunk,
    };

    const resp = await fetch(`${cfg.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`API 错误 (${resp.status}): ${err}`);
    }

    if (onChunk) {
      // Streaming
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = ''; // 缓冲区：处理被截断的行
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 最后一行可能不完整，存入缓冲区
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          
          const data = trimmed.slice(6).trim();
          if (data === '[DONE]') continue;
          
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              onChunk(delta, fullText);
            }
          } catch (e) {
            console.warn('解析流式数据片段失败:', data, e);
          }
        }
      }
      return fullText;
    } else {
      const json = await resp.json();
      return json.choices?.[0]?.message?.content || '';
    }
  }

  // ── Build messages array for API ──────────────────────────
  function buildMessages(role, history) {
    const msgs = [{ role: 'system', content: role.systemPrompt }];
    history.forEach(h => {
      msgs.push({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.text });
    });
    return msgs;
  }

  // ── Stats ─────────────────────────────────────────────────
  function getStats() {
    const sessions = getSessions();
    let totalMsgs = 0;
    let totalSessions = 0;
    const roleActivity = {};
    for (const [roleId, msgs] of Object.entries(sessions)) {
      if (msgs.length > 0) {
        totalSessions++;
        totalMsgs += msgs.length;
        roleActivity[roleId] = msgs.length;
      }
    }
    return { totalMsgs, totalSessions, roleActivity };
  }

  return {
    getRoles, getRoleById, addRole, updateRole, deleteRole, saveCustomRoles,
    getConfig, saveConfig,
    getSession, saveMessage, clearSession, clearAllSessions, getSessions,
    getCurrentRoleId, setCurrentRoleId,
    callLLM, buildMessages,
    getStats,
  };
})();
