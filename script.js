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
// ── AUTH: Email + Password ──
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
// FIX 1: saveToFirebase — путь привязан к uid пользователя
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
// FIX 2: loadChatHistory — только данные текущего пользователя
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
            // Нет сообщений — показываем пустой блок обратно
            if (emptyEl) emptyEl.style.display = 'flex';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const item = document.createElement('div');
            item.className = 'history-item';
            const icon = data.role === 'user' ? '👤' : '🤖';
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
// FIX 3: toggleFavorite — путь привязан к uid пользователя
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
// FIX 4: loadLibrary — uid + правильный контейнер #savedItemsContainer
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

// FIX: Correct comment syntax (was "/ ──" causing JS parse error)
// ── DEEP MODE СИСТЕМА ──
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
        addMessageToUI('ai', '🔬 Лимит Deep Mode исчерпан. У вас есть 5 запросов в день. Попробуйте завтра!');
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
// 2. ВСПОМОГАТЕЛЬНЫЕ UI ФУНКЦИИ
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
// QUICK QUESTIONS — 40 вопросов, 4 случайных
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
  const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);
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
    document.body.appendChild(modelDropdown);

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
// 3. ГЛОБАЛЬНЫЕ ФУНКЦИИ ОКНО И ФАЙЛОВ
// ============================================================
window.handleFileSelect = function(input) {
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
            div.style.position = 'relative';
            div.innerHTML = `
                <img src="${e.target.result}" style="width: 55px; height: 55px; border-radius: 10px; object-fit: cover; border: 1px solid #00f2ff; margin-right: 5px;">
                <div onclick="removeImage(this)" style="position: absolute; top: -5px; right: 0px; background: #ff0000; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; border: 1px solid #fff; z-index: 10;">✕</div>
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
    const m = document.getElementById(id);
    if (m) {
        m.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            m.classList.add('active');
            if (id === 'whatsNewModal') initLumifexSystem();
        }, 10);
    }
};

window.closeModal = function(id) {
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => { m.style.display = 'none'; }, 400);
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

    // FIX: handleAI — auth check FIRST, then deep mode check
    window.handleAI = async function handleAI() {
        // 1. Проверка авторизации
        if (!currentUser) {
            window.openModal('authModal');
            return;
        }

        // 2. Проверка Deep Mode лимита
        const isDeepMode = document.getElementById('mainAppLayout')?.classList.contains('deep-mode');
        if (isDeepMode) {
            if (!checkDeepLimit()) return;
            incrementDeepUsage();
            const remaining = DEEP_LIMIT - getDeepUsage();
            console.log(`Deep Mode: ${remaining} запросов осталось`);
        }

        const text = userInput?.value.trim();
        const filesToSend = [...selectedFiles];
        if (!text && filesToSend.length === 0) return;

        const currentProvider = selectedProvider;
        if (!isLiveMode) {
    // Показываем текст + фото в сообщении пользователя
    let userContent = text || '';
    if (filesToSend.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const msgDiv = addMessageToUI('user', 
                `${userContent ? userContent + '<br>' : ''}<img src="${e.target.result}" style="max-width:200px;border-radius:10px;margin-top:6px;display:block;">`
            );
        };
        reader.readAsDataURL(filesToSend[0]);
    } else {
        addMessageToUI('user', userContent);
    }
        }
        saveToFirebase('user', text);

        userInput.value = "";
        selectedFiles = [];
        const preview = document.getElementById('imagePreviewContainer');
        if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }

        const botMsgElement = isLiveMode 
            ? { querySelector: () => ({ innerText: '', textContent: '' }) } 
            : addMessageToUI('ai', "Solifon thinking...");
      
        try {
            const formData = new FormData();
            const finalPrompt = isDeepMode 
                ? `[ГЛУБОКИЙ АНАЛИЗ] Отвечай как эксперт. Объясняй ПОЧЕМУ ты пришёл к каждому выводу. Показывай логику шаг за шагом. Приводи примеры и доказательства. Запрос: ${text}`
                : text;
            formData.append('prompt', finalPrompt);
            formData.append('provider', currentProvider);
            formData.append('use_voice', isLiveMode ? 'true' : 'false');
            if (filesToSend.length > 0) formData.append('file', filesToSend[0]);

            const response = await fetch("https://germanhcsuj-itssoimportandforme.hf.space/chat", {
                method: "POST",
                body: formData
            });

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
                if (botMsgElement?.querySelector) {
                    const t = botMsgElement.querySelector('.text');
                    if (t) t.innerText = "Ошибка соединения.";
                }
            }
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
    icon: "𓆩𓇽𓆪", 
    description: "работает без интернета", 
    stats: ["Доступность: Всегда готов ", "Скорость отклика : Обработка идет прямо на вашем железе — никакой задержки сети (пинга)."],
    info: "Работайте над важными проектами в полете или в местах, где нет связи..",
    skills: [{n: "Конфиденциальность", p: 100}, {n: "Автономность", p: 100}, {n: "Контроль данных ", p: 100}]
  },
  { 
    title: "SOLIFON SOUL", 
    icon: "𓆩𓋖𓆪", 
    description: "разговорит как живой человек", 
    stats: ["Video Intelligence:", "Giant Context:"],
    info: "Понимает интонации, музыку и звуки. Можно просто отправить голосовое сообщение — Soul поймет всё до последнего вздоха..",
    skills: [{n: "Объем памяти", p: 100}, {n: "Эмпатия и контекст", p: 100}, {n: "Работа с данными", p: 95}]
  },
  { 
    title: "SOLIFON ULTRA", 
    icon: "—͟͟͞͞☢︎", 
    description: "самый умный модел", 
    stats: ["Мультимодальность: Актуальность данных", "Стабильность: 100%"],
    info: "Точность фактов .",
    skills: [{n: "Логическое мышление", p: 98}, {n: "Креативность и стиль", p: 98}]
  },
  { 
    title: "SOLIFON AIR", 
    icon: "𓆩⚝𓆪", 
    description: "отвечает мгновенно", 
    stats: ["Скорость: до 2000к", "Стабильность: 99%"],
    info: "Быстрое распознавание объектов на фото и сканирование документов на лету.",
    skills: [{n: "Повседневная эффективность", p: 100}, {n: "Мультимодальность", p: 92}]
  },
  { 
    title: "SOLIFON UNBOUND", 
    icon: "—͟͟͞͞𖣘", 
    description: "работает без цензуры", 
    stats: ["Работа с данными: 100%", "Следование инструкциям: Математический анализ"],
    info: "Мой самый амбициозный модел. Этот модел представляется сабой Прямой доступ к знаниям без «безопасных» искажений..",
    skills: [{n: "Обход фильтров ", p: 98}, {n: "Следование инструкциям", p: 96}]
  },
  { 
    title:"SOLIFON MOTION", 
    icon: "𓆩✧𓆪", 
    description: "делают качественные видео", 
    stats: ["От киберпанка до классической живописи:", "Идеальные руки, глаза и пропорции тела:"],
    info: "На Лунной базе я сосредоточился на автоматизации добычи ресурсов. Весь процесс управляется удаленно через этот интерфейс, минимизируя риски для персонала.",
    skills: [{n: "Фотореализм", p: 95}, {n: "Сложные композиции", p: 92}]
  },
  { 
    title: "SOLIFON PULSE", 
    icon: "—͟͟͞͞⚙︎", 
    description: "самая лучшая модел и работает без цензуры", 
    stats: ["Скорость: 500–800 токенов в секунду", "Мгновенный старт:"],
    info: "Прямой доступ к новостям, курсам валют и событиям, произошедшим всего 5 минут назад..",
    skills: [{n: "Эффективность", p: 100}, {n: "Скорость генерации", p: 100}]
  },
  { 
    title: "SOLIFON ECHO", 
    icon: "🌀", 
    description: "полноценная имитация человеческих эмоций и интонаций", 
    stats: ["Мультиязычность:", "Идеально справляется со сложными пошаговыми командами :"],
    info: "Способность передать гнев, радость, шепот или иронию в зависимости от контекста текста.",
    skills: [{n: "Естественность голоса", p: 100}, {n: "Скорость озвучки", p: 96}]
  },
  { 
    title: "SOLIFON FLOW", 
    icon: "—͟͟͞͞🗡️", 
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
                document.getElementById('mainAppLayout').style.display = 'none';
                document.getElementById('main-screen').style.display = 'block';
                window.filterCards('physics', document.querySelector('.tab-button'));
            });
        }
    }, 100);
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
        indentWithTabs: true,
        lineWrapping: true,
        viewportMargin: Infinity 
    };
    codeEditors.html = CodeMirror.fromTextArea(document.getElementById("html-edit-area"), { ...config, mode: "xml" });
    codeEditors.css = CodeMirror.fromTextArea(document.getElementById("css-edit-area"), { ...config, mode: "css" });
    codeEditors.js = CodeMirror.fromTextArea(document.getElementById("js-edit-area"), { ...config, mode: "javascript" });
    codeEditors.py = CodeMirror.fromTextArea(document.getElementById("py-edit-area"), { ...config, mode: "python" });
    codeEditors.html.setValue("\n<div class='hero'>\n  <h1>Hello World</h1>\n  <button onclick='greet()'>Click Me</button>\n</div>");
    codeEditors.css.setValue(".hero {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  height: 100vh;\n  background: #1e1e1e;\n  color: #00f2ff;\n  font-family: sans-serif;\n}");
    codeEditors.js.setValue("function greet() {\n  alert('Lumifex Engine Active!');\n}");
    codeEditors.py.setValue("print('Python running in Lumifex AI...')\nfor i in range(3):\n    print(f'Syncing core... {i+1}')");
}

window.openEditorTab = function(evt, lang) {
    document.querySelectorAll(".editor-tab-content").forEach(content => {
        content.style.display = "none";
        content.classList.remove("show");
    });
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    const targetBox = document.getElementById(`${lang}-editor-box`);
    if (targetBox) {
        targetBox.style.display = "block";
        targetBox.classList.add("show");
    }
    evt.currentTarget.classList.add("active");
    currentEditorLang = lang;
    setTimeout(() => {
        if (codeEditors[currentEditorLang]) {
            codeEditors[currentEditorLang].refresh();
            codeEditors[currentEditorLang].focus();
        }
    }, 1);
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
    const presScreen = document.getElementById('presentation-screen');
    if(presScreen) {
        presScreen.style.display = 'flex';
        if (Object.keys(codeEditors).length === 0) initLumifexEditors();
        setTimeout(() => window.runEditorCode(), 200);
    }
};

window.closePresentation = function() {
    const presScreen = document.getElementById('presentation-screen');
    if(presScreen) presScreen.style.display = 'none';
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
window.openMaternalModal = function() {
  const navToggle = document.getElementById('nav-toggle');
  if (navToggle) navToggle.checked = false;

  const modal = document.getElementById('maternalModal');
  modal.style.display = 'block';
  mhShowScreen('roleScreen');
};
window.closeMaternalModal = function() {
  document.getElementById('maternalModal').style.display = 'none';
};

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

// --- СОХРАНИТЬ ПРОФИЛЬ РЕБЁНКА (Родитель) ---
window.mhSaveProfile = async function() {
  const fio       = (document.getElementById('mh-fio')?.value || '').trim();
  const dob       = document.getElementById('mh-dob')?.value || '';
  const diagnosis = (document.getElementById('mh-diagnosis')?.value || '').trim();

  if (!fio || !dob || !diagnosis) {
    alert('Заполните ФИО, дату рождения и диагноз');
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

  if (btn) { btn.disabled = false; btn.textContent = 'Сохранить и открыть ИИ-помощника →'; }
};

// --- СОХРАНИТЬ ЗАПИСЬ СПЕЦИАЛИСТА ---
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

  if (btn) { btn.disabled = false; btn.textContent = 'Сохранить и проконсультироваться с ИИ →'; }
};

// --- ОТКРЫТЬ ИИ-ЭКРАН ---
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
    if (badge) badge.textContent = '👧 ' + (mhCurrentChild.fio || 'Ребёнок');
    if (aiName) aiName.textContent = 'SoulDrive — Советник родителей';
    greeting = `Здравствуйте! Я SoulDrive, ваш помощник.\n\nЯ знаю о **${mhCurrentChild.fio}**: диагноз **${mhCurrentChild.diagnosis}**, навыки: ${mhCurrentChild.skills.length ? mhCurrentChild.skills.join(', ') : 'не указаны'}.\n\nЧем могу помочь? Могу предложить домашние упражнения, ответить на вопросы о развитии или поддержать вас.`;
  } else if (role === 'specialist') {
    if (badge) badge.textContent = '👩‍⚕️ Специалист';
    if (aiName) aiName.textContent = 'SoulDrive — Ассистент специалиста';
    greeting = `Здравствуйте, коллега! Я SoulDrive.\n\nЗапись по ребёнку **${mhCurrentChild.fio}** сохранена. Я могу помочь с:\n— Методиками коррекции\n— Составлением индивидуального маршрута\n— Рекомендациями для родителей\n\nЧто вас интересует?`;
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
    system = `Ты SoulDrive — добрый ИИ-помощник для родителей детей с особыми потребностями в Казахстане.
Ребёнок: ${mhCurrentChild.fio||'—'}, диагноз: ${mhCurrentChild.diagnosis||'—'}, навыки: ${(mhCurrentChild.skills||[]).join(', ')||'не указаны'}.
Давай конкретные, простые и добрые советы на русском языке. Ответы 2-4 предложения. Всегда заканчивай позитивно.`;
  } else {
    system = `Ты SoulDrive — профессиональный ИИ-ассистент для специалистов (логопедов, дефектологов, психологов) в Казахстане.
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

// ── DOWNLOAD MODAL ──
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
      <div style="font-size:48px;text-align:center">📱</div>
      <h3 style="color:#00f2ff;text-align:center">Установка на Android</h3>
      <p>1. Нажми <b>⋮</b> три точки в Chrome</p>
      <p>2. Выбери <b>"Установить приложение"</b></p>
      <p>3. Нажми <b>"Установить"</b></p>
      <p style="opacity:0.5;font-size:12px;text-align:center">Иконка Solifon AI появится на главном экране</p>`;
  } else if (isIOS) {
    steps = `
      <div style="font-size:48px;text-align:center">📱</div>
      <h3 style="color:#00f2ff;text-align:center">Установка на iPhone</h3>
      <p>1. Нажми кнопку <b>□↑ Поделиться</b> внизу</p>
      <p>2. Выбери <b>"На экран Домой"</b></p>
      <p>3. Нажми <b>"Добавить"</b></p>`;
  } else {
    steps = `
      <div style="font-size:48px;text-align:center">💻</div>
      <h3 style="color:#00f2ff;text-align:center">Установка на Windows/Mac</h3>
      <p>1. В Chrome нажми <b>⋮</b></p>
      <p>2. Выбери <b>"Установить Solifon AI"</b></p>
      <p style="opacity:0.5;font-size:12px;text-align:center">Или нажми иконку ⊕ в адресной строке</p>`;
  }

  document.querySelector('#pwaTipModal .modal-body').innerHTML = steps;
  openModal('pwaTipModal');
}