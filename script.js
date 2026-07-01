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

// РћР±СЂР°Р±РѕС‚РєР° РІРѕР·РІСЂР°С‚Р° РїРѕСЃР»Рµ Google redirect (РјРѕР±РёР»СЊРЅС‹Рµ)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            // Р—Р°РєСЂС‹РІР°РµРј РјРѕРґР°Р»РєСѓ РїСЂРё Р»СЋР±РѕРј СЃРїРѕСЃРѕР±Рµ РІС…РѕРґР°
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
// РІвЂќР‚РІвЂќР‚ AUTH: Email + Password РІвЂќР‚РІвЂќР‚
let authMode = 'login'; // 'login' РёР»Рё 'register'

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
        submitBtn.textContent = 'Р’РѕР№С‚Рё';
        title.textContent = 'Р’РѕР№РґРёС‚Рµ РІ Р°РєРєР°СѓРЅС‚';
    } else {
        btnReg.style.background = '#fff';
        btnReg.style.color = '#000';
        btnLogin.style.background = 'transparent';
        btnLogin.style.color = '#fff';
        submitBtn.textContent = 'РЎРѕР·РґР°С‚СЊ Р°РєРєР°СѓРЅС‚';
        title.textContent = 'Р РµРіРёСЃС‚СЂР°С†РёСЏ';
    }
    document.getElementById('authError').textContent = '';
};

window.submitAuth = function() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    const btn = document.getElementById('authSubmitBtn');
    
    // Р’Р°Р»РёРґР°С†РёСЏ
    if (!email || !password) {
        errorEl.textContent = 'Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'РџР°СЂРѕР»СЊ РјРёРЅРёРјСѓРј 6 СЃРёРјРІРѕР»РѕРІ';
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
                'auth/user-not-found': 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ',
                'auth/wrong-password': 'РќРµРІРµСЂРЅС‹Р№ РїР°СЂРѕР»СЊ',
                'auth/email-already-in-use': 'Email СѓР¶Рµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ',
                'auth/invalid-email': 'РќРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ email',
                'auth/weak-password': 'РџР°СЂРѕР»СЊ СЃР»РёС€РєРѕРј СЃР»Р°Р±С‹Р№',
                'auth/invalid-credential': 'РќРµРІРµСЂРЅС‹Р№ email РёР»Рё РїР°СЂРѕР»СЊ',
            };
            errorEl.textContent = msgs[err.code] || 'РћС€РёР±РєР°: ' + err.message;
        })
        .finally(() => {
            btn.textContent = authMode === 'login' ? 'Р’РѕР№С‚Рё' : 'РЎРѕР·РґР°С‚СЊ Р°РєРєР°СѓРЅС‚';
            btn.disabled = false;
        });
};

// ============================================================
// FIX 1: saveToFirebase РІР‚вЂќ РїСѓС‚СЊ РїСЂРёРІСЏР·Р°РЅ Рє uid РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
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
// FIX 2: loadChatHistory РІР‚вЂќ С‚РѕР»СЊРєРѕ РґР°РЅРЅС‹Рµ С‚РµРєСѓС‰РµРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
// ============================================================
function loadChatHistory() {
    if (!database || !currentUser) return;
    const historyContainer = document.getElementById('chatHistoryItems');
    if (!historyContainer) return;

    // РЎРєСЂС‹РІР°РµРј СЃС‚Р°С‚РёС‡РЅС‹Р№ "РїСѓСЃС‚РѕР№" Р±Р»РѕРє РїРѕРєР° РіСЂСѓР·РёРј
    const emptyEl = document.querySelector('#chatPanel .empty-library');
    if (emptyEl) emptyEl.style.display = 'none';

    historyContainer.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.5;">Loading history...</div>';

    const uid = currentUser.uid;
    database.ref(`users/${uid}/chat_history`).limitToLast(15).once('value', (snapshot) => {
        historyContainer.innerHTML = '';

        if (!snapshot.exists()) {
            // РќРµС‚ СЃРѕРѕР±С‰РµРЅРёР№ РІР‚вЂќ РїРѕРєР°Р·С‹РІР°РµРј РїСѓСЃС‚РѕР№ Р±Р»РѕРє РѕР±СЂР°С‚РЅРѕ
            if (emptyEl) emptyEl.style.display = 'flex';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const item = document.createElement('div');
            item.className = 'history-item';
            const icon = data.role === 'user' ? 'СЂСџвЂВ¤' : 'СЂСџВ¤вЂ“';
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
// FIX 3: toggleFavorite РІР‚вЂќ РїСѓС‚СЊ РїСЂРёРІСЏР·Р°РЅ Рє uid РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
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
// FIX 4: loadLibrary РІР‚вЂќ uid + РїСЂР°РІРёР»СЊРЅС‹Р№ РєРѕРЅС‚РµР№РЅРµСЂ #savedItemsContainer
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
            libraryContainer.innerHTML = '<div style="padding:40px; text-align:center; opacity:0.3;">Р’Р°С€Р° Р±РёР±Р»РёРѕС‚РµРєР° РїСѓСЃС‚Р°.<br>РћС‚РјРµС‚СЊС‚Рµ РІР°Р¶РЅС‹Рµ СЃРѕРѕР±С‰РµРЅРёСЏ Р·РІРµР·РґРѕС‡РєРѕР№ РІ С‡Р°С‚Рµ.</div>';
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
// 1. Р“Р›РћР‘РђР›Р¬РќР«Р• РџР•Р Р•РњР•РќРќР«Р•
// ============================================================
let isLiveMode = false;
let liveRecognition = null;
let selectedFiles = []; 
let isVoiceResponseActive = false; 
const MAX_IMAGES = 5;
let selectedProvider = 'gemini';
let lumifexActive = false;

// FIX: Correct comment syntax (was "/ РІвЂќР‚РІвЂќР‚" causing JS parse error)
// РІвЂќР‚РІвЂќР‚ DEEP MODE РЎР ВРЎРўР•РњРђ РІвЂќР‚РІвЂќР‚
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
        addMessageToUI('ai', 'СЂСџвЂќВ¬ Р›РёРјРёС‚ Deep Mode РёСЃС‡РµСЂРїР°РЅ. РЈ РІР°СЃ РµСЃС‚СЊ 5 Р·Р°РїСЂРѕСЃРѕРІ РІ РґРµРЅСЊ. РџРѕРїСЂРѕР±СѓР№С‚Рµ Р·Р°РІС‚СЂР°!');
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
// 2. Р’РЎРџРћРњРћР“РђРўР•Р›Р¬РќР«Р• UI Р¤РЈРќРљР¦Р ВР В
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
            // РџРѕРєР°Р·С‹РІР°РµРј РЅР°РєРѕРїР»РµРЅРЅС‹Р№ С‚РµРєСЃС‚ СЃ С„РѕСЂРјР°С‚РёСЂРѕРІР°РЅРёРµРј
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
// QUICK QUESTIONS РІР‚вЂќ 40 РІРѕРїСЂРѕСЃРѕРІ, 4 СЃР»СѓС‡Р°Р№РЅС‹С…
// ============================================================
const ALL_QUESTIONS = [
  { icon: "ph ph-brain", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РЅРµР№СЂРѕРЅРЅР°СЏ СЃРµС‚СЊ?" },
  { icon: "ph ph-atom", text: "РћР±СЉСЏСЃРЅРё РєРІР°РЅС‚РѕРІСѓСЋ РјРµС…Р°РЅРёРєСѓ" },
  { icon: "ph ph-rocket-launch", text: "РљР°Рє РЅР°РїРёСЃР°С‚СЊ Р±РёР·РЅРµСЃ-РїР»Р°РЅ?" },
  { icon: "ph ph-lightning", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РјР°С€РёРЅРЅРѕРµ РѕР±СѓС‡РµРЅРёРµ?" },
  { icon: "ph ph-globe", text: "РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ РёРЅС‚РµСЂРЅРµС‚?" },
  { icon: "ph ph-dna", text: "Р§С‚Рѕ С‚Р°РєРѕРµ Р”РќРљ Рё РєР°Рє РѕРЅР° СЂР°Р±РѕС‚Р°РµС‚?" },
  { icon: "ph ph-star", text: "Р§С‚Рѕ С‚Р°РєРѕРµ С‡С‘СЂРЅР°СЏ РґС‹СЂР°?" },
  { icon: "ph ph-code", text: "РљР°Рє РЅР°С‡Р°С‚СЊ РїСЂРѕРіСЂР°РјРјРёСЂРѕРІР°С‚СЊ СЃ РЅСѓР»СЏ?" },
  { icon: "ph ph-currency-dollar", text: "РљР°Рє РЅР°С‡Р°С‚СЊ РёРЅРІРµСЃС‚РёСЂРѕРІР°С‚СЊ?" },
  { icon: "ph ph-heartbeat", text: "РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ РёРјРјСѓРЅРЅР°СЏ СЃРёСЃС‚РµРјР°?" },
  { icon: "ph ph-cpu", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹Р№ РёРЅС‚РµР»Р»РµРєС‚?" },
  { icon: "ph ph-currency-bitcoin", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РєСЂРёРїС‚РѕРІР°Р»СЋС‚Р°?" },
  { icon: "ph ph-leaf", text: "Р§С‚Рѕ С‚Р°РєРѕРµ С„РѕС‚РѕСЃРёРЅС‚РµР·?" },
  { icon: "ph ph-map-pin", text: "РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ GPS?" },
  { icon: "ph ph-shield-check", text: "РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ РІР°РєС†РёРЅР°?" },
  { icon: "ph ph-robot", text: "Р§С‚Рѕ С‚Р°РєРѕРµ ChatGPT?" },
  { icon: "ph ph-books", text: "РљР°Рє РІС‹СѓС‡РёС‚СЊ Р°РЅРіР»РёР№СЃРєРёР№ Р±С‹СЃС‚СЂРѕ?" },
  { icon: "ph ph-wave-sine", text: "РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ Р»Р°Р·РµСЂ?" },
  { icon: "ph ph-planet", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РїР°СЂР°Р»Р»РµР»СЊРЅС‹Рµ РІСЃРµР»РµРЅРЅС‹Рµ?" },
  { icon: "ph ph-thermometer-hot", text: "Р§С‚Рѕ С‚Р°РєРѕРµ С‚РµСЂРјРѕСЏРґРµСЂРЅС‹Р№ СЃРёРЅС‚РµР·?" },
  { icon: "ph ph-users", text: "РљР°Рє СЂР°Р±РѕС‚Р°СЋС‚ СЃРѕС†РёР°Р»СЊРЅС‹Рµ СЃРµС‚Рё?" },
  { icon: "ph ph-desktop", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РјРµС‚Р°РІСЃРµР»РµРЅРЅР°СЏ?" },
  { icon: "ph ph-paint-brush", text: "РљР°Рє СЃРѕР·РґР°С‚СЊ СЃРІРѕС‘ РїСЂРёР»РѕР¶РµРЅРёРµ?" },
  { icon: "ph ph-recycle", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РєР»РёРјР°С‚РёС‡РµСЃРєРёРµ РёР·РјРµРЅРµРЅРёСЏ?" },
  { icon: "ph ph-chart-line-up", text: "РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ СЌРєРѕРЅРѕРјРёРєР°?" },
  { icon: "ph ph-smiley", text: "РљР°Рє СЃРїСЂР°РІРёС‚СЊСЃСЏ СЃРѕ СЃС‚СЂРµСЃСЃРѕРј?" },
  { icon: "ph ph-magnifying-glass", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РЅР°РЅРѕС‚РµС…РЅРѕР»РѕРіРёРё?" },
  { icon: "ph ph-flask", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РіРµРЅРµС‚РёС‡РµСЃРєР°СЏ РёРЅР¶РµРЅРµСЂРёСЏ?" },
  { icon: "ph ph-infinity", text: "РћР±СЉСЏСЃРЅРё С‚РµРѕСЂРёСЋ РѕС‚РЅРѕСЃРёС‚РµР»СЊРЅРѕСЃС‚Рё" },
  { icon: "ph ph-timer", text: "РљР°Рє СѓР»СѓС‡С€РёС‚СЊ РїР°РјСЏС‚СЊ?" },
  { icon: "ph ph-notebook", text: "РљР°Рє РЅР°РїРёСЃР°С‚СЊ СЂРµР·СЋРјРµ?" },
  { icon: "ph ph-sun", text: "РљР°Рє РјРµРґРёС‚Р°С†РёСЏ РІР»РёСЏРµС‚ РЅР° РјРѕР·Рі?" },
  { icon: "ph ph-graph", text: "РљР°Рє РёР·СѓС‡РёС‚СЊ Python Р·Р° РјРµСЃСЏС†?" },
  { icon: "ph ph-eye", text: "Р§С‚Рѕ С‚Р°РєРѕРµ С„РёР»РѕСЃРѕС„РёСЏ СЃРѕР·РЅР°РЅРёСЏ?" },
  { icon: "ph ph-fire", text: "Р§С‚Рѕ С‚Р°РєРѕРµ Р°РЅС‚РёРјР°С‚РµСЂРёСЏ?" },
  { icon: "ph ph-sparkle", text: "РљР°Рє СѓСЃС‚СЂРѕРµРЅ С‡РµР»РѕРІРµС‡РµСЃРєРёР№ РјРѕР·Рі?" },
  { icon: "ph ph-robot", text: "Р§С‚Рѕ С‚Р°РєРѕРµ СЂРѕР±РѕС‚РѕС‚РµС…РЅРёРєР°?" },
  { icon: "ph ph-cloud", text: "Р§С‚Рѕ С‚Р°РєРѕРµ Р±РѕР»СЊС€РѕР№ РІР·СЂС‹РІ?" },
  { icon: "ph ph-hand-coins", text: "РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ Р±Р»РѕРєС‡РµР№РЅ?" },
  { icon: "ph ph-monitor-play", text: "РљР°Рє СЃРѕР·РґР°С‚СЊ СЃР°Р№С‚ СЃ РЅСѓР»СЏ?" }
];

function renderQuickPills() {
  const container = document.getElementById('quickPills');
  if (!container) return;
  const selected = [
    { icon: "ph ph-cpu", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹Р№ РёРЅС‚РµР»Р»РµРєС‚?" },
    { icon: "ph ph-desktop", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РјРµС‚Р°РІСЃРµР»РµРЅРЅР°СЏ?" },
    { icon: "ph ph-fire", text: "Р§С‚Рѕ С‚Р°РєРѕРµ Р°РЅС‚РёРјР°С‚РµСЂРёСЏ?" },
    { icon: "ph ph-lightning", text: "Р§С‚Рѕ С‚Р°РєРѕРµ РјР°С€РёРЅРЅРѕРµ РѕР±СѓС‡РµРЅРёРµ?" }
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
// 3. Р“Р›РћР‘РђР›Р¬РќР«Р• Р¤РЈРќРљР¦Р ВР В РћРљРќРћ Р В Р¤РђР™Р›РћР’
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
                <div onclick="removeImage(this)" style="position: absolute; top: -5px; right: 0px; background: #ff0000; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; border: 1px solid #fff; z-index: 10;">РІСљвЂў</div>
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
// 4. РћРЎРќРћР’РќРђРЇ Р›РћР“РРљРђ (DOMContentLoaded)
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

    // FIX 5: New Chat РєРЅРѕРїРєР°
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

    if (text.toLowerCase().startsWith("Р±СЂР°СѓР·РµСЂ:")) {
        let task = text.replace(/Р±СЂР°СѓР·РµСЂ:/i, '').trim();
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

    const stage1 = ["Р Р°Р·Р±РѕСЂ СЃРµРјР°РЅС‚РёС‡РµСЃРєРѕР№ СЃС‚СЂСѓРєС‚СѓСЂС‹ Р·Р°РїСЂРѕСЃР°...", "РР·РІР»РµС‡РµРЅРёРµ РєР»СЋС‡РµРІС‹С… СЃСѓС‰РЅРѕСЃС‚РµР№ Рё РЅР°РјРµСЂРµРЅРёР№...", "РћРїСЂРµРґРµР»РµРЅРёРµ РєРѕРЅС‚РµРєСЃС‚РЅРѕР№ РіР»СѓР±РёРЅС‹...", "РџРѕСЃС‚СЂРѕРµРЅРёРµ РєР°СЂС‚С‹ Р»РѕРіРёС‡РµСЃРєРёС… СЃРІСЏР·РµР№...", "РљР»Р°СЃСЃРёС„РёРєР°С†РёСЏ РёРЅС‚РµРЅС‚Р° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ...", "Р Р°СЃРїРѕР·РЅР°РІР°РЅРёРµ СЃРєСЂС‹С‚С‹С… РїР°С‚С‚РµСЂРЅРѕРІ РІ С‚РµРєСЃС‚Рµ...", "РћС†РµРЅРєР° С‚РѕРЅР°Р»СЊРЅРѕСЃС‚Рё РІС…РѕРґРЅС‹С… РґР°РЅРЅС‹С…...", "РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ РІРµРєС‚РѕСЂРѕРІ РІРЅРёРјР°РЅРёСЏ..."];
    const stage2 = ["РЎРєР°РЅРёСЂРѕРІР°РЅРёРµ РјРЅРѕРіРѕРјРµСЂРЅС‹С… Р±Р°Р· РґР°РЅРЅС‹С…...", "РР·РІР»РµС‡РµРЅРёРµ СЂРµР»РµРІР°РЅС‚РЅС‹С… РєРѕРЅС‚РµРєСЃС‚РЅС‹С… Р±Р»РѕРєРѕРІ...", "РћР±СЂР°С‰РµРЅРёРµ Рє РјРѕРґСѓР»СЏРј РґРѕР»РіРѕСЃСЂРѕС‡РЅРѕР№ РїР°РјСЏС‚Рё...", "РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РёРЅС„РѕСЂРјР°С†РёРѕРЅРЅС‹С… РїРѕС‚РѕРєРѕРІ...", "Р¤РёР»СЊС‚СЂР°С†РёСЏ РёР·Р±С‹С‚РѕС‡РЅРѕРіРѕ С€СѓРјР°...", "РџРѕРёСЃРє РїРµСЂРµСЃРµС‡РµРЅРёР№ РІ РІРµРєС‚РѕСЂРЅРѕРј РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІРµ...", "РР·РІР»РµС‡РµРЅРёРµ Р°СЃСЃРѕС†РёР°С‚РёРІРЅС‹С… РїР°С‚С‚РµСЂРЅРѕРІ...", "РЎР±РѕСЂ РІРµСЂРёС„РёС†РёСЂРѕРІР°РЅРЅС‹С… С„Р°РєС‚РѕРІ..."];
    const stage3 = ["РљСЂРѕСЃСЃ-РІРµСЂРёС„РёРєР°С†РёСЏ РЅР°Р№РґРµРЅРЅС‹С… РёСЃС‚РѕС‡РЅРёРєРѕРІ...", "РЈСЃС‚СЂР°РЅРµРЅРёРµ Р»РѕРіРёС‡РµСЃРєРёС… РїСЂРѕС‚РёРІРѕСЂРµС‡РёР№...", "РџСЂРѕРІРµСЂРєР° РєРѕРЅС‚РµРєСЃС‚Р° РЅР° Р±РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ (Safety Check)...", "РљР°СЃРєР°РґРЅР°СЏ РІР°Р»РёРґР°С†РёСЏ Р°СЂРіСѓРјРµРЅС‚РѕРІ...", "РћС†РµРЅРєР° РґРѕСЃС‚РѕРІРµСЂРЅРѕСЃС‚Рё РјРµС‚Р°РґР°РЅРЅС‹С…...", "Р’Р·РІРµС€РёРІР°РЅРёРµ РІРµСЂРѕСЏС‚РЅРѕСЃС‚РЅС‹С… РёСЃС…РѕРґРѕРІ...", "РћРїС‚РёРјРёР·Р°С†РёСЏ С†РµРїРѕС‡РєРё СЂР°СЃСЃСѓР¶РґРµРЅРёР№..."];
    const stage4 = ["Р—Р°РїСѓСЃРє РїСЂРѕС†РµСЃСЃРѕРІ СЏР·С‹РєРѕРІРѕРіРѕ СЃРёРЅС‚РµР·Р°...", "Р¤РѕСЂРјРёСЂРѕРІР°РЅРёРµ СЃС‚СЂСѓРєС‚СѓСЂС‹ С„РёРЅР°Р»СЊРЅС‹С… С‚РµР·РёСЃРѕРІ...", "РђРґР°РїС‚Р°С†РёСЏ СЃС‚РёР»РёСЃС‚РёРєРё РїРѕРґ РєРѕРЅС‚РµРєСЃС‚ Р±РµСЃРµРґС‹...", "РџРѕРґР±РѕСЂ С‚РѕС‡РЅС‹С… Р»РёРЅРіРІРёСЃС‚РёС‡РµСЃРєРёС… С„РѕСЂРјСѓР»РёСЂРѕРІРѕРє...", "РљР°Р»РёР±СЂРѕРІРєР° РїР°СЂР°РјРµС‚СЂРѕРІ РІС‹РІРѕРґР° С‚РµРєСЃС‚Р°...", "Р¤РёРЅР°Р»СЊРЅС‹Р№ СЂРµРЅРґРµСЂРёРЅРі РѕС‚РІРµС‚Р° РјРѕРґРµР»Рё...", "РџСЂРѕРІРµСЂРєР° РіСЂР°РјРјР°С‚РёС‡РµСЃРєРёС… РїР°С‚С‚РµСЂРЅРѕРІ..."];
    
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
            ? `[Р“Р›РЈР‘РћРљРР™ РђРќРђР›РР—] РћС‚РІРµС‡Р°Р№ РєР°Рє СЌРєСЃРїРµСЂС‚. РћР±СЉСЏСЃРЅСЏР№ РџРћР§Р•РњРЈ С‚С‹ РїСЂРёС€С‘Р» Рє РєР°Р¶РґРѕРјСѓ РІС‹РІРѕРґСѓ. РџРѕРєР°Р·С‹РІР°Р№ Р»РѕРіРёРєСѓ С€Р°Рі Р·Р° С€Р°РіРѕРј. РџСЂРёРІРѕРґРё РїСЂРёРјРµСЂС‹ Рё РґРѕРєР°Р·Р°С‚РµР»СЊСЃС‚РІР°. Р—Р°РїСЂРѕСЃ: ${text}`
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
                    if (status) status.innerText = "РќРµС‚ РѕС‚РІРµС‚Р°...";
                    setTimeout(() => { if (isLiveMode) startLiveListening(); }, 1000);
                } else {
                    if (status) status.innerText = "РћС‚РІРµС‚ РїРѕР»СѓС‡РµРЅ вњ“";
                    speakText(reply);
                }
            }
        }
    } catch (error) {
        if (isLiveMode) {
            const status = document.getElementById('liveStatus');
            if (status) status.innerText = "РћС€РёР±РєР°... РїРѕРІС‚РѕСЂ С‡РµСЂРµР· 2 СЃРµРє";
            setTimeout(() => { if (isLiveMode) startLiveListening(); }, 2000);
        } else {
            if (botMsgElement && botMsgElement.querySelector) {
                const t = botMsgElement.querySelector('.text');
                if (t) t.innerText = "РћС€РёР±РєР° СЃРѕРµРґРёРЅРµРЅРёСЏ.";
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
            if (err.error === 'not-allowed') alert("Р”РѕСЃС‚СѓРї Рє РјРёРєСЂРѕС„РѕРЅСѓ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ. Р Р°Р·СЂРµС€РёС‚Рµ РµРіРѕ РІ РЅР°СЃС‚СЂРѕР№РєР°С… Р±СЂР°СѓР·РµСЂР°.");
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
    icon: "СЂвЂњвЂ В©СЂвЂњвЂЎР…СЂвЂњвЂ Р„", 
    description: "СЂР°Р±РѕС‚Р°РµС‚ Р±РµР· РёРЅС‚РµСЂРЅРµС‚Р°", 
    stats: ["Р”РѕСЃС‚СѓРїРЅРѕСЃС‚СЊ: Р’СЃРµРіРґР° РіРѕС‚РѕРІ ", "РЎРєРѕСЂРѕСЃС‚СЊ РѕС‚РєР»РёРєР° : РћР±СЂР°Р±РѕС‚РєР° РёРґРµС‚ РїСЂСЏРјРѕ РЅР° РІР°С€РµРј Р¶РµР»РµР·Рµ РІР‚вЂќ РЅРёРєР°РєРѕР№ Р·Р°РґРµСЂР¶РєРё СЃРµС‚Рё (РїРёРЅРіР°)."],
    info: "Р Р°Р±РѕС‚Р°Р№С‚Рµ РЅР°Рґ РІР°Р¶РЅС‹РјРё РїСЂРѕРµРєС‚Р°РјРё РІ РїРѕР»РµС‚Рµ РёР»Рё РІ РјРµСЃС‚Р°С…, РіРґРµ РЅРµС‚ СЃРІСЏР·Рё..",
    skills: [{n: "РљРѕРЅС„РёРґРµРЅС†РёР°Р»СЊРЅРѕСЃС‚СЊ", p: 100}, {n: "РђРІС‚РѕРЅРѕРјРЅРѕСЃС‚СЊ", p: 100}, {n: "РљРѕРЅС‚СЂРѕР»СЊ РґР°РЅРЅС‹С… ", p: 100}]
  },
  { 
    title: "SOLIFON SOUL", 
    icon: "СЂвЂњвЂ В©СЂвЂњвЂ№вЂ“СЂвЂњвЂ Р„", 
    description: "СЂР°Р·РіРѕРІРѕСЂРёС‚ РєР°Рє Р¶РёРІРѕР№ С‡РµР»РѕРІРµРє", 
    stats: ["Video Intelligence:", "Giant Context:"],
    info: "РџРѕРЅРёРјР°РµС‚ РёРЅС‚РѕРЅР°С†РёРё, РјСѓР·С‹РєСѓ Рё Р·РІСѓРєРё. РњРѕР¶РЅРѕ РїСЂРѕСЃС‚Рѕ РѕС‚РїСЂР°РІРёС‚СЊ РіРѕР»РѕСЃРѕРІРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ РІР‚вЂќ Soul РїРѕР№РјРµС‚ РІСЃС‘ РґРѕ РїРѕСЃР»РµРґРЅРµРіРѕ РІР·РґРѕС…Р°..",
    skills: [{n: "РћР±СЉРµРј РїР°РјСЏС‚Рё", p: 100}, {n: "Р­РјРїР°С‚РёСЏ Рё РєРѕРЅС‚РµРєСЃС‚", p: 100}, {n: "Р Р°Р±РѕС‚Р° СЃ РґР°РЅРЅС‹РјРё", p: 95}]
  },
  { 
    title: "SOLIFON ULTRA", 
    icon: "РІР‚вЂќРќСџРќСџРќС›РќС›РІВСћРїС‘Р‹", 
    description: "СЃР°РјС‹Р№ СѓРјРЅС‹Р№ РјРѕРґРµР»", 
    stats: ["РњСѓР»СЊС‚РёРјРѕРґР°Р»СЊРЅРѕСЃС‚СЊ: РђРєС‚СѓР°Р»СЊРЅРѕСЃС‚СЊ РґР°РЅРЅС‹С…", "РЎС‚Р°Р±РёР»СЊРЅРѕСЃС‚СЊ: 100%"],
    info: "РўРѕС‡РЅРѕСЃС‚СЊ С„Р°РєС‚РѕРІ .",
    skills: [{n: "Р›РѕРіРёС‡РµСЃРєРѕРµ РјС‹С€Р»РµРЅРёРµ", p: 98}, {n: "РљСЂРµР°С‚РёРІРЅРѕСЃС‚СЊ Рё СЃС‚РёР»СЊ", p: 98}]
  },
  { 
    title: "SOLIFON AIR", 
    icon: "СЂвЂњвЂ В©РІС™СњСЂвЂњвЂ Р„", 
    description: "РѕС‚РІРµС‡Р°РµС‚ РјРіРЅРѕРІРµРЅРЅРѕ", 
    stats: ["РЎРєРѕСЂРѕСЃС‚СЊ: РґРѕ 2000Рє", "РЎС‚Р°Р±РёР»СЊРЅРѕСЃС‚СЊ: 99%"],
    info: "Р‘С‹СЃС‚СЂРѕРµ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ РѕР±СЉРµРєС‚РѕРІ РЅР° С„РѕС‚Рѕ Рё СЃРєР°РЅРёСЂРѕРІР°РЅРёРµ РґРѕРєСѓРјРµРЅС‚РѕРІ РЅР° Р»РµС‚Сѓ.",
    skills: [{n: "РџРѕРІСЃРµРґРЅРµРІРЅР°СЏ СЌС„С„РµРєС‚РёРІРЅРѕСЃС‚СЊ", p: 100}, {n: "РњСѓР»СЊС‚РёРјРѕРґР°Р»СЊРЅРѕСЃС‚СЊ", p: 92}]
  },
  { 
    title: "SOLIFON UNBOUND", 
    icon: "РІР‚вЂќРќСџРќСџРќС›РќС›СЂвЂ“Р€В", 
    description: "СЂР°Р±РѕС‚Р°РµС‚ Р±РµР· С†РµРЅР·СѓСЂС‹", 
    stats: ["Р Р°Р±РѕС‚Р° СЃ РґР°РЅРЅС‹РјРё: 100%", "РЎР»РµРґРѕРІР°РЅРёРµ РёРЅСЃС‚СЂСѓРєС†РёСЏРј: РњР°С‚РµРјР°С‚РёС‡РµСЃРєРёР№ Р°РЅР°Р»РёР·"],
    info: "РњРѕР№ СЃР°РјС‹Р№ Р°РјР±РёС†РёРѕР·РЅС‹Р№ РјРѕРґРµР». Р­С‚РѕС‚ РјРѕРґРµР» РїСЂРµРґСЃС‚Р°РІР»СЏРµС‚СЃСЏ СЃР°Р±РѕР№ РџСЂСЏРјРѕР№ РґРѕСЃС‚СѓРї Рє Р·РЅР°РЅРёСЏРј Р±РµР· Р’В«Р±РµР·РѕРїР°СЃРЅС‹С…Р’В» РёСЃРєР°Р¶РµРЅРёР№..",
    skills: [{n: "РћР±С…РѕРґ С„РёР»СЊС‚СЂРѕРІ ", p: 98}, {n: "РЎР»РµРґРѕРІР°РЅРёРµ РёРЅСЃС‚СЂСѓРєС†РёСЏРј", p: 96}]
  },
  { 
    title:"SOLIFON MOTION", 
    icon: "СЂвЂњвЂ В©РІСљВ§СЂвЂњвЂ Р„", 
    description: "РґРµР»Р°СЋС‚ РєР°С‡РµСЃС‚РІРµРЅРЅС‹Рµ РІРёРґРµРѕ", 
    stats: ["РћС‚ РєРёР±РµСЂРїР°РЅРєР° РґРѕ РєР»Р°СЃСЃРёС‡РµСЃРєРѕР№ Р¶РёРІРѕРїРёСЃРё:", "Р ВРґРµР°Р»СЊРЅС‹Рµ СЂСѓРєРё, РіР»Р°Р·Р° Рё РїСЂРѕРїРѕСЂС†РёРё С‚РµР»Р°:"],
    info: "РќР° Р›СѓРЅРЅРѕР№ Р±Р°Р·Рµ СЏ СЃРѕСЃСЂРµРґРѕС‚РѕС‡РёР»СЃСЏ РЅР° Р°РІС‚РѕРјР°С‚РёР·Р°С†РёРё РґРѕР±С‹С‡Рё СЂРµСЃСѓСЂСЃРѕРІ. Р’РµСЃСЊ РїСЂРѕС†РµСЃСЃ СѓРїСЂР°РІР»СЏРµС‚СЃСЏ СѓРґР°Р»РµРЅРЅРѕ С‡РµСЂРµР· СЌС‚РѕС‚ РёРЅС‚РµСЂС„РµР№СЃ, РјРёРЅРёРјРёР·РёСЂСѓСЏ СЂРёСЃРєРё РґР»СЏ РїРµСЂСЃРѕРЅР°Р»Р°.",
    skills: [{n: "Р¤РѕС‚РѕСЂРµР°Р»РёР·Рј", p: 95}, {n: "РЎР»РѕР¶РЅС‹Рµ РєРѕРјРїРѕР·РёС†РёРё", p: 92}]
  },
  { 
    title: "SOLIFON PULSE", 
    icon: "РІР‚вЂќРќСџРќСџРќС›РќС›РІС™в„ўРїС‘Р‹", 
    description: "СЃР°РјР°СЏ Р»СѓС‡С€Р°СЏ РјРѕРґРµР» Рё СЂР°Р±РѕС‚Р°РµС‚ Р±РµР· С†РµРЅР·СѓСЂС‹", 
    stats: ["РЎРєРѕСЂРѕСЃС‚СЊ: 500РІР‚вЂњ800 С‚РѕРєРµРЅРѕРІ РІ СЃРµРєСѓРЅРґСѓ", "РњРіРЅРѕРІРµРЅРЅС‹Р№ СЃС‚Р°СЂС‚:"],
    info: "РџСЂСЏРјРѕР№ РґРѕСЃС‚СѓРї Рє РЅРѕРІРѕСЃС‚СЏРј, РєСѓСЂСЃР°Рј РІР°Р»СЋС‚ Рё СЃРѕР±С‹С‚РёСЏРј, РїСЂРѕРёР·РѕС€РµРґС€РёРј РІСЃРµРіРѕ 5 РјРёРЅСѓС‚ РЅР°Р·Р°Рґ..",
    skills: [{n: "Р­С„С„РµРєС‚РёРІРЅРѕСЃС‚СЊ", p: 100}, {n: "РЎРєРѕСЂРѕСЃС‚СЊ РіРµРЅРµСЂР°С†РёРё", p: 100}]
  },
  { 
    title: "SOLIFON ECHO", 
    icon: "СЂСџРЉР‚", 
    description: "РїРѕР»РЅРѕС†РµРЅРЅР°СЏ РёРјРёС‚Р°С†РёСЏ С‡РµР»РѕРІРµС‡РµСЃРєРёС… СЌРјРѕС†РёР№ Рё РёРЅС‚РѕРЅР°С†РёР№", 
    stats: ["РњСѓР»СЊС‚РёСЏР·С‹С‡РЅРѕСЃС‚СЊ:", "Р ВРґРµР°Р»СЊРЅРѕ СЃРїСЂР°РІР»СЏРµС‚СЃСЏ СЃРѕ СЃР»РѕР¶РЅС‹РјРё РїРѕС€Р°РіРѕРІС‹РјРё РєРѕРјР°РЅРґР°РјРё :"],
    info: "РЎРїРѕСЃРѕР±РЅРѕСЃС‚СЊ РїРµСЂРµРґР°С‚СЊ РіРЅРµРІ, СЂР°РґРѕСЃС‚СЊ, С€РµРїРѕС‚ РёР»Рё РёСЂРѕРЅРёСЋ РІ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ РєРѕРЅС‚РµРєСЃС‚Р° С‚РµРєСЃС‚Р°.",
    skills: [{n: "Р•СЃС‚РµСЃС‚РІРµРЅРЅРѕСЃС‚СЊ РіРѕР»РѕСЃР°", p: 100}, {n: "РЎРєРѕСЂРѕСЃС‚СЊ РѕР·РІСѓС‡РєРё", p: 96}]
  },
  { 
    title: "SOLIFON FLOW", 
    icon: "РІР‚вЂќРќСџРќСџРќС›РќС›СЂСџвЂ”РЋРїС‘РЏ", 
    description: "СЃР°РјС‹Р№ Р»СѓС‡С€РёР№ РјРѕРґРµР» РґР»СЏ РєРѕРґР°", 
    stats: ["РЎС‚Р°Р±РёР»СЊРЅРѕСЃС‚СЊ:", "СЃС‚Р°РЅРґР°СЂС‚РЅС‹С… С‚РµРєСЃС‚РѕРІС‹С… Р·Р°РґР°С‡Р°С…:"],
    info: ".",
    skills: [{n: "Р­С„С„РµРєС‚РёРІРЅРѕСЃС‚СЊ", p: 100}, {n: "Р‘Р°Р»Р°РЅСЃ РњРѕС‰Рё", p: 95}, {n: "РЎР»РµРґРѕРІР°РЅРёРµ РёРЅСЃС‚СЂСѓРєС†РёСЏРј", p: 96}]
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
        if (status) status.innerText = "РџРѕРґРєР»СЋС‡РµРЅРёРµ Рє СЃРµСЂРІРµСЂСѓ...";
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
    if (!SpeechRecognition) { alert("Р“РѕР»РѕСЃРѕРІРѕР№ РІРІРѕРґ РЅРµ РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ СЌС‚РёРј Р±СЂР°СѓР·РµСЂРѕРј."); return; }
    liveRecognition = new SpeechRecognition();
    liveRecognition.lang = 'ru-RU';
    liveRecognition.interimResults = false;
    liveRecognition.onstart = () => {
        const status = document.getElementById('liveStatus');
        if (status) status.innerText = "Solifon СЃР»СѓС€Р°РµС‚...";
    };
    liveRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const status = document.getElementById('liveStatus');
        if (status) status.innerText = "Lumifex РѕС‚РІРµС‡Р°РµС‚...";
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
// SOLIFON HOTFIX: reliable "РђРЅР°РЅС‹РўР€ Р¶РўР‡СЂРµРіС–" opening
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

    // Starter code вЂ” modern & styled
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
    <div class="badge">вњ¦ Solifon Code</div>
    <h1>Hello, <span class="accent">World</span>!</h1>
    <p>Р РµРґР°РєС‚РёСЂСѓР№ РєРѕРґ вЂ” РІРёРґСЊ СЂРµР·СѓР»СЊС‚Р°С‚ РІ СЂРµР°Р»СЊРЅРѕРј РІСЂРµРјРµРЅРё.</p>
    <button onclick="greet()">РќР°Р¶РјРё РјРµРЅСЏ</button>
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
  // РђРЅРёРјРёСЂРѕРІР°РЅРЅС‹Р№ Р°Р»РµСЂС‚
  const btn = document.querySelector('button');
  btn.textContent = 'рџЋ‰ РџСЂРёРІРµС‚!';
  btn.style.background = '#2ea043';
  setTimeout(() => {
    btn.textContent = 'РќР°Р¶РјРё РјРµРЅСЏ';
    btn.style.background = '';
  }, 2000);
}`);

    codeEditors.py.setValue(`# Python РІ Р±СЂР°СѓР·РµСЂРµ вЂ” Solifon Playground
print("рџљЂ Python Engine Active!")
print("-" * 30)

for i in range(1, 6):
    stars = "в…" * i
    print(f"РЈСЂРѕРІРµРЅСЊ {i}: {stars}")

print("-" * 30)
print("вњ“ Р“РѕС‚РѕРІРѕ!")`); 

    // Track cursor position
    Object.entries(codeEditors).forEach(([lang, editor]) => {
        editor.on('cursorActivity', (cm) => {
            if (lang !== currentEditorLang) return;
            const cur = cm.getCursor();
            const el = document.getElementById('ide-cursor-pos');
            if (el) el.textContent = `Ln ${cur.line + 1}, Col ${cur.ch + 1}`;
            const linesEl = document.getElementById('ide-lines-count');
            if (linesEl) linesEl.textContent = `${cm.lineCount()} СЃС‚СЂРѕРє`;
        });
        editor.on('change', (cm) => {
            const linesEl = document.getElementById('ide-lines-count');
            if (linesEl && lang === currentEditorLang) linesEl.textContent = `${cm.lineCount()} СЃС‚СЂРѕРє`;
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
            if (lc) lc.textContent = `${codeEditors[currentEditorLang].lineCount()} СЃС‚СЂРѕРє`;
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
    if (status) status.innerText = "Lumifex РіРѕРІРѕСЂРёС‚...";
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

// РќР°РґС‘Р¶РЅР°СЏ РїСЂРёРІСЏР·РєР° РґР»СЏ РјРѕР±РёР»СЊРЅС‹С…
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
//  РњРђРўР¬ РЎР•Р Р”Р¦Рђ
// ================================================

let mhCurrentChild = {};
let mhConversation = [];

// --- РћС‚РєСЂС‹С‚СЊ / Р—Р°РєСЂС‹С‚СЊ ---

// --- РџРµСЂРµРєР»СЋС‡РµРЅРёРµ СЌРєСЂР°РЅРѕРІ ---
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

// --- Р—Р°РіСЂСѓР·РєР° С„Р°Р№Р»РѕРІ ---
window.mhHandleDocs = function(input) {
  const files = Array.from(input.files);
  const listEl = document.getElementById('mh-fileList');
  if (listEl) listEl.innerHTML = files.map(f => `<div style="margin-top:4px">СЂСџвЂњвЂћ ${f.name}</div>`).join('');
};

// --- РќР°РІС‹РєРё ---
window.mhToggleSkill = function(el) { el.classList.toggle('selected'); };

// FIX 6: mhLoadStats РІР‚вЂќ С„СѓРЅРєС†РёСЏ РЅРµ СЃСѓС‰РµСЃС‚РІРѕРІР°Р»Р°, РєРЅРѕРїРєР° "РћР±РЅРѕРІРёС‚СЊ" РїР°РґР°Р»Р° СЃ РѕС€РёР±РєРѕР№
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

// --- РЎРћРҐР РђРќР ВРўР¬ РџР РћР¤Р ВР›Р¬ Р Р•Р‘РЃРќРљРђ (Р РѕРґРёС‚РµР»СЊ) ---
window.mhSaveProfile = async function() {
  const fio       = (document.getElementById('mh-fio')?.value || '').trim();
  const dob       = document.getElementById('mh-dob')?.value || '';
  const diagnosis = (document.getElementById('mh-diagnosis')?.value || '').trim();

  if (!fio || !dob || !diagnosis) {
    alert('Р—Р°РїРѕР»РЅРёС‚Рµ Р¤Р ВРћ, РґР°С‚Сѓ СЂРѕР¶РґРµРЅРёСЏ Рё РґРёР°РіРЅРѕР·');
    return;
  }

  const skills = Array.from(document.querySelectorAll('.mh-skill-tag.selected')).map(el => el.textContent.trim());
  mhCurrentChild = { fio, dob, diagnosis, skills, createdAt: Date.now(), role: 'parent' };

  const btn = document.querySelector('#mh-parentScreen .mh-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'РЎРѕС…СЂР°РЅСЏРµРј...'; }

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

  if (btn) { btn.disabled = false; btn.textContent = 'РЎРѕС…СЂР°РЅРёС‚СЊ Рё РѕС‚РєСЂС‹С‚СЊ Р ВР В-РїРѕРјРѕС‰РЅРёРєР° РІвЂ вЂ™'; }
};

// --- РЎРћРҐР РђРќР ВРўР¬ Р—РђРџР ВРЎР¬ РЎРџР•Р¦Р ВРђР›Р ВРЎРўРђ ---
window.mhSaveSession = async function() {
  const child   = (document.getElementById('sp-childName')?.value || '').trim();
  const type    = document.getElementById('sp-sessionType')?.value || '';
  const notes   = (document.getElementById('sp-notes')?.value || '').trim();
  const result  = (document.getElementById('sp-result')?.value || '').trim();

  if (!child || !notes) {
    alert('Р—Р°РїРѕР»РЅРёС‚Рµ РёРјСЏ СЂРµР±С‘РЅРєР° Рё РѕРїРёСЃР°РЅРёРµ Р·Р°РЅСЏС‚РёСЏ');
    return;
  }

  const sessionData = { child, type, notes, result, createdAt: Date.now(), role: 'specialist' };
  mhCurrentChild = { fio: child, diagnosis: type, skills: [], role: 'specialist' };

  const btn = document.querySelector('#mh-specialistScreen .mh-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'РЎРѕС…СЂР°РЅСЏРµРј...'; }

  try {
    if (typeof database !== 'undefined' && database) {
      await database.ref('anany_zhuregi/sessions/' + Date.now()).set(sessionData);
    }
    setTimeout(() => mhOpenAI('specialist'), 900);
  } catch(e) {
    setTimeout(() => mhOpenAI('specialist'), 300);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'РЎРѕС…СЂР°РЅРёС‚СЊ Рё РїСЂРѕРєРѕРЅСЃСѓР»СЊС‚РёСЂРѕРІР°С‚СЊСЃСЏ СЃ Р ВР В РІвЂ вЂ™'; }
};

// --- РћРўРљР Р«РўР¬ Р ВР В-Р­РљР РђРќ ---
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
    if (badge) badge.textContent = 'СЂСџвЂВ§ ' + (mhCurrentChild.fio || 'Р РµР±С‘РЅРѕРє');
    if (aiName) aiName.textContent = 'SoulDrive РІР‚вЂќ РЎРѕРІРµС‚РЅРёРє СЂРѕРґРёС‚РµР»РµР№';
    greeting = `Р—РґСЂР°РІСЃС‚РІСѓР№С‚Рµ! РЇ SoulDrive, РІР°С€ РїРѕРјРѕС‰РЅРёРє.\n\nРЇ Р·РЅР°СЋ Рѕ **${mhCurrentChild.fio}**: РґРёР°РіРЅРѕР· **${mhCurrentChild.diagnosis}**, РЅР°РІС‹РєРё: ${mhCurrentChild.skills.length ? mhCurrentChild.skills.join(', ') : 'РЅРµ СѓРєР°Р·Р°РЅС‹'}.\n\nР§РµРј РјРѕРіСѓ РїРѕРјРѕС‡СЊ? РњРѕРіСѓ РїСЂРµРґР»РѕР¶РёС‚СЊ РґРѕРјР°С€РЅРёРµ СѓРїСЂР°Р¶РЅРµРЅРёСЏ, РѕС‚РІРµС‚РёС‚СЊ РЅР° РІРѕРїСЂРѕСЃС‹ Рѕ СЂР°Р·РІРёС‚РёРё РёР»Рё РїРѕРґРґРµСЂР¶Р°С‚СЊ РІР°СЃ.`;
  } else if (role === 'specialist') {
    if (badge) badge.textContent = 'СЂСџвЂВ©РІР‚РЊРІС™вЂўРїС‘РЏ РЎРїРµС†РёР°Р»РёСЃС‚';
    if (aiName) aiName.textContent = 'SoulDrive РІР‚вЂќ РђСЃСЃРёСЃС‚РµРЅС‚ СЃРїРµС†РёР°Р»РёСЃС‚Р°';
    greeting = `Р—РґСЂР°РІСЃС‚РІСѓР№С‚Рµ, РєРѕР»Р»РµРіР°! РЇ SoulDrive.\n\nР—Р°РїРёСЃСЊ РїРѕ СЂРµР±С‘РЅРєСѓ **${mhCurrentChild.fio}** СЃРѕС…СЂР°РЅРµРЅР°. РЇ РјРѕРіСѓ РїРѕРјРѕС‡СЊ СЃ:\nРІР‚вЂќ РњРµС‚РѕРґРёРєР°РјРё РєРѕСЂСЂРµРєС†РёРё\nРІР‚вЂќ РЎРѕСЃС‚Р°РІР»РµРЅРёРµРј РёРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕРіРѕ РјР°СЂС€СЂСѓС‚Р°\nРІР‚вЂќ Р РµРєРѕРјРµРЅРґР°С†РёСЏРјРё РґР»СЏ СЂРѕРґРёС‚РµР»РµР№\n\nР§С‚Рѕ РІР°СЃ РёРЅС‚РµСЂРµСЃСѓРµС‚?`;
  }

  mhShowScreen('aiScreen');
  mhAddAI(greeting);
}

// --- Р”РѕР±Р°РІРёС‚СЊ СЃРѕРѕР±С‰РµРЅРёСЏ ---
function mhAddAI(text) {
  const c = document.getElementById('mh-aiMessages');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'mh-msg ai';
  d.innerHTML = `
    <div class="mh-msg-avatar">СЂСџвЂ™вЂ”</div>
    <div class="mh-msg-bubble">${text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</div>`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
function mhAddUser(text) {
  const c = document.getElementById('mh-aiMessages');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'mh-msg user';
  d.innerHTML = `<div class="mh-msg-avatar">СЂСџвЂВ¤</div><div class="mh-msg-bubble">${text}</div>`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
function mhShowTyping() {
  const c = document.getElementById('mh-aiMessages');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'mh-msg ai'; d.id = 'mh-typing';
  d.innerHTML = `<div class="mh-msg-avatar">СЂСџвЂ™вЂ”</div><div class="mh-typing"><span></span><span></span><span></span></div>`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
function mhRemoveTyping() {
  const t = document.getElementById('mh-typing');
  if (t) t.remove();
}

// --- РћС‚РїСЂР°РІРёС‚СЊ СЃРѕРѕР±С‰РµРЅРёРµ ---
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
    system = `РўС‹ SoulDrive РІР‚вЂќ РґРѕР±СЂС‹Р№ Р ВР В-РїРѕРјРѕС‰РЅРёРє РґР»СЏ СЂРѕРґРёС‚РµР»РµР№ РґРµС‚РµР№ СЃ РѕСЃРѕР±С‹РјРё РїРѕС‚СЂРµР±РЅРѕСЃС‚СЏРјРё РІ РљР°Р·Р°С…СЃС‚Р°РЅРµ.
Р РµР±С‘РЅРѕРє: ${mhCurrentChild.fio||'РІР‚вЂќ'}, РґРёР°РіРЅРѕР·: ${mhCurrentChild.diagnosis||'РІР‚вЂќ'}, РЅР°РІС‹РєРё: ${(mhCurrentChild.skills||[]).join(', ')||'РЅРµ СѓРєР°Р·Р°РЅС‹'}.
Р”Р°РІР°Р№ РєРѕРЅРєСЂРµС‚РЅС‹Рµ, РїСЂРѕСЃС‚С‹Рµ Рё РґРѕР±СЂС‹Рµ СЃРѕРІРµС‚С‹ РЅР° СЂСѓСЃСЃРєРѕРј СЏР·С‹РєРµ. РћС‚РІРµС‚С‹ 2-4 РїСЂРµРґР»РѕР¶РµРЅРёСЏ. Р’СЃРµРіРґР° Р·Р°РєР°РЅС‡РёРІР°Р№ РїРѕР·РёС‚РёРІРЅРѕ.`;
  } else {
    system = `РўС‹ SoulDrive РІР‚вЂќ РїСЂРѕС„РµСЃСЃРёРѕРЅР°Р»СЊРЅС‹Р№ Р ВР В-Р°СЃСЃРёСЃС‚РµРЅС‚ РґР»СЏ СЃРїРµС†РёР°Р»РёСЃС‚РѕРІ (Р»РѕРіРѕРїРµРґРѕРІ, РґРµС„РµРєС‚РѕР»РѕРіРѕРІ, РїСЃРёС…РѕР»РѕРіРѕРІ) РІ РљР°Р·Р°С…СЃС‚Р°РЅРµ.
РћС‚РІРµС‡Р°Р№ РЅР° СЂСѓСЃСЃРєРѕРј СЏР·С‹РєРµ. Р”Р°РІР°Р№ РјРµС‚РѕРґРёС‡РµСЃРєРёРµ СЂРµРєРѕРјРµРЅРґР°С†РёРё, СѓРїСЂР°Р¶РЅРµРЅРёСЏ Рё СЃРѕРІРµС‚С‹ РїРѕ РєРѕСЂСЂРµРєС†РёРѕРЅРЅРѕР№ СЂР°Р±РѕС‚Рµ.`;
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
    const reply = data.content?.[0]?.text || 'РћС€РёР±РєР°. РџРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР°.';
    mhRemoveTyping();
    mhAddAI(reply);
    mhConversation.push({ role: 'assistant', content: reply });
  } catch(e) {
    mhRemoveTyping();
    mhAddAI('РќРµС‚ СЃРѕРµРґРёРЅРµРЅРёСЏ. РџСЂРѕРІРµСЂСЊС‚Рµ РёРЅС‚РµСЂРЅРµС‚.');
  }
};

// РІвЂќР‚РІвЂќР‚ DOWNLOAD MODAL РІвЂќР‚РІвЂќР‚
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
      <div style="font-size:48px;text-align:center">СЂСџвЂњВ±</div>
      <h3 style="color:#00f2ff;text-align:center">РЈСЃС‚Р°РЅРѕРІРєР° РЅР° Android</h3>
      <p>1. РќР°Р¶РјРё <b>РІвЂ№В®</b> С‚СЂРё С‚РѕС‡РєРё РІ Chrome</p>
      <p>2. Р’С‹Р±РµСЂРё <b>"РЈСЃС‚Р°РЅРѕРІРёС‚СЊ РїСЂРёР»РѕР¶РµРЅРёРµ"</b></p>
      <p>3. РќР°Р¶РјРё <b>"РЈСЃС‚Р°РЅРѕРІРёС‚СЊ"</b></p>
      <p style="opacity:0.5;font-size:12px;text-align:center">Р ВРєРѕРЅРєР° Solifon AI РїРѕСЏРІРёС‚СЃСЏ РЅР° РіР»Р°РІРЅРѕРј СЌРєСЂР°РЅРµ</p>`;
  } else if (isIOS) {
    steps = `
      <div style="font-size:48px;text-align:center">СЂСџвЂњВ±</div>
      <h3 style="color:#00f2ff;text-align:center">РЈСЃС‚Р°РЅРѕРІРєР° РЅР° iPhone</h3>
      <p>1. РќР°Р¶РјРё РєРЅРѕРїРєСѓ <b>РІвЂ“РЋРІвЂ вЂ РџРѕРґРµР»РёС‚СЊСЃСЏ</b> РІРЅРёР·Сѓ</p>
      <p>2. Р’С‹Р±РµСЂРё <b>"РќР° СЌРєСЂР°РЅ Р”РѕРјРѕР№"</b></p>
      <p>3. РќР°Р¶РјРё <b>"Р”РѕР±Р°РІРёС‚СЊ"</b></p>`;
  } else {
    steps = `
      <div style="font-size:48px;text-align:center">СЂСџвЂ™В»</div>
      <h3 style="color:#00f2ff;text-align:center">РЈСЃС‚Р°РЅРѕРІРєР° РЅР° Windows/Mac</h3>
      <p>1. Р’ Chrome РЅР°Р¶РјРё <b>РІвЂ№В®</b></p>
      <p>2. Р’С‹Р±РµСЂРё <b>"РЈСЃС‚Р°РЅРѕРІРёС‚СЊ Solifon AI"</b></p>
      <p style="opacity:0.5;font-size:12px;text-align:center">Р ВР»Рё РЅР°Р¶РјРё РёРєРѕРЅРєСѓ РІР‰вЂў РІ Р°РґСЂРµСЃРЅРѕР№ СЃС‚СЂРѕРєРµ</p>`;
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
      newChat: 'New Chat',
      system: 'РЎРёСЃС‚РµРјР°',
      whatsNew: "What's New",
      about: 'About SOLIFON',
      features: 'Р¤СѓРЅРєС†РёРё',
      chat: 'Chat',
      library: 'Library',
      workspaces: 'Р Р°Р±РѕС‡РёРµ Р·РѕРЅС‹',
      newProject: 'New Project',
      presentation: 'Solifon AI Code',
      deep: 'Р“Р»СѓР±РѕРєРёР№ РїРѕРёСЃРє',
      download: 'РЎРєР°С‡Р°С‚СЊ Solifon AI',
      upgradeText: 'РџРµСЂРµР№С‚Рё РЅР° Premium',
      upgrade: 'РЈР»СѓС‡С€РёС‚СЊ',
      historyEmpty: 'Р ВСЃС‚РѕСЂРёСЏ РїСѓСЃС‚Р°',
      chatHistory: 'Р ВСЃС‚РѕСЂРёСЏ С‡Р°С‚РѕРІ',
      modelPick: 'Select Model',
      ask: 'РЎРїСЂРѕСЃРёС‚Рµ Solifon...',
      clear: 'РћС‡РёСЃС‚РёС‚СЊ С‡Р°С‚',
      mhTitle: 'РђРЅР°РЅС‹РўР€ Р¶РўР‡СЂРµРіС–',
      mhSubtitle: 'Р¦РёС„СЂРѕРІР°СЏ РїР»Р°С‚С„РѕСЂРјР° РїРѕРґРґРµСЂР¶РєРё СЃРµРјСЊРё',
      mhParent: 'Р РѕРґРёС‚РµР»СЊ',
      mhParentDesc: 'РџСЂРѕС„РёР»СЊ СЂРµР±РµРЅРєР°, РЅР°РІС‹РєРё Рё Р·Р°РґР°РЅРёСЏ РѕС‚ Р ВР В',
      mhSpecialist: 'РЎРїРµС†РёР°Р»РёСЃС‚',
      mhSpecialistDesc: 'Р–СѓСЂРЅР°Р» Р·Р°РЅСЏС‚РёР№ Рё РєРѕСЂСЂРµРєС†РёРѕРЅРЅС‹Рµ РјРµС‚РѕРґРёРєРё',
      mhDirector: 'Р СѓРєРѕРІРѕРґРёС‚РµР»СЊ',
      mhDirectorDesc: 'РЈРїСЂР°РІР»РµРЅРёРµ С†РµРЅС‚СЂРѕРј Рё Р°РЅР°Р»РёС‚РёРєР°',
      childProfile: 'РџСЂРѕС„РёР»СЊ СЂРµР±РµРЅРєР°',
      childProfileDesc: 'Р”Р°РЅРЅС‹Рµ СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ РІ РІР°С€РµРј Р°РєРєР°СѓРЅС‚Рµ',
      personalInfo: 'Р›РёС‡РЅР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ',
      childName: 'Р¤Р ВРћ СЂРµР±РµРЅРєР°',
      childNamePh: 'РќР°РїСЂРёРјРµСЂ: РђР»РёР±РµРє РЎРµР№С‚РѕРІ',
      dob: 'Р”Р°С‚Р° СЂРѕР¶РґРµРЅРёСЏ (Р”Р”.РњРњ.Р“Р“Р“Р“)',
      diagnosis: 'Р”РёР°РіРЅРѕР· / РѕСЃРѕР±РµРЅРЅРѕСЃС‚Рё',
      diagnosisPh: 'РќР°РїСЂРёРјРµСЂ: Р—Р Р , Р”Р¦Рџ, Р РђРЎ...',
      docs: 'Р”РѕРєСѓРјРµРЅС‚С‹',
      upload: 'РќР°Р¶РјРёС‚Рµ, С‡С‚РѕР±С‹ Р·Р°РіСЂСѓР·РёС‚СЊ',
      uploadHint: 'РЎРїСЂР°РІРєРё, Р·Р°РєР»СЋС‡РµРЅРёСЏ СЃРїРµС†РёР°Р»РёСЃС‚РѕРІ',
      skills: 'РќР°РІС‹РєРё СЂРµР±РµРЅРєР°',
      saveProfile: 'РЎРѕС…СЂР°РЅРёС‚СЊ Рё РѕС‚РєСЂС‹С‚СЊ Р ВР В-РїРѕРјРѕС‰РЅРёРєР°',
      sessionJournal: 'Р–СѓСЂРЅР°Р» Р·Р°РЅСЏС‚РёСЏ',
      sessionDesc: 'Р•РґРёРЅР°СЏ С†РёС„СЂРѕРІР°СЏ Р±Р°Р·Р° РІРјРµСЃС‚Рѕ Р±СѓРјР°Р¶РЅС‹С… С‚РµС‚СЂР°РґРµР№',
      whyTitle: 'Р—Р°С‡РµРј СЌС‚Рѕ?',
      whyText: 'Р’СЃРµ СЃРїРµС†РёР°Р»РёСЃС‚С‹ С†РµРЅС‚СЂР° РІРёРґСЏС‚ РѕР±С‰СѓСЋ Р±Р°Р·Сѓ. РћРґРёРЅ РїСЂРѕС„РёР»СЊ РЅР° РєР°Р¶РґРѕРіРѕ СЂРµР±РµРЅРєР°, Р±РµР· Р±СѓРјР°Р¶РЅРѕР№ РїСѓС‚Р°РЅРёС†С‹.',
      sessionInfo: 'Р ВРЅС„РѕСЂРјР°С†РёСЏ Рѕ Р·Р°РЅСЏС‚РёРё',
      sessionType: 'РўРёРї Р·Р°РЅСЏС‚РёСЏ',
      chooseType: 'Р’С‹Р±РµСЂРёС‚Рµ С‚РёРї...',
      notes: 'Р§С‚Рѕ РґРµР»Р°Р»Рё РЅР° Р·Р°РЅСЏС‚РёРё',
      notesPh: 'РћРїРёС€РёС‚Рµ СѓРїСЂР°Р¶РЅРµРЅРёСЏ, Р°РєС‚РёРІРЅРѕСЃС‚Рё, РјРµС‚РѕРґРёРєРё...',
      result: 'Р РµР·СѓР»СЊС‚Р°С‚ / РЅР°Р±Р»СЋРґРµРЅРёСЏ',
      resultPh: 'РљР°Рє СЂРµР±РµРЅРѕРє СЃРїСЂР°РІРёР»СЃСЏ? Р§С‚Рѕ СѓР»СѓС‡С€РёР»РѕСЃСЊ?',
      rating: 'РћС†РµРЅРєР° Р·Р°РЅСЏС‚РёСЏ',
      saveSession: 'РЎРѕС…СЂР°РЅРёС‚СЊ Рё РїСЂРѕРєРѕРЅСЃСѓР»СЊС‚РёСЂРѕРІР°С‚СЊСЃСЏ СЃ Р ВР В',
      directorPanel: 'РџР°РЅРµР»СЊ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ',
      overview: 'Р¦РµРЅС‚СЂ Р’В«РђРЅР°РЅС‹РўР€ Р¶РўР‡СЂРµРіС–Р’В» РІР‚вЂќ РѕР±Р·РѕСЂ',
      stats: 'РЎС‚Р°С‚РёСЃС‚РёРєР°',
      children: 'Р”РµС‚РµР№ РІ Р±Р°Р·Рµ',
      sessions: 'Р—Р°РЅСЏС‚РёР№',
      villages: 'РЎРµР» РІ РѕС…РІР°С‚Рµ',
      specialists: 'РЎРїРµС†РёР°Р»РёСЃС‚Р°',
      refresh: 'РћР±РЅРѕРІРёС‚СЊ',
      exportReport: 'Р­РєСЃРїРѕСЂС‚ РѕС‚С‡РµС‚Р°',
      team: 'РЎРїРµС†РёР°Р»РёСЃС‚С‹',
      aiReady: 'Р“РѕС‚РѕРІ РїРѕРјРѕС‡СЊ',
      aiInput: 'РќР°РїРёС€РёС‚Рµ РІРѕРїСЂРѕСЃ...'
    },
    kk: {
      code: 'KZ',
      htmlLang: 'kk',
      newChat: 'Р–Р°РўР€Р° С‡Р°С‚',
      system: 'Р–РўР‡Р№Рµ',
      whatsNew: 'Р–Р°РўР€Р°Р»С‹РўвЂєС‚Р°СЂ',
      about: 'SOLIFON С‚СѓСЂР°Р»С‹',
      features: 'РњРўР‡РјРєС–РЅРґС–РєС‚РµСЂ',
      chat: 'Chat',
      library: 'РљС–С‚Р°РїС…Р°РЅР°',
      workspaces: 'Р–РўВ±РјС‹СЃ Р°Р№РјР°РўвЂєС‚Р°СЂС‹',
      newProject: 'Р–Р°РўР€Р° Р¶РѕР±Р°',
      presentation: 'Solifon AI Code',
      deep: 'РўРµСЂРµРўР€ Р·РµСЂС‚С‚РµСѓ',
      download: 'Solifon AI Р¶РўР‡РєС‚РµСѓ',
      upgradeText: 'Premium-РўвЂњР° РЈВ©С‚Сѓ',
      upgrade: 'Р–Р°РўвЂєСЃР°СЂС‚Сѓ',
      historyEmpty: 'РўР°СЂРёС… Р±РѕСЃ',
      chatHistory: 'Р§Р°С‚ С‚Р°СЂРёС…С‹',
      modelPick: 'РњРѕРґРµР»СЊ С‚Р°РўР€РґР°РўР€С‹Р·',
      ask: 'Solifon-РЅР°РЅ СЃРўВ±СЂР°РўР€С‹Р·...',
      clear: 'Р§Р°С‚С‚С‹ С‚Р°Р·Р°Р»Р°Сѓ',
      mhTitle: 'РђРЅР°РЅС‹РўР€ Р¶РўР‡СЂРµРіС–',
      mhSubtitle: 'РћС‚Р±Р°СЃС‹РЅ РўвЂєРѕР»РґР°СѓРўвЂњР° Р°СЂРЅР°Р»РўвЂњР°РЅ С†РёС„СЂР»С‹РўвЂє РїР»Р°С‚С„РѕСЂРјР°',
      mhParent: 'РђС‚Р°-Р°РЅР°',
      mhParentDesc: 'Р‘Р°Р»Р°РЅС‹РўР€ РїСЂРѕС„РёР»С–, РґР°РўвЂњРґС‹Р»Р°СЂС‹ Р¶РЈв„ўРЅРµ Р ВР В С‚Р°РїСЃС‹СЂРјР°Р»Р°СЂС‹',
      mhSpecialist: 'РњР°РјР°РЅ',
      mhSpecialistDesc: 'РЎР°Р±Р°РўвЂє Р¶СѓСЂРЅР°Р»С‹ Р¶РЈв„ўРЅРµ С‚РўР‡Р·РµС‚Сѓ РЈв„ўРґС–СЃС‚РµРјРµР»РµСЂС–',
      mhDirector: 'Р–РµС‚РµРєС€С–',
      mhDirectorDesc: 'РћСЂС‚Р°Р»С‹РўвЂєС‚С‹ Р±Р°СЃРўвЂєР°СЂСѓ Р¶РЈв„ўРЅРµ Р°РЅР°Р»РёС‚РёРєР°',
      childProfile: 'Р‘Р°Р»Р°РЅС‹РўР€ РїСЂРѕС„РёР»С–',
      childProfileDesc: 'Р”РµСЂРµРєС‚РµСЂ Р°РєРєР°СѓРЅС‚С‹РўР€С‹Р·РґР° СЃР°РўвЂєС‚Р°Р»Р°РґС‹',
      personalInfo: 'Р–РµРєРµ Р°РўвЂєРїР°СЂР°С‚',
      childName: 'Р‘Р°Р»Р°РЅС‹РўР€ С‚РѕР»С‹РўвЂє Р°С‚С‹-Р¶РЈВ©РЅС–',
      childNamePh: 'РњС‹СЃР°Р»С‹: РЈВР»С–Р±РµРє РЎРµР№С‚РѕРІ',
      dob: 'РўСѓРўвЂњР°РЅ РєРўР‡РЅС– (РљРљ.РђРђ.Р–Р–Р–Р–)',
      diagnosis: 'Р”РёР°РіРЅРѕР· / РµСЂРµРєС€РµР»С–РєС‚РµСЂ',
      diagnosisPh: 'РњС‹СЃР°Р»С‹: СЃРЈВ©Р№Р»РµСѓ РґР°РјСѓС‹РЅС‹РўР€ РєРµС€С–РіСѓС–, Р‘Р¦Рџ, Р°СѓС‚РёР·Рј...',
      docs: 'РўС™РўВ±Р¶Р°С‚С‚Р°СЂ',
      upload: 'Р–РўР‡РєС‚РµСѓ РўР‡С€С–РЅ Р±Р°СЃС‹РўР€С‹Р·',
      uploadHint: 'РђРЅС‹РўвЂєС‚Р°РјР°Р»Р°СЂ, РјР°РјР°РЅРґР°СЂ РўвЂєРѕСЂС‹С‚С‹РЅРґС‹Р»Р°СЂС‹',
      skills: 'Р‘Р°Р»Р°РЅС‹РўР€ РґР°РўвЂњРґС‹Р»Р°СЂС‹',
      saveProfile: 'РЎР°РўвЂєС‚Р°Рї, Р ВР В-РєРЈВ©РјРµРєС€С–РЅС– Р°С€Сѓ',
      sessionJournal: 'РЎР°Р±Р°РўвЂє Р¶СѓСЂРЅР°Р»С‹',
      sessionDesc: 'РўС™Р°РўвЂњР°Р· РґРЈв„ўРїС‚РµСЂРґС–РўР€ РѕСЂРЅС‹РЅР° РѕСЂС‚Р°РўвЂє С†РёС„СЂР»С‹РўвЂє Р±Р°Р·Р°',
      whyTitle: 'Р‘РўВ±Р» РЅРµ РўР‡С€С–РЅ?',
      whyText: 'РћСЂС‚Р°Р»С‹РўвЂє РјР°РјР°РЅРґР°СЂС‹ РѕСЂС‚Р°РўвЂє Р±Р°Р·Р°РЅС‹ РєРЈВ©СЂРµРґС–. РЈВСЂ Р±Р°Р»Р°РўвЂњР° Р±С–СЂ РїСЂРѕС„РёР»СЊ, РўвЂєР°РўвЂњР°Р· С€Р°С‚Р°СЃСѓС‹ Р¶РѕРўвЂє.',
      sessionInfo: 'РЎР°Р±Р°РўвЂє С‚СѓСЂР°Р»С‹ Р°РўвЂєРїР°СЂР°С‚',
      sessionType: 'РЎР°Р±Р°РўвЂє С‚РўР‡СЂС–',
      chooseType: 'РўРўР‡СЂС–РЅ С‚Р°РўР€РґР°РўР€С‹Р·...',
      notes: 'РЎР°Р±Р°РўвЂєС‚Р° РЅРµ С–СЃС‚РµР»РґС–',
      notesPh: 'Р–Р°С‚С‚С‹РўвЂњСѓР»Р°СЂРґС‹, Р±РµР»СЃРµРЅРґС–Р»С–РєС‚РµСЂРґС–, РЈв„ўРґС–СЃС‚РµРјРµР»РµСЂРґС– Р¶Р°Р·С‹РўР€С‹Р·...',
      result: 'РќРЈв„ўС‚РёР¶Рµ / Р±Р°РўвЂєС‹Р»Р°Сѓ',
      resultPh: 'Р‘Р°Р»Р° РўвЂєР°Р»Р°Р№ РѕСЂС‹РЅРґР°РґС‹? РќРµ Р¶Р°РўвЂєСЃР°СЂРґС‹?',
      rating: 'РЎР°Р±Р°РўвЂєС‚С‹ Р±Р°РўвЂњР°Р»Р°Сѓ',
      saveSession: 'РЎР°РўвЂєС‚Р°Рї, Р ВР В-РјРµРЅ РєРµРўР€РµСЃСѓ',
      directorPanel: 'Р–РµС‚РµРєС€С– РїР°РЅРµР»С–',
      overview: 'Р’В«РђРЅР°РЅС‹РўР€ Р¶РўР‡СЂРµРіС–Р’В» РѕСЂС‚Р°Р»С‹РўвЂњС‹ РІР‚вЂќ С€РѕР»Сѓ',
      stats: 'РЎС‚Р°С‚РёСЃС‚РёРєР°',
      children: 'Р‘Р°Р·Р°РґР°РўвЂњС‹ Р±Р°Р»Р°Р»Р°СЂ',
      sessions: 'РЎР°Р±Р°РўвЂєС‚Р°СЂ',
      villages: 'РўС™Р°РјС‚С‹Р»РўвЂњР°РЅ Р°СѓС‹Р»РґР°СЂ',
      specialists: 'РњР°РјР°РЅ',
      refresh: 'Р–Р°РўР€Р°СЂС‚Сѓ',
      exportReport: 'Р•СЃРµРїС‚С– СЌРєСЃРїРѕСЂС‚С‚Р°Сѓ',
      team: 'РњР°РјР°РЅРґР°СЂ',
      aiReady: 'РљРЈВ©РјРµРєС‚РµСЃСѓРіРµ РґР°Р№С‹РЅ',
      aiInput: 'РЎРўВ±СЂР°РўвЂњС‹РўР€С‹Р·РґС‹ Р¶Р°Р·С‹РўР€С‹Р·...'
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
      overview: 'РІР‚СљMotherРІР‚в„ўs HeartРІР‚Сњ center overview',
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
  packs.ru = packs.en;
  packs.kz = packs.en;

  const skillTexts = {
    ru: ['Р“РѕРІРѕСЂРёС‚ СЃР»РѕРІР°', 'Р“РѕРІРѕСЂРёС‚ РїСЂРµРґР»РѕР¶РµРЅРёСЏ', 'РџРѕРЅРёРјР°РµС‚ СЂРµС‡СЊ', 'РЎР°РјРѕРѕР±СЃР»СѓР¶РёРІР°РЅРёРµ', 'Р РёСЃСѓРµС‚', 'Р§РёС‚Р°РµС‚', 'РЎС‡РµС‚', 'РЎРѕС†РёР°Р»СЊРЅС‹Рµ РЅР°РІС‹РєРё', 'РњРѕС‚РѕСЂРёРєР° СЂСѓРє', 'Р’РЅРёРјР°РЅРёРµ'],
    kk: ['РЎРЈВ©Р· Р°Р№С‚Р°РґС‹', 'РЎРЈВ©Р№Р»РµРј РўвЂєРўВ±СЂР°Р№РґС‹', 'РЎРЈВ©Р·РґС– С‚РўР‡СЃС–РЅРµРґС–', 'РЈРЃР·С–РЅ-РЈВ©Р·С– РєРўР‡С‚Сѓ', 'РЎСѓСЂРµС‚ СЃР°Р»Р°РґС‹', 'РћРўвЂєРёРґС‹', 'РЎР°РЅР°Р№РґС‹', 'РЈВР»РµСѓРјРµС‚С‚С–Рє РґР°РўвЂњРґС‹Р»Р°СЂ', 'РўС™РѕР» РјРѕС‚РѕСЂРёРєР°СЃС‹', 'Р—РµР№С–РЅ'],
    en: ['Says words', 'Uses sentences', 'Understands speech', 'Self-care', 'Draws', 'Reads', 'Counting', 'Social skills', 'Hand motor skills', 'Attention']
  };
  skillTexts.ru = skillTexts.en;
  skillTexts.kz = skillTexts.en;

  const sessionSkillTexts = {
    ru: ['РђРєС‚РёРІРЅРѕ СѓС‡Р°СЃС‚РІРѕРІР°Р»', 'Р‘С‹Р» СЃРѕСЃСЂРµРґРѕС‚РѕС‡РµРЅ', 'Р•СЃС‚СЊ РїСЂРѕРіСЂРµСЃСЃ', 'Р‘С‹Р» РєР°РїСЂРёР·РЅС‹Рј', 'РЈСЃС‚Р°Р» Р±С‹СЃС‚СЂРѕ', 'РўСЂРµР±СѓРµС‚ РїРѕРІС‚РѕСЂР°'],
    kk: ['Р‘РµР»СЃРµРЅРґС– РўвЂєР°С‚С‹СЃС‚С‹', 'Р—РµР№С–РЅС– С‚РўВ±СЂР°РўвЂєС‚С‹ Р±РѕР»РґС‹', 'Р†Р»РіРµСЂС–Р»РµСѓ Р±Р°СЂ', 'РўС™С‹РўР€С‹СЂР»С‹РўвЂє Р±РѕР»РґС‹', 'РўРµР· С€Р°СЂС€Р°РґС‹', 'РўС™Р°Р№С‚Р°Р»Р°Сѓ РўвЂєР°Р¶РµС‚'],
    en: ['Participated actively', 'Stayed focused', 'Progress noticed', 'Was upset', 'Got tired quickly', 'Needs repetition']
  };

  const sessionTypes = {
    ru: ['Р›РѕРіРѕРїРµРґРёС‡РµСЃРєРѕРµ Р·Р°РЅСЏС‚РёРµ', 'Р”РµС„РµРєС‚РѕР»РѕРіРёС‡РµСЃРєРѕРµ Р·Р°РЅСЏС‚РёРµ', 'РџСЃРёС…РѕР»РѕРіРёС‡РµСЃРєРѕРµ Р·Р°РЅСЏС‚РёРµ', 'РђСЂС‚-С‚РµСЂР°РїРёСЏ', 'Р›Р¤Рљ', 'РЎРµРЅСЃРѕСЂРЅР°СЏ РёРЅС‚РµРіСЂР°С†РёСЏ', 'Р”СЂСѓРіРѕРµ'],
    kk: ['Р›РѕРіРѕРїРµРґ СЃР°Р±Р°РўвЂњС‹', 'Р”РµС„РµРєС‚РѕР»РѕРі СЃР°Р±Р°РўвЂњС‹', 'РџСЃРёС…РѕР»РѕРі СЃР°Р±Р°РўвЂњС‹', 'РђСЂС‚-С‚РµСЂР°РїРёСЏ', 'Р•РјРґС–Рє РґРµРЅРµ С€С‹РЅС‹РўвЂєС‚С‹СЂСѓ', 'РЎРµРЅСЃРѕСЂР»С‹РўвЂє РёРЅС‚РµРіСЂР°С†РёСЏ', 'Р‘Р°СЃРўвЂєР°'],
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
// SOLIFON FINAL HOTFIX: keep "РђРЅР°РЅС‹РўР€ Р¶РўР‡СЂРµРіС–" above old handlers
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
      hints.innerHTML = '<span>Р“РѕР»РѕСЃ</span><span>Р ВР В РіРѕРІРѕСЂРёС‚</span><span>Live</span>';
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
      setLiveStatus('Р“РѕР»РѕСЃРѕРІРѕР№ РІРІРѕРґ РІ СЌС‚РѕРј Р±СЂР°СѓР·РµСЂРµ РЅРµРґРѕСЃС‚СѓРїРµРЅ. Live-СЌРєСЂР°РЅ СЂР°Р±РѕС‚Р°РµС‚, РјРѕР¶РЅРѕ Р·Р°РєСЂС‹С‚СЊ Рё РїРёСЃР°С‚СЊ РІ С‡Р°С‚.');
      return;
    }

    try {
      if (liveRecognition) {
        try { liveRecognition.stop(); } catch (error) {}
      }
      liveRecognition = new SpeechRecognition();
      liveRecognition.lang = (document.documentElement.lang === 'kk') ? 'kk-KZ' : (document.documentElement.lang === 'en' ? 'en-US' : 'ru-RU');
      liveRecognition.interimResults = true;
      liveRecognition.onstart = () => setLiveStatus('РЎР»СѓС€Р°СЋ РІР°СЃ... СЃРєР°Р¶РёС‚Рµ РІРѕРїСЂРѕСЃ РґР»СЏ Solifon.');
      liveRecognition.onresult = event => {
        const transcript = Array.from(event.results).map(result => result[0].transcript).join(' ').trim();
        setLiveStatus(transcript ? `РЈСЃР»С‹С€Р°Р»: ${transcript}` : 'РЎР»СѓС€Р°СЋ...');
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
          ? 'Р Р°Р·СЂРµС€РёС‚Рµ РјРёРєСЂРѕС„РѕРЅ РІ Р±СЂР°СѓР·РµСЂРµ, С‡С‚РѕР±С‹ Live РјРѕРі СЃР»СѓС€Р°С‚СЊ РіРѕР»РѕСЃ.'
          : 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РїСѓСЃС‚РёС‚СЊ РјРёРєСЂРѕС„РѕРЅ. РњРѕР¶РЅРѕ Р·Р°РєСЂС‹С‚СЊ Live Рё РЅР°РїРёСЃР°С‚СЊ РІРѕРїСЂРѕСЃ С‚РµРєСЃС‚РѕРј.';
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
      setLiveStatus('Live РѕС‚РєСЂС‹С‚. Р•СЃР»Рё РјРёРєСЂРѕС„РѕРЅ РЅРµ Р·Р°РїСѓСЃС‚РёР»СЃСЏ, РїСЂРѕРІРµСЂСЊС‚Рµ СЂР°Р·СЂРµС€РµРЅРёРµ Р±СЂР°СѓР·РµСЂР°.');
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
    setLiveStatus('РЎР»СѓС€Р°СЋ... РєРѕРіРґР° Р ВР В РѕС‚РІРµС‡Р°РµС‚, Р·РґРµСЃСЊ Р±СѓРґРµС‚ Р°РЅРёРјР°С†РёСЏ РіРѕР»РѕСЃР°.');
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
      download: 'РЎРєР°С‡Р°С‚СЊ Solifon AI',
      upgradeText: 'РџРµСЂРµР№С‚Рё РЅР° Premium',
      upgrade: 'РЈР»СѓС‡С€РёС‚СЊ',
      premiumTitle: 'Solifon Premium',
      premiumSub: 'Р‘РµР·Р»РёРјРёС‚РЅС‹Р№ РґРѕСЃС‚СѓРї РєРѕ РІСЃРµРј РјРѕРґРµР»СЏРј',
      premium1: 'Р’СЃРµ РјРѕРґРµР»Рё Р±РµР· РѕРіСЂР°РЅРёС‡РµРЅРёР№',
      premium2: 'РџСЂРёРѕСЂРёС‚РµС‚РЅС‹Р№ РґРѕСЃС‚СѓРї',
      premium3: 'Р ВСЃС‚РѕСЂРёСЏ С‡Р°С‚РѕРІ',
      premium4: 'Р“РѕР»РѕСЃРѕРІС‹Рµ РѕС‚РІРµС‚С‹',
      premiumSoon: 'РЎРєРѕСЂРѕ РґРѕСЃС‚СѓРїРЅРѕ',
      deep: 'Р“Р»СѓР±РѕРєРёР№ РїРѕРёСЃРє',
      modelPick: 'Select Model',
      ask: 'РЎРїСЂРѕСЃРёС‚Рµ SOLIFON AI С‡С‚Рѕ СѓРіРѕРґРЅРѕ...',
      questions: [
        ['ph ph-cpu', 'Р§С‚Рѕ С‚Р°РєРѕРµ РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹Р№ РёРЅС‚РµР»Р»РµРєС‚?'],
        ['ph ph-desktop', 'Р§С‚Рѕ С‚Р°РєРѕРµ РјРµС‚Р°РІСЃРµР»РµРЅРЅР°СЏ?'],
        ['ph ph-fire', 'Р§С‚Рѕ С‚Р°РєРѕРµ Р°РЅС‚РёРјР°С‚РµСЂРёСЏ?'],
        ['ph ph-lightning', 'Р§С‚Рѕ С‚Р°РєРѕРµ РјР°С€РёРЅРЅРѕРµ РѕР±СѓС‡РµРЅРёРµ?']
      ]
    },
    kk: {
      download: 'Solifon AI Р¶РўР‡РєС‚РµСѓ',
      upgradeText: 'Premium-РўвЂњР° РЈВ©С‚Сѓ',
      upgrade: 'Р–Р°РўвЂєСЃР°СЂС‚Сѓ',
      premiumTitle: 'Solifon Premium',
      premiumSub: 'Р‘Р°СЂР»С‹РўвЂє РјРѕРґРµР»СЊРґРµСЂРіРµ С€РµРєСЃС–Р· РўвЂєРѕР»Р¶РµС‚С–РјРґС–Р»С–Рє',
      premium1: 'Р‘Р°СЂР»С‹РўвЂє РјРѕРґРµР»СЊРґРµСЂ С€РµРєС‚РµСѓСЃС–Р·',
      premium2: 'Р‘Р°СЃС‹Рј РўвЂєРѕР»Р¶РµС‚С–РјРґС–Р»С–Рє',
      premium3: 'Р§Р°С‚ С‚Р°СЂРёС…С‹',
      premium4: 'Р”Р°СѓС‹СЃС‚С‹РўвЂє Р¶Р°СѓР°РїС‚Р°СЂ',
      premiumSoon: 'Р–Р°РўвЂєС‹РЅРґР° РўвЂєРѕР»Р¶РµС‚С–РјРґС–',
      deep: 'РўРµСЂРµРўР€ С–Р·РґРµСѓ',
      modelPick: 'РњРѕРґРµР»СЊ С‚Р°РўР€РґР°РўР€С‹Р·',
      ask: 'SOLIFON AI-РґР°РЅ РєРµР· РєРµР»РіРµРЅ РЅРЈв„ўСЂСЃРµ СЃРўВ±СЂР°РўР€С‹Р·...',
      questions: [
        ['ph ph-cpu', 'Р–Р°СЃР°РЅРґС‹ РёРЅС‚РµР»Р»РµРєС‚ РґРµРіРµРЅ РЅРµ?'],
        ['ph ph-desktop', 'РњРµС‚Р°РІРµСЂСЃ РґРµРіРµРЅ РЅРµ?'],
        ['ph ph-fire', 'РђРЅС‚РёРјР°С‚РµСЂРёСЏ РґРµРіРµРЅ РЅРµ?'],
        ['ph ph-lightning', 'РњР°С€РёРЅР°Р»С‹РўвЂє РѕРўвЂєС‹С‚Сѓ РґРµРіРµРЅ РЅРµ?']
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
  dict.ru = dict.en;
  dict.kz = dict.en;

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
      if (items[index]) items[index].textContent = `РІСљвЂњ  ${text}`;
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
      whatsTitle: "What's New",
      whats01: '01 < РЎРёСЃС‚РµРјРЅС‹Рµ РЅР°РІС‹РєРё />',
      whats02: '02 < РЎРєРѕСЂРѕ />',
      whats03: '03 < РќРѕРІРѕСЃС‚Рё />',
      aboutTitle: 'Рћ SOLIFON AI',
      aboutHero: 'SOLIFON AI',
      aboutLead: 'Solifon AI РѕР±СЉРµРґРёРЅСЏРµС‚ С‡Р°С‚, РїРѕРёСЃРє, РјРѕРґРµР»Рё, РіРѕР»РѕСЃ, РІРёР·СѓР°Р»СЊРЅС‹Рµ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹ Рё СЂР°Р±РѕС‡РёРµ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІР° РІ РѕРґРЅРѕР№ РїР»Р°С‚С„РѕСЂРјРµ.',
      aboutGoal: 'РќР°С€Р° С†РµР»СЊ',
      aboutGoalText: 'РњС‹ СЃРѕР·РґР°С‘Рј СѓРґРѕР±РЅСѓСЋ AI-РїР»Р°С‚С„РѕСЂРјСѓ, РіРґРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РјРѕР¶РµС‚ СѓС‡РёС‚СЊСЃСЏ, СЂР°Р±РѕС‚Р°С‚СЊ, РёСЃСЃР»РµРґРѕРІР°С‚СЊ РёРґРµРё Рё Р·Р°РїСѓСЃРєР°С‚СЊ СЂР°Р·РЅС‹Рµ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹ Р±РµР· Р»РёС€РЅРёС… РІРєР»Р°РґРѕРє.',
      card1: 'РњСѓР»СЊС‚Рё-СЏРґСЂРѕ',
      card1Text: 'РќРµСЃРєРѕР»СЊРєРѕ AI-РјРѕРґРµР»РµР№ РІ РѕРґРЅРѕРј РёРЅС‚РµСЂС„РµР№СЃРµ.',
      card2: 'Code Dev',
      card2Text: 'Р Р°Р±РѕС‡РµРµ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІРѕ РґР»СЏ РєРѕРґР° Рё СЌРєСЃРїРµСЂРёРјРµРЅС‚РѕРІ.'
    },
    kk: {
      whatsTitle: 'Р–Р°РўР€Р°Р»С‹РўвЂєС‚Р°СЂ',
      whats01: '01 < Р–РўР‡Р№РµР»С–Рє РґР°РўвЂњРґС‹Р»Р°СЂ />',
      whats02: '02 < Р–Р°РўвЂєС‹РЅРґР° />',
      whats03: '03 < Р–Р°РўР€Р°Р»С‹РўвЂє />',
      aboutTitle: 'SOLIFON AI С‚СѓСЂР°Р»С‹',
      aboutHero: 'SOLIFON AI',
      aboutLead: 'Solifon AI С‡Р°С‚, С–Р·РґРµСѓ, РјРѕРґРµР»СЊРґРµСЂ, РґР°СѓС‹СЃ, РІРёР·СѓР°Р»РґС‹ РўвЂєРўВ±СЂР°Р»РґР°СЂ Р¶РЈв„ўРЅРµ Р¶РўВ±РјС‹СЃ РєРµРўР€С–СЃС‚С–РєС‚РµСЂС–РЅ Р±С–СЂ РїР»Р°С‚С„РѕСЂРјР°РўвЂњР° Р±С–СЂС–РєС‚С–СЂРµРґС–.',
      aboutGoal: 'Р‘С–Р·РґС–РўР€ РјР°РўвЂєСЃР°С‚',
      aboutGoalText: 'Р‘С–Р· РѕРўвЂєСѓРўвЂњР°, Р¶РўВ±РјС‹СЃ С–СЃС‚РµСѓРіРµ, РёРґРµСЏР»Р°СЂРґС‹ Р·РµСЂС‚С‚РµСѓРіРµ Р¶РЈв„ўРЅРµ РЈв„ўСЂС‚РўР‡СЂР»С– РўвЂєРўВ±СЂР°Р»РґР°СЂРґС‹ Р°СЂС‚С‹РўвЂє Р±РµС‚С‚РµСЂСЃС–Р· С–СЃРєРµ РўвЂєРѕСЃСѓРўвЂњР° С‹РўР€РўвЂњР°Р№Р»С‹ AI-РїР»Р°С‚С„РѕСЂРјР° Р¶Р°СЃР°Р№РјС‹Р·.',
      card1: 'РљРЈВ©Рї СЏРґСЂРѕ',
      card1Text: 'Р‘С–СЂ РёРЅС‚РµСЂС„РµР№СЃС‚Рµ Р±С–СЂРЅРµС€Рµ AI РјРѕРґРµР»С–.',
      card2: 'Code Dev',
      card2Text: 'РљРѕРґ РїРµРЅ С‚РЈв„ўР¶С–СЂРёР±РµР»РµСЂРіРµ Р°СЂРЅР°Р»РўвЂњР°РЅ Р¶РўВ±РјС‹СЃ РєРµРўР€С–СЃС‚С–РіС–.'
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
  },
  kz: {
    select_model: "РњРѕРґРµР»СЊ С‚Р°РўР€РґР°РўР€С‹Р·",
    new_chat: "Р–Р°РўР€Р° С‡Р°С‚",
    system_whatsnew: "Р–Р°РўР€Р°Р»С‹РўвЂєС‚Р°СЂ",
    system_about: "SOLIFON С‚СѓСЂР°Р»С‹",
    menu_chat: "Chat",
    menu_library: "РљС–С‚Р°РїС…Р°РЅР°",
    menu_new_project: "Р–Р°РўР€Р° Р¶РѕР±Р°",
    menu_presentation: "Solifon AI Code",
    upgrade: "Premium-РўвЂњР° РЈВ©С‚Сѓ",
    upgrade_title: "Solifon Premium",
    upgrade_subtitle: "РќРµР№СЂРѕР¶РµР»С–Р»РµСЂРґС–РўР€ Р±Р°СЂР»С‹РўвЂє РјРўР‡РјРєС–РЅРґС–РіС–РЅ Р°С€С‹РўР€С‹Р·",
    tariff1_type: "Basic",
    tariff1_desc: "РљРўР‡РЅРґРµР»С–РєС‚С– С‚Р°РїСЃС‹СЂРјР°Р»Р°СЂ РўР‡С€С–РЅ РµРўР€ Р¶Р°РўвЂєСЃС‹ С‚Р°РўР€РґР°Сѓ",
    tariff1_btn: "Basic С‚Р°РўР€РґР°Сѓ",
    tariff2_type: "Pro",
    tariff2_desc: "РљРЈв„ўСЃС–РїРўвЂєРѕР№Р»Р°СЂ РјРµРЅ РЈв„ўР·С–СЂР»РµСѓС€С–Р»РµСЂ РўР‡С€С–РЅ",
    tariff2_btn: "Pro С‚Р°РўР€РґР°Сѓ",
    tariff3_type: "Ultra",
    tariff3_desc: "Р•С€РўвЂєР°РЅРґР°Р№ С€РµРєС‚РµСѓСЃС–Р· РјР°РєСЃРёРјР°Р»РґС‹ РєРўР‡С€",
    tariff3_btn: "Ultra С‚Р°РўР€РґР°Сѓ",
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
langDict.ru = langDict.en;
langDict.kz = langDict.en;

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
        let suffix = '/РјРµСЃ';
        
        if (period === 'year') {
            multiplier = 12 * 0.8; // 20% discount
            suffix = '/РіРѕРґ';
        } else if (period === 'custom') {
            multiplier = months;
            // Pluralization for Russian
            let monthLabel = 'РјРµСЃСЏС†РµРІ';
            if (months % 10 === 1 && months % 100 !== 11) monthLabel = 'РјРµСЃСЏС†';
            else if ([2,3,4].includes(months % 10) && ![12,13,14].includes(months % 100)) monthLabel = 'РјРµСЃСЏС†Р°';
            suffix = `/Р·Р° ${months} ${monthLabel}`;
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
    // Р’РђР–РќРћ: Р—Р°РјРµРЅРё СЃСЃС‹Р»РєСѓ РЅР° URL С‚РІРѕРµРіРѕ Space РЅР° Hugging Face!
    const wsUrl = "wss://РўР’РћР™-РЎР•Р Р’Р•Р .hf.space/ws/browser"; 
    
    // РЎРѕР·РґР°РµРј СЃРѕРѕР±С‰РµРЅРёРµ РІ С‡Р°С‚Рµ РѕС‚ РёРјРµРЅРё Р ВР В СЃ С‡РµСЂРЅС‹Рј СЌРєСЂР°РЅРѕРј
    const msgId = "browser-" + Date.now();
    const uiHtml = `
        <div style="font-size: 13px; color: #00f2ff; margin-bottom: 8px;">
            <i class="ph ph-globe"></i> Solifon Agent РїРѕРґРєР»СЋС‡РµРЅ Рє РёРЅС‚РµСЂРЅРµС‚Сѓ...
        </div>
        <div style="font-size: 14px; margin-bottom: 10px;"><b>Р¦РµР»СЊ:</b> ${task}</div>
        <img id="${msgId}" src="" style="width: 100%; border-radius: 12px; border: 1px solid #00f2ff; background: #050505; min-height: 200px;" alt="Р—Р°РіСЂСѓР·РєР° РѕР±Р»Р°С‡РЅРѕРіРѕ Р±СЂР°СѓР·РµСЂР°...">
        <div id="btn-${msgId}" style="display: none; margin-top: 10px;"></div>
    `;
    
    // Р ВСЃРїРѕР»СЊР·СѓРµРј С‚РІРѕСЋ РіРѕС‚РѕРІСѓСЋ С„СѓРЅРєС†РёСЋ РґРѕР±Р°РІР»РµРЅРёСЏ СЃРѕРѕР±С‰РµРЅРёР№ (РµСЃР»Рё РѕРЅР° РЅР°Р·С‹РІР°РµС‚СЃСЏ С‚Р°Рє)
    // Р›РёР±Рѕ РїСЂРѕСЃС‚Рѕ СЃРѕР·РґР°Р№ div Рё РґРѕР±Р°РІСЊ РµРіРѕ РІ #messagesContainer
    const container = document.getElementById('messagesContainer');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message';
    msgDiv.innerHTML = `<div class="text">${uiHtml}</div>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    // Р—Р°РїСѓСЃРєР°РµРј WebSocket
    const ws = new WebSocket(wsUrl);
    const screen = document.getElementById(msgId);
    const btnContainer = document.getElementById(`btn-${msgId}`);

    ws.onopen = () => { ws.send(task); };

    ws.onmessage = (event) => {
        const data = event.data;
        if (data.startsWith("data:image")) {
            screen.src = data; // РџРѕРєР°Р·С‹РІР°РµРј С‚СЂР°РЅСЃР»СЏС†РёСЋ
            container.scrollTop = container.scrollHeight;
        } 
        else if (data.startsWith("LINK:")) {
            const link = data.split("LINK:")[1];
            btnContainer.style.display = "block";
            btnContainer.innerHTML = `<a href="${link}" target="_blank" style="padding: 10px 20px; background: #00f2ff; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">СЂСџвЂњТђ РЎРєР°С‡Р°С‚СЊ СЂРµР·СѓР»СЊС‚Р°С‚</a>`;
        } 
        else if (data === "DONE") {
            console.log("Р—Р°РґР°С‡Р° РІ Р±СЂР°СѓР·РµСЂРµ Р·Р°РІРµСЂС€РµРЅР°");
        } 
        else if (data.startsWith("РћС€РёР±РєР°")) {
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
    setTimeout(updateLamp, 500);
    setTimeout(updateLamp, 1500);
    window.addEventListener('resize', updateLamp);
    window.addEventListener('load', updateLamp);
    if (document.fonts) {
        document.fonts.ready.then(updateLamp);
    }
});


// ============================================================
// AUTOCOMPLETE SYSTEM вЂ” Ghost Text + Dropdown Suggestions
// Based on cleaned_data.json (ru + en + kz)
// ============================================================
(function() {
    // ---- Р‘Р°Р·Р° РґР°РЅРЅС‹С… РёР· cleaned_data.json ----
    const generatedData = {
        "ru": [
            "С‡С‚Рѕ С‚Р°РєРѕРµ API","С‡С‚Рѕ С‚Р°РєРѕРµ С†РёРєР»С‹","С‡С‚Рѕ С‚Р°РєРѕРµ Р»РѕСѓРєРѕРґ","С‡С‚Рѕ С‚Р°РєРѕРµ РѕР±Р»Р°РєРѕ",
            "РєР°Рє Р±С‹СЃС‚СЂРѕ С‡РёС‚Р°С‚СЊ","РєР°Рє СѓР»СѓС‡С€РёС‚СЊ СЂРµС‡СЊ","РєР°Рє СЂР°Р·РІРёС‚СЊ РїР°РјСЏС‚СЊ","РѕСЃРЅРѕРІС‹ Р±Р°Р·С‹ РґР°РЅРЅС‹С…",
            "РѕСЃРЅРѕРІС‹ РєРѕРґРёСЂРѕРІР°РЅРёСЏ","С‡С‚Рѕ С‚Р°РєРѕРµ Р°Р»РіРѕСЂРёС‚Рј","С‡С‚Рѕ С‚Р°РєРѕРµ Р±Р»РѕРєС‡РµР№РЅ","С‡С‚Рѕ С‚Р°РєРѕРµ РїСЂРѕС‚РѕРєРѕР»",
            "С‡С‚Рѕ С‚Р°РєРѕРµ РїСЂРѕС†РµСЃСЃС‹","РєР°Рє СЃС‚Р°С‚СЊ СѓРІРµСЂРµРЅРЅРµРµ","С‡С‚Рѕ С‚Р°РєРѕРµ РЅРµР№СЂРѕСЃРµС‚СЊ","С‡С‚Рѕ С‚Р°РєРѕРµ С„СЂРµР№РјРІРѕСЂРє",
            "РєР°Рє РЅР°Р№С‚Рё РјРµРЅС‚РѕСЂР° РёС‚","РєР°Рє СЂР°Р·РІРёС‚СЊ РІРЅРёРјР°РЅРёРµ","РєР°Рє СЂР°Р·РІРёС‚СЊ СЃР»СѓС€Р°РЅРёРµ","РєР°Рє СЃРѕР·РґР°С‚СЊ РІРµР±-СЃР°Р№С‚",
            "С‡С‚Рѕ С‚Р°РєРѕРµ РїРµСЂРµРјРµРЅРЅС‹Рµ","С‡С‚Рѕ С‚Р°РєРѕРµ С‡РёСЃС‚С‹Р№ РєРѕРґ","РєР°Рє РіРѕРІРѕСЂРёС‚СЊ РїСѓР±Р»РёС‡РЅРѕ","РєР°Рє РЅР°СѓС‡РёС‚СЊСЃСЏ СѓС‡РёС‚СЊСЃСЏ",
            "РєР°Рє СѓР»СѓС‡С€РёС‚СЊ РІРЅРёРјР°РЅРёРµ","РѕСЃРЅРѕРІС‹ РІРµР±-СЂР°Р·СЂР°Р±РѕС‚РєРё","СѓРїСЂР°Р¶РЅРµРЅРёСЏ РґР»СЏ РіРѕР»РѕСЃР°","СѓРїСЂР°Р¶РЅРµРЅРёСЏ РґР»СЏ РґРёРєС†РёРё",
            "С‡С‚Рѕ С‚Р°РєРѕРµ Р±Р°Р·Р° РґР°РЅРЅС‹С…","РєР°Рє СЂР°Р·РІРёС‚СЊ С‚РІРѕСЂС‡РµСЃС‚РІРѕ","РєР°Рє СѓС‡РёС‚СЊСЃСЏ СЌС„С„РµРєС‚РёРІРЅРѕ","РјРµС‚РѕРґС‹ СЂР°Р·РІРёС‚РёСЏ РїР°РјСЏС‚Рё",
            "СѓРїСЂР°Р¶РЅРµРЅРёСЏ РґР»СЏ РґС‹С…Р°РЅРёСЏ","С‡С‚Рѕ С‚Р°РєРѕРµ РјРёРєСЂРѕСЃРµСЂРІРёСЃС‹","С‡С‚Рѕ С‚Р°РєРѕРµ СЃРµС‚РµРІРѕР№ СЃР»РѕР№","РєР°Рє Р±С‹СЃС‚СЂРѕ РІС‹СѓС‡РёС‚СЊ СЃС‚РёС…",
            "РєР°Рє СѓР»СѓС‡С€РёС‚СЊ РїСѓРЅРєС‚СѓР°С†РёСЋ","С‡С‚Рѕ С‚Р°РєРѕРµ РІРёСЂС‚СѓР°Р»РёР·Р°С†РёСЏ","РєР°Рє СЂР°Р·РІРёС‚СЊ РєРѕРјРјСѓРЅРёРєР°С†РёСЋ","РјРµС‚РѕРґС‹ spaced repetition",
            "РѕСЃРЅРѕРІС‹ Р±СЌРєРµРЅРґ СЂР°Р·СЂР°Р±РѕС‚РєРё","РѕСЃРЅРѕРІС‹ РїР°С‚С‚РµСЂРЅРѕРІ РґРёР·Р°Р№РЅР°","РѕСЃРЅРѕРІС‹ С‚РµСЃС‚РёСЂРѕРІР°РЅРёСЏ РєРѕРґР°","С‡С‚Рѕ С‚Р°РєРѕРµ Р±РѕР»СЊС€РёРµ РґР°РЅРЅС‹Рµ",
            "С‡С‚Рѕ С‚Р°РєРѕРµ РёРЅС‚РµСЂРЅРµС‚ РІРµС‰РµР№","С‡С‚Рѕ С‚Р°РєРѕРµ РЅРµР№СЂРѕРЅРЅР°СЏ СЃРµС‚СЊ","С‡С‚Рѕ С‚Р°РєРѕРµ РїР°СЂСЃРёРЅРі РґР°РЅРЅС‹С…","РєР°Рє РёР·Р±Р°РІРёС‚СЊСЃСЏ РѕС‚ Р°РєС†РµРЅС‚Р°",
            "РєР°Рє РЅР°СѓС‡РёС‚СЊСЃСЏ РїСЂРµР·РµРЅС‚Р°С†РёРё","РєР°Рє СѓР»СѓС‡С€РёС‚СЊ РєРѕРЅС†РµРЅС‚СЂР°С†РёСЋ","РјРµС‚РѕРґС‹ Р°РєС‚РёРІРЅРѕРіРѕ РѕР±СѓС‡РµРЅРёСЏ","РјРµС‚РѕРґС‹ РіР»СѓР±РѕРєРѕРіРѕ РѕР±СѓС‡РµРЅРёСЏ",
            "РѕСЃРЅРѕРІС‹ РєРѕРјРїСЊСЋС‚РµСЂРЅС‹С… СЃРµС‚РµР№","С‡С‚Рѕ С‚Р°РєРѕРµ РІРµСЂСЃРёРѕРЅРёСЂРѕРІР°РЅРёРµ","С‡С‚Рѕ С‚Р°РєРѕРµ РєРѕРЅС‚РµР№РЅРµСЂРёР·Р°С†РёСЏ","С‡С‚Рѕ С‚Р°РєРѕРµ РјР°С€РёРЅРЅРѕРµ Р·СЂРµРЅРёРµ",
            "РєР°Рє РЅР°СЃС‚СЂРѕРёС‚СЊ РіРѕР»РѕСЃ РґРёРєС†РёСЋ","РєР°Рє СѓР»СѓС‡С€РёС‚СЊ СЃРєРѕСЂРѕСЃС‚СЊ СЂРµС‡Рё","РѕСЃРЅРѕРІС‹ РґРёР·Р°Р№РЅР° РёРЅС‚РµСЂС„РµР№СЃРѕРІ","РѕСЃРЅРѕРІС‹ Р·Р°С‰РёС‚С‹ РѕС‚ РєРёР±РµСЂР°С‚Р°Рє",
            "РѕСЃРЅРѕРІС‹ С„СЂРѕРЅС‚РµРЅРґ СЂР°Р·СЂР°Р±РѕС‚РєРё","РїРѕРґРіРѕС‚РѕРІРєР° Рє С€РєРѕР»Рµ Р»РѕРіРѕРїРµРґ","СѓРїСЂР°Р¶РЅРµРЅРёСЏ РґР»СЏ Р°СЂС‚РёРєСѓР»СЏС†РёРё","СѓРїСЂР°Р¶РЅРµРЅРёСЏ РґР»СЏ Р±РµРіР»РѕР№ СЂРµС‡Рё",
            "СѓРїСЂР°Р¶РЅРµРЅРёСЏ РґР»СЏ СѓРІРµСЂРµРЅРЅРѕСЃС‚Рё","С‡С‚Рѕ С‚Р°РєРѕРµ РјРёРєСЂРѕР°СЂС…РёС‚РµРєС‚СѓСЂР°","С‡С‚Рѕ С‚Р°РєРѕРµ РѕР±Р»Р°С‡РЅС‹Рµ СЃРµСЂРІРёСЃС‹","Р·Р°РёРєР°РЅРёРµ Сѓ РІР·СЂРѕСЃР»С‹С… Р»РµС‡РµРЅРёРµ",
            "РєР°Рє РѕСЂРіР°РЅРёР·РѕРІР°С‚СЊ СЃРІРѕРµ РІСЂРµРјСЏ","РјРµС‚РѕРґС‹ Р°РґР°РїС‚РёРІРЅРѕРіРѕ РѕР±СѓС‡РµРЅРёСЏ","РјРµС‚РѕРґС‹ РїСЂРѕР±Р»РµРјРЅРѕРіРѕ РѕР±СѓС‡РµРЅРёСЏ","РѕСЃРЅРѕРІС‹ РјРѕР±РёР»СЊРЅРѕР№ СЂР°Р·СЂР°Р±РѕС‚РєРё",
            "С‡С‚Рѕ С‚Р°РєРѕРµ РєРёР±РµСЂР±РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ","С‡С‚Рѕ С‚Р°РєРѕРµ РјР°С€РёРЅРЅРѕРµ РѕР±СѓС‡РµРЅРёРµ","С‡С‚Рѕ С‚Р°РєРѕРµ РѕР±Р»Р°РєРѕ РІС‹С‡РёСЃР»РµРЅРёР№","РґРёР·Р°СЂС‚СЂРёСЏ СЃРёРјРїС‚РѕРјС‹ Рё Р»РµС‡РµРЅРёРµ",
            "РєР°Рє РЅР°СѓС‡РёС‚СЊСЃСЏ РіРѕРІРѕСЂРёС‚СЊ С‡РµС‚РєРѕ","РєР°Рє РїСЂРµРѕРґРѕР»РµС‚СЊ Р·Р°СЃС‚РµРЅС‡РёРІРѕСЃС‚СЊ","РєР°Рє СЂР°Р·РІРёС‚СЊ СѓРІРµСЂРµРЅРЅРѕСЃС‚СЊ СЂРµС‡Рё","РєР°Рє СѓР»СѓС‡С€РёС‚СЊ Р·РІСѓС‡Р°РЅРёРµ РіРѕР»РѕСЃР°",
            "РєР°Рє СѓР»СѓС‡С€РёС‚СЊ РїРёСЃСЊРјРµРЅРЅСѓСЋ СЂРµС‡СЊ","РєР°Рє СѓР»СѓС‡С€РёС‚СЊ СЃР»РѕРІР°СЂРЅС‹Р№ Р·Р°РїР°СЃ","РєР°Рє СѓР»СѓС‡С€РёС‚СЊ С‡СѓРІСЃС‚РІРѕ РІСЂРµРјРµРЅРё","РјРµС‚РѕРґС‹ РіРµР№РјРёС„РёРєР°С†РёРё РѕР±СѓС‡РµРЅРёСЏ",
            "РјРµС‚РѕРґС‹ СЂР°Р·РІРёРІР°СЋС‰РµРіРѕ РѕР±СѓС‡РµРЅРёСЏ","РѕСЃРЅРѕРІС‹ РІС‹С‡РёСЃР»РёС‚РµР»СЊРЅРѕР№ С‚РµРѕСЂРёРё","РєР°Рє РІС‹СѓС‡РёС‚СЊ С‚Р°Р±Р»РёС†Сѓ СѓРјРЅРѕР¶РµРЅРёСЏ","РєР°Рє РЅР°СѓС‡РёС‚СЊСЃСЏ РёРјРїСЂРѕРІРёР·РёСЂРѕРІР°С‚СЊ",
            "РјРµС‚РѕРґС‹ Р·Р°РїРѕРјРёРЅР°РЅРёСЏ РёРЅС„РѕСЂРјР°С†РёРё","РѕСЃРЅРѕРІС‹ Р°СЂС…РёС‚РµРєС‚СѓСЂС‹ РїСЂРёР»РѕР¶РµРЅРёР№","РѕСЃРЅРѕРІС‹ РґР¶Р°РІР° РїСЂРѕРіСЂР°РјРјРёСЂРѕРІР°РЅРёСЏ","РѕСЃРЅРѕРІС‹ РїСЂРѕРіСЂР°РјРјРёСЂРѕРІР°РЅРёСЏ РїРёС‚РѕРЅ",
            "С‡С‚Рѕ С‚Р°РєРѕРµ РЅР°С‚РёРІРЅРѕРµ РїСЂРёР»РѕР¶РµРЅРёРµ","С‡С‚Рѕ С‚Р°РєРѕРµ РѕР±Р»Р°С‡РЅС‹Рµ С‚РµС…РЅРѕР»РѕРіРёРё","РєР°Рє РїСЂРµРѕРґРѕР»РµС‚СЊ СЏР·С‹РєРѕРІРѕР№ Р±Р°СЂСЊРµСЂ","РєР°Рє СЃС‚СЂСѓРєС‚СѓСЂРёСЂРѕРІР°С‚СЊ РёРЅС„РѕСЂРјР°С†РёСЋ",
            "РјРµС‚РѕРґС‹ РёРЅС‚РµСЂР°РєС‚РёРІРЅРѕРіРѕ РѕР±СѓС‡РµРЅРёСЏ","СЂР°Р·РІРёС‚РёРµ РєСЂРёС‚РёС‡РµСЃРєРѕРіРѕ РјС‹С€Р»РµРЅРёСЏ","С‡С‚Рѕ С‚Р°РєРѕРµ РєРІР°РЅС‚РѕРІС‹Рµ РєРѕРјРїСЊСЋС‚РµСЂС‹","СѓРїСЂР°Р¶РЅРµРЅРёСЏ РґР»СЏ СЂРµС‡РµРІРѕРіРѕ РґС‹С…Р°РЅРёСЏ",
            "С‡С‚Рѕ С‚Р°РєРѕРµ РІРёСЂС‚СѓР°Р»СЊРЅР°СЏ СЂРµР°Р»СЊРЅРѕСЃС‚СЊ","С‡С‚Рѕ С‚Р°РєРѕРµ РіСЂР°С„РёС‡РµСЃРєРёРµ РїСЂРѕС†РµСЃСЃРѕСЂС‹","РєР°Рє СЂР°Р·РІРёС‚СЊ РѕСЂР°С‚РѕСЂСЃРєРѕРµ РјР°СЃС‚РµСЂСЃС‚РІРѕ","РѕР±СѓС‡РµРЅРёРµ РґРµС‚РµР№ РёРЅРѕСЃС‚СЂР°РЅРЅРѕРјСѓ СЏР·С‹РєСѓ",
            "С‡С‚Рѕ С‚Р°РєРѕРµ РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹Р№ РёРЅС‚РµР»Р»РµРєС‚","РјРµС‚РѕРґС‹ РїРѕРІРµСЃС‚РІРѕРІР°С‚РµР»СЊРЅРѕРіРѕ РѕР±СѓС‡РµРЅРёСЏ","РєРѕСЂСЂРµРєС†РёСЏ РЅР°СЂСѓС€РµРЅРёР№ РїРёСЃСЊРјРµРЅРЅРѕР№ СЂРµС‡Рё","РѕСЃРЅРѕРІС‹ СЃРёСЃС‚РµРјРЅРѕРіРѕ Р°РґРјРёРЅРёСЃС‚СЂРёСЂРѕРІР°РЅРёСЏ",
            "С‚РµС…РЅРёРєРё Р·Р°РїРѕРјРёРЅР°РЅРёСЏ Р°РЅРіР»РёР№СЃРєРёС… СЃР»РѕРІ","РЅР°СЂСѓС€РµРЅРёСЏ РіРѕР»РѕСЃР° РїСЂРёС‡РёРЅС‹ РїСЂРѕС„РёР»Р°РєС‚РёРєР°","РєР°Рє СЂР°Р·РІРёРІР°С‚СЊ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІРµРЅРЅРѕРµ РјС‹С€Р»РµРЅРёРµ",
            "СѓРїСЂР°Р¶РЅРµРЅРёСЏ РґР»СЏ РїСЂР°РІРёР»СЊРЅРѕРіРѕ РїСЂРѕРёР·РЅРѕС€РµРЅРёСЏ","С‡С‚Рѕ С‚Р°РєРѕРµ С‚РµСЃС‚РёСЂРѕРІР°РЅРёРµ РїСЂРѕРіСЂР°РјРјРЅРѕРіРѕ РѕР±РµСЃРїРµС‡РµРЅРёСЏ"
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
            "Р°Р№Т›С‹РЅ СЃУ©Р№Р»РµСѓ","Р¶Р°РґС‹РЅС‹ РґР°РјС‹С‚Сѓ","РЅР°Р·Р°СЂРґС‹ РґР°РјС‹С‚Сѓ","API РґРµРіРµРЅС–РјС–Р· РЅРµ","РєРѕРґС‚Р°Сѓ РЅРµРіС–Р·РґРµСЂС–",
            "РґР°СѓС‹СЃ Р¶Р°С‚С‚С‹Т“СѓР»Р°СЂС‹","РѕТ›СѓРґС‹ РѕТ›СѓРґС‹ ТЇР№СЂРµРЅСѓ","UI РґРёР·Р°Р№РЅ РЅРµРіС–Р·РґРµСЂС–","Р¶С‹Р»РґР°Рј РѕТ›Сѓ У™РґС–СЃС‚РµСЂС–",
            "Р°Р№С‚С‹Р»С‹РјС‹РЅ Р¶Т±РјСЃР°Рї РµС‚Сѓ","СЃС‹РЅ С‚Т±СЂТ“С‹СЃС‹РЅР°РЅ РѕР№Р»Р°Сѓ","СЃУ©Р·РґС–Рє Т›РѕСЂС‹РЅ РєРµТЈРµР№С‚Сѓ","С‚Р°Р· РєРѕРґ РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "С‚РµСЂРµТЈ РѕТ›С‹С‚Сѓ У™РґС–СЃС‚РµСЂС–","С†РёРєР»РґР°СЂ РґРµРіРµРЅС–РјС–Р· РЅРµ","Р°Р»РіРѕСЂРёС‚Рј РґРµРіРµРЅС–РјС–Р· РЅРµ","Р±Р»РѕРєС‡РµР№РЅ РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "РІРµР±-У™Р·С–СЂР»РµСѓ РЅРµРіС–Р·РґРµСЂС–","РґР°СѓС‹СЃ СЃР°РїР°СЃС‹РЅ Р°СЂС‚С‚С‹СЂСѓ","РµСЃС‚С– РґР°РјС‹С‚Сѓ С‚РµС…РЅРёРєР°СЃС‹","РѕР±Р»Р°Т› СЃРµСЂРІРёСЃС‚РµСЂС– С€РѕР»Сѓ",
            "РїСЂРѕС‚РѕРєРѕР» РґРµРіРµРЅС–РјС–Р· РЅРµ","РїСѓРЅРєС‚СѓР°С†РёСЏРЅС‹ Р¶Р°Т›СЃР°СЂС‚Сѓ","СЃУ©Р№Р»РµСѓ СЃРµРЅС–РјС–РЅ РґР°РјС‹С‚Сѓ","С‚РµСЂРµТЈ РјР°С€РёРЅР°Р»С‹Т› РѕТ›С‹С‚Сѓ",
            "С‚С‹РЅС‹СЃ Р°Р»Сѓ Р¶Р°С‚С‚С‹Т“СѓР»Р°СЂС‹","Р°РєС†РµРЅС‚С‚С– Р¶РѕСЋСѓ У™РґС–СЃС‚РµСЂС–","РІРµР±-СЃР°Р№С‚ Т›Т±СЂСѓ У™РґС–СЃС‚РµСЂС–","РЅРµР№СЂРѕР¶РµР»С– РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "СЃР°С…Р°СЂР°Сѓ Т›Р°С‚С‹РЅР°СЃС‹РЅ Р¶РµТЈСѓ","С‚РёС–РјРґС– РѕТ›С‹С‚С‹ТЈ У™РґС–СЃС‚РµСЂС–","С‚С–Р» Р±Р°СЂСЊРµСЂС–РЅРµ С‚ТЇСЃ Р±РѕР»Сѓ","СѓР°Т›С‹С‚С‚С‹ С‚РёС–РјРґС– Р±Р°СЃТ›Р°СЂСѓ",
            "С„СЂРµР№РјРІРѕСЂРє РґРµРіРµРЅС–РјС–Р· РЅРµ","Т±СЃС‹РЅСѓ РґР°Т“РґС‹Р»Р°СЂС‹РЅ РѕТ›С‹С‚Сѓ","spaced repetition У™РґС–СЃС–","Р°Р№РЅС‹РјР°Р»С‹СЃС‹ РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "РёС‚ СЃР°Р»Р°СЃС‹РЅРґР° Р¶Т±РјС‹СЃ С‚Р°Р±Сѓ","РѕР№С‹РЅ Т›РѕР·Т“Р°Сѓ С‚РµС…РЅРёРєР°Р»Р°СЂС‹","РїСЂРѕС†РµСЃСЃС‚РµСЂ РґРµРіРµРЅС–РјС–Р· РЅРµ","С‚РµРіС–РЅ РєРѕРґ Р¶Р°Р·СѓРґС‹ ТЇР№СЂРµРЅСѓ",
            "У©Р»РµТЈРґС– Т›Р°Р»Р°Р№ Р¶Р°С‚С‚Р°Рї Р°Р»Сѓ","Р°Р»Т“Р°С€Т›С‹ РєРѕРґС‚С‹ Т›Р°Р»Р°Р№ Р¶Р°Р·Сѓ","Р±РµРіР»С– СЃУ©Р№Р»РµСѓ Р¶Р°С‚С‚С‹Т“СѓР»Р°СЂС‹","Р±СЌРєРµРЅРґ У™Р·С–СЂР»РµСѓ РЅРµРіС–Р·РґРµСЂС–",
            "Р¶Р°Р·Р±Р° Т›Р°С‚С‹РЅР°СЃС‹РЅ Р¶Р°Т›СЃР°СЂС‚Сѓ","Р¶РµР»С– Т›Р°Р±Р°С‚С‹ РґРµРіРµРЅС–РјС–Р· РЅРµ","Р¶ТЇСЂРіС–РЅРґС–Рє РѕТ›С‹С‚Сѓ У™РґС–СЃС‚РµСЂС–","РёРјРїСЂРѕРІРёР·Рµ С–СЃС‚РµСѓРґС– ТЇР№СЂРµРЅСѓ",
            "РјРёРєСЂРѕСЃРµСЂРІРёСЃ РґРµРіРµРЅС–РјС–Р· РЅРµ","РјРѕР±РёР»СЊРґС– Т›РѕСЃС‹РјС€Р° У™Р·С–СЂР»РµСѓ","РјУ™Р»С–РјРµС‚С‚РµСЂРґС– Т±Р№С‹РјРґР°СЃС‚С‹СЂСѓ","СЃУ©Р№Р»РµСѓ Т›Р°СЂТ›С‹РЅС‹РЅ Р¶Р°Т›СЃР°СЂС‚Сѓ",
            "С‚РµСЂРµТЈ РѕТ›С‹С‚Сѓ РґРµРіРµРЅС–РјС–Р· РЅРµ","С‚С‹ТЈРґР°Сѓ РґР°Т“РґС‹Р»Р°СЂС‹РЅ РґР°РјС‹С‚Сѓ","ТЇР№РґРµ Р»РѕРіРѕРїРµРґ Р¶Р°С‚С‚С‹Т“СѓР»Р°СЂС‹","Р°СѓС‹СЃС‹РЅРґС‹ СЃУ©Р№Р»РµСѓ РєРµТЈРµСЃС‚РµСЂС–",
            "Р±СЌРєРµРЅРґ СЂР°Р·СЂР°Р±РѕС‚РєР° РѕТ›СѓР»С‹Т“С‹","РґР°СѓС‹СЃ С‚С‹РЅС‹СЃ Р°Р»Сѓ С‚РµС…РЅРёРєР°СЃС‹","РєСЂРµР°С‚РёРІС‚С–Рє РѕР№Р»Р°СѓРґС‹ РґР°РјС‹С‚Сѓ","РјРµРєС‚РµРїРєРµ РґР°Р№С‹РЅРґС‹Т› Р»РѕРіРѕРїРµРґ",
            "РјУ™Р»С–РјРµС‚С‚С– СЃР°Т›С‚Р°Сѓ У™РґС–СЃС‚РµСЂС–","РјУ™СЃРµР»РµРЅС–ТЈ РЅРµРіС–Р·С–РЅРґРµ РѕТ›С‹С‚Сѓ","С‚ТЇРЅРґС–РіС–РЅ Р±РµСЂСѓ Р¶Р°С‚С‚С‹Т“СѓР»Р°СЂС‹","СѓР°Т›С‹С‚ Р±Р°СЃТ›Р°СЂС‹СЃС‹РЅ Р¶Р°Т›СЃР°СЂС‚Сѓ",
            "РІРµР± СЃРєСЂРµР№РїРёРЅРі РґРµРіРµРЅС–РјС–Р· РЅРµ","РІРёСЂС‚СѓР°Р»РёР·Р°С†РёСЏ РґРµРіРµРЅС–РјС–Р· РЅРµ","РµСЃРµРїС‚РµСѓ С‚РµРѕСЂРёСЏСЃС‹ РЅРµРіС–Р·РґРµСЂС–","Р¶Р°РґС‹РЅС‹ Р°СЂС‚С‚С‹СЂСѓ С‚РµС…РЅРёРєР°Р»Р°СЂС‹",
            "РёС‚ РјР°РјР°РЅРґС‹Т“С‹РЅ Т›Р°Р»Р°Р№ С‚Р°ТЈРґР°Сѓ","РєРёР±РµСЂТ›Р°СѓС–РїСЃС–Р·РґС–Рє РЅРµРіС–Р·РґРµСЂС–","СЃУ©Р№Р»РµСѓ СЃРµРЅС–РјРґС– Р¶Р°С‚С‚С‹Т“СѓР»Р°СЂС‹","СЃУ©Р№Р»РµСѓ СЃРµРЅС–РјРґС–Р»С–РіС–РЅ РґР°РјС‹С‚Сѓ",
            "СЃУ©Р№Р»РµСѓРґС– Р¶Р°Т›СЃР°СЂС‚Сѓ У™РґС–СЃС‚РµСЂС–","С„СЂРѕРЅС‚РµРЅРґ У™Р·С–СЂР»РµСѓ РЅРµРіС–Р·РґРµСЂС–","СЌРјРїРёСЂРёРєР°Р»С‹Т› РѕТ›С‹С‚Сѓ У™РґС–СЃС‚РµСЂС–","Java РїСЂРѕРіСЂР°РјРјР°Р»Р°Сѓ РЅРµРіС–Р·РґРµСЂС–",
            "Р°РЅР°Р»РёС‚РёРєР°Р»С‹Т› РѕР№Р»Р°СѓРґС‹ РґР°РјС‹С‚Сѓ","Р°Т“С‹Р»С€С‹РЅ С‚С–Р»С–РЅ Р¶С‹Р»РґР°Рј ТЇР№СЂРµРЅСѓ","Р±РµР№С–РјРґС– РѕТ›С‹С‚Сѓ СЃС‚СЂР°С‚РµРіРёСЏР»Р°СЂС‹","РґР°СѓС‹СЃ Р±Т±Р·С‹Р»СѓР»Р°СЂС‹РЅ Р°Р»РґС‹РЅ Р°Р»Сѓ",
            "РґРёР·Р°Р№РЅ С€Р°Р±Р»РѕРЅРґР°СЂС‹ РЅРµРіС–Р·РґРµСЂС–","РёРЅС‚РµСЂР°РєС‚РёРІС‚С– РѕТ›С‹С‚Сѓ У™РґС–СЃС‚РµСЂС–","РєРѕРјРїСЊСЋС‚РµСЂР»С–Рє Р¶РµР»С– РЅРµРіС–Р·РґРµСЂС–","РѕР±Р»Р°Т› РµСЃРµРїС‚РµСѓС– РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "СЃР°С…РЅР° Т›РѕСЂТ›С‹РЅС‹С€С‹РЅ Т›Р°Р»Р°Р№ Р¶РµТЈСѓ","СЃРјР°СЂС‚ РєРѕРЅС‚СЂР°РєС‚ РґРµРіРµРЅС–РјС–Р· РЅРµ","СЃУ©Р№Р»РµСѓ РєРµС€С–РіСѓС–РЅС–ТЈ СЃРµР±РµРїС‚РµСЂС–","ТЇР»РєРµРЅ РґРµСЂРµРєС‚РµСЂ РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "Р°Р№Т›С‹РЅ СЃУ©Р№Р»РµСѓ ТЇС€С–РЅ Р¶Р°С‚С‚С‹Т“СѓР»Р°СЂ","Р±Р°Р»Р°РЅС‹ТЈ СЃУ©Р·РґС–Рє Т›РѕСЂС‹РЅ РєРµТЈРµР№С‚Сѓ","Р±Т±Р»С‚С‚С‹Т› РµСЃРµРїС‚РµСѓ РґРµРіРµРЅС–РјС–Р· РЅРµ","РіРёС‚ Р¶У™РЅРµ РіРёС‚С…Р°Р± РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "РґРµРІРѕРїСЃ РёРЅР¶РµРЅРµСЂС– РґРµРіРµРЅС–РјС–Р· РЅРµ","РєРѕРЅСЃС‚СЂСѓРєС‚РёРІС‚С– РѕТ›С‹С‚Сѓ У™РґС–СЃС‚РµСЂС–","РєРѕРЅС‚РµР№РЅРµСЂРёР·Р°С†РёСЏ РґРµРіРµРЅС–РјС–Р· РЅРµ","РјР°С€РёРЅР°Р»С‹Т› РѕТ›С‹С‚Сѓ РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "РјРµРЅС‚РѕСЂРґС‹ Т›Р°Р»Р°Р№ С‚Р°Р±СѓТ“Р° Р±РѕР»Р°РґС‹","РЅР°С‚РёРІС‚С– Т›РѕСЃС‹РјС€Р° РґРµРіРµРЅС–РјС–Р· РЅРµ","СЂ Р¶У™РЅРµ Р» РґС‹Р±С‹СЃС‚Р°СЂС‹РЅ РґТ±СЂС‹СЃС‚Р°Сѓ","СЃУ©Р№Р»РµСѓ Р°Р№Т›С‹РЅРґС‹Т“С‹ Р¶Р°С‚С‚С‹Т“СѓР»Р°СЂС‹",
            "С‚ТЇР№С–Р»СѓСЂСѓРґС– Т›Р°Р»Р°Р№ РµРјРґРµСѓ РєРµСЂРµРє","Python РїСЂРѕРіСЂР°РјРјР°Р»Р°Сѓ РЅРµРіС–Р·РґРµСЂС–","Р±Р°Р»Р°Р»Р°СЂТ“Р° РµРєС–РЅС€С– С‚С–Р»РґС– ТЇР№СЂРµС‚Сѓ","РІРёСЂС‚СѓР°Р»РґС‹ С€С‹РЅРґС‹Т› РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "Р¶С‹Р»РґР°Рј РѕТ›Сѓ С‚РµС…РЅРёРєР°СЃС‹ У™РґС–СЃС‚РµСЂС–","Р¶Т±РјС‹СЃ РѕСЂРЅС‹РЅ Т›Р°Р»Р°Р№ Т±Р№С‹РјРґР°СЃС‚С‹СЂСѓ","Р·Р°С‚С‚Р°СЂ РёРЅС‚РµСЂРЅРµС‚С– РґРµРіРµРЅС–РјС–Р· РЅРµ","РєРёР±РµСЂТ›Р°СѓС–РїСЃС–Р·РґС–Рє РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "РєРѕРґ Р¶Р°Р·СѓРґС‹ Т›Р°Р»Р°Р№ Р±Р°СЃС‚Р°Сѓ РєРµСЂРµРє","РєУ©Р±РµР№С‚Сѓ РєРµСЃС‚РµСЃС–РЅ Т›Р°Р»Р°Р№ ТЇР№СЂРµРЅСѓ","РјРµРєС‚РµРїРєРµ РґРµР№С–РЅРіС– СЃУ©Р№Р»РµСѓ РґР°РјСѓС‹","РјРёРєСЂРѕР°СЂС…РёС‚РµРєС‚СѓСЂР° РґРµРіРµРЅС–РјС–Р· РЅРµ",
            "РЅТ±СЃТ›Р°СЃС‹РЅ Р±Р°СЃТ›Р°СЂСѓ РґРµРіРµРЅС–РјС–Р· РЅРµ","РїРёС‚РѕРЅРґС‹ Т›Р°Р»Р°Р№ ТЇР№СЂРµРЅСѓРіРµ Р±РѕР»Р°РґС‹","СЃУ©Р№Р»РµСѓ Т›Р°С‚РµР»РµСЂС–РЅ Т›Р°Р»Р°Р№ С‚ТЇР·РµС‚Сѓ","С„СЂРѕРЅС‚РµРЅРґ СЂР°Р·СЂР°Р±РѕС‚РєР° РЅРµРіС–Р·РґРµСЂС–",
            "Т›Р°Р»Р°Р№ Р¶С‹Р»РґР°РјС‹СЂР°Т› РѕТ›СѓТ“Р° Р±РѕР»Р°РґС‹","РґРёР·Р°СЂС‚СЂРёСЏ Р±РµР»РіС–Р»РµСЂС– Р¶У™РЅРµ РµРјРґРµСѓ","Р¶Р°Р·Р±Р°С€Р° С‚С–Р» Р±Т±Р·С‹Р»СѓР»Р°СЂС‹РЅ С‚ТЇР·РµС‚Сѓ","Р¶Р°Р·СѓРґР°Т“С‹ РіСЂР°РјРјР°С‚РёРєР°РЅС‹ Р¶Р°Т›СЃР°СЂС‚Сѓ",
            "Р¶Р°СЃР°РЅРґС‹ РёРЅС‚РµР»Р»РµРєС‚ РґРµРіРµРЅС–РјС–Р· РЅРµ","Р·РµР№С–РЅРґС– Т›Р°Р»Р°Р№ Р°СЂС‚С‚С‹СЂСѓТ“Р° Р±РѕР»Р°РґС‹","РєРёР±РµСЂ Т›Р°СѓС–РїСЃС–Р·РґС–Рє РґРµРіРµРЅС–РјС–Р· РЅРµ","РєРѕРјРјСѓРЅРёРєР°С†РёСЏ РґР°Т“РґС‹Р»Р°СЂС‹РЅ РґР°РјС‹С‚Сѓ",
            "РєРѕРјРїСЊСЋС‚РµСЂР»С–Рє РєУ©СЂСѓ РґРµРіРµРЅС–РјС–Р· РЅРµ","РєСЂРµР°С‚РёРІС‚С– РѕР№Р»Р°СѓРґС‹ Т›Р°Р»Р°Р№ РґР°РјС‹С‚Сѓ","Р»РѕСѓРєРѕРґ СЂР°Р·СЂР°Р±РѕС‚РєР° РґРµРіРµРЅС–РјС–Р· РЅРµ","РјУ™Р»С–РјРµС‚С‚РµСЂ Р±Р°Р·Р°СЃС‹ РґРµРіРµРЅС–РјС–Р· РЅРµ"
        ]
    };

    // РћР±СЉРµРґРёРЅСЏРµРј РІСЃРµ С‚СЂРё СЏР·С‹РєР° РІ РѕРґРёРЅ РјР°СЃСЃРёРІ
    const autocompleteDB = [
        ...generatedData.ru,
        ...generatedData.en,
        ...generatedData.kz
    ];

    // ---- DOM СЌР»РµРјРµРЅС‚С‹ ----
    const userInput = document.getElementById('userInput');
    const ghostText = document.getElementById('ghostText');
    const dropdown = document.getElementById('suggestionsDropdown');
    const suggestionsList = document.getElementById('suggestionsList');
    const chatHeader = document.getElementById('animatedChatHeader');
    const welcomeScreen = document.getElementById('welcomeScreen');

    if (!userInput) return; // Р‘РµР·РѕРїР°СЃРЅС‹Р№ РІС‹С…РѕРґ РµСЃР»Рё СЌР»РµРјРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ

    let currentGhostSuggestion = '';
    let activeIndex = -1;
    let lastMatches = [];

    // ---- РџРѕРёСЃРє СЃРѕРІРїР°РґРµРЅРёР№ ----
    function findMatches(query) {
        if (!query || query.trim().length < 2) return [];
        const q = query.toLowerCase().trim();
        return autocompleteDB
            .filter(item => item.toLowerCase().startsWith(q))
            .slice(0, 2); // РњР°РєСЃРёРјСѓРј 2 РїРѕРґСЃРєР°Р·РєРё
    }

    // ---- РћР±РЅРѕРІРёС‚СЊ ghost text ----
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

    // ---- Р РµРЅРґРµСЂ dropdown ----
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

            // РџРѕРґСЃРІРµС‡РёРІР°РµРј СЃРѕРІРїР°РІС€СѓСЋ С‡Р°СЃС‚СЊ
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
                e.preventDefault(); // РќРµ СЃРЅРёРјР°РµРј С„РѕРєСѓСЃ СЃ textarea
                selectSuggestion(item);
            });

            suggestionsList.appendChild(div);
        });

        dropdown.classList.add('visible');
    }

    // ---- РџСЂРёРјРµРЅРёС‚СЊ РІС‹Р±СЂР°РЅРЅСѓСЋ РїРѕРґСЃРєР°Р·РєСѓ ----
    function selectSuggestion(text) {
        if (!userInput) return;
        userInput.value = text;
        updateGhostText('', '');
        dropdown.classList.remove('visible');
        userInput.focus();

        // РЎС‚Р°РІРёРј РєСѓСЂСЃРѕСЂ РІ РєРѕРЅРµС†
        userInput.setSelectionRange(text.length, text.length);

        // РђРєС‚РёРІРёСЂСѓРµРј РєРЅРѕРїРєСѓ Send
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.classList.add('active');

        // РўСЂРёРіРіРµСЂРёРј resize textarea
        userInput.dispatchEvent(new Event('input'));
    }

    // ---- РђРЅРёРјР°С†РёСЏ Р·Р°РіРѕР»РѕРІРєР° ----
    function setHeaderTyping(isTyping) {
        if (!chatHeader) return;
        if (isTyping) {
            chatHeader.classList.add('typing-active');
        } else {
            chatHeader.classList.remove('typing-active');
        }
    }

    // ---- Р‘РµР·РѕРїР°СЃРЅРѕРµ СЌРєСЂР°РЅРёСЂРѕРІР°РЅРёРµ HTML ----
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ---- РќР°РІРёРіР°С†РёСЏ РїРѕ dropdown СЃ РєР»Р°РІРёР°С‚СѓСЂС‹ ----
    function updateActiveItem() {
        const items = suggestionsList ? suggestionsList.querySelectorAll('.suggestion-item') : [];
        items.forEach((el, i) => {
            el.classList.toggle('keyboard-active', i === activeIndex);
        });
    }

    // ---- РћСЃРЅРѕРІРЅРѕР№ РѕР±СЂР°Р±РѕС‚С‡РёРє РІРІРѕРґР° ----
    userInput.addEventListener('input', function() {
        const val = this.value;
        const isTyping = val.trim().length > 0;

        // РђРЅРёРјР°С†РёСЏ Р·Р°РіРѕР»РѕРІРєР°
        setHeaderTyping(isTyping && welcomeScreen && welcomeScreen.style.display !== 'none');

        if (!isTyping) {
            updateGhostText('', '');
            if (dropdown) dropdown.classList.remove('visible');
            return;
        }

        // РС‰РµРј СЃРѕРІРїР°РґРµРЅРёСЏ
        const matches = findMatches(val);
        lastMatches = matches;

        // Ghost text - РїРµСЂРІРѕРµ СЃРѕРІРїР°РґРµРЅРёРµ
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
            // Tab - РїСЂРёРЅСЏС‚СЊ ghost suggestion
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
            // в†’ СЃС‚СЂРµР»РєР° РІРїСЂР°РІРѕ - РїСЂРёРЅСЏС‚СЊ ghost suggestion (РєР°Рє РІ Р±СЂР°СѓР·РµСЂРµ)
            if (currentGhostSuggestion && this.selectionStart === this.value.length) {
                e.preventDefault();
                selectSuggestion(currentGhostSuggestion);
            }
        }
    });

    // ---- Р—Р°РєСЂС‹РІР°РµРј dropdown РїСЂРё РєР»РёРєРµ РІРЅРµ РµРіРѕ ----
    document.addEventListener('click', function(e) {
        if (!dropdown) return;
        if (!dropdown.contains(e.target) && e.target !== userInput) {
            dropdown.classList.remove('visible');
            updateGhostText('', '');
        }
    });

    // ---- РЎР±СЂРѕСЃ РїСЂРё РѕС‡РёСЃС‚РєРµ С‡Р°С‚Р° ----
    const origClearChat = window.clearChat;
    window.clearChat = function() {
        if (origClearChat) origClearChat();
        if (dropdown) dropdown.classList.remove('visible');
        updateGhostText('', '');
        if (chatHeader) chatHeader.classList.remove('typing-active');
    };

    console.log('[SOLIFON] Autocomplete system loaded вЂ” ' + autocompleteDB.length + ' entries');
})();


// ============================================================
// MENU FIX v4 вЂ” document capture, no stopPropagation в†’ Р»Р°РјРїР° СЂР°Р±РѕС‚Р°РµС‚
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

    // Capture РЅР° document вЂ” СЃСЂР°Р±Р°С‚С‹РІР°РµС‚ Р”Рћ РІСЃРµС… listeners РЅР° СЌР»РµРјРµРЅС‚Рµ
    // РќР• РІС‹Р·С‹РІР°РµРј stopPropagation в†’ tubelight handler СЂР°Р±РѕС‚Р°РµС‚ в†’ Р»Р°РјРїР° СЂР°Р±РѕС‚Р°РµС‚ вњ“
    document.addEventListener('click', function(e) {
        var lbl = document.querySelector('label[for="nav-toggle"]');
        if (!lbl) return;
        if (e.target === lbl || lbl.contains(e.target)) {
            // Р”Р°С‘Рј СЃРѕР±С‹С‚РёСЋ РїСЂРѕР№С‚Рё РґР°Р»СЊС€Рµ (С‚Сѓbelight РѕР±РЅРѕРІРёС‚ Р»Р°РјРїСѓ)
            // РњС‹ С‚РѕР»СЊРєРѕ СѓРїСЂР°РІР»СЏРµРј РІРёРґРёРјРѕСЃС‚СЊСЋ sidebar
            if (_open) { _hide(); } else { _show(); }
        }
    }, true); // capture = true, РЅРѕ Р‘Р•Р— stopPropagation

    // РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ: РєРѕРіРґР° openModal() СЃР±СЂР°СЃС‹РІР°РµС‚ checkbox в†’ Р·Р°РєСЂС‹РІР°РµРј sidebar
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



window.handleWallpaperUpload = function(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.type.startsWith('video/')) {
            const videoUrl = URL.createObjectURL(file);
            // We set it but warn the user if they want since blob URLs don't survive refresh
            window.setWallpaper(`video:${videoUrl}`);
            alert('РћР±СЂР°С‚РёС‚Рµ РІРЅРёРјР°РЅРёРµ: Р·Р°РіСЂСѓР¶РµРЅРЅРѕРµ РІРёРґРµРѕ Р±СѓРґРµС‚ СЂР°Р±РѕС‚Р°С‚СЊ С‚РѕР»СЊРєРѕ РґРѕ РїРµСЂРµР·Р°РіСЂСѓР·РєРё СЃС‚СЂР°РЅРёС†С‹. Р”Р»СЏ РїРѕСЃС‚РѕСЏРЅРЅРѕРіРѕ РІРёРґРµРѕС„РѕРЅР° РїРѕРјРµСЃС‚РёС‚Рµ С„Р°Р№Р» СЂСЏРґРѕРј СЃ index.html.');
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
// Р’РР РўРЈРђР›Р¬РќРђРЇ Р”РћРЎРљРђ Р РџР РћР’Р•Р РљРђ РџРћР”РџРРЎРљР
// ============================================================
let videoElement = document.getElementById('input_video');
let canvasElement = document.getElementById('output_canvas');
let canvasCtx = canvasElement ? canvasElement.getContext('2d') : null;

let prevX = 0; 
let prevY = 0;
let isPremiumUser = false;

// 1. РџР РћР’Р•Р РљРђ РџРћР”РџРРЎРљР (РЎРІСЏР·СЊ СЃ С‚РІРѕРёРј app (2).py)
async function verifySubscription() {
    try {
        const response = await fetch('/api/check-premium', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 'user_001', token: 'secret_paid_token_123' })
        });
        
        if (response.ok) {
            isPremiumUser = true;
            // РЎРєСЂС‹РІР°РµРј paywall, РЅРѕ РєР°РјРµСЂСѓ Р·Р°РїСѓСЃРєР°РµРј С‚РѕР»СЊРєРѕ РїРѕ РєРЅРѕРїРєРµ "Р’РєР»СЋС‡РёС‚СЊ РєР°РјРµСЂСѓ"
            const paywallMsg = document.getElementById('premium-paywall');
            if (paywallMsg) paywallMsg.style.display = 'none';
        } else {
            const paywallMsg = document.getElementById('premium-paywall');
            if (paywallMsg) paywallMsg.style.display = 'flex';
        }
    } catch (e) {
        console.error("РћС€РёР±РєР° РїСЂРѕРІРµСЂРєРё РїРѕРґРїРёСЃРєРё");
    }
}

let drawCtx = null;
let cameraStarted = false;

function initDrawingCanvas() {
    const dCanvas = document.getElementById('drawing_canvas');
    if (dCanvas) {
        drawCtx = dCanvas.getContext('2d');
        // РќР°СЃС‚СЂР°РёРІР°РµРј РєРёСЃС‚СЊ
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
    }
}

function startAirCanvas() {
    if (!videoElement) videoElement = document.getElementById('input_video');
    if (!canvasElement) {
        canvasElement = document.getElementById('output_canvas');
        canvasCtx = canvasElement ? canvasElement.getContext('2d') : null;
    }
    if (!videoElement || !canvasElement) return;
    if (cameraStarted) return; // Р—Р°С‰РёС‚Р° РѕС‚ РїРѕРІС‚РѕСЂРЅРѕРіРѕ Р·Р°РїСѓСЃРєР°

    cameraStarted = true;
        let btn = document.querySelector('.camera-btn'); if(btn) btn.style.display = 'none';
    initDrawingCanvas();
    
    // Show the container over iframe
    let container = document.getElementById('camera-overlay-container');
    if (container) {
        container.style.display = 'block';
        container.style.width = '640px';
        container.style.height = '480px';
    }
        videoElement.style.width = '640px';
    videoElement.style.height = '480px';
    videoElement.width = 640;
    videoElement.height = 480;
    canvasElement.style.width = '640px';
    canvasElement.style.height = '480px';
    canvasElement.width = 640;
    canvasElement.height = 480;
    const dCanvas = document.getElementById('drawing_canvas');
    if (dCanvas) { dCanvas.width = window.innerWidth; dCanvas.height = window.innerHeight; }


    const hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    hands.setOptions({
        maxNumHands: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    hands.onResults(onResults);

    window.mpCamera = null;
    const camera = new Camera(videoElement, {
        onFrame: async () => { await hands.send({image: videoElement}); },
        width: 640, height: 480
    });
    window.mpCamera = camera;
    camera.start();
}

function onResults(results) {
    if (!canvasCtx) return;

    // 1. РћС‚СЂРёСЃРѕРІРєР° РІРёРґРµРѕ СЃ РєР°РјРµСЂС‹ РЅР° Р·Р°РґРЅРµРј СЃР»РѕРµ (output_canvas)
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Р—РµСЂРєР°Р»СЊРЅРѕРµ РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ РєР°РјРµСЂС‹ РґР»СЏ СѓРґРѕР±СЃС‚РІР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    // 2. Р›РѕРіРёРєР° СЂРёСЃРѕРІР°РЅРёСЏ Р¶РµСЃС‚Р°РјРё
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && drawCtx) {
        const landmarks = results.multiHandLandmarks[0];
        
        // РљРѕРѕСЂРґРёРЅР°С‚С‹ СѓРєР°Р·Р°С‚РµР»СЊРЅРѕРіРѕ РїР°Р»СЊС†Р° (СЃ СѓС‡РµС‚РѕРј Р·РµСЂРєР°Р»СЊРЅРѕСЃС‚Рё)
        const x = canvasElement.width - (landmarks[8].x * canvasElement.width);
        const y = landmarks[8].y * canvasElement.height;

        // Р РёСЃСѓРµРј РєСЂР°СЃРЅС‹Р№ РїСЂРёС†РµР» (СѓРєР°Р·Р°С‚РµР»СЊ) РЅР° СЃР»РѕРµ РєР°РјРµСЂС‹
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 8, 0, 2 * Math.PI);
        canvasCtx.fillStyle = '#ec4899'; // РќРµРѕРЅРѕРІС‹Р№ СЂРѕР·РѕРІС‹Р№
        canvasCtx.fill();

        // Р•СЃР»Рё РїР°Р»РµС† РїРѕРґРЅСЏС‚ (СЂРёСЃСѓРµРј Р»РёРЅРёСЋ РЅР° СЃР»РѕРµ СЂРёСЃРѕРІР°РЅРёСЏ)
        if (prevX !== 0 && prevY !== 0) {
            // Р Р°СЃСЃС‚РѕСЏРЅРёРµ РјРµР¶РґСѓ С‚РѕС‡РєР°РјРё (РїСЂРѕСЃС‚РµР№С€Р°СЏ Р·Р°С‰РёС‚Р° РѕС‚ СЂРµР·РєРёС… СЃРєР°С‡РєРѕРІ)
            const dist = Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2));
            if (dist < 100) {
                drawCtx.beginPath();
                drawCtx.moveTo(prevX, prevY);
                drawCtx.lineTo(x, y);
                drawCtx.strokeStyle = '#a5b4fc'; // РљСЂР°СЃРёРІС‹Р№ СЃРІРµС‚Р»С‹Р№ С„РёРѕР»РµС‚РѕРІС‹Р№
                drawCtx.lineWidth = 6;
                drawCtx.stroke();
                
                // Р”РѕР±Р°РІР»СЏРµРј СЃРІРµС‡РµРЅРёРµ РєРёСЃС‚Рё
                drawCtx.shadowColor = '#4f46e5';
                drawCtx.shadowBlur = 10;
                drawCtx.stroke();
                drawCtx.shadowBlur = 0; // РЎР±СЂР°СЃС‹РІР°РµРј С‚РµРЅСЊ РґР»СЏ РїСЂРѕРёР·РІРѕРґРёС‚РµР»СЊРЅРѕСЃС‚Рё
            }
        }
        prevX = x; prevY = y;
    } else {
        prevX = 0; prevY = 0;
    }
}

// Р¤СѓРЅРєС†РёСЏ РґР»СЏ РѕС‚РєСЂС‹С‚РёСЏ РІРёСЂС‚СѓР°Р»СЊРЅРѕР№ РґРѕСЃРєРё Рё РїСЂРѕРІРµСЂРєРё
window.openVirtualBoard = function() {
    if (typeof openModal === 'function') {
        openModal('newFeatureModal');
    }
    verifySubscription();
};

// РџРѕРґРєР»СЋС‡РµРЅРёРµ РѕР±СЂР°Р±РѕС‚С‡РёРєРѕРІ РґР»СЏ РєРЅРѕРїРѕРє СѓРїСЂР°РІР»РµРЅРёСЏ
document.addEventListener('DOMContentLoaded', () => {
    const btnStart = document.getElementById('btn-start-camera');
    const btnClear = document.getElementById('btn-clear-canvas');
    const btnAnalyze = document.getElementById('btn-analyze');

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            if (isPremiumUser) {
                startAirCanvas();
                btnStart.innerHTML = '<i class="ph ph-video-camera-slash"></i> РљР°РјРµСЂР° Р·Р°РїСѓС‰РµРЅР°';
                btnStart.style.opacity = '0.5';
                btnStart.disabled = true;
            } else {
                alert("РџРѕР¶Р°Р»СѓР№СЃС‚Р°, СЂР°Р·Р±Р»РѕРєРёСЂСѓР№С‚Рµ Premium.");
            }
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (drawCtx) {
                const dCanvas = document.getElementById('drawing_canvas');
                drawCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
            }
        });
    }

    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', async () => {
            if (!isPremiumUser) return;
            const dCanvas = document.getElementById('drawing_canvas');
            if (!dCanvas) return;
            
            // РђРЅРёРјР°С†РёСЏ РєРЅРѕРїРєРё
            const originalText = btnAnalyze.innerHTML;
            btnAnalyze.innerHTML = '<i class="ph ph-spinner ph-spin"></i> РђРЅР°Р»РёР·РёСЂСѓРµРј...';
            
            // РџРѕР»СѓС‡Р°РµРј СЂРёСЃСѓРЅРѕРє РІ base64
            const imageBase64 = dCanvas.toDataURL('image/png');
            
            try {
                const formData = new FormData();
                formData.append('image_base64', imageBase64);
                formData.append('is_premium', 'true');
                
                const response = await fetch('/api/analyze-canvas', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                alert("Solifon Visionary: " + (data.reply || "РђРЅР°Р»РёР· Р·Р°РІРµСЂС€РµРЅ."));
            } catch (err) {
                alert("РћС€РёР±РєР° РїСЂРё Р°РЅР°Р»РёР·Рµ СЂРёСЃСѓРЅРєР°.");
            } finally {
                btnAnalyze.innerHTML = originalText;
            }
        });
    }
});


window.toggleAirCanvas = function() {
    let container = document.getElementById('camera-overlay-container');
    if (!container) return;
    
    if (typeof cameraStarted === 'undefined' || !cameraStarted) {
        // Start it for the first time
        if (typeof startAirCanvas === 'function') {
            startAirCanvas();
        }
    } else {
        // Toggle visibility
        if (container.style.display === 'none' || container.style.display === '') {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }
};


window.stopAirCanvas = function() {
    let container = document.getElementById('camera-overlay-container');
    if (container) container.style.display = 'none';
    
    if (window.mpCamera) {
        window.mpCamera.stop();
        window.mpCamera = null;
    }
    
    let video = document.getElementById('input_video');
    if (video && video.srcObject) {
        let stream = video.srcObject;
        let tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    
    let btn = document.querySelector('.camera-btn'); if(btn) btn.style.display = 'inline-block';
    
    cameraStarted = false;
};

