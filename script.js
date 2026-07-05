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
                console.error('Redirect auth error:', err);
            }
        });
}

// Обработка возврата после Google redirect (мобильные)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            // Закрываем модалку при любом способе входа
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

let authMode = 'login';

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
        submitBtn.textContent = 'Войти';
        title.textContent = 'Войдите в аккаунт';
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
    
    if (!email || !password) {
        errorEl.textContent = 'Заполните все поля';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'Пароль минимум 6 символов';
        return;
    }
    
    btn.textContent = '...';
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
                'auth/user-not-found': 'Пользователь не найден',
                'auth/wrong-password': 'Неверный пароль',
                'auth/email-already-in-use': 'Email уже используется',
                'auth/invalid-email': 'Неверный формат email',
                'auth/weak-password': 'Пароль слишком слабый',
                'auth/invalid-credential': 'Неверный email или пароль',
            };
            errorEl.textContent = msgs[err.code] || 'Ошибка: ' + err.message;
        })
        .finally(() => {
            btn.textContent = authMode === 'login' ? 'Войти' : 'Создать аккаунт';
            btn.disabled = false;
        });
};

// ============================================================
// LOCAL STORAGE PERSISTENCE
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
            <div style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; position: relative; cursor: pointer; display: flex; align-items: center; gap: 10px;"
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
        libraryContainer.innerHTML = '<div style="padding:40px; text-align:center; opacity:0.3;">Library is empty.<br>Save messages to Favorites to see them here.</div>';
        return;
    }
    
    favorites.forEach((data) => {
        const item = document.createElement('div');
        item.className = 'library-item';
        item.innerHTML = `
            <div style="padding: 15px; background: rgba(0, 242, 255, 0.03); border: 1px solid rgba(0, 242, 255, 0.1); border-radius: 12px; margin-bottom: 12px; position: relative; overflow: hidden;"
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
// GLOBAL VARIABLES
// ============================================================
let isLiveMode = false;
let liveRecognition = null;
let selectedFiles = []; 
let isVoiceResponseActive = false; 
const MAX_IMAGES = 5;
let selectedProvider = 'gemini';
let lumifexActive = false;
let isHandlingAI = false;

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
        addMessageToUI('ai', 'рџ"¬ Лимит Deep Mode исчерпан. У вас есть 5 запросов в день. Попробуйте завтра!');
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
// UI HELPERS
// ============================================================
function typeEffect(element, text) {
    const textContainer = element.querySelector('.text');
    if (!textContainer) return;
    const cleanText = (text || "").trim();
    textContainer.innerHTML = '';
    let i = 0;
    const interval = setInterval(() => {
        if (i < cleanText.length) {
            i++;
            const partial = cleanText.slice(0, i);
            textContainer.innerHTML = partial
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
// QUICK QUESTIONS
// ============================================================
const ALL_QUESTIONS = [
  { icon: "ph ph-brain", text: "Что такое нейронная сеть?" },
  { icon: "ph ph-atom", text: "Объясни квантовую механику" },
  { icon: "ph ph-rocket-launch", text: "Как написать бизнес-план?" },
  { icon: "ph ph-lightning", text: "Что такое машинное обучение?" },
  { icon: "ph ph-globe", text: "Как работает интернет?" },
  { icon: "ph ph-dna", text: "Что такое ДНК и как она работает?" },
  { icon: "ph ph-star", text: "Что такое чёрная дыра?" },
  { icon: "ph ph-code", text: "Как начать программировать с нуля?" },
  { icon: "ph ph-currency-dollar", text: "Как начать инвестировать?" },
  { icon: "ph ph-heartbeat", text: "Как работает иммунная система?" },
  { icon: "ph ph-cpu", text: "Что такое искусственный интеллект?" },
  { icon: "ph ph-currency-bitcoin", text: "Что такое криптовалюта?" },
  { icon: "ph ph-leaf", text: "Что такое фотосинтез?" },
  { icon: "ph ph-map-pin", text: "Как работает GPS?" },
  { icon: "ph ph-shield-check", text: "Как работает вакцина?" },
  { icon: "ph ph-robot", text: "Что такое ChatGPT?" },
  { icon: "ph ph-books", text: "Как выучить английский быстро?" },
  { icon: "ph ph-wave-sine", text: "Как работает лазер?" },
  { icon: "ph ph-planet", text: "Что такое параллельные вселенные?" },
  { icon: "ph ph-thermometer-hot", text: "Что такое термоядерный синтез?" },
];

function renderQuickPills() {
  const container = document.getElementById('quickPills');
  if (!container) return;
  const selected = [
    { icon: "ph ph-cpu", text: "Что такое искусственный интеллект?" },
    { icon: "ph ph-desktop", text: "Что такое метавселенная?" },
    { icon: "ph ph-fire", text: "Что такое антиматерия?" },
    { icon: "ph ph-lightning", text: "Что такое машинное обучение?" }
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
// FILE ATTACHMENT HANDLING
// ============================================================
function ensureAttachmentPreviewInComposer() {
    const preview = document.getElementById('imagePreviewContainer');
    const composer = document.querySelector('.animated-input-box');
    const glass = document.querySelector('.textarea-ghost-wrapper');
    if (!preview || !composer || !glass) return;
    if (preview.parentElement !== composer) {
        composer.insertBefore(preview, glass);
    }
    preview.removeAttribute('style');
    preview.style.padding = '12px 16px 0px 16px';
    preview.style.width = '100%';
    preview.style.boxSizing = 'border-box';
    preview.style.flexWrap = 'wrap';
    preview.style.gap = '8px';
    if (selectedFiles.length === 0 && preview.children.length === 0) {
        preview.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', ensureAttachmentPreviewInComposer);

window.handleFileSelect = async function(input) {
    ensureAttachmentPreviewInComposer();
    const files = Array.from(input.files);
    const container = document.getElementById('imagePreviewContainer');
    if (!container) return;
    if (selectedFiles.length + files.length > MAX_IMAGES) {
        alert(`Limit: ${MAX_IMAGES} images.`);
        input.value = "";
        return;
    }
    container.style.display = 'flex';
    for (const file of files) {
        selectedFiles.push(file); 
        let dataUrl = '';
        if (file.type.startsWith('image/')) {
            dataUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        } else {
            dataUrl = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'></path><polyline points='14 2 14 8 20 8'></polyline></svg>";
        }
        if (!document.getElementById('preview-btn-style')) {
            const style = document.createElement('style');
            style.id = 'preview-btn-style';
            style.textContent = `
                .preview-remove-btn {
                    position: absolute; top: -6px; right: -2px;
                    background: rgba(40,40,40,0.6);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    color: #fff; border-radius: 50%; width: 22px; height: 22px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 11px; cursor: pointer;
                    border: 1px solid rgba(255,255,255,0.2);
                    z-index: 10;
                    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                }
                .preview-remove-btn:hover {
                    background: rgba(255,255,255,0.2);
                    transform: scale(1.15) rotate(90deg);
                    border-color: rgba(255,255,255,0.5);
                }
            `;
            document.head.appendChild(style);
        }
        const div = document.createElement('div');
        div.className = 'attachment-preview-item';
        div.style.position = 'relative';
        div.innerHTML = `
            <img src="${dataUrl}" alt="" style="width: 55px; height: 55px; border-radius: 10px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); margin-right: 5px; ${file.type.startsWith('image/') ? '' : 'opacity: 0.5;'}">
            <div onclick="removeImage(this)" class="preview-remove-btn">✕</div>
        `;
        container.appendChild(div);
    }
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
            <style>
            #attachmentLightbox {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.85); display: none; align-items: center; justify-content: center;
                z-index: 999999; backdrop-filter: blur(10px);
            }
            #attachmentLightbox.active { display: flex; }
            .attachment-lightbox-image {
                max-width: 90%; max-height: 90%; border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5); object-fit: contain;
            }
            .attachment-lightbox-close {
                position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1);
                color: white; border: none; border-radius: 50%; width: 40px; height: 40px;
                font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                transition: 0.2s;
            }
            .attachment-lightbox-close:hover { background: rgba(255,255,255,0.2); }
            </style>
            <button type="button" class="attachment-lightbox-close" aria-label="Close preview">x</button>
            <img class="attachment-lightbox-image" alt="">
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
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.style.display = 'flex';
    selectedFiles = [];
    const preview = document.getElementById('imagePreviewContainer');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
    isHandlingAI = false;
};

window.openFilePicker = function() {
    document.getElementById('fileInput')?.click();
};

window.openModal = function(id) {
    if (id === 'aboutModal') {
        window.currentViewBg = 'about';
        if (typeof window.applyWallpaper === 'function') window.applyWallpaper();
    } else if (id === 'upgradeModal') {
        window.currentViewBg = 'sub';
        if (typeof window.applyWallpaper === 'function') window.applyWallpaper();
    } else if (id === 'whatsNewModal') {
        window.currentViewBg = 'whatsnew';
        if (typeof window.applyWallpaper === 'function') window.applyWallpaper();
    }
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) {
        navToggle.checked = false;
        navToggle.dispatchEvent(new Event('change'));
    }
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.transform = 'translateX(0px)';
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
        if (typeof window.applyWallpaper === 'function') window.applyWallpaper('main');
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
// MAIN AI HANDLER - FIXED BUG #1 & #2
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

    window.handleAI = async function() {
        // ✅ BUG FIX #1: Проверяем и устанавливаем флаг в начале
        if (isHandlingAI) {
            console.warn('Request already in progress. Please wait.');
            return;
        }
        isHandlingAI = true;
        
        const targetSessionId = window.currentSessionId;
        
        try {
            const isDeepMode = mainAppLayout?.classList.contains('deep-mode');
            if (isDeepMode) {
                if (!checkDeepLimit()) {
                    isHandlingAI = false;
                    return;
                }
                incrementDeepUsage();
            }

            const text = userInput?.value.trim();
            const filesToSend = [...selectedFiles];
            if (!text && filesToSend.length === 0) {
                isHandlingAI = false;
                return;
            }

            const currentProvider = selectedProvider;
            let userContentForSave = text || '';
            
            if (filesToSend.length > 0) {
                let attachmentsHTML = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">';
                for (const file of filesToSend) {
                    let dataUrl = '';
                    if (file.type.startsWith('image/')) {
                        dataUrl = await new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = e => resolve(e.target.result);
                            reader.readAsDataURL(file);
                        });
                        attachmentsHTML += `<img src="${dataUrl}" style="max-width:200px; max-height:200px; border-radius:10px; display:block; cursor:pointer;" onclick="window.openAttachmentPreview(this.src)">`;
                    } else {
                        dataUrl = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'></svg>";
                        attachmentsHTML += `<div style="display: flex; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 10px;"><span>${file.name}</span></div>`;
                    }
                }
                attachmentsHTML += '</div>';
                userContentForSave = `${attachmentsHTML}${userContentForSave}`;
            }

            if (!isLiveMode) {
                addMessageToUI('user', userContentForSave);
            }
            saveToFirebase('user', userContentForSave, targetSessionId);

            if (userInput) { userInput.value = ""; userInput.style.height = 'auto'; }
            selectedFiles = [];
            const preview = document.getElementById('imagePreviewContainer');
            if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }

            // ✅ BUG FIX #2: Правильная инициализация анимации с временной синхронизацией
            const numSteps = Math.random() < 0.10 ? 4 : (Math.random() < 0.40 ? 6 : 5);
            const totalTime = Math.random() < 0.50 ? 20000 : (Math.random() * 6000 + 6000);
            
            const stage1 = ["Разбор семантической структуры...", "Извлечение ключевых сущностей..."];
            const stage2 = ["Сканирование баз данных...", "Обработка контекста..."];
            const stage3 = ["Верификация источников...", "Проверка логики..."];
            const stage4 = ["Синтез языка...", "Формирование ответа..."];
            
            const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
            let selectedTexts = [];
            for (let i = 0; i < numSteps; i++) {
                if (i % 4 === 0) selectedTexts.push(pickRandom(stage1));
                else if (i % 4 === 1) selectedTexts.push(pickRandom(stage2));
                else if (i % 4 === 2) selectedTexts.push(pickRandom(stage3));
                else selectedTexts.push(pickRandom(stage4));
            }

            let stepsHTML = '<div style="display: flex; flex-direction: column; gap: 12px;">';
            selectedTexts.forEach((text, i) => {
                stepsHTML += `<div id="step${i+1}" class="thinking-step" style="opacity: 0; transition: opacity 0.5s ease;"><span>${text}</span></div>`;
            });
            stepsHTML += '</div>';

            const botMsgElement = addMessageToUI('ai', stepsHTML);

            // ✅ Последовательная активация шагов с правильной синхронизацией
            const stepDuration = totalTime / numSteps;
            for (let i = 0; i < numSteps; i++) {
                setTimeout(() => {
                    const step = botMsgElement.querySelector('#step' + (i+1));
                    if (step) step.style.opacity = '1';
                }, i * stepDuration);
            }
            
            try {
                let appendedFileText = "";
                let firstImageFile = null;
                for (const file of filesToSend) {
                    if (file.type.startsWith('image/')) {
                        if (!firstImageFile) firstImageFile = file;
                    } else {
                        const textContent = await new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = e => resolve(e.target.result);
                            reader.onerror = () => resolve('');
                            reader.readAsText(file);
                        });
                        if (textContent) appendedFileText += `\n[Файл: ${file.name}]\n${textContent.substring(0, 2000)}`;
                    }
                }
                
                const formData = new FormData();
                const finalPrompt = isDeepMode 
                    ? `[DEEP ANALYSIS] Ответь максимально подробно: ${text}`
                    : text + appendedFileText;
                formData.append('prompt', finalPrompt);
                formData.append('provider', currentProvider);
                formData.append('use_voice', isLiveMode ? 'true' : 'false');
                if (firstImageFile) formData.append('file', firstImageFile);

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
                    const reply = data.reply || 'No response';
                    typeEffect(botMsgElement, reply);
                    saveToFirebase('ai', reply, targetSessionId);
                }
            } catch (error) {
                console.error('AI Error:', error);
                const textEl = botMsgElement.querySelector('.text');
                if (textEl) textEl.innerText = "Connection error. Please try again.";
            }
        } finally {
            isHandlingAI = false;
            if (userInput) userInput.focus();
        }
    };

    sendBtn?.addEventListener('click', window.handleAI);
    userInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            window.handleAI(); 
        }
    });

    initModelSelector();

    let modelOverlay = document.createElement('div');
    modelOverlay.className = 'model-overlay';
    document.body.appendChild(modelOverlay);

    modelTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = modelDropdown?.classList.contains('active');
        if (!isOpen) {
            const rect = modelTrigger.getBoundingClientRect();
            modelDropdown.style.top = (rect.bottom + 8) + 'px';
            modelDropdown.style.left = rect.left + 'px';
        }
        modelDropdown?.classList.toggle('active');
        modelOverlay.classList.toggle('active');
    });

    modelOverlay.addEventListener('click', () => {
        modelDropdown?.classList.remove('active');
        modelOverlay.classList.remove('active');
    });

    if (deepBtn && mainAppLayout) {
        deepBtn.addEventListener('click', () => {
            mainAppLayout.classList.toggle('deep-mode');
            const isDeep = mainAppLayout.classList.contains('deep-mode');
            selectedProvider = isDeep ? 'glm' : 'solifon-air'; 
            if (currentModelText) currentModelText.innerText = isDeep ? "Deep Mode" : "Solifon Air";
            deepBtn?.classList.toggle('active', isDeep);
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
        sidebar?.classList.remove('chat-active');
        chatTrigger?.classList.remove('active');
    });
    
    document.getElementById('closeLibrary')?.addEventListener('click', () => {
        sidebar?.classList.remove('library-active');
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
                try { recognition.start(); } catch (err) { console.error("Recognition error:", err); }
            }
        };

        recognition.onstart = () => {
            micBtn.classList.add('recording');
            if (userInput) userInput.placeholder = "Listening...";
            micBtn.style.color = "#00f2ff";
            micBtn.style.textShadow = "0 0 10px #00f2ff";
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
            console.error("Speech error:", err.error);
            micBtn.classList.remove('recording');
        };
    }
}); 
