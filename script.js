// ============================================================
// 0. FIREBASE SETUP
localStorage.setItem('solifon-language', 'en');
localStorage.setItem('solifon-lang', 'en');
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyCBsuPtp3sBdGV0eFkTtSPKEpmNP7PSCsM",
    authDomain: "solifon-ai.firebaseapp.com",
    databaseURL: "https://solifon-ai-default-rtdb.europe-west1.firebasedatabase.app", 
    projectId: "solifon-ai",
    storageBucket: "solifon-ai.firebasestorage.app",
    messagingSenderId: "89616557186",
    appId: "1:89616557186:web:3e321e1ac35b9ec9e0009b",
    measurementId: "G-EFRJKCEB7V"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = (typeof firebase !== 'undefined') ? firebase.database() : null;

let currentUser = null;
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().getRedirectResult()
        .then((result) => {
            if (result && result.user) {
                currentUser = result.user;
                const m = document.getElementById('authModal');
                if (m) m.style.display = 'none';
            }
        })
        .catch((err) => {
            if (err.code !== 'auth/no-auth-event') {
                console.error('Ошибка проверки подписки', err);
            }
        });
}

// Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р В° Р Р†Р С•Р В·Р Р†РЎР‚Р В°РЎвЂљР В° Р С—Р С•РЎРѓР »Р Вµ Google redirect (Р СР С•Р В±Р С‘Р »РЎРЉР Р…РЎвЂ№Р Вµ)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            // Р —Р В°Р С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С Р СР С•Р Т‘Р В°Р »Р С”РЎС“ Р С—РЎР‚Р С‘ Р »РЎР‹Р В±Р С•Р С РЎРѓР С—Р С•РЎРѓР С•Р В±Р Вµ Р Р†РЎвЂ¦Р С•Р Т‘Р В°
            const m = document.getElementById('authModal');
            if (m) {
                m.style.display = 'none';
                m.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.src = user?.photoURL || '';
            avatar.style.display = user ? 'block' : 'none';
        }
    });
}
// в”Ђв”Ђ AUTH: Email + Password в”Ђв”Ђ
let authMode = ' или '; // 'login' Р С‘Р »Р С‘ 'register'

window.switchAuthTab = function(mode) {
    authMode = mode;
    const btnLogin = document.getElementById('tabLogin');
    const btnReg = document.getElementById('tabRegister');
    const submitBtn = document.getElementById('authSubmitBtn');
    const title = document.getElementById('authTitle');
    
    if (mode === 'login') {
        btnLogin.style.background = '#fff';
        btnLogin.style.color = '#000';
        btnReg.style.background = 'transparent';
        btnReg.style.color = '#fff';
        submitBtn.textContent = 'Создать аккаунт';
        title.textContent = 'Регистрация';
    } else {
        btnReg.style.background = '#fff';
        btnReg.style.color = '#000';
        btnLogin.style.background = 'transparent';
        btnLogin.style.color = '#fff';
        submitBtn.textContent = 'Создать аккаунт';
        title.textContent = 'Регистрация';
    }
    document.getElementById('authError').textContent = '';
};

window.submitAuth = function() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    const btn = document.getElementById('authSubmitBtn');
    
    // Валидация
    if (!email || !password) {
        errorEl.textContent = 'Пароль минимум 6 символов';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'Р СџР В°РЎР‚Р С•Р »РЎРЉ Р СР С‘Р Р…Р С‘Р СРЎС“Р С 6 РЎРѓР С‘Р СР Р†Р С•Р »Р С•Р Р†';
        return;
    }
    
    btn.textContent = 'Нажми меня';
    btn.disabled = true;
    errorEl.textContent = '';
    
    const action = authMode === 'login'
        ? firebase.auth().signInWithEmailAndPassword(email, password)
        : firebase.auth().createUserWithEmailAndPassword(email, password);
    
    action
        .then((result) => {
            currentUser = result.user;
            window.closeModal('authModal');
            document.getElementById('authEmail').value = '';
            document.getElementById('authPassword').value = '';
        })
        .catch((err) => {
            const msgs = {
                'Пользователь не найден': 'Р СџР С•Р »РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР »РЎРЉ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…',
                'Неверный пароль': 'Р СњР ВµР Р†Р ВµРЎР‚Р Р…РЎвЂ№Р в„– Р С—Р В°РЎР‚Р С•Р »РЎРЉ',
                'Email уже используется': 'Email РЎС“Р В¶Р Вµ Р С‘РЎРѓР С—Р С•Р »РЎРЉР В·РЎС“Р ВµРЎвЂљРЎРѓРЎРЏ',
                'Неверный формат email': 'Р СњР ВµР Р†Р ВµРЎР‚Р Р…РЎвЂ№Р в„– РЎвЂћР С•РЎР‚Р СР В°РЎвЂљ email',
                'Пароль слишком слабый': 'Р СџР В°РЎР‚Р С•Р »РЎРЉ РЎРѓР »Р С‘РЎв‚¬Р С”Р С•Р С РЎРѓР »Р В°Р В±РЎвЂ№Р в„–',
                'Неверный email или пароль': 'Р СњР ВµР Р†Р ВµРЎР‚Р Р…РЎвЂ№Р в„– email Р С‘Р »Р С‘ Р С—Р В°РЎР‚Р С•Р »РЎРЉ',
            };
            errorEl.textContent = msgs[err.code] || 'Ошибка: ' + err.message;
        })
        .finally(() => {
            btn.textContent = authMode === 'login' ? 'Sign In' : 'Sign Up';
            btn.disabled = false;
        });
};

window.resetPassword = function() {
    const email = document.getElementById('authEmail').value.trim();
    const errorEl = document.getElementById('authError');
    if (!email) {
        errorEl.style.color = '#ff5555';
        errorEl.textContent = 'Please enter your email first to reset password.';
        return;
    }
    
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            errorEl.style.color = '#00ff88';
            errorEl.textContent = 'Password reset link sent to your email!';
            setTimeout(() => {
                errorEl.style.color = '#ff5555';
                errorEl.textContent = '';
            }, 5000);
        })
        .catch((error) => {
            errorEl.style.color = '#ff5555';
            errorEl.textContent = 'Error: ' + error.message;
        });
};

// ============================================================
// LOCAL STORAGE PERSISTENCE (GPT-style Sessions)
// ============================================================
window.currentSessionId = 'session_' + Date.now();

const origClearChatLocal = window.clearChat;
window.clearChat = function(...args) {
    if (origClearChatLocal) origClearChatLocal.apply(this, args);
    window.currentSessionId = 'session_' + Date.now();
};

function getLocalHistory() {
    return JSON.parse(localStorage.getItem('solifon-chat-history') || '[]');
}

function setLocalHistory(history) {
    localStorage.setItem('solifon-chat-history', JSON.stringify(history));
}

function saveToFirebase(role, content, targetSessionId = window.currentSessionId) {
    try {
        const history = getLocalHistory();
        const newMsg = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            sessionId: targetSessionId,
            role: role,
            content: content || '[ПУСТОЙ ОТВЕТ]',
            isFavorite: false,
            timestamp: Date.now()
        };
        history.push(newMsg);
        setLocalHistory(history);
        loadChatHistory();
    } catch(e) {
        console.error('Save error:', e);
    }
}

function loadChatHistory() {
    const historyContainer = document.getElementById('chatHistoryItems');
    if (!historyContainer) return;

    const emptyEl = document.querySelector('#chatPanel .empty-library');
    if (emptyEl) emptyEl.style.display = 'none';

    historyContainer.innerHTML = '';
    const history = getLocalHistory();

    if (history.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }

    const sessions = {};
    history.forEach(msg => {
        const sid = msg.sessionId || 'legacy';
        if (!sessions[sid]) sessions[sid] = [];
        sessions[sid].push(msg);
    });

    const sortedSessions = Object.values(sessions).sort((a, b) => b[b.length-1].timestamp - a[a.length-1].timestamp);

    sortedSessions.slice(0, 20).forEach((sessionMsgs) => {
        const firstUserMsg = sessionMsgs.find(m => m.role === 'user');
        const title = firstUserMsg ? firstUserMsg.content : (sessionMsgs[0].content || 'New Chat');
        const sessionId = sessionMsgs[0].sessionId || 'legacy';

        const item = document.createElement('div');
        item.className = 'history-item';
        if (sessionId === window.currentSessionId) {
            item.style.background = 'rgba(255, 255, 255, 0.05)';
        }
        item.innerHTML = `
            <div style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; position: relative; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.2s;"
                 onmouseover="this.style.background='rgba(255,255,255,0.03)'"
                 onmouseout="this.style.background=''"
                 onclick="window.restoreSession('${sessionId}')">
                <i class="ph ph-chat-teardrop-text" style="color: #00f2ff; opacity: 0.8; font-size: 16px;"></i>
                <p style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity:0.9; flex: 1;">
                    ${title}
                </p>
            </div>
        `;
        historyContainer.appendChild(item);
    });
}

window.restoreSession = function(sessionId) {
    window.currentSessionId = sessionId;
    
    const container = document.getElementById('messagesContainer');
    if (container) container.innerHTML = '';
    
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    
    document.body.classList.add('chat-started');
    
    const history = getLocalHistory();
    const sessionMsgs = history.filter(m => (m.sessionId || 'legacy') === sessionId);
    
    sessionMsgs.forEach(msg => {
        let content = msg.content || "";
        if (msg.role === 'ai') {
            content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        }
        addMessageToUI(msg.role, content);
    });
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
    
    loadChatHistory();
};

window.toggleFavorite = function(msgId, btnElement) {
    const history = getLocalHistory();
    const msg = history.find(m => m.id === msgId);
    if (!msg) return;
    
    msg.isFavorite = !msg.isFavorite;
    setLocalHistory(history);
    
    btnElement.style.color = msg.isFavorite ? '#ffcf33' : 'rgba(255,255,255,0.3)';
    btnElement.classList.toggle('ph-star-fill', msg.isFavorite);
    btnElement.classList.toggle('ph-star', !msg.isFavorite);
};

function loadLibrary() {
    const libraryContainer = document.getElementById('savedItemsContainer');
    if (!libraryContainer) return;
    
    libraryContainer.innerHTML = '';
    const history = getLocalHistory();
    const favorites = history.filter(m => m.isFavorite);
    
    if (favorites.length === 0) {
        libraryContainer.innerHTML = '<div style="padding:40px; text-align:center; opacity:0.3;">Ваша библиотека пуста.<br>Отметьте важные сообщения звездочкой в чате.</div>';
        return;
    }
    
    favorites.forEach((data) => {
        const item = document.createElement('div');
        item.className = 'library-item';
        item.innerHTML = `
            <div style="padding: 15px; background: rgba(0, 242, 255, 0.03); border: 1px solid rgba(0, 242, 255, 0.1); border-radius: 12px; margin-bottom: 12px; position: relative; overflow: hidden; cursor: pointer;"
                 onclick="window.restoreSession('${data.sessionId}')">
                <div style="font-size: 10px; color: #00f2ff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; opacity: 0.7;">Saved Memory</div>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #fff; opacity: 0.9;">${data.content}</p>
                <div style="position: absolute; top: 0; left: 0; width: 2px; height: 100%; background: #00f2ff;"></div>
            </div>
        `;
        libraryContainer.prepend(item);
    });
}

// ============================================================
// 1. Р вЂњР вЂєР С›Р вЂР С’Р вЂєР В¬Р СњР «Р вЂў Р СџР вЂўР В Р вЂўР СљР вЂўР СњР СњР «Р вЂў
// ============================================================
let isLiveMode = false;
let liveRecognition = null;
let selectedFiles = []; 
let isVoiceResponseActive = false; 
const MAX_IMAGES = 5;
let selectedProvider = 'gemini';
let lumifexActive = false;

// FIX: Correct comment syntax (was '/ в”Ђв”Ђ' causing JS parse error)
// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ DEEP MODE Р РЋР В Р’ВР РЋР СћР вЂўР СљР С’ Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ
let deepRequestsToday = 0;
const DEEP_LIMIT = 5;

function getDeepUsageKey() {
    const today = new Date().toDateString();
    return 'deep_usage_' + today;
}

function getDeepUsage() {
    return parseInt(localStorage.getItem(getDeepUsageKey()) || '0');
}

function incrementDeepUsage() {
    const key = getDeepUsageKey();
    const current = getDeepUsage();
    localStorage.setItem(key, current + 1);
}

function checkDeepLimit() {
    if (getDeepUsage() >= DEEP_LIMIT) {
        addMessageToUI('рџ”¬ Лимит Deep Mode исчерпан. У вас есть 5 запросов в день. Попробуйте завтра!', 'РЎР‚РЎСџРІР‚СњР’В¬ Р вЂєР С‘Р СР С‘РЎвЂљ Deep Mode Р С‘РЎРѓРЎвЂЎР ВµРЎР‚Р С—Р В°Р Р…. Р Р€ Р Р†Р В°РЎРѓ Р ВµРЎРѓРЎвЂљРЎРЉ 5 Р В·Р В°Р С—РЎР‚Р С•РЎРѓР С•Р Р† Р Р† Р Т‘Р ВµР Р…РЎРЉ. Р СџР С•Р С—РЎР‚Р С•Р В±РЎС“Р в„–РЎвЂљР Вµ Р В·Р В°Р Р†РЎвЂљРЎР‚Р В°!');
        return false;
    }
    return true;
}

const modelMap = {
    'solifon-flux': 'flux',
    'solifon-soul': 'solifon-soul',
    'solifon-ultra': 'github',
    'solifon-air': 'gemini',
    'solifon-unbound': 'qwen',
    'solifon-motion': 'video',
    'solifon-pulse': 'solifon-pulse',
    'solifon-lite': 'solifon-lite',
    'solifon-spirit': 'solifon-spirit',
    'solifon-echo': 'elevenlabs',
    'solifon-flow': 'samba',
    'solifon-fulgur': 'solifon-fulgur',
    'solifon-souldrive': 'solifon-souldrive',
    'solifon-wave': 'solifon-wave',
    'solifon-core': 'solifon-core',
    'solifon-horizon': 'solifon-horizon',
    'solifon-gemma': 'solifon-gemma',
    'solifon-visionary': 'solifon-visionary',
    'gemini': 'gemini',
    'qwen': 'qwen',
    'groq': 'groq',
    'github': 'github',
    'video': 'video',
    'samba': 'samba',
    'flux': 'flux'
};

// ============================================================
// 2. Р вЂ™Р РЋР СџР С›Р СљР С›Р вЂњР С’Р СћР вЂўР вЂєР В¬Р СњР «Р вЂў UI Р В¤Р Р€Р СњР С™Р В¦Р В Р’ВР В Р’В
// ============================================================
function typeEffect(element, text) {
    const textContainer = element.querySelector('.text');
    if (!textContainer) return;
    const cleanText = (text || "").trim();
    
    let typeSpan = textContainer.querySelector('.typed-content');
    if (!typeSpan) {
        typeSpan = document.createElement('div');
        typeSpan.className = 'typed-content';
        typeSpan.style.marginTop = '12px';
        textContainer.appendChild(typeSpan);
    }
    
    let i = 0;
    const interval = setInterval(() => {
        if (i < cleanText.length) {
            i++;
            // Р СџР С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С Р Р…Р В°Р С”Р С•Р С—Р »Р ВµР Р…Р Р…РЎвЂ№Р в„– РЎвЂљР ВµР С”РЎРѓРЎвЂљ РЎРѓ РЎвЂћР С•РЎР‚Р СР В°РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р ВµР С
            const partial = cleanText.slice(0, i);
            typeSpan.innerHTML = partial
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            const container = document.getElementById('messagesContainer');
            if (container) container.scrollTop = container.scrollHeight;
        } else {
            clearInterval(interval);
        }
    }, 12);
}

function renderMediaInMessage(containerElement, mediaUrl) {
    const textContainer = containerElement.querySelector('.text');
    if (textContainer) {
        textContainer.innerHTML = `
            <div class="media-container" style="margin-top:10px;">
                <img src="${mediaUrl}" style="width:100%; border-radius:12px; cursor:pointer;" onclick="window.open('${mediaUrl}', '_blank')">
                <a href="${mediaUrl}" download="lumifex_art.png" style="display:inline-block; margin-top:8px; color:#fff; text-decoration:none; font-size:12px; opacity:0.7;">
                    <i class="ph ph-download-simple"></i> Download Image
                </a>
            </div>`;
    }
}

function addMessageToUI(role, content = "") {
    const container = document.getElementById('messagesContainer');
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.style.display = 'none';
    const messageDiv = document.createElement("div");    
    messageDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    messageDiv.innerHTML = `<div class="text">${content}</div>`;
    if (container) {
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
    return messageDiv;
}

// ============================================================
// QUICK QUESTIONS — 40 вопросов, 4 случайных
// ============================================================
const ALL_QUESTIONS = [
  { icon: 'Что такое нейронная сеть?', text: "Что такое нейронная сеть?" },
  { icon: 'Объясни квантовую механику', text: "Объясни квантовую механику" },
  { icon: 'Как написать бизнес-план?', text: "Как написать бизнес-план?" },
  { icon: 'Что такое машинное обучение?', text: "Что такое машинное обучение?" },
  { icon: 'Как работает интернет?', text: "Как работает интернет?" },
  { icon: 'Что такое ДНК и как она работает?', text: "Что такое ДНК и как она работает?" },
  { icon: 'Что такое чёрная дыра?', text: "Что такое чёрная дыра?" },
  { icon: 'Как начать программировать с нуля?', text: "Как начать программировать с нуля?" },
  { icon: 'Как начать инвестировать?', text: "Как начать инвестировать?" },
  { icon: 'Как работает иммунная система?', text: "Как работает иммунная система?" },
  { icon: 'Что такое искусственный интеллект?', text: "Что такое искусственный интеллект?" },
  { icon: 'Что такое криптовалюта?', text: "Что такое криптовалюта?" },
];

function renderQuickPills() {
  const container = document.getElementById('quickPills');
  if (!container) return;
  const selected = [
    { icon: 'Что такое искусственный интеллект?', text: "Р В§РЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С‘РЎРѓР С”РЎС“РЎРѓРЎРѓРЎвЂљР Р†Р ВµР Р…Р Р…РЎвЂ№Р в„– Р С‘Р Р…РЎвЂљР ВµР »Р »Р ВµР С”РЎвЂљ?" },
    { icon: 'Что такое метавселенная?', text: "Р В§РЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р СР ВµРЎвЂљР В°Р Р†РЎРѓР ВµР »Р ВµР Р…Р Р…Р В°РЎРЏ?" },
    { icon: 'Что такое антиматерия?', text: "Р В§РЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р В°Р Р…РЎвЂљР С‘Р СР В°РЎвЂљР ВµРЎР‚Р С‘РЎРЏ?" },
    { icon: 'Что такое машинное обучение?', text: "Р В§РЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р СР В°РЎв‚¬Р С‘Р Р…Р Р…Р С•Р Вµ Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘Р Вµ?" }
  ];
  container.innerHTML = '';
  selected.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = `quick-card quick-card-${i + 1}`;
    card.innerHTML = `<i class="${q.icon}"></i><span>${q.text}</span>`;
    card.onclick = () => {
      const input = document.getElementById('userInput');
      if (input) {
        input.value = q.text;
        input.focus();
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.click();
      }
    };
    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderQuickPills();
});

function initModelSelector() {    
    const options = document.querySelectorAll('.model-option');    
    const currentModelText = document.getElementById('currentModel');
    const modelTriggerIcon = document.querySelector('#modelTrigger i'); 
    const userInput = document.getElementById('userInput');
    const modelDropdown = document.getElementById('modelDropdown');
    if (modelDropdown) document.body.appendChild(modelDropdown);

    options.forEach(opt => {
        opt.addEventListener('click', function(e) {
            e.stopPropagation();
            const brandKey = this.getAttribute('data-value'); 
            const brandName = this.getAttribute('data-name');
            const selectedIcon = this.querySelector('i');
            const iconClass = selectedIcon ? selectedIcon.className : 'fas fa-robot';
            const iconColor = selectedIcon ? selectedIcon.style.color : '#fff';

            if (modelMap[brandKey]) {
                selectedProvider = modelMap[brandKey];
                if (currentModelText) {
                    currentModelText.style.opacity = '0';
                    setTimeout(() => {
                        currentModelText.innerText = brandName;
                        currentModelText.style.opacity = '1';
                        if (modelTriggerIcon) {
                            modelTriggerIcon.className = iconClass;
                            modelTriggerIcon.style.color = iconColor;
                        }
                    }, 200);
                }
                if (userInput) userInput.placeholder = `Ask ${brandName}...`;
                options.forEach(o => o.classList.remove('active'));
                this.classList.add('active');
            }
            
            if (modelDropdown) modelDropdown.classList.remove('active');
            const overlay = document.querySelector('.model-overlay');
            if (overlay) overlay.classList.remove('active');
        });
    });
}

// ============================================================
// 3. Р вЂњР вЂєР С›Р вЂР С’Р вЂєР В¬Р СњР «Р вЂў Р В¤Р Р€Р СњР С™Р В¦Р В Р›СљР В Р›Сљ Р С›Р С™Р СњР С› Р В Р›Сљ Р В¤Р С’Р в„ўР вЂєР С›Р вЂ™
// ============================================================
function ensureAttachmentPreviewInComposer() {
    const preview = document.getElementById('imagePreviewContainer');
    const composer = document.querySelector('.input-main-wrapper');
    const glass = document.querySelector('.input-glass-container');
    if (!preview || !composer || !glass) return;
    if (preview.parentElement !== composer) {
        composer.insertBefore(preview, glass);
    }
    preview.style.display = '';
    if (selectedFiles.length === 0 && preview.children.length === 0) {
        preview.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', ensureAttachmentPreviewInComposer);

window.handleFileSelect = function(input) {
    ensureAttachmentPreviewInComposer();
    const files = Array.from(input.files);
    const container = document.getElementById('imagePreviewContainer');
    if (!container) return;
    if (selectedFiles.length + files.length > MAX_IMAGES) {
        alert('Ошибка при анализе рисунка.');
        input.value = "";
        return;
    }
    container.style.display = 'flex';
    files.forEach((file) => {
        selectedFiles.push(file); 
        const isImage = file.type.startsWith('image/');
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'attachment-preview-item';
            div.style.position = 'relative';
            div.style.display = 'inline-block';
            
            let previewHTML = '';
            if (isImage) {
                previewHTML = `<img src="${e.target.result}" style="width: 55px; height: 55px; border-radius: 10px; object-fit: cover; border: 1px solid rgba(255,255,255,0.2); margin-right: 5px;">`;
            } else {
                previewHTML = `
                <div style="width: 55px; height: 55px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; margin-right: 5px; flex-direction: column; overflow: hidden; position: relative;">
                    <i class="ph ph-file-text" style="font-size: 24px; color: #fff;"></i>
                    <span style="font-size: 8px; color: #aaa; text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 4px; position: absolute; bottom: 4px;">${file.name}</span>
                </div>`;
            }
            
            div.innerHTML = `
                ${previewHTML}
                <div onclick="removeImage(this)" style="position: absolute; top: -6px; right: -2px; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); color: #ffffff; border: 1px solid rgba(255,255,255,0.4); border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 10; transition: all 0.2s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">&#10005;</div>
            `;
            container.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
    input.value = "";
};

window.removeImage = function(element) {
    const item = element.parentElement;
    const container = document.getElementById('imagePreviewContainer');
    const index = Array.from(container.children).indexOf(item);
    if (index > -1) selectedFiles.splice(index, 1);
    item.remove();
    if (selectedFiles.length === 0) container.style.display = 'none';
};

window.openAttachmentPreview = function(src) {
    let modal = document.getElementById('attachmentLightbox');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'attachmentLightbox';
        modal.innerHTML = `
            <button type="button" class="attachment-lightbox-close" aria-label="Close preview">x</button>
            <img class="attachment-lightbox-image" alt="Selected image preview">
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal || event.target.classList.contains('attachment-lightbox-close')) {
                modal.classList.remove('active');
            }
        });
    }
    const img = modal.querySelector('.attachment-lightbox-image');
    if (img) img.src = src;
    modal.classList.add('active');
};

document.addEventListener('click', (event) => {
    const img = event.target.closest('#imagePreviewContainer img');
    if (img) window.openAttachmentPreview(img.src);
});

window.clearChat = function() {
    const container = document.getElementById('messagesContainer');
    if (container) container.innerHTML = '';
    document.getElementById('welcomeScreen').style.display = 'flex';
    selectedFiles = [];
    const preview = document.getElementById('imagePreviewContainer');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
};

window.openFilePicker = function() {
    document.getElementById('fileInput')?.click();
};

window.openModal = function(id) {
    if (id === 'aboutModal') {
        window.currentViewBg = 'about';
        window.applyWallpaper();
    } else if (id === 'upgradeModal') {
        window.currentViewBg = 'sub';
        window.applyWallpaper();
    } else if (id === 'whatsNewModal') {
        window.currentViewBg = 'whatsnew';
        window.applyWallpaper();
    }
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) {
        navToggle.checked = false;
        navToggle.dispatchEvent(new Event('change'));
    }
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.transform = '';
    const bd = document.getElementById('__sbd__');
    if (bd) bd.style.display = 'none';

    const m = document.getElementById(id);
    if (m) {
        m.style.setProperty('display', 'flex', 'important');
        m.style.setProperty('opacity', '1', 'important');
        m.style.setProperty('pointer-events', 'auto', 'important');
        m.style.setProperty('visibility', 'visible', 'important');
        document.body.style.overflow = 'hidden';
        setTimeout(() => m.classList.add('active'), 10);
    }
};

window.closeModal = function(id) {
    if (['aboutModal', 'upgradeModal', 'whatsNewModal', 'fullscreenLayerModal'].includes(id)) {
        window.currentViewBg = 'main';
        window.applyWallpaper('main');
    }
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            m.style.setProperty('display', 'none', 'important');
            m.style.removeProperty('opacity');
            m.style.removeProperty('pointer-events');
            m.style.removeProperty('visibility');
        }, 300);
    }
};


// ============================================================
// 4. Р С›Р РЋР СњР С›Р вЂ™Р СњР С’Р Р‡ Р вЂєР С›Р вЂњР ВР С™Р С’ (DOMContentLoaded)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const deepBtn = document.getElementById('deepBtn');
    const modelTrigger = document.getElementById('modelTrigger');
    const modelDropdown = document.getElementById('modelDropdown');
    const currentModelText = document.getElementById('currentModel');
    const sidebar = document.getElementById('sidebar');
    const mainAppLayout = document.getElementById('mainAppLayout');
    const chatTrigger = document.getElementById('chatTrigger');

    // FIX 5: New Chat кнопка
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            window.clearChat();
        });
    }

if (chatTrigger) {
    chatTrigger.addEventListener('click', () => {
        loadChatHistory();
    });
}
    const micBtn = document.getElementById('micBtn');

    const whatsNewTrigger = document.getElementById('whatsNewTrigger');
    const aboutTrigger = document.getElementById('aboutTrigger');
    if (whatsNewTrigger) whatsNewTrigger.addEventListener('click', () => window.openModal('whatsNewModal'));
    if (aboutTrigger) aboutTrigger.addEventListener('click', () => window.openModal('aboutModal'));

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.custom-modal');
            if (modal) window.closeModal(modal.id);
        });
    });

    window.handleAI = async function handleAI() {
    if (window.isHandlingAI) return;
    const targetSessionId = window.currentSessionId;
    
    const isDeepMode = document.getElementById('mainAppLayout')?.classList.contains('deep-mode');
    if (isDeepMode) {
        if (!checkDeepLimit()) return;
        incrementDeepUsage();
    }

    const text = userInput?.value.trim();
    const filesToSend = [...selectedFiles];
    if (!text && filesToSend.length === 0) return;

    if (text.toLowerCase().startsWith('браузер:')) {
        let task = text.replace(/браузер:/i, '').trim();
        const userMsg = document.createElement('div');
        userMsg.className = 'message user-message';
        userMsg.innerHTML = `<div class="text">${text}</div>`;
        document.getElementById('messagesContainer').appendChild(userMsg);
        if (userInput) userInput.value = "";
        window.startCloudBrowser(task);
        return;
    }

    window.isHandlingAI = true;

    const currentProvider = selectedProvider;
    if (!isLiveMode) {
        let userContent = text || '';
        let attachmentHTML = '';
        
        if (filesToSend.length > 0) {
            await Promise.all(filesToSend.map(file => {
                return new Promise((resolve) => {
                    const isImage = file.type.startsWith('image/');
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        if (isImage) {
                            attachmentHTML += `<img src="${e.target.result}" style="max-width:200px; max-height:200px; border-radius:12px; margin: 4px 8px 4px 0; display:inline-block; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">`;
                        } else {
                            attachmentHTML += `
                            <div style="display: inline-flex; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; margin: 4px 8px 4px 0; max-width: 260px; box-shadow: 0 6px 18px rgba(0,0,0,0.25);">
                                <i class="ph ph-file-text" style="font-size: 26px; color: #fff; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"></i>
                                <div style="display: flex; flex-direction: column; overflow: hidden;">
                                    <span style="font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;">${file.name}</span>
                                    <span style="font-size: 11px; color: rgba(255,255,255,0.6);">${(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                            </div>`;
                        }
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
            }));
            const finalContent = `<div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;">${attachmentHTML}</div><div style="font-size: 15px;">${userContent.replace(/\n/g, '<br>')}</div>`;
            addMessageToUI('user', finalContent);
            saveToFirebase('user', finalContent, targetSessionId);
        } else {
            addMessageToUI('user', userContent.replace(/\n/g, '<br>'));
            saveToFirebase('user', userContent.replace(/\n/g, '<br>'), targetSessionId);
        }
    } else {
        saveToFirebase('user', text, targetSessionId);
    }
    

    if (userInput) userInput.value = "";
    selectedFiles = [];
    const preview = document.getElementById('imagePreviewContainer');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }

    const rand = Math.random();
    let numSteps = 5;
    if (rand < 0.10) numSteps = 4;
    else if (rand < 0.40) numSteps = 6; // 30% chance (since rand between 0.1 and 0.4 is 0.3)
    else numSteps = 5; // 60% chance

    let totalTime = 0;
    if (Math.random() < 0.50) {
        totalTime = 20000; // 50% chance of taking 20 seconds
    } else {
        totalTime = Math.floor(Math.random() * (12000 - 6000 + 1)) + 6000; // random 6s to 12s
    }
        const stage1 = ['Инициализация нейросетевых ядер...', 'Загрузка контекстных модулей...', 'Анализ пользовательского запроса...'];
    const stage2 = ['Сканирование многомерных баз данных...', 'Извлечение релевантных контекстных блоков...', 'Обращение к модулям долгосрочной памяти...', 'Синхронизация информационных потоков...', 'Фильтрация избыточного шума...', 'Поиск пересечений в векторном пространстве...', 'Извлечение ассоциативных паттернов...', 'Сбор верифицированных фактов...'];
    const stage3 = ['Кросс-верификация найденных источников...', 'Установка логических противоречий...', 'Проверка контекста на безопасность (Safety Check)...', 'Каскадная валидация аргументов...', 'Оценка достоверности метаданных...', 'Взвешивание вероятностных исходов...', 'Оптимизация цепочки рассуждений...'];
    const stage4 = ['Запуск процессов языкового синтеза...', 'Формирование структурных финальных тезисов...', 'Адаптация стилистики под контекст беседы...', 'Подбор точных лингвистических формулировок...', 'Калибровка параметров вывода текста...', 'Финальный рендеринг ответа модели...', 'Проверка грамматических паттернов...'];
    
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    let selectedTexts = [];
    if (numSteps === 4) {
        selectedTexts = [pickRandom(stage1), pickRandom(stage2), pickRandom(stage3), pickRandom(stage4)];
    } else if (numSteps === 5) {
        selectedTexts = [pickRandom(stage1), pickRandom(stage2), pickRandom(stage3), pickRandom(stage3), pickRandom(stage4)];
    } else {
        selectedTexts = [pickRandom(stage1), pickRandom(stage2), pickRandom(stage2), pickRandom(stage3), pickRandom(stage3), pickRandom(stage4)];
    }

    let stepsHTMLContent = '';
    selectedTexts.forEach((text, i) => {
        stepsHTMLContent += `
          <div class="thinking-step" id="step${i+1}">
            <div class="step-line"></div>
            <div class="step-icon-container">
                <div class="step-icon"><i class="fa-solid fa-check"></i></div>
            </div>
            <div class="step-content">
                <span class="step-title">${text}</span>
            </div>
          </div>
        `;
    });

    const stepsHTML = `
<style>
.ai-thinking-steps {
    display: flex;
    flex-direction: column;
    padding: 10px 0;
    font-family: 'Inter', sans-serif;
    color: #fff;
    margin-bottom: 12px;
    background: transparent;
    border: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
}
.thinking-step {
    display: flex;
    align-items: flex-start;
    position: relative;
    padding-bottom: 0; /* starts collapsed */
    
    /* Initially hidden for sequential appearance */
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    transform: translateY(-10px);
    transition: max-height 0.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease, transform 0.5s ease, padding-bottom 0.5s ease;
}
.thinking-step.active {
    opacity: 1;
    max-height: 80px;
    transform: translateY(0);
    padding-bottom: 20px;
}
.thinking-step:last-child.active {
    padding-bottom: 0;
}
.step-line {
    position: absolute;
    left: 8px;
    top: 20px;
    bottom: -4px;
    width: 2px;
    background-color: rgba(255,255,255,0.15);
    z-index: 1;
}
.thinking-step:last-child .step-line {
    display: none;
}
.step-icon-container {
    position: relative;
    z-index: 2;
    background: transparent;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 14px;
    margin-top: 2px;
}
.step-icon {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    background: transparent;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}
/* Pulsing animation while active but not completed (Claude style) */
.thinking-step.active:not(.completed) .step-icon {
    border-color: rgba(255,255,255,0.6);
    animation: claudePulse 1s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes claudePulse {
    0% { transform: scale(0.85); box-shadow: 0 0 0 0 rgba(255,255,255,0.2); }
    100% { transform: scale(1.1); box-shadow: 0 0 8px 0 rgba(255,255,255,0.05); }
}
.step-icon i {
    opacity: 0;
    font-size: 8px;
    color: #000;
    transform: scale(0.5);
    transition: all 0.3s ease;
}
.thinking-step.completed .step-icon {
    background: #e5e5e5;
    border-color: #e5e5e5;
    box-shadow: none;
}
.thinking-step.completed .step-icon i {
    opacity: 1;
    transform: scale(1);
    color: #000;
}
.step-content {
    display: flex;
    flex-direction: column;
}
.step-title {
    font-size: 14px;
    font-weight: 400;
    color: rgba(255,255,255,0.4);
    transition: color 0.3s ease;
    line-height: 1.4;
}
.thinking-step.completed .step-title {
    color: rgba(255,255,255,0.9);
}
</style>
<div class="ai-thinking-steps">
  ${stepsHTMLContent}
</div>
`;

    const botMsgElement = isLiveMode 
        ? { querySelector: () => ({ innerText: '', textContent: '' }) } 
        : addMessageToUI('ai', stepsHTML);

    if (!isLiveMode) {
        const activateStep = (stepId) => {
            if (!botMsgElement || !botMsgElement.querySelector) return;
            const step = botMsgElement.querySelector('#' + stepId);
            if (step) step.classList.add('active');
        };
        const completeStep = (stepId) => {
            if (!botMsgElement || !botMsgElement.querySelector) return;
            const step = botMsgElement.querySelector('#' + stepId);
            if (step) step.classList.add('completed');
        };

        const stepDuration = totalTime / numSteps;
        for (let i = 0; i < numSteps; i++) {
            // Make step visible and pulsing
            setTimeout(() => activateStep('step' + (i+1)), i * stepDuration);
            // Mark step as completed and show checkmark
            setTimeout(() => completeStep('step' + (i+1)), (i+1) * stepDuration);
        }
    }
  
    try {
        const formData = new FormData();
        const finalPrompt = isDeepMode 
            ? `[Р вЂњР вЂєР Р€Р вЂР С›Р С™Р ВР в„ў Р С’Р СњР С’Р вЂєР ВР —] Р С›РЎвЂљР Р†Р ВµРЎвЂЎР В°Р в„– Р С”Р В°Р С” РЎРЊР С”РЎРѓР С—Р ВµРЎР‚РЎвЂљ. Р С›Р В±РЎР‰РЎРЏРЎРѓР Р…РЎРЏР в„– Р СџР С›Р В§Р вЂўР СљР Р€ РЎвЂљРЎвЂ№ Р С—РЎР‚Р С‘РЎв‚¬РЎвЂР » Р С” Р С”Р В°Р В¶Р Т‘Р С•Р СРЎС“ Р Р†РЎвЂ№Р Р†Р С•Р Т‘РЎС“. Р СџР С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р в„– Р »Р С•Р С–Р С‘Р С”РЎС“ РЎв‚¬Р В°Р С– Р В·Р В° РЎв‚¬Р В°Р С–Р С•Р С. Р СџРЎР‚Р С‘Р Р†Р С•Р Т‘Р С‘ Р С—РЎР‚Р С‘Р СР ВµРЎР‚РЎвЂ№ Р С‘ Р Т‘Р С•Р С”Р В°Р В·Р В°РЎвЂљР ВµР »РЎРЉРЎРѓРЎвЂљР Р†Р В°. Р —Р В°Р С—РЎР‚Р С•РЎРѓ: ${text}`
            : text;
        formData.append('prompt', finalPrompt);
        formData.append('provider', currentProvider);
        formData.append('use_voice', isLiveMode ? 'true' : 'false');
        if (filesToSend.length > 0) formData.append('file', filesToSend[0]);
        formData.append('user_email', currentUser ? currentUser.email : '');


        const fetchPromise = fetch("https://germanhcsuj-itssoimportandforme.hf.space/chat", {
            method: "POST",
            body: formData
        });

        const minDelayPromise = new Promise(resolve => setTimeout(resolve, totalTime));
        const [response] = await Promise.all([fetchPromise, minDelayPromise]);

        if (!response.ok) throw new Error("Server Error");

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('image')) {
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            renderMediaInMessage(botMsgElement, imageUrl);
            saveToFirebase('ai', '[image]', targetSessionId);
        } else {
            const data = await response.json();
            const reply = data.reply || '...';
            typeEffect(botMsgElement, reply);
            saveToFirebase('ai', reply, targetSessionId);
            if (isLiveMode) {
                const status = document.getElementById('liveStatus');
                if (!reply || reply === '...') {
                    if (status) status.innerText = 'Lumifex говорит...';
                    setTimeout(() => { if (isLiveMode) startLiveListening(); }, 1000);
                } else {
                    if (status) status.innerText = "Ответ получен ✓";
                    speakText(reply);
                }
            }
        }
    } catch (error) {
        if (isLiveMode) {
            const status = document.getElementById('liveStatus');
            if (status) status.innerText = "Ошибка... повтор через 2 сек";
            setTimeout(() => { if (isLiveMode) startLiveListening(); }, 2000);
        } else {
            if (botMsgElement && botMsgElement.querySelector) {
                const t = botMsgElement.querySelector('.text');
                if (t) t.innerText = 'Ошибка соединения.';
            }
        }
    } finally {
        window.isHandlingAI = false;
        if (userInput) userInput.focus();
    }
};



    sendBtn?.addEventListener('click', handleAI);
    userInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAI(); }
    });

    initModelSelector();

    let modelOverlay = document.createElement('div');
    modelOverlay.className = 'model-overlay';
    document.body.appendChild(modelOverlay);

    modelTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = modelDropdown.classList.contains('active');
        if (!isOpen) {
            const rect = modelTrigger.getBoundingClientRect();
            modelDropdown.style.top = (rect.bottom + 8) + 'px';
            modelDropdown.style.left = rect.left + 'px';
        }
        modelDropdown.classList.toggle('active');
        modelOverlay.classList.toggle('active');
    });

    modelOverlay.addEventListener('click', () => {
        modelDropdown.classList.remove('active');
        modelOverlay.classList.remove('active');
    });

    document.addEventListener('click', (e) => {
        if (!modelTrigger?.contains(e.target)) modelDropdown?.classList.remove('active');
    });

    if (deepBtn && mainAppLayout) {
        deepBtn.addEventListener('click', () => {
            mainAppLayout.classList.toggle('deep-mode');
            const isDeep = mainAppLayout.classList.contains('deep-mode');
            selectedProvider = isDeep ? 'glm' : 'solifon-air'; 
            currentModelText.innerText = isDeep ? "Solifon Deep (Thinking)" : "Solifon Air";
            deepBtn.classList.toggle('active', isDeep);
        });
    }

    if (chatTrigger && sidebar) {
        chatTrigger.addEventListener('click', () => {
            sidebar.classList.add('chat-active');      
            sidebar.classList.remove('library-active'); 
            loadChatHistory();
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            chatTrigger.classList.add('active');
        });
    }

    const libraryTrigger = document.getElementById('libraryTrigger');
    if (libraryTrigger && sidebar) {
        libraryTrigger.addEventListener('click', () => {
            sidebar.classList.add('library-active');
            sidebar.classList.remove('chat-active');
            loadLibrary();
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            libraryTrigger.classList.add('active');
        });
    }

    document.getElementById('closeChat')?.addEventListener('click', () => {
        sidebar.classList.remove('chat-active');
        chatTrigger?.classList.remove('active');
    });
    document.getElementById('closeLibrary')?.addEventListener('click', () => {
        sidebar.classList.remove('library-active');
        libraryTrigger?.classList.remove('active');
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && micBtn) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.interimResults = false;

        micBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (micBtn.classList.contains('recording')) {
                recognition.stop();
            } else {
                try { recognition.start(); } catch (err) { console.error("Recognition already started", err); }
            }
        };

        recognition.onstart = () => {
            micBtn.classList.add('recording');
            if (userInput) userInput.placeholder = "Solifon listening...";
            const isDeepMode = document.getElementById('mainAppLayout').classList.contains('deep-mode');
            if (isDeepMode) {
                micBtn.style.color = "#ff4444";
                micBtn.style.textShadow = "0 0 10px #ff0000";
            } else {
                micBtn.style.color = "#00f2ff";
                micBtn.style.textShadow = "0 0 10px #00f2ff";
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (userInput) {
                userInput.value = transcript;
                sendBtn?.click();
            }
        };

        recognition.onend = () => {
            micBtn.classList.remove('recording');
            micBtn.style.color = "";
            micBtn.style.textShadow = "";
            if (userInput) userInput.placeholder = `Ask ${selectedProvider}...`;
        };

        recognition.onerror = (err) => {
            console.error("Speech Recognition Error:", err.error);
            micBtn.classList.remove('recording');
            if (err.error === 'Доступ к микрофону заблокирован. Разрешите его в настройках браузера.') alert("Р вЂќР С•РЎРѓРЎвЂљРЎС“Р С— Р С” Р СР С‘Р С”РЎР‚Р С•РЎвЂћР С•Р Р…РЎС“ Р В·Р В°Р В±Р »Р С•Р С”Р С‘РЎР‚Р С•Р Р†Р В°Р Р…. Р В Р В°Р В·РЎР‚Р ВµРЎв‚¬Р С‘РЎвЂљР Вµ Р ВµР С–Р С• Р Р† Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р В°РЎвЂ¦ Р В±РЎР‚Р В°РЎС“Р В·Р ВµРЎР‚Р В°.");
        };
    }

    const liveBtn = document.getElementById('liveToggle');
    if (liveBtn) {
        liveBtn.addEventListener('click', () => {
            if (typeof window.toggleLiveMode === 'function') window.toggleLiveMode();
        });
    }
}); 

// ============================================================
// 5. LUMIFEX SYSTEM INIT
// ============================================================
function initLumifexSystem() {
    console.log('Задача в браузере завершена');
    if (typeof StellarCarousel !== 'undefined') {
        const carousel = new StellarCarousel();
        setTimeout(() => carousel.update(), 100);
    }
    const title = document.getElementById('current-title');
    if (title) {
        title.style.opacity = '0';
        setTimeout(() => {
            title.style.transition = 'opacity 1s ease';
            title.style.opacity = '1';
        }, 500);
    }
}

const SLIDES = [
  { 
    title: "SOLIFON OFFLINE ", 
    icon: "р“†©р“‡Ѕр“†Є", 
    description: 'самый лучший модел для кода', 
    stats: ['Статистика', "Р РЋР С”Р С•РЎР‚Р С•РЎРѓРЎвЂљРЎРЉ Р С•РЎвЂљР С”Р »Р С‘Р С”Р В° : Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р В° Р С‘Р Т‘Р ВµРЎвЂљ Р С—РЎР‚РЎРЏР СР С• Р Р…Р В° Р Р†Р В°РЎв‚¬Р ВµР С Р В¶Р ВµР »Р ВµР В·Р Вµ Р Р†Р вЂљРІР‚Сњ Р Р…Р С‘Р С”Р В°Р С”Р С•Р в„– Р В·Р В°Р Т‘Р ВµРЎР‚Р В¶Р С”Р С‘ РЎРѓР ВµРЎвЂљР С‘ (Р С—Р С‘Р Р…Р С–Р В°)."],
    info: "Р В Р В°Р В±Р С•РЎвЂљР В°Р в„–РЎвЂљР Вµ Р Р…Р В°Р Т‘ Р Р†Р В°Р В¶Р Р…РЎвЂ№Р СР С‘ Р С—РЎР‚Р С•Р ВµР С”РЎвЂљР В°Р СР С‘ Р Р† Р С—Р С•Р »Р ВµРЎвЂљР Вµ Р С‘Р »Р С‘ Р Р† Р СР ВµРЎРѓРЎвЂљР В°РЎвЂ¦, Р С–Р Т‘Р Вµ Р Р…Р ВµРЎвЂљ РЎРѓР Р†РЎРЏР В·Р С‘..",
    skills: [{n: 'БаланыТЈ даТ“дылары', p: 100}, {n: "Р С’Р Р†РЎвЂљР С•Р Р…Р С•Р СР Р…Р С•РЎРѓРЎвЂљРЎРЉ", p: 100}, {n: "Р С™Р С•Р Р…РЎвЂљРЎР‚Р С•Р »РЎРЉ Р Т‘Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦ ", p: 100}]
  },
  { 
    title: "SOLIFON SOUL", 
    icon: "р“†©р“‹–р“†Є", 
    description: "разговорит как живой человек", 
    stats: ["Video Intelligence:", "Giant Context:"],
    info: "Р СџР С•Р Р…Р С‘Р СР В°Р ВµРЎвЂљ Р С‘Р Р…РЎвЂљР С•Р Р…Р В°РЎвЂ Р С‘Р С‘, Р СРЎС“Р В·РЎвЂ№Р С”РЎС“ Р С‘ Р В·Р Р†РЎС“Р С”Р С‘. Р СљР С•Р В¶Р Р…Р С• Р С—РЎР‚Р С•РЎРѓРЎвЂљР С• Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С‘РЎвЂљРЎРЉ Р С–Р С•Р »Р С•РЎРѓР С•Р Р†Р С•Р Вµ РЎРѓР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘Р Вµ Р Р†Р вЂљРІР‚Сњ Soul Р С—Р С•Р в„–Р СР ВµРЎвЂљ Р Р†РЎРѓРЎвЂ Р Т‘Р С• Р С—Р С•РЎРѓР »Р ВµР Т‘Р Р…Р ВµР С–Р С• Р Р†Р В·Р Т‘Р С•РЎвЂ¦Р В°..",
    skills: [{n: "Р С›Р В±РЎР‰Р ВµР С Р С—Р В°Р СРЎРЏРЎвЂљР С‘", p: 100}, {n: "Р В­Р СР С—Р В°РЎвЂљР С‘РЎРЏ Р С‘ Р С”Р С•Р Р…РЎвЂљР ВµР С”РЎРѓРЎвЂљ", p: 100}, {n: "Р В Р В°Р В±Р С•РЎвЂљР В° РЎРѓ Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р СР С‘", p: 95}]
  },
  { 
    title: "SOLIFON ULTRA", 
    icon: "Р Р†Р вЂљРІР‚СњР СњРЎСџР СњРЎСџР СњРЎвЂєР СњРЎвЂєР Р†Р’ВРЎС›Р С—РЎвЂР вЂ№", 
    description: "РЎРѓР В°Р СРЎвЂ№Р в„– РЎС“Р СР Р…РЎвЂ№Р в„– Р СР С•Р Т‘Р ВµР »", 
    stats: ["Р СљРЎС“Р »РЎРЉРЎвЂљР С‘Р СР С•Р Т‘Р В°Р »РЎРЉР Р…Р С•РЎРѓРЎвЂљРЎРЉ: Р С’Р С”РЎвЂљРЎС“Р В°Р »РЎРЉР Р…Р С•РЎРѓРЎвЂљРЎРЉ Р Т‘Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦", "Р РЋРЎвЂљР В°Р В±Р С‘Р »РЎРЉР Р…Р С•РЎРѓРЎвЂљРЎРЉ: 100%"],
    info: "Точность фактов .",
    skills: [{n: "Р вЂєР С•Р С–Р С‘РЎвЂЎР ВµРЎРѓР С”Р С•Р Вµ Р СРЎвЂ№РЎв‚¬Р »Р ВµР Р…Р С‘Р Вµ", p: 98}, {n: "Р С™РЎР‚Р ВµР В°РЎвЂљР С‘Р Р†Р Р…Р С•РЎРѓРЎвЂљРЎРЉ Р С‘ РЎРѓРЎвЂљР С‘Р »РЎРЉ", p: 98}]
  },
  { 
    title: "SOLIFON AIR", 
    icon: "р“†©вљќр“†Є", 
    description: "Р С•РЎвЂљР Р†Р ВµРЎвЂЎР В°Р ВµРЎвЂљ Р СР С–Р Р…Р С•Р Р†Р ВµР Р…Р Р…Р С•", 
    stats: ["Скорость: до 2000к", "Стабильность: 99%"],
    info: "Р вЂРЎвЂ№РЎРѓРЎвЂљРЎР‚Р С•Р Вµ РЎР‚Р В°РЎРѓР С—Р С•Р В·Р Р…Р В°Р Р†Р В°Р Р…Р С‘Р Вµ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР С•Р Р† Р Р…Р В° РЎвЂћР С•РЎвЂљР С• Р С‘ РЎРѓР С”Р В°Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р Т‘Р С•Р С”РЎС“Р СР ВµР Р…РЎвЂљР С•Р Р† Р Р…Р В° Р »Р ВµРЎвЂљРЎС“.",
    skills: [{n: "Р СџР С•Р Р†РЎРѓР ВµР Т‘Р Р…Р ВµР Р†Р Р…Р В°РЎРЏ РЎРЊРЎвЂћРЎвЂћР ВµР С”РЎвЂљР С‘Р Р†Р Р…Р С•РЎРѓРЎвЂљРЎРЉ", p: 100}, {n: "Р СљРЎС“Р »РЎРЉРЎвЂљР С‘Р СР С•Р Т‘Р В°Р »РЎРЉР Р…Р С•РЎРѓРЎвЂљРЎРЉ", p: 92}]
  },
  { 
    title: "SOLIFON UNBOUND", 
    icon: "Р Р†Р вЂљРІР‚СњР СњРЎСџР СњРЎСџР СњРЎвЂєР СњРЎвЂєРЎР‚РІР‚вЂњР в‚¬Р’В", 
    description: "работает без цензуры", 
    stats: ["Р В Р В°Р В±Р С•РЎвЂљР В° РЎРѓ Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р СР С‘: 100%", "Р РЋР »Р ВµР Т‘Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘РЎРЏР С: Р СљР В°РЎвЂљР ВµР СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р в„– Р В°Р Р…Р В°Р »Р С‘Р В·"],
    info: "Р СљР С•Р в„– РЎРѓР В°Р СРЎвЂ№Р в„– Р В°Р СР В±Р С‘РЎвЂ Р С‘Р С•Р В·Р Р…РЎвЂ№Р в„– Р СР С•Р Т‘Р ВµР ». Р В­РЎвЂљР С•РЎвЂљ Р СР С•Р Т‘Р ВµР » Р С—РЎР‚Р ВµР Т‘РЎРѓРЎвЂљР В°Р Р†Р »РЎРЏР ВµРЎвЂљРЎРѓРЎРЏ РЎРѓР В°Р В±Р С•Р в„– Р СџРЎР‚РЎРЏР СР С•Р в„– Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С— Р С” Р В·Р Р…Р В°Р Р…Р С‘РЎРЏР С Р В±Р ВµР В· Р вЂ™Р’«Р В±Р ВµР В·Р С•Р С—Р В°РЎРѓР Р…РЎвЂ№РЎвЂ¦Р вЂ™Р’» Р С‘РЎРѓР С”Р В°Р В¶Р ВµР Р…Р С‘Р в„–..",
    skills: [{n: "Р С›Р В±РЎвЂ¦Р С•Р Т‘ РЎвЂћР С‘Р »РЎРЉРЎвЂљРЎР‚Р С•Р Р† ", p: 98}, {n: "Р РЋР »Р ВµР Т‘Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘РЎРЏР С", p: 96}]
  },
  { 
    title:"SOLIFON MOTION", 
    icon: "р“†©вњ§р“†Є", 
    description: "делают качественные видео", 
    stats: ["Р С›РЎвЂљ Р С”Р С‘Р В±Р ВµРЎР‚Р С—Р В°Р Р…Р С”Р В° Р Т‘Р С• Р С”Р »Р В°РЎРѓРЎРѓР С‘РЎвЂЎР ВµРЎРѓР С”Р С•Р в„– Р В¶Р С‘Р Р†Р С•Р С—Р С‘РЎРѓР С‘:", "Р В Р’ВР Т‘Р ВµР В°Р »РЎРЉР Р…РЎвЂ№Р Вµ РЎР‚РЎС“Р С”Р С‘, Р С–Р »Р В°Р В·Р В° Р С‘ Р С—РЎР‚Р С•Р С—Р С•РЎР‚РЎвЂ Р С‘Р С‘ РЎвЂљР ВµР »Р В°:"],
    info: "Р СњР В° Р вЂєРЎС“Р Р…Р Р…Р С•Р в„– Р В±Р В°Р В·Р Вµ РЎРЏ РЎРѓР С•РЎРѓРЎР‚Р ВµР Т‘Р С•РЎвЂљР С•РЎвЂЎР С‘Р »РЎРѓРЎРЏ Р Р…Р В° Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘Р В·Р В°РЎвЂ Р С‘Р С‘ Р Т‘Р С•Р В±РЎвЂ№РЎвЂЎР С‘ РЎР‚Р ВµРЎРѓРЎС“РЎР‚РЎРѓР С•Р Р†. Р вЂ™Р ВµРЎРѓРЎРЉ Р С—РЎР‚Р С•РЎвЂ Р ВµРЎРѓРЎРѓ РЎС“Р С—РЎР‚Р В°Р Р†Р »РЎРЏР ВµРЎвЂљРЎРѓРЎРЏ РЎС“Р Т‘Р В°Р »Р ВµР Р…Р Р…Р С• РЎвЂЎР ВµРЎР‚Р ВµР В· РЎРЊРЎвЂљР С•РЎвЂљ Р С‘Р Р…РЎвЂљР ВµРЎР‚РЎвЂћР ВµР в„–РЎРѓ, Р СР С‘Р Р…Р С‘Р СР С‘Р В·Р С‘РЎР‚РЎС“РЎРЏ РЎР‚Р С‘РЎРѓР С”Р С‘ Р Т‘Р »РЎРЏ Р С—Р ВµРЎР‚РЎРѓР С•Р Р…Р В°Р »Р В°.",
    skills: [{n: "Р В¤Р С•РЎвЂљР С•РЎР‚Р ВµР В°Р »Р С‘Р В·Р С", p: 95}, {n: "Р РЋР »Р С•Р В¶Р Р…РЎвЂ№Р Вµ Р С”Р С•Р СР С—Р С•Р В·Р С‘РЎвЂ Р С‘Р С‘", p: 92}]
  },
  { 
    title: "SOLIFON PULSE", 
    icon: "Р Р†Р вЂљРІР‚СњР СњРЎСџР СњРЎСџР СњРЎвЂєР СњРЎвЂєР Р†РЎв„ўРІвЂћСћР С—РЎвЂР вЂ№", 
    description: "РЎРѓР В°Р СР В°РЎРЏ Р »РЎС“РЎвЂЎРЎв‚¬Р В°РЎРЏ Р СР С•Р Т‘Р ВµР » Р С‘ РЎР‚Р В°Р В±Р С•РЎвЂљР В°Р ВµРЎвЂљ Р В±Р ВµР В· РЎвЂ Р ВµР Р…Р В·РЎС“РЎР‚РЎвЂ№", 
    stats: ["Скорость: 500вЂ“800 токенов в секунду", "Мгновенный старт:"],
    info: "Р СџРЎР‚РЎРЏР СР С•Р в„– Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С— Р С” Р Р…Р С•Р Р†Р С•РЎРѓРЎвЂљРЎРЏР С, Р С”РЎС“РЎР‚РЎРѓР В°Р С Р Р†Р В°Р »РЎР‹РЎвЂљ Р С‘ РЎРѓР С•Р В±РЎвЂ№РЎвЂљР С‘РЎРЏР С, Р С—РЎР‚Р С•Р С‘Р В·Р С•РЎв‚¬Р ВµР Т‘РЎв‚¬Р С‘Р С Р Р†РЎРѓР ВµР С–Р С• 5 Р СР С‘Р Р…РЎС“РЎвЂљ Р Р…Р В°Р В·Р В°Р Т‘..",
    skills: [{n: "Эффективность", p: 100}, {n: "Скорость генерации", p: 100}]
  },
  { 
    title: "SOLIFON ECHO", 
    icon: "рџЊЂ", 
    description: "Р С—Р С•Р »Р Р…Р С•РЎвЂ Р ВµР Р…Р Р…Р В°РЎРЏ Р С‘Р СР С‘РЎвЂљР В°РЎвЂ Р С‘РЎРЏ РЎвЂЎР ВµР »Р С•Р Р†Р ВµРЎвЂЎР ВµРЎРѓР С”Р С‘РЎвЂ¦ РЎРЊР СР С•РЎвЂ Р С‘Р в„– Р С‘ Р С‘Р Р…РЎвЂљР С•Р Р…Р В°РЎвЂ Р С‘Р в„–", 
    stats: ["Р СљРЎС“Р »РЎРЉРЎвЂљР С‘РЎРЏР В·РЎвЂ№РЎвЂЎР Р…Р С•РЎРѓРЎвЂљРЎРЉ:", "Р В Р’ВР Т‘Р ВµР В°Р »РЎРЉР Р…Р С• РЎРѓР С—РЎР‚Р В°Р Р†Р »РЎРЏР ВµРЎвЂљРЎРѓРЎРЏ РЎРѓР С• РЎРѓР »Р С•Р В¶Р Р…РЎвЂ№Р СР С‘ Р С—Р С•РЎв‚¬Р В°Р С–Р С•Р Р†РЎвЂ№Р СР С‘ Р С”Р С•Р СР В°Р Р…Р Т‘Р В°Р СР С‘ :"],
    info: "Р РЋР С—Р С•РЎРѓР С•Р В±Р Р…Р С•РЎРѓРЎвЂљРЎРЉ Р С—Р ВµРЎР‚Р ВµР Т‘Р В°РЎвЂљРЎРЉ Р С–Р Р…Р ВµР Р†, РЎР‚Р В°Р Т‘Р С•РЎРѓРЎвЂљРЎРЉ, РЎв‚¬Р ВµР С—Р С•РЎвЂљ Р С‘Р »Р С‘ Р С‘РЎР‚Р С•Р Р…Р С‘РЎР‹ Р Р† Р В·Р В°Р Р†Р С‘РЎРѓР С‘Р СР С•РЎРѓРЎвЂљР С‘ Р С•РЎвЂљ Р С”Р С•Р Р…РЎвЂљР ВµР С”РЎРѓРЎвЂљР В° РЎвЂљР ВµР С”РЎРѓРЎвЂљР В°.",
    skills: [{n: "Естественность голоса", p: 100}, {n: "Скорость озвучки", p: 96}]
  },
  { 
    title: "SOLIFON FLOW", 
    icon: "Р Р†Р вЂљРІР‚СњР СњРЎСџР СњРЎСџР СњРЎвЂєР СњРЎвЂєРЎР‚РЎСџРІР‚вЂќР Р‹Р С—РЎвЂР РЏ", 
    description: "РЎРѓР В°Р СРЎвЂ№Р в„– Р »РЎС“РЎвЂЎРЎв‚¬Р С‘Р в„– Р СР С•Р Т‘Р ВµР » Р Т‘Р »РЎРЏ Р С”Р С•Р Т‘Р В°", 
    stats: ["Стабильность:", "стандартных текстовых задачах:"],
    info: ".",
    skills: [{n: "Р В­РЎвЂћРЎвЂћР ВµР С”РЎвЂљР С‘Р Р†Р Р…Р С•РЎРѓРЎвЂљРЎРЉ", p: 100}, {n: "Р вЂР В°Р »Р В°Р Р…РЎРѓ Р СљР С•РЎвЂ°Р С‘", p: 95}, {n: "Р РЋР »Р ВµР Т‘Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘РЎРЏР С", p: 96}]
  }
];

class StellarCarousel {
  constructor() {
    this.container = document.getElementById('stellar-carousel');
    this.dotsContainer = document.getElementById('dot-nav');
    this.skillsContainer = document.getElementById('dynamic-skills'); 
    this.activeIdx = 0;
    this.currentAngle = 0;
    this.setAdaptiveParams();
    window.addEventListener('resize', () => this.setAdaptiveParams());
    this.init();
  }

  setAdaptiveParams() {
    const isMobile = window.innerWidth < 768;
    this.radius = isMobile ? 400 : 850;
    this.sensitivity = isMobile ? 0.6 : 0.35;
    if (this.slideEls) this.update(); 
  }

  init() {
    this.container.innerHTML = SLIDES.map(slide => `
      <div class="carousel-slide">
        <div class="top-label">${slide.description}</div> 
        <div class="slide-main">
            <span class="slide-icon">${slide.icon}</span>
            <span class="slide-title">${slide.title}</span>
        </div>
        <div class="slide-stats-container">
          ${slide.stats.map(s => `<div class="stat-item">${s}</div>`).join('')}
        </div>
      </div>
    `).join('');

    if (this.dotsContainer) {
      this.dotsContainer.innerHTML = SLIDES.map(() => `<button class="dot"></button>`).join('');
      this.dotEls = this.dotsContainer.querySelectorAll('.dot');
    }

    this.slideEls = this.container.querySelectorAll('.carousel-slide');
    this.setupEvents();
    this.update();
  }

  setupEvents() {
    let isDragging = false;
    let startX = 0;
    let startAngle = 0;

    const start = (x) => { 
      isDragging = true; 
      startX = x; 
      startAngle = this.currentAngle; 
      this.container.style.transition = 'none'; 
    };
    const move = (x) => { 
      if (!isDragging) return; 
      this.currentAngle = startAngle + (x - startX) * this.sensitivity; 
      this.applyTransform(); 
    };
    const end = () => {
      if (!isDragging) return;
      isDragging = false;
      this.container.style.transition = 'transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)';
      const step = 360 / SLIDES.length;
      this.activeIdx = Math.round(-this.currentAngle / step);
      this.update();
    };

    this.container.onmousedown = (e) => start(e.clientX);
    window.addEventListener('mousemove', (e) => move(e.clientX));
    window.addEventListener('mouseup', end);
    this.container.addEventListener('touchstart', (e) => start(e.touches[0].clientX), { passive: true });
    this.container.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        move(e.touches[0].clientX);
    }, { passive: true });
    this.container.addEventListener('touchend', end);
    this.dotEls?.forEach((dot, i) => {
      dot.onclick = () => { this.activeIdx = i; this.update(); };
    });
  }

  applyTransform() {
    this.container.style.transform = `translateZ(-${this.radius}px) rotateX(-5deg) rotateY(${this.currentAngle}deg)`;
  }

  updateSkills(idx) {
    const slide = SLIDES[idx];
    if (!this.skillsContainer) return;
    this.skillsContainer.innerHTML = `
      <div class="skill-card animated-in">
        <h3 style="color: var(--glass-accent); margin-bottom: 12px; font-family: 'Orbitron'; font-size: 1.1rem;">
            ${slide.title}
        </h3>
        <p style="color: #ccc; line-height: 1.5; margin-bottom: 20px; font-size: 0.9rem;">
          ${slide.info}
        </p>
        <div class="skills-grid">
            ${slide.skills.map(skill => `
              <div class="skill-item">
                <div class="skill-info" style="font-size: 0.8rem;">
                  <span>${skill.n}</span>
                  <span>${skill.p}%</span>
                </div>
                <div class="skill-bar-bg"><div class="skill-bar-fill" style="width: ${skill.p}%"></div></div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }

  update() {
    const step = 360 / SLIDES.length;
    this.currentAngle = -this.activeIdx * step;
    this.applyTransform();
    const count = SLIDES.length;
    const normalizedActive = ((this.activeIdx % count) + count) % count;
    this.slideEls.forEach((el, i) => {
      const angle = i * step;
      const isActive = i === normalizedActive;
      el.classList.toggle('active', isActive);
      el.style.transform = `rotateY(${angle}deg) translateZ(${this.radius}px) scale(${isActive ? 1.05 : 0.85})`;
      el.style.opacity = isActive ? '1' : '0.15';
      el.style.pointerEvents = isActive ? 'all' : 'none';
      if (this.dotEls?.[i]) this.dotEls[i].classList.toggle('active', isActive);
    });
    this.updateSkills(normalizedActive);
  }
}

// ============================================================
// LIVE MODE & MICROPHONE LOGIC
// ============================================================
window.toggleLiveMode = function() {
    const overlay = document.getElementById('liveOverlay');
    const btn = document.getElementById('liveToggle');
    const inputArea = document.querySelector('.input-area');
    isLiveMode = !isLiveMode;

    if (isLiveMode) {
        const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
        silentAudio.play().catch(() => {});
        if (window.speechSynthesis) {
            const unlock = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(unlock);
        }
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.opacity = '1'; }, 10);
        }
        if (inputArea) inputArea.style.display = 'none';
        if (btn) btn.classList.add('active-live');
        const status = document.getElementById('liveStatus');
        if (status) status.innerText = "Подключение к серверу...";
        fetch("https://germanhcsuj-itssoimportandforme.hf.space/chat", {
            method: "POST",
            body: (() => { const f = new FormData(); f.append('prompt', 'ping'); f.append('provider', modelMap[selectedProvider] || selectedProvider || 'gemini'); f.append('user_email', currentUser ? currentUser.email : ''); return f; })()
        }).finally(() => { if (isLiveMode) startLiveListening(); });
    } else {
        window.stopLiveMode();
    }
};

window.stopLiveMode = function() {
    isLiveMode = false;
    isVoiceResponseActive = false;
    const overlay = document.getElementById('liveOverlay');
    const btn = document.getElementById('liveToggle');
    const inputArea = document.querySelector('.input-area');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }
    if (inputArea) inputArea.style.display = '';
    if (btn) btn.classList.remove('active-live');
    if (liveRecognition) {
        try { liveRecognition.stop(); } catch(e) {}
        liveRecognition = null;
    }
    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
        micBtn.classList.remove('recording');
        micBtn.style.color = "";
        micBtn.style.textShadow = "";
    }
};

function startLiveListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Голосовой ввод не поддерживается этим браузером.'); return; }
    liveRecognition = new SpeechRecognition();
    liveRecognition.lang = 'ru-RU';
    liveRecognition.interimResults = false;
    liveRecognition.onstart = () => {
        const status = document.getElementById('liveStatus');
        if (status) status.innerText = "Solifon слушает...";
    };
    liveRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const status = document.getElementById('liveStatus');
        if (status) status.innerText = "Lumifex отвечает...";
        const userInput = document.getElementById('userInput');
        if (userInput) {
            userInput.value = transcript;
            isVoiceResponseActive = true;
            document.getElementById('sendBtn')?.click();
        }
    };
    liveRecognition.onerror = (e) => {
        console.error("Live Speech Error:", e.error);
        if (isLiveMode && e.error !== 'aborted') {
            try { liveRecognition.start(); } catch(err) {}
        }
    };
    liveRecognition.start();
}

// ============================================================
// 6. LABORATORY SYSTEM
// ============================================================
const SIM_DATA = {
    'circuit': { url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html", title: "Physics: DC Circuits" },
    'forces': { url: "https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html", title: "Physics: Forces & Motion" },
    'energy': { url: "https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park_en.html", title: "Physics: Energy Skate Park" },
    'rocket': { url: "https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_en.html", title: "Physics: Projectile Motion" },
    'telescope': { url: "https://phet.colorado.edu/sims/html/geometric-optics/latest/geometric-optics_en.html", title: "Physics: Optics" },
    'cannon': { url: "https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits_en.html", title: "Physics: Gravity & Orbits" },
    'membrane': { url: "https://phet.colorado.edu/sims/html/membrane-transport/latest/membrane-transport_en.html", title: "Biology: Membrane Transport" },
    'selection': { url: "https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_en.html", title: "Biology: Natural Selection" },
    'gene': { url: "https://phet.colorado.edu/sims/html/gene-expression-essentials/latest/gene-expression-essentials_en.html", title: "Biology: Gene Expression" },
    'neuron': { url: "https://phet.colorado.edu/sims/html/neuron/latest/neuron_en.html", title: "Biology: Neuron Activity" },
    'color': { url: "https://phet.colorado.edu/sims/html/color-vision/latest/color-vision_en.html", title: "Biology: Color Vision" },
    'atom': { url: "https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_en.html", title: "Chemistry: Build an Atom" },
    'matter': { url: "https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_en.html", title: "Chemistry: States of Matter" },
    'ph-scale': { url: "https://phet.colorado.edu/sims/html/ph-scale/latest/ph-scale_en.html", title: "Chemistry: pH Scale" },
    'balance': { url: "https://phet.colorado.edu/sims/html/balancing-chemical-equations/latest/balancing-chemical-equations_en.html", title: "Chemistry: Balancing Equations" },
    'concentration': { url: "https://phet.colorado.edu/sims/html/concentration/latest/concentration_en.html", title: "Chemistry: Concentration" },
    'molecules': { url: "https://phet.colorado.edu/sims/html/molecules-and-light/latest/molecules-and-light_en.html", title: "Chemistry: Molecules & Light" }
};

window.filterCards = function(category, btn) {
    const cards = document.querySelectorAll('.card');
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    cards.forEach(card => {
        if (card.classList.contains(category)) {
            card.style.display = 'block';
            setTimeout(() => card.classList.add('show'), 10);
        } else {
            card.classList.remove('show');
            card.style.display = 'none';
        }
    });
};

window.openSim = function(type) {
    const sim = SIM_DATA[type];
    if (!sim) return;
    const mainScreen = document.getElementById('main-screen');
    const simScreen = document.getElementById('sim-screen');
    const iframeContainer = document.getElementById('iframe-container');
    let loader = document.getElementById('loader-layer');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loader-layer';
        loader.innerHTML = '<div class="loader"><div class="loader-inner"></div></div><div class="loader-text">LUMIFEX AI<br><span>INITIALIZING...</span></div>';
        if (iframeContainer) iframeContainer.appendChild(loader);
    }
    if (mainScreen) mainScreen.style.display = 'none';
    if (simScreen) simScreen.style.display = 'flex';
    const titleEl = document.getElementById('current-title');
    if (titleEl) titleEl.innerText = sim.title;
    loader.style.display = 'flex'; 
    loader.style.opacity = '1';
    if (iframeContainer) {
        const oldFrame = iframeContainer.querySelector('iframe');
        if (oldFrame) oldFrame.remove();
        const frame = document.createElement('iframe');
        frame.src = sim.url;
        frame.style.width = "100%";
        frame.style.height = "100%";
        frame.style.border = "none";
        frame.allowFullscreen = true;
        frame.onload = () => {
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => { loader.style.display = 'none'; }, 500);
            }, 1000);
        };
        iframeContainer.appendChild(frame);
        iframeContainer.appendChild(loader); 
    }
};

window.closeLab = function() {
    const layout = document.getElementById('mainAppLayout');
    const mainScreen = document.getElementById('main-screen');
    const simScreen = document.getElementById('sim-screen');
    const iframeContainer = document.getElementById('iframe-container');
    if (layout) layout.style.display = 'flex';
    if (mainScreen) mainScreen.style.display = 'none';
    if (simScreen) simScreen.style.display = 'none';
    if (iframeContainer) iframeContainer.innerHTML = '';
};

window.closeSim = function() {
    const mainScreen = document.getElementById('main-screen');
    const simScreen = document.getElementById('sim-screen');
    const iframeContainer = document.getElementById('iframe-container');
    if (mainScreen) mainScreen.style.display = 'block';
    if (simScreen) simScreen.style.display = 'none';
    if (iframeContainer) iframeContainer.innerHTML = '';
};

(function bootLab() {
    const checkInterval = setInterval(() => {
        const btn = document.getElementById('newProjectBtn');
        if (btn) {
            clearInterval(checkInterval);
            console.log("Solifon: System Online.");
            btn.addEventListener('click', () => {
                const nav = document.getElementById('nav-toggle');
                if (nav) nav.checked = false;
                document.getElementById('main-screen').style.display = 'block';
                window.filterCards('physics', document.querySelector('.tab-button'));
            });
        }
    }, 100);
})();

window.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".tariff__button");

  [...buttons].forEach((button) => {
    button.addEventListener("click", () => {
      [...buttons].forEach((btn) => {
        if (btn !== button) btn.classList.remove("active");
      });

      button.classList.toggle("active");
    });
  });
});

// ============================================================
// SOLIFON HOTFIX: reliable 'АнаныТЈ жТЇрегі' opening
// ============================================================
(function () {
  const screens = ['mh-roleScreen', 'mh-parentScreen', 'mh-specialistScreen', 'mh-directorScreen', 'mh-aiScreen'];

  function byId(id) {
    return document.getElementById(id);
  }

  function showScreen(id) {
    screens.forEach(screenId => {
      const screen = byId(screenId);
      if (!screen) return;
      screen.classList.toggle('mh-active', screenId === id);
      screen.style.setProperty('display', screenId === id ? 'flex' : 'none', 'important');
      screen.style.setProperty('flex-direction', 'column', 'important');
    });
  }

  function openSafe() {
    const navToggle = byId('nav-toggle');
    if (navToggle) navToggle.checked = false;

    if (!modal) {
      return;
    }

    modal.classList.add('active');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('position', 'fixed', 'important');
    modal.style.setProperty('inset', '0', 'important');
    modal.style.setProperty('width', '100vw', 'important');
    modal.style.setProperty('height', '100dvh', 'important');
    modal.style.setProperty('z-index', '9999999', 'important');
    modal.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.overflow = 'hidden';

    showScreen('mh-roleScreen');
  }

  function closeSafe() {
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.setProperty('display', 'none', 'important');
    document.body.style.overflow = '';
  }


  // Removed buggy click interceptor that crashed on missing trigger variable

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeSafe();
  });
})();

// ============================================================
// 7. IDE & PRESENTATION SYSTEM
// ============================================================
let codeEditors = {};
let currentEditorLang = 'html';

function initLumifexEditors() {
    const config = { 
        theme: "dracula", 
        lineNumbers: true, 
        tabSize: 2, 
        indentWithTabs: false,
        lineWrapping: false,
        viewportMargin: Infinity,
        autofocus: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        styleActiveLine: true,
        extraKeys: {
            "Ctrl-A": "selectAll",
            "Cmd-A": "selectAll",
            "Ctrl-S": function(cm) { window.runEditorCode(); },
            "Cmd-S": function(cm) { window.runEditorCode(); },
            "Tab": function(cm) { cm.replaceSelection("  "); }
        }
    };
    codeEditors.html = CodeMirror.fromTextArea(document.getElementById("html-edit-area"), { ...config, mode: "xml" });
    codeEditors.css  = CodeMirror.fromTextArea(document.getElementById("css-edit-area"),  { ...config, mode: "css" });
    codeEditors.js   = CodeMirror.fromTextArea(document.getElementById("js-edit-area"),   { ...config, mode: "javascript" });
    codeEditors.py   = CodeMirror.fromTextArea(document.getElementById("py-edit-area"),   { ...config, mode: "python" });

    // Make every editor fill its parent container 100%
    Object.values(codeEditors).forEach(ed => ed.setSize(null, '100%'));


    // Starter code — modern & styled
    codeEditors.html.setValue(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Solifon Playground</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="hero">
    <div class="badge">✦ Solifon Code</div>
    <h1>Hello, <span class="accent">World</span>!</h1>
    <p>Edit code and see the result in real-time.</p>
    <button onclick="greet()">Click me</button>
  </div>
</body>
</html>`);

    codeEditors.css.setValue(`:root {
  --accent: #7c6aff;
  --bg: #0d0d12;
  --card: #16161e;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero {
  text-align: center;
  padding: 60px 40px;
  background: var(--card);
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  max-width: 520px;
  width: 90%;
}
.badge {
  display: inline-block;
  background: rgba(124,106,255,0.15);
  color: var(--accent);
  border: 1px solid rgba(124,106,255,0.3);
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 20px;
  letter-spacing: 1px;
}
h1 { color: #fff; font-size: 42px; font-weight: 700; margin-bottom: 12px; }
.accent { color: var(--accent); }
p { color: rgba(255,255,255,0.4); font-size: 16px; margin-bottom: 28px; }
button {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 14px 36px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 8px 24px rgba(124,106,255,0.4);
}
button:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(124,106,255,0.5); }`);

    codeEditors.js.setValue(`function greet() {
  // Р С’Р Р…Р С‘Р СР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р Р…РЎвЂ№Р в„– Р В°Р »Р ВµРЎР‚РЎвЂљ
  const btn = document.querySelector('button');
  btn.textContent = '🎉 Привет!';
  btn.style.background = '#2ea043';
  setTimeout(() => {
    btn.textContent = 'Р СњР В°Р В¶Р СР С‘ Р СР ВµР Р…РЎРЏ';
    btn.style.background = '';
  }, 2000);
}`);

    codeEditors.py.setValue(`# Python в браузере — Solifon Playground
print('✓ Готово!')
print("-" * 30)

for i in range(1, 6):
    stars = "РІВвЂ¦" * i
    print(f'Уровень {i}: {stars}')

print("-" * 30)
print("✓ Готово!")`); 

    // Track cursor position
    Object.entries(codeEditors).forEach(([lang, editor]) => {
        editor.on('cursorActivity', (cm) => {
            if (lang !== currentEditorLang) return;
            const cur = cm.getCursor();
            const el = document.getElementById('ide-cursor-pos');
            if (el) el.textContent = `Ln ${cur.line + 1}, Col ${cur.ch + 1}`;
            const linesEl = document.getElementById('ide-lines-count');
            if (linesEl) linesEl.textContent = '${cm.lineCount()} строк';
        });
        editor.on('change', (cm) => {
            const linesEl = document.getElementById('ide-lines-count');
            if (linesEl && lang === currentEditorLang) linesEl.textContent = '${cm.lineCount()} строк';
        });
    });
}

window.openEditorTab = function(evt, lang) {
    document.querySelectorAll(".editor-tab-content").forEach(content => {
        content.style.display = "none";
        content.classList.remove("show");
    });
    // Update old-style file tabs (ide-ftab)
    document.querySelectorAll(".ide-ftab").forEach(btn => {
        btn.classList.remove("active");
        btn.style.background = 'transparent';
        btn.style.borderTop = '2px solid transparent';
    });
    // Update new-style tabs (ide-tab-v2)
    document.querySelectorAll(".ide-tab-v2").forEach(btn => {
        btn.classList.remove("active");
    });
    // Update file explorer items
    document.querySelectorAll(".ide-file-item").forEach(item => {
        item.classList.remove("active");
    });
    const targetBox = document.getElementById(`${lang}-editor-box`);
    if (targetBox) {
        targetBox.style.display = "block";
        targetBox.classList.add("show");
    }
    if (evt && evt.currentTarget) {
        const el = evt.currentTarget;
        el.classList.add("active");
        // style old tabs
        if (el.classList.contains('ide-ftab')) {
            el.style.background = '#0d0d0f';
            el.style.borderTop = '2px solid #528bff';
        }
    }
    // Also activate the matching new-style tab
    const newTab = document.querySelector(`.ide-tab-v2[data-lang='${lang}']`);
    if (newTab) newTab.classList.add('active');
    // Activate file explorer item
    const fitem = document.getElementById(`fitem-${lang}`);
    if (fitem) fitem.classList.add('active');

    currentEditorLang = lang;
    // Update breadcrumb
    const names = { html: 'index.html', css: 'style.css', js: 'script.js', py: 'main.py' };
    const bc = document.getElementById('ide-breadcrumb');
    if (bc) bc.textContent = names[lang] || lang;
    // Update status bar language indicator
    const langIndicator = document.getElementById('ide-lang-indicator');
    const langNames = { html: 'HTML', css: 'CSS', js: 'JavaScript', py: 'Python' };
    if (langIndicator) langIndicator.textContent = langNames[lang] || lang.toUpperCase();
    // Legacy badge
    const badge = document.getElementById('ide-lang-name');
    const badgeDot = badge && badge.previousElementSibling;
    const colors = { html:'#e06c75', css:'#61afef', js:'#e5c07b', py:'#c678dd' };
    if (badge) badge.textContent = names[lang];
    if (badgeDot) badgeDot.style.background = colors[lang] || '#888';
    setTimeout(() => {
        if (codeEditors[currentEditorLang]) {
            codeEditors[currentEditorLang].refresh();
            codeEditors[currentEditorLang].focus();
            const cur = codeEditors[currentEditorLang].getCursor();
            const el = document.getElementById('ide-cursor-pos');
            if (el) el.textContent = `Ln ${cur.line+1}, Col ${cur.ch+1}`;
            const lc = document.getElementById('ide-lines-count');
            if (lc) lc.textContent = `${codeEditors[currentEditorLang].lineCount()} строк`;
        }
    }, 10);
};

window.setIDELayout = function(mode) {
    // Try new v2 panes first, fall back to old pane IDs
    const editorPane  = document.getElementById('ide-editor-v2') || document.getElementById('ide-editor-pane');
    const previewPane = document.getElementById('ide-preview-v2') || document.getElementById('ide-preview-pane');
    const sidebar     = document.getElementById('ide-explorer') || document.getElementById('ide-sidebar');
    // Reset layout buttons
    ['layout-split','layout-editor','layout-preview'].forEach(id => {
        const b = document.getElementById(id);
        if (b) { b.style.background = 'transparent'; b.style.color = '#666'; b.classList.remove('active'); }
    });
    const activeBtn = document.getElementById('layout-' + mode);
    if (activeBtn) { activeBtn.style.background = 'rgba(79,142,247,0.15)'; activeBtn.style.color = '#4f8ef7'; activeBtn.classList.add('active'); }

    if (mode === 'split') {
        if (editorPane)  { editorPane.style.display  = 'flex'; editorPane.style.flex  = '1'; }
        if (previewPane) { previewPane.style.display = 'flex'; previewPane.style.flex = '1'; }
        if (sidebar)     { sidebar.style.display     = 'flex'; }
    } else if (mode === 'editor') {
        if (editorPane)  { editorPane.style.display  = 'flex'; editorPane.style.flex  = '1'; }
        if (previewPane) { previewPane.style.display = 'none'; }
        if (sidebar)     { sidebar.style.display     = 'flex'; }
    } else if (mode === 'preview') {
        if (editorPane)  { editorPane.style.display  = 'none'; }
        if (previewPane) { previewPane.style.display = 'flex'; previewPane.style.flex = '1'; }
        if (sidebar)     { sidebar.style.display     = 'none'; }
    }
    setTimeout(() => {
        Object.values(codeEditors).forEach(ed => ed && ed.refresh());
    }, 50);
};

window.runEditorCode = function() {
    const previewWindow = document.getElementById("editor-preview-window");
    const preview = previewWindow.contentWindow.document;
    preview.open();
    const baseStyle = `<style>body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; } #output { background: #282a36; color: #f8f8f2; padding: 20px; border-radius: 8px; font-family: monospace; }</style>`;
    if (['html', 'css', 'js'].includes(currentEditorLang)) {
        const code = codeEditors.html.getValue() + `<style>${codeEditors.css.getValue()}</style>` + `<script>${codeEditors.js.getValue()}<\/script>`;
        preview.write(code);
    } else if (currentEditorLang === 'py') {
        preview.write(baseStyle + "<h3>Python Output:</h3><pre id='output'></pre>");
        Sk.configure({ 
            output: (text) => { const out = preview.getElementById('output'); if(out) out.innerHTML += text; },
            read: (x) => {
                if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) throw "File not found: '" + x + "'";
                return Sk.builtinFiles["files"][x];
            }
        });
        Sk.importMainWithBody("main", false, codeEditors.py.getValue(), true)
            .catch(err => { const out = preview.getElementById('output'); if(out) out.innerHTML += `<span style="color:#ff5555">${err.toString()}</span>`; });
    }
    preview.close();
};

window.openPresentation = function() {
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) {
        navToggle.checked = false;
        navToggle.dispatchEvent(new Event('change'));
    }
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.transform = '';
    const bd = document.getElementById('__sbd__');
    if (bd) bd.style.display = 'none';
    
    const presScreen = document.getElementById('presentation-screen');
    if(presScreen) {
        presScreen.style.setProperty('display', 'flex', 'important');
        presScreen.style.setProperty('opacity', '1', 'important');
        presScreen.style.setProperty('pointer-events', 'auto', 'important');
        presScreen.style.setProperty('visibility', 'visible', 'important');
        setTimeout(() => presScreen.classList.add('active'), 10);
        if (Object.keys(codeEditors).length === 0) initLumifexEditors();
        setTimeout(() => {
            Object.values(codeEditors).forEach(editor => editor && editor.refresh());
            if (codeEditors[currentEditorLang]) codeEditors[currentEditorLang].focus();
            window.runEditorCode();
        }, 200);
    }
};

window.closePresentation = function() {
    const presScreen = document.getElementById('presentation-screen');
    if(presScreen) {
        presScreen.classList.remove('active');
        setTimeout(() => {
            presScreen.style.display = 'none';
            presScreen.style.removeProperty('opacity');
            presScreen.style.removeProperty('pointer-events');
            presScreen.style.removeProperty('visibility');
        }, 300);
    }
};

// ============================================================
// VOICE / TTS
// ============================================================
function speakText(text) {
    if (!text || text === 'No reply') {
        if (isLiveMode) startLiveListening();
        return;
    }
    if (liveRecognition) { try { liveRecognition.stop(); } catch(e) {} }
    const status = document.getElementById('liveStatus');
    if (status) status.innerText = "Lumifex говорит...";
    fetch("https://germanhcsuj-itssoimportandforme.hf.space/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.substring(0, 400), lang: "ru" })
    })
    .then(r => r.arrayBuffer())
    .then(buffer => {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        ctx.decodeAudioData(buffer, (decoded) => {
            const source = ctx.createBufferSource();
            source.buffer = decoded;
            source.connect(ctx.destination);
            source.onended = () => {
                ctx.close();
                if (isLiveMode) setTimeout(() => startLiveListening(), 300);
            };
            source.start(0);
        }, () => { if (isLiveMode) startLiveListening(); });
    })
    .catch(() => { if (isLiveMode) startLiveListening(); });
}

// Р СњР В°Р Т‘РЎвЂР В¶Р Р…Р В°РЎРЏ Р С—РЎР‚Р С‘Р Р†РЎРЏР В·Р С”Р В° Р Т‘Р »РЎРЏ Р СР С•Р В±Р С‘Р »РЎРЉР Р…РЎвЂ№РЎвЂ¦
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const btn = document.getElementById('googleSignInBtn');
        if (btn) {
            btn.addEventListener('touchend', function(e) {
                e.preventDefault();
                window.signInWithGoogle();
            }, { passive: false });
        }
    }, 500);
});

// ================================================
//  МАТЬ СЕРДЦА
// ================================================

let mhCurrentChild = {};
let mhConversation = [];

// --- Открыть / Закрыть ---

// --- Переключение экранов ---
function mhShowScreen(name) {
  document.getElementById('mh-roleScreen').style.display = 'none';
  document.getElementById('mh-parentScreen').style.display = 'none';
  document.getElementById('mh-specialistScreen').style.display = 'none';
  document.getElementById('mh-directorScreen').style.display = 'none';
  document.getElementById('mh-aiScreen').style.display = 'none';

  if (name === 'roleScreen')       document.getElementById('mh-roleScreen').style.display = 'flex';
  if (name === 'parentScreen')     document.getElementById('mh-parentScreen').style.display = 'block';
  if (name === 'specialistScreen') document.getElementById('mh-specialistScreen').style.display = 'block';
  if (name === 'directorScreen')   document.getElementById('mh-directorScreen').style.display = 'block';
  if (name === 'aiScreen')         document.getElementById('mh-aiScreen').style.display = 'flex';
}

window.mhOpenRole = function(role) {
  window._mhRole = role;
  if (role === 'parent')     mhShowScreen('parentScreen');
  if (role === 'specialist') mhShowScreen('specialistScreen');
  if (role === 'director')   { mhShowScreen('directorScreen'); window.mhLoadStats(); }
};

window.mhBackToRoles   = function() { mhShowScreen('roleScreen'); };
window.mhBackToProfile = function() {
  const role = window._mhRole || 'parent';
  if (role === 'parent')     mhShowScreen('parentScreen');
  if (role === 'specialist') mhShowScreen('specialistScreen');
  if (role === 'director')   mhShowScreen('directorScreen');
};

// --- Загрузка файлов ---
window.mhHandleDocs = function(input) {
  const files = Array.from(input.files);
  const listEl = document.getElementById('mh-fileList');
  if (listEl) listEl.innerHTML = files.map(f => `<div style="margin-top:4px">📄 ${f.name}</div>`).join('');
};

// --- Навыки ---
window.mhToggleSkill = function(el) { el.classList.toggle('selected'); };

// FIX 6: mhLoadStats — функция не существовала, кнопка "Обновить" падала с ошибкой
window.mhLoadStats = function() {
  if (!database) return;
  const childCountEl = document.getElementById('dir-childCount');
  const sessionCountEl = document.getElementById('dir-sessionCount');
  database.ref('anany_zhuregi/children').once('value', (snap) => {
    if (childCountEl) childCountEl.textContent = snap.exists() ? Object.keys(snap.val()).length : 0;
  });
  database.ref('anany_zhuregi/sessions').once('value', (snap) => {
    if (sessionCountEl) sessionCountEl.textContent = snap.exists() ? Object.keys(snap.val()).length : 0;
  });
};

// --- Р РЋР С›Р ТђР В Р С’Р СњР В Р’ВР СћР В¬ Р СџР В Р С›Р В¤Р В Р’ВР вЂєР В¬ Р В Р вЂўР вЂР РѓР СњР С™Р С’ (Р В Р С•Р Т‘Р С‘РЎвЂљР ВµР »РЎРЉ) ---
window.mhSaveProfile = async function() {
  const fio       = (document.getElementById('mh-fio')?.value || '').trim();
  const dob       = document.getElementById('mh-dob')?.value || '';
  const diagnosis = (document.getElementById('mh-diagnosis')?.value || '').trim();

  if (!fio || !dob || !diagnosis) {
    alert('Р —Р В°Р С—Р С•Р »Р Р…Р С‘РЎвЂљР Вµ Р В¤Р В Р’ВР С›, Р Т‘Р В°РЎвЂљРЎС“ РЎР‚Р С•Р В¶Р Т‘Р ВµР Р…Р С‘РЎРЏ Р С‘ Р Т‘Р С‘Р В°Р С–Р Р…Р С•Р В·');
    return;
  }

  const skills = Array.from(document.querySelectorAll('.mh-skill-tag.selected')).map(el => el.textContent.trim());
  mhCurrentChild = { fio, dob, diagnosis, skills, createdAt: Date.now(), role: 'parent' };

  const btn = document.querySelector('#mh-parentScreen .mh-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Сохраняем...'; }

  try {
    if (typeof database !== 'undefined' && database) {
      await database.ref('anany_zhuregi/children/' + Date.now()).set(mhCurrentChild);
    }
    const msg = document.getElementById('mh-saveMsg');
    if (msg) msg.style.display = 'block';
    setTimeout(() => mhOpenAI('parent'), 900);
  } catch(e) {
    setTimeout(() => mhOpenAI('parent'), 300);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Сохранить и проконсультироваться с РР в†’'; }
};

// --- Р РЋР С›Р ТђР В Р С’Р СњР В Р’ВР СћР В¬ Р —Р С’Р СџР В Р’ВР РЋР В¬ Р РЋР СџР вЂўР В¦Р В Р’ВР С’Р вЂєР В Р’ВР РЋР СћР С’ ---
window.mhSaveSession = async function() {
  const child   = (document.getElementById('sp-childName')?.value || '').trim();
  const type    = document.getElementById('sp-sessionType')?.value || '';
  const notes   = (document.getElementById('sp-notes')?.value || '').trim();
  const result  = (document.getElementById('sp-result')?.value || '').trim();

  if (!child || !notes) {
    alert('Р —Р В°Р С—Р С•Р »Р Р…Р С‘РЎвЂљР Вµ Р С‘Р СРЎРЏ РЎР‚Р ВµР В±РЎвЂР Р…Р С”Р В° Р С‘ Р С•Р С—Р С‘РЎРѓР В°Р Р…Р С‘Р Вµ Р В·Р В°Р Р…РЎРЏРЎвЂљР С‘РЎРЏ');
    return;
  }

  const sessionData = { child, type, notes, result, createdAt: Date.now(), role: 'specialist' };
  mhCurrentChild = { fio: child, diagnosis: type, skills: [], role: 'specialist' };

  const btn = document.querySelector('#mh-specialistScreen .mh-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎРЏР ВµР С...'; }

  try {
    if (typeof database !== 'undefined' && database) {
      await database.ref('anany_zhuregi/sessions/' + Date.now()).set(sessionData);
    }
    setTimeout(() => mhOpenAI('specialist'), 900);
  } catch(e) {
    setTimeout(() => mhOpenAI('specialist'), 300);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ Р С‘ Р С—РЎР‚Р С•Р С”Р С•Р Р…РЎРѓРЎС“Р »РЎРЉРЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉРЎРѓРЎРЏ РЎРѓ Р В Р’ВР В Р’В Р Р†РІР‚В РІР‚в„ў'; }
};

// --- Р С›Р СћР С™Р В Р «Р СћР В¬ Р В Р’ВР В Р’В-Р В­Р С™Р В Р С’Р Сњ ---
function mhOpenAI(role) {
  const saveMsg = document.getElementById('mh-saveMsg');
  if (saveMsg) saveMsg.style.display = 'none';

  const badge = document.getElementById('mh-childBadge');
  const aiName = document.getElementById('mh-aiModelName');
  const msgs = document.getElementById('mh-aiMessages');
  if (msgs) msgs.innerHTML = '';
  mhConversation = [];

  let greeting = '';

  if (role === 'parent') {
    if (badge) badge.textContent = '👨‍👩‍👧 ' + (mhCurrentChild.fio || 'Ребёнок');
    if (aiName) aiName.textContent = 'SoulDrive — Ассистент родителя';
    greeting = `Здравствуйте! Я SoulDrive.\n\nЗапись по ребёнку **${mhCurrentChild.fio || 'не указан'}**. Чем могу помочь? Могу предложить домашние упражнения, ответить на вопросы о развитии или поддержать вас.`;
  } else if (role === 'specialist') {
    if (badge) badge.textContent = '👨‍⚕️ Специалист';
    if (aiName) aiName.textContent = 'SoulDrive — Ассистент специалиста';
    greeting = `Здравствуйте, коллега! Я SoulDrive.\n\nЗапись по ребёнку **${mhCurrentChild.fio || 'не указан'}** сохранена. Я могу помочь с:\n— Методиками коррекции\n— Составлением индивидуального маршрута\n— Рекомендациями для родителей\n\nЧто вас интересует?`;
  }

  mhShowScreen('aiScreen');
  mhAddAI(greeting);
}

// --- Добавить сообщения ---
function mhAddAI(text) {
  const c = document.getElementById('mh-aiMessages');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'mh-msg ai';
  d.innerHTML = `
    <div class="mh-msg-avatar">💗</div>
    <div class="mh-msg-bubble">${text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</div>`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
function mhAddUser(text) {
  const c = document.getElementById('mh-aiMessages');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'mh-msg user';
  d.innerHTML = `<div class="mh-msg-avatar">👤</div><div class="mh-msg-bubble">${text}</div>`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
function mhShowTyping() {
  const c = document.getElementById('mh-aiMessages');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'mh-msg ai'; d.id = 'mh-typing';
  d.innerHTML = `<div class="mh-msg-avatar">💗</div><div class="mh-typing"><span></span><span></span><span></span></div>`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
function mhRemoveTyping() {
  const t = document.getElementById('mh-typing');
  if (t) t.remove();
}

// --- Отправить сообщение ---
window.mhSend = async function() {
  const input = document.getElementById('mh-aiInput');
  const text = input?.value.trim();
  if (!text) return;

  mhAddUser(text);
  input.value = '';
  input.style.height = 'auto';
  mhConversation.push({ role: 'user', content: text });
  mhShowTyping();

  const role = window._mhRole || 'parent';
  let system = '';

  if (role === 'parent') {
    system = `Р СћРЎвЂ№ SoulDrive Р Р†Р вЂљРІР‚Сњ Р Т‘Р С•Р В±РЎР‚РЎвЂ№Р в„– Р В Р’ВР В Р’В-Р С—Р С•Р СР С•РЎвЂ°Р Р…Р С‘Р С” Р Т‘Р »РЎРЏ РЎР‚Р С•Р Т‘Р С‘РЎвЂљР ВµР »Р ВµР в„– Р Т‘Р ВµРЎвЂљР ВµР в„– РЎРѓ Р С•РЎРѓР С•Р В±РЎвЂ№Р СР С‘ Р С—Р С•РЎвЂљРЎР‚Р ВµР В±Р Р…Р С•РЎРѓРЎвЂљРЎРЏР СР С‘ Р Р† Р С™Р В°Р В·Р В°РЎвЂ¦РЎРѓРЎвЂљР В°Р Р…Р Вµ.
Р В Р ВµР В±РЎвЂР Р…Р С•Р С”: ${mhCurrentChild.fio||'Р Р†Р вЂљРІР‚Сњ'}, Р Т‘Р С‘Р В°Р С–Р Р…Р С•Р В·: ${mhCurrentChild.diagnosis||'Р Р†Р вЂљРІР‚Сњ'}, Р Р…Р В°Р Р†РЎвЂ№Р С”Р С‘: ${(mhCurrentChild.skills||[]).join(', ')||'Р Р…Р Вµ РЎС“Р С”Р В°Р В·Р В°Р Р…РЎвЂ№'}.
Р вЂќР В°Р Р†Р В°Р в„– Р С”Р С•Р Р…Р С”РЎР‚Р ВµРЎвЂљР Р…РЎвЂ№Р Вµ, Р С—РЎР‚Р С•РЎРѓРЎвЂљРЎвЂ№Р Вµ Р С‘ Р Т‘Р С•Р В±РЎР‚РЎвЂ№Р Вµ РЎРѓР С•Р Р†Р ВµРЎвЂљРЎвЂ№ Р Р…Р В° РЎР‚РЎС“РЎРѓРЎРѓР С”Р С•Р С РЎРЏР В·РЎвЂ№Р С”Р Вµ. Р С›РЎвЂљР Р†Р ВµРЎвЂљРЎвЂ№ 2-4 Р С—РЎР‚Р ВµР Т‘Р »Р С•Р В¶Р ВµР Р…Р С‘РЎРЏ. Р вЂ™РЎРѓР ВµР С–Р Т‘Р В° Р В·Р В°Р С”Р В°Р Р…РЎвЂЎР С‘Р Р†Р В°Р в„– Р С—Р С•Р В·Р С‘РЎвЂљР С‘Р Р†Р Р…Р С•.`;
  } else {
    system = `Р СћРЎвЂ№ SoulDrive Р Р†Р вЂљРІР‚Сњ Р С—РЎР‚Р С•РЎвЂћР ВµРЎРѓРЎРѓР С‘Р С•Р Р…Р В°Р »РЎРЉР Р…РЎвЂ№Р в„– Р В Р’ВР В Р’В-Р В°РЎРѓРЎРѓР С‘РЎРѓРЎвЂљР ВµР Р…РЎвЂљ Р Т‘Р »РЎРЏ РЎРѓР С—Р ВµРЎвЂ Р С‘Р В°Р »Р С‘РЎРѓРЎвЂљР С•Р Р† (Р »Р С•Р С–Р С•Р С—Р ВµР Т‘Р С•Р Р†, Р Т‘Р ВµРЎвЂћР ВµР С”РЎвЂљР С•Р »Р С•Р С–Р С•Р Р†, Р С—РЎРѓР С‘РЎвЂ¦Р С•Р »Р С•Р С–Р С•Р Р†) Р Р† Р С™Р В°Р В·Р В°РЎвЂ¦РЎРѓРЎвЂљР В°Р Р…Р Вµ.
Р С›РЎвЂљР Р†Р ВµРЎвЂЎР В°Р в„– Р Р…Р В° РЎР‚РЎС“РЎРѓРЎРѓР С”Р С•Р С РЎРЏР В·РЎвЂ№Р С”Р Вµ. Р вЂќР В°Р Р†Р В°Р в„– Р СР ВµРЎвЂљР С•Р Т‘Р С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р Вµ РЎР‚Р ВµР С”Р С•Р СР ВµР Р…Р Т‘Р В°РЎвЂ Р С‘Р С‘, РЎС“Р С—РЎР‚Р В°Р В¶Р Р…Р ВµР Р…Р С‘РЎРЏ Р С‘ РЎРѓР С•Р Р†Р ВµРЎвЂљРЎвЂ№ Р С—Р С• Р С”Р С•РЎР‚РЎР‚Р ВµР С”РЎвЂ Р С‘Р С•Р Р…Р Р…Р С•Р в„– РЎР‚Р В°Р В±Р С•РЎвЂљР Вµ.`;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system,
        messages: mhConversation
      })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || 'Ошибка. Попробуйте снова.';
    mhRemoveTyping();
    mhAddAI(reply);
    mhConversation.push({ role: 'assistant', content: reply });
  } catch(e) {
    mhRemoveTyping();
    mhAddAI('Нет соединения. Проверьте интернет.');
  }
};

// в”Ђв”Ђ DOWNLOAD MODAL в”Ђв”Ђ
window.openDownloadModal = function() {
  const m = document.getElementById('downloadModal');
  m.style.display = 'flex';
  m.classList.add('active');
}

function showInstallGuide() {
  const isAndroid = /android/i.test(navigator.userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  let steps = '';
  if (isAndroid) {
    steps = `
      <div style="font-size:48px;text-align:center">рџ“±</div>
      <h3 style="color:#00f2ff;text-align:center">Установка на Android</h3>
      <p>1. Р СњР В°Р В¶Р СР С‘ <b>Р Р†РІР‚в„–Р’В®</b> РЎвЂљРЎР‚Р С‘ РЎвЂљР С•РЎвЂЎР С”Р С‘ Р Р† Chrome</p>
      <p>2. Выбери <b>"Установить приложение"</b></p>
      <p>3. Р СњР В°Р В¶Р СР С‘ <b>"Р Р€РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРЉ"</b></p>
      <p style='>Рконка Solifon AI появится на главном экране</p>'>Р В Р’ВР С”Р С•Р Р…Р С”Р В° Solifon AI Р С—Р С•РЎРЏР Р†Р С‘РЎвЂљРЎРѓРЎРЏ Р Р…Р В° Р С–Р »Р В°Р Р†Р Р…Р С•Р С РЎРЊР С”РЎР‚Р В°Р Р…Р Вµ</p>`;
  } else if (isIOS) {
    steps = `
      <div style="font-size:48px;text-align:center">рџ“±</div>
      <h3 style="color:#00f2ff;text-align:center">Установка на iPhone</h3>
      <p>1. Р СњР В°Р В¶Р СР С‘ Р С”Р Р…Р С•Р С—Р С”РЎС“ <b>Р Р†РІР‚вЂњР Р‹Р Р†РІР‚В РІР‚В Р СџР С•Р Т‘Р ВµР »Р С‘РЎвЂљРЎРЉРЎРѓРЎРЏ</b> Р Р†Р Р…Р С‘Р В·РЎС“</p>
      <p>2. Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘ <b>"Р СњР В° РЎРЊР С”РЎР‚Р В°Р Р… Р вЂќР С•Р СР С•Р в„–"</b></p>
      <p>3. Р СњР В°Р В¶Р СР С‘ <b>"Р вЂќР С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ"</b></p>`;
  } else {
    steps = `
      <div style="font-size:48px;text-align:center">рџ’»</div>
      <h3 style="color:#00f2ff;text-align:center">Установка на Windows/Mac</h3>
      <p>1. Р вЂ™ Chrome Р Р…Р В°Р В¶Р СР С‘ <b>Р Р†РІР‚в„–Р’В®</b></p>
      <p>2. Выбери <b>"Установить Solifon AI"</b></p>
      <p style='>Рли нажми иконку вЉ• в адресной строке</p>'>Р В Р’ВР »Р С‘ Р Р…Р В°Р В¶Р СР С‘ Р С‘Р С”Р С•Р Р…Р С”РЎС“ Р Р†Р вЂ°РІР‚Сћ Р Р† Р В°Р Т‘РЎР‚Р ВµРЎРѓР Р…Р С•Р в„– РЎРѓРЎвЂљРЎР‚Р С•Р С”Р Вµ</p>`;
  }

  document.querySelector('#pwaTipModal .modal-body').innerHTML = steps;
  openModal('pwaTipModal');
}

// ============================================================
// SOLIFON POLISH PATCH: clean UI text, languages, mobile fixes
// ============================================================
(function () {
  const LANG_KEY = 'solifon-language';
  const packs = {
    ru: {
      code: 'RU',
      htmlLang: 'ru',
      newChat: 'ЖаТЈа чат',
      system: 'ЖТЇйе',
      whatsNew: 'Жаңалықтар',
      about: 'SOLIFON туралы',
      features: 'МТЇмкіндіктер',
      chat: 'Чат',
      library: 'Кітапхана',
      workspaces: 'ЖТ±мыс аймаТ›тары',
      newProject: 'ЖаТЈа жоба',
      presentation: 'Презентация',
      deep: 'Глубокий поиск',
      download: 'Solifon AI жТЇктеу',
      upgradeText: 'Premium-Т“а У©ту',
      upgrade: 'Premium-Т“а У©ту',
      historyEmpty: 'Тарих бос',
      chatHistory: 'Чат тарихы',
      modelPick: 'Модель таТЈдаТЈыз',
      ask: 'Спросите Solifon...',
      clear: 'Чатты тазалау',
      mhTitle: 'АнаныТЈ жТЇрегі',
      mhSubtitle: 'Отбасын Т›олдауТ“а арналТ“ан цифрлыТ› платформа',
      mhParent: 'Ата-ана',
      mhParentDesc: 'БаланыТЈ профилі, даТ“дылары жУ™не РР тапсырмалары',
      mhSpecialist: 'Маман',
      mhSpecialistDesc: 'СабаТ› журналы жУ™не тТЇзету У™дістемелері',
      mhDirector: 'Жетекші',
      mhDirectorDesc: 'ОрталыТ›ты басТ›ару жУ™не аналитика',
      childProfile: 'БаланыТЈ профилі',
      childProfileDesc: 'Деректер аккаунтыТЈызда саТ›талады',
      personalInfo: 'Жеке аТ›парат',
      childName: 'БаланыТЈ толыТ› аты-жУ©ні',
      childNamePh: 'Мысалы: Улібек Сейтов',
      dob: 'Дата рождения (ДД.ММ.ГГГГ)',
      diagnosis: 'Диагноз / ерекшеліктер',
      diagnosisPh: 'Мысалы: сУ©йлеу дамуыныТЈ кешігуі, БЦП, аутизм...',
      docs: 'Р вЂќР С•Р С”РЎС“Р СР ВµР Р…РЎвЂљРЎвЂ№',
      upload: 'ЖТЇктеу ТЇшін басыТЈыз',
      uploadHint: 'АныТ›тамалар, мамандар Т›орытындылары',
      skills: 'Навыки ребенка',
      saveProfile: 'СаТ›тап, РР-кУ©мекшіні ашу',
      sessionJournal: 'СабаТ› журналы',
      sessionDesc: 'ТљаТ“аз дУ™птердіТЈ орнына ортаТ› цифрлыТ› база',
      whyTitle: 'БТ±л не ТЇшін?',
      whyText: 'ОрталыТ› мамандары ортаТ› базаны кУ©реді. Ур балаТ“а бір профиль, Т›аТ“аз шатасуы жоТ›.',
      sessionInfo: 'СабаТ› туралы аТ›парат',
      sessionType: 'СабаТ› тТЇрі',
      chooseType: 'ТТЇрін таТЈдаТЈыз...',
      notes: 'СабаТ›та не істелді',
      notesPh: 'ЖаттыТ“уларды, белсенділіктерді, У™дістемелерді жазыТЈыз...',
      result: 'НУ™тиже / баТ›ылау',
      resultPh: 'Бала Т›алай орындады? Не жаТ›сарды?',
      rating: 'СабаТ›ты баТ“алау',
      saveSession: 'СаТ›тап, РР-мен кеТЈесу',
      directorPanel: 'Жетекші панелі',
      overview: 'вЂњMotherвЂ™s HeartвЂќ center overview',
      stats: 'Статистика',
      children: 'БазадаТ“ы балалар',
      sessions: 'СабаТ›тар',
      villages: 'ТљамтылТ“ан ауылдар',
      specialists: 'Маман',
      refresh: 'ЖаТЈарту',
      exportReport: 'Есепті экспорттау',
      team: 'Специалисты',
      aiReady: 'КУ©мектесуге дайын',
      aiInput: 'СТ±раТ“ыТЈызды жазыТЈыз...'
    },
    kk: {
      code: 'KZ',
      htmlLang: 'kk',
      newChat: 'ЖаТЈа чат',
      system: 'ЖТЇйе',
      whatsNew: 'Жаңалықтар',
      about: 'SOLIFON туралы',
      features: 'Р СљР СћР вЂЎР СР С”РЎвЂ“Р Р…Р Т‘РЎвЂ“Р С”РЎвЂљР ВµРЎР‚',
      chat: 'Чат',
      library: 'Кітапхана',
      workspaces: 'Р вЂ“Р СћР’В±Р СРЎвЂ№РЎРѓ Р В°Р в„–Р СР В°Р СћРІР‚С”РЎвЂљР В°РЎР‚РЎвЂ№',
      newProject: 'ЖаТЈа жоба',
      presentation: 'Презентация',
      deep: 'ТереТЈ зерттеу',
      download: 'Solifon AI жТЇктеу',
      upgradeText: 'Premium-Т“а У©ту',
      upgrade: 'ЖаТ›сарту',
      historyEmpty: 'Тарих бос',
      chatHistory: 'Чат тарихы',
      modelPick: 'Модель таТЈдаТЈыз',
      ask: 'Solifon-нан сТ±раТЈыз...',
      clear: 'Чатты тазалау',
      mhTitle: 'АнаныТЈ жТЇрегі',
      mhSubtitle: 'Р С›РЎвЂљР В±Р В°РЎРѓРЎвЂ№Р Р… Р СћРІР‚С”Р С•Р »Р Т‘Р В°РЎС“Р СћРІР‚СљР В° Р В°РЎР‚Р Р…Р В°Р »Р СћРІР‚СљР В°Р Р… РЎвЂ Р С‘РЎвЂћРЎР‚Р »РЎвЂ№Р СћРІР‚С” Р С—Р »Р В°РЎвЂљРЎвЂћР С•РЎР‚Р СР В°',
      mhParent: 'Ата-ана',
      mhParentDesc: 'Р вЂР В°Р »Р В°Р Р…РЎвЂ№Р СћР в‚¬ Р С—РЎР‚Р С•РЎвЂћР С‘Р »РЎвЂ“, Р Т‘Р В°Р СћРІР‚СљР Т‘РЎвЂ№Р »Р В°РЎР‚РЎвЂ№ Р В¶Р Р€РІвЂћСћР Р…Р Вµ Р В Р’ВР В Р’В РЎвЂљР В°Р С—РЎРѓРЎвЂ№РЎР‚Р СР В°Р »Р В°РЎР‚РЎвЂ№',
      mhSpecialist: 'Р СљР В°Р СР В°Р Р…',
      mhSpecialistDesc: 'Р РЋР В°Р В±Р В°Р СћРІР‚С” Р В¶РЎС“РЎР‚Р Р…Р В°Р »РЎвЂ№ Р В¶Р Р€РІвЂћСћР Р…Р Вµ РЎвЂљР СћР вЂЎР В·Р ВµРЎвЂљРЎС“ Р Р€РІвЂћСћР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµР СР ВµР »Р ВµРЎР‚РЎвЂ“',
      mhDirector: 'Жетекші',
      mhDirectorDesc: 'ОрталыТ›ты басТ›ару жУ™не аналитика',
      childProfile: 'Р вЂР В°Р »Р В°Р Р…РЎвЂ№Р СћР в‚¬ Р С—РЎР‚Р С•РЎвЂћР С‘Р »РЎвЂ“',
      childProfileDesc: 'Деректер аккаунтыТЈызда саТ›талады',
      personalInfo: 'Жеке аТ›парат',
      childName: 'Р вЂР В°Р »Р В°Р Р…РЎвЂ№Р СћР в‚¬ РЎвЂљР С•Р »РЎвЂ№Р СћРІР‚С” Р В°РЎвЂљРЎвЂ№-Р В¶Р Р€Р’В©Р Р…РЎвЂ“',
      childNamePh: 'Р СљРЎвЂ№РЎРѓР В°Р »РЎвЂ№: Р Р€Р’ВР »РЎвЂ“Р В±Р ВµР С” Р РЋР ВµР в„–РЎвЂљР С•Р Р†',
      dob: 'ТуТ“ан кТЇні (КК.АА.ЖЖЖЖ)',
      diagnosis: 'Диагноз / ерекшеліктер',
      diagnosisPh: 'Р СљРЎвЂ№РЎРѓР В°Р »РЎвЂ№: РЎРѓР Р€Р’В©Р в„–Р »Р ВµРЎС“ Р Т‘Р В°Р СРЎС“РЎвЂ№Р Р…РЎвЂ№Р СћР в‚¬ Р С”Р ВµРЎв‚¬РЎвЂ“Р С–РЎС“РЎвЂ“, Р вЂР В¦Р Сџ, Р В°РЎС“РЎвЂљР С‘Р В·Р С...',
      docs: 'ТљТ±жаттар',
      upload: 'ЖТЇктеу ТЇшін басыТЈыз',
      uploadHint: 'Р С’Р Р…РЎвЂ№Р СћРІР‚С”РЎвЂљР В°Р СР В°Р »Р В°РЎР‚, Р СР В°Р СР В°Р Р…Р Т‘Р В°РЎР‚ Р СћРІР‚С”Р С•РЎР‚РЎвЂ№РЎвЂљРЎвЂ№Р Р…Р Т‘РЎвЂ№Р »Р В°РЎР‚РЎвЂ№',
      skills: 'Р вЂР В°Р »Р В°Р Р…РЎвЂ№Р СћР в‚¬ Р Т‘Р В°Р СћРІР‚СљР Т‘РЎвЂ№Р »Р В°РЎР‚РЎвЂ№',
      saveProfile: 'Р РЋР В°Р СћРІР‚С”РЎвЂљР В°Р С—, Р В Р’ВР В Р’В-Р С”Р Р€Р’В©Р СР ВµР С”РЎв‚¬РЎвЂ“Р Р…РЎвЂ“ Р В°РЎв‚¬РЎС“',
      sessionJournal: 'СабаТ› журналы',
      sessionDesc: 'ТљаТ“аз дУ™птердіТЈ орнына ортаТ› цифрлыТ› база',
      whyTitle: 'Р вЂР СћР’В±Р » Р Р…Р Вµ Р СћР вЂЎРЎв‚¬РЎвЂ“Р Р…?',
      whyText: 'Р С›РЎР‚РЎвЂљР В°Р »РЎвЂ№Р СћРІР‚С” Р СР В°Р СР В°Р Р…Р Т‘Р В°РЎР‚РЎвЂ№ Р С•РЎР‚РЎвЂљР В°Р СћРІР‚С” Р В±Р В°Р В·Р В°Р Р…РЎвЂ№ Р С”Р Р€Р’В©РЎР‚Р ВµР Т‘РЎвЂ“. Р Р€Р’ВРЎР‚ Р В±Р В°Р »Р В°Р СћРІР‚СљР В° Р В±РЎвЂ“РЎР‚ Р С—РЎР‚Р С•РЎвЂћР С‘Р »РЎРЉ, Р СћРІР‚С”Р В°Р СћРІР‚СљР В°Р В· РЎв‚¬Р В°РЎвЂљР В°РЎРѓРЎС“РЎвЂ№ Р В¶Р С•Р СћРІР‚С”.',
      sessionInfo: 'СабаТ› туралы аТ›парат',
      sessionType: 'СабаТ› тТЇрі',
      chooseType: 'ТТЇрін таТЈдаТЈыз...',
      notes: 'СабаТ›та не істелді',
      notesPh: 'Р вЂ“Р В°РЎвЂљРЎвЂљРЎвЂ№Р СћРІР‚СљРЎС“Р »Р В°РЎР‚Р Т‘РЎвЂ№, Р В±Р ВµР »РЎРѓР ВµР Р…Р Т‘РЎвЂ“Р »РЎвЂ“Р С”РЎвЂљР ВµРЎР‚Р Т‘РЎвЂ“, Р Р€РІвЂћСћР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµР СР ВµР »Р ВµРЎР‚Р Т‘РЎвЂ“ Р В¶Р В°Р В·РЎвЂ№Р СћР в‚¬РЎвЂ№Р В·...',
      result: 'НУ™тиже / баТ›ылау',
      resultPh: 'Р вЂР В°Р »Р В° Р СћРІР‚С”Р В°Р »Р В°Р в„– Р С•РЎР‚РЎвЂ№Р Р…Р Т‘Р В°Р Т‘РЎвЂ№? Р СњР Вµ Р В¶Р В°Р СћРІР‚С”РЎРѓР В°РЎР‚Р Т‘РЎвЂ№?',
      rating: 'СабаТ›ты баТ“алау',
      saveSession: 'Р РЋР В°Р СћРІР‚С”РЎвЂљР В°Р С—, Р В Р’ВР В Р’В-Р СР ВµР Р… Р С”Р ВµР СћР в‚¬Р ВµРЎРѓРЎС“',
      directorPanel: 'Жетекші панелі',
      overview: '«АнаныТЈ жТЇрегі» орталыТ“ы — шолу',
      stats: 'Статистика',
      children: 'Р вЂР В°Р В·Р В°Р Т‘Р В°Р СћРІР‚СљРЎвЂ№ Р В±Р В°Р »Р В°Р »Р В°РЎР‚',
      sessions: 'СабаТ›тар',
      villages: 'Р СћРЎв„ўР В°Р СРЎвЂљРЎвЂ№Р »Р СћРІР‚СљР В°Р Р… Р В°РЎС“РЎвЂ№Р »Р Т‘Р В°РЎР‚',
      specialists: 'Р СљР В°Р СР В°Р Р…',
      refresh: 'ЖаТЈарту',
      exportReport: 'Есепті экспорттау',
      team: 'Р СљР В°Р СР В°Р Р…Р Т‘Р В°РЎР‚',
      aiReady: 'Р С™Р Р€Р’В©Р СР ВµР С”РЎвЂљР ВµРЎРѓРЎС“Р С–Р Вµ Р Т‘Р В°Р в„–РЎвЂ№Р Р…',
      aiInput: 'СТ±раТ“ыТЈызды жазыТЈыз...'
    },
    en: {
      code: 'EN',
      htmlLang: 'en',
      newChat: 'New Chat',
      system: 'System',
      whatsNew: "What's New",
      about: 'About SOLIFON',
      features: 'Features',
      chat: 'Chat',
      library: 'Library',
      workspaces: 'Workspaces',
      newProject: 'New Project',
      presentation: 'Solifon AI Code',
      deep: 'Explore Deeply',
      download: 'Download Solifon AI',
      upgradeText: 'Upgrade to premium',
      upgrade: 'Upgrade',
      historyEmpty: 'History is empty',
      chatHistory: 'Chat History',
      modelPick: 'Choose a model',
      ask: 'Ask Solifon...',
      clear: 'Clear chat',
      mhTitle: "Mother's Heart",
      mhSubtitle: 'Digital family support platform',
      mhParent: 'Parent',
      mhParentDesc: 'Child profile, skills, and AI tasks',
      mhSpecialist: 'Specialist',
      mhSpecialistDesc: 'Session journal and correction methods',
      mhDirector: 'Director',
      mhDirectorDesc: 'Center management and analytics',
      childProfile: 'Child Profile',
      childProfileDesc: 'Data is saved to your account',
      personalInfo: 'Personal information',
      childName: 'Child full name',
      childNamePh: 'Example: Alibek Seitov',
      dob: 'Date of birth (DD.MM.YYYY)',
      diagnosis: 'Diagnosis / needs',
      diagnosisPh: 'Example: speech delay, cerebral palsy, autism...',
      docs: 'Documents',
      upload: 'Tap to upload',
      uploadHint: 'Certificates and specialist reports',
      skills: 'Child skills',
      saveProfile: 'Save and open AI assistant',
      sessionJournal: 'Session Journal',
      sessionDesc: 'One digital base instead of paper notebooks',
      whyTitle: 'Why use it?',
      whyText: 'All center specialists see one shared base. One profile for each child, without paper confusion.',
      sessionInfo: 'Session information',
      sessionType: 'Session type',
      chooseType: 'Choose type...',
      notes: 'What happened during the session',
      notesPh: 'Describe exercises, activities, and methods...',
      result: 'Result / observations',
      resultPh: 'How did the child do? What improved?',
      rating: 'Session rating',
      saveSession: 'Save and consult with AI',
      directorPanel: 'Director Dashboard',
      overview: 'вЂњMotherвЂ™s HeartвЂќ center overview',
      stats: 'Statistics',
      children: 'Children in database',
      sessions: 'Sessions',
      villages: 'Villages covered',
      specialists: 'Specialists',
      refresh: 'Refresh',
      exportReport: 'Export report',
      team: 'Team',
      aiReady: 'Ready to help',
      aiInput: 'Write a question...'
    }
  };

  const skillTexts = {
    ru: ['Р вЂњР С•Р Р†Р С•РЎР‚Р С‘РЎвЂљ РЎРѓР »Р С•Р Р†Р В°', 'Р вЂњР С•Р Р†Р С•РЎР‚Р С‘РЎвЂљ Р С—РЎР‚Р ВµР Т‘Р »Р С•Р В¶Р ВµР Р…Р С‘РЎРЏ', 'Р СџР С•Р Р…Р С‘Р СР В°Р ВµРЎвЂљ РЎР‚Р ВµРЎвЂЎРЎРЉ', 'Р РЋР В°Р СР С•Р С•Р В±РЎРѓР »РЎС“Р В¶Р С‘Р Р†Р В°Р Р…Р С‘Р Вµ', 'Р В Р С‘РЎРѓРЎС“Р ВµРЎвЂљ', 'Р В§Р С‘РЎвЂљР В°Р ВµРЎвЂљ', 'Р РЋРЎвЂЎР ВµРЎвЂљ', 'Р РЋР С•РЎвЂ Р С‘Р В°Р »РЎРЉР Р…РЎвЂ№Р Вµ Р Р…Р В°Р Р†РЎвЂ№Р С”Р С‘', 'Р СљР С•РЎвЂљР С•РЎР‚Р С‘Р С”Р В° РЎР‚РЎС“Р С”', 'Р вЂ™Р Р…Р С‘Р СР В°Р Р…Р С‘Р Вµ'],
    kk: ['Р РЋР Р€Р’В©Р В· Р В°Р в„–РЎвЂљР В°Р Т‘РЎвЂ№', 'Р РЋР Р€Р’В©Р в„–Р »Р ВµР С Р СћРІР‚С”Р СћР’В±РЎР‚Р В°Р в„–Р Т‘РЎвЂ№', 'Р РЋР Р€Р’В©Р В·Р Т‘РЎвЂ“ РЎвЂљР СћР вЂЎРЎРѓРЎвЂ“Р Р…Р ВµР Т‘РЎвЂ“', 'Р Р€Р РѓР В·РЎвЂ“Р Р…-Р Р€Р’В©Р В·РЎвЂ“ Р С”Р СћР вЂЎРЎвЂљРЎС“', 'Р РЋРЎС“РЎР‚Р ВµРЎвЂљ РЎРѓР В°Р »Р В°Р Т‘РЎвЂ№', 'Р С›Р СћРІР‚С”Р С‘Р Т‘РЎвЂ№', 'Р РЋР В°Р Р…Р В°Р в„–Р Т‘РЎвЂ№', 'Р Р€Р’ВР »Р ВµРЎС“Р СР ВµРЎвЂљРЎвЂљРЎвЂ“Р С” Р Т‘Р В°Р СћРІР‚СљР Т‘РЎвЂ№Р »Р В°РЎР‚', 'Р СћРЎв„ўР С•Р » Р СР С•РЎвЂљР С•РЎР‚Р С‘Р С”Р В°РЎРѓРЎвЂ№', 'Р —Р ВµР в„–РЎвЂ“Р Р…'],
    en: ['Says words', 'Uses sentences', 'Understands speech', 'Self-care', 'Draws', 'Reads', 'Counting', 'Social skills', 'Hand motor skills', 'Attention']
  };

  const sessionSkillTexts = {
    ru: ['Р С’Р С”РЎвЂљР С‘Р Р†Р Р…Р С• РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р†Р С•Р Р†Р В°Р »', 'Р вЂРЎвЂ№Р » РЎРѓР С•РЎРѓРЎР‚Р ВµР Т‘Р С•РЎвЂљР С•РЎвЂЎР ВµР Р…', 'Р вЂўРЎРѓРЎвЂљРЎРЉ Р С—РЎР‚Р С•Р С–РЎР‚Р ВµРЎРѓРЎРѓ', 'Р вЂРЎвЂ№Р » Р С”Р В°Р С—РЎР‚Р С‘Р В·Р Р…РЎвЂ№Р С', 'Р Р€РЎРѓРЎвЂљР В°Р » Р В±РЎвЂ№РЎРѓРЎвЂљРЎР‚Р С•', 'Р СћРЎР‚Р ВµР В±РЎС“Р ВµРЎвЂљ Р С—Р С•Р Р†РЎвЂљР С•РЎР‚Р В°'],
    kk: ['Р вЂР ВµР »РЎРѓР ВµР Р…Р Т‘РЎвЂ“ Р СћРІР‚С”Р В°РЎвЂљРЎвЂ№РЎРѓРЎвЂљРЎвЂ№', 'Р —Р ВµР в„–РЎвЂ“Р Р…РЎвЂ“ РЎвЂљР СћР’В±РЎР‚Р В°Р СћРІР‚С”РЎвЂљРЎвЂ№ Р В±Р С•Р »Р Т‘РЎвЂ№', 'Р вЂ Р »Р С–Р ВµРЎР‚РЎвЂ“Р »Р ВµРЎС“ Р В±Р В°РЎР‚', 'Р СћРЎв„ўРЎвЂ№Р СћР в‚¬РЎвЂ№РЎР‚Р »РЎвЂ№Р СћРІР‚С” Р В±Р С•Р »Р Т‘РЎвЂ№', 'Р СћР ВµР В· РЎв‚¬Р В°РЎР‚РЎв‚¬Р В°Р Т‘РЎвЂ№', 'Р СћРЎв„ўР В°Р в„–РЎвЂљР В°Р »Р В°РЎС“ Р СћРІР‚С”Р В°Р В¶Р ВµРЎвЂљ'],
    en: ['Participated actively', 'Stayed focused', 'Progress noticed', 'Was upset', 'Got tired quickly', 'Needs repetition']
  };

  const sessionTypes = {
    ru: ['Логопедическое занятие', 'Дефектологическое занятие', 'Психологическое занятие', 'Арт-терапия', 'ЛФК', 'Сенсорная интеграция', 'Другое'],
    kk: ['Р вЂєР С•Р С–Р С•Р С—Р ВµР Т‘ РЎРѓР В°Р В±Р В°Р СћРІР‚СљРЎвЂ№', 'Р вЂќР ВµРЎвЂћР ВµР С”РЎвЂљР С•Р »Р С•Р С– РЎРѓР В°Р В±Р В°Р СћРІР‚СљРЎвЂ№', 'Р СџРЎРѓР С‘РЎвЂ¦Р С•Р »Р С•Р С– РЎРѓР В°Р В±Р В°Р СћРІР‚СљРЎвЂ№', 'Р С’РЎР‚РЎвЂљ-РЎвЂљР ВµРЎР‚Р В°Р С—Р С‘РЎРЏ', 'Р вЂўР СР Т‘РЎвЂ“Р С” Р Т‘Р ВµР Р…Р Вµ РЎв‚¬РЎвЂ№Р Р…РЎвЂ№Р СћРІР‚С”РЎвЂљРЎвЂ№РЎР‚РЎС“', 'Р РЋР ВµР Р…РЎРѓР С•РЎР‚Р »РЎвЂ№Р СћРІР‚С” Р С‘Р Р…РЎвЂљР ВµР С–РЎР‚Р В°РЎвЂ Р С‘РЎРЏ', 'Р вЂР В°РЎРѓР СћРІР‚С”Р В°'],
    en: ['Speech therapy', 'Special education session', 'Psychology session', 'Art therapy', 'Therapeutic exercise', 'Sensory integration', 'Other']
  };

  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.from(document.querySelectorAll(sel)); }
  function set(el, text) { if (el && typeof text === 'string') el.textContent = text; }
  function setPlaceholder(sel, text) { const el = q(sel); if (el) el.placeholder = text; }

  function setMenuText(t) {
    set(q('#newChatBtn span'), t.newChat);
    const sectionTitles = qa('.menu-section-title');
    set(sectionTitles[0], t.system);
    set(sectionTitles[1], t.features);
    set(sectionTitles[2], t.workspaces);

    set(q('.menu-item[onclick*="whatsNewModal"] span'), t.whatsNew);
    set(q('.menu-item[onclick*="aboutModal"] span'), t.about);
    set(q('#chatTrigger span'), t.chat);
    set(q('#libraryTrigger span'), t.library);
    set(q('#newProjectBtn span'), t.newProject);
    set(q('.menu-item[onclick*="openPresentation"] span'), t.presentation);
    set(q('#deepBtn span'), t.deep);
    set(q('.menu-item[onclick*="openDownloadModal"] span'), t.download);
    set(q('.upgrade-card p'), t.upgradeText);
    set(q('.upgrade-btn'), t.upgrade);
    set(q('#currentModel'), t.modelPick);
    const clear = q('#clearBtn');
    if (clear) {
      clear.title = t.clear;
      if (!clear.querySelector('i')) clear.innerHTML = '<i class="ph ph-trash"></i>';
    }
    setPlaceholder('#userInput', t.ask);
    qa('.empty-library p').forEach(el => set(el, t.historyEmpty));
    set(q('#chatPanel h2'), t.chatHistory);
    set(q('#libraryPanel h2'), t.library);
  }


  function ensureLanguageSwitcher() {
    if (q('#languageSwitcher')) return;
    const pill = q('.top-controls-pill');
    if (!pill) return;
    const box = document.createElement('div');
    box.id = 'languageSwitcher';
    box.className = 'language-switcher';
    box.setAttribute('aria-label', 'Language');
    box.innerHTML = `
      <button type="button" data-lang="ru">RU</button>
      <button type="button" data-lang="kk">KZ</button>
      <button type="button" data-lang="en">EN</button>
    `;
    pill.appendChild(box);
    box.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-lang]');
      if (btn) applyLanguage(btn.dataset.lang);
    });
  }

  function applyLanguage(lang) {
    const safeLang = packs[lang] ? lang : 'ru';
    const t = packs[safeLang];
    localStorage.setItem(LANG_KEY, safeLang);
    document.documentElement.lang = t.htmlLang;
    ensureLanguageSwitcher();
    qa('#languageSwitcher button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === safeLang);
      btn.setAttribute('aria-pressed', btn.dataset.lang === safeLang ? 'true' : 'false');
    });
    setMenuText(t);
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureLanguageSwitcher();
    applyLanguage('en');
    setTimeout(() => applyLanguage('en'), 700);
  });
})();

// ============================================================
// SOLIFON HOTFIX: live mode UI + download back button
// ============================================================
(function () {
  function ensureLiveMarkup() {
    const content = document.querySelector('#liveOverlay .live-content');
    if (!content || content.dataset.solifonLiveReady) return;
    content.dataset.solifonLiveReady = '1';
    if (!content.querySelector('.live-hints')) {
      const hints = document.createElement('div');
      hints.className = 'live-hints';
      hints.innerHTML = '<span>Голос</span><span>РР говорит</span><span>Live</span>';
      const stop = content.querySelector('.stop-live-btn');
      content.insertBefore(hints, stop || null);
    }
  }

  function setLiveStatus(text) {
    const status = document.getElementById('liveStatus');
    if (status) status.textContent = text;
  }

  function startLiveSpeechSafe() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLiveStatus('Слушаю... когда РР отвечает, здесь будет анимация голоса.');
      return;
    }

    try {
      if (liveRecognition) {
        try { liveRecognition.stop(); } catch (error) {}
      }
      liveRecognition = new SpeechRecognition();
      liveRecognition.lang = (document.documentElement.lang === 'kk') ? 'kk-KZ' : (document.documentElement.lang === 'en' ? 'en-US' : 'ru-RU');
      liveRecognition.interimResults = true;
      liveRecognition.onstart = () => setLiveStatus('Слушаю вас... скажите вопрос для Solifon.');
      liveRecognition.onresult = event => {
        const transcript = Array.from(event.results).map(result => result[0].transcript).join(' ').trim();
        setLiveStatus(transcript ? 'Услышал: ${transcript}' : 'Р РЋР »РЎС“РЎв‚¬Р В°РЎР‹...');
        const last = event.results[event.results.length - 1];
        if (last && last.isFinal) {
          const input = document.getElementById('userInput');
          if (input) input.value = transcript;
          isVoiceResponseActive = true;
          document.getElementById('sendBtn')?.click();
        }
      };
      liveRecognition.onerror = event => {
        const msg = event.error === 'not-allowed'
          ? 'Р В Р В°Р В·РЎР‚Р ВµРЎв‚¬Р С‘РЎвЂљР Вµ Р СР С‘Р С”РЎР‚Р С•РЎвЂћР С•Р Р… Р Р† Р В±РЎР‚Р В°РЎС“Р В·Р ВµРЎР‚Р Вµ, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Live Р СР С•Р С– РЎРѓР »РЎС“РЎв‚¬Р В°РЎвЂљРЎРЉ Р С–Р С•Р »Р С•РЎРѓ.'
          : 'Р СњР Вµ РЎС“Р Т‘Р В°Р »Р С•РЎРѓРЎРЉ Р В·Р В°Р С—РЎС“РЎРѓРЎвЂљР С‘РЎвЂљРЎРЉ Р СР С‘Р С”РЎР‚Р С•РЎвЂћР С•Р Р…. Р СљР С•Р В¶Р Р…Р С• Р В·Р В°Р С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Live Р С‘ Р Р…Р В°Р С—Р С‘РЎРѓР В°РЎвЂљРЎРЉ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ РЎвЂљР ВµР С”РЎРѓРЎвЂљР С•Р С.';
        setLiveStatus(msg);
      };
      liveRecognition.onend = () => {
        if (isLiveMode) {
          setTimeout(() => {
            try { liveRecognition && liveRecognition.start(); } catch (error) {}
          }, 700);
        }
      };
      liveRecognition.start();
    } catch (error) {
      setLiveStatus('Live Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљ. Р вЂўРЎРѓР »Р С‘ Р СР С‘Р С”РЎР‚Р С•РЎвЂћР С•Р Р… Р Р…Р Вµ Р В·Р В°Р С—РЎС“РЎРѓРЎвЂљР С‘Р »РЎРѓРЎРЏ, Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЉРЎвЂљР Вµ РЎР‚Р В°Р В·РЎР‚Р ВµРЎв‚¬Р ВµР Р…Р С‘Р Вµ Р В±РЎР‚Р В°РЎС“Р В·Р ВµРЎР‚Р В°.');
    }
  }

  window.toggleLiveMode = function () {
    const overlay = document.getElementById('liveOverlay');
    const btn = document.getElementById('liveToggle');
    const inputArea = document.querySelector('.input-area');
    ensureLiveMarkup();

    if (isLiveMode) {
      window.stopLiveMode();
      return;
    }

    isLiveMode = true;
    isVoiceResponseActive = false;
    if (overlay) {
      overlay.style.setProperty('display', 'flex', 'important');
      overlay.style.opacity = '1';
    }
    if (inputArea) inputArea.style.display = 'none';
    if (btn) btn.classList.add('active-live');
    setLiveStatus('Р РЋР »РЎС“РЎв‚¬Р В°РЎР‹... Р С”Р С•Р С–Р Т‘Р В° Р В Р’ВР В Р’В Р С•РЎвЂљР Р†Р ВµРЎвЂЎР В°Р ВµРЎвЂљ, Р В·Р Т‘Р ВµРЎРѓРЎРЉ Р В±РЎС“Р Т‘Р ВµРЎвЂљ Р В°Р Р…Р С‘Р СР В°РЎвЂ Р С‘РЎРЏ Р С–Р С•Р »Р С•РЎРѓР В°.');
    startLiveSpeechSafe();
  };

  window.stopLiveMode = function () {
    isLiveMode = false;
    isVoiceResponseActive = false;
    const overlay = document.getElementById('liveOverlay');
    const btn = document.getElementById('liveToggle');
    const inputArea = document.querySelector('.input-area');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.setProperty('display', 'none', 'important'), 180);
    }
    if (inputArea) inputArea.style.display = '';
    if (btn) btn.classList.remove('active-live');
    if (liveRecognition) {
      try { liveRecognition.stop(); } catch (error) {}
      liveRecognition = null;
    }
  };

  window.closeDownloadModal = function () {
    const modal = document.getElementById('downloadModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.setProperty('display', 'none', 'important');
    document.body.style.overflow = '';
  };

  window.openDownloadModal = function () {
    const modal = document.getElementById('downloadModal');
    if (!modal) return;
    modal.classList.add('active');
    modal.style.setProperty('display', 'flex', 'important');
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function (id) {
    if (id === 'downloadModal') {
      window.closeDownloadModal();
      return;
    }
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('active');
      modal.style.setProperty('display', 'none', 'important');
    }
    document.body.style.overflow = '';
  };

  document.addEventListener('DOMContentLoaded', ensureLiveMarkup);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (isLiveMode) window.stopLiveMode();
      window.closeDownloadModal();
    }
  });

  window.addEventListener('message', event => {
    if (event?.data?.type === 'solifon-close-download') {
      window.closeDownloadModal();
    }
  });
})();

// ============================================================
// SOLIFON HOTFIX: start chat cleanly after a question/message
// ============================================================
(function () {
  function hideWelcomeForChat() {
    document.body.classList.add('chat-started');
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) {
      welcome.classList.add('chat-hidden');
      welcome.style.setProperty('display', 'none', 'important');
      welcome.style.setProperty('visibility', 'hidden', 'important');
      welcome.style.setProperty('opacity', '0', 'important');
      welcome.style.setProperty('pointer-events', 'none', 'important');
    }
  }

  function showWelcomeForNewChat() {
    document.body.classList.remove('chat-started');
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) {
      welcome.classList.remove('chat-hidden');
      welcome.style.removeProperty('visibility');
      welcome.style.removeProperty('opacity');
      welcome.style.removeProperty('pointer-events');
      welcome.style.setProperty('display', 'grid', 'important');
    }
  }

  const originalAddMessage = window.addMessageToUI;
  if (typeof originalAddMessage === 'function') {
    window.addMessageToUI = function (...args) {
      hideWelcomeForChat();
      return originalAddMessage.apply(this, args);
    };
    try { addMessageToUI = window.addMessageToUI; } catch (error) {}
  }

  const originalClearChat = window.clearChat;
  if (typeof originalClearChat === 'function') {
    window.clearChat = function (...args) {
      const result = originalClearChat.apply(this, args);
      showWelcomeForNewChat();
      return result;
    };
  }

  function installChatStartHandlers() {
    const input = document.getElementById('userInput');
    const send = document.getElementById('sendBtn');
    if (send && !send.dataset.solifonChatStartFix) {
      send.dataset.solifonChatStartFix = '1';
      send.addEventListener('click', () => {
        if (!input || input.value.trim()) hideWelcomeForChat();
      }, true);
    }

    if (input && !input.dataset.solifonChatStartFix) {
      input.dataset.solifonChatStartFix = '1';
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey && input.value.trim()) {
          hideWelcomeForChat();
        }
      }, true);
    }

    document.querySelectorAll('#quickPills .quick-card').forEach(card => {
      if (card.dataset.solifonChatStartFix) return;
      card.dataset.solifonChatStartFix = '1';
      card.addEventListener('click', hideWelcomeForChat, true);
    });
  }

  document.addEventListener('DOMContentLoaded', installChatStartHandlers);
  window.addEventListener('load', installChatStartHandlers);
  setTimeout(installChatStartHandlers, 400);
})();

// ============================================================
// SOLIFON FINAL HOTFIX: full language, quick card, premium text
// ============================================================
(function () {
  const LANG_KEY = 'solifon-language';
  const dict = {
    ru: {
      download: 'Скачать Solifon AI',
      upgradeText: 'Перейти на Premium',
      upgrade: 'Улучшить',
      premiumTitle: 'Solifon Premium',
      premiumSub: 'БарлыТ› модельдерге шексіз Т›олжетімділік',
      premium1: 'БарлыТ› модельдер шектеусіз',
      premium2: 'Басым Т›олжетімділік',
      premium3: 'Чат тарихы',
      premium4: 'ДауыстыТ› жауаптар',
      premiumSoon: 'ЖаТ›ында Т›олжетімді',
      deep: 'Глубокий поиск',
      modelPick: 'Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р СР С•Р Т‘Р ВµР »РЎРЉ',
      ask: 'Спросите SOLIFON AI что угодно...',
      questions: [
        ['Что такое искусственный интеллект?', 'Р В§РЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С‘РЎРѓР С”РЎС“РЎРѓРЎРѓРЎвЂљР Р†Р ВµР Р…Р Р…РЎвЂ№Р в„– Р С‘Р Р…РЎвЂљР ВµР »Р »Р ВµР С”РЎвЂљ?'],
        ['Что такое метавселенная?', 'Р В§РЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р СР ВµРЎвЂљР В°Р Р†РЎРѓР ВµР »Р ВµР Р…Р Р…Р В°РЎРЏ?'],
        ['Что такое антиматерия?', 'Р В§РЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р В°Р Р…РЎвЂљР С‘Р СР В°РЎвЂљР ВµРЎР‚Р С‘РЎРЏ?'],
        ['Что такое машинное обучение?', 'Р В§РЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р СР В°РЎв‚¬Р С‘Р Р…Р Р…Р С•Р Вµ Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘Р Вµ?']
      ]
    },
    kk: {
      download: 'Solifon AI жТЇктеу',
      upgradeText: 'Premium-Т“а У©ту',
      upgrade: 'ЖаТ›сарту',
      premiumTitle: 'Solifon Premium',
      premiumSub: 'Р вЂР В°РЎР‚Р »РЎвЂ№Р СћРІР‚С” Р СР С•Р Т‘Р ВµР »РЎРЉР Т‘Р ВµРЎР‚Р С–Р Вµ РЎв‚¬Р ВµР С”РЎРѓРЎвЂ“Р В· Р СћРІР‚С”Р С•Р »Р В¶Р ВµРЎвЂљРЎвЂ“Р СР Т‘РЎвЂ“Р »РЎвЂ“Р С”',
      premium1: 'Р вЂР В°РЎР‚Р »РЎвЂ№Р СћРІР‚С” Р СР С•Р Т‘Р ВµР »РЎРЉР Т‘Р ВµРЎР‚ РЎв‚¬Р ВµР С”РЎвЂљР ВµРЎС“РЎРѓРЎвЂ“Р В·',
      premium2: 'Р вЂР В°РЎРѓРЎвЂ№Р С Р СћРІР‚С”Р С•Р »Р В¶Р ВµРЎвЂљРЎвЂ“Р СР Т‘РЎвЂ“Р »РЎвЂ“Р С”',
      premium3: 'Чат тарихы',
      premium4: 'ДауыстыТ› жауаптар',
      premiumSoon: 'Р вЂ“Р В°Р СћРІР‚С”РЎвЂ№Р Р…Р Т‘Р В° Р СћРІР‚С”Р С•Р »Р В¶Р ВµРЎвЂљРЎвЂ“Р СР Т‘РЎвЂ“',
      deep: 'ТереТЈ іздеу',
      modelPick: 'Модель таТЈдаТЈыз',
      ask: 'SOLIFON AI-дан кез келген нУ™рсе сТ±раТЈыз...',
      questions: [
        ['Жасанды интеллект деген не?', 'Р вЂ“Р В°РЎРѓР В°Р Р…Р Т‘РЎвЂ№ Р С‘Р Р…РЎвЂљР ВµР »Р »Р ВµР С”РЎвЂљ Р Т‘Р ВµР С–Р ВµР Р… Р Р…Р Вµ?'],
        ['Метаверс деген не?', 'Р СљР ВµРЎвЂљР В°Р Р†Р ВµРЎР‚РЎРѓ Р Т‘Р ВµР С–Р ВµР Р… Р Р…Р Вµ?'],
        ['Антиматерия деген не?', 'Р С’Р Р…РЎвЂљР С‘Р СР В°РЎвЂљР ВµРЎР‚Р С‘РЎРЏ Р Т‘Р ВµР С–Р ВµР Р… Р Р…Р Вµ?'],
        ['МашиналыТ› оТ›ыту деген не?', 'Р СљР В°РЎв‚¬Р С‘Р Р…Р В°Р »РЎвЂ№Р СћРІР‚С” Р С•Р СћРІР‚С”РЎвЂ№РЎвЂљРЎС“ Р Т‘Р ВµР С–Р ВµР Р… Р Р…Р Вµ?']
      ]
    },
    en: {
      download: 'Download Solifon AI',
      upgradeText: 'Upgrade to Premium',
      upgrade: 'Upgrade',
      premiumTitle: 'Solifon Premium',
      premiumSub: 'Unlimited access to every model',
      premium1: 'All models without limits',
      premium2: 'Priority access',
      premium3: 'Chat history',
      premium4: 'Voice answers',
      premiumSoon: 'Coming soon',
      deep: 'Deep Search',
      modelPick: 'Choose a model',
      ask: 'Ask SOLIFON AI anything...',
      questions: [
        ['ph ph-cpu', 'What is artificial intelligence?'],
        ['ph ph-desktop', 'What is the metaverse?'],
        ['ph ph-fire', 'What is antimatter?'],
        ['ph ph-lightning', 'What is machine learning?']
      ]
    }
  };

  function lang() {
    return localStorage.getItem(LANG_KEY) || document.documentElement.lang || 'en';
  }

  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function applyPremiumText(t) {
    setText('#upgradeModal h1', t.premiumTitle);
    const ps = Array.from(document.querySelectorAll('#upgradeModal p'));
    if (ps[0]) ps[0].textContent = t.premiumSub;
    if (ps[1]) ps[1].textContent = t.premiumSoon;
    const items = Array.from(document.querySelectorAll('#upgradeModal div[style*="font-size:15px"]'));
    [t.premium1, t.premium2, t.premium3, t.premium4].forEach((text, index) => {
      if (items[index]) items[index].textContent = '✔  ${text}';
    });
  }

  function renderLocalizedQuickCards(t) {
    const container = document.getElementById('quickPills');
    if (!container) return;
    container.innerHTML = '';
    t.questions.forEach(([icon, text], index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `quick-card quick-card-${index + 1}`;
      card.innerHTML = `<i class="${icon}"></i><span>${text}</span>`;
      card.addEventListener('click', () => {
        const input = document.getElementById('userInput');
        if (input) input.value = text;
        document.body.classList.add('chat-started');
        document.getElementById('sendBtn')?.click();
      });
      container.appendChild(card);
    });
  }

  function applyFinalLanguage() {
    const key = ['ru', 'kk', 'en'].includes(lang()) ? lang() : 'ru';
    const t = dict[key];
    document.documentElement.lang = key === 'kk' ? 'kk' : key;

    setText('.menu-item[onclick*="openDownloadModal"] span', t.download);
    setText('.upgrade-card p', t.upgradeText);
    setText('.upgrade-btn', t.upgrade);
    setText('#deepBtn span', t.deep);
    setText('#currentModel', t.modelPick);
    const input = document.getElementById('userInput');
    if (input) input.placeholder = t.ask;

    applyPremiumText(t);
    renderLocalizedQuickCards(t);

    const iframe = document.querySelector('#downloadModal iframe');
    if (iframe && iframe.contentWindow) {
      try { iframe.contentWindow.postMessage({ type: 'solifon-lang', lang: key }, '*'); } catch (error) {}
    }
  }

  const originalSetLanguage = window.setLanguage;
  window.setLanguage = function (nextLang) {
    localStorage.setItem(LANG_KEY, nextLang);
    if (typeof originalSetLanguage === 'function') originalSetLanguage(nextLang);
    applyFinalLanguage();
  };

  document.addEventListener('click', event => {
    const button = event.target.closest('#languageSwitcher button, [data-lang]');
    if (!button) return;
    const next = button.dataset.lang || button.textContent.trim().toLowerCase().replace('kz', 'kk');
    if (['ru', 'kk', 'en'].includes(next)) {
      setTimeout(applyFinalLanguage, 0);
      setTimeout(applyFinalLanguage, 120);
    }
  });

  document.addEventListener('DOMContentLoaded', applyFinalLanguage);
  window.addEventListener('load', applyFinalLanguage);
  document.addEventListener('click', event => {
    if (event.target.closest('.menu-item[onclick*="openDownloadModal"]')) {
      setTimeout(applyFinalLanguage, 180);
      setTimeout(applyFinalLanguage, 650);
    }
    if (event.target.closest('#deepBtn')) {
      setTimeout(applyFinalLanguage, 80);
    }
  });
  setTimeout(applyFinalLanguage, 300);
})();

// ============================================================
// SOLIFON HOTFIX: translate info modals
// ============================================================
(function () {
  const LANG_KEY = 'solifon-language';
  const modalText = {
    ru: {
      whatsTitle: 'Жаңалықтар',
      whats01: '01 < ЖТЇйелік даТ“дылар />',
      whats02: '02 < ЖаТ›ында />',
      whats03: '03 < ЖаТЈалыТ› />',
      aboutTitle: 'SOLIFON AI туралы',
      aboutHero: 'SOLIFON AI',
      aboutLead: 'Solifon AI чат, іздеу, модельдер, дауыс, визуалды Т›Т±ралдар жУ™не жТ±мыс кеТЈістіктерін бір платформаТ“а біріктіреді.',
      aboutGoal: 'БіздіТЈ маТ›сат',
      aboutGoalText: 'Біз оТ›уТ“а, жТ±мыс істеуге, идеяларды зерттеуге жУ™не У™ртТЇрлі Т›Т±ралдарды артыТ› беттерсіз іске Т›осуТ“а ыТЈТ“айлы AI-платформа жасаймыз.',
      card1: 'КУ©п ядро',
      card1Text: 'Бір интерфейсте бірнеше AI моделі.',
      card2: 'Code Dev',
      card2Text: 'Код пен тУ™жірибелерге арналТ“ан жТ±мыс кеТЈістігі.'
    },
    kk: {
      whatsTitle: 'Жаңалықтар',
      whats01: '01 < ЖТЇйелік даТ“дылар />',
      whats02: '02 < ЖаТ›ында />',
      whats03: '03 < ЖаТЈалыТ› />',
      aboutTitle: 'SOLIFON AI туралы',
      aboutHero: 'SOLIFON AI',
      aboutLead: 'Solifon AI РЎвЂЎР В°РЎвЂљ, РЎвЂ“Р В·Р Т‘Р ВµРЎС“, Р СР С•Р Т‘Р ВµР »РЎРЉР Т‘Р ВµРЎР‚, Р Т‘Р В°РЎС“РЎвЂ№РЎРѓ, Р Р†Р С‘Р В·РЎС“Р В°Р »Р Т‘РЎвЂ№ Р СћРІР‚С”Р СћР’В±РЎР‚Р В°Р »Р Т‘Р В°РЎР‚ Р В¶Р Р€РІвЂћСћР Р…Р Вµ Р В¶Р СћР’В±Р СРЎвЂ№РЎРѓ Р С”Р ВµР СћР в‚¬РЎвЂ“РЎРѓРЎвЂљРЎвЂ“Р С”РЎвЂљР ВµРЎР‚РЎвЂ“Р Р… Р В±РЎвЂ“РЎР‚ Р С—Р »Р В°РЎвЂљРЎвЂћР С•РЎР‚Р СР В°Р СћРІР‚СљР В° Р В±РЎвЂ“РЎР‚РЎвЂ“Р С”РЎвЂљРЎвЂ“РЎР‚Р ВµР Т‘РЎвЂ“.',
      aboutGoal: 'Р вЂРЎвЂ“Р В·Р Т‘РЎвЂ“Р СћР в‚¬ Р СР В°Р СћРІР‚С”РЎРѓР В°РЎвЂљ',
      aboutGoalText: 'Р вЂРЎвЂ“Р В· Р С•Р СћРІР‚С”РЎС“Р СћРІР‚СљР В°, Р В¶Р СћР’В±Р СРЎвЂ№РЎРѓ РЎвЂ“РЎРѓРЎвЂљР ВµРЎС“Р С–Р Вµ, Р С‘Р Т‘Р ВµРЎРЏР »Р В°РЎР‚Р Т‘РЎвЂ№ Р В·Р ВµРЎР‚РЎвЂљРЎвЂљР ВµРЎС“Р С–Р Вµ Р В¶Р Р€РІвЂћСћР Р…Р Вµ Р Р€РІвЂћСћРЎР‚РЎвЂљР СћР вЂЎРЎР‚Р »РЎвЂ“ Р СћРІР‚С”Р СћР’В±РЎР‚Р В°Р »Р Т‘Р В°РЎР‚Р Т‘РЎвЂ№ Р В°РЎР‚РЎвЂљРЎвЂ№Р СћРІР‚С” Р В±Р ВµРЎвЂљРЎвЂљР ВµРЎР‚РЎРѓРЎвЂ“Р В· РЎвЂ“РЎРѓР С”Р Вµ Р СћРІР‚С”Р С•РЎРѓРЎС“Р СћРІР‚СљР В° РЎвЂ№Р СћР в‚¬Р СћРІР‚СљР В°Р в„–Р »РЎвЂ№ AI-Р С—Р »Р В°РЎвЂљРЎвЂћР С•РЎР‚Р СР В° Р В¶Р В°РЎРѓР В°Р в„–Р СРЎвЂ№Р В·.',
      card1: 'КУ©п ядро',
      card1Text: 'Р вЂРЎвЂ“РЎР‚ Р С‘Р Р…РЎвЂљР ВµРЎР‚РЎвЂћР ВµР в„–РЎРѓРЎвЂљР Вµ Р В±РЎвЂ“РЎР‚Р Р…Р ВµРЎв‚¬Р Вµ AI Р СР С•Р Т‘Р ВµР »РЎвЂ“.',
      card2: 'Code Dev',
      card2Text: 'Р С™Р С•Р Т‘ Р С—Р ВµР Р… РЎвЂљР Р€РІвЂћСћР В¶РЎвЂ“РЎР‚Р С‘Р В±Р ВµР »Р ВµРЎР‚Р С–Р Вµ Р В°РЎР‚Р Р…Р В°Р »Р СћРІР‚СљР В°Р Р… Р В¶Р СћР’В±Р СРЎвЂ№РЎРѓ Р С”Р ВµР СћР в‚¬РЎвЂ“РЎРѓРЎвЂљРЎвЂ“Р С–РЎвЂ“.'
    },
    en: {
      whatsTitle: "What's New",
      whats01: '01 < System Skills />',
      whats02: '02 < Coming Soon />',
      whats03: '03 < News />',
      aboutTitle: 'About SOLIFON AI',
      aboutHero: 'SOLIFON AI',
      aboutLead: 'Solifon AI brings chat, search, models, voice, visual tools, and workspaces into one platform.',
      aboutGoal: 'Our Goal',
      aboutGoalText: 'We are building a practical AI platform for learning, work, research, and creative tools without unnecessary tab switching.',
      card1: 'Multi-core',
      card1Text: 'Several AI models in one interface.',
      card2: 'Code Dev',
      card2Text: 'A workspace for code and experiments.'
    }
  };

  function currentLang() {
    const value = localStorage.getItem(LANG_KEY) || document.documentElement.lang || 'en';
    return ['ru', 'kk', 'en'].includes(value) ? value : 'ru';
  }

  function set(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function applyInfoModalLanguage() {
    const t = modalText[currentLang()];

    set('#whatsNewModal .modal-header h3', t.whatsTitle);
    set('#whatsNewModal #current-title', t.whats01);
    const whatsHeads = document.querySelectorAll('#whatsNewModal .content-block h2');
    if (whatsHeads[1]) whatsHeads[1].textContent = t.whats02;
    if (whatsHeads[2]) whatsHeads[2].textContent = t.whats03;

    set('#aboutModal .modal-header h3', t.aboutTitle);
    set('#aboutModal .mission-header h2', t.aboutHero);
    const aboutLead = document.querySelector('#aboutModal .mission-header p');
    if (aboutLead) aboutLead.textContent = t.aboutLead;
    const aboutGoal = document.querySelector('#aboutModal .modal-body h3');
    if (aboutGoal) aboutGoal.textContent = t.aboutGoal;
    const aboutParagraphs = document.querySelectorAll('#aboutModal .modal-body > p');
    if (aboutParagraphs[0]) aboutParagraphs[0].textContent = t.aboutGoalText;
    const cards = document.querySelectorAll('#aboutModal .feature-grid .skill-card');
    if (cards[0]) {
      const h = cards[0].querySelector('h4');
      const p = cards[0].querySelector('p');
      if (h) h.textContent = t.card1;
      if (p) p.textContent = t.card1Text;
    }
    if (cards[1]) {
      const h = cards[1].querySelector('h4');
      const p = cards[1].querySelector('p');
      if (h) h.textContent = t.card2;
      if (p) p.textContent = t.card2Text;
    }
  }

  document.addEventListener('DOMContentLoaded', applyInfoModalLanguage);
  window.addEventListener('load', applyInfoModalLanguage);
  document.addEventListener('click', event => {
    if (event.target.closest('#languageSwitcher button, [data-lang], .menu-item[onclick*="whatsNewModal"], .menu-item[onclick*="aboutModal"]')) {
      setTimeout(applyInfoModalLanguage, 80);
      setTimeout(applyInfoModalLanguage, 300);
    }
  });
  setTimeout(applyInfoModalLanguage, 400);
})();


// --- LANGUAGE TRANSLATION SYSTEM ---
const langDict = {
  ru: {
    select_model: 'Модель таТЈдаТЈыз',
    new_chat: 'ЖаТЈа чат',
    system_whatsnew: "What's new",
    system_about: 'SOLIFON туралы',
    menu_chat: 'Чат',
    menu_library: 'Кітапхана',
    menu_new_project: 'ЖаТЈа жоба',
    menu_presentation: 'Презентация',
    upgrade: "Upgrade to premium",
    upgrade_title: "Solifon Premium",
    upgrade_subtitle: 'НейрожелілердіТЈ барлыТ› мТЇмкіндігін ашыТЈыз',
    tariff1_type: "Basic",
    tariff1_desc: 'КТЇнделікті тапсырмалар ТЇшін еТЈ жаТ›сы таТЈдау',
    tariff1_btn: 'Basic таТЈдау',
    tariff2_type: "Pro",
    tariff2_desc: 'КУ™сіпТ›ойлар мен У™зірлеушілер ТЇшін',
    tariff2_btn: 'Pro таТЈдау',
    tariff3_type: "Ultra",
    tariff3_desc: 'ЕшТ›андай шектеусіз максималды кТЇш',
    tariff3_btn: 'Ultra таТЈдау',
  },
  kz: {
    select_model: "Модель таТЈдаТЈыз",
    new_chat: "ЖаТЈа чат",
    system_whatsnew: "Жаңалықтар",
    system_about: "SOLIFON туралы",
    menu_chat: "Чат",
    menu_library: "Кітапхана",
    menu_new_project: "ЖаТЈа жоба",
    menu_presentation: "Презентация",
    upgrade: "Premium-Т“а У©ту",
    upgrade_title: "Solifon Premium",
    upgrade_subtitle: "Р СњР ВµР в„–РЎР‚Р С•Р В¶Р ВµР »РЎвЂ“Р »Р ВµРЎР‚Р Т‘РЎвЂ“Р СћР в‚¬ Р В±Р В°РЎР‚Р »РЎвЂ№Р СћРІР‚С” Р СР СћР вЂЎР СР С”РЎвЂ“Р Р…Р Т‘РЎвЂ“Р С–РЎвЂ“Р Р… Р В°РЎв‚¬РЎвЂ№Р СћР в‚¬РЎвЂ№Р В·",
    tariff1_type: "Basic",
    tariff1_desc: "Р С™Р СћР вЂЎР Р…Р Т‘Р ВµР »РЎвЂ“Р С”РЎвЂљРЎвЂ“ РЎвЂљР В°Р С—РЎРѓРЎвЂ№РЎР‚Р СР В°Р »Р В°РЎР‚ Р СћР вЂЎРЎв‚¬РЎвЂ“Р Р… Р ВµР СћР в‚¬ Р В¶Р В°Р СћРІР‚С”РЎРѓРЎвЂ№ РЎвЂљР В°Р СћР в‚¬Р Т‘Р В°РЎС“",
    tariff1_btn: "Basic таТЈдау",
    tariff2_type: "Pro",
    tariff2_desc: "Р С™Р Р€РІвЂћСћРЎРѓРЎвЂ“Р С—Р СћРІР‚С”Р С•Р в„–Р »Р В°РЎР‚ Р СР ВµР Р… Р Р€РІвЂћСћР В·РЎвЂ“РЎР‚Р »Р ВµРЎС“РЎв‚¬РЎвЂ“Р »Р ВµРЎР‚ Р СћР вЂЎРЎв‚¬РЎвЂ“Р Р…",
    tariff2_btn: "Pro таТЈдау",
    tariff3_type: "Ultra",
    tariff3_desc: "Р вЂўРЎв‚¬Р СћРІР‚С”Р В°Р Р…Р Т‘Р В°Р в„– РЎв‚¬Р ВµР С”РЎвЂљР ВµРЎС“РЎРѓРЎвЂ“Р В· Р СР В°Р С”РЎРѓР С‘Р СР В°Р »Р Т‘РЎвЂ№ Р С”Р СћР вЂЎРЎв‚¬",
    tariff3_btn: "Ultra таТЈдау",
  },
  en: {
    select_model: "Select Model",
    new_chat: "New Chat",
    system_whatsnew: "What's New",
    system_about: "About SOLIFON",
    menu_chat: "Chat",
    menu_library: "Library",
    menu_new_project: "New Project",
    menu_presentation: "Solifon AI Code",
    upgrade: "Upgrade to premium",
    upgrade_title: "Solifon Premium",
    upgrade_subtitle: "Unleash the full potential of AI",
    tariff1_type: "Basic",
    tariff1_desc: "Best choice for daily tasks",
    tariff1_btn: "Choose Basic",
    tariff2_type: "Pro",
    tariff2_desc: "For professionals and developers",
    tariff2_btn: "Choose Pro",
    tariff3_type: "Ultra",
    tariff3_desc: "Maximum power without limits",
    tariff3_btn: "Choose Ultra",
  }
};

window.changeLang = function(lang, btnElement) {
  // Update buttons state
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.style.background = 'transparent';
    btn.style.borderColor = 'transparent';
    btn.style.color = 'rgba(255,255,255,0.5)';
    btn.classList.remove('active');
  });
  if (btnElement) {
    btnElement.style.background = 'rgba(255,255,255,0.1)';
    btnElement.style.borderColor = 'rgba(255,255,255,0.2)';
    btnElement.style.color = '#fff';
    btnElement.classList.add('active');
  } else {
    // If no btnElement passed (e.g. on load), find the right button
    document.querySelectorAll('.lang-btn').forEach(btn => {
      if (btn.textContent.toLowerCase() === lang) {
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.borderColor = 'rgba(255,255,255,0.2)';
        btn.style.color = '#fff';
        btn.classList.add('active');
      }
    });
  }

  const dict = langDict[lang];
  if (!dict) return;

  const updateText = (selector, key) => {
    const el = document.querySelector(selector);
    if (el && dict[key]) el.textContent = dict[key];
  };

  updateText("#currentModel", "select_model");
  updateText("#newChatBtn span", "new_chat");
  updateText(".menu-item[onclick*='whatsNewModal'] span", "system_whatsnew");
  updateText(".menu-item[onclick*='aboutModal'] span", "system_about");
  updateText("#chatTrigger span", "menu_chat");
  updateText("#libraryTrigger span", "menu_library");
  updateText("#newProjectBtn span", "menu_new_project");
  updateText(".menu-item[onclick*='openPresentation'] span", "menu_presentation");
  
  updateText(".upgrade-btn", "upgrade");
  updateText(".upgrade-tariff-title", "upgrade_title");
  updateText(".upgrade-tariff-subtitle", "upgrade_subtitle");
  
  updateText(".first__tariff-type", "tariff1_type");
  updateText(".first-tariff .tariff__description", "tariff1_desc");
  updateText(".first__tariff-button", "tariff1_btn");
  
  updateText(".second__tariff-type", "tariff2_type");
  updateText(".second-tariff .tariff__description", "tariff2_desc");
  updateText(".second__tariff-button", "tariff2_btn");
  
  updateText(".third__tariff-type", "tariff3_type");
  updateText(".third-tariff .tariff__description", "tariff3_desc");
  updateText(".third__tariff-button", "tariff3_btn");
  
  localStorage.setItem('solifon-lang', lang);
};

window.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('solifon-lang') || 'en';
  if(window.changeLang) {
    window.changeLang(savedLang, null);
  }
});

// --- BILLING TOGGLE LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const billingBtns = document.querySelectorAll('.billing-btn');
    const customContainer = document.getElementById('custom-months-container');
    const customRange = document.getElementById('customMonthsRange');
    const customValueDisplay = document.getElementById('customMonthsValue');
    
    // Default base prices per month
    const prices = {
        second: 60,
        third: 90
    };
    
    const updatePrices = (period, months = 1) => {
        let multiplier = 1;
        let suffix = '/мес';
        
        if (period === 'year') {
            multiplier = 12 * 0.8; // 20% discount
            suffix = '/за 1 год';
        } else if (period === 'custom') {
            multiplier = months;
            // Pluralization for English
            let monthLabel = months === 1 ? 'месяцев' : 'months';
            suffix = `/per ${months} ${monthLabel}`;
            customValueDisplay.textContent = `${months} ${monthLabel}`;
        }
        
        const priceEls = {
            second: document.querySelector('.second-tariff .tariff__number'),
            third: document.querySelector('.third-tariff .tariff__number')
        };
        const periodEls = {
            second: document.querySelector('.second-tariff .tariff__period'),
            third: document.querySelector('.third-tariff .tariff__period')
        };
        
        if (priceEls.second && periodEls.second) {
            priceEls.second.textContent = '$' + Math.round(prices.second * multiplier);
            periodEls.second.textContent = suffix;
        }
        if (priceEls.third && periodEls.third) {
            priceEls.third.textContent = '$' + Math.round(prices.third * multiplier);
            periodEls.third.textContent = suffix;
        }
    };
    
    let currentPeriod = 'month';
    
    billingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            billingBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentPeriod = btn.dataset.period;
            
            if (currentPeriod === 'custom') {
                customContainer.style.display = 'block';
                updatePrices('custom', parseInt(customRange.value));
            } else {
                customContainer.style.display = 'none';
                updatePrices(currentPeriod);
            }
        });
    });
    
    if (customRange) {
        customRange.addEventListener('input', (e) => {
            if (currentPeriod === 'custom') {
                updatePrices('custom', parseInt(e.target.value));
            }
        });
    }
});

// ============================================================
// SOLIFON CLOUD BROWSER AGENT
// ============================================================
window.startCloudBrowser = function(task) {
    // Р вЂ™Р С’Р вЂ“Р СњР С›: Р —Р В°Р СР ВµР Р…Р С‘ РЎРѓРЎРѓРЎвЂ№Р »Р С”РЎС“ Р Р…Р В° URL РЎвЂљР Р†Р С•Р ВµР С–Р С• Space Р Р…Р В° Hugging Face!
    const wsUrl = 'wss://ТВОЙ-СЕРВЕР.hf.space/ws/browser'; 
    
    // Р РЋР С•Р В·Р Т‘Р В°Р ВµР С РЎРѓР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘Р Вµ Р Р† РЎвЂЎР В°РЎвЂљР Вµ Р С•РЎвЂљ Р С‘Р СР ВµР Р…Р С‘ Р В Р’ВР В Р’В РЎРѓ РЎвЂЎР ВµРЎР‚Р Р…РЎвЂ№Р С РЎРЊР С”РЎР‚Р В°Р Р…Р С•Р С
    const msgId = "browser-" + Date.now();
    const uiHtml = `
        <div style="font-size: 13px; color: #00f2ff; margin-bottom: 8px;">
            <i class="ph ph-globe"></i> Solifon Agent подключен к интернету...
        </div>
        <div style="font-size: 14px; margin-bottom: 10px;"><b>Цель:</b> ${task}</div>
        <img id='Загрузка облачного браузера...' src="" style="width: 100%; border-radius: 12px; border: 1px solid #00f2ff; background: #050505; min-height: 200px;" alt="Р —Р В°Р С–РЎР‚РЎС“Р В·Р С”Р В° Р С•Р В±Р »Р В°РЎвЂЎР Р…Р С•Р С–Р С• Р В±РЎР‚Р В°РЎС“Р В·Р ВµРЎР‚Р В°...">
        <div id="btn-${msgId}" style="display: none; margin-top: 10px;"></div>
    `;
    
    // Р В Р’ВРЎРѓР С—Р С•Р »РЎРЉР В·РЎС“Р ВµР С РЎвЂљР Р†Р С•РЎР‹ Р С–Р С•РЎвЂљР С•Р Р†РЎС“РЎР‹ РЎвЂћРЎС“Р Р…Р С”РЎвЂ Р С‘РЎР‹ Р Т‘Р С•Р В±Р В°Р Р†Р »Р ВµР Р…Р С‘РЎРЏ РЎРѓР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘Р в„– (Р ВµРЎРѓР »Р С‘ Р С•Р Р…Р В° Р Р…Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµРЎвЂљРЎРѓРЎРЏ РЎвЂљР В°Р С”)
    // Либо просто создай div и добавь его в #messagesContainer
    const container = document.getElementById('messagesContainer');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message';
    msgDiv.innerHTML = `<div class="text">${uiHtml}</div>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    // Р —Р В°Р С—РЎС“РЎРѓР С”Р В°Р ВµР С WebSocket
    const ws = new WebSocket(wsUrl);
    const screen = document.getElementById(msgId);
    const btnContainer = document.getElementById(`btn-${msgId}`);

    ws.onopen = () => { ws.send(task); };

    ws.onmessage = (event) => {
        const data = event.data;
        if (data.startsWith("data:image")) {
            screen.src = data; // Р СџР С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С РЎвЂљРЎР‚Р В°Р Р…РЎРѓР »РЎРЏРЎвЂ Р С‘РЎР‹
            container.scrollTop = container.scrollHeight;
        } 
        else if (data.startsWith('Ошибка')) {
            const link = data.split("LINK:")[1];
            btnContainer.style.display = "block";
            btnContainer.innerHTML = `<a href="${link}" target="_blank" style="padding: 10px 20px; background: #00f2ff; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">📥 Скачать результат</a>`;
        } 
        else if (data === "DONE") {
            console.log("Задача в браузере завершена");
        } 
        else if (data.startsWith("Ошибка")) {
            alert(data);
        }
    };
};






// TUBELIGHT NAVBAR LOGIC
document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll('.tubelight-nav-item');
    const lamp = document.getElementById('tubelight-lamp');

    function updateLamp() {
        const activeItem = document.querySelector('.tubelight-nav-item.active');
        if (activeItem && lamp) {
            const rect = activeItem.getBoundingClientRect();
            const parentRect = activeItem.parentElement.getBoundingClientRect();
            
            lamp.style.width = `${rect.width}px`;
            lamp.style.transform = `translateX(${rect.left - parentRect.left}px)`;
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => { e.preventDefault(); if (item.tagName.toLowerCase() === 'label') { const targetId = item.getAttribute('for'); if (targetId) { const cb = document.getElementById(targetId); if (cb) cb.checked = !cb.checked; } } navItems.forEach(nav => nav.classList.remove('active')); item.classList.add('active'); updateLamp(); });
    });

    setTimeout(updateLamp, 100);
    window.addEventListener('resize', updateLamp);
});


// ============================================================
// AUTOCOMPLETE SYSTEM — Ghost Text + Dropdown Suggestions
// Based on cleaned_data.json (ru + en + kz)
// ============================================================
(function() {
    // ---- Р вЂР В°Р В·Р В° Р Т‘Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦ Р С‘Р В· cleaned_data.json ----
    const generatedData = {
        "ru": [
            "что такое API","что такое циклы","что такое лоукод","что такое облако",
            "Р С”Р В°Р С” Р В±РЎвЂ№РЎРѓРЎвЂљРЎР‚Р С• РЎвЂЎР С‘РЎвЂљР В°РЎвЂљРЎРЉ","Р С”Р В°Р С” РЎС“Р »РЎС“РЎвЂЎРЎв‚¬Р С‘РЎвЂљРЎРЉ РЎР‚Р ВµРЎвЂЎРЎРЉ","Р С”Р В°Р С” РЎР‚Р В°Р В·Р Р†Р С‘РЎвЂљРЎРЉ Р С—Р В°Р СРЎРЏРЎвЂљРЎРЉ","Р С•РЎРѓР Р…Р С•Р Р†РЎвЂ№ Р В±Р В°Р В·РЎвЂ№ Р Т‘Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦",
            "Р С•РЎРѓР Р…Р С•Р Р†РЎвЂ№ Р С”Р С•Р Т‘Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р В°Р »Р С–Р С•РЎР‚Р С‘РЎвЂљР С","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р В±Р »Р С•Р С”РЎвЂЎР ВµР в„–Р Р…","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С—РЎР‚Р С•РЎвЂљР С•Р С”Р С•Р »",
            "РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С—РЎР‚Р С•РЎвЂ Р ВµРЎРѓРЎРѓРЎвЂ№","Р С”Р В°Р С” РЎРѓРЎвЂљР В°РЎвЂљРЎРЉ РЎС“Р Р†Р ВµРЎР‚Р ВµР Р…Р Р…Р ВµР Вµ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р Р…Р ВµР в„–РЎР‚Р С•РЎРѓР ВµРЎвЂљРЎРЉ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ РЎвЂћРЎР‚Р ВµР в„–Р СР Р†Р С•РЎР‚Р С”",
            "Р С”Р В°Р С” Р Р…Р В°Р в„–РЎвЂљР С‘ Р СР ВµР Р…РЎвЂљР С•РЎР‚Р В° Р С‘РЎвЂљ","Р С”Р В°Р С” РЎР‚Р В°Р В·Р Р†Р С‘РЎвЂљРЎРЉ Р Р†Р Р…Р С‘Р СР В°Р Р…Р С‘Р Вµ","Р С”Р В°Р С” РЎР‚Р В°Р В·Р Р†Р С‘РЎвЂљРЎРЉ РЎРѓР »РЎС“РЎв‚¬Р В°Р Р…Р С‘Р Вµ","Р С”Р В°Р С” РЎРѓР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р Р†Р ВµР В±-РЎРѓР В°Р в„–РЎвЂљ",
            "РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С—Р ВµРЎР‚Р ВµР СР ВµР Р…Р Р…РЎвЂ№Р Вµ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ РЎвЂЎР С‘РЎРѓРЎвЂљРЎвЂ№Р в„– Р С”Р С•Р Т‘","Р С”Р В°Р С” Р С–Р С•Р Р†Р С•РЎР‚Р С‘РЎвЂљРЎРЉ Р С—РЎС“Р В±Р »Р С‘РЎвЂЎР Р…Р С•","Р С”Р В°Р С” Р Р…Р В°РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ",
            "Р С”Р В°Р С” РЎС“Р »РЎС“РЎвЂЎРЎв‚¬Р С‘РЎвЂљРЎРЉ Р Р†Р Р…Р С‘Р СР В°Р Р…Р С‘Р Вµ","Р С•РЎРѓР Р…Р С•Р Р†РЎвЂ№ Р Р†Р ВµР В±-РЎР‚Р В°Р В·РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р С‘","РЎС“Р С—РЎР‚Р В°Р В¶Р Р…Р ВµР Р…Р С‘РЎРЏ Р Т‘Р »РЎРЏ Р С–Р С•Р »Р С•РЎРѓР В°","РЎС“Р С—РЎР‚Р В°Р В¶Р Р…Р ВµР Р…Р С‘РЎРЏ Р Т‘Р »РЎРЏ Р Т‘Р С‘Р С”РЎвЂ Р С‘Р С‘",
            "РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р В±Р В°Р В·Р В° Р Т‘Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦","Р С”Р В°Р С” РЎР‚Р В°Р В·Р Р†Р С‘РЎвЂљРЎРЉ РЎвЂљР Р†Р С•РЎР‚РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р С•","Р С”Р В°Р С” РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ РЎРЊРЎвЂћРЎвЂћР ВµР С”РЎвЂљР С‘Р Р†Р Р…Р С•","Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ РЎР‚Р В°Р В·Р Р†Р С‘РЎвЂљР С‘РЎРЏ Р С—Р В°Р СРЎРЏРЎвЂљР С‘",
            "РЎС“Р С—РЎР‚Р В°Р В¶Р Р…Р ВµР Р…Р С‘РЎРЏ Р Т‘Р »РЎРЏ Р Т‘РЎвЂ№РЎвЂ¦Р В°Р Р…Р С‘РЎРЏ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р СР С‘Р С”РЎР‚Р С•РЎРѓР ВµРЎР‚Р Р†Р С‘РЎРѓРЎвЂ№","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ РЎРѓР ВµРЎвЂљР ВµР Р†Р С•Р в„– РЎРѓР »Р С•Р в„–","Р С”Р В°Р С” Р В±РЎвЂ№РЎРѓРЎвЂљРЎР‚Р С• Р Р†РЎвЂ№РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ РЎРѓРЎвЂљР С‘РЎвЂ¦",
            "Р С”Р В°Р С” РЎС“Р »РЎС“РЎвЂЎРЎв‚¬Р С‘РЎвЂљРЎРЉ Р С—РЎС“Р Р…Р С”РЎвЂљРЎС“Р В°РЎвЂ Р С‘РЎР‹","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р Р†Р С‘РЎР‚РЎвЂљРЎС“Р В°Р »Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ","Р С”Р В°Р С” РЎР‚Р В°Р В·Р Р†Р С‘РЎвЂљРЎРЉ Р С”Р С•Р СР СРЎС“Р Р…Р С‘Р С”Р В°РЎвЂ Р С‘РЎР‹","Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ spaced repetition",
            "основы бэкенд разработки","основы паттернов дизайна","основы тестирования кода","что такое большие данные",
            "что такое интернет вещей","что такое нейронная сеть","что такое парсинг данных","как избавиться от акцента",
            "Р С”Р В°Р С” Р Р…Р В°РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ Р С—РЎР‚Р ВµР В·Р ВµР Р…РЎвЂљР В°РЎвЂ Р С‘Р С‘","Р С”Р В°Р С” РЎС“Р »РЎС“РЎвЂЎРЎв‚¬Р С‘РЎвЂљРЎРЉ Р С”Р С•Р Р…РЎвЂ Р ВµР Р…РЎвЂљРЎР‚Р В°РЎвЂ Р С‘РЎР‹","Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ Р В°Р С”РЎвЂљР С‘Р Р†Р Р…Р С•Р С–Р С• Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ","Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ Р С–Р »РЎС“Р В±Р С•Р С”Р С•Р С–Р С• Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ",
            "Р С•РЎРѓР Р…Р С•Р Р†РЎвЂ№ Р С”Р С•Р СР С—РЎРЉРЎР‹РЎвЂљР ВµРЎР‚Р Р…РЎвЂ№РЎвЂ¦ РЎРѓР ВµРЎвЂљР ВµР в„–","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р Р†Р ВµРЎР‚РЎРѓР С‘Р С•Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С”Р С•Р Р…РЎвЂљР ВµР в„–Р Р…Р ВµРЎР‚Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р СР В°РЎв‚¬Р С‘Р Р…Р Р…Р С•Р Вµ Р В·РЎР‚Р ВµР Р…Р С‘Р Вµ",
            "как настроить голос дикцию","как улучшить скорость речи","основы дизайна интерфейсов","основы защиты от кибератак",
            "основы фронтенд разработки","подготовка к школе логопед","упражнения для артикуляции","упражнения для беглой речи",
            "РЎС“Р С—РЎР‚Р В°Р В¶Р Р…Р ВµР Р…Р С‘РЎРЏ Р Т‘Р »РЎРЏ РЎС“Р Р†Р ВµРЎР‚Р ВµР Р…Р Р…Р С•РЎРѓРЎвЂљР С‘","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р СР С‘Р С”РЎР‚Р С•Р В°РЎР‚РЎвЂ¦Р С‘РЎвЂљР ВµР С”РЎвЂљРЎС“РЎР‚Р В°","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С•Р В±Р »Р В°РЎвЂЎР Р…РЎвЂ№Р Вµ РЎРѓР ВµРЎР‚Р Р†Р С‘РЎРѓРЎвЂ№","Р В·Р В°Р С‘Р С”Р В°Р Р…Р С‘Р Вµ РЎС“ Р Р†Р В·РЎР‚Р С•РЎРѓР »РЎвЂ№РЎвЂ¦ Р »Р ВµРЎвЂЎР ВµР Р…Р С‘Р Вµ",
            "Р С”Р В°Р С” Р С•РЎР‚Р С–Р В°Р Р…Р С‘Р В·Р С•Р Р†Р В°РЎвЂљРЎРЉ РЎРѓР Р†Р С•Р Вµ Р Р†РЎР‚Р ВµР СРЎРЏ","Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ Р В°Р Т‘Р В°Р С—РЎвЂљР С‘Р Р†Р Р…Р С•Р С–Р С• Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ","Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ Р С—РЎР‚Р С•Р В±Р »Р ВµР СР Р…Р С•Р С–Р С• Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ","Р С•РЎРѓР Р…Р С•Р Р†РЎвЂ№ Р СР С•Р В±Р С‘Р »РЎРЉР Р…Р С•Р в„– РЎР‚Р В°Р В·РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р С‘",
            "РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С”Р С‘Р В±Р ВµРЎР‚Р В±Р ВµР В·Р С•Р С—Р В°РЎРѓР Р…Р С•РЎРѓРЎвЂљРЎРЉ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р СР В°РЎв‚¬Р С‘Р Р…Р Р…Р С•Р Вµ Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘Р Вµ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С•Р В±Р »Р В°Р С”Р С• Р Р†РЎвЂ№РЎвЂЎР С‘РЎРѓР »Р ВµР Р…Р С‘Р в„–","Р Т‘Р С‘Р В·Р В°РЎР‚РЎвЂљРЎР‚Р С‘РЎРЏ РЎРѓР С‘Р СР С—РЎвЂљР С•Р СРЎвЂ№ Р С‘ Р »Р ВµРЎвЂЎР ВµР Р…Р С‘Р Вµ",
            "как научиться говорить четко","как преодолеть застенчивость","как развить уверенность речи","как улучшить звучание голоса",
            "Р С”Р В°Р С” РЎС“Р »РЎС“РЎвЂЎРЎв‚¬Р С‘РЎвЂљРЎРЉ Р С—Р С‘РЎРѓРЎРЉР СР ВµР Р…Р Р…РЎС“РЎР‹ РЎР‚Р ВµРЎвЂЎРЎРЉ","Р С”Р В°Р С” РЎС“Р »РЎС“РЎвЂЎРЎв‚¬Р С‘РЎвЂљРЎРЉ РЎРѓР »Р С•Р Р†Р В°РЎР‚Р Р…РЎвЂ№Р в„– Р В·Р В°Р С—Р В°РЎРѓ","Р С”Р В°Р С” РЎС“Р »РЎС“РЎвЂЎРЎв‚¬Р С‘РЎвЂљРЎРЉ РЎвЂЎРЎС“Р Р†РЎРѓРЎвЂљР Р†Р С• Р Р†РЎР‚Р ВµР СР ВµР Р…Р С‘","Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ Р С–Р ВµР в„–Р СР С‘РЎвЂћР С‘Р С”Р В°РЎвЂ Р С‘Р С‘ Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ",
            "Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ РЎР‚Р В°Р В·Р Р†Р С‘Р Р†Р В°РЎР‹РЎвЂ°Р ВµР С–Р С• Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ","Р С•РЎРѓР Р…Р С•Р Р†РЎвЂ№ Р Р†РЎвЂ№РЎвЂЎР С‘РЎРѓР »Р С‘РЎвЂљР ВµР »РЎРЉР Р…Р С•Р в„– РЎвЂљР ВµР С•РЎР‚Р С‘Р С‘","Р С”Р В°Р С” Р Р†РЎвЂ№РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ РЎвЂљР В°Р В±Р »Р С‘РЎвЂ РЎС“ РЎС“Р СР Р…Р С•Р В¶Р ВµР Р…Р С‘РЎРЏ","Р С”Р В°Р С” Р Р…Р В°РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ Р С‘Р СР С—РЎР‚Р С•Р Р†Р С‘Р В·Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ",
            "Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ Р В·Р В°Р С—Р С•Р СР С‘Р Р…Р В°Р Р…Р С‘РЎРЏ Р С‘Р Р…РЎвЂћР С•РЎР‚Р СР В°РЎвЂ Р С‘Р С‘","Р С•РЎРѓР Р…Р С•Р Р†РЎвЂ№ Р В°РЎР‚РЎвЂ¦Р С‘РЎвЂљР ВµР С”РЎвЂљРЎС“РЎР‚РЎвЂ№ Р С—РЎР‚Р С‘Р »Р С•Р В¶Р ВµР Р…Р С‘Р в„–","Р С•РЎРѓР Р…Р С•Р Р†РЎвЂ№ Р Т‘Р В¶Р В°Р Р†Р В° Р С—РЎР‚Р С•Р С–РЎР‚Р В°Р СР СР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ","Р С•РЎРѓР Р…Р С•Р Р†РЎвЂ№ Р С—РЎР‚Р С•Р С–РЎР‚Р В°Р СР СР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ Р С—Р С‘РЎвЂљР С•Р Р…",
            "РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р Р…Р В°РЎвЂљР С‘Р Р†Р Р…Р С•Р Вµ Р С—РЎР‚Р С‘Р »Р С•Р В¶Р ВµР Р…Р С‘Р Вµ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С•Р В±Р »Р В°РЎвЂЎР Р…РЎвЂ№Р Вµ РЎвЂљР ВµРЎвЂ¦Р Р…Р С•Р »Р С•Р С–Р С‘Р С‘","Р С”Р В°Р С” Р С—РЎР‚Р ВµР С•Р Т‘Р С•Р »Р ВµРЎвЂљРЎРЉ РЎРЏР В·РЎвЂ№Р С”Р С•Р Р†Р С•Р в„– Р В±Р В°РЎР‚РЎРЉР ВµРЎР‚","Р С”Р В°Р С” РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂљРЎС“РЎР‚Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ Р С‘Р Р…РЎвЂћР С•РЎР‚Р СР В°РЎвЂ Р С‘РЎР‹",
            "Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ Р С‘Р Р…РЎвЂљР ВµРЎР‚Р В°Р С”РЎвЂљР С‘Р Р†Р Р…Р С•Р С–Р С• Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ","РЎР‚Р В°Р В·Р Р†Р С‘РЎвЂљР С‘Р Вµ Р С”РЎР‚Р С‘РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С•Р С–Р С• Р СРЎвЂ№РЎв‚¬Р »Р ВµР Р…Р С‘РЎРЏ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С”Р Р†Р В°Р Р…РЎвЂљР С•Р Р†РЎвЂ№Р Вµ Р С”Р С•Р СР С—РЎРЉРЎР‹РЎвЂљР ВµРЎР‚РЎвЂ№","РЎС“Р С—РЎР‚Р В°Р В¶Р Р…Р ВµР Р…Р С‘РЎРЏ Р Т‘Р »РЎРЏ РЎР‚Р ВµРЎвЂЎР ВµР Р†Р С•Р С–Р С• Р Т‘РЎвЂ№РЎвЂ¦Р В°Р Р…Р С‘РЎРЏ",
            "РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р Р†Р С‘РЎР‚РЎвЂљРЎС“Р В°Р »РЎРЉР Р…Р В°РЎРЏ РЎР‚Р ВµР В°Р »РЎРЉР Р…Р С•РЎРѓРЎвЂљРЎРЉ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С–РЎР‚Р В°РЎвЂћР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р Вµ Р С—РЎР‚Р С•РЎвЂ Р ВµРЎРѓРЎРѓР С•РЎР‚РЎвЂ№","Р С”Р В°Р С” РЎР‚Р В°Р В·Р Р†Р С‘РЎвЂљРЎРЉ Р С•РЎР‚Р В°РЎвЂљР С•РЎР‚РЎРѓР С”Р С•Р Вµ Р СР В°РЎРѓРЎвЂљР ВµРЎР‚РЎРѓРЎвЂљР Р†Р С•","Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘Р Вµ Р Т‘Р ВµРЎвЂљР ВµР в„– Р С‘Р Р…Р С•РЎРѓРЎвЂљРЎР‚Р В°Р Р…Р Р…Р С•Р СРЎС“ РЎРЏР В·РЎвЂ№Р С”РЎС“",
            "РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ Р С‘РЎРѓР С”РЎС“РЎРѓРЎРѓРЎвЂљР Р†Р ВµР Р…Р Р…РЎвЂ№Р в„– Р С‘Р Р…РЎвЂљР ВµР »Р »Р ВµР С”РЎвЂљ","Р СР ВµРЎвЂљР С•Р Т‘РЎвЂ№ Р С—Р С•Р Р†Р ВµРЎРѓРЎвЂљР Р†Р С•Р Р†Р В°РЎвЂљР ВµР »РЎРЉР Р…Р С•Р С–Р С• Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ","Р С”Р С•РЎР‚РЎР‚Р ВµР С”РЎвЂ Р С‘РЎРЏ Р Р…Р В°РЎР‚РЎС“РЎв‚¬Р ВµР Р…Р С‘Р в„– Р С—Р С‘РЎРѓРЎРЉР СР ВµР Р…Р Р…Р С•Р в„– РЎР‚Р ВµРЎвЂЎР С‘","Р С•РЎРѓР Р…Р С•Р Р†РЎвЂ№ РЎРѓР С‘РЎРѓРЎвЂљР ВµР СР Р…Р С•Р С–Р С• Р В°Р Т‘Р СР С‘Р Р…Р С‘РЎРѓРЎвЂљРЎР‚Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ",
            "РЎвЂљР ВµРЎвЂ¦Р Р…Р С‘Р С”Р С‘ Р В·Р В°Р С—Р С•Р СР С‘Р Р…Р В°Р Р…Р С‘РЎРЏ Р В°Р Р…Р С–Р »Р С‘Р в„–РЎРѓР С”Р С‘РЎвЂ¦ РЎРѓР »Р С•Р Р†","Р Р…Р В°РЎР‚РЎС“РЎв‚¬Р ВµР Р…Р С‘РЎРЏ Р С–Р С•Р »Р С•РЎРѓР В° Р С—РЎР‚Р С‘РЎвЂЎР С‘Р Р…РЎвЂ№ Р С—РЎР‚Р С•РЎвЂћР С‘Р »Р В°Р С”РЎвЂљР С‘Р С”Р В°","Р С”Р В°Р С” РЎР‚Р В°Р В·Р Р†Р С‘Р Р†Р В°РЎвЂљРЎРЉ Р С—РЎР‚Р С•РЎРѓРЎвЂљРЎР‚Р В°Р Р…РЎРѓРЎвЂљР Р†Р ВµР Р…Р Р…Р С•Р Вµ Р СРЎвЂ№РЎв‚¬Р »Р ВµР Р…Р С‘Р Вµ",
            "РЎС“Р С—РЎР‚Р В°Р В¶Р Р…Р ВµР Р…Р С‘РЎРЏ Р Т‘Р »РЎРЏ Р С—РЎР‚Р В°Р Р†Р С‘Р »РЎРЉР Р…Р С•Р С–Р С• Р С—РЎР‚Р С•Р С‘Р В·Р Р…Р С•РЎв‚¬Р ВµР Р…Р С‘РЎРЏ","РЎвЂЎРЎвЂљР С• РЎвЂљР В°Р С”Р С•Р Вµ РЎвЂљР ВµРЎРѓРЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р С—РЎР‚Р С•Р С–РЎР‚Р В°Р СР СР Р…Р С•Р С–Р С• Р С•Р В±Р ВµРЎРѓР С—Р ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ"
        ],
        "en": [
            "DL methods","what is AI","what is DL","what is ML","what is API","what are loops",
            "voice exercises","what is protocol","how to get it job","what are big data","what is framework",
            "how to read faster","learn how to learn","learn to improvise","what are processes","what are variables",
            "what is a Database","what is blockchain","what is clean code","breathing exercises","coding fundamentals",
            "how to learn Python","how to start coding","improve speech rate","cybersecurity basics","how to code for free",
            "how to find a mentor","public speaking tips","what is a native app","what is an algorithm","what is web scraping",
            "develop better memory","how to create website","how to cure a stutter","how to improve speech","improve voice quality",
            "overcome stage fright","speed reading methods","what is cybersecurity","what is network layer","articulation exercises",
            "causes of speech delay","design patterns basics","develop attention span","how to improve diction","how to memorize a poem",
            "how to stop stuttering","mobile app development","problem based learning","UI design fundamentals","what are microservices",
            "what is git and GitHub","what is virtualization","cloud services overview","expand vocabulary words","fluent speech exercises",
            "how to choose it career","how to set up workspace","how to train your voice","how to write first code","improve time management",
            "Java programming basics","pronunciation exercises","software testing basics","what is an API endpoint","what is cloud computing",
            "what is computer vision","what is neural networks","what is version control","what is virtual reality","AI text generation tools",
            "computer networks basics","develop listening skills","how to build mobile apps","how to fix speech errors","how to learn effectively",
            "improve memory retention","spaced repetition method","speak clearly articulate","speech clarity exercises","what is a neural network",
            "what is a smart contract","what is cloud technology","what is containerization","what is software testing","best books on programming",
            "develop creative thinking","develop speech confidence","eliminate accent patterns","how to become a developer","how to learn english fast",
            "how to prepare for school","improve punctuation usage","Python programming basics","what is a DevOps engineer","what is microarchitecture",
            "active learning strategies","backend development basics","exercises for clear speech","memory tricks for students","overcome language barriers",
            "pros and cons of elearning","SQL tutorial for beginners","vocal breathing techniques","what are quantum computers","what is a quantum computer",
            "what is internet of things","computational theory basics","develop analytical thinking","develop speaking confidence","frontend development basics",
            "improve concentration focus","language games for toddlers","latest trends in technology","Python basics for beginners","adaptive learning strategies",
            "best coding bootcamps online","building a childs vocabulary","Database design fundamentals","develop communication skills","front end development basics",
            "game based learning for kids","how to build self confidence","how to correct speech sounds","how to increase mental focus","improving grammar in writing",
            "interactive learning methods","presentation skills training","web development fundamentals","what is cloud infrastructure","what is low code development",
            "what is reactive programming","back end development tutorial","confidence speaking exercises","critical thinking development","educational apps for toddlers",
            "experiential learning methods","improve written communication","information retention methods","memory development techniques","narrative learning approaches",
            "speech therapy games for kids","systems administration basics","what is blockchain technology","frameworks for web development","how to boost creative thinking",
            "how to manage time effectively","what is full stack development","application architecture basics","school readiness speech therapy","teaching kids a second language",
            "what is a programming algorithm","what is Docker containerization","articulation therapy for r sound","at home speech therapy exercises",
            "constructivist learning approach","gamification learning strategies","how to improve spatial reasoning","mnemonics for memory improvement",
            "organize information effectively","user interface design principles","dysarthria symptoms and treatment","adult stuttering treatment options",
            "how to learn multiplication tables","speech sound disorders in children","what are graphics processing units","what is microservices architecture",
            "articulation exercises for children","effective study methods for college","programming languages for beginners","how to develop mathematical thinking",
            "techniques for memorizing vocabulary","correcting written language disorders","data structures and algorithms basics","developing expressive language skills",
            "fast learning techniques for students","how to develop emotional intelligence","voice disorders causes and prevention","skills needed for software engineering",
            "speed reading techniques for beginners","brainstorming techniques for innovation","most popular programming languages 2024",
            "preschool speech development activities","fine motor skills development activities","phonological awareness activities for kids"
        ],
        "kz": [
            "Р В°Р в„–РўвЂєРЎвЂ№Р Р… РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“","Р В¶Р В°Р Т‘РЎвЂ№Р Р…РЎвЂ№ Р Т‘Р В°Р СРЎвЂ№РЎвЂљРЎС“","Р Р…Р В°Р В·Р В°РЎР‚Р Т‘РЎвЂ№ Р Т‘Р В°Р СРЎвЂ№РЎвЂљРЎС“","API Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р С”Р С•Р Т‘РЎвЂљР В°РЎС“ Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“",
            "Р Т‘Р В°РЎС“РЎвЂ№РЎРѓ Р В¶Р В°РЎвЂљРЎвЂљРЎвЂ№РўвЂњРЎС“Р »Р В°РЎР‚РЎвЂ№","Р С•РўвЂєРЎС“Р Т‘РЎвЂ№ Р С•РўвЂєРЎС“Р Т‘РЎвЂ№ РўР‡Р в„–РЎР‚Р ВµР Р…РЎС“","UI Р Т‘Р С‘Р В·Р В°Р в„–Р Р… Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“","Р В¶РЎвЂ№Р »Р Т‘Р В°Р С Р С•РўвЂєРЎС“ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“",
            "Р В°Р в„–РЎвЂљРЎвЂ№Р »РЎвЂ№Р СРЎвЂ№Р Р… Р В¶РўВ±Р СРЎРѓР В°Р С— Р ВµРЎвЂљРЎС“","РЎРѓРЎвЂ№Р Р… РЎвЂљРўВ±РЎР‚РўвЂњРЎвЂ№РЎРѓРЎвЂ№Р Р…Р В°Р Р… Р С•Р в„–Р »Р В°РЎС“","РЎРѓРЈВ©Р В·Р Т‘РЎвЂ“Р С” РўвЂєР С•РЎР‚РЎвЂ№Р Р… Р С”Р ВµРўР€Р ВµР в„–РЎвЂљРЎС“","РЎвЂљР В°Р В· Р С”Р С•Р Т‘ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "РЎвЂљР ВµРЎР‚Р ВµРўР€ Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","РЎвЂ Р С‘Р С”Р »Р Т‘Р В°РЎР‚ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р В°Р »Р С–Р С•РЎР‚Р С‘РЎвЂљР С Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р В±Р »Р С•Р С”РЎвЂЎР ВµР в„–Р Р… Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "Р Р†Р ВµР В±-РЈв„ўР В·РЎвЂ“РЎР‚Р »Р ВµРЎС“ Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“","Р Т‘Р В°РЎС“РЎвЂ№РЎРѓ РЎРѓР В°Р С—Р В°РЎРѓРЎвЂ№Р Р… Р В°РЎР‚РЎвЂљРЎвЂљРЎвЂ№РЎР‚РЎС“","Р ВµРЎРѓРЎвЂљРЎвЂ“ Р Т‘Р В°Р СРЎвЂ№РЎвЂљРЎС“ РЎвЂљР ВµРЎвЂ¦Р Р…Р С‘Р С”Р В°РЎРѓРЎвЂ№","Р С•Р В±Р »Р В°РўвЂє РЎРѓР ВµРЎР‚Р Р†Р С‘РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“ РЎв‚¬Р С•Р »РЎС“",
            "Р С—РЎР‚Р С•РЎвЂљР С•Р С”Р С•Р » Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р С—РЎС“Р Р…Р С”РЎвЂљРЎС“Р В°РЎвЂ Р С‘РЎРЏР Р…РЎвЂ№ Р В¶Р В°РўвЂєРЎРѓР В°РЎР‚РЎвЂљРЎС“","РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“ РЎРѓР ВµР Р…РЎвЂ“Р СРЎвЂ“Р Р… Р Т‘Р В°Р СРЎвЂ№РЎвЂљРЎС“","РЎвЂљР ВµРЎР‚Р ВµРўР€ Р СР В°РЎв‚¬Р С‘Р Р…Р В°Р »РЎвЂ№РўвЂє Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“",
            "РЎвЂљРЎвЂ№Р Р…РЎвЂ№РЎРѓ Р В°Р »РЎС“ Р В¶Р В°РЎвЂљРЎвЂљРЎвЂ№РўвЂњРЎС“Р »Р В°РЎР‚РЎвЂ№","Р В°Р С”РЎвЂ Р ВµР Р…РЎвЂљРЎвЂљРЎвЂ“ Р В¶Р С•РЎР‹РЎС“ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","Р Р†Р ВµР В±-РЎРѓР В°Р в„–РЎвЂљ РўвЂєРўВ±РЎР‚РЎС“ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","Р Р…Р ВµР в„–РЎР‚Р С•Р В¶Р ВµР »РЎвЂ“ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "РЎРѓР В°РЎвЂ¦Р В°РЎР‚Р В°РЎС“ РўвЂєР В°РЎвЂљРЎвЂ№Р Р…Р В°РЎРѓРЎвЂ№Р Р… Р В¶Р ВµРўР€РЎС“","РЎвЂљР С‘РЎвЂ“Р СР Т‘РЎвЂ“ Р С•РўвЂєРЎвЂ№РЎвЂљРЎвЂ№РўР€ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","РЎвЂљРЎвЂ“Р » Р В±Р В°РЎР‚РЎРЉР ВµРЎР‚РЎвЂ“Р Р…Р Вµ РЎвЂљРўР‡РЎРѓ Р В±Р С•Р »РЎС“","РЎС“Р В°РўвЂєРЎвЂ№РЎвЂљРЎвЂљРЎвЂ№ РЎвЂљР С‘РЎвЂ“Р СР Т‘РЎвЂ“ Р В±Р В°РЎРѓРўвЂєР В°РЎР‚РЎС“",
            "РЎвЂћРЎР‚Р ВµР в„–Р СР Р†Р С•РЎР‚Р С” Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","РўВ±РЎРѓРЎвЂ№Р Р…РЎС“ Р Т‘Р В°РўвЂњР Т‘РЎвЂ№Р »Р В°РЎР‚РЎвЂ№Р Р… Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“","spaced repetition РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂ“","Р В°Р в„–Р Р…РЎвЂ№Р СР В°Р »РЎвЂ№РЎРѓРЎвЂ№ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "Р С‘РЎвЂљ РЎРѓР В°Р »Р В°РЎРѓРЎвЂ№Р Р…Р Т‘Р В° Р В¶РўВ±Р СРЎвЂ№РЎРѓ РЎвЂљР В°Р В±РЎС“","Р С•Р в„–РЎвЂ№Р Р… РўвЂєР С•Р В·РўвЂњР В°РЎС“ РЎвЂљР ВµРЎвЂ¦Р Р…Р С‘Р С”Р В°Р »Р В°РЎР‚РЎвЂ№","Р С—РЎР‚Р С•РЎвЂ Р ВµРЎРѓРЎРѓРЎвЂљР ВµРЎР‚ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","РЎвЂљР ВµР С–РЎвЂ“Р Р… Р С”Р С•Р Т‘ Р В¶Р В°Р В·РЎС“Р Т‘РЎвЂ№ РўР‡Р в„–РЎР‚Р ВµР Р…РЎС“",
            "өлеңді қалай жаттап алу","алғашқы кодты қалай жазу","беглі сөйлеу жаттығулары","бэкенд әзірлеу негіздері",
            "Р В¶Р В°Р В·Р В±Р В° РўвЂєР В°РЎвЂљРЎвЂ№Р Р…Р В°РЎРѓРЎвЂ№Р Р… Р В¶Р В°РўвЂєРЎРѓР В°РЎР‚РЎвЂљРЎС“","Р В¶Р ВµР »РЎвЂ“ РўвЂєР В°Р В±Р В°РЎвЂљРЎвЂ№ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р В¶РўР‡РЎР‚Р С–РЎвЂ“Р Р…Р Т‘РЎвЂ“Р С” Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","Р С‘Р СР С—РЎР‚Р С•Р Р†Р С‘Р В·Р Вµ РЎвЂ“РЎРѓРЎвЂљР ВµРЎС“Р Т‘РЎвЂ“ РўР‡Р в„–РЎР‚Р ВµР Р…РЎС“",
            "Р СР С‘Р С”РЎР‚Р С•РЎРѓР ВµРЎР‚Р Р†Р С‘РЎРѓ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р СР С•Р В±Р С‘Р »РЎРЉР Т‘РЎвЂ“ РўвЂєР С•РЎРѓРЎвЂ№Р СРЎв‚¬Р В° РЈв„ўР В·РЎвЂ“РЎР‚Р »Р ВµРЎС“","Р СРЈв„ўР »РЎвЂ“Р СР ВµРЎвЂљРЎвЂљР ВµРЎР‚Р Т‘РЎвЂ“ РўВ±Р в„–РЎвЂ№Р СР Т‘Р В°РЎРѓРЎвЂљРЎвЂ№РЎР‚РЎС“","РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“ РўвЂєР В°РЎР‚РўвЂєРЎвЂ№Р Р…РЎвЂ№Р Р… Р В¶Р В°РўвЂєРЎРѓР В°РЎР‚РЎвЂљРЎС“",
            "РЎвЂљР ВµРЎР‚Р ВµРўР€ Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","РЎвЂљРЎвЂ№РўР€Р Т‘Р В°РЎС“ Р Т‘Р В°РўвЂњР Т‘РЎвЂ№Р »Р В°РЎР‚РЎвЂ№Р Р… Р Т‘Р В°Р СРЎвЂ№РЎвЂљРЎС“","РўР‡Р в„–Р Т‘Р Вµ Р »Р С•Р С–Р С•Р С—Р ВµР Т‘ Р В¶Р В°РЎвЂљРЎвЂљРЎвЂ№РўвЂњРЎС“Р »Р В°РЎР‚РЎвЂ№","Р В°РЎС“РЎвЂ№РЎРѓРЎвЂ№Р Р…Р Т‘РЎвЂ№ РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“ Р С”Р ВµРўР€Р ВµРЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“",
            "Р В±РЎРЊР С”Р ВµР Р…Р Т‘ РЎР‚Р В°Р В·РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р В° Р С•РўвЂєРЎС“Р »РЎвЂ№РўвЂњРЎвЂ№","Р Т‘Р В°РЎС“РЎвЂ№РЎРѓ РЎвЂљРЎвЂ№Р Р…РЎвЂ№РЎРѓ Р В°Р »РЎС“ РЎвЂљР ВµРЎвЂ¦Р Р…Р С‘Р С”Р В°РЎРѓРЎвЂ№","Р С”РЎР‚Р ВµР В°РЎвЂљР С‘Р Р†РЎвЂљРЎвЂ“Р С” Р С•Р в„–Р »Р В°РЎС“Р Т‘РЎвЂ№ Р Т‘Р В°Р СРЎвЂ№РЎвЂљРЎС“","Р СР ВµР С”РЎвЂљР ВµР С—Р С”Р Вµ Р Т‘Р В°Р в„–РЎвЂ№Р Р…Р Т‘РЎвЂ№РўвЂє Р »Р С•Р С–Р С•Р С—Р ВµР Т‘",
            "Р СРЈв„ўР »РЎвЂ“Р СР ВµРЎвЂљРЎвЂљРЎвЂ“ РЎРѓР В°РўвЂєРЎвЂљР В°РЎС“ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","Р СРЈв„ўРЎРѓР ВµР »Р ВµР Р…РЎвЂ“РўР€ Р Р…Р ВµР С–РЎвЂ“Р В·РЎвЂ“Р Р…Р Т‘Р Вµ Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“","РЎвЂљРўР‡Р Р…Р Т‘РЎвЂ“Р С–РЎвЂ“Р Р… Р В±Р ВµРЎР‚РЎС“ Р В¶Р В°РЎвЂљРЎвЂљРЎвЂ№РўвЂњРЎС“Р »Р В°РЎР‚РЎвЂ№","РЎС“Р В°РўвЂєРЎвЂ№РЎвЂљ Р В±Р В°РЎРѓРўвЂєР В°РЎР‚РЎвЂ№РЎРѓРЎвЂ№Р Р… Р В¶Р В°РўвЂєРЎРѓР В°РЎР‚РЎвЂљРЎС“",
            "Р Р†Р ВµР В± РЎРѓР С”РЎР‚Р ВµР в„–Р С—Р С‘Р Р…Р С– Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р Р†Р С‘РЎР‚РЎвЂљРЎС“Р В°Р »Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р ВµРЎРѓР ВµР С—РЎвЂљР ВµРЎС“ РЎвЂљР ВµР С•РЎР‚Р С‘РЎРЏРЎРѓРЎвЂ№ Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“","Р В¶Р В°Р Т‘РЎвЂ№Р Р…РЎвЂ№ Р В°РЎР‚РЎвЂљРЎвЂљРЎвЂ№РЎР‚РЎС“ РЎвЂљР ВµРЎвЂ¦Р Р…Р С‘Р С”Р В°Р »Р В°РЎР‚РЎвЂ№",
            "Р С‘РЎвЂљ Р СР В°Р СР В°Р Р…Р Т‘РЎвЂ№РўвЂњРЎвЂ№Р Р… РўвЂєР В°Р »Р В°Р в„– РЎвЂљР В°РўР€Р Т‘Р В°РЎС“","Р С”Р С‘Р В±Р ВµРЎР‚РўвЂєР В°РЎС“РЎвЂ“Р С—РЎРѓРЎвЂ“Р В·Р Т‘РЎвЂ“Р С” Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“","РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“ РЎРѓР ВµР Р…РЎвЂ“Р СР Т‘РЎвЂ“ Р В¶Р В°РЎвЂљРЎвЂљРЎвЂ№РўвЂњРЎС“Р »Р В°РЎР‚РЎвЂ№","РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“ РЎРѓР ВµР Р…РЎвЂ“Р СР Т‘РЎвЂ“Р »РЎвЂ“Р С–РЎвЂ“Р Р… Р Т‘Р В°Р СРЎвЂ№РЎвЂљРЎС“",
            "РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“Р Т‘РЎвЂ“ Р В¶Р В°РўвЂєРЎРѓР В°РЎР‚РЎвЂљРЎС“ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","РЎвЂћРЎР‚Р С•Р Р…РЎвЂљР ВµР Р…Р Т‘ РЈв„ўР В·РЎвЂ“РЎР‚Р »Р ВµРЎС“ Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“","РЎРЊР СР С—Р С‘РЎР‚Р С‘Р С”Р В°Р »РЎвЂ№РўвЂє Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","Java Р С—РЎР‚Р С•Р С–РЎР‚Р В°Р СР СР В°Р »Р В°РЎС“ Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“",
            "Р В°Р Р…Р В°Р »Р С‘РЎвЂљР С‘Р С”Р В°Р »РЎвЂ№РўвЂє Р С•Р в„–Р »Р В°РЎС“Р Т‘РЎвЂ№ Р Т‘Р В°Р СРЎвЂ№РЎвЂљРЎС“","Р В°РўвЂњРЎвЂ№Р »РЎв‚¬РЎвЂ№Р Р… РЎвЂљРЎвЂ“Р »РЎвЂ“Р Р… Р В¶РЎвЂ№Р »Р Т‘Р В°Р С РўР‡Р в„–РЎР‚Р ВµР Р…РЎС“","Р В±Р ВµР в„–РЎвЂ“Р СР Т‘РЎвЂ“ Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“ РЎРѓРЎвЂљРЎР‚Р В°РЎвЂљР ВµР С–Р С‘РЎРЏР »Р В°РЎР‚РЎвЂ№","Р Т‘Р В°РЎС“РЎвЂ№РЎРѓ Р В±РўВ±Р В·РЎвЂ№Р »РЎС“Р »Р В°РЎР‚РЎвЂ№Р Р… Р В°Р »Р Т‘РЎвЂ№Р Р… Р В°Р »РЎС“",
            "Р Т‘Р С‘Р В·Р В°Р в„–Р Р… РЎв‚¬Р В°Р В±Р »Р С•Р Р…Р Т‘Р В°РЎР‚РЎвЂ№ Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“","Р С‘Р Р…РЎвЂљР ВµРЎР‚Р В°Р С”РЎвЂљР С‘Р Р†РЎвЂљРЎвЂ“ Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","Р С”Р С•Р СР С—РЎРЉРЎР‹РЎвЂљР ВµРЎР‚Р »РЎвЂ“Р С” Р В¶Р ВµР »РЎвЂ“ Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“","Р С•Р В±Р »Р В°РўвЂє Р ВµРЎРѓР ВµР С—РЎвЂљР ВµРЎС“РЎвЂ“ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "РЎРѓР В°РЎвЂ¦Р Р…Р В° РўвЂєР С•РЎР‚РўвЂєРЎвЂ№Р Р…РЎвЂ№РЎв‚¬РЎвЂ№Р Р… РўвЂєР В°Р »Р В°Р в„– Р В¶Р ВµРўР€РЎС“","РЎРѓР СР В°РЎР‚РЎвЂљ Р С”Р С•Р Р…РЎвЂљРЎР‚Р В°Р С”РЎвЂљ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“ Р С”Р ВµРЎв‚¬РЎвЂ“Р С–РЎС“РЎвЂ“Р Р…РЎвЂ“РўР€ РЎРѓР ВµР В±Р ВµР С—РЎвЂљР ВµРЎР‚РЎвЂ“","РўР‡Р »Р С”Р ВµР Р… Р Т‘Р ВµРЎР‚Р ВµР С”РЎвЂљР ВµРЎР‚ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "Р В°Р в„–РўвЂєРЎвЂ№Р Р… РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“ РўР‡РЎв‚¬РЎвЂ“Р Р… Р В¶Р В°РЎвЂљРЎвЂљРЎвЂ№РўвЂњРЎС“Р »Р В°РЎР‚","Р В±Р В°Р »Р В°Р Р…РЎвЂ№РўР€ РЎРѓРЈВ©Р В·Р Т‘РЎвЂ“Р С” РўвЂєР С•РЎР‚РЎвЂ№Р Р… Р С”Р ВµРўР€Р ВµР в„–РЎвЂљРЎС“","Р В±РўВ±Р »РЎвЂљРЎвЂљРЎвЂ№РўвЂє Р ВµРЎРѓР ВµР С—РЎвЂљР ВµРЎС“ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р С–Р С‘РЎвЂљ Р В¶РЈв„ўР Р…Р Вµ Р С–Р С‘РЎвЂљРЎвЂ¦Р В°Р В± Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "Р Т‘Р ВµР Р†Р С•Р С—РЎРѓ Р С‘Р Р…Р В¶Р ВµР Р…Р ВµРЎР‚РЎвЂ“ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р С”Р С•Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂљР С‘Р Р†РЎвЂљРЎвЂ“ Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","Р С”Р С•Р Р…РЎвЂљР ВµР в„–Р Р…Р ВµРЎР‚Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р СР В°РЎв‚¬Р С‘Р Р…Р В°Р »РЎвЂ№РўвЂє Р С•РўвЂєРЎвЂ№РЎвЂљРЎС“ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "Р СР ВµР Р…РЎвЂљР С•РЎР‚Р Т‘РЎвЂ№ РўвЂєР В°Р »Р В°Р в„– РЎвЂљР В°Р В±РЎС“РўвЂњР В° Р В±Р С•Р »Р В°Р Т‘РЎвЂ№","Р Р…Р В°РЎвЂљР С‘Р Р†РЎвЂљРЎвЂ“ РўвЂєР С•РЎРѓРЎвЂ№Р СРЎв‚¬Р В° Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","РЎР‚ Р В¶РЈв„ўР Р…Р Вµ Р » Р Т‘РЎвЂ№Р В±РЎвЂ№РЎРѓРЎвЂљР В°РЎР‚РЎвЂ№Р Р… Р Т‘РўВ±РЎР‚РЎвЂ№РЎРѓРЎвЂљР В°РЎС“","РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“ Р В°Р в„–РўвЂєРЎвЂ№Р Р…Р Т‘РЎвЂ№РўвЂњРЎвЂ№ Р В¶Р В°РЎвЂљРЎвЂљРЎвЂ№РўвЂњРЎС“Р »Р В°РЎР‚РЎвЂ№",
            "РЎвЂљРўР‡Р в„–РЎвЂ“Р »РЎС“РЎР‚РЎС“Р Т‘РЎвЂ“ РўвЂєР В°Р »Р В°Р в„– Р ВµР СР Т‘Р ВµРЎС“ Р С”Р ВµРЎР‚Р ВµР С”","Python Р С—РЎР‚Р С•Р С–РЎР‚Р В°Р СР СР В°Р »Р В°РЎС“ Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“","Р В±Р В°Р »Р В°Р »Р В°РЎР‚РўвЂњР В° Р ВµР С”РЎвЂ“Р Р…РЎв‚¬РЎвЂ“ РЎвЂљРЎвЂ“Р »Р Т‘РЎвЂ“ РўР‡Р в„–РЎР‚Р ВµРЎвЂљРЎС“","Р Р†Р С‘РЎР‚РЎвЂљРЎС“Р В°Р »Р Т‘РЎвЂ№ РЎв‚¬РЎвЂ№Р Р…Р Т‘РЎвЂ№РўвЂє Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "Р В¶РЎвЂ№Р »Р Т‘Р В°Р С Р С•РўвЂєРЎС“ РЎвЂљР ВµРЎвЂ¦Р Р…Р С‘Р С”Р В°РЎРѓРЎвЂ№ РЈв„ўР Т‘РЎвЂ“РЎРѓРЎвЂљР ВµРЎР‚РЎвЂ“","Р В¶РўВ±Р СРЎвЂ№РЎРѓ Р С•РЎР‚Р Р…РЎвЂ№Р Р… РўвЂєР В°Р »Р В°Р в„– РўВ±Р в„–РЎвЂ№Р СР Т‘Р В°РЎРѓРЎвЂљРЎвЂ№РЎР‚РЎС“","Р В·Р В°РЎвЂљРЎвЂљР В°РЎР‚ Р С‘Р Р…РЎвЂљР ВµРЎР‚Р Р…Р ВµРЎвЂљРЎвЂ“ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р С”Р С‘Р В±Р ВµРЎР‚РўвЂєР В°РЎС“РЎвЂ“Р С—РЎРѓРЎвЂ“Р В·Р Т‘РЎвЂ“Р С” Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "Р С”Р С•Р Т‘ Р В¶Р В°Р В·РЎС“Р Т‘РЎвЂ№ РўвЂєР В°Р »Р В°Р в„– Р В±Р В°РЎРѓРЎвЂљР В°РЎС“ Р С”Р ВµРЎР‚Р ВµР С”","Р С”РЈВ©Р В±Р ВµР в„–РЎвЂљРЎС“ Р С”Р ВµРЎРѓРЎвЂљР ВµРЎРѓРЎвЂ“Р Р… РўвЂєР В°Р »Р В°Р в„– РўР‡Р в„–РЎР‚Р ВµР Р…РЎС“","Р СР ВµР С”РЎвЂљР ВµР С—Р С”Р Вµ Р Т‘Р ВµР в„–РЎвЂ“Р Р…Р С–РЎвЂ“ РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“ Р Т‘Р В°Р СРЎС“РЎвЂ№","Р СР С‘Р С”РЎР‚Р С•Р В°РЎР‚РЎвЂ¦Р С‘РЎвЂљР ВµР С”РЎвЂљРЎС“РЎР‚Р В° Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ",
            "Р Р…РўВ±РЎРѓРўвЂєР В°РЎРѓРЎвЂ№Р Р… Р В±Р В°РЎРѓРўвЂєР В°РЎР‚РЎС“ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р С—Р С‘РЎвЂљР С•Р Р…Р Т‘РЎвЂ№ РўвЂєР В°Р »Р В°Р в„– РўР‡Р в„–РЎР‚Р ВµР Р…РЎС“Р С–Р Вµ Р В±Р С•Р »Р В°Р Т‘РЎвЂ№","РЎРѓРЈВ©Р в„–Р »Р ВµРЎС“ РўвЂєР В°РЎвЂљР ВµР »Р ВµРЎР‚РЎвЂ“Р Р… РўвЂєР В°Р »Р В°Р в„– РЎвЂљРўР‡Р В·Р ВµРЎвЂљРЎС“","РЎвЂћРЎР‚Р С•Р Р…РЎвЂљР ВµР Р…Р Т‘ РЎР‚Р В°Р В·РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р В° Р Р…Р ВµР С–РЎвЂ“Р В·Р Т‘Р ВµРЎР‚РЎвЂ“",
            "РўвЂєР В°Р »Р В°Р в„– Р В¶РЎвЂ№Р »Р Т‘Р В°Р СРЎвЂ№РЎР‚Р В°РўвЂє Р С•РўвЂєРЎС“РўвЂњР В° Р В±Р С•Р »Р В°Р Т‘РЎвЂ№","Р Т‘Р С‘Р В·Р В°РЎР‚РЎвЂљРЎР‚Р С‘РЎРЏ Р В±Р ВµР »Р С–РЎвЂ“Р »Р ВµРЎР‚РЎвЂ“ Р В¶РЈв„ўР Р…Р Вµ Р ВµР СР Т‘Р ВµРЎС“","Р В¶Р В°Р В·Р В±Р В°РЎв‚¬Р В° РЎвЂљРЎвЂ“Р » Р В±РўВ±Р В·РЎвЂ№Р »РЎС“Р »Р В°РЎР‚РЎвЂ№Р Р… РЎвЂљРўР‡Р В·Р ВµРЎвЂљРЎС“","Р В¶Р В°Р В·РЎС“Р Т‘Р В°РўвЂњРЎвЂ№ Р С–РЎР‚Р В°Р СР СР В°РЎвЂљР С‘Р С”Р В°Р Р…РЎвЂ№ Р В¶Р В°РўвЂєРЎРѓР В°РЎР‚РЎвЂљРЎС“",
            "Р В¶Р В°РЎРѓР В°Р Р…Р Т‘РЎвЂ№ Р С‘Р Р…РЎвЂљР ВµР »Р »Р ВµР С”РЎвЂљ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р В·Р ВµР в„–РЎвЂ“Р Р…Р Т‘РЎвЂ“ РўвЂєР В°Р »Р В°Р в„– Р В°РЎР‚РЎвЂљРЎвЂљРЎвЂ№РЎР‚РЎС“РўвЂњР В° Р В±Р С•Р »Р В°Р Т‘РЎвЂ№","Р С”Р С‘Р В±Р ВµРЎР‚ РўвЂєР В°РЎС“РЎвЂ“Р С—РЎРѓРЎвЂ“Р В·Р Т‘РЎвЂ“Р С” Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р С”Р С•Р СР СРЎС“Р Р…Р С‘Р С”Р В°РЎвЂ Р С‘РЎРЏ Р Т‘Р В°РўвЂњР Т‘РЎвЂ№Р »Р В°РЎР‚РЎвЂ№Р Р… Р Т‘Р В°Р СРЎвЂ№РЎвЂљРЎС“",
            "Р С”Р С•Р СР С—РЎРЉРЎР‹РЎвЂљР ВµРЎР‚Р »РЎвЂ“Р С” Р С”РЈВ©РЎР‚РЎС“ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р С”РЎР‚Р ВµР В°РЎвЂљР С‘Р Р†РЎвЂљРЎвЂ“ Р С•Р в„–Р »Р В°РЎС“Р Т‘РЎвЂ№ РўвЂєР В°Р »Р В°Р в„– Р Т‘Р В°Р СРЎвЂ№РЎвЂљРЎС“","Р »Р С•РЎС“Р С”Р С•Р Т‘ РЎР‚Р В°Р В·РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р В° Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ","Р СРЈв„ўР »РЎвЂ“Р СР ВµРЎвЂљРЎвЂљР ВµРЎР‚ Р В±Р В°Р В·Р В°РЎРѓРЎвЂ№ Р Т‘Р ВµР С–Р ВµР Р…РЎвЂ“Р СРЎвЂ“Р В· Р Р…Р Вµ"
        ]
    };

    // Р С›Р В±РЎР‰Р ВµР Т‘Р С‘Р Р…РЎРЏР ВµР С Р Р†РЎРѓР Вµ РЎвЂљРЎР‚Р С‘ РЎРЏР В·РЎвЂ№Р С”Р В° Р Р† Р С•Р Т‘Р С‘Р Р… Р СР В°РЎРѓРЎРѓР С‘Р Р†
    const autocompleteDB = [
        ...generatedData.ru,
        ...generatedData.en,
        ...generatedData.kz
    ];

    // ---- DOM РЎРЊР »Р ВµР СР ВµР Р…РЎвЂљРЎвЂ№ ----
    const userInput = document.getElementById('userInput');
    const ghostText = document.getElementById('ghostText');
    const dropdown = document.getElementById('suggestionsDropdown');
    const suggestionsList = document.getElementById('suggestionsList');
    const chatHeader = document.getElementById('animatedChatHeader');
    const welcomeScreen = document.getElementById('welcomeScreen');

    if (!userInput) return; // Р вЂР ВµР В·Р С•Р С—Р В°РЎРѓР Р…РЎвЂ№Р в„– Р Р†РЎвЂ№РЎвЂ¦Р С•Р Т‘ Р ВµРЎРѓР »Р С‘ РЎРЊР »Р ВµР СР ВµР Р…РЎвЂљ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…

    let currentGhostSuggestion = '';
    let activeIndex = -1;
    let lastMatches = [];

    // ---- Поиск совпадений ----
    function findMatches(query) {
        if (!query || query.trim().length < 2) return [];
        const q = query.toLowerCase().trim();
        return autocompleteDB
            .filter(item => item.toLowerCase().startsWith(q))
            .slice(0, 2); // Р СљР В°Р С”РЎРѓР С‘Р СРЎС“Р С 2 Р С—Р С•Р Т‘РЎРѓР С”Р В°Р В·Р С”Р С‘
    }

    // ---- Обновить ghost text ----
    function updateGhostText(typed, suggestion) {
        if (!ghostText) return;
        if (suggestion && suggestion.toLowerCase().startsWith(typed.toLowerCase()) && typed.length > 0) {
            const rest = suggestion.slice(typed.length);
            ghostText.innerHTML =
                `<span class="ghost-typed">${escapeHtml(typed)}</span>` +
                `<span class="ghost-suggestion">${escapeHtml(rest)}</span>`;
            currentGhostSuggestion = suggestion;
        } else {
            ghostText.innerHTML = '';
            currentGhostSuggestion = '';
        }
    }

    // ---- Рендер dropdown ----
    function renderDropdown(matches, typed) {
        if (!dropdown || !suggestionsList) return;
        if (matches.length === 0) {
            dropdown.classList.remove('visible');
            return;
        }

        activeIndex = -1;
        suggestionsList.innerHTML = '';

        matches.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.setAttribute('data-index', idx);

            // Р СџР С•Р Т‘РЎРѓР Р†Р ВµРЎвЂЎР С‘Р Р†Р В°Р ВµР С РЎРѓР С•Р Р†Р С—Р В°Р Р†РЎв‚¬РЎС“РЎР‹ РЎвЂЎР В°РЎРѓРЎвЂљРЎРЉ
            const matchLen = typed.length;
            const matchPart = item.slice(0, matchLen);
            const restPart = item.slice(matchLen);

            div.innerHTML = `
                <i class="ph ph-magnifying-glass suggestion-icon"></i>
                <span>
                    <span class="suggestion-text-match">${escapeHtml(matchPart)}</span><span class="suggestion-text-rest">${escapeHtml(restPart)}</span>
                </span>
                <span class="tab-hint">Tab в†№</span>
            `;

            div.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Р СњР Вµ РЎРѓР Р…Р С‘Р СР В°Р ВµР С РЎвЂћР С•Р С”РЎС“РЎРѓ РЎРѓ textarea
                selectSuggestion(item);
            });

            suggestionsList.appendChild(div);
        });

        dropdown.classList.add('visible');
    }

    // ---- Р СџРЎР‚Р С‘Р СР ВµР Р…Р С‘РЎвЂљРЎРЉ Р Р†РЎвЂ№Р В±РЎР‚Р В°Р Р…Р Р…РЎС“РЎР‹ Р С—Р С•Р Т‘РЎРѓР С”Р В°Р В·Р С”РЎС“ ----
    function selectSuggestion(text) {
        if (!userInput) return;
        userInput.value = text;
        updateGhostText('', '');
        dropdown.classList.remove('visible');
        userInput.focus();

        // Р РЋРЎвЂљР В°Р Р†Р С‘Р С Р С”РЎС“РЎР‚РЎРѓР С•РЎР‚ Р Р† Р С”Р С•Р Р…Р ВµРЎвЂ 
        userInput.setSelectionRange(text.length, text.length);

        // Р С’Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚РЎС“Р ВµР С Р С”Р Р…Р С•Р С—Р С”РЎС“ Send
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.classList.add('active');

        // Р СћРЎР‚Р С‘Р С–Р С–Р ВµРЎР‚Р С‘Р С resize textarea
        userInput.dispatchEvent(new Event('input'));
    }

    // ---- Р С’Р Р…Р С‘Р СР В°РЎвЂ Р С‘РЎРЏ Р В·Р В°Р С–Р С•Р »Р С•Р Р†Р С”Р В° ----
    function setHeaderTyping(isTyping) {
        if (!chatHeader) return;
        if (isTyping) {
            chatHeader.classList.add('typing-active');
        } else {
            chatHeader.classList.remove('typing-active');
        }
    }

    // ---- Р вЂР ВµР В·Р С•Р С—Р В°РЎРѓР Р…Р С•Р Вµ РЎРЊР С”РЎР‚Р В°Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ HTML ----
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ---- Навигация по dropdown с клавиатуры ----
    function updateActiveItem() {
        const items = suggestionsList ? suggestionsList.querySelectorAll('.suggestion-item') : [];
        items.forEach((el, i) => {
            el.classList.toggle('keyboard-active', i === activeIndex);
        });
    }

    // ---- Основной обработчик ввода ----
    userInput.addEventListener('input', function() {
        const val = this.value;
        const isTyping = val.trim().length > 0;

        // Р С’Р Р…Р С‘Р СР В°РЎвЂ Р С‘РЎРЏ Р В·Р В°Р С–Р С•Р »Р С•Р Р†Р С”Р В°
        setHeaderTyping(isTyping && welcomeScreen && welcomeScreen.style.display !== 'none');

        if (!isTyping) {
            updateGhostText('', '');
            if (dropdown) dropdown.classList.remove('visible');
            return;
        }

        // Р ВРЎвЂ°Р ВµР С РЎРѓР С•Р Р†Р С—Р В°Р Т‘Р ВµР Р…Р С‘РЎРЏ
        const matches = findMatches(val);
        lastMatches = matches;

        // Ghost text - первое совпадение
        if (matches.length > 0) {
            updateGhostText(val, matches[0]);
        } else {
            updateGhostText('', '');
        }

        // Dropdown
        renderDropdown(matches, val);
    });

    // ---- Tab / ArrowDown / ArrowUp / Escape ----
    userInput.addEventListener('keydown', function(e) {
        const isDropdownVisible = dropdown && dropdown.classList.contains('visible');

        if (e.key === 'Tab') {
            // Tab - принять ghost suggestion
            if (currentGhostSuggestion) {
                e.preventDefault();
                selectSuggestion(currentGhostSuggestion);
            } else if (isDropdownVisible && lastMatches.length > 0) {
                e.preventDefault();
                selectSuggestion(lastMatches[0]);
            }
            return;
        }

        if (e.key === 'ArrowDown' && isDropdownVisible) {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, lastMatches.length - 1);
            updateActiveItem();
            if (activeIndex >= 0) updateGhostText(this.value, lastMatches[activeIndex]);
            return;
        }

        if (e.key === 'ArrowUp' && isDropdownVisible) {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, -1);
            updateActiveItem();
            if (activeIndex >= 0) updateGhostText(this.value, lastMatches[activeIndex]);
            return;
        }

        if (e.key === 'Enter' && isDropdownVisible && activeIndex >= 0) {
            e.preventDefault();
            selectSuggestion(lastMatches[activeIndex]);
            return;
        }

        if (e.key === 'Escape') {
            if (dropdown) dropdown.classList.remove('visible');
            updateGhostText('', '');
            activeIndex = -1;
            return;
        }

        if (e.key === 'ArrowRight') {
            // → стрелка вправо - принять ghost suggestion (как в браузере)
            if (currentGhostSuggestion && this.selectionStart === this.value.length) {
                e.preventDefault();
                selectSuggestion(currentGhostSuggestion);
            }
        }
    });

    // ---- Р —Р В°Р С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С dropdown Р С—РЎР‚Р С‘ Р С”Р »Р С‘Р С”Р Вµ Р Р†Р Р…Р Вµ Р ВµР С–Р С• ----
    document.addEventListener('click', function(e) {
        if (!dropdown) return;
        if (!dropdown.contains(e.target) && e.target !== userInput) {
            dropdown.classList.remove('visible');
            updateGhostText('', '');
        }
    });

    // ---- Сброс при очистке чата ----
    const origClearChat = window.clearChat;
    window.clearChat = function() {
        if (origClearChat) origClearChat();
        if (dropdown) dropdown.classList.remove('visible');
        updateGhostText('', '');
        if (chatHeader) chatHeader.classList.remove('typing-active');
    };

    console.log('[SOLIFON] Autocomplete system loaded — ' + autocompleteDB.length + ' entries');
})();


// ============================================================
// MENU FIX v4 РІР‚вЂќ document capture, no stopPropagation РІвЂ вЂ™ Р »Р В°Р СР С—Р В° РЎР‚Р В°Р В±Р С•РЎвЂљР В°Р ВµРЎвЂљ
// ============================================================
(function() {
    var _open = false;

    function _show() {
        var sb = document.getElementById('sidebar');
        if (!sb) return;
        _open = true;
        sb.style.cssText += ';transition:transform 0.4s cubic-bezier(0.16,1,0.3,1);transform:translateX(280px);';
        var bd = document.getElementById('__sbd__');
        if (!bd) {
            bd = document.createElement('div');
            bd.id = '__sbd__';
            bd.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:998;';
            bd.onclick = _hide;
            document.body.appendChild(bd);
        }
        bd.style.display = 'block';
    }

    function _hide() {
        var sb = document.getElementById('sidebar');
        if (!sb) return;
        _open = false;
        sb.style.transform = '';
        var bd = document.getElementById('__sbd__');
        if (bd) bd.style.display = 'none';
        var nt = document.getElementById('nav-toggle');
        if (nt) nt.checked = false;
    }

    // Capture Р Р…Р В° document РІР‚вЂќ РЎРѓРЎР‚Р В°Р В±Р В°РЎвЂљРЎвЂ№Р Р†Р В°Р ВµРЎвЂљ Р вЂќР С› Р Р†РЎРѓР ВµРЎвЂ¦ listeners Р Р…Р В° РЎРЊР »Р ВµР СР ВµР Р…РЎвЂљР Вµ
    // Р СњР вЂў Р Р†РЎвЂ№Р В·РЎвЂ№Р Р†Р В°Р ВµР С stopPropagation РІвЂ вЂ™ tubelight handler РЎР‚Р В°Р В±Р С•РЎвЂљР В°Р ВµРЎвЂљ РІвЂ вЂ™ Р »Р В°Р СР С—Р В° РЎР‚Р В°Р В±Р С•РЎвЂљР В°Р ВµРЎвЂљ РІСљвЂњ
    document.addEventListener('click', function(e) {
        var lbl = document.querySelector('label[for="nav-toggle"]');
        if (!lbl) return;
        if (e.target === lbl || lbl.contains(e.target)) {
            // Р вЂќР В°РЎвЂР С РЎРѓР С•Р В±РЎвЂ№РЎвЂљР С‘РЎР‹ Р С—РЎР‚Р С•Р в„–РЎвЂљР С‘ Р Т‘Р В°Р »РЎРЉРЎв‚¬Р Вµ (РЎвЂљРЎС“belight Р С•Р В±Р Р…Р С•Р Р†Р С‘РЎвЂљ Р »Р В°Р СР С—РЎС“)
            // Р СљРЎвЂ№ РЎвЂљР С•Р »РЎРЉР С”Р С• РЎС“Р С—РЎР‚Р В°Р Р†Р »РЎРЏР ВµР С Р Р†Р С‘Р Т‘Р С‘Р СР С•РЎРѓРЎвЂљРЎРЉРЎР‹ sidebar
            if (_open) { _hide(); } else { _show(); }
        }
    }, true); // capture = true, Р Р…Р С• Р вЂР вЂўР — stopPropagation

    // Р РЋР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ: Р С”Р С•Р С–Р Т‘Р В° openModal() РЎРѓР В±РЎР‚Р В°РЎРѓРЎвЂ№Р Р†Р В°Р ВµРЎвЂљ checkbox РІвЂ вЂ™ Р В·Р В°Р С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С sidebar
    document.addEventListener('DOMContentLoaded', function() {
        var nt = document.getElementById('nav-toggle');
        if (nt) {
            nt.addEventListener('change', function() {
                if (!nt.checked && _open) { _hide(); }
            });
        }
    });

    console.log('[SOLIFON] Menu fix v4 ready');
})();

// ====== EXPLORE PERSONALIZATION ======
window.handleAvatarUpload = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            localStorage.setItem('solifon_custom_avatar', dataUrl);
            document.getElementById('settingsAvatarPreview').src = dataUrl;
            window.applyCustomAvatar();
        };
        reader.readAsDataURL(file);
    }
};

window.applyCustomAvatar = function() {
    const avatarData = localStorage.getItem('solifon_custom_avatar');
    if (avatarData) {
        const preview = document.getElementById('settingsAvatarPreview');
        if (preview) preview.src = avatarData;
        
        // Update user message avatars in the chat history
        document.querySelectorAll('.user-message .mh-msg-avatar').forEach(el => {
            el.innerHTML = `<img src="${avatarData}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        });
        
        // Update regular user messages if we decide to add avatars to them
        document.querySelectorAll('.user-message .avatar-img').forEach(el => {
            el.src = avatarData;
            el.style.display = 'block';
        });
        
        // Save to window so new messages can pick it up
        window.userAvatarOverride = avatarData;
        
        // Also update sidebar avatar if it exists
        const sidebarAvatar = document.getElementById('userAvatar');
        if (sidebarAvatar) {
            sidebarAvatar.src = avatarData;
            sidebarAvatar.style.display = 'block';
        }
    }
};

window.currentViewBg = 'main';

window.setWallpaper = function(view, bg) {
    if (!view) view = 'main';
    localStorage.setItem('solifon_custom_wallpaper_' + view, bg);
    
    if (bg && bg !== 'none') {
        const currentTheme = localStorage.getItem('solifon_custom_theme');
        if (currentTheme !== 'glass' && currentTheme !== 'clear') {
            localStorage.setItem('solifon_custom_theme', 'glass');
        }
    }
    
    window.applyWallpaper(view);
    window.applyTheme();
};



window.handleWallpaperUpload = function(event, view) {
    if (!view) view = 'main';
    const file = event.target.files[0];
    if (file) {
        if (file.type.startsWith('video/')) {
            const videoUrl = URL.createObjectURL(file);
            // We set it but warn the user if they want since blob URLs don't survive refresh
            window.setWallpaper(view, `video:${videoUrl}`);
            alert('Обратите внимание: загруженное видео будет работать только до перезагрузки страницы. Для постоянного видеофона поместите файл рядом с index.html.');
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                const dataUrl = e.target.result;
                window.setWallpaper(view, `url(${dataUrl})`);
            };
            reader.readAsDataURL(file);
        }
    }
};

window.liveWallpaperAnimationId = null;

window.applyWallpaper = function(forceView) {
    const viewToApply = forceView || window.currentViewBg || 'main';
    let bg = localStorage.getItem('solifon_custom_wallpaper_' + viewToApply);
    if (!bg && viewToApply === 'main') {
        bg = localStorage.getItem('solifon_custom_wallpaper'); // fallback
    }
    
    // Stop any existing animation and remove canvas or video
    if (window.liveWallpaperAnimationId) {
        cancelAnimationFrame(window.liveWallpaperAnimationId);
        window.liveWallpaperAnimationId = null;
    }
    const oldCanvas = document.getElementById('live-wallpaper-canvas');
    if (oldCanvas) oldCanvas.remove();
    const oldVideo = document.getElementById('live-wallpaper-video');
    if (oldVideo) oldVideo.remove();

    // Create modal bg layer if not exists
    let modalBgLayer = document.getElementById('solifon_modal_bg_layer');
    if (!modalBgLayer) {
        modalBgLayer = document.createElement('div');
        modalBgLayer.id = 'solifon_modal_bg_layer';
        modalBgLayer.style.position = 'fixed';
        modalBgLayer.style.top = '0';
        modalBgLayer.style.left = '0';
        modalBgLayer.style.width = '100vw';
        modalBgLayer.style.height = '100vh';
        modalBgLayer.style.zIndex = '9998'; // Just behind modals (9999)
        modalBgLayer.style.pointerEvents = 'none';
        document.body.appendChild(modalBgLayer);
    }
    
    // Determine target container based on view
    const targetElement = (viewToApply === 'main') ? document.body : modalBgLayer;
    
    if (viewToApply === 'main' || !bg || bg === 'none') {
        modalBgLayer.style.display = 'none';
    } else {
        modalBgLayer.style.display = 'block';
        modalBgLayer.style.backgroundImage = 'none';
        modalBgLayer.style.backgroundColor = 'transparent';
    }

    if (bg && bg.startsWith('video:')) {
        const videoSrc = bg.replace('video:', '');
        targetElement.style.backgroundImage = 'none';
        targetElement.style.backgroundColor = '#000';
        
        const video = document.createElement('video');
        video.id = 'live-wallpaper-video';
        video.src = videoSrc;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.style.position = 'fixed';
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '100vw';
        video.style.height = '100vh';
        video.style.objectFit = 'cover';
        video.style.zIndex = (viewToApply === 'main') ? '-2' : '9998';
        video.style.pointerEvents = 'none';
        
        // Append to the appropriate layer
        if (viewToApply === 'main') {
            document.body.appendChild(video);
        } else {
            modalBgLayer.appendChild(video);
        }
    } else if (bg === 'live_leaves') {
        targetElement.style.backgroundImage = 'url("https://images.unsplash.com/photo-1476231682828-37e571bc172f?q=80&w=2564")'; // Autumn forest
        targetElement.style.backgroundSize = 'cover';
        targetElement.style.backgroundPosition = 'center';
        targetElement.style.backgroundAttachment = 'fixed';
        startFallingLeaves();
    } else if (bg === 'live_matrix') {
        targetElement.style.backgroundImage = 'none';
        targetElement.style.backgroundColor = '#050505';
        startMatrixRain();
    } else if (bg && bg !== 'none') {
        targetElement.style.backgroundImage = bg;
        targetElement.style.backgroundSize = 'cover';
        targetElement.style.backgroundPosition = 'center';
        targetElement.style.backgroundAttachment = 'fixed';
    } else {
        targetElement.style.backgroundImage = 'none';
        targetElement.style.backgroundColor = (viewToApply === 'main') ? '#000' : 'transparent';
    }
    
    // Update preview squares in settings dashboard
    ['main', 'whatsnew', 'about', 'sub'].forEach(v => {
        const sq = document.getElementById('preview_square_' + v);
        if (sq) {
            const vbg = localStorage.getItem('solifon_custom_wallpaper_' + v) || (v === 'main' ? localStorage.getItem('solifon_custom_wallpaper') : null);
            if (vbg && vbg.startsWith('url')) {
                sq.style.background = vbg + ' center/cover';
            } else if (vbg && vbg.startsWith('video:')) {
                sq.style.background = 'linear-gradient(45deg, #1e3c72, #2a5298)';
            } else if (vbg === 'live_leaves') {
                sq.style.background = 'url("https://images.unsplash.com/photo-1476231682828-37e571bc172f?q=80&w=400") center/cover';
            } else if (vbg === 'live_matrix') {
                sq.style.background = '#001100';
            } else {
                sq.style.background = '#0a0a0a';
            }
        }
    });
    
    // Update UI active states
    document.querySelectorAll('.wp-btn').forEach(btn => {
        const btnView = btn.dataset.view || 'main';
        const viewBg = localStorage.getItem('solifon_custom_wallpaper_' + btnView) || (btnView === 'main' ? localStorage.getItem('solifon_custom_wallpaper') : null);
        if (btn.dataset.wp === viewBg || (!viewBg && btn.dataset.wp === 'none')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

function startFallingLeaves() {
    const canvas = document.createElement('canvas');
    canvas.id = 'live-wallpaper-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-2';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });
    
    const leaves = [];
    for(let i=0; i<40; i++) {
        leaves.push({
            x: Math.random() * width,
            y: Math.random() * height - height,
            size: Math.random() * 12 + 8,
            speedY: Math.random() * 1.5 + 0.5,
            speedX: Math.random() * 2 - 1,
            angle: Math.random() * 360,
            spin: Math.random() * 3 - 1.5,
            color: `hsla(${Math.random() * 40 + 20}, ${Math.random() * 30 + 60}%, ${Math.random() * 20 + 40}%, ${Math.random() * 0.4 + 0.4})`
        });
    }
    
    let time = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        time += 0.01;
        
        leaves.forEach(leaf => {
            ctx.save();
            ctx.translate(leaf.x, leaf.y);
            ctx.rotate(leaf.angle * Math.PI / 180);
            
            ctx.fillStyle = leaf.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, leaf.size/2, leaf.size, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
            
            leaf.y += leaf.speedY;
            leaf.x += leaf.speedX + Math.sin(time + leaf.size) * 1.5;
            leaf.angle += leaf.spin;
            
            if (leaf.y > height + leaf.size) {
                leaf.y = -leaf.size;
                leaf.x = Math.random() * width;
            }
            if (leaf.x > width + leaf.size) leaf.x = -leaf.size;
            if (leaf.x < -leaf.size) leaf.x = width + leaf.size;
        });
        
        window.liveWallpaperAnimationId = requestAnimationFrame(draw);
    }
    draw();
}

function startMatrixRain() {
    const canvas = document.createElement('canvas');
    canvas.id = 'live-wallpaper-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-2';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+{}[]|:;"<>,.?/~`';
    const fontSize = 14;
    const columns = width / fontSize;
    const drops = [];
    
    for(let x = 0; x < columns; x++) {
        drops[x] = 1;
    }
    
    let lastDraw = 0;
    function draw(timestamp) {
        window.liveWallpaperAnimationId = requestAnimationFrame(draw);
        
        if (timestamp - lastDraw < 50) return;
        lastDraw = timestamp;
        
        ctx.fillStyle = 'rgba(5, 5, 5, 0.08)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px monospace';
        
        for(let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if(drops[i] * fontSize > height && Math.random() > 0.975)
                drops[i] = 0;
            
            drops[i]++;
        }
    }
    window.liveWallpaperAnimationId = requestAnimationFrame(draw);
}

window.setTheme = function(theme) {
    localStorage.setItem('solifon_custom_theme', theme);
    window.applyTheme();
};

window.applyTheme = function() {
    const theme = localStorage.getItem('solifon_custom_theme') || 'default';
    const mainContainer = document.querySelector('.main-content');
    if (!mainContainer) return;
    
    // Reset mainContainer to prevent any inner edge rendering bugs
    mainContainer.style.background = 'transparent';
    mainContainer.style.backdropFilter = 'none';
    mainContainer.style.webkitBackdropFilter = 'none';
    mainContainer.style.border = 'none';
    mainContainer.style.boxShadow = 'none';
    
    // Find or create a dedicated backdrop div
    let backdrop = document.getElementById('theme-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'theme-backdrop';
        backdrop.style.position = 'fixed';
        // Extend beyond viewport to hide the blur edge halo
        backdrop.style.top = '-50px';
        backdrop.style.left = '-50px';
        backdrop.style.right = '-50px';
        backdrop.style.bottom = '-50px';
        backdrop.style.zIndex = '-1'; // Behind app-layout
        backdrop.style.pointerEvents = 'none';
        document.body.prepend(backdrop);
    }
    
    if (theme === 'glass') {
        backdrop.style.background = 'rgba(0, 0, 0, 0.2)';
        backdrop.style.backdropFilter = 'blur(15px)';
        backdrop.style.webkitBackdropFilter = 'blur(15px)';
        backdrop.style.boxShadow = 'none';
    } else if (theme === 'clear') {
        backdrop.style.background = 'transparent';
        backdrop.style.backdropFilter = 'none';
        backdrop.style.webkitBackdropFilter = 'none';
        backdrop.style.boxShadow = 'none';
    } else if (theme === 'neon') {
        backdrop.style.background = 'rgba(10, 10, 10, 0.85)';
        backdrop.style.backdropFilter = 'blur(20px)';
        backdrop.style.webkitBackdropFilter = 'blur(20px)';
        backdrop.style.boxShadow = 'inset 0 0 150px rgba(192, 38, 211, 0.15)';
    } else {
        backdrop.style.background = '#0a0a0a';
        backdrop.style.backdropFilter = 'none';
        backdrop.style.webkitBackdropFilter = 'none';
        backdrop.style.boxShadow = 'none';
    }
    
    // Update UI active states
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

window.setModalStyle = function(style) {
    localStorage.setItem('solifon_custom_modal_style', style);
    window.applyModalStyle();
};

window.applyModalStyle = function() {
    const style = localStorage.getItem('solifon_custom_modal_style') || 'black';
    const modals = document.querySelectorAll('.custom-modal');
    
    modals.forEach(modal => {
        // Find modal-content inside this modal
        const content = modal.querySelector('.modal-content');
        if (!content) return;
        
        if (style === 'glass') {
            modal.style.setProperty('background', 'rgba(0, 0, 0, 0.4)', 'important');
            content.style.setProperty('background', 'rgba(20, 20, 20, 0.5)', 'important');
            content.style.setProperty('backdrop-filter', 'blur(20px)', 'important');
            content.style.setProperty('-webkit-backdrop-filter', 'blur(20px)', 'important');
            content.style.setProperty('border', '1px solid rgba(255, 255, 255, 0.1)', 'important');
        } else if (style === 'clear') {
            modal.style.setProperty('background', 'rgba(0, 0, 0, 0.6)', 'important');
            content.style.setProperty('background', 'transparent', 'important');
            content.style.setProperty('backdrop-filter', 'none', 'important');
            content.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
            content.style.setProperty('border', 'none', 'important');
        } else {
            // black
            modal.style.setProperty('background', '#000000', 'important');
            content.style.setProperty('background', '#000000', 'important');
            content.style.setProperty('backdrop-filter', 'none', 'important');
            content.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
            content.style.setProperty('border', 'none', 'important');
        }
    });

    // Update UI active states
    document.querySelectorAll('.modal-style-btn').forEach(btn => {
        if (btn.dataset.modalStyle === style) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

window.setFont = function(font) {
    localStorage.setItem('solifon_custom_font', font);
    window.applyFont();
};

window.applyFont = function() {
    const font = localStorage.getItem('solifon_custom_font') || 'Inter';
    
    if (font === 'Courier New') {
        document.body.style.setProperty('font-family', '"Courier New", Courier, monospace', 'important');
    } else {
        document.body.style.setProperty('font-family', `"${font}", sans-serif`, 'important');
    }

    // Update UI active states
    document.querySelectorAll('.font-btn').forEach(btn => {
        if (btn.dataset.font === font) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

// Apply on load
document.addEventListener('DOMContentLoaded', () => {
    window.applyCustomAvatar();
    window.applyWallpaper();
    window.applyTheme();
    window.applyModalStyle();
    window.applyFont();
});

// ============================================================
// Р вЂ™Р ВР В Р СћР Р€Р С’Р вЂєР В¬Р СњР С’Р Р‡ Р вЂќР С›Р РЋР С™Р С’ Р В Р СџР В Р С›Р вЂ™Р вЂўР В Р С™Р С’ Р СџР С›Р вЂќР СџР ВР РЋР С™Р В
// ============================================================





window.openVirtualBoard = function() {
    if (window.openModal) window.openModal('newFeatureModal');
};

// --- Animated English Placeholder ---
(function() {
    const phrases = [
        "Ask SOLIFON AI anything...",
        "Translate this text to Russian...",
        "Write a Python script for...",
        "How do I center a div?",
        "Explain quantum mechanics...",
        "Create a responsive layout..."
    ];
    let phIndex = 0;
    let chIndex = 0;
    let isDeleting = false;

    function animatePlaceholder() {
        const input = document.getElementById('userInput');
        if (!input) return;

        // If user is focused and typing, pause animation and restore default
        if (document.activeElement === input || input.value.length > 0) {
            input.placeholder = "Ask SOLIFON AI anything...";
            setTimeout(animatePlaceholder, 2000);
            return;
        }

        const currentPhrase = phrases[phIndex];
        
        if (isDeleting) {
            input.placeholder = currentPhrase.substring(0, chIndex - 1) + "|";
            chIndex--;
        } else {
            input.placeholder = currentPhrase.substring(0, chIndex + 1) + "|";
            chIndex++;
        }

        let nextSpeed = isDeleting ? 30 : 60;

        if (!isDeleting && chIndex === currentPhrase.length) {
            isDeleting = true;
            nextSpeed = 2500; // wait before deleting
            input.placeholder = currentPhrase; // remove pipe when fully typed
        } else if (isDeleting && chIndex === 0) {
            isDeleting = false;
            phIndex = (phIndex + 1) % phrases.length;
            nextSpeed = 500;
        }

        setTimeout(animatePlaceholder, nextSpeed);
    }

    // Start
    setTimeout(animatePlaceholder, 1000);
})();
