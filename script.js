// ============================================================
// 0. FIREBASE SETUP
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
// в”Ђв”Ђ AUTH: Email + Password в”Ђв”Ђ
let authMode = 'login'; // 'login' или 'register'

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
    
    // Валидация
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
// FIX 1: saveToFirebase вЂ” путь привязан к uid пользователя
// ============================================================
function saveToFirebase(role, content) {
    if (database && currentUser) {
        const uid = currentUser.uid;
        const newMsgRef = database.ref(`users/${uid}/chat_history`).push();
        newMsgRef.set({
            id: newMsgRef.key,
            role: role,
            content: content,
            isFavorite: false,
            timestamp: Date.now()
        }).catch((error) => console.error("Firebase Error:", error));
    }
}

// ============================================================
// FIX 2: loadChatHistory вЂ” только данные текущего пользователя
// ============================================================
function loadChatHistory() {
    if (!database || !currentUser) return;
    const historyContainer = document.getElementById('chatHistoryItems');
    if (!historyContainer) return;

    // Скрываем статичный "пустой" блок пока грузим
    const emptyEl = document.querySelector('#chatPanel .empty-library');
    if (emptyEl) emptyEl.style.display = 'none';

    historyContainer.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.5;">Loading history...</div>';

    const uid = currentUser.uid;
    database.ref(`users/${uid}/chat_history`).limitToLast(15).once('value', (snapshot) => {
        historyContainer.innerHTML = '';

        if (!snapshot.exists()) {
            // Нет сообщений вЂ” показываем пустой блок обратно
            if (emptyEl) emptyEl.style.display = 'flex';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const item = document.createElement('div');
            item.className = 'history-item';
            const icon = data.role === 'user' ? 'рџ‘¤' : 'рџ¤–';
            const isFav = data.isFavorite ? 'ph-star-fill' : 'ph-star';
            const favColor = data.isFavorite ? '#ffcf33' : 'rgba(255,255,255,0.2)';
            item.innerHTML = `
                <div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; position: relative; cursor: pointer;">
                    <span style="opacity:0.6">${icon}</span>
                    <span style="color: #00f2ff; margin-left:5px;">${data.role}:</span>
                    <i class="ph ${isFav}"
                       style="position: absolute; right: 10px; top: 12px; cursor: pointer; color: ${favColor}; font-size: 16px; transition: 0.2s;"
                       onclick="event.stopPropagation(); window.toggleFavorite('${data.id}', this)"></i>
                    <p style="margin: 5px 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity:0.8; padding-right: 25px;">
                        ${data.content}
                    </p>
                </div>
            `;
            historyContainer.prepend(item);
        });
    });
}

// ============================================================
// FIX 3: toggleFavorite вЂ” путь привязан к uid пользователя
// ============================================================
window.toggleFavorite = function(msgId, btnElement) {
    if (!database || !currentUser) return;
    const uid = currentUser.uid;
    const msgRef = database.ref(`users/${uid}/chat_history/${msgId}`);
    msgRef.once('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const currentStatus = snapshot.val()?.isFavorite || false;
        msgRef.update({ isFavorite: !currentStatus });
        btnElement.style.color = !currentStatus ? '#ffcf33' : 'rgba(255,255,255,0.3)';
        btnElement.classList.toggle('ph-star-fill', !currentStatus);
        btnElement.classList.toggle('ph-star', currentStatus);
    });
};

// ============================================================
// FIX 4: loadLibrary вЂ” uid + правильный контейнер #savedItemsContainer
// ============================================================
function loadLibrary() {
    if (!database || !currentUser) return;
    const libraryContainer = document.getElementById('savedItemsContainer');
    if (!libraryContainer) return;
    libraryContainer.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.5;">Loading Favorites...</div>';
    const uid = currentUser.uid;
    database.ref(`users/${uid}/chat_history`).orderByChild('isFavorite').equalTo(true).once('value', (snapshot) => {
        libraryContainer.innerHTML = '';
        if (!snapshot.exists()) {
            libraryContainer.innerHTML = '<div style="padding:40px; text-align:center; opacity:0.3;">Ваша библиотека пуста.<br>Отметьте важные сообщения звездочкой в чате.</div>';
            return;
        }
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const item = document.createElement('div');
            item.className = 'library-item';
            item.innerHTML = `
                <div style="padding: 15px; background: rgba(0, 242, 255, 0.03); border: 1px solid rgba(0, 242, 255, 0.1); border-radius: 12px; margin-bottom: 12px; position: relative; overflow: hidden;">
                    <div style="font-size: 10px; color: #00f2ff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; opacity: 0.7;">Saved Memory</div>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #fff; opacity: 0.9;">${data.content}</p>
                    <div style="position: absolute; top: 0; left: 0; width: 2px; height: 100%; background: #00f2ff;"></div>
                </div>
            `;
            libraryContainer.prepend(item);
        });
    });
}

// ============================================================
// 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================
let isLiveMode = false;
let liveRecognition = null;
let selectedFiles = []; 
let isVoiceResponseActive = false; 
const MAX_IMAGES = 5;
let selectedProvider = 'gemini';
let lumifexActive = false;

// FIX: Correct comment syntax (was "/ в”Ђв”Ђ" causing JS parse error)
// в”Ђв”Ђ DEEP MODE СРСТЕМА в”Ђв”Ђ
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
        addMessageToUI('ai', 'рџ”¬ Лимит Deep Mode исчерпан. У вас есть 5 запросов в день. Попробуйте завтра!');
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
// 2. ВСПОМОГАТЕЛЬНЫЕ UI ФУНКЦРР
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
            // Показываем накопленный текст с форматированием
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
// QUICK QUESTIONS вЂ” 40 вопросов, 4 случайных
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
  { icon: "ph ph-users", text: "Как работают социальные сети?" },
  { icon: "ph ph-desktop", text: "Что такое метавселенная?" },
  { icon: "ph ph-paint-brush", text: "Как создать своё приложение?" },
  { icon: "ph ph-recycle", text: "Что такое климатические изменения?" },
  { icon: "ph ph-chart-line-up", text: "Как работает экономика?" },
  { icon: "ph ph-smiley", text: "Как справиться со стрессом?" },
  { icon: "ph ph-magnifying-glass", text: "Что такое нанотехнологии?" },
  { icon: "ph ph-flask", text: "Что такое генетическая инженерия?" },
  { icon: "ph ph-infinity", text: "Объясни теорию относительности" },
  { icon: "ph ph-timer", text: "Как улучшить память?" },
  { icon: "ph ph-notebook", text: "Как написать резюме?" },
  { icon: "ph ph-sun", text: "Как медитация влияет на мозг?" },
  { icon: "ph ph-graph", text: "Как изучить Python за месяц?" },
  { icon: "ph ph-eye", text: "Что такое философия сознания?" },
  { icon: "ph ph-fire", text: "Что такое антиматерия?" },
  { icon: "ph ph-sparkle", text: "Как устроен человеческий мозг?" },
  { icon: "ph ph-robot", text: "Что такое робототехника?" },
  { icon: "ph ph-cloud", text: "Что такое большой взрыв?" },
  { icon: "ph ph-hand-coins", text: "Как работает блокчейн?" },
  { icon: "ph ph-monitor-play", text: "Как создать сайт с нуля?" }
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
// 3. ГЛОБАЛЬНЫЕ ФУНКЦРР ОКНО Р ФАЙЛОВ
// ============================================================
function ensureAttachmentPreviewInComposer() {
    const preview = document.getElementById('imagePreviewContainer');
    const composer = document.querySelector('.input-main-wrapper');
    const glass = document.querySelector('.input-glass-container');
    if (!preview || !composer || !glass) return;
    if (preview.parentElement !== composer) {
        composer.insertBefore(preview, glass);
    }
    preview.removeAttribute('style');
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
        alert(`Limit: ${MAX_IMAGES} images.`);
        input.value = "";
        return;
    }
    container.style.display = 'flex';
    files.forEach((file) => {
        selectedFiles.push(file); 
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'attachment-preview-item';
            div.style.position = 'relative';
            div.innerHTML = `
                <img src="${e.target.result}" style="width: 55px; height: 55px; border-radius: 10px; object-fit: cover; border: 1px solid #00f2ff; margin-right: 5px;">
                <div onclick="removeImage(this)" style="position: absolute; top: -5px; right: 0px; background: #ff0000; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; border: 1px solid #fff; z-index: 10;">вњ•</div>
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
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            m.style.display = 'none';
            m.style.removeProperty('opacity');
            m.style.removeProperty('pointer-events');
            m.style.removeProperty('visibility');
        }, 300);
    }
};


// ============================================================
// 4. ОСНОВНАЯ ЛОГИКА (DOMContentLoaded)
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
    
    const isDeepMode = document.getElementById('mainAppLayout')?.classList.contains('deep-mode');
    if (isDeepMode) {
        if (!checkDeepLimit()) return;
        incrementDeepUsage();
    }

    const text = userInput?.value.trim();
    const filesToSend = [...selectedFiles];
    if (!text && filesToSend.length === 0) return;

    if (text.toLowerCase().startsWith("браузер:")) {
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
        if (filesToSend.length > 0) {
            const reader = new FileReader();
            reader.onload = function(e) {
                addMessageToUI('user', `${userContent ? userContent + '<br>' : ''}<img src="${e.target.result}" style="max-width:200px;border-radius:10px;margin-top:6px;display:block;">`);
            };
            reader.readAsDataURL(filesToSend[0]);
        } else {
            addMessageToUI('user', userContent);
        }
    }
    saveToFirebase('user', text);

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

    const stage1 = ["Разбор семантической структуры запроса...", "Извлечение ключевых сущностей и намерений...", "Определение контекстной глубины...", "Построение карты логических связей...", "Классификация интента пользователя...", "Распознавание скрытых паттернов в тексте...", "Оценка тональности входных данных...", "Инициализация векторов внимания..."];
    const stage2 = ["Сканирование многомерных баз данных...", "Извлечение релевантных контекстных блоков...", "Обращение к модулям долгосрочной памяти...", "Синхронизация информационных потоков...", "Фильтрация избыточного шума...", "Поиск пересечений в векторном пространстве...", "Извлечение ассоциативных паттернов...", "Сбор верифицированных фактов..."];
    const stage3 = ["Кросс-верификация найденных источников...", "Устранение логических противоречий...", "Проверка контекста на безопасность (Safety Check)...", "Каскадная валидация аргументов...", "Оценка достоверности метаданных...", "Взвешивание вероятностных исходов...", "Оптимизация цепочки рассуждений..."];
    const stage4 = ["Запуск процессов языкового синтеза...", "Формирование структуры финальных тезисов...", "Адаптация стилистики под контекст беседы...", "Подбор точных лингвистических формулировок...", "Калибровка параметров вывода текста...", "Финальный рендеринг ответа модели...", "Проверка грамматических паттернов..."];
    
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
            ? `[ГЛУБОКИЙ АНАЛИЗ] Отвечай как эксперт. Объясняй ПОЧЕМУ ты пришёл к каждому выводу. Показывай логику шаг за шагом. Приводи примеры и доказательства. Запрос: ${text}`
            : text;
        formData.append('prompt', finalPrompt);
        formData.append('provider', currentProvider);
        formData.append('use_voice', isLiveMode ? 'true' : 'false');
        if (filesToSend.length > 0) formData.append('file', filesToSend[0]);

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
            saveToFirebase('ai', '[image]');
        } else {
            const data = await response.json();
            const reply = data.reply || '...';
            typeEffect(botMsgElement, reply);
            saveToFirebase('ai', reply);
            if (isLiveMode) {
                const status = document.getElementById('liveStatus');
                if (!reply || reply === '...') {
                    if (status) status.innerText = "Нет ответа...";
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
                if (t) t.innerText = "Ошибка соединения.";
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
            if (err.error === 'not-allowed') alert("Доступ к микрофону заблокирован. Разрешите его в настройках браузера.");
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
    console.log("Solifon Engine: Start Initialization...");
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
    description: "работает без интернета", 
    stats: ["Доступность: Всегда готов ", "Скорость отклика : Обработка идет прямо на вашем железе вЂ” никакой задержки сети (пинга)."],
    info: "Работайте над важными проектами в полете или в местах, где нет связи..",
    skills: [{n: "Конфиденциальность", p: 100}, {n: "Автономность", p: 100}, {n: "Контроль данных ", p: 100}]
  },
  { 
    title: "SOLIFON SOUL", 
    icon: "р“†©р“‹–р“†Є", 
    description: "разговорит как живой человек", 
    stats: ["Video Intelligence:", "Giant Context:"],
    info: "Понимает интонации, музыку и звуки. Можно просто отправить голосовое сообщение вЂ” Soul поймет всё до последнего вздоха..",
    skills: [{n: "Объем памяти", p: 100}, {n: "Эмпатия и контекст", p: 100}, {n: "Работа с данными", p: 95}]
  },
  { 
    title: "SOLIFON ULTRA", 
    icon: "вЂ”НџНџНћНћвўпёЋ", 
    description: "самый умный модел", 
    stats: ["Мультимодальность: Актуальность данных", "Стабильность: 100%"],
    info: "Точность фактов .",
    skills: [{n: "Логическое мышление", p: 98}, {n: "Креативность и стиль", p: 98}]
  },
  { 
    title: "SOLIFON AIR", 
    icon: "р“†©вљќр“†Є", 
    description: "отвечает мгновенно", 
    stats: ["Скорость: до 2000к", "Стабильность: 99%"],
    info: "Быстрое распознавание объектов на фото и сканирование документов на лету.",
    skills: [{n: "Повседневная эффективность", p: 100}, {n: "Мультимодальность", p: 92}]
  },
  { 
    title: "SOLIFON UNBOUND", 
    icon: "вЂ”НџНџНћНћр–Ј", 
    description: "работает без цензуры", 
    stats: ["Работа с данными: 100%", "Следование инструкциям: Математический анализ"],
    info: "Мой самый амбициозный модел. Этот модел представляется сабой Прямой доступ к знаниям без В«безопасныхВ» искажений..",
    skills: [{n: "Обход фильтров ", p: 98}, {n: "Следование инструкциям", p: 96}]
  },
  { 
    title:"SOLIFON MOTION", 
    icon: "р“†©вњ§р“†Є", 
    description: "делают качественные видео", 
    stats: ["От киберпанка до классической живописи:", "Рдеальные руки, глаза и пропорции тела:"],
    info: "На Лунной базе я сосредоточился на автоматизации добычи ресурсов. Весь процесс управляется удаленно через этот интерфейс, минимизируя риски для персонала.",
    skills: [{n: "Фотореализм", p: 95}, {n: "Сложные композиции", p: 92}]
  },
  { 
    title: "SOLIFON PULSE", 
    icon: "вЂ”НџНџНћНћвљ™пёЋ", 
    description: "самая лучшая модел и работает без цензуры", 
    stats: ["Скорость: 500вЂ“800 токенов в секунду", "Мгновенный старт:"],
    info: "Прямой доступ к новостям, курсам валют и событиям, произошедшим всего 5 минут назад..",
    skills: [{n: "Эффективность", p: 100}, {n: "Скорость генерации", p: 100}]
  },
  { 
    title: "SOLIFON ECHO", 
    icon: "рџЊЂ", 
    description: "полноценная имитация человеческих эмоций и интонаций", 
    stats: ["Мультиязычность:", "Рдеально справляется со сложными пошаговыми командами :"],
    info: "Способность передать гнев, радость, шепот или иронию в зависимости от контекста текста.",
    skills: [{n: "Естественность голоса", p: 100}, {n: "Скорость озвучки", p: 96}]
  },
  { 
    title: "SOLIFON FLOW", 
    icon: "вЂ”НџНџНћНћрџ—ЎпёЏ", 
    description: "самый лучший модел для кода", 
    stats: ["Стабильность:", "стандартных текстовых задачах:"],
    info: ".",
    skills: [{n: "Эффективность", p: 100}, {n: "Баланс Мощи", p: 95}, {n: "Следование инструкциям", p: 96}]
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
            body: (() => { const f = new FormData(); f.append('prompt', 'ping'); f.append('provider', modelMap[selectedProvider] || selectedProvider || 'gemini'); return f; })()
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
    if (!SpeechRecognition) { alert("Голосовой ввод не поддерживается этим браузером."); return; }
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
// SOLIFON HOTFIX: reliable "АнаныТЈ жТЇрегі" opening
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
    <p>Редактируй код — видь результат в реальном времени.</p>
    <button onclick="greet()">Нажми меня</button>
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
  // Анимированный алерт
  const btn = document.querySelector('button');
  btn.textContent = '🎉 Привет!';
  btn.style.background = '#2ea043';
  setTimeout(() => {
    btn.textContent = 'Нажми меня';
    btn.style.background = '';
  }, 2000);
}`);

    codeEditors.py.setValue(`# Python в браузере — Solifon Playground
print("🚀 Python Engine Active!")
print("-" * 30)

for i in range(1, 6):
    stars = "★" * i
    print(f"Уровень {i}: {stars}")

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
            if (linesEl) linesEl.textContent = `${cm.lineCount()} строк`;
        });
        editor.on('change', (cm) => {
            const linesEl = document.getElementById('ide-lines-count');
            if (linesEl && lang === currentEditorLang) linesEl.textContent = `${cm.lineCount()} строк`;
        });
    });
}

window.openEditorTab = function(evt, lang) {
    document.querySelectorAll(".editor-tab-content").forEach(content => {
        content.style.display = "none";
        content.classList.remove("show");
    });
    // Update file tabs
    document.querySelectorAll(".ide-ftab").forEach(btn => {
        btn.classList.remove("active");
        btn.style.background = 'transparent';
        btn.style.borderTop = '2px solid transparent';
    });
    const targetBox = document.getElementById(`${lang}-editor-box`);
    if (targetBox) {
        targetBox.style.display = "block";
        targetBox.classList.add("show");
    }
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add("active");
        evt.currentTarget.style.background = '#0d0d0f';
        evt.currentTarget.style.borderTop = '2px solid #528bff';
    }
    currentEditorLang = lang;
    // Update breadcrumb
    const names = { html: 'index.html', css: 'style.css', js: 'script.js', py: 'main.py' };
    const bc = document.getElementById('ide-breadcrumb');
    if (bc) bc.textContent = names[lang] || lang;
    // Update sidebar badge
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
    const editorPane  = document.getElementById('ide-editor-pane');
    const previewPane = document.getElementById('ide-preview-pane');
    const sidebar     = document.getElementById('ide-sidebar');
    // Reset layout buttons
    ['layout-split','layout-editor','layout-preview'].forEach(id => {
        const b = document.getElementById(id);
        if (b) { b.style.background = 'transparent'; b.style.color = '#666'; }
    });
    const activeBtn = document.getElementById('layout-' + mode);
    if (activeBtn) { activeBtn.style.background = '#3a3a40'; activeBtn.style.color = '#ccc'; }

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
    if (sidebar) sidebar.style.transform = 'translateX(0px)';
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

// Надёжная привязка для мобильных
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
  if (listEl) listEl.innerHTML = files.map(f => `<div style="margin-top:4px">рџ“„ ${f.name}</div>`).join('');
};

// --- Навыки ---
window.mhToggleSkill = function(el) { el.classList.toggle('selected'); };

// FIX 6: mhLoadStats вЂ” функция не существовала, кнопка "Обновить" падала с ошибкой
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

// --- СОХРАНРТЬ ПРОФРЛЬ РЕБЁНКА (Родитель) ---
window.mhSaveProfile = async function() {
  const fio       = (document.getElementById('mh-fio')?.value || '').trim();
  const dob       = document.getElementById('mh-dob')?.value || '';
  const diagnosis = (document.getElementById('mh-diagnosis')?.value || '').trim();

  if (!fio || !dob || !diagnosis) {
    alert('Заполните ФРО, дату рождения и диагноз');
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

  if (btn) { btn.disabled = false; btn.textContent = 'Сохранить и открыть РР-помощника в†’'; }
};

// --- СОХРАНРТЬ ЗАПРСЬ СПЕЦРАЛРСТА ---
window.mhSaveSession = async function() {
  const child   = (document.getElementById('sp-childName')?.value || '').trim();
  const type    = document.getElementById('sp-sessionType')?.value || '';
  const notes   = (document.getElementById('sp-notes')?.value || '').trim();
  const result  = (document.getElementById('sp-result')?.value || '').trim();

  if (!child || !notes) {
    alert('Заполните имя ребёнка и описание занятия');
    return;
  }

  const sessionData = { child, type, notes, result, createdAt: Date.now(), role: 'specialist' };
  mhCurrentChild = { fio: child, diagnosis: type, skills: [], role: 'specialist' };

  const btn = document.querySelector('#mh-specialistScreen .mh-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Сохраняем...'; }

  try {
    if (typeof database !== 'undefined' && database) {
      await database.ref('anany_zhuregi/sessions/' + Date.now()).set(sessionData);
    }
    setTimeout(() => mhOpenAI('specialist'), 900);
  } catch(e) {
    setTimeout(() => mhOpenAI('specialist'), 300);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Сохранить и проконсультироваться с РР в†’'; }
};

// --- ОТКРЫТЬ РР-ЭКРАН ---
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
    if (badge) badge.textContent = 'рџ‘§ ' + (mhCurrentChild.fio || 'Ребёнок');
    if (aiName) aiName.textContent = 'SoulDrive вЂ” Советник родителей';
    greeting = `Здравствуйте! Я SoulDrive, ваш помощник.\n\nЯ знаю о **${mhCurrentChild.fio}**: диагноз **${mhCurrentChild.diagnosis}**, навыки: ${mhCurrentChild.skills.length ? mhCurrentChild.skills.join(', ') : 'не указаны'}.\n\nЧем могу помочь? Могу предложить домашние упражнения, ответить на вопросы о развитии или поддержать вас.`;
  } else if (role === 'specialist') {
    if (badge) badge.textContent = 'рџ‘©вЂЌвљ•пёЏ Специалист';
    if (aiName) aiName.textContent = 'SoulDrive вЂ” Ассистент специалиста';
    greeting = `Здравствуйте, коллега! Я SoulDrive.\n\nЗапись по ребёнку **${mhCurrentChild.fio}** сохранена. Я могу помочь с:\nвЂ” Методиками коррекции\nвЂ” Составлением индивидуального маршрута\nвЂ” Рекомендациями для родителей\n\nЧто вас интересует?`;
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
    <div class="mh-msg-avatar">рџ’—</div>
    <div class="mh-msg-bubble">${text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</div>`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
function mhAddUser(text) {
  const c = document.getElementById('mh-aiMessages');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'mh-msg user';
  d.innerHTML = `<div class="mh-msg-avatar">рџ‘¤</div><div class="mh-msg-bubble">${text}</div>`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
function mhShowTyping() {
  const c = document.getElementById('mh-aiMessages');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'mh-msg ai'; d.id = 'mh-typing';
  d.innerHTML = `<div class="mh-msg-avatar">рџ’—</div><div class="mh-typing"><span></span><span></span><span></span></div>`;
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
    system = `Ты SoulDrive вЂ” добрый РР-помощник для родителей детей с особыми потребностями в Казахстане.
Ребёнок: ${mhCurrentChild.fio||'вЂ”'}, диагноз: ${mhCurrentChild.diagnosis||'вЂ”'}, навыки: ${(mhCurrentChild.skills||[]).join(', ')||'не указаны'}.
Давай конкретные, простые и добрые советы на русском языке. Ответы 2-4 предложения. Всегда заканчивай позитивно.`;
  } else {
    system = `Ты SoulDrive вЂ” профессиональный РР-ассистент для специалистов (логопедов, дефектологов, психологов) в Казахстане.
Отвечай на русском языке. Давай методические рекомендации, упражнения и советы по коррекционной работе.`;
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
      <p>1. Нажми <b>в‹®</b> три точки в Chrome</p>
      <p>2. Выбери <b>"Установить приложение"</b></p>
      <p>3. Нажми <b>"Установить"</b></p>
      <p style="opacity:0.5;font-size:12px;text-align:center">Рконка Solifon AI появится на главном экране</p>`;
  } else if (isIOS) {
    steps = `
      <div style="font-size:48px;text-align:center">рџ“±</div>
      <h3 style="color:#00f2ff;text-align:center">Установка на iPhone</h3>
      <p>1. Нажми кнопку <b>в–Ўв†‘ Поделиться</b> внизу</p>
      <p>2. Выбери <b>"На экран Домой"</b></p>
      <p>3. Нажми <b>"Добавить"</b></p>`;
  } else {
    steps = `
      <div style="font-size:48px;text-align:center">рџ’»</div>
      <h3 style="color:#00f2ff;text-align:center">Установка на Windows/Mac</h3>
      <p>1. В Chrome нажми <b>в‹®</b></p>
      <p>2. Выбери <b>"Установить Solifon AI"</b></p>
      <p style="opacity:0.5;font-size:12px;text-align:center">Рли нажми иконку вЉ• в адресной строке</p>`;
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
      newChat: 'Новый чат',
      system: 'Система',
      whatsNew: 'Что нового',
      about: 'О SOLIFON',
      features: 'Функции',
      chat: 'Чат',
      library: 'Библиотека',
      workspaces: 'Рабочие зоны',
      newProject: 'Новый проект',
      presentation: 'Презентация',
      deep: 'Глубокий поиск',
      download: 'Скачать Solifon AI',
      upgradeText: 'Перейти на Premium',
      upgrade: 'Улучшить',
      historyEmpty: 'Рстория пуста',
      chatHistory: 'Рстория чатов',
      modelPick: 'Выберите модель',
      ask: 'Спросите Solifon...',
      clear: 'Очистить чат',
      mhTitle: 'АнаныТЈ жТЇрегі',
      mhSubtitle: 'Цифровая платформа поддержки семьи',
      mhParent: 'Родитель',
      mhParentDesc: 'Профиль ребенка, навыки и задания от РР',
      mhSpecialist: 'Специалист',
      mhSpecialistDesc: 'Журнал занятий и коррекционные методики',
      mhDirector: 'Руководитель',
      mhDirectorDesc: 'Управление центром и аналитика',
      childProfile: 'Профиль ребенка',
      childProfileDesc: 'Данные сохраняются в вашем аккаунте',
      personalInfo: 'Личная информация',
      childName: 'ФРО ребенка',
      childNamePh: 'Например: Алибек Сейтов',
      dob: 'Дата рождения (ДД.ММ.ГГГГ)',
      diagnosis: 'Диагноз / особенности',
      diagnosisPh: 'Например: ЗРР, ДЦП, РАС...',
      docs: 'Документы',
      upload: 'Нажмите, чтобы загрузить',
      uploadHint: 'Справки, заключения специалистов',
      skills: 'Навыки ребенка',
      saveProfile: 'Сохранить и открыть РР-помощника',
      sessionJournal: 'Журнал занятия',
      sessionDesc: 'Единая цифровая база вместо бумажных тетрадей',
      whyTitle: 'Зачем это?',
      whyText: 'Все специалисты центра видят общую базу. Один профиль на каждого ребенка, без бумажной путаницы.',
      sessionInfo: 'Рнформация о занятии',
      sessionType: 'Тип занятия',
      chooseType: 'Выберите тип...',
      notes: 'Что делали на занятии',
      notesPh: 'Опишите упражнения, активности, методики...',
      result: 'Результат / наблюдения',
      resultPh: 'Как ребенок справился? Что улучшилось?',
      rating: 'Оценка занятия',
      saveSession: 'Сохранить и проконсультироваться с РР',
      directorPanel: 'Панель руководителя',
      overview: 'Центр В«АнаныТЈ жТЇрегіВ» вЂ” обзор',
      stats: 'Статистика',
      children: 'Детей в базе',
      sessions: 'Занятий',
      villages: 'Сел в охвате',
      specialists: 'Специалиста',
      refresh: 'Обновить',
      exportReport: 'Экспорт отчета',
      team: 'Специалисты',
      aiReady: 'Готов помочь',
      aiInput: 'Напишите вопрос...'
    },
    kk: {
      code: 'KZ',
      htmlLang: 'kk',
      newChat: 'ЖаТЈа чат',
      system: 'ЖТЇйе',
      whatsNew: 'ЖаТЈалыТ›тар',
      about: 'SOLIFON туралы',
      features: 'МТЇмкіндіктер',
      chat: 'Чат',
      library: 'Кітапхана',
      workspaces: 'ЖТ±мыс аймаТ›тары',
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
      dob: 'ТуТ“ан кТЇні (КК.АА.ЖЖЖЖ)',
      diagnosis: 'Диагноз / ерекшеліктер',
      diagnosisPh: 'Мысалы: сУ©йлеу дамуыныТЈ кешігуі, БЦП, аутизм...',
      docs: 'ТљТ±жаттар',
      upload: 'ЖТЇктеу ТЇшін басыТЈыз',
      uploadHint: 'АныТ›тамалар, мамандар Т›орытындылары',
      skills: 'БаланыТЈ даТ“дылары',
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
      overview: 'В«АнаныТЈ жТЇрегіВ» орталыТ“ы вЂ” шолу',
      stats: 'Статистика',
      children: 'БазадаТ“ы балалар',
      sessions: 'СабаТ›тар',
      villages: 'ТљамтылТ“ан ауылдар',
      specialists: 'Маман',
      refresh: 'ЖаТЈарту',
      exportReport: 'Есепті экспорттау',
      team: 'Мамандар',
      aiReady: 'КУ©мектесуге дайын',
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
      presentation: 'Presentation',
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
    ru: ['Говорит слова', 'Говорит предложения', 'Понимает речь', 'Самообслуживание', 'Рисует', 'Читает', 'Счет', 'Социальные навыки', 'Моторика рук', 'Внимание'],
    kk: ['СУ©з айтады', 'СУ©йлем Т›Т±райды', 'СУ©зді тТЇсінеді', 'УЁзін-У©зі кТЇту', 'Сурет салады', 'ОТ›иды', 'Санайды', 'Улеуметтік даТ“дылар', 'Тљол моторикасы', 'Зейін'],
    en: ['Says words', 'Uses sentences', 'Understands speech', 'Self-care', 'Draws', 'Reads', 'Counting', 'Social skills', 'Hand motor skills', 'Attention']
  };

  const sessionSkillTexts = {
    ru: ['Активно участвовал', 'Был сосредоточен', 'Есть прогресс', 'Был капризным', 'Устал быстро', 'Требует повтора'],
    kk: ['Белсенді Т›атысты', 'Зейіні тТ±раТ›ты болды', 'Ілгерілеу бар', 'ТљыТЈырлыТ› болды', 'Тез шаршады', 'Тљайталау Т›ажет'],
    en: ['Participated actively', 'Stayed focused', 'Progress noticed', 'Was upset', 'Got tired quickly', 'Needs repetition']
  };

  const sessionTypes = {
    ru: ['Логопедическое занятие', 'Дефектологическое занятие', 'Психологическое занятие', 'Арт-терапия', 'ЛФК', 'Сенсорная интеграция', 'Другое'],
    kk: ['Логопед сабаТ“ы', 'Дефектолог сабаТ“ы', 'Психолог сабаТ“ы', 'Арт-терапия', 'Емдік дене шыныТ›тыру', 'СенсорлыТ› интеграция', 'БасТ›а'],
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
    applyLanguage(localStorage.getItem(LANG_KEY) || 'ru');
    setTimeout(() => applyLanguage(localStorage.getItem(LANG_KEY) || 'ru'), 700);
  });
})();

// ============================================================
// SOLIFON FINAL HOTFIX: keep "АнаныТЈ жТЇрегі" above old handlers
// ============================================================
(function () {
  const screenIds = ['mh-roleScreen', 'mh-parentScreen', 'mh-specialistScreen', 'mh-directorScreen', 'mh-aiScreen'];

  function el(id) {
    return document.getElementById(id);
  }






  document.addEventListener('keydown', event => {
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
      setLiveStatus('Голосовой ввод в этом браузере недоступен. Live-экран работает, можно закрыть и писать в чат.');
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
        setLiveStatus(transcript ? `Услышал: ${transcript}` : 'Слушаю...');
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
          ? 'Разрешите микрофон в браузере, чтобы Live мог слушать голос.'
          : 'Не удалось запустить микрофон. Можно закрыть Live и написать вопрос текстом.';
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
      setLiveStatus('Live открыт. Если микрофон не запустился, проверьте разрешение браузера.');
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
    setLiveStatus('Слушаю... когда РР отвечает, здесь будет анимация голоса.');
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
      modal.style.display = 'none';
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
      premiumSub: 'Безлимитный доступ ко всем моделям',
      premium1: 'Все модели без ограничений',
      premium2: 'Приоритетный доступ',
      premium3: 'Рстория чатов',
      premium4: 'Голосовые ответы',
      premiumSoon: 'Скоро доступно',
      deep: 'Глубокий поиск',
      modelPick: 'Выберите модель',
      ask: 'Спросите SOLIFON AI что угодно...',
      questions: [
        ['ph ph-cpu', 'Что такое искусственный интеллект?'],
        ['ph ph-desktop', 'Что такое метавселенная?'],
        ['ph ph-fire', 'Что такое антиматерия?'],
        ['ph ph-lightning', 'Что такое машинное обучение?']
      ]
    },
    kk: {
      download: 'Solifon AI жТЇктеу',
      upgradeText: 'Premium-Т“а У©ту',
      upgrade: 'ЖаТ›сарту',
      premiumTitle: 'Solifon Premium',
      premiumSub: 'БарлыТ› модельдерге шексіз Т›олжетімділік',
      premium1: 'БарлыТ› модельдер шектеусіз',
      premium2: 'Басым Т›олжетімділік',
      premium3: 'Чат тарихы',
      premium4: 'ДауыстыТ› жауаптар',
      premiumSoon: 'ЖаТ›ында Т›олжетімді',
      deep: 'ТереТЈ іздеу',
      modelPick: 'Модель таТЈдаТЈыз',
      ask: 'SOLIFON AI-дан кез келген нУ™рсе сТ±раТЈыз...',
      questions: [
        ['ph ph-cpu', 'Жасанды интеллект деген не?'],
        ['ph ph-desktop', 'Метаверс деген не?'],
        ['ph ph-fire', 'Антиматерия деген не?'],
        ['ph ph-lightning', 'МашиналыТ› оТ›ыту деген не?']
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
    return localStorage.getItem(LANG_KEY) || document.documentElement.lang || 'ru';
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
      if (items[index]) items[index].textContent = `вњ“  ${text}`;
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
      whatsTitle: 'Что нового',
      whats01: '01 < Системные навыки />',
      whats02: '02 < Скоро />',
      whats03: '03 < Новости />',
      aboutTitle: 'О SOLIFON AI',
      aboutHero: 'SOLIFON AI',
      aboutLead: 'Solifon AI объединяет чат, поиск, модели, голос, визуальные инструменты и рабочие пространства в одной платформе.',
      aboutGoal: 'Наша цель',
      aboutGoalText: 'Мы создаём удобную AI-платформу, где пользователь может учиться, работать, исследовать идеи и запускать разные инструменты без лишних вкладок.',
      card1: 'Мульти-ядро',
      card1Text: 'Несколько AI-моделей в одном интерфейсе.',
      card2: 'Code Dev',
      card2Text: 'Рабочее пространство для кода и экспериментов.'
    },
    kk: {
      whatsTitle: 'ЖаТЈалыТ›тар',
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
    const value = localStorage.getItem(LANG_KEY) || document.documentElement.lang || 'ru';
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
    select_model: "Выберите модель",
    new_chat: "Новый чат",
    system_whatsnew: "Что нового",
    system_about: "О SOLIFON",
    menu_chat: "Чат",
    menu_library: "Библиотека",
    menu_new_project: "Новый проект",
    menu_presentation: "Презентация",
    upgrade: "Upgrade to premium",
    upgrade_title: "Solifon Premium",
    upgrade_subtitle: "Раскройте весь потенциал нейросетей",
    tariff1_type: "Basic",
    tariff1_desc: "Лучший выбор для повседневных задач",
    tariff1_btn: "Выбрать Basic",
    tariff2_type: "Pro",
    tariff2_desc: "Для профессионалов и разработчиков",
    tariff2_btn: "Выбрать Pro",
    tariff3_type: "Ultra",
    tariff3_desc: "Максимальная мощь без ограничений",
    tariff3_btn: "Выбрать Ultra",
  },
  kz: {
    select_model: "Модель таТЈдаТЈыз",
    new_chat: "ЖаТЈа чат",
    system_whatsnew: "ЖаТЈалыТ›тар",
    system_about: "SOLIFON туралы",
    menu_chat: "Чат",
    menu_library: "Кітапхана",
    menu_new_project: "ЖаТЈа жоба",
    menu_presentation: "Презентация",
    upgrade: "Premium-Т“а У©ту",
    upgrade_title: "Solifon Premium",
    upgrade_subtitle: "НейрожелілердіТЈ барлыТ› мТЇмкіндігін ашыТЈыз",
    tariff1_type: "Basic",
    tariff1_desc: "КТЇнделікті тапсырмалар ТЇшін еТЈ жаТ›сы таТЈдау",
    tariff1_btn: "Basic таТЈдау",
    tariff2_type: "Pro",
    tariff2_desc: "КУ™сіпТ›ойлар мен У™зірлеушілер ТЇшін",
    tariff2_btn: "Pro таТЈдау",
    tariff3_type: "Ultra",
    tariff3_desc: "ЕшТ›андай шектеусіз максималды кТЇш",
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
    menu_presentation: "Presentation",
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
  const savedLang = localStorage.getItem('solifon-lang') || 'ru';
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
            suffix = '/год';
        } else if (period === 'custom') {
            multiplier = months;
            // Pluralization for Russian
            let monthLabel = 'месяцев';
            if (months % 10 === 1 && months % 100 !== 11) monthLabel = 'месяц';
            else if ([2,3,4].includes(months % 10) && ![12,13,14].includes(months % 100)) monthLabel = 'месяца';
            suffix = `/за ${months} ${monthLabel}`;
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
            priceEls.second.textContent = Math.round(prices.second * multiplier);
            periodEls.second.textContent = suffix;
        }
        if (priceEls.third && periodEls.third) {
            priceEls.third.textContent = Math.round(prices.third * multiplier);
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
    // ВАЖНО: Замени ссылку на URL твоего Space на Hugging Face!
    const wsUrl = "wss://ТВОЙ-СЕРВЕР.hf.space/ws/browser"; 
    
    // Создаем сообщение в чате от имени РР с черным экраном
    const msgId = "browser-" + Date.now();
    const uiHtml = `
        <div style="font-size: 13px; color: #00f2ff; margin-bottom: 8px;">
            <i class="ph ph-globe"></i> Solifon Agent подключен к интернету...
        </div>
        <div style="font-size: 14px; margin-bottom: 10px;"><b>Цель:</b> ${task}</div>
        <img id="${msgId}" src="" style="width: 100%; border-radius: 12px; border: 1px solid #00f2ff; background: #050505; min-height: 200px;" alt="Загрузка облачного браузера...">
        <div id="btn-${msgId}" style="display: none; margin-top: 10px;"></div>
    `;
    
    // Рспользуем твою готовую функцию добавления сообщений (если она называется так)
    // Либо просто создай div и добавь его в #messagesContainer
    const container = document.getElementById('messagesContainer');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message';
    msgDiv.innerHTML = `<div class="text">${uiHtml}</div>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    // Запускаем WebSocket
    const ws = new WebSocket(wsUrl);
    const screen = document.getElementById(msgId);
    const btnContainer = document.getElementById(`btn-${msgId}`);

    ws.onopen = () => { ws.send(task); };

    ws.onmessage = (event) => {
        const data = event.data;
        if (data.startsWith("data:image")) {
            screen.src = data; // Показываем трансляцию
            container.scrollTop = container.scrollHeight;
        } 
        else if (data.startsWith("LINK:")) {
            const link = data.split("LINK:")[1];
            btnContainer.style.display = "block";
            btnContainer.innerHTML = `<a href="${link}" target="_blank" style="padding: 10px 20px; background: #00f2ff; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">рџ“Ґ Скачать результат</a>`;
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
    // ---- База данных из cleaned_data.json ----
    const generatedData = {
        "ru": [
            "что такое API","что такое циклы","что такое лоукод","что такое облако",
            "как быстро читать","как улучшить речь","как развить память","основы базы данных",
            "основы кодирования","что такое алгоритм","что такое блокчейн","что такое протокол",
            "что такое процессы","как стать увереннее","что такое нейросеть","что такое фреймворк",
            "как найти ментора ит","как развить внимание","как развить слушание","как создать веб-сайт",
            "что такое переменные","что такое чистый код","как говорить публично","как научиться учиться",
            "как улучшить внимание","основы веб-разработки","упражнения для голоса","упражнения для дикции",
            "что такое база данных","как развить творчество","как учиться эффективно","методы развития памяти",
            "упражнения для дыхания","что такое микросервисы","что такое сетевой слой","как быстро выучить стих",
            "как улучшить пунктуацию","что такое виртуализация","как развить коммуникацию","методы spaced repetition",
            "основы бэкенд разработки","основы паттернов дизайна","основы тестирования кода","что такое большие данные",
            "что такое интернет вещей","что такое нейронная сеть","что такое парсинг данных","как избавиться от акцента",
            "как научиться презентации","как улучшить концентрацию","методы активного обучения","методы глубокого обучения",
            "основы компьютерных сетей","что такое версионирование","что такое контейнеризация","что такое машинное зрение",
            "как настроить голос дикцию","как улучшить скорость речи","основы дизайна интерфейсов","основы защиты от кибератак",
            "основы фронтенд разработки","подготовка к школе логопед","упражнения для артикуляции","упражнения для беглой речи",
            "упражнения для уверенности","что такое микроархитектура","что такое облачные сервисы","заикание у взрослых лечение",
            "как организовать свое время","методы адаптивного обучения","методы проблемного обучения","основы мобильной разработки",
            "что такое кибербезопасность","что такое машинное обучение","что такое облако вычислений","дизартрия симптомы и лечение",
            "как научиться говорить четко","как преодолеть застенчивость","как развить уверенность речи","как улучшить звучание голоса",
            "как улучшить письменную речь","как улучшить словарный запас","как улучшить чувство времени","методы геймификации обучения",
            "методы развивающего обучения","основы вычислительной теории","как выучить таблицу умножения","как научиться импровизировать",
            "методы запоминания информации","основы архитектуры приложений","основы джава программирования","основы программирования питон",
            "что такое нативное приложение","что такое облачные технологии","как преодолеть языковой барьер","как структурировать информацию",
            "методы интерактивного обучения","развитие критического мышления","что такое квантовые компьютеры","упражнения для речевого дыхания",
            "что такое виртуальная реальность","что такое графические процессоры","как развить ораторское мастерство","обучение детей иностранному языку",
            "что такое искусственный интеллект","методы повествовательного обучения","коррекция нарушений письменной речи","основы системного администрирования",
            "техники запоминания английских слов","нарушения голоса причины профилактика","как развивать пространственное мышление",
            "упражнения для правильного произношения","что такое тестирование программного обеспечения"
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
            "айқын сөйлеу","жадыны дамыту","назарды дамыту","API дегеніміз не","кодтау негіздері",
            "дауыс жаттығулары","оқуды оқуды үйрену","UI дизайн негіздері","жылдам оқу әдістері",
            "айтылымын жұмсап ету","сын тұрғысынан ойлау","сөздік қорын кеңейту","таз код дегеніміз не",
            "терең оқыту әдістері","циклдар дегеніміз не","алгоритм дегеніміз не","блокчейн дегеніміз не",
            "веб-әзірлеу негіздері","дауыс сапасын арттыру","есті дамыту техникасы","облақ сервистері шолу",
            "протокол дегеніміз не","пунктуацияны жақсарту","сөйлеу сенімін дамыту","терең машиналық оқыту",
            "тыныс алу жаттығулары","акцентті жоюу әдістері","веб-сайт құру әдістері","нейрожелі дегеніміз не",
            "сахарау қатынасын жеңу","тиімді оқытың әдістері","тіл барьеріне түс болу","уақытты тиімді басқару",
            "фреймворк дегеніміз не","ұсыну дағдыларын оқыту","spaced repetition әдісі","айнымалысы дегеніміз не",
            "ит саласында жұмыс табу","ойын қозғау техникалары","процесстер дегеніміз не","тегін код жазуды үйрену",
            "өлеңді қалай жаттап алу","алғашқы кодты қалай жазу","беглі сөйлеу жаттығулары","бэкенд әзірлеу негіздері",
            "жазба қатынасын жақсарту","желі қабаты дегеніміз не","жүргіндік оқыту әдістері","импровизе істеуді үйрену",
            "микросервис дегеніміз не","мобильді қосымша әзірлеу","мәліметтерді ұйымдастыру","сөйлеу қарқынын жақсарту",
            "терең оқыту дегеніміз не","тыңдау дағдыларын дамыту","үйде логопед жаттығулары","ауысынды сөйлеу кеңестері",
            "бэкенд разработка оқулығы","дауыс тыныс алу техникасы","креативтік ойлауды дамыту","мектепке дайындық логопед",
            "мәліметті сақтау әдістері","мәселенің негізінде оқыту","түндігін беру жаттығулары","уақыт басқарысын жақсарту",
            "веб скрейпинг дегеніміз не","виртуализация дегеніміз не","есептеу теориясы негіздері","жадыны арттыру техникалары",
            "ит мамандығын қалай таңдау","киберқауіпсіздік негіздері","сөйлеу сенімді жаттығулары","сөйлеу сенімділігін дамыту",
            "сөйлеуді жақсарту әдістері","фронтенд әзірлеу негіздері","эмпирикалық оқыту әдістері","Java программалау негіздері",
            "аналитикалық ойлауды дамыту","ағылшын тілін жылдам үйрену","бейімді оқыту стратегиялары","дауыс бұзылуларын алдын алу",
            "дизайн шаблондары негіздері","интерактивті оқыту әдістері","компьютерлік желі негіздері","облақ есептеуі дегеніміз не",
            "сахна қорқынышын қалай жеңу","смарт контракт дегеніміз не","сөйлеу кешігуінің себептері","үлкен деректер дегеніміз не",
            "айқын сөйлеу үшін жаттығулар","баланың сөздік қорын кеңейту","бұлттық есептеу дегеніміз не","гит және гитхаб дегеніміз не",
            "девопс инженері дегеніміз не","конструктивті оқыту әдістері","контейнеризация дегеніміз не","машиналық оқыту дегеніміз не",
            "менторды қалай табуға болады","нативті қосымша дегеніміз не","р және л дыбыстарын дұрыстау","сөйлеу айқындығы жаттығулары",
            "түйілуруді қалай емдеу керек","Python программалау негіздері","балаларға екінші тілді үйрету","виртуалды шындық дегеніміз не",
            "жылдам оқу техникасы әдістері","жұмыс орнын қалай ұйымдастыру","заттар интернеті дегеніміз не","киберқауіпсіздік дегеніміз не",
            "код жазуды қалай бастау керек","көбейту кестесін қалай үйрену","мектепке дейінгі сөйлеу дамуы","микроархитектура дегеніміз не",
            "нұсқасын басқару дегеніміз не","питонды қалай үйренуге болады","сөйлеу қателерін қалай түзету","фронтенд разработка негіздері",
            "қалай жылдамырақ оқуға болады","дизартрия белгілері және емдеу","жазбаша тіл бұзылуларын түзету","жазудағы грамматиканы жақсарту",
            "жасанды интеллект дегеніміз не","зейінді қалай арттыруға болады","кибер қауіпсіздік дегеніміз не","коммуникация дағдыларын дамыту",
            "компьютерлік көру дегеніміз не","креативті ойлауды қалай дамыту","лоукод разработка дегеніміз не","мәліметтер базасы дегеніміз не"
        ]
    };

    // Объединяем все три языка в один массив
    const autocompleteDB = [
        ...generatedData.ru,
        ...generatedData.en,
        ...generatedData.kz
    ];

    // ---- DOM элементы ----
    const userInput = document.getElementById('userInput');
    const ghostText = document.getElementById('ghostText');
    const dropdown = document.getElementById('suggestionsDropdown');
    const suggestionsList = document.getElementById('suggestionsList');
    const chatHeader = document.getElementById('animatedChatHeader');
    const welcomeScreen = document.getElementById('welcomeScreen');

    if (!userInput) return; // Безопасный выход если элемент не найден

    let currentGhostSuggestion = '';
    let activeIndex = -1;
    let lastMatches = [];

    // ---- Поиск совпадений ----
    function findMatches(query) {
        if (!query || query.trim().length < 2) return [];
        const q = query.toLowerCase().trim();
        return autocompleteDB
            .filter(item => item.toLowerCase().startsWith(q))
            .slice(0, 2); // Максимум 2 подсказки
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

            // Подсвечиваем совпавшую часть
            const matchLen = typed.length;
            const matchPart = item.slice(0, matchLen);
            const restPart = item.slice(matchLen);

            div.innerHTML = `
                <i class="ph ph-magnifying-glass suggestion-icon"></i>
                <span>
                    <span class="suggestion-text-match">${escapeHtml(matchPart)}</span><span class="suggestion-text-rest">${escapeHtml(restPart)}</span>
                </span>
                <span class="tab-hint">Tab ↹</span>
            `;

            div.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Не снимаем фокус с textarea
                selectSuggestion(item);
            });

            suggestionsList.appendChild(div);
        });

        dropdown.classList.add('visible');
    }

    // ---- Применить выбранную подсказку ----
    function selectSuggestion(text) {
        if (!userInput) return;
        userInput.value = text;
        updateGhostText('', '');
        dropdown.classList.remove('visible');
        userInput.focus();

        // Ставим курсор в конец
        userInput.setSelectionRange(text.length, text.length);

        // Активируем кнопку Send
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.classList.add('active');

        // Триггерим resize textarea
        userInput.dispatchEvent(new Event('input'));
    }

    // ---- Анимация заголовка ----
    function setHeaderTyping(isTyping) {
        if (!chatHeader) return;
        if (isTyping) {
            chatHeader.classList.add('typing-active');
        } else {
            chatHeader.classList.remove('typing-active');
        }
    }

    // ---- Безопасное экранирование HTML ----
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

        // Анимация заголовка
        setHeaderTyping(isTyping && welcomeScreen && welcomeScreen.style.display !== 'none');

        if (!isTyping) {
            updateGhostText('', '');
            if (dropdown) dropdown.classList.remove('visible');
            return;
        }

        // Ищем совпадения
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

    // ---- Закрываем dropdown при клике вне его ----
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
// MENU FIX v4 — document capture, no stopPropagation → лампа работает
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
        sb.style.transform = 'translateX(0px)';
        var bd = document.getElementById('__sbd__');
        if (bd) bd.style.display = 'none';
        var nt = document.getElementById('nav-toggle');
        if (nt) nt.checked = false;
    }

    // Capture на document — срабатывает ДО всех listeners на элементе
    // НЕ вызываем stopPropagation → tubelight handler работает → лампа работает ✓
    document.addEventListener('click', function(e) {
        var lbl = document.querySelector('label[for="nav-toggle"]');
        if (!lbl) return;
        if (e.target === lbl || lbl.contains(e.target)) {
            // Даём событию пройти дальше (туbelight обновит лампу)
            // Мы только управляем видимостью sidebar
            if (_open) { _hide(); } else { _show(); }
        }
    }, true); // capture = true, но БЕЗ stopPropagation

    // Синхронизация: когда openModal() сбрасывает checkbox → закрываем sidebar
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

window.setWallpaper = function(bg) {
    localStorage.setItem('solifon_custom_wallpaper', bg);
    
    // Automatically switch to glassmorphism if a custom wallpaper is selected 
    // and current theme is opaque (neon or default/missing)
    if (bg && bg !== 'none') {
        const currentTheme = localStorage.getItem('solifon_custom_theme');
        if (currentTheme !== 'glass' && currentTheme !== 'clear') {
            localStorage.setItem('solifon_custom_theme', 'glass');
        }
    }
    
    window.applyWallpaper();
    window.applyTheme(); // Ensure theme updates immediately
};

window.handleWallpaperUpload = function(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.type.startsWith('video/')) {
            const videoUrl = URL.createObjectURL(file);
            // We set it but warn the user if they want since blob URLs don't survive refresh
            window.setWallpaper(`video:${videoUrl}`);
            alert('Обратите внимание: загруженное видео будет работать только до перезагрузки страницы. Для постоянного видеофона поместите файл рядом с index.html.');
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                const dataUrl = e.target.result;
                window.setWallpaper(`url(${dataUrl})`);
            };
            reader.readAsDataURL(file);
        }
    }
};

window.liveWallpaperAnimationId = null;

window.applyWallpaper = function() {
    const bg = localStorage.getItem('solifon_custom_wallpaper');
    
    // Stop any existing animation and remove canvas or video
    if (window.liveWallpaperAnimationId) {
        cancelAnimationFrame(window.liveWallpaperAnimationId);
        window.liveWallpaperAnimationId = null;
    }
    const oldCanvas = document.getElementById('live-wallpaper-canvas');
    if (oldCanvas) oldCanvas.remove();
    const oldVideo = document.getElementById('live-wallpaper-video');
    if (oldVideo) oldVideo.remove();

    if (bg && bg.startsWith('video:')) {
        const videoSrc = bg.replace('video:', '');
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = '#000';
        
        const video = document.createElement('video');
        video.id = 'live-wallpaper-video';
        video.src = videoSrc;
        video.autoplay = true;
        video.loop = true;
        video.muted = true; // Required for auto-play
        video.playsInline = true;
        video.style.position = 'fixed';
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '100vw';
        video.style.height = '100vh';
        video.style.objectFit = 'cover';
        video.style.zIndex = '-2'; // Behind UI and backdrop
        video.style.pointerEvents = 'none';
        document.body.appendChild(video);
    } else if (bg === 'live_leaves') {
        document.body.style.backgroundImage = 'url("https://images.unsplash.com/photo-1476231682828-37e571bc172f?q=80&w=2564")'; // Autumn forest
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        startFallingLeaves();
    } else if (bg === 'live_matrix') {
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = '#050505';
        startMatrixRain();
    } else if (bg && bg !== 'none') {
        document.body.style.backgroundImage = bg;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
    } else {
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = '#000'; // fallback
    }
    
    // Update UI active states
    document.querySelectorAll('.wp-btn').forEach(btn => {
        if (btn.dataset.wp === bg || (!bg && btn.dataset.wp === 'none')) {
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
