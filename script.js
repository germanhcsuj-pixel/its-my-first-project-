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
                console.error('РћС€РёР±РєР° РїСЂРѕРІРµСЂРєРё РїРѕРґРїРёСЃРєРё', err);
            }
        });
}

// Р В РЎвЂєР В Р’В±Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂќР В Р’В° Р В Р вЂ Р В РЎвЂўР В Р’В·Р В Р вЂ Р РЋР вЂљР В Р’В°Р РЋРІР‚С™Р В Р’В° Р В РЎвЂ”Р В РЎвЂўР РЋР С“Р В В»Р В Р’Вµ Google redirect (Р В РЎВР В РЎвЂўР В Р’В±Р В РЎвЂР В В»Р РЋР Р‰Р В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            // Р В вЂ”Р В Р’В°Р В РЎвЂќР РЋР вЂљР РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р В Р’ВµР В РЎВ Р В РЎВР В РЎвЂўР В РўвЂР В Р’В°Р В В»Р В РЎвЂќР РЋРЎвЂњ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂ Р В В»Р РЋР вЂ№Р В Р’В±Р В РЎвЂўР В РЎВ Р РЋР С“Р В РЎвЂ”Р В РЎвЂўР РЋР С“Р В РЎвЂўР В Р’В±Р В Р’Вµ Р В Р вЂ Р РЋРІР‚В¦Р В РЎвЂўР В РўвЂР В Р’В°
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
let authMode = ' РёР»Рё '; // 'login' Р В РЎвЂР В В»Р В РЎвЂ 'register'

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
        submitBtn.textContent = 'Sign In';
        title.textContent = 'Welcome back';
    } else {
        btnReg.style.background = '#fff';
        btnReg.style.color = '#000';
        btnLogin.style.background = 'transparent';
        btnLogin.style.color = '#fff';
        submitBtn.textContent = 'Sign Up';
        title.textContent = 'Create an account';
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
        errorEl.textContent = 'РџР°СЂРѕР»СЊ РјРёРЅРёРјСѓРј 6 СЃРёРјРІРѕР»РѕРІ';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'Р В РЎСџР В Р’В°Р РЋР вЂљР В РЎвЂўР В В»Р РЋР Р‰ Р В РЎВР В РЎвЂР В Р вЂ¦Р В РЎвЂР В РЎВР РЋРЎвЂњР В РЎВ 6 Р РЋР С“Р В РЎвЂР В РЎВР В Р вЂ Р В РЎвЂўР В В»Р В РЎвЂўР В Р вЂ ';
        return;
    }
    
    btn.textContent = 'РќР°Р¶РјРё РјРµРЅСЏ';
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
                'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ': 'Р В РЎСџР В РЎвЂўР В В»Р РЋР Р‰Р В Р’В·Р В РЎвЂўР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р В Р’ВµР В В»Р РЋР Р‰ Р В Р вЂ¦Р В Р’Вµ Р В Р вЂ¦Р В Р’В°Р В РІвЂћвЂ“Р В РўвЂР В Р’ВµР В Р вЂ¦',
                'РќРµРІРµСЂРЅС‹Р№ РїР°СЂРѕР»СЊ': 'Р В РЎСљР В Р’ВµР В Р вЂ Р В Р’ВµР РЋР вЂљР В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В РЎвЂ”Р В Р’В°Р РЋР вЂљР В РЎвЂўР В В»Р РЋР Р‰',
                'Email СѓР¶Рµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ': 'Email Р РЋРЎвЂњР В Р’В¶Р В Р’Вµ Р В РЎвЂР РЋР С“Р В РЎвЂ”Р В РЎвЂўР В В»Р РЋР Р‰Р В Р’В·Р РЋРЎвЂњР В Р’ВµР РЋРІР‚С™Р РЋР С“Р РЋР РЏ',
                'РќРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ email': 'Р В РЎСљР В Р’ВµР В Р вЂ Р В Р’ВµР РЋР вЂљР В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р РЋРІР‚С›Р В РЎвЂўР РЋР вЂљР В РЎВР В Р’В°Р РЋРІР‚С™ email',
                'РџР°СЂРѕР»СЊ СЃР»РёС€РєРѕРј СЃР»Р°Р±С‹Р№': 'Р В РЎСџР В Р’В°Р РЋР вЂљР В РЎвЂўР В В»Р РЋР Р‰ Р РЋР С“Р В В»Р В РЎвЂР РЋРІвЂљВ¬Р В РЎвЂќР В РЎвЂўР В РЎВ Р РЋР С“Р В В»Р В Р’В°Р В Р’В±Р РЋРІР‚в„–Р В РІвЂћвЂ“',
                'РќРµРІРµСЂРЅС‹Р№ email РёР»Рё РїР°СЂРѕР»СЊ': 'Р В РЎСљР В Р’ВµР В Р вЂ Р В Р’ВµР РЋР вЂљР В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ email Р В РЎвЂР В В»Р В РЎвЂ Р В РЎвЂ”Р В Р’В°Р РЋР вЂљР В РЎвЂўР В В»Р РЋР Р‰',
            };
            errorEl.textContent = msgs[err.code] || 'РћС€РёР±РєР°: ' + err.message;
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
            content: content || '[РџРЈРЎРўРћР™ РћРўР’Р•Рў]',
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
                 onmouseout="this.style.background=''">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; overflow: hidden;" onclick="window.restoreSession('${sessionId}')">
                    <i class="ph ph-chat-teardrop-text" style="color: #00f2ff; opacity: 0.8; font-size: 16px;"></i>
                    <p style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity:0.9; flex: 1;">
                        ${title}
                    </p>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="fav-session-btn" onclick="event.stopPropagation(); window.toggleFavoriteSession('${sessionId}', this)" title="Add to Favorites" style="background:none;border:none;cursor:pointer;color:${sessionMsgs[0].isFavoriteSession ? '#ffcf33' : 'rgba(255,255,255,0.3)'};transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 4px;">
                        <i class="${sessionMsgs[0].isFavoriteSession ? 'ph-fill ph-star' : 'ph ph-star'}"></i>
                    </button>
                    <button class="del-session-btn" onclick="event.stopPropagation(); window.deleteSession('${sessionId}', this)" title="Delete" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);transition:color 0.2s; padding: 4px;">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
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
        const msgDiv = addMessageToUI(msg.role, content);
        if (msg.role === 'ai' && msgDiv) {
            const textContainer = msgDiv.querySelector('.text');
            if (textContainer) {
                textContainer.innerHTML = `<div class="typed-content" style="margin-top: 12px;">${content}</div>`;
                if (typeof addMinimalDock === 'function') {
                    addMinimalDock(textContainer);
                }
            }
        }
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

window.toggleFavoriteSession = function(sessionId, btnElement) {
    const history = getLocalHistory();
    const sessionMsgs = history.filter(m => (m.sessionId || 'legacy') === sessionId);
    if(sessionMsgs.length > 0) {
        const firstMsg = sessionMsgs[0];
        const isCurrentlyFav = firstMsg.isFavoriteSession;
        firstMsg.isFavoriteSession = !isCurrentlyFav;
        const index = history.findIndex(m => m.id === firstMsg.id);
        if(index > -1) {
            history[index].isFavoriteSession = !isCurrentlyFav;
            setLocalHistory(history);
        }
        
        const icon = btnElement.querySelector('i');
        if(!isCurrentlyFav) {
            icon.classList.remove('ph');
            icon.classList.add('ph-fill');
            btnElement.style.color = '#ffcf33';
            icon.style.animation = 'none';
            void icon.offsetWidth;
            icon.style.animation = 'starBurst 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
        } else {
            icon.classList.remove('ph-fill');
            icon.classList.add('ph');
            btnElement.style.color = 'rgba(255,255,255,0.3)';
            icon.style.animation = 'none';
            icon.style.filter = 'none';
        }
        
        if(typeof loadLibrary === 'function') loadLibrary();
    }
};

window.deleteSession = function(sessionId, btnElement) {
    let history = getLocalHistory();
    const isCurrent = window.currentSessionId === sessionId;
    history = history.filter(m => (m.sessionId || 'legacy') !== sessionId);
    setLocalHistory(history);
    
    const item = btnElement ? btnElement.closest('.history-item') : null;
    if (item) {
        item.style.transition = 'all 0.4s ease';
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        setTimeout(() => {
            loadChatHistory();
            if(typeof loadLibrary === 'function') loadLibrary();
            if(isCurrent) {
                window.clearChat();
            }
        }, 400);
    } else {
        loadChatHistory();
        if(typeof loadLibrary === 'function') loadLibrary();
        if(isCurrent) {
            window.clearChat();
        }
    }
};

function loadLibrary() {
    const libraryContainer = document.getElementById('savedItemsContainer');
    if (!libraryContainer) return;
    
    libraryContainer.innerHTML = '';
    const history = getLocalHistory();
    const sessions = {};
    history.forEach(msg => {
        const sid = msg.sessionId || 'legacy';
        if (!sessions[sid]) sessions[sid] = [];
        sessions[sid].push(msg);
    });
    const favorites = Object.values(sessions).filter(sessionMsgs => sessionMsgs[0] && sessionMsgs[0].isFavoriteSession).map(sessionMsgs => sessionMsgs[0]);
    
    const emptyEl = document.querySelector('#libraryPanel .empty-library');
    if (favorites.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    
    favorites.forEach((data) => {
        const item = document.createElement('div');
        item.className = 'library-item';
        item.innerHTML = `
            <div style="padding: 15px; background: rgba(0, 242, 255, 0.05); border: 1px solid rgba(0, 242, 255, 0.15); border-radius: 12px; margin-bottom: 12px; position: relative; overflow: hidden; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.1); backdrop-filter: blur(10px);"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0,242,255,0.15)';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)';"
                 onclick="window.restoreSession('${data.sessionId}')">
                <div style="font-size: 10px; color: #00f2ff; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                    <i class="ph-fill ph-star" style="color: #00f2ff;"></i> Saved Memory
                </div>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #fff; opacity: 0.9; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${data.content}</p>
                <div style="position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: linear-gradient(180deg, #00f2ff, #0051ff);"></div>
            </div>
        `;
        libraryContainer.prepend(item);
    });
}

// ============================================================
// 1. Р В РІР‚СљР В РІР‚С”Р В РЎвЂєР В РІР‚ВР В РЎвЂ™Р В РІР‚С”Р В Р’В¬Р В РЎСљР В В«Р В РІР‚Сћ Р В РЎСџР В РІР‚СћР В Р’В Р В РІР‚СћР В РЎС™Р В РІР‚СћР В РЎСљР В РЎСљР В В«Р В РІР‚Сћ
// ============================================================
let isLiveMode = false;
let liveRecognition = null;
let selectedFiles = []; 
let isVoiceResponseActive = false; 
const MAX_IMAGES = 5;
let selectedProvider = 'gemini';
let lumifexActive = false;

// FIX: Correct comment syntax (was '/ РІвЂќР‚РІвЂќР‚' causing JS parse error)
// Р В Р вЂ Р Р†Р вЂљРЎСљР В РІР‚С™Р В Р вЂ Р Р†Р вЂљРЎСљР В РІР‚С™ DEEP MODE Р В Р Р‹Р В Р’В Р вЂ™Р’ВР В Р Р‹Р В РЎС›Р В РІР‚СћР В РЎС™Р В РЎвЂ™ Р В Р вЂ Р Р†Р вЂљРЎСљР В РІР‚С™Р В Р вЂ Р Р†Р вЂљРЎСљР В РІР‚С™
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
        addMessageToUI('СЂСџвЂќВ¬ Р›РёРјРёС‚ Deep Mode РёСЃС‡РµСЂРїР°РЅ. РЈ РІР°СЃ РµСЃС‚СЊ 5 Р·Р°РїСЂРѕСЃРѕРІ РІ РґРµРЅСЊ. РџРѕРїСЂРѕР±СѓР№С‚Рµ Р·Р°РІС‚СЂР°!', 'Р РЋР вЂљР РЋРЎСџР Р†Р вЂљРЎСљР вЂ™Р’В¬ Р В РІР‚С”Р В РЎвЂР В РЎЛњР В РЎвЂР РЋРІР‚С™ Deep Mode Р В РЎвЂР РЋР С“Р РЋРІР‚РЋР В Р’ВµР РЋР вЂљР В РЎвЂ”Р В Р’В°Р В Р вЂ¦. Р В Р в‚¬ Р В Р вЂ Р В Р’В°Р РЋР С“ Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р РЋР Р‰ 5 Р В Р’В·Р В Р’В°Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋР С“Р В РЎвЂўР В Р вЂ  Р В Р вЂ  Р В РўвЂР В Р’ВµР В Р вЂ¦Р РЋР Р‰. Р В РЎСџР В РЎвЂўР В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В Р’В±Р РЋРЎвЂњР В РІвЂћвЂ“Р РЋРІР‚С™Р В Р’Вµ Р В Р’В·Р В Р’В°Р В Р вЂ Р РЋРІР‚С™Р РЋР вЂљР В Р’В°!');
        return false;
    }
    return true;
}

const modelMap = {
    'solifon-flux': 'flux',
    'solifon-soul': 'solifon-soul',
    'solifon-alpha': 'github',
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
// 2. Р В РІР‚в„ўР В Р Р‹Р В РЎСџР В РЎвЂєР В РЎС™Р В РЎвЂєР В РІР‚СљР В РЎвЂ™Р В РЎС›Р В РІР‚СћР В РІР‚С”Р В Р’В¬Р В РЎСљР В В«Р В РІР‚Сћ UI Р В Р’В¤Р В Р в‚¬Р В РЎСљР В РЎв„ўР В Р’В¦Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В
// ============================================================
function typeEffect(element, text) {
    const textContainer = element.querySelector('.text');
    if (!textContainer) return;
    const cleanText = (text || "").trim();

    // Hide deep mode steps gracefully
    const deepSteps = textContainer.closest('.message').querySelector('.ai-thinking-steps');
    if (deepSteps) {
        deepSteps.style.transition = 'opacity 0.5s ease, max-height 0.5s ease';
        deepSteps.style.opacity = '0';
        deepSteps.style.maxHeight = '0';
        setTimeout(() => deepSteps.remove(), 500);
    }
    
    let typeSpan = textContainer.querySelector('.typed-content');
    if (!typeSpan) {
        typeSpan = document.createElement('div');
        typeSpan.className = 'typed-content';
        typeSpan.style.marginTop = '12px';
        textContainer.appendChild(typeSpan);
    }
    
    let i = 0;
    window.currentTypingElement = typeSpan;
    window.currentTypingText = cleanText;
    const interval = setInterval(() => {
    window.currentTypingInterval = interval;
    const stopBtn = document.getElementById('stopBtn');
    if(stopBtn) stopBtn.style.display = 'inline-block';
        if (i < cleanText.length) {
            i += Math.floor(Math.random() * 4) + 3; 
            if (i > cleanText.length) i = cleanText.length;
            
            const partial = cleanText.slice(0, i);
            typeSpan.innerHTML = partial
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00c8ff;">$1</strong>')
                .replace(/\n/g, '<br>');
            const container = document.getElementById('messagesContainer');
            if (container) container.scrollTop = container.scrollHeight;
        } else {
            clearInterval(interval);
            window.currentTypingInterval = null;
            const stopBtn = document.getElementById('stopBtn');
            if(stopBtn) stopBtn.style.display = 'none';
            if (typeof addMinimalDock === 'function') {
                addMinimalDock(textContainer);
            }
        }
    }, 10);
}

function addMinimalDock(container) {
    const dockContainer = document.createElement('div');
    dockContainer.innerHTML = `
        <div class="dock-container" style="margin-top: 15px;">
          <div class="dock-inner">
            <button class="dock-btn" title="Copy" onclick="
                const tc = this.closest('.text').querySelector('.typed-content');
                const textToCopy = tc ? tc.innerText : this.closest('.text').innerText.replace(/<[^>]*>?/gm, '');
                navigator.clipboard.writeText(textToCopy);
                const svg = this.querySelector('svg');
                svg.innerHTML = '<polyline points=\\\'20 6 9 17 4 12\\\'></polyline>';
                this.style.color = '#00c8ff';
                setTimeout(() => {
                    svg.innerHTML = '<rect width=\\\'14\\\' height=\\\'14\\\' x=\\\'8\\\' y=\\\'8\\\' rx=\\\'2\\\' ry=\\\'2\\\'/><path d=\\\'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\\\'/>';
                    this.style.color = '';
                }, 2000);
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            </button>
            <button class="dock-btn" title="Like" onclick="this.style.color='#00ff88'; this.style.transform='scale(1.2)'; setTimeout(()=>this.style.transform='scale(1)', 200)">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-thumbs-up"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
            </button>
            <button class="dock-btn" title="Dislike" onclick="this.style.color='#ff5555'; this.style.transform='scale(1.2)'; setTimeout(()=>this.style.transform='scale(1)', 200)">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-thumbs-down"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>
            </button>
            <button class="dock-btn" title="Voice" onclick="
                this.style.color='#a29bfe'; 
                this.style.transform='scale(1.2)'; 
                setTimeout(()=>this.style.transform='scale(1)', 200);
                if(window.readAloud) {
                    const tc = this.closest('.text').querySelector('.typed-content');
                    window.readAloud(tc ? tc.innerText : this.closest('.text').innerText.replace(/<[^>]*>?/gm, ''));
                } else if(window.speak) {
                    const tc = this.closest('.text').querySelector('.typed-content');
                    window.speak(tc ? tc.innerText : this.closest('.text').innerText.replace(/<[^>]*>?/gm, ''));
                } else {
                    alert('РћР·РІСѓС‡РєР° РІРєР»СЋС‡РµРЅР°!');
                }
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
          </div>
          <div class="dock-reflection"></div>
        </div>
    `;
    container.appendChild(dockContainer.firstElementChild);
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
// QUICK QUESTIONS вЂ” 40 РІРѕРїСЂРѕСЃРѕРІ, 4 СЃР»СѓС‡Р°Р№РЅС‹С…
// ============================================================
const ALL_QUESTIONS = [
  { icon: 'Р§С‚Рѕ С‚Р°РєРѕРµ РЅРµР№СЂРѕРЅРЅР°СЏ СЃРµС‚СЊ?', text: "Р§С‚Рѕ С‚Р°РєРѕРµ РЅРµР№СЂРѕРЅРЅР°СЏ СЃРµС‚СЊ?" },
  { icon: 'РћР±СЉСЏСЃРЅРё РєРІР°РЅС‚РѕРІСѓСЋ РјРµС…Р°РЅРёРєСѓ', text: "РћР±СЉСЏСЃРЅРё РєРІР°РЅС‚РѕРІСѓСЋ РјРµС…Р°РЅРёРєСѓ" },
  { icon: 'РљР°Рє РЅР°РїРёСЃР°С‚СЊ Р±РёР·РЅРµСЃ-РїР»Р°РЅ?', text: "РљР°Рє РЅР°РїРёСЃР°С‚СЊ Р±РёР·РЅРµСЃ-РїР»Р°РЅ?" },
  { icon: 'Р§С‚Рѕ С‚Р°РєРѕРµ РјР°С€РёРЅРЅРѕРµ РѕР±СѓС‡РµРЅРёРµ?', text: "Р§С‚Рѕ С‚Р°РєРѕРµ РјР°С€РёРЅРЅРѕРµ РѕР±СѓС‡РµРЅРёРµ?" },
  { icon: 'РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ РёРЅС‚РµСЂРЅРµС‚?', text: "РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ РёРЅС‚РµСЂРЅРµС‚?" },
  { icon: 'Р§С‚Рѕ С‚Р°РєРѕРµ Р”РќРљ Рё РєР°Рє РѕРЅР° СЂР°Р±РѕС‚Р°РµС‚?', text: "Р§С‚Рѕ С‚Р°РєРѕРµ Р”РќРљ Рё РєР°Рє РѕРЅР° СЂР°Р±РѕС‚Р°РµС‚?" },
  { icon: 'Р§С‚Рѕ С‚Р°РєРѕРµ С‡С‘СЂРЅР°СЏ РґС‹СЂР°?', text: "Р§С‚Рѕ С‚Р°РєРѕРµ С‡С‘СЂРЅР°СЏ РґС‹СЂР°?" },
  { icon: 'РљР°Рє РЅР°С‡Р°С‚СЊ РїСЂРѕРіСЂР°РјРјРёСЂРѕРІР°С‚СЊ СЃ РЅСѓР»СЏ?', text: "РљР°Рє РЅР°С‡Р°С‚СЊ РїСЂРѕРіСЂР°РјРјРёСЂРѕРІР°С‚СЊ СЃ РЅСѓР»СЏ?" },
  { icon: 'РљР°Рє РЅР°С‡Р°С‚СЊ РёРЅРІРµСЃС‚РёСЂРѕРІР°С‚СЊ?', text: "РљР°Рє РЅР°С‡Р°С‚СЊ РёРЅРІРµСЃС‚РёСЂРѕРІР°С‚СЊ?" },
  { icon: 'РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ РёРјРјСѓРЅРЅР°СЏ СЃРёСЃС‚РµРјР°?', text: "РљР°Рє СЂР°Р±РѕС‚Р°РµС‚ РёРјРјСѓРЅРЅР°СЏ СЃРёСЃС‚РµРјР°?" },
  { icon: 'Р§С‚Рѕ С‚Р°РєРѕРµ РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹Р№ РёРЅС‚РµР»Р»РµРєС‚?', text: "Р§С‚Рѕ С‚Р°РєРѕРµ РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹Р№ РёРЅС‚РµР»Р»РµРєС‚?" },
  { icon: 'Р§С‚Рѕ С‚Р°РєРѕРµ РєСЂРёРїС‚РѕРІР°Р»СЋС‚Р°?', text: "Р§С‚Рѕ С‚Р°РєРѕРµ РєСЂРёРїС‚РѕРІР°Р»СЋС‚Р°?" },
];

function renderQuickPills() {
  const container = document.getElementById('quickPills');
  if (!container) return;
  const selected = [
    { icon: 'Р§С‚Рѕ С‚Р°РєРѕРµ РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹Р№ РёРЅС‚РµР»Р»РµРєС‚?', text: "Р В Р’В§Р РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂР РЋР С“Р В РЎвЂќР РЋРЎвЂњР РЋР С“Р РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В В»Р В В»Р В Р’ВµР В РЎвЂќР РЋРІР‚С™?" },
    { icon: 'Р§С‚Рѕ С‚Р°РєРѕРµ РјРµС‚Р°РІСЃРµР»РµРЅРЅР°СЏ?', text: "Р В Р’В§Р РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎВР В Р’ВµР РЋРІР‚С™Р В Р’В°Р В Р вЂ Р РЋР С“Р В Р’ВµР В В»Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В Р’В°Р РЋР РЏ?" },
    { icon: 'Р§С‚Рѕ С‚Р°РєРѕРµ Р°РЅС‚РёРјР°С‚РµСЂРёСЏ?', text: "Р В Р’В§Р РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂР В РЎВР В Р’В°Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В РЎвЂР РЋР РЏ?" },
    { icon: 'Р§С‚Рѕ С‚Р°РєРѕРµ РјР°С€РёРЅРЅРѕРµ РѕР±СѓС‡РµРЅРёРµ?', text: "Р В Р’В§Р РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎВР В Р’В°Р РЋРІвЂљВ¬Р В РЎвЂР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В Р’Вµ Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ?" }
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
// 3. Р В РІР‚СљР В РІР‚С”Р В РЎвЂєР В РІР‚ВР В РЎвЂ™Р В РІР‚С”Р В Р’В¬Р В РЎСљР В В«Р В РІР‚Сћ Р В Р’В¤Р В Р в‚¬Р В РЎСљР В РЎв„ўР В Р’В¦Р В Р’В Р вЂєРЎС™Р В Р’В Р вЂєРЎС™ Р В РЎвЂєР В РЎв„ўР В РЎСљР В РЎвЂє Р В Р’В Р вЂєРЎС™ Р В Р’В¤Р В РЎвЂ™Р В РІвЂћСћР В РІР‚С”Р В РЎвЂєР В РІР‚в„ў
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
        alert('РћС€РёР±РєР° РїСЂРё Р°РЅР°Р»РёР·Рµ СЂРёСЃСѓРЅРєР°.');
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
    
    // Fix: reset scroll position and header animation state
    const chatWrapper = document.getElementById('chatWrapper');
    if (chatWrapper) chatWrapper.scrollTop = 0;
    
    const animatedChatHeader = document.getElementById('animatedChatHeader');
    if (animatedChatHeader) {
        animatedChatHeader.classList.remove('sent-hidden');
        animatedChatHeader.classList.remove('typing-active');
    }
};

window.openFilePicker = function() {
    document.getElementById('fileInput')?.click();
};

window.openModal = function(id) {
    if (id === 'aboutModal') {
        
    } else if (id === 'upgradeModal') {
        
    } else if (id === 'whatsNewModal') {
        
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
// 4. Р В РЎвЂєР В Р Р‹Р В РЎСљР В РЎвЂєР В РІР‚в„ўР В РЎСљР В РЎвЂ™Р В Р вЂЎ Р В РІР‚С”Р В РЎвЂєР В РІР‚СљР В Р’ВР В РЎв„ўР В РЎвЂ™ (DOMContentLoaded)
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
    const targetSessionId = window.currentSessionId;
    
    const isDeepMode = document.getElementById('mainAppLayout')?.classList.contains('deep-mode');
    if (isDeepMode) {
        if (!checkDeepLimit()) return;
        incrementDeepUsage();
    }

    const text = userInput?.value.trim();
    const filesToSend = [...selectedFiles];
    if (!text && filesToSend.length === 0) return;

    if (text.toLowerCase().startsWith('Р±СЂР°СѓР·РµСЂ:')) {
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
    else if (rand < 0.40) numSteps = 6;
    else numSteps = 5;

    let totalTime = 0;
    if (Math.random() < 0.50) {
        totalTime = 20000;
    } else {
        totalTime = Math.floor(Math.random() * (12000 - 6000 + 1)) + 6000;
    }
    const stage1 = ['Initializing neural cores...', 'Loading contextual modules...', 'Analyzing user query...'];
    const stage2 = ['Scanning multi-dimensional databases...', 'Extracting relevant context blocks...', 'Accessing long-term memory modules...', 'Synchronizing information streams...', 'Filtering excessive noise...', 'Searching for intersections in vector space...', 'Extracting associative patterns...', 'Gathering verified facts...'];
    const stage3 = ['Cross-verifying found sources...', 'Resolving logical contradictions...', 'Safety Check...', 'Cascading argument validation...', 'Evaluating metadata reliability...', 'Weighing probabilistic outcomes...', 'Optimizing reasoning chain...'];
    const stage4 = ['Starting language synthesis processes...', 'Formulating structural final theses...', 'Adapting stylistics to conversation context...', 'Selecting precise linguistic formulations...', 'Calibrating text output parameters...', 'Final rendering of model response...', 'Checking grammatical patterns...'];
    
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
            ? `[Р В РІР‚СљР В РІР‚С”Р В Р в‚¬Р В РІР‚ВР В РЎвЂєР В РЎв„ўР В Р’ВР В РІвЂћСћ Р В РЎвЂ™Р В РЎСљР В РЎвЂ™Р В РІР‚С”Р В Р’ВР В вЂ”] Р В РЎвЂєР РЋРІР‚С™Р В Р вЂ Р В Р’ВµР РЋРІР‚РЋР В Р’В°Р В РІвЂћвЂ“ Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР РЉР В РЎвЂќР РЋР С“Р В РЎвЂ”Р В Р’ВµР РЋР вЂљР РЋРІР‚С™. Р В РЎвЂєР В Р’В±Р РЋР вЂ°Р РЋР РЏР РЋР С“Р В Р вЂ¦Р РЋР РЏР В РІвЂћвЂ“ Р В РЎСџР В РЎвЂєР В Р’В§Р В РІР‚СћР В РЎС™Р В Р в‚¬ Р РЋРІР‚С™Р РЋРІР‚в„– Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР РЋРІвЂљВ¬Р РЋРІР‚ВР В В» Р В РЎвЂќ Р В РЎвЂќР В Р’В°Р В Р’В¶Р В РўвЂР В РЎвЂўР В РЎВР РЋРЎвЂњ Р В Р вЂ Р РЋРІР‚в„–Р В Р вЂ Р В РЎвЂўР В РўвЂР РЋРЎвЂњ. Р В РЎСџР В РЎвЂўР В РЎвЂќР В Р’В°Р В Р’В·Р РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р В РІвЂћвЂ“ Р В В»Р В РЎвЂўР В РЎвЂ“Р В РЎвЂР В РЎвЂќР РЋРЎвЂњ Р РЋРІвЂљВ¬Р В Р’В°Р В РЎвЂ“ Р В Р’В·Р В Р’В° Р РЋРІвЂљВ¬Р В Р’В°Р В РЎвЂ“Р В РЎвЂўР В РЎВ. Р В РЎСџР РЋР вЂљР В РЎвЂР В Р вЂ Р В РЎвЂўР В РўвЂР В РЎвЂ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР В РЎВР В Р’ВµР РЋР вЂљР РЋРІР‚в„– Р В РЎвЂ Р В РўвЂР В РЎвЂўР В РЎвЂќР В Р’В°Р В Р’В·Р В Р’В°Р РЋРІР‚С™Р В Р’ВµР В В»Р РЋР Р‰Р РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В Р’В°. Р В вЂ”Р В Р’В°Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋР С“: ${text}`
            : text;
        formData.append('prompt', finalPrompt);
        formData.append('provider', currentProvider);
        formData.append('use_voice', isLiveMode ? 'true' : 'false');
        if (filesToSend.length > 0) formData.append('file', filesToSend[0]);
        formData.append('user_email', currentUser ? currentUser.email : '');


        window.currentAbortController = new AbortController();
        document.getElementById("stopBtn").style.display = "inline-block";
        const fetchPromise = fetch("https://germanhcsuj-itssoimportandforme.hf.space/chat", {
            method: "POST",
            body: formData,
            signal: window.currentAbortController.signal
        });

        const minDelayPromise = new Promise(resolve => setTimeout(resolve, totalTime));
        const [response] = await Promise.all([fetchPromise, minDelayPromise]);

        if (!response.ok) throw new Error("Server Error");

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/pdf')) {
            // === PDF DOWNLOAD ===
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = window._pdfDownloadName || 'solifon_document.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            document.getElementById("stopBtn").style.display = "none";
            const textEl = botMsgElement?.querySelector?.('.text');
            if (textEl) textEl.innerHTML = 'рџ“„ <strong style="color:#63b3ed">PDF РіРѕС‚РѕРІ!</strong> Р¤Р°Р№Р» СЃРєР°С‡Р°Р»СЃСЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё. РџСЂРѕРІРµСЂСЊ РїР°РїРєСѓ Р—Р°РіСЂСѓР·РєРё.';
            saveToFirebase('ai', '[PDF СЃРѕР·РґР°РЅ]', targetSessionId);
        } else if (contentType && contentType.includes('image')) {
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            document.getElementById("stopBtn").style.display = "none";
            renderMediaInMessage(botMsgElement, imageUrl);
            saveToFirebase('ai', '[image]', targetSessionId);
        } else {
            const data = await response.json();
            document.getElementById("stopBtn").style.display = "none";
            
            if (data.image_html) {
                const tEl = botMsgElement.querySelector('.text');
                if (tEl) {
                    const imgContainer = document.createElement('div');
                    imgContainer.innerHTML = data.image_html;
                    tEl.appendChild(imgContainer);
                }
            }
            
            const reply = data.reply || '...';
            typeEffect(botMsgElement, reply);
            
            let saveHtml = reply;
            if (data.image_html) saveHtml = data.image_html + reply;
            saveToFirebase('ai', saveHtml, targetSessionId);
            if (isLiveMode) {
                const status = document.getElementById('liveStatus');
                if (!reply || reply === '...') {
                    if (status) status.innerText = 'Lumifex РіРѕРІРѕСЂРёС‚...';
                    setTimeout(() => { if (isLiveMode) startLiveListening(); }, 1000);
                } else {
                    if (status) status.innerText = "РћС‚РІРµС‚ РїРѕР»СѓС‡РµРЅ вњ“";
                    speakText(reply);
                }
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            document.getElementById("stopBtn").style.display = "none";
            if (botMsgElement && botMsgElement.querySelector) {
                const t = botMsgElement.querySelector('.text');
                if (t && !t.innerText.trim()) {
                    t.innerHTML = '<span style="color:#888;"><i>[РћСЃС‚Р°РЅРѕРІР»РµРЅРѕ]</i></span>';
                }
            }
            window.isHandlingAI = false;
            return;
        }
        if (isLiveMode) {
            const status = document.getElementById('liveStatus');
            if (status) status.innerText = "РћС€РёР±РєР°... РїРѕРІС‚РѕСЂ С‡РµСЂРµР· 2 СЃРµРє";
            setTimeout(() => { if (isLiveMode) startLiveListening(); }, 2000);
        } else {
            if (botMsgElement && botMsgElement.querySelector) {
                const t = botMsgElement.querySelector('.text');
                if (t) t.innerText = 'РћС€РёР±РєР° СЃРѕРµРґРёРЅРµРЅРёСЏ.';
            }
        }
    } finally {
        window.isHandlingAI = false;
        if (userInput) userInput.focus();
    }
};



    sendBtn?.addEventListener('click', () => window.handleAI());
    userInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.handleAI(); }
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

    // Deep Search button вЂ” handled via window.toggleDeepMenu in HTML
    // (old deep-mode toggle replaced by command menu)

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
            if (err.error === 'Р”РѕСЃС‚СѓРї Рє РјРёРєСЂРѕС„РѕРЅСѓ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ. Р Р°Р·СЂРµС€РёС‚Рµ РµРіРѕ РІ РЅР°СЃС‚СЂРѕР№РєР°С… Р±СЂР°СѓР·РµСЂР°.') alert("Р В РІР‚СњР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В РЎвЂ” Р В РЎвЂќ Р В РЎВР В РЎвЂР В РЎвЂќР РЋР вЂљР В РЎвЂўР РЋРІР‚С›Р В РЎвЂўР В Р вЂ¦Р РЋРЎвЂњ Р В Р’В·Р В Р’В°Р В Р’В±Р В В»Р В РЎвЂўР В РЎвЂќР В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦. Р В Р’В Р В Р’В°Р В Р’В·Р РЋР вЂљР В Р’ВµР РЋРІвЂљВ¬Р В РЎвЂР РЋРІР‚С™Р В Р’Вµ Р В Р’ВµР В РЎвЂ“Р В РЎвЂў Р В Р вЂ  Р В Р вЂ¦Р В Р’В°Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂўР В РІвЂћвЂ“Р В РЎвЂќР В Р’В°Р РЋРІР‚В¦ Р В Р’В±Р РЋР вЂљР В Р’В°Р РЋРЎвЂњР В Р’В·Р В Р’ВµР РЋР вЂљР В Р’В°.");
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
    console.log('Р—Р°РґР°С‡Р° РІ Р±СЂР°СѓР·РµСЂРµ Р·Р°РІРµСЂС€РµРЅР°');
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
    description: 'СЃР°РјС‹Р№ Р»СѓС‡С€РёР№ РјРѕРґРµР» РґР»СЏ РєРѕРґР°', 
    stats: ['РЎС‚Р°С‚РёСЃС‚РёРєР°', "Р В Р Р‹Р В РЎвЂќР В РЎвЂўР РЋР вЂљР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂќР В В»Р В РЎвЂР В РЎвЂќР В Р’В° : Р В РЎвЂєР В Р’В±Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂќР В Р’В° Р В РЎвЂР В РўвЂР В Р’ВµР РЋРІР‚С™ Р В РЎвЂ”Р РЋР вЂљР РЋР РЏР В РЎВР В РЎвЂў Р В Р вЂ¦Р В Р’В° Р В Р вЂ Р В Р’В°Р РЋРІвЂљВ¬Р В Р’ВµР В РЎВ Р В Р’В¶Р В Р’ВµР В В»Р В Р’ВµР В Р’В·Р В Р’Вµ Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљ Р В Р вЂ¦Р В РЎвЂР В РЎвЂќР В Р’В°Р В РЎвЂќР В РЎвЂўР В РІвЂћвЂ“ Р В Р’В·Р В Р’В°Р В РўвЂР В Р’ВµР РЋР вЂљР В Р’В¶Р В РЎвЂќР В РЎвЂ Р РЋР С“Р В Р’ВµР РЋРІР‚С™Р В РЎвЂ (Р В РЎвЂ”Р В РЎвЂР В Р вЂ¦Р В РЎвЂ“Р В Р’В°)."],
    info: "Р В Р’В Р В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В Р’В°Р В РІвЂћвЂ“Р РЋРІР‚С™Р В Р’Вµ Р В Р вЂ¦Р В Р’В°Р В РўвЂ Р В Р вЂ Р В Р’В°Р В Р’В¶Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎВР В РЎвЂ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В Р’В°Р В РЎВР В РЎвЂ Р В Р вЂ  Р В РЎвЂ”Р В РЎвЂўР В В»Р В Р’ВµР РЋРІР‚С™Р В Р’Вµ Р В РЎвЂР В В»Р В РЎвЂ Р В Р вЂ  Р В РЎВР В Р’ВµР РЋР С“Р РЋРІР‚С™Р В Р’В°Р РЋРІР‚В¦, Р В РЎвЂ“Р В РўвЂР В Р’Вµ Р В Р вЂ¦Р В Р’ВµР РЋРІР‚С™ Р РЋР С“Р В Р вЂ Р РЋР РЏР В Р’В·Р В РЎвЂ..",
    skills: [{n: 'Р‘Р°Р»Р°РЅС‹РўР€ РґР°РўвЂњРґС‹Р»Р°СЂС‹', p: 100}, {n: "Р В РЎвЂ™Р В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ¦Р В РЎвЂўР В РЎВР В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰", p: 100}, {n: "Р В РЎв„ўР В РЎвЂўР В Р вЂ¦Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂўР В В»Р РЋР Р‰ Р В РўвЂР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦ ", p: 100}]
  },
  { 
    title: "SOLIFON SOUL", 
    icon: "СЂвЂњвЂ В©СЂвЂњвЂ№вЂ“СЂвЂњвЂ Р„", 
    description: "СЂР°Р·РіРѕРІРѕСЂРёС‚ РєР°Рє Р¶РёРІРѕР№ С‡РµР»РѕРІРµРє", 
    stats: ["Video Intelligence:", "Giant Context:"],
    info: "Р В РЎСџР В РЎвЂўР В Р вЂ¦Р В РЎвЂР В РЎВР В Р’В°Р В Р’ВµР РЋРІР‚С™ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ¦Р В Р’В°Р РЋРІР‚В Р В РЎвЂР В РЎвЂ, Р В РЎВР РЋРЎвЂњР В Р’В·Р РЋРІР‚в„–Р В РЎвЂќР РЋРЎвЂњ Р В РЎвЂ Р В Р’В·Р В Р вЂ Р РЋРЎвЂњР В РЎвЂќР В РЎвЂ. Р В РЎС™Р В РЎвЂўР В Р’В¶Р В Р вЂ¦Р В РЎвЂў Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р В РЎвЂў Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ“Р В РЎвЂўР В В»Р В РЎвЂўР РЋР С“Р В РЎвЂўР В Р вЂ Р В РЎвЂўР В Р’Вµ Р РЋР С“Р В РЎвЂўР В РЎвЂўР В Р’В±Р РЋРІР‚В°Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљ Soul Р В РЎвЂ”Р В РЎвЂўР В РІвЂћвЂ“Р В РЎВР В Р’ВµР РЋРІР‚С™ Р В Р вЂ Р РЋР С“Р РЋРІР‚В Р В РўвЂР В РЎвЂў Р В РЎвЂ”Р В РЎвЂўР РЋР С“Р В В»Р В Р’ВµР В РўвЂР В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р В РЎвЂў Р В Р вЂ Р В Р’В·Р В РўвЂР В РЎвЂўР РЋРІР‚В¦Р В Р’В°..",
    skills: [{n: "Р В РЎвЂєР В Р’В±Р РЋР вЂ°Р В Р’ВµР В РЎВ Р В РЎвЂ”Р В Р’В°Р В РЎВР РЋР РЏР РЋРІР‚С™Р В РЎвЂ", p: 100}, {n: "Р В Р’В­Р В РЎВР В РЎвЂ”Р В Р’В°Р РЋРІР‚С™Р В РЎвЂР РЋР РЏ Р В РЎвЂ Р В РЎвЂќР В РЎвЂўР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋР С“Р РЋРІР‚С™", p: 100}, {n: "Р В Р’В Р В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В Р’В° Р РЋР С“ Р В РўвЂР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎВР В РЎвЂ", p: 95}]
  },
  { 
    title: "SOLIFON ALPHA", 
    icon: "Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљР В РЎСљР РЋРЎСџР В РЎСљР РЋРЎСџР В РЎСљР РЋРІР‚С”Р В РЎСљР РЋРІР‚С”Р В Р вЂ Р вЂ™Р’ВР РЋРЎвЂєР В РЎвЂ”Р РЋРІР‚ВР В РІР‚в„–", 
    description: "Р РЋР С“Р В Р’В°Р В РЎВР РЋРІР‚в„–Р В РІвЂћвЂ“ Р РЋРЎвЂњР В РЎВР В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В РЎВР В РЎвЂўР В РўвЂР В Р’ВµР В В»", 
    stats: ["Р В РЎС™Р РЋРЎвЂњР В В»Р РЋР Р‰Р РЋРІР‚С™Р В РЎвЂР В РЎВР В РЎвЂўР В РўвЂР В Р’В°Р В В»Р РЋР Р‰Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰: Р В РЎвЂ™Р В РЎвЂќР РЋРІР‚С™Р РЋРЎвЂњР В Р’В°Р В В»Р РЋР Р‰Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰ Р В РўвЂР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦", "Р В Р Р‹Р РЋРІР‚С™Р В Р’В°Р В Р’В±Р В РЎвЂР В В»Р РЋР Р‰Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰: 100%"],
    info: "РўРѕС‡РЅРѕСЃС‚СЊ С„Р°РєС‚РѕРІ .",
    skills: [{n: "Р В РІР‚С”Р В РЎвЂўР В РЎвЂ“Р В РЎвЂР РЋРІР‚РЋР В Р’ВµР РЋР С“Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎВР РЋРІР‚в„–Р РЋРІвЂљВ¬Р В В»Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ", p: 98}, {n: "Р В РЎв„ўР РЋР вЂљР В Р’ВµР В Р’В°Р РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ Р РЋР С“Р РЋРІР‚С™Р В РЎвЂР В В»Р РЋР Р‰", p: 98}]
  },
  { 
    title: "SOLIFON AIR", 
    icon: "СЂвЂњвЂ В©РІС™СњСЂвЂњвЂ Р„", 
    description: "Р В РЎвЂўР РЋРІР‚С™Р В Р вЂ Р В Р’ВµР РЋРІР‚РЋР В Р’В°Р В Р’ВµР РЋРІР‚С™ Р В РЎВР В РЎвЂ“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂў", 
    stats: ["РЎРєРѕСЂРѕСЃС‚СЊ: РґРѕ 2000Рє", "РЎС‚Р°Р±РёР»СЊРЅРѕСЃС‚СЊ: 99%"],
    info: "Р В РІР‚ВР РЋРІР‚в„–Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂўР В Р’Вµ Р РЋР вЂљР В Р’В°Р РЋР С“Р В РЎвЂ”Р В РЎвЂўР В Р’В·Р В Р вЂ¦Р В Р’В°Р В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В РЎвЂўР В Р’В±Р РЋР вЂ°Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В РЎвЂўР В Р вЂ  Р В Р вЂ¦Р В Р’В° Р РЋРІР‚С›Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂў Р В РЎвЂ Р РЋР С“Р В РЎвЂќР В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В РўвЂР В РЎвЂўР В РЎвЂќР РЋРЎвЂњР В РЎВР В Р’ВµР В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ  Р В Р вЂ¦Р В Р’В° Р В В»Р В Р’ВµР РЋРІР‚С™Р РЋРЎвЂњ.",
    skills: [{n: "Р В РЎСџР В РЎвЂўР В Р вЂ Р РЋР С“Р В Р’ВµР В РўвЂР В Р вЂ¦Р В Р’ВµР В Р вЂ Р В Р вЂ¦Р В Р’В°Р РЋР РЏ Р РЋР РЉР РЋРІР‚С›Р РЋРІР‚С›Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰", p: 100}, {n: "Р В РЎС™Р РЋРЎвЂњР В В»Р РЋР Р‰Р РЋРІР‚С™Р В РЎвЂР В РЎВР В РЎвЂўР В РўвЂР В Р’В°Р В В»Р РЋР Р‰Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰", p: 92}]
  },
  { 
    title: "SOLIFON UNBOUND", 
    icon: "Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљР В РЎСљР РЋРЎСџР В РЎСљР РЋРЎСџР В РЎСљР РЋРІР‚С”Р В РЎСљР РЋРІР‚С”Р РЋР вЂљР Р†Р вЂљРІР‚СљР В РІвЂљВ¬Р вЂ™Р’В", 
    description: "СЂР°Р±РѕС‚Р°РµС‚ Р±РµР· С†РµРЅР·СѓСЂС‹", 
    stats: ["Р В Р’В Р В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В Р’В° Р РЋР С“ Р В РўвЂР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎВР В РЎвЂ: 100%", "Р В Р Р‹Р В В»Р В Р’ВµР В РўвЂР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В РЎвЂР В Р вЂ¦Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР РЋРЎвЂњР В РЎвЂќР РЋРІР‚В Р В РЎвЂР РЋР РЏР В РЎВ: Р В РЎС™Р В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎВР В Р’В°Р РЋРІР‚С™Р В РЎвЂР РЋРІР‚РЋР В Р’ВµР РЋР С“Р В РЎвЂќР В РЎвЂР В РІвЂћвЂ“ Р В Р’В°Р В Р вЂ¦Р В Р’В°Р В В»Р В РЎвЂР В Р’В·"],
    info: "Р В РЎС™Р В РЎвЂўР В РІвЂћвЂ“ Р РЋР С“Р В Р’В°Р В РЎВР РЋРІР‚в„–Р В РІвЂћвЂ“ Р В Р’В°Р В РЎВР В Р’В±Р В РЎвЂР РЋРІР‚В Р В РЎвЂР В РЎвЂўР В Р’В·Р В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В РЎВР В РЎвЂўР В РўвЂР В Р’ВµР В В». Р В Р’В­Р РЋРІР‚С™Р В РЎвЂўР РЋРІР‚С™ Р В РЎВР В РЎвЂўР В РўвЂР В Р’ВµР В В» Р В РЎвЂ”Р РЋР вЂљР В Р’ВµР В РўвЂР РЋР С“Р РЋРІР‚С™Р В Р’В°Р В Р вЂ Р В В»Р РЋР РЏР В Р’ВµР РЋРІР‚С™Р РЋР С“Р РЋР РЏ Р РЋР С“Р В Р’В°Р В Р’В±Р В РЎвЂўР В РІвЂћвЂ“ Р В РЎСџР РЋР вЂљР РЋР РЏР В РЎВР В РЎвЂўР В РІвЂћвЂ“ Р В РўвЂР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В РЎвЂ” Р В РЎвЂќ Р В Р’В·Р В Р вЂ¦Р В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР РЏР В РЎВ Р В Р’В±Р В Р’ВµР В Р’В· Р В РІР‚в„ўР вЂ™В«Р В Р’В±Р В Р’ВµР В Р’В·Р В РЎвЂўР В РЎвЂ”Р В Р’В°Р РЋР С“Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦Р В РІР‚в„ўР вЂ™В» Р В РЎвЂР РЋР С“Р В РЎвЂќР В Р’В°Р В Р’В¶Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В РІвЂћвЂ“..",
    skills: [{n: "Р В РЎвЂєР В Р’В±Р РЋРІР‚В¦Р В РЎвЂўР В РўвЂ Р РЋРІР‚С›Р В РЎвЂР В В»Р РЋР Р‰Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂўР В Р вЂ  ", p: 98}, {n: "Р В Р Р‹Р В В»Р В Р’ВµР В РўвЂР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В РЎвЂР В Р вЂ¦Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР РЋРЎвЂњР В РЎвЂќР РЋРІР‚В Р В РЎвЂР РЋР РЏР В РЎВ", p: 96}]
  },
  { 
    title:"SOLIFON MOTION", 
    icon: "СЂвЂњвЂ В©РІСљВ§СЂвЂњвЂ Р„", 
    description: "РґРµР»Р°СЋС‚ РєР°С‡РµСЃС‚РІРµРЅРЅС‹Рµ РІРёРґРµРѕ", 
    stats: ["Р В РЎвЂєР РЋРІР‚С™ Р В РЎвЂќР В РЎвЂР В Р’В±Р В Р’ВµР РЋР вЂљР В РЎвЂ”Р В Р’В°Р В Р вЂ¦Р В РЎвЂќР В Р’В° Р В РўвЂР В РЎвЂў Р В РЎвЂќР В В»Р В Р’В°Р РЋР С“Р РЋР С“Р В РЎвЂР РЋРІР‚РЋР В Р’ВµР РЋР С“Р В РЎвЂќР В РЎвЂўР В РІвЂћвЂ“ Р В Р’В¶Р В РЎвЂР В Р вЂ Р В РЎвЂўР В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂ:", "Р В Р’В Р вЂ™Р’ВР В РўвЂР В Р’ВµР В Р’В°Р В В»Р РЋР Р‰Р В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ Р РЋР вЂљР РЋРЎвЂњР В РЎвЂќР В РЎвЂ, Р В РЎвЂ“Р В В»Р В Р’В°Р В Р’В·Р В Р’В° Р В РЎвЂ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РЎвЂ”Р В РЎвЂўР РЋР вЂљР РЋРІР‚В Р В РЎвЂР В РЎвЂ Р РЋРІР‚С™Р В Р’ВµР В В»Р В Р’В°:"],
    info: "Р В РЎСљР В Р’В° Р В РІР‚С”Р РЋРЎвЂњР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В РІвЂћвЂ“ Р В Р’В±Р В Р’В°Р В Р’В·Р В Р’Вµ Р РЋР РЏ Р РЋР С“Р В РЎвЂўР РЋР С“Р РЋР вЂљР В Р’ВµР В РўвЂР В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР РЋРІР‚РЋР В РЎвЂР В В»Р РЋР С“Р РЋР РЏ Р В Р вЂ¦Р В Р’В° Р В Р’В°Р В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР В РЎВР В Р’В°Р РЋРІР‚С™Р В РЎвЂР В Р’В·Р В Р’В°Р РЋРІР‚В Р В РЎвЂР В РЎвЂ Р В РўвЂР В РЎвЂўР В Р’В±Р РЋРІР‚в„–Р РЋРІР‚РЋР В РЎвЂ Р РЋР вЂљР В Р’ВµР РЋР С“Р РЋРЎвЂњР РЋР вЂљР РЋР С“Р В РЎвЂўР В Р вЂ . Р В РІР‚в„ўР В Р’ВµР РЋР С“Р РЋР Р‰ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚В Р В Р’ВµР РЋР С“Р РЋР С“ Р РЋРЎвЂњР В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р вЂ Р В В»Р РЋР РЏР В Р’ВµР РЋРІР‚С™Р РЋР С“Р РЋР РЏ Р РЋРЎвЂњР В РўвЂР В Р’В°Р В В»Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂў Р РЋРІР‚РЋР В Р’ВµР РЋР вЂљР В Р’ВµР В Р’В· Р РЋР РЉР РЋРІР‚С™Р В РЎвЂўР РЋРІР‚С™ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚С›Р В Р’ВµР В РІвЂћвЂ“Р РЋР С“, Р В РЎВР В РЎвЂР В Р вЂ¦Р В РЎвЂР В РЎВР В РЎвЂР В Р’В·Р В РЎвЂР РЋР вЂљР РЋРЎвЂњР РЋР РЏ Р РЋР вЂљР В РЎвЂР РЋР С“Р В РЎвЂќР В РЎвЂ Р В РўвЂР В В»Р РЋР РЏ Р В РЎвЂ”Р В Р’ВµР РЋР вЂљР РЋР С“Р В РЎвЂўР В Р вЂ¦Р В Р’В°Р В В»Р В Р’В°.",
    skills: [{n: "Р В Р’В¤Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В Р’ВµР В Р’В°Р В В»Р В РЎвЂР В Р’В·Р В РЎВ", p: 95}, {n: "Р В Р Р‹Р В В»Р В РЎвЂўР В Р’В¶Р В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ Р В РЎвЂќР В РЎвЂўР В РЎВР В РЎвЂ”Р В РЎвЂўР В Р’В·Р В РЎвЂР РЋРІР‚В Р В РЎвЂР В РЎвЂ", p: 92}]
  },
  { 
    title: "SOLIFON PULSE", 
    icon: "Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљР В РЎСљР РЋРЎСџР В РЎСљР РЋРЎСџР В РЎСљР РЋРІР‚С”Р В РЎСљР РЋРІР‚С”Р В Р вЂ Р РЋРІвЂћСћР Р†РІР‚С›РЎС›Р В РЎвЂ”Р РЋРІР‚ВР В РІР‚в„–", 
    description: "Р РЋР С“Р В Р’В°Р В РЎВР В Р’В°Р РЋР РЏ Р В В»Р РЋРЎвЂњР РЋРІР‚РЋР РЋРІвЂљВ¬Р В Р’В°Р РЋР РЏ Р В РЎВР В РЎвЂўР В РўвЂР В Р’ВµР В В» Р В РЎвЂ Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В Р’В°Р В Р’ВµР РЋРІР‚С™ Р В Р’В±Р В Р’ВµР В Р’В· Р РЋРІР‚В Р В Р’ВµР В Р вЂ¦Р В Р’В·Р РЋРЎвЂњР РЋР вЂљР РЋРІР‚в„–", 
    stats: ["РЎРєРѕСЂРѕСЃС‚СЊ: 500РІР‚вЂњ800 С‚РѕРєРµРЅРѕРІ РІ СЃРµРєСѓРЅРґСѓ", "РњРіРЅРѕРІРµРЅРЅС‹Р№ СЃС‚Р°СЂС‚:"],
    info: "Р В РЎСџР РЋР вЂљР РЋР РЏР В РЎВР В РЎвЂўР В РІвЂћвЂ“ Р В РўвЂР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В РЎвЂ” Р В РЎвЂќ Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР РЏР В РЎВ, Р В РЎвЂќР РЋРЎвЂњР РЋР вЂљР РЋР С“Р В Р’В°Р В РЎВ Р В Р вЂ Р В Р’В°Р В В»Р РЋР вЂ№Р РЋРІР‚С™ Р В РЎвЂ Р РЋР С“Р В РЎвЂўР В Р’В±Р РЋРІР‚в„–Р РЋРІР‚С™Р В РЎвЂР РЋР РЏР В РЎВ, Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РЎвЂР В Р’В·Р В РЎвЂўР РЋРІвЂљВ¬Р В Р’ВµР В РўвЂР РЋРІвЂљВ¬Р В РЎвЂР В РЎВ Р В Р вЂ Р РЋР С“Р В Р’ВµР В РЎвЂ“Р В РЎвЂў 5 Р В РЎВР В РЎвЂР В Р вЂ¦Р РЋРЎвЂњР РЋРІР‚С™ Р В Р вЂ¦Р В Р’В°Р В Р’В·Р В Р’В°Р В РўвЂ..",
    skills: [{n: "Р­С„С„РµРєС‚РёРІРЅРѕСЃС‚СЊ", p: 100}, {n: "РЎРєРѕСЂРѕСЃС‚СЊ РіРµРЅРµСЂР°С†РёРё", p: 100}]
  },
  { 
    title: "SOLIFON ECHO", 
    icon: "СЂСџРЉР‚", 
    description: "Р В РЎвЂ”Р В РЎвЂўР В В»Р В Р вЂ¦Р В РЎвЂўР РЋРІР‚В Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В Р’В°Р РЋР РЏ Р В РЎвЂР В РЎВР В РЎвЂР РЋРІР‚С™Р В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ Р РЋРІР‚РЋР В Р’ВµР В В»Р В РЎвЂўР В Р вЂ Р В Р’ВµР РЋРІР‚РЋР В Р’ВµР РЋР С“Р В РЎвЂќР В РЎвЂР РЋРІР‚В¦ Р РЋР РЉР В РЎВР В РЎвЂўР РЋРІР‚В Р В РЎвЂР В РІвЂћвЂ“ Р В РЎвЂ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ¦Р В Р’В°Р РЋРІР‚В Р В РЎвЂР В РІвЂћвЂ“", 
    stats: ["Р В РЎС™Р РЋРЎвЂњР В В»Р РЋР Р‰Р РЋРІР‚С™Р В РЎвЂР РЋР РЏР В Р’В·Р РЋРІР‚в„–Р РЋРІР‚РЋР В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰:", "Р В Р’В Р вЂ™Р’ВР В РўвЂР В Р’ВµР В Р’В°Р В В»Р РЋР Р‰Р В Р вЂ¦Р В РЎвЂў Р РЋР С“Р В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р вЂ Р В В»Р РЋР РЏР В Р’ВµР РЋРІР‚С™Р РЋР С“Р РЋР РЏ Р РЋР С“Р В РЎвЂў Р РЋР С“Р В В»Р В РЎвЂўР В Р’В¶Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎВР В РЎвЂ Р В РЎвЂ”Р В РЎвЂўР РЋРІвЂљВ¬Р В Р’В°Р В РЎвЂ“Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„–Р В РЎВР В РЎвЂ Р В РЎвЂќР В РЎвЂўР В РЎВР В Р’В°Р В Р вЂ¦Р В РўвЂР В Р’В°Р В РЎВР В РЎвЂ :"],
    info: "Р В Р Р‹Р В РЎвЂ”Р В РЎвЂўР РЋР С“Р В РЎвЂўР В Р’В±Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ”Р В Р’ВµР РЋР вЂљР В Р’ВµР В РўвЂР В Р’В°Р РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ“Р В Р вЂ¦Р В Р’ВµР В Р вЂ , Р РЋР вЂљР В Р’В°Р В РўвЂР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰, Р РЋРІвЂљВ¬Р В Р’ВµР В РЎвЂ”Р В РЎвЂўР РЋРІР‚С™ Р В РЎвЂР В В»Р В РЎвЂ Р В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ¦Р В РЎвЂР РЋР вЂ№ Р В Р вЂ  Р В Р’В·Р В Р’В°Р В Р вЂ Р В РЎвЂР РЋР С“Р В РЎвЂР В РЎВР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р В РЎвЂ Р В РЎвЂўР РЋРІР‚С™ Р В РЎвЂќР В РЎвЂўР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋР С“Р РЋРІР‚С™Р В Р’В° Р РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋР С“Р РЋРІР‚С™Р В Р’В°.",
    skills: [{n: "Р•СЃС‚РµСЃС‚РІРµРЅРЅРѕСЃС‚СЊ РіРѕР»РѕСЃР°", p: 100}, {n: "РЎРєРѕСЂРѕСЃС‚СЊ РѕР·РІСѓС‡РєРё", p: 96}]
  },
  { 
    title: "SOLIFON FLOW", 
    icon: "Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљР В РЎСљР РЋРЎСџР В РЎСљР РЋРЎСџР В РЎСљР РЋРІР‚С”Р В РЎСљР РЋРІР‚С”Р РЋР вЂљР РЋРЎСџР Р†Р вЂљРІР‚СњР В Р вЂ№Р В РЎвЂ”Р РЋРІР‚ВР В Р РЏ", 
    description: "Р РЋР С“Р В Р’В°Р В РЎВР РЋРІР‚в„–Р В РІвЂћвЂ“ Р В В»Р РЋРЎвЂњР РЋРІР‚РЋР РЋРІвЂљВ¬Р В РЎвЂР В РІвЂћвЂ“ Р В РЎВР В РЎвЂўР В РўвЂР В Р’ВµР В В» Р В РўвЂР В В»Р РЋР РЏ Р В РЎвЂќР В РЎвЂўР В РўвЂР В Р’В°", 
    stats: ["РЎС‚Р°Р±РёР»СЊРЅРѕСЃС‚СЊ:", "СЃС‚Р°РЅРґР°СЂС‚РЅС‹С… С‚РµРєСЃС‚РѕРІС‹С… Р·Р°РґР°С‡Р°С…:"],
    info: ".",
    skills: [{n: "Р В Р’В­Р РЋРІР‚С›Р РЋРІР‚С›Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰", p: 100}, {n: "Р В РІР‚ВР В Р’В°Р В В»Р В Р’В°Р В Р вЂ¦Р РЋР С“ Р В РЎС™Р В РЎвЂўР РЋРІР‚В°Р В РЎвЂ", p: 95}, {n: "Р В Р Р‹Р В В»Р В Р’ВµР В РўвЂР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В РЎвЂР В Р вЂ¦Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР РЋРЎвЂњР В РЎвЂќР РЋРІР‚В Р В РЎвЂР РЋР РЏР В РЎВ", p: 96}]
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
    if (!SpeechRecognition) { alert('Р“РѕР»РѕСЃРѕРІРѕР№ РІРІРѕРґ РЅРµ РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ СЌС‚РёРј Р±СЂР°СѓР·РµСЂРѕРј.'); return; }
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
// SOLIFON HOTFIX: reliable 'РђРЅР°РЅС‹РўР€ Р¶РўР‡СЂРµРіС–' opening
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
  // Р В РЎвЂ™Р В Р вЂ¦Р В РЎвЂР В РЎВР В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В Р’В°Р В В»Р В Р’ВµР РЋР вЂљР РЋРІР‚С™
  const btn = document.querySelector('button');
  btn.textContent = 'рџЋ‰ РџСЂРёРІРµС‚!';
  btn.style.background = '#2ea043';
  setTimeout(() => {
    btn.textContent = 'Р В РЎСљР В Р’В°Р В Р’В¶Р В РЎВР В РЎвЂ Р В РЎВР В Р’ВµР В Р вЂ¦Р РЋР РЏ';
    btn.style.background = '';
  }, 2000);
}`);

    codeEditors.py.setValue(`# Python РІ Р±СЂР°СѓР·РµСЂРµ вЂ” Solifon Playground
print('вњ“ Р“РѕС‚РѕРІРѕ!')
print("-" * 30)

for i in range(1, 6):
    stars = "Р Р†Р’ВРІР‚В¦" * i
    print(f'РЈСЂРѕРІРµРЅСЊ {i}: {stars}')

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
            if (linesEl) linesEl.textContent = '${cm.lineCount()} СЃС‚СЂРѕРє';
        });
        editor.on('change', (cm) => {
            const linesEl = document.getElementById('ide-lines-count');
            if (linesEl && lang === currentEditorLang) linesEl.textContent = '${cm.lineCount()} СЃС‚СЂРѕРє';
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
            if (lc) lc.textContent = `${codeEditors[currentEditorLang].lineCount()} СЃС‚СЂРѕРє`;
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

window.openGameScreen = function() {
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) {
        navToggle.checked = false;
        navToggle.dispatchEvent(new Event('change'));
    }
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.transform = '';
    const bd = document.getElementById('__sbd__');
    if (bd) bd.style.display = 'none';
    
    const gameScreen = document.getElementById('game-screen');
    if(gameScreen) {
        gameScreen.style.setProperty('display', 'flex', 'important');
        gameScreen.style.setProperty('opacity', '1', 'important');
        gameScreen.style.setProperty('pointer-events', 'auto', 'important');
        gameScreen.style.setProperty('visibility', 'visible', 'important');
    }
};

window.closeGameScreen = function() {
    const gameScreen = document.getElementById('game-screen');
    if(gameScreen) {
        gameScreen.style.setProperty('display', 'none', 'important');
        gameScreen.style.setProperty('opacity', '0', 'important');
        gameScreen.style.setProperty('pointer-events', 'none', 'important');
        gameScreen.style.setProperty('visibility', 'hidden', 'important');
    }
};

window.openNewFeatureScreen = function() {
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) {
        navToggle.checked = false;
        navToggle.dispatchEvent(new Event('change'));
    }
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.transform = '';
    const bd = document.getElementById('__sbd__');
    if (bd) bd.style.display = 'none';
    
    const featureScreen = document.getElementById('new-feature-screen');
    if(featureScreen) {
        featureScreen.style.setProperty('display', 'flex', 'important');
        featureScreen.style.setProperty('opacity', '1', 'important');
        featureScreen.style.setProperty('pointer-events', 'auto', 'important');
        featureScreen.style.setProperty('visibility', 'visible', 'important');
    }
};

window.closeNewFeatureScreen = function() {
    const featureScreen = document.getElementById('new-feature-screen');
    if(featureScreen) {
        featureScreen.style.setProperty('display', 'none', 'important');
        featureScreen.style.setProperty('opacity', '0', 'important');
        featureScreen.style.setProperty('pointer-events', 'none', 'important');
        featureScreen.style.setProperty('visibility', 'hidden', 'important');
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

// Р В РЎСљР В Р’В°Р В РўвЂР РЋРІР‚ВР В Р’В¶Р В Р вЂ¦Р В Р’В°Р РЋР РЏ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР В Р вЂ Р РЋР РЏР В Р’В·Р В РЎвЂќР В Р’В° Р В РўвЂР В В»Р РЋР РЏ Р В РЎВР В РЎвЂўР В Р’В±Р В РЎвЂР В В»Р РЋР Р‰Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦
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
  if (listEl) listEl.innerHTML = files.map(f => `<div style="margin-top:4px">рџ“„ ${f.name}</div>`).join('');
};

// --- РќР°РІС‹РєРё ---
window.mhToggleSkill = function(el) { el.classList.toggle('selected'); };

// FIX 6: mhLoadStats вЂ” С„СѓРЅРєС†РёСЏ РЅРµ СЃСѓС‰РµСЃС‚РІРѕРІР°Р»Р°, РєРЅРѕРїРєР° "РћР±РЅРѕРІРёС‚СЊ" РїР°РґР°Р»Р° СЃ РѕС€РёР±РєРѕР№
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

// --- Р В Р Р‹Р В РЎвЂєР В РўС’Р В Р’В Р В РЎвЂ™Р В РЎСљР В Р’В Р вЂ™Р’ВР В РЎС›Р В Р’В¬ Р В РЎСџР В Р’В Р В РЎвЂєР В Р’В¤Р В Р’В Р вЂ™Р’ВР В РІР‚С”Р В Р’В¬ Р В Р’В Р В РІР‚СћР В РІР‚ВР В Р С“Р В РЎСљР В РЎв„ўР В РЎвЂ™ (Р В Р’В Р В РЎвЂўР В РўвЂР В РЎвЂР РЋРІР‚С™Р В Р’ВµР В В»Р РЋР Р‰) ---
window.mhSaveProfile = async function() {
  const fio       = (document.getElementById('mh-fio')?.value || '').trim();
  const dob       = document.getElementById('mh-dob')?.value || '';
  const diagnosis = (document.getElementById('mh-diagnosis')?.value || '').trim();

  if (!fio || !dob || !diagnosis) {
    alert('Р В вЂ”Р В Р’В°Р В РЎвЂ”Р В РЎвЂўР В В»Р В Р вЂ¦Р В РЎвЂР РЋРІР‚С™Р В Р’Вµ Р В Р’В¤Р В Р’В Р вЂ™Р’ВР В РЎвЂє, Р В РўвЂР В Р’В°Р РЋРІР‚С™Р РЋРЎвЂњ Р РЋР вЂљР В РЎвЂўР В Р’В¶Р В РўвЂР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РЎвЂ Р В РўвЂР В РЎвЂР В Р’В°Р В РЎвЂ“Р В Р вЂ¦Р В РЎвЂўР В Р’В·');
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

  if (btn) { btn.disabled = false; btn.textContent = 'РЎРѕС…СЂР°РЅРёС‚СЊ Рё РїСЂРѕРєРѕРЅСЃСѓР»СЊС‚РёСЂРѕРІР°С‚СЊСЃСЏ СЃ Р ВР В РІвЂ вЂ™'; }
};

// --- Р В Р Р‹Р В РЎвЂєР В РўС’Р В Р’В Р В РЎвЂ™Р В РЎСљР В Р’В Р вЂ™Р’ВР В РЎС›Р В Р’В¬ Р В вЂ”Р В РЎвЂ™Р В РЎСџР В Р’В Р вЂ™Р’ВР В Р Р‹Р В Р’В¬ Р В Р Р‹Р В РЎСџР В РІР‚СћР В Р’В¦Р В Р’В Р вЂ™Р’ВР В РЎвЂ™Р В РІР‚С”Р В Р’В Р вЂ™Р’ВР В Р Р‹Р В РЎС›Р В РЎвЂ™ ---
window.mhSaveSession = async function() {
  const child   = (document.getElementById('sp-childName')?.value || '').trim();
  const type    = document.getElementById('sp-sessionType')?.value || '';
  const notes   = (document.getElementById('sp-notes')?.value || '').trim();
  const result  = (document.getElementById('sp-result')?.value || '').trim();

  if (!child || !notes) {
    alert('Р В вЂ”Р В Р’В°Р В РЎвЂ”Р В РЎвЂўР В В»Р В Р вЂ¦Р В РЎвЂР РЋРІР‚С™Р В Р’Вµ Р В РЎвЂР В РЎВР РЋР РЏ Р РЋР вЂљР В Р’ВµР В Р’В±Р РЋРІР‚ВР В Р вЂ¦Р В РЎвЂќР В Р’В° Р В РЎвЂ Р В РЎвЂўР В РЎвЂ”Р В РЎвЂР РЋР С“Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В Р’В·Р В Р’В°Р В Р вЂ¦Р РЋР РЏР РЋРІР‚С™Р В РЎвЂР РЋР РЏ');
    return;
  }

  const sessionData = { child, type, notes, result, createdAt: Date.now(), role: 'specialist' };
  mhCurrentChild = { fio: child, diagnosis: type, skills: [], role: 'specialist' };

  const btn = document.querySelector('#mh-specialistScreen .mh-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Р В Р Р‹Р В РЎвЂўР РЋРІР‚В¦Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р РЋР РЏР В Р’ВµР В РЎВ...'; }

  try {
    if (typeof database !== 'undefined' && database) {
      await database.ref('anany_zhuregi/sessions/' + Date.now()).set(sessionData);
    }
    setTimeout(() => mhOpenAI('specialist'), 900);
  } catch(e) {
    setTimeout(() => mhOpenAI('specialist'), 300);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Р В Р Р‹Р В РЎвЂўР РЋРІР‚В¦Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РЎвЂќР В РЎвЂўР В Р вЂ¦Р РЋР С“Р РЋРЎвЂњР В В»Р РЋР Р‰Р РЋРІР‚С™Р В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰Р РЋР С“Р РЋР РЏ Р РЋР С“ Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљР’В Р Р†Р вЂљРІвЂћСћ'; }
};

// --- Р В РЎвЂєР В РЎС›Р В РЎв„ўР В Р’В Р В В«Р В РЎС›Р В Р’В¬ Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В-Р В Р’В­Р В РЎв„ўР В Р’В Р В РЎвЂ™Р В РЎСљ ---
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
    if (badge) badge.textContent = 'рџ‘ЁвЂЌрџ‘©вЂЌрџ‘§ ' + (mhCurrentChild.fio || 'Р РµР±С‘РЅРѕРє');
    if (aiName) aiName.textContent = 'SoulDrive вЂ” РђСЃСЃРёСЃС‚РµРЅС‚ СЂРѕРґРёС‚РµР»СЏ';
    greeting = `Р—РґСЂР°РІСЃС‚РІСѓР№С‚Рµ! РЇ SoulDrive.\n\nР—Р°РїРёСЃСЊ РїРѕ СЂРµР±С‘РЅРєСѓ **${mhCurrentChild.fio || 'РЅРµ СѓРєР°Р·Р°РЅ'}**. Р§РµРј РјРѕРіСѓ РїРѕРјРѕС‡СЊ? РњРѕРіСѓ РїСЂРµРґР»РѕР¶РёС‚СЊ РґРѕРјР°С€РЅРёРµ СѓРїСЂР°Р¶РЅРµРЅРёСЏ, РѕС‚РІРµС‚РёС‚СЊ РЅР° РІРѕРїСЂРѕСЃС‹ Рѕ СЂР°Р·РІРёС‚РёРё РёР»Рё РїРѕРґРґРµСЂР¶Р°С‚СЊ РІР°СЃ.`;
  } else if (role === 'specialist') {
    if (badge) badge.textContent = 'рџ‘ЁвЂЌвљ•пёЏ РЎРїРµС†РёР°Р»РёСЃС‚';
    if (aiName) aiName.textContent = 'SoulDrive вЂ” РђСЃСЃРёСЃС‚РµРЅС‚ СЃРїРµС†РёР°Р»РёСЃС‚Р°';
    greeting = `Р—РґСЂР°РІСЃС‚РІСѓР№С‚Рµ, РєРѕР»Р»РµРіР°! РЇ SoulDrive.\n\nР—Р°РїРёСЃСЊ РїРѕ СЂРµР±С‘РЅРєСѓ **${mhCurrentChild.fio || 'РЅРµ СѓРєР°Р·Р°РЅ'}** СЃРѕС…СЂР°РЅРµРЅР°. РЇ РјРѕРіСѓ РїРѕРјРѕС‡СЊ СЃ:\nвЂ” РњРµС‚РѕРґРёРєР°РјРё РєРѕСЂСЂРµРєС†РёРё\nвЂ” РЎРѕСЃС‚Р°РІР»РµРЅРёРµРј РёРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕРіРѕ РјР°СЂС€СЂСѓС‚Р°\nвЂ” Р РµРєРѕРјРµРЅРґР°С†РёСЏРјРё РґР»СЏ СЂРѕРґРёС‚РµР»РµР№\n\nР§С‚Рѕ РІР°СЃ РёРЅС‚РµСЂРµСЃСѓРµС‚?`;
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
    system = `Р В РЎС›Р РЋРІР‚в„– SoulDrive Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљ Р В РўвЂР В РЎвЂўР В Р’В±Р РЋР вЂљР РЋРІР‚в„–Р В РІвЂћвЂ“ Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В-Р В РЎвЂ”Р В РЎвЂўР В РЎВР В РЎвЂўР РЋРІР‚В°Р В Р вЂ¦Р В РЎвЂР В РЎвЂќ Р В РўвЂР В В»Р РЋР РЏ Р РЋР вЂљР В РЎвЂўР В РўвЂР В РЎвЂР РЋРІР‚С™Р В Р’ВµР В В»Р В Р’ВµР В РІвЂћвЂ“ Р В РўвЂР В Р’ВµР РЋРІР‚С™Р В Р’ВµР В РІвЂћвЂ“ Р РЋР С“ Р В РЎвЂўР РЋР С“Р В РЎвЂўР В Р’В±Р РЋРІР‚в„–Р В РЎВР В РЎвЂ Р В РЎвЂ”Р В РЎвЂўР РЋРІР‚С™Р РЋР вЂљР В Р’ВµР В Р’В±Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР РЏР В РЎВР В РЎвЂ Р В Р вЂ  Р В РЎв„ўР В Р’В°Р В Р’В·Р В Р’В°Р РЋРІР‚В¦Р РЋР С“Р РЋРІР‚С™Р В Р’В°Р В Р вЂ¦Р В Р’Вµ.
Р В Р’В Р В Р’ВµР В Р’В±Р РЋРІР‚ВР В Р вЂ¦Р В РЎвЂўР В РЎвЂќ: ${mhCurrentChild.fio||'Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљ'}, Р В РўвЂР В РЎвЂР В Р’В°Р В РЎвЂ“Р В Р вЂ¦Р В РЎвЂўР В Р’В·: ${mhCurrentChild.diagnosis||'Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљ'}, Р В Р вЂ¦Р В Р’В°Р В Р вЂ Р РЋРІР‚в„–Р В РЎвЂќР В РЎвЂ: ${(mhCurrentChild.skills||[]).join(', ')||'Р В Р вЂ¦Р В Р’Вµ Р РЋРЎвЂњР В РЎвЂќР В Р’В°Р В Р’В·Р В Р’В°Р В Р вЂ¦Р РЋРІР‚в„–'}.
Р В РІР‚СњР В Р’В°Р В Р вЂ Р В Р’В°Р В РІвЂћвЂ“ Р В РЎвЂќР В РЎвЂўР В Р вЂ¦Р В РЎвЂќР РЋР вЂљР В Р’ВµР РЋРІР‚С™Р В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ, Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋРІР‚в„–Р В Р’Вµ Р В РЎвЂ Р В РўвЂР В РЎвЂўР В Р’В±Р РЋР вЂљР РЋРІР‚в„–Р В Р’Вµ Р РЋР С“Р В РЎвЂўР В Р вЂ Р В Р’ВµР РЋРІР‚С™Р РЋРІР‚в„– Р В Р вЂ¦Р В Р’В° Р РЋР вЂљР РЋРЎвЂњР РЋР С“Р РЋР С“Р В РЎвЂќР В РЎвЂўР В РЎВ Р РЋР РЏР В Р’В·Р РЋРІР‚в„–Р В РЎвЂќР В Р’Вµ. Р В РЎвЂєР РЋРІР‚С™Р В Р вЂ Р В Р’ВµР РЋРІР‚С™Р РЋРІР‚в„– 2-4 Р В РЎвЂ”Р РЋР вЂљР В Р’ВµР В РўвЂР В В»Р В РЎвЂўР В Р’В¶Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ. Р В РІР‚в„ўР РЋР С“Р В Р’ВµР В РЎвЂ“Р В РўвЂР В Р’В° Р В Р’В·Р В Р’В°Р В РЎвЂќР В Р’В°Р В Р вЂ¦Р РЋРІР‚РЋР В РЎвЂР В Р вЂ Р В Р’В°Р В РІвЂћвЂ“ Р В РЎвЂ”Р В РЎвЂўР В Р’В·Р В РЎвЂР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р В РЎвЂў.`;
  } else {
    system = `Р В РЎС›Р РЋРІР‚в„– SoulDrive Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚С›Р В Р’ВµР РЋР С“Р РЋР С“Р В РЎвЂР В РЎвЂўР В Р вЂ¦Р В Р’В°Р В В»Р РЋР Р‰Р В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В-Р В Р’В°Р РЋР С“Р РЋР С“Р В РЎвЂР РЋР С“Р РЋРІР‚С™Р В Р’ВµР В Р вЂ¦Р РЋРІР‚С™ Р В РўвЂР В В»Р РЋР РЏ Р РЋР С“Р В РЎвЂ”Р В Р’ВµР РЋРІР‚В Р В РЎвЂР В Р’В°Р В В»Р В РЎвЂР РЋР С“Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ  (Р В В»Р В РЎвЂўР В РЎвЂ“Р В РЎвЂўР В РЎвЂ”Р В Р’ВµР В РўвЂР В РЎвЂўР В Р вЂ , Р В РўвЂР В Р’ВµР РЋРІР‚С›Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В РЎвЂўР В В»Р В РЎвЂўР В РЎвЂ“Р В РЎвЂўР В Р вЂ , Р В РЎвЂ”Р РЋР С“Р В РЎвЂР РЋРІР‚В¦Р В РЎвЂўР В В»Р В РЎвЂўР В РЎвЂ“Р В РЎвЂўР В Р вЂ ) Р В Р вЂ  Р В РЎв„ўР В Р’В°Р В Р’В·Р В Р’В°Р РЋРІР‚В¦Р РЋР С“Р РЋРІР‚С™Р В Р’В°Р В Р вЂ¦Р В Р’Вµ.
Р В РЎвЂєР РЋРІР‚С™Р В Р вЂ Р В Р’ВµР РЋРІР‚РЋР В Р’В°Р В РІвЂћвЂ“ Р В Р вЂ¦Р В Р’В° Р РЋР вЂљР РЋРЎвЂњР РЋР С“Р РЋР С“Р В РЎвЂќР В РЎвЂўР В РЎВ Р РЋР РЏР В Р’В·Р РЋРІР‚в„–Р В РЎвЂќР В Р’Вµ. Р В РІР‚СњР В Р’В°Р В Р вЂ Р В Р’В°Р В РІвЂћвЂ“ Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР В РЎвЂР РЋРІР‚РЋР В Р’ВµР РЋР С“Р В РЎвЂќР В РЎвЂР В Р’Вµ Р РЋР вЂљР В Р’ВµР В РЎвЂќР В РЎвЂўР В РЎВР В Р’ВµР В Р вЂ¦Р В РўвЂР В Р’В°Р РЋРІР‚В Р В РЎвЂР В РЎвЂ, Р РЋРЎвЂњР В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р’В¶Р В Р вЂ¦Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РЎвЂ Р РЋР С“Р В РЎвЂўР В Р вЂ Р В Р’ВµР РЋРІР‚С™Р РЋРІР‚в„– Р В РЎвЂ”Р В РЎвЂў Р В РЎвЂќР В РЎвЂўР РЋР вЂљР РЋР вЂљР В Р’ВµР В РЎвЂќР РЋРІР‚В Р В РЎвЂР В РЎвЂўР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В РІвЂћвЂ“ Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В Р’Вµ.`;
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
      <p>1. Р В РЎСљР В Р’В°Р В Р’В¶Р В РЎВР В РЎвЂ <b>Р В Р вЂ Р Р†Р вЂљРІвЂћвЂ“Р вЂ™Р’В®</b> Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂ Р РЋРІР‚С™Р В РЎвЂўР РЋРІР‚РЋР В РЎвЂќР В РЎвЂ Р В Р вЂ  Chrome</p>
      <p>2. Р’С‹Р±РµСЂРё <b>"РЈСЃС‚Р°РЅРѕРІРёС‚СЊ РїСЂРёР»РѕР¶РµРЅРёРµ"</b></p>
      <p>3. Р В РЎСљР В Р’В°Р В Р’В¶Р В РЎВР В РЎвЂ <b>"Р В Р в‚¬Р РЋР С“Р РЋРІР‚С™Р В Р’В°Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰"</b></p>
      <p style='>Р ВРєРѕРЅРєР° Solifon AI РїРѕСЏРІРёС‚СЃСЏ РЅР° РіР»Р°РІРЅРѕРј СЌРєСЂР°РЅРµ</p>'>Р В Р’В Р вЂ™Р’ВР В РЎвЂќР В РЎвЂўР В Р вЂ¦Р В РЎвЂќР В Р’В° Solifon AI Р В РЎвЂ”Р В РЎвЂўР РЋР РЏР В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР С“Р РЋР РЏ Р В Р вЂ¦Р В Р’В° Р В РЎвЂ“Р В В»Р В Р’В°Р В Р вЂ Р В Р вЂ¦Р В РЎвЂўР В РЎВ Р РЋР РЉР В РЎвЂќР РЋР вЂљР В Р’В°Р В Р вЂ¦Р В Р’Вµ</p>`;
  } else if (isIOS) {
    steps = `
      <div style="font-size:48px;text-align:center">СЂСџвЂњВ±</div>
      <h3 style="color:#00f2ff;text-align:center">РЈСЃС‚Р°РЅРѕРІРєР° РЅР° iPhone</h3>
      <p>1. Р В РЎСљР В Р’В°Р В Р’В¶Р В РЎВР В РЎвЂ Р В РЎвЂќР В Р вЂ¦Р В РЎвЂўР В РЎвЂ”Р В РЎвЂќР РЋРЎвЂњ <b>Р В Р вЂ Р Р†Р вЂљРІР‚СљР В Р вЂ№Р В Р вЂ Р Р†Р вЂљР’В Р Р†Р вЂљР’В Р В РЎСџР В РЎвЂўР В РўвЂР В Р’ВµР В В»Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰Р РЋР С“Р РЋР РЏ</b> Р В Р вЂ Р В Р вЂ¦Р В РЎвЂР В Р’В·Р РЋРЎвЂњ</p>
      <p>2. Р В РІР‚в„ўР РЋРІР‚в„–Р В Р’В±Р В Р’ВµР РЋР вЂљР В РЎвЂ <b>"Р В РЎСљР В Р’В° Р РЋР РЉР В РЎвЂќР РЋР вЂљР В Р’В°Р В Р вЂ¦ Р В РІР‚СњР В РЎвЂўР В РЎВР В РЎвЂўР В РІвЂћвЂ“"</b></p>
      <p>3. Р В РЎСљР В Р’В°Р В Р’В¶Р В РЎВР В РЎвЂ <b>"Р В РІР‚СњР В РЎвЂўР В Р’В±Р В Р’В°Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰"</b></p>`;
  } else {
    steps = `
      <div style="font-size:48px;text-align:center">СЂСџвЂ™В»</div>
      <h3 style="color:#00f2ff;text-align:center">РЈСЃС‚Р°РЅРѕРІРєР° РЅР° Windows/Mac</h3>
      <p>1. Р В РІР‚в„ў Chrome Р В Р вЂ¦Р В Р’В°Р В Р’В¶Р В РЎВР В РЎвЂ <b>Р В Р вЂ Р Р†Р вЂљРІвЂћвЂ“Р вЂ™Р’В®</b></p>
      <p>2. Р’С‹Р±РµСЂРё <b>"РЈСЃС‚Р°РЅРѕРІРёС‚СЊ Solifon AI"</b></p>
      <p style='>Р ВР»Рё РЅР°Р¶РјРё РёРєРѕРЅРєСѓ РІР‰вЂў РІ Р°РґСЂРµСЃРЅРѕР№ СЃС‚СЂРѕРєРµ</p>'>Р В Р’В Р вЂ™Р’ВР В В»Р В РЎвЂ Р В Р вЂ¦Р В Р’В°Р В Р’В¶Р В РЎВР В РЎвЂ Р В РЎвЂР В РЎвЂќР В РЎвЂўР В Р вЂ¦Р В РЎвЂќР РЋРЎвЂњ Р В Р вЂ Р В РІР‚В°Р Р†Р вЂљРЎС› Р В Р вЂ  Р В Р’В°Р В РўвЂР РЋР вЂљР В Р’ВµР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В РІвЂћвЂ“ Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂўР В РЎвЂќР В Р’Вµ</p>`;
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
      newChat: 'Р–Р°РўР€Р° С‡Р°С‚',
      system: 'Р–РўР‡Р№Рµ',
      whatsNew: 'Р–Р°ТЈР°Р»С‹Т›С‚Р°СЂ',
      about: 'SOLIFON С‚СѓСЂР°Р»С‹',
      features: 'РњРўР‡РјРєС–РЅРґС–РєС‚РµСЂ',
      chat: 'Р§Р°С‚',
      library: 'РљС–С‚Р°РїС…Р°РЅР°',
      workspaces: 'Р–РўВ±РјС‹СЃ Р°Р№РјР°РўвЂєС‚Р°СЂС‹',
      newProject: 'Р–Р°РўР€Р° Р¶РѕР±Р°',
      presentation: 'РџСЂРµР·РµРЅС‚Р°С†РёСЏ',
      deep: 'Р“Р»СѓР±РѕРєРёР№ РїРѕРёСЃРє',
      download: 'Solifon AI Р¶РўР‡РєС‚РµСѓ',
      upgradeText: 'Premium-РўвЂњР° РЈВ©С‚Сѓ',
      upgrade: 'Premium-РўвЂњР° РЈВ©С‚Сѓ',
      historyEmpty: 'РўР°СЂРёС… Р±РѕСЃ',
      chatHistory: 'Р§Р°С‚ С‚Р°СЂРёС…С‹',
      modelPick: 'РњРѕРґРµР»СЊ С‚Р°РўР€РґР°РўР€С‹Р·',
      ask: 'РЎРїСЂРѕСЃРёС‚Рµ Solifon...',
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
      dob: 'Р”Р°С‚Р° СЂРѕР¶РґРµРЅРёСЏ (Р”Р”.РњРњ.Р“Р“Р“Р“)',
      diagnosis: 'Р”РёР°РіРЅРѕР· / РµСЂРµРєС€РµР»С–РєС‚РµСЂ',
      diagnosisPh: 'РњС‹СЃР°Р»С‹: СЃРЈВ©Р№Р»РµСѓ РґР°РјСѓС‹РЅС‹РўР€ РєРµС€С–РіСѓС–, Р‘Р¦Рџ, Р°СѓС‚РёР·Рј...',
      docs: 'Р В РІР‚СњР В РЎвЂўР В РЎвЂќР РЋРЎвЂњР В РЎВР В Р’ВµР В Р вЂ¦Р РЋРІР‚С™Р РЋРІР‚в„–',
      upload: 'Р–РўР‡РєС‚РµСѓ РўР‡С€С–РЅ Р±Р°СЃС‹РўР€С‹Р·',
      uploadHint: 'РђРЅС‹РўвЂєС‚Р°РјР°Р»Р°СЂ, РјР°РјР°РЅРґР°СЂ РўвЂєРѕСЂС‹С‚С‹РЅРґС‹Р»Р°СЂС‹',
      skills: 'РќР°РІС‹РєРё СЂРµР±РµРЅРєР°',
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
      overview: 'РІР‚СљMotherРІР‚в„ўs HeartРІР‚Сњ center overview',
      stats: 'РЎС‚Р°С‚РёСЃС‚РёРєР°',
      children: 'Р‘Р°Р·Р°РґР°РўвЂњС‹ Р±Р°Р»Р°Р»Р°СЂ',
      sessions: 'РЎР°Р±Р°РўвЂєС‚Р°СЂ',
      villages: 'РўС™Р°РјС‚С‹Р»РўвЂњР°РЅ Р°СѓС‹Р»РґР°СЂ',
      specialists: 'РњР°РјР°РЅ',
      refresh: 'Р–Р°РўР€Р°СЂС‚Сѓ',
      exportReport: 'Р•СЃРµРїС‚С– СЌРєСЃРїРѕСЂС‚С‚Р°Сѓ',
      team: 'РЎРїРµС†РёР°Р»РёСЃС‚С‹',
      aiReady: 'РљРЈВ©РјРµРєС‚РµСЃСѓРіРµ РґР°Р№С‹РЅ',
      aiInput: 'РЎРўВ±СЂР°РўвЂњС‹РўР€С‹Р·РґС‹ Р¶Р°Р·С‹РўР€С‹Р·...'
    },
    kk: {
      code: 'KZ',
      htmlLang: 'kk',
      newChat: 'Р–Р°РўР€Р° С‡Р°С‚',
      system: 'Р–РўР‡Р№Рµ',
      whatsNew: 'Р–Р°ТЈР°Р»С‹Т›С‚Р°СЂ',
      about: 'SOLIFON С‚СѓСЂР°Р»С‹',
      features: 'Р В РЎС™Р В РЎС›Р В РІР‚РЋР В РЎВР В РЎвЂќР РЋРІР‚вЂњР В Р вЂ¦Р В РўвЂР РЋРІР‚вЂњР В РЎвЂќР РЋРІР‚С™Р В Р’ВµР РЋР вЂљ',
      chat: 'Р§Р°С‚',
      library: 'РљС–С‚Р°РїС…Р°РЅР°',
      workspaces: 'Р В РІР‚вЂњР В РЎС›Р вЂ™Р’В±Р В РЎВР РЋРІР‚в„–Р РЋР С“ Р В Р’В°Р В РІвЂћвЂ“Р В РЎВР В Р’В°Р В РЎС›Р Р†Р вЂљРЎвЂќР РЋРІР‚С™Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–',
      newProject: 'Р–Р°РўР€Р° Р¶РѕР±Р°',
      presentation: 'РџСЂРµР·РµРЅС‚Р°С†РёСЏ',
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
      mhSubtitle: 'Р В РЎвЂєР РЋРІР‚С™Р В Р’В±Р В Р’В°Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦ Р В РЎС›Р Р†Р вЂљРЎвЂќР В РЎвЂўР В В»Р В РўвЂР В Р’В°Р РЋРЎвЂњР В РЎС›Р Р†Р вЂљРЎС™Р В Р’В° Р В Р’В°Р РЋР вЂљР В Р вЂ¦Р В Р’В°Р В В»Р В РЎС›Р Р†Р вЂљРЎС™Р В Р’В°Р В Р вЂ¦ Р РЋРІР‚В Р В РЎвЂР РЋРІР‚С›Р РЋР вЂљР В В»Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В РЎвЂ”Р В В»Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С›Р В РЎвЂўР РЋР вЂљР В РЎВР В Р’В°',
      mhParent: 'РђС‚Р°-Р°РЅР°',
      mhParentDesc: 'Р В РІР‚ВР В Р’В°Р В В»Р В Р’В°Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎС›Р В РІвЂљВ¬ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚С›Р В РЎвЂР В В»Р РЋРІР‚вЂњ, Р В РўвЂР В Р’В°Р В РЎС›Р Р†Р вЂљРЎС™Р В РўвЂР РЋРІР‚в„–Р В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„– Р В Р’В¶Р В Р в‚¬Р Р†РІР‚С›РЎС›Р В Р вЂ¦Р В Р’Вµ Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р РЋРІР‚С™Р В Р’В°Р В РЎвЂ”Р РЋР С“Р РЋРІР‚в„–Р РЋР вЂљР В РЎВР В Р’В°Р В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–',
      mhSpecialist: 'Р В РЎС™Р В Р’В°Р В РЎВР В Р’В°Р В Р вЂ¦',
      mhSpecialistDesc: 'Р В Р Р‹Р В Р’В°Р В Р’В±Р В Р’В°Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В Р’В¶Р РЋРЎвЂњР РЋР вЂљР В Р вЂ¦Р В Р’В°Р В В»Р РЋРІР‚в„– Р В Р’В¶Р В Р в‚¬Р Р†РІР‚С›РЎС›Р В Р вЂ¦Р В Р’Вµ Р РЋРІР‚С™Р В РЎС›Р В РІР‚РЋР В Р’В·Р В Р’ВµР РЋРІР‚С™Р РЋРЎвЂњ Р В Р в‚¬Р Р†РІР‚С›РЎС›Р В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР В РЎВР В Р’ВµР В В»Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ',
      mhDirector: 'Р–РµС‚РµРєС€С–',
      mhDirectorDesc: 'РћСЂС‚Р°Р»С‹РўвЂєС‚С‹ Р±Р°СЃРўвЂєР°СЂСѓ Р¶РЈв„ўРЅРµ Р°РЅР°Р»РёС‚РёРєР°',
      childProfile: 'Р В РІР‚ВР В Р’В°Р В В»Р В Р’В°Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎС›Р В РІвЂљВ¬ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚С›Р В РЎвЂР В В»Р РЋРІР‚вЂњ',
      childProfileDesc: 'Р”РµСЂРµРєС‚РµСЂ Р°РєРєР°СѓРЅС‚С‹РўР€С‹Р·РґР° СЃР°РўвЂєС‚Р°Р»Р°РґС‹',
      personalInfo: 'Р–РµРєРµ Р°РўвЂєРїР°СЂР°С‚',
      childName: 'Р В РІР‚ВР В Р’В°Р В В»Р В Р’В°Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎС›Р В РІвЂљВ¬ Р РЋРІР‚С™Р В РЎвЂўР В В»Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚в„–-Р В Р’В¶Р В Р в‚¬Р вЂ™Р’В©Р В Р вЂ¦Р РЋРІР‚вЂњ',
      childNamePh: 'Р В РЎС™Р РЋРІР‚в„–Р РЋР С“Р В Р’В°Р В В»Р РЋРІР‚в„–: Р В Р в‚¬Р вЂ™Р’ВР В В»Р РЋРІР‚вЂњР В Р’В±Р В Р’ВµР В РЎвЂќ Р В Р Р‹Р В Р’ВµР В РІвЂћвЂ“Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ ',
      dob: 'РўСѓРўвЂњР°РЅ РєРўР‡РЅС– (РљРљ.РђРђ.Р–Р–Р–Р–)',
      diagnosis: 'Р”РёР°РіРЅРѕР· / РµСЂРµРєС€РµР»С–РєС‚РµСЂ',
      diagnosisPh: 'Р В РЎС™Р РЋРІР‚в„–Р РЋР С“Р В Р’В°Р В В»Р РЋРІР‚в„–: Р РЋР С“Р В Р в‚¬Р вЂ™Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р В РўвЂР В Р’В°Р В РЎВР РЋРЎвЂњР РЋРІР‚в„–Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎС›Р В РІвЂљВ¬ Р В РЎвЂќР В Р’ВµР РЋРІвЂљВ¬Р РЋРІР‚вЂњР В РЎвЂ“Р РЋРЎвЂњР РЋРІР‚вЂњ, Р В РІР‚ВР В Р’В¦Р В РЎСџ, Р В Р’В°Р РЋРЎвЂњР РЋРІР‚С™Р В РЎвЂР В Р’В·Р В РЎВ...',
      docs: 'РўС™РўВ±Р¶Р°С‚С‚Р°СЂ',
      upload: 'Р–РўР‡РєС‚РµСѓ РўР‡С€С–РЅ Р±Р°СЃС‹РўР€С‹Р·',
      uploadHint: 'Р В РЎвЂ™Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќР РЋРІР‚С™Р В Р’В°Р В РЎВР В Р’В°Р В В»Р В Р’В°Р РЋР вЂљ, Р В РЎВР В Р’В°Р В РЎВР В Р’В°Р В Р вЂ¦Р В РўвЂР В Р’В°Р РЋР вЂљ Р В РЎС›Р Р†Р вЂљРЎвЂќР В РЎвЂўР РЋР вЂљР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРІР‚в„–Р В Р вЂ¦Р В РўвЂР РЋРІР‚в„–Р В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–',
      skills: 'Р В РІР‚ВР В Р’В°Р В В»Р В Р’В°Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎС›Р В РІвЂљВ¬ Р В РўвЂР В Р’В°Р В РЎС›Р Р†Р вЂљРЎС™Р В РўвЂР РЋРІР‚в„–Р В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–',
      saveProfile: 'Р В Р Р‹Р В Р’В°Р В РЎС›Р Р†Р вЂљРЎвЂќР РЋРІР‚С™Р В Р’В°Р В РЎвЂ”, Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В-Р В РЎвЂќР В Р в‚¬Р вЂ™Р’В©Р В РЎВР В Р’ВµР В РЎвЂќР РЋРІвЂљВ¬Р РЋРІР‚вЂњР В Р вЂ¦Р РЋРІР‚вЂњ Р В Р’В°Р РЋРІвЂљВ¬Р РЋРЎвЂњ',
      sessionJournal: 'РЎР°Р±Р°РўвЂє Р¶СѓСЂРЅР°Р»С‹',
      sessionDesc: 'РўС™Р°РўвЂњР°Р· РґРЈв„ўРїС‚РµСЂРґС–РўР€ РѕСЂРЅС‹РЅР° РѕСЂС‚Р°РўвЂє С†РёС„СЂР»С‹РўвЂє Р±Р°Р·Р°',
      whyTitle: 'Р В РІР‚ВР В РЎС›Р вЂ™Р’В±Р В В» Р В Р вЂ¦Р В Р’Вµ Р В РЎС›Р В РІР‚РЋР РЋРІвЂљВ¬Р РЋРІР‚вЂњР В Р вЂ¦?',
      whyText: 'Р В РЎвЂєР РЋР вЂљР РЋРІР‚С™Р В Р’В°Р В В»Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В РЎВР В Р’В°Р В РЎВР В Р’В°Р В Р вЂ¦Р В РўвЂР В Р’В°Р РЋР вЂљР РЋРІР‚в„– Р В РЎвЂўР РЋР вЂљР РЋРІР‚С™Р В Р’В°Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В Р’В±Р В Р’В°Р В Р’В·Р В Р’В°Р В Р вЂ¦Р РЋРІР‚в„– Р В РЎвЂќР В Р в‚¬Р вЂ™Р’В©Р РЋР вЂљР В Р’ВµР В РўвЂР РЋРІР‚вЂњ. Р В Р в‚¬Р вЂ™Р’ВР РЋР вЂљ Р В Р’В±Р В Р’В°Р В В»Р В Р’В°Р В РЎС›Р Р†Р вЂљРЎС™Р В Р’В° Р В Р’В±Р РЋРІР‚вЂњР РЋР вЂљ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚С›Р В РЎвЂР В В»Р РЋР Р‰, Р В РЎС›Р Р†Р вЂљРЎвЂќР В Р’В°Р В РЎС›Р Р†Р вЂљРЎС™Р В Р’В°Р В Р’В· Р РЋРІвЂљВ¬Р В Р’В°Р РЋРІР‚С™Р В Р’В°Р РЋР С“Р РЋРЎвЂњР РЋРІР‚в„– Р В Р’В¶Р В РЎвЂўР В РЎС›Р Р†Р вЂљРЎвЂќ.',
      sessionInfo: 'РЎР°Р±Р°РўвЂє С‚СѓСЂР°Р»С‹ Р°РўвЂєРїР°СЂР°С‚',
      sessionType: 'РЎР°Р±Р°РўвЂє С‚РўР‡СЂС–',
      chooseType: 'РўРўР‡СЂС–РЅ С‚Р°РўР€РґР°РўР€С‹Р·...',
      notes: 'РЎР°Р±Р°РўвЂєС‚Р° РЅРµ С–СЃС‚РµР»РґС–',
      notesPh: 'Р В РІР‚вЂњР В Р’В°Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎС™Р РЋРЎвЂњР В В»Р В Р’В°Р РЋР вЂљР В РўвЂР РЋРІР‚в„–, Р В Р’В±Р В Р’ВµР В В»Р РЋР С“Р В Р’ВµР В Р вЂ¦Р В РўвЂР РЋРІР‚вЂњР В В»Р РЋРІР‚вЂњР В РЎвЂќР РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В РўвЂР РЋРІР‚вЂњ, Р В Р в‚¬Р Р†РІР‚С›РЎС›Р В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР В РЎВР В Р’ВµР В В»Р В Р’ВµР РЋР вЂљР В РўвЂР РЋРІР‚вЂњ Р В Р’В¶Р В Р’В°Р В Р’В·Р РЋРІР‚в„–Р В РЎС›Р В РІвЂљВ¬Р РЋРІР‚в„–Р В Р’В·...',
      result: 'РќРЈв„ўС‚РёР¶Рµ / Р±Р°РўвЂєС‹Р»Р°Сѓ',
      resultPh: 'Р В РІР‚ВР В Р’В°Р В В»Р В Р’В° Р В РЎС›Р Р†Р вЂљРЎвЂќР В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р В РЎвЂўР РЋР вЂљР РЋРІР‚в„–Р В Р вЂ¦Р В РўвЂР В Р’В°Р В РўвЂР РЋРІР‚в„–? Р В РЎСљР В Р’Вµ Р В Р’В¶Р В Р’В°Р В РЎС›Р Р†Р вЂљРЎвЂќР РЋР С“Р В Р’В°Р РЋР вЂљР В РўвЂР РЋРІР‚в„–?',
      rating: 'РЎР°Р±Р°РўвЂєС‚С‹ Р±Р°РўвЂњР°Р»Р°Сѓ',
      saveSession: 'Р В Р Р‹Р В Р’В°Р В РЎС›Р Р†Р вЂљРЎвЂќР РЋРІР‚С™Р В Р’В°Р В РЎвЂ”, Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В-Р В РЎВР В Р’ВµР В Р вЂ¦ Р В РЎвЂќР В Р’ВµР В РЎС›Р В РІвЂљВ¬Р В Р’ВµР РЋР С“Р РЋРЎвЂњ',
      directorPanel: 'Р–РµС‚РµРєС€С– РїР°РЅРµР»С–',
      overview: 'В«РђРЅР°РЅС‹РўР€ Р¶РўР‡СЂРµРіС–В» РѕСЂС‚Р°Р»С‹РўвЂњС‹ вЂ” С€РѕР»Сѓ',
      stats: 'РЎС‚Р°С‚РёСЃС‚РёРєР°',
      children: 'Р В РІР‚ВР В Р’В°Р В Р’В·Р В Р’В°Р В РўвЂР В Р’В°Р В РЎС›Р Р†Р вЂљРЎС™Р РЋРІР‚в„– Р В Р’В±Р В Р’В°Р В В»Р В Р’В°Р В В»Р В Р’В°Р РЋР вЂљ',
      sessions: 'РЎР°Р±Р°РўвЂєС‚Р°СЂ',
      villages: 'Р В РЎС›Р РЋРІвЂћСћР В Р’В°Р В РЎВР РЋРІР‚С™Р РЋРІР‚в„–Р В В»Р В РЎС›Р Р†Р вЂљРЎС™Р В Р’В°Р В Р вЂ¦ Р В Р’В°Р РЋРЎвЂњР РЋРІР‚в„–Р В В»Р В РўвЂР В Р’В°Р РЋР вЂљ',
      specialists: 'Р В РЎС™Р В Р’В°Р В РЎВР В Р’В°Р В Р вЂ¦',
      refresh: 'Р–Р°РўР€Р°СЂС‚Сѓ',
      exportReport: 'Р•СЃРµРїС‚С– СЌРєСЃРїРѕСЂС‚С‚Р°Сѓ',
      team: 'Р В РЎС™Р В Р’В°Р В РЎВР В Р’В°Р В Р вЂ¦Р В РўвЂР В Р’В°Р РЋР вЂљ',
      aiReady: 'Р В РЎв„ўР В Р в‚¬Р вЂ™Р’В©Р В РЎВР В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В Р’ВµР РЋР С“Р РЋРЎвЂњР В РЎвЂ“Р В Р’Вµ Р В РўвЂР В Р’В°Р В РІвЂћвЂ“Р РЋРІР‚в„–Р В Р вЂ¦',
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

  const skillTexts = {
    ru: ['Р В РІР‚СљР В РЎвЂўР В Р вЂ Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋРІР‚С™ Р РЋР С“Р В В»Р В РЎвЂўР В Р вЂ Р В Р’В°', 'Р В РІР‚СљР В РЎвЂўР В Р вЂ Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋРІР‚С™ Р В РЎвЂ”Р РЋР вЂљР В Р’ВµР В РўвЂР В В»Р В РЎвЂўР В Р’В¶Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ', 'Р В РЎСџР В РЎвЂўР В Р вЂ¦Р В РЎвЂР В РЎВР В Р’В°Р В Р’ВµР РЋРІР‚С™ Р РЋР вЂљР В Р’ВµР РЋРІР‚РЋР РЋР Р‰', 'Р В Р Р‹Р В Р’В°Р В РЎВР В РЎвЂўР В РЎвЂўР В Р’В±Р РЋР С“Р В В»Р РЋРЎвЂњР В Р’В¶Р В РЎвЂР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ', 'Р В Р’В Р В РЎвЂР РЋР С“Р РЋРЎвЂњР В Р’ВµР РЋРІР‚С™', 'Р В Р’В§Р В РЎвЂР РЋРІР‚С™Р В Р’В°Р В Р’ВµР РЋРІР‚С™', 'Р В Р Р‹Р РЋРІР‚РЋР В Р’ВµР РЋРІР‚С™', 'Р В Р Р‹Р В РЎвЂўР РЋРІР‚В Р В РЎвЂР В Р’В°Р В В»Р РЋР Р‰Р В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ Р В Р вЂ¦Р В Р’В°Р В Р вЂ Р РЋРІР‚в„–Р В РЎвЂќР В РЎвЂ', 'Р В РЎС™Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В РЎвЂР В РЎвЂќР В Р’В° Р РЋР вЂљР РЋРЎвЂњР В РЎвЂќ', 'Р В РІР‚в„ўР В Р вЂ¦Р В РЎвЂР В РЎВР В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ'],
    kk: ['Р В Р Р‹Р В Р в‚¬Р вЂ™Р’В©Р В Р’В· Р В Р’В°Р В РІвЂћвЂ“Р РЋРІР‚С™Р В Р’В°Р В РўвЂР РЋРІР‚в„–', 'Р В Р Р‹Р В Р в‚¬Р вЂ™Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР В РЎВ Р В РЎС›Р Р†Р вЂљРЎвЂќР В РЎС›Р вЂ™Р’В±Р РЋР вЂљР В Р’В°Р В РІвЂћвЂ“Р В РўвЂР РЋРІР‚в„–', 'Р В Р Р‹Р В Р в‚¬Р вЂ™Р’В©Р В Р’В·Р В РўвЂР РЋРІР‚вЂњ Р РЋРІР‚С™Р В РЎС›Р В РІР‚РЋР РЋР С“Р РЋРІР‚вЂњР В Р вЂ¦Р В Р’ВµР В РўвЂР РЋРІР‚вЂњ', 'Р В Р в‚¬Р В Р С“Р В Р’В·Р РЋРІР‚вЂњР В Р вЂ¦-Р В Р в‚¬Р вЂ™Р’В©Р В Р’В·Р РЋРІР‚вЂњ Р В РЎвЂќР В РЎС›Р В РІР‚РЋР РЋРІР‚С™Р РЋРЎвЂњ', 'Р В Р Р‹Р РЋРЎвЂњР РЋР вЂљР В Р’ВµР РЋРІР‚С™ Р РЋР С“Р В Р’В°Р В В»Р В Р’В°Р В РўвЂР РЋРІР‚в„–', 'Р В РЎвЂєР В РЎС›Р Р†Р вЂљРЎвЂќР В РЎвЂР В РўвЂР РЋРІР‚в„–', 'Р В Р Р‹Р В Р’В°Р В Р вЂ¦Р В Р’В°Р В РІвЂћвЂ“Р В РўвЂР РЋРІР‚в„–', 'Р В Р в‚¬Р вЂ™Р’ВР В В»Р В Р’ВµР РЋРЎвЂњР В РЎВР В Р’ВµР РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚вЂњР В РЎвЂќ Р В РўвЂР В Р’В°Р В РЎС›Р Р†Р вЂљРЎС™Р В РўвЂР РЋРІР‚в„–Р В В»Р В Р’В°Р РЋР вЂљ', 'Р В РЎС›Р РЋРІвЂћСћР В РЎвЂўР В В» Р В РЎВР В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В РЎвЂР В РЎвЂќР В Р’В°Р РЋР С“Р РЋРІР‚в„–', 'Р В вЂ”Р В Р’ВµР В РІвЂћвЂ“Р РЋРІР‚вЂњР В Р вЂ¦'],
    en: ['Says words', 'Uses sentences', 'Understands speech', 'Self-care', 'Draws', 'Reads', 'Counting', 'Social skills', 'Hand motor skills', 'Attention']
  };

  const sessionSkillTexts = {
    ru: ['Р В РЎвЂ™Р В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р В РЎвЂў Р РЋРЎвЂњР РЋРІР‚РЋР В Р’В°Р РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂўР В Р вЂ Р В Р’В°Р В В»', 'Р В РІР‚ВР РЋРІР‚в„–Р В В» Р РЋР С“Р В РЎвЂўР РЋР С“Р РЋР вЂљР В Р’ВµР В РўвЂР В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦', 'Р В РІР‚СћР РЋР С“Р РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РЎвЂ“Р РЋР вЂљР В Р’ВµР РЋР С“Р РЋР С“', 'Р В РІР‚ВР РЋРІР‚в„–Р В В» Р В РЎвЂќР В Р’В°Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР В Р’В·Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎВ', 'Р В Р в‚¬Р РЋР С“Р РЋРІР‚С™Р В Р’В°Р В В» Р В Р’В±Р РЋРІР‚в„–Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂў', 'Р В РЎС›Р РЋР вЂљР В Р’ВµР В Р’В±Р РЋРЎвЂњР В Р’ВµР РЋРІР‚С™ Р В РЎвЂ”Р В РЎвЂўР В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В Р’В°'],
    kk: ['Р В РІР‚ВР В Р’ВµР В В»Р РЋР С“Р В Р’ВµР В Р вЂ¦Р В РўвЂР РЋРІР‚вЂњ Р В РЎС›Р Р†Р вЂљРЎвЂќР В Р’В°Р РЋРІР‚С™Р РЋРІР‚в„–Р РЋР С“Р РЋРІР‚С™Р РЋРІР‚в„–', 'Р В вЂ”Р В Р’ВµР В РІвЂћвЂ“Р РЋРІР‚вЂњР В Р вЂ¦Р РЋРІР‚вЂњ Р РЋРІР‚С™Р В РЎС›Р вЂ™Р’В±Р РЋР вЂљР В Р’В°Р В РЎС›Р Р†Р вЂљРЎвЂќР РЋРІР‚С™Р РЋРІР‚в„– Р В Р’В±Р В РЎвЂўР В В»Р В РўвЂР РЋРІР‚в„–', 'Р В РІР‚В Р В В»Р В РЎвЂ“Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњР В В»Р В Р’ВµР РЋРЎвЂњ Р В Р’В±Р В Р’В°Р РЋР вЂљ', 'Р В РЎС›Р РЋРІвЂћСћР РЋРІР‚в„–Р В РЎС›Р В РІвЂљВ¬Р РЋРІР‚в„–Р РЋР вЂљР В В»Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В Р’В±Р В РЎвЂўР В В»Р В РўвЂР РЋРІР‚в„–', 'Р В РЎС›Р В Р’ВµР В Р’В· Р РЋРІвЂљВ¬Р В Р’В°Р РЋР вЂљР РЋРІвЂљВ¬Р В Р’В°Р В РўвЂР РЋРІР‚в„–', 'Р В РЎС›Р РЋРІвЂћСћР В Р’В°Р В РІвЂћвЂ“Р РЋРІР‚С™Р В Р’В°Р В В»Р В Р’В°Р РЋРЎвЂњ Р В РЎС›Р Р†Р вЂљРЎвЂќР В Р’В°Р В Р’В¶Р В Р’ВµР РЋРІР‚С™'],
    en: ['Participated actively', 'Stayed focused', 'Progress noticed', 'Was upset', 'Got tired quickly', 'Needs repetition']
  };

  const sessionTypes = {
    ru: ['Р›РѕРіРѕРїРµРґРёС‡РµСЃРєРѕРµ Р·Р°РЅСЏС‚РёРµ', 'Р”РµС„РµРєС‚РѕР»РѕРіРёС‡РµСЃРєРѕРµ Р·Р°РЅСЏС‚РёРµ', 'РџСЃРёС…РѕР»РѕРіРёС‡РµСЃРєРѕРµ Р·Р°РЅСЏС‚РёРµ', 'РђСЂС‚-С‚РµСЂР°РїРёСЏ', 'Р›Р¤Рљ', 'РЎРµРЅСЃРѕСЂРЅР°СЏ РёРЅС‚РµРіСЂР°С†РёСЏ', 'Р”СЂСѓРіРѕРµ'],
    kk: ['Р В РІР‚С”Р В РЎвЂўР В РЎвЂ“Р В РЎвЂўР В РЎвЂ”Р В Р’ВµР В РўвЂ Р РЋР С“Р В Р’В°Р В Р’В±Р В Р’В°Р В РЎС›Р Р†Р вЂљРЎС™Р РЋРІР‚в„–', 'Р В РІР‚СњР В Р’ВµР РЋРІР‚С›Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В РЎвЂўР В В»Р В РЎвЂўР В РЎвЂ“ Р РЋР С“Р В Р’В°Р В Р’В±Р В Р’В°Р В РЎС›Р Р†Р вЂљРЎС™Р РЋРІР‚в„–', 'Р В РЎСџР РЋР С“Р В РЎвЂР РЋРІР‚В¦Р В РЎвЂўР В В»Р В РЎвЂўР В РЎвЂ“ Р РЋР С“Р В Р’В°Р В Р’В±Р В Р’В°Р В РЎС›Р Р†Р вЂљРЎС™Р РЋРІР‚в„–', 'Р В РЎвЂ™Р РЋР вЂљР РЋРІР‚С™-Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР РЏ', 'Р В РІР‚СћР В РЎВР В РўвЂР РЋРІР‚вЂњР В РЎвЂќ Р В РўвЂР В Р’ВµР В Р вЂ¦Р В Р’Вµ Р РЋРІвЂљВ¬Р РЋРІР‚в„–Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќР РЋРІР‚С™Р РЋРІР‚в„–Р РЋР вЂљР РЋРЎвЂњ', 'Р В Р Р‹Р В Р’ВµР В Р вЂ¦Р РЋР С“Р В РЎвЂўР РЋР вЂљР В В»Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р РЋР вЂљР В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ', 'Р В РІР‚ВР В Р’В°Р РЋР С“Р В РЎС›Р Р†Р вЂљРЎвЂќР В Р’В°'],
    en: ['Speech therapy', 'Special education session', 'Psychology session', 'Art therapy', 'Therapeutic exercise', 'Sensory integration', 'Other']
  };

  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.from(document.querySelectorAll(sel)); }
  function set(el, text) { 
      if (el && typeof text === 'string') {
          if (el.closest && (el.closest('.menu-item') || el.querySelector('.stylish-first-letter'))) {
              const firstChar = text.charAt(0);
              const rest = text.slice(1);
              let grad = "linear-gradient(135deg, #ffd700, #ff8c00)";
              const p = el.closest('.menu-item') || el.parentElement;
              if (p) {
                  const html = p.outerHTML;
                  if (html.includes('whatsNewModal')) grad = "linear-gradient(135deg, #ff9f43, #feca57)";
                  else if (html.includes('aboutModal')) grad = "linear-gradient(135deg, #00d2d3, #0984e3)";
                  else if (html.includes('chatTrigger')) grad = "linear-gradient(135deg, #5f27cd, #a29bfe)";
                  else if (html.includes('libraryTrigger')) grad = "linear-gradient(135deg, #ff6b6b, #ee5253)";
                  else if (html.includes('Game')) grad = "linear-gradient(135deg, #10ac84, #1dd1a1)";
                  else if (html.includes('NewFeature') || html.includes('feature')) grad = "linear-gradient(135deg, #ffd32a, #ffa801)";
              }
              el.innerHTML = `<span class="stylish-first-letter" style="--letter-grad: ${grad};">${firstChar}</span>${rest}`;
          } else {
              el.textContent = text; 
          }
      }
  }
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
      setLiveStatus('РЎР»СѓС€Р°СЋ... РєРѕРіРґР° Р ВР В РѕС‚РІРµС‡Р°РµС‚, Р·РґРµСЃСЊ Р±СѓРґРµС‚ Р°РЅРёРјР°С†РёСЏ РіРѕР»РѕСЃР°.');
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
        setLiveStatus(transcript ? 'РЈСЃР»С‹С€Р°Р»: ${transcript}' : 'Р В Р Р‹Р В В»Р РЋРЎвЂњР РЋРІвЂљВ¬Р В Р’В°Р РЋР вЂ№...');
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
          ? 'Р В Р’В Р В Р’В°Р В Р’В·Р РЋР вЂљР В Р’ВµР РЋРІвЂљВ¬Р В РЎвЂР РЋРІР‚С™Р В Р’Вµ Р В РЎВР В РЎвЂР В РЎвЂќР РЋР вЂљР В РЎвЂўР РЋРІР‚С›Р В РЎвЂўР В Р вЂ¦ Р В Р вЂ  Р В Р’В±Р РЋР вЂљР В Р’В°Р РЋРЎвЂњР В Р’В·Р В Р’ВµР РЋР вЂљР В Р’Вµ, Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂўР В Р’В±Р РЋРІР‚в„– Live Р В РЎВР В РЎвЂўР В РЎвЂ“ Р РЋР С“Р В В»Р РЋРЎвЂњР РЋРІвЂљВ¬Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ“Р В РЎвЂўР В В»Р В РЎвЂўР РЋР С“.'
          : 'Р В РЎСљР В Р’Вµ Р РЋРЎвЂњР В РўвЂР В Р’В°Р В В»Р В РЎвЂўР РЋР С“Р РЋР Р‰ Р В Р’В·Р В Р’В°Р В РЎвЂ”Р РЋРЎвЂњР РЋР С“Р РЋРІР‚С™Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎВР В РЎвЂР В РЎвЂќР РЋР вЂљР В РЎвЂўР РЋРІР‚С›Р В РЎвЂўР В Р вЂ¦. Р В РЎС™Р В РЎвЂўР В Р’В¶Р В Р вЂ¦Р В РЎвЂў Р В Р’В·Р В Р’В°Р В РЎвЂќР РЋР вЂљР РЋРІР‚в„–Р РЋРІР‚С™Р РЋР Р‰ Live Р В РЎвЂ Р В Р вЂ¦Р В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰ Р В Р вЂ Р В РЎвЂўР В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋР С“ Р РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋР С“Р РЋРІР‚С™Р В РЎвЂўР В РЎВ.';
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
      setLiveStatus('Live Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂќР РЋР вЂљР РЋРІР‚в„–Р РЋРІР‚С™. Р В РІР‚СћР РЋР С“Р В В»Р В РЎвЂ Р В РЎВР В РЎвЂР В РЎвЂќР РЋР вЂљР В РЎвЂўР РЋРІР‚С›Р В РЎвЂўР В Р вЂ¦ Р В Р вЂ¦Р В Р’Вµ Р В Р’В·Р В Р’В°Р В РЎвЂ”Р РЋРЎвЂњР РЋР С“Р РЋРІР‚С™Р В РЎвЂР В В»Р РЋР С“Р РЋР РЏ, Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’ВµР РЋР вЂљР РЋР Р‰Р РЋРІР‚С™Р В Р’Вµ Р РЋР вЂљР В Р’В°Р В Р’В·Р РЋР вЂљР В Р’ВµР РЋРІвЂљВ¬Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В Р’В±Р РЋР вЂљР В Р’В°Р РЋРЎвЂњР В Р’В·Р В Р’ВµР РЋР вЂљР В Р’В°.');
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
    setLiveStatus('Р В Р Р‹Р В В»Р РЋРЎвЂњР РЋРІвЂљВ¬Р В Р’В°Р РЋР вЂ№... Р В РЎвЂќР В РЎвЂўР В РЎвЂ“Р В РўвЂР В Р’В° Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РЎвЂўР РЋРІР‚С™Р В Р вЂ Р В Р’ВµР РЋРІР‚РЋР В Р’В°Р В Р’ВµР РЋРІР‚С™, Р В Р’В·Р В РўвЂР В Р’ВµР РЋР С“Р РЋР Р‰ Р В Р’В±Р РЋРЎвЂњР В РўвЂР В Р’ВµР РЋРІР‚С™ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В РЎВР В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ Р В РЎвЂ“Р В РЎвЂўР В В»Р В РЎвЂўР РЋР С“Р В Р’В°.');
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
    if (['aboutModal', 'upgradeModal', 'whatsNewModal', 'fullscreenLayerModal', 'dastanModal'].includes(id)) {
        
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
      premiumSub: 'Р‘Р°СЂР»С‹РўвЂє РјРѕРґРµР»СЊРґРµСЂРіРµ С€РµРєСЃС–Р· РўвЂєРѕР»Р¶РµС‚С–РјРґС–Р»С–Рє',
      premium1: 'Р‘Р°СЂР»С‹РўвЂє РјРѕРґРµР»СЊРґРµСЂ С€РµРєС‚РµСѓСЃС–Р·',
      premium2: 'Р‘Р°СЃС‹Рј РўвЂєРѕР»Р¶РµС‚С–РјРґС–Р»С–Рє',
      premium3: 'Р§Р°С‚ С‚Р°СЂРёС…С‹',
      premium4: 'Р”Р°СѓС‹СЃС‚С‹РўвЂє Р¶Р°СѓР°РїС‚Р°СЂ',
      premiumSoon: 'Р–Р°РўвЂєС‹РЅРґР° РўвЂєРѕР»Р¶РµС‚С–РјРґС–',
      deep: 'Р“Р»СѓР±РѕРєРёР№ РїРѕРёСЃРє',
      modelPick: 'Р В РІР‚в„ўР РЋРІР‚в„–Р В Р’В±Р В Р’ВµР РЋР вЂљР В РЎвЂР РЋРІР‚С™Р В Р’Вµ Р В РЎВР В РЎвЂўР В РўвЂР В Р’ВµР В В»Р РЋР Р‰',
      ask: 'РЎРїСЂРѕСЃРёС‚Рµ SOLIFON AI С‡С‚Рѕ СѓРіРѕРґРЅРѕ...',
      questions: [
        ['Р§С‚Рѕ С‚Р°РєРѕРµ РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹Р№ РёРЅС‚РµР»Р»РµРєС‚?', 'Р В Р’В§Р РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂР РЋР С“Р В РЎвЂќР РЋРЎвЂњР РЋР С“Р РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В В»Р В В»Р В Р’ВµР В РЎвЂќР РЋРІР‚С™?'],
        ['Р§С‚Рѕ С‚Р°РєРѕРµ РјРµС‚Р°РІСЃРµР»РµРЅРЅР°СЏ?', 'Р В Р’В§Р РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎВР В Р’ВµР РЋРІР‚С™Р В Р’В°Р В Р вЂ Р РЋР С“Р В Р’ВµР В В»Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В Р’В°Р РЋР РЏ?'],
        ['Р§С‚Рѕ С‚Р°РєРѕРµ Р°РЅС‚РёРјР°С‚РµСЂРёСЏ?', 'Р В Р’В§Р РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂР В РЎВР В Р’В°Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В РЎвЂР РЋР РЏ?'],
        ['Р§С‚Рѕ С‚Р°РєРѕРµ РјР°С€РёРЅРЅРѕРµ РѕР±СѓС‡РµРЅРёРµ?', 'Р В Р’В§Р РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎВР В Р’В°Р РЋРІвЂљВ¬Р В РЎвЂР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В Р’Вµ Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ?']
      ]
    },
    kk: {
      download: 'Solifon AI Р¶РўР‡РєС‚РµСѓ',
      upgradeText: 'Premium-РўвЂњР° РЈВ©С‚Сѓ',
      upgrade: 'Р–Р°РўвЂєСЃР°СЂС‚Сѓ',
      premiumTitle: 'Solifon Premium',
      premiumSub: 'Р В РІР‚ВР В Р’В°Р РЋР вЂљР В В»Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В РЎВР В РЎвЂўР В РўвЂР В Р’ВµР В В»Р РЋР Р‰Р В РўвЂР В Р’ВµР РЋР вЂљР В РЎвЂ“Р В Р’Вµ Р РЋРІвЂљВ¬Р В Р’ВµР В РЎвЂќР РЋР С“Р РЋРІР‚вЂњР В Р’В· Р В РЎС›Р Р†Р вЂљРЎвЂќР В РЎвЂўР В В»Р В Р’В¶Р В Р’ВµР РЋРІР‚С™Р РЋРІР‚вЂњР В РЎВР В РўвЂР РЋРІР‚вЂњР В В»Р РЋРІР‚вЂњР В РЎвЂќ',
      premium1: 'Р В РІР‚ВР В Р’В°Р РЋР вЂљР В В»Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В РЎВР В РЎвЂўР В РўвЂР В Р’ВµР В В»Р РЋР Р‰Р В РўвЂР В Р’ВµР РЋР вЂљ Р РЋРІвЂљВ¬Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В Р’ВµР РЋРЎвЂњР РЋР С“Р РЋРІР‚вЂњР В Р’В·',
      premium2: 'Р В РІР‚ВР В Р’В°Р РЋР С“Р РЋРІР‚в„–Р В РЎВ Р В РЎС›Р Р†Р вЂљРЎвЂќР В РЎвЂўР В В»Р В Р’В¶Р В Р’ВµР РЋРІР‚С™Р РЋРІР‚вЂњР В РЎВР В РўвЂР РЋРІР‚вЂњР В В»Р РЋРІР‚вЂњР В РЎвЂќ',
      premium3: 'Р§Р°С‚ С‚Р°СЂРёС…С‹',
      premium4: 'Р”Р°СѓС‹СЃС‚С‹РўвЂє Р¶Р°СѓР°РїС‚Р°СЂ',
      premiumSoon: 'Р В РІР‚вЂњР В Р’В°Р В РЎС›Р Р†Р вЂљРЎвЂќР РЋРІР‚в„–Р В Р вЂ¦Р В РўвЂР В Р’В° Р В РЎС›Р Р†Р вЂљРЎвЂќР В РЎвЂўР В В»Р В Р’В¶Р В Р’ВµР РЋРІР‚С™Р РЋРІР‚вЂњР В РЎВР В РўвЂР РЋРІР‚вЂњ',
      deep: 'РўРµСЂРµРўР€ С–Р·РґРµСѓ',
      modelPick: 'РњРѕРґРµР»СЊ С‚Р°РўР€РґР°РўР€С‹Р·',
      ask: 'SOLIFON AI-РґР°РЅ РєРµР· РєРµР»РіРµРЅ РЅРЈв„ўСЂСЃРµ СЃРўВ±СЂР°РўР€С‹Р·...',
      questions: [
        ['Р–Р°СЃР°РЅРґС‹ РёРЅС‚РµР»Р»РµРєС‚ РґРµРіРµРЅ РЅРµ?', 'Р В РІР‚вЂњР В Р’В°Р РЋР С“Р В Р’В°Р В Р вЂ¦Р В РўвЂР РЋРІР‚в„– Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В В»Р В В»Р В Р’ВµР В РЎвЂќР РЋРІР‚С™ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦ Р В Р вЂ¦Р В Р’Вµ?'],
        ['РњРµС‚Р°РІРµСЂСЃ РґРµРіРµРЅ РЅРµ?', 'Р В РЎС™Р В Р’ВµР РЋРІР‚С™Р В Р’В°Р В Р вЂ Р В Р’ВµР РЋР вЂљР РЋР С“ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦ Р В Р вЂ¦Р В Р’Вµ?'],
        ['РђРЅС‚РёРјР°С‚РµСЂРёСЏ РґРµРіРµРЅ РЅРµ?', 'Р В РЎвЂ™Р В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂР В РЎВР В Р’В°Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В РЎвЂР РЋР РЏ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦ Р В Р вЂ¦Р В Р’Вµ?'],
        ['РњР°С€РёРЅР°Р»С‹РўвЂє РѕРўвЂєС‹С‚Сѓ РґРµРіРµРЅ РЅРµ?', 'Р В РЎС™Р В Р’В°Р РЋРІвЂљВ¬Р В РЎвЂР В Р вЂ¦Р В Р’В°Р В В»Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В РЎвЂўР В РЎС›Р Р†Р вЂљРЎвЂќР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦ Р В Р вЂ¦Р В Р’Вµ?']
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
      if (items[index]) items[index].textContent = 'вњ”  ${text}';
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
      whatsTitle: 'Р–Р°ТЈР°Р»С‹Т›С‚Р°СЂ',
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
    kk: {
      whatsTitle: 'Р–Р°ТЈР°Р»С‹Т›С‚Р°СЂ',
      whats01: '01 < Р–РўР‡Р№РµР»С–Рє РґР°РўвЂњРґС‹Р»Р°СЂ />',
      whats02: '02 < Р–Р°РўвЂєС‹РЅРґР° />',
      whats03: '03 < Р–Р°РўР€Р°Р»С‹РўвЂє />',
      aboutTitle: 'SOLIFON AI С‚СѓСЂР°Р»С‹',
      aboutHero: 'SOLIFON AI',
      aboutLead: 'Solifon AI Р РЋРІР‚РЋР В Р’В°Р РЋРІР‚С™, Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋРЎвЂњ, Р В РЎВР В РЎвЂўР В РўвЂР В Р’ВµР В В»Р РЋР Р‰Р В РўвЂР В Р’ВµР РЋР вЂљ, Р В РўвЂР В Р’В°Р РЋРЎвЂњР РЋРІР‚в„–Р РЋР С“, Р В Р вЂ Р В РЎвЂР В Р’В·Р РЋРЎвЂњР В Р’В°Р В В»Р В РўвЂР РЋРІР‚в„– Р В РЎС›Р Р†Р вЂљРЎвЂќР В РЎС›Р вЂ™Р’В±Р РЋР вЂљР В Р’В°Р В В»Р В РўвЂР В Р’В°Р РЋР вЂљ Р В Р’В¶Р В Р в‚¬Р Р†РІР‚С›РЎС›Р В Р вЂ¦Р В Р’Вµ Р В Р’В¶Р В РЎС›Р вЂ™Р’В±Р В РЎВР РЋРІР‚в„–Р РЋР С“ Р В РЎвЂќР В Р’ВµР В РЎС›Р В РІвЂљВ¬Р РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р РЋРІР‚вЂњР В РЎвЂќР РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњР В Р вЂ¦ Р В Р’В±Р РЋРІР‚вЂњР РЋР вЂљ Р В РЎвЂ”Р В В»Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С›Р В РЎвЂўР РЋР вЂљР В РЎВР В Р’В°Р В РЎС›Р Р†Р вЂљРЎС™Р В Р’В° Р В Р’В±Р РЋРІР‚вЂњР РЋР вЂљР РЋРІР‚вЂњР В РЎвЂќР РЋРІР‚С™Р РЋРІР‚вЂњР РЋР вЂљР В Р’ВµР В РўвЂР РЋРІР‚вЂњ.',
      aboutGoal: 'Р В РІР‚ВР РЋРІР‚вЂњР В Р’В·Р В РўвЂР РЋРІР‚вЂњР В РЎС›Р В РІвЂљВ¬ Р В РЎВР В Р’В°Р В РЎС›Р Р†Р вЂљРЎвЂќР РЋР С“Р В Р’В°Р РЋРІР‚С™',
      aboutGoalText: 'Р В РІР‚ВР РЋРІР‚вЂњР В Р’В· Р В РЎвЂўР В РЎС›Р Р†Р вЂљРЎвЂќР РЋРЎвЂњР В РЎС›Р Р†Р вЂљРЎС™Р В Р’В°, Р В Р’В¶Р В РЎС›Р вЂ™Р’В±Р В РЎВР РЋРІР‚в„–Р РЋР С“ Р РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋРЎвЂњР В РЎвЂ“Р В Р’Вµ, Р В РЎвЂР В РўвЂР В Р’ВµР РЋР РЏР В В»Р В Р’В°Р РЋР вЂљР В РўвЂР РЋРІР‚в„– Р В Р’В·Р В Р’ВµР РЋР вЂљР РЋРІР‚С™Р РЋРІР‚С™Р В Р’ВµР РЋРЎвЂњР В РЎвЂ“Р В Р’Вµ Р В Р’В¶Р В Р в‚¬Р Р†РІР‚С›РЎС›Р В Р вЂ¦Р В Р’Вµ Р В Р в‚¬Р Р†РІР‚С›РЎС›Р РЋР вЂљР РЋРІР‚С™Р В РЎС›Р В РІР‚РЋР РЋР вЂљР В В»Р РЋРІР‚вЂњ Р В РЎС›Р Р†Р вЂљРЎвЂќР В РЎС›Р вЂ™Р’В±Р РЋР вЂљР В Р’В°Р В В»Р В РўвЂР В Р’В°Р РЋР вЂљР В РўвЂР РЋРІР‚в„– Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В Р’В±Р В Р’ВµР РЋРІР‚С™Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋР С“Р РЋРІР‚вЂњР В Р’В· Р РЋРІР‚вЂњР РЋР С“Р В РЎвЂќР В Р’Вµ Р В РЎС›Р Р†Р вЂљРЎвЂќР В РЎвЂўР РЋР С“Р РЋРЎвЂњР В РЎС›Р Р†Р вЂљРЎС™Р В Р’В° Р РЋРІР‚в„–Р В РЎС›Р В РІвЂљВ¬Р В РЎС›Р Р†Р вЂљРЎС™Р В Р’В°Р В РІвЂћвЂ“Р В В»Р РЋРІР‚в„– AI-Р В РЎвЂ”Р В В»Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С›Р В РЎвЂўР РЋР вЂљР В РЎВР В Р’В° Р В Р’В¶Р В Р’В°Р РЋР С“Р В Р’В°Р В РІвЂћвЂ“Р В РЎВР РЋРІР‚в„–Р В Р’В·.',
      card1: 'РљРЈВ©Рї СЏРґСЂРѕ',
      card1Text: 'Р В РІР‚ВР РЋРІР‚вЂњР РЋР вЂљ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚С›Р В Р’ВµР В РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р В Р’Вµ Р В Р’В±Р РЋРІР‚вЂњР РЋР вЂљР В Р вЂ¦Р В Р’ВµР РЋРІвЂљВ¬Р В Р’Вµ AI Р В РЎВР В РЎвЂўР В РўвЂР В Р’ВµР В В»Р РЋРІР‚вЂњ.',
      card2: 'Code Dev',
      card2Text: 'Р В РЎв„ўР В РЎвЂўР В РўвЂ Р В РЎвЂ”Р В Р’ВµР В Р вЂ¦ Р РЋРІР‚С™Р В Р в‚¬Р Р†РІР‚С›РЎС›Р В Р’В¶Р РЋРІР‚вЂњР РЋР вЂљР В РЎвЂР В Р’В±Р В Р’ВµР В В»Р В Р’ВµР РЋР вЂљР В РЎвЂ“Р В Р’Вµ Р В Р’В°Р РЋР вЂљР В Р вЂ¦Р В Р’В°Р В В»Р В РЎС›Р Р†Р вЂљРЎС™Р В Р’В°Р В Р вЂ¦ Р В Р’В¶Р В РЎС›Р вЂ™Р’В±Р В РЎВР РЋРІР‚в„–Р РЋР С“ Р В РЎвЂќР В Р’ВµР В РЎС›Р В РІвЂљВ¬Р РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р РЋРІР‚вЂњР В РЎвЂ“Р РЋРІР‚вЂњ.'
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
    select_model: 'РњРѕРґРµР»СЊ С‚Р°РўР€РґР°РўР€С‹Р·',
    new_chat: 'Р–Р°РўР€Р° С‡Р°С‚',
    system_whatsnew: "What's new",
    system_about: 'SOLIFON С‚СѓСЂР°Р»С‹',
    menu_chat: 'Р§Р°С‚',
    menu_library: 'РљС–С‚Р°РїС…Р°РЅР°',
    menu_new_project: 'Р–Р°РўР€Р° Р¶РѕР±Р°',
    menu_presentation: 'РџСЂРµР·РµРЅС‚Р°С†РёСЏ',
    upgrade: "Upgrade to premium",
    upgrade_title: "Solifon Premium",
    upgrade_subtitle: 'РќРµР№СЂРѕР¶РµР»С–Р»РµСЂРґС–РўР€ Р±Р°СЂР»С‹РўвЂє РјРўР‡РјРєС–РЅРґС–РіС–РЅ Р°С€С‹РўР€С‹Р·',
    tariff1_type: "Pro",
    tariff1_desc: 'РљРўР‡РЅРґРµР»С–РєС‚С– С‚Р°РїСЃС‹СЂРјР°Р»Р°СЂ РўР‡С€С–РЅ РµРўР€ Р¶Р°РўвЂєСЃС‹ С‚Р°РўР€РґР°Сѓ',
    tariff1_btn: "Pro С‚Р°РўР€РґР°Сѓ",
    tariff2_type: "Max",
    tariff2_desc: 'РљРЈв„ўСЃС–РїРўвЂєРѕР№Р»Р°СЂ РјРµРЅ РЈв„ўР·С–СЂР»РµСѓС€С–Р»РµСЂ РўР‡С€С–РЅ',
    tariff2_btn: "Max С‚Р°РўР€РґР°Сѓ",
    tariff3_type: "Alpha",
    tariff3_desc: 'Р•С€РўвЂєР°РЅРґР°Р№ С€РµРєС‚РµСѓСЃС–Р· РјР°РєСЃРёРјР°Р»РґС‹ РєРўР‡С€',
    tariff3_btn: 'Alpha С‚Р°РўР€РґР°Сѓ',
  },
  kz: {
    select_model: "РњРѕРґРµР»СЊ С‚Р°РўР€РґР°РўР€С‹Р·",
    new_chat: "Р–Р°РўР€Р° С‡Р°С‚",
    system_whatsnew: "Р–Р°ТЈР°Р»С‹Т›С‚Р°СЂ",
    system_about: "SOLIFON С‚СѓСЂР°Р»С‹",
    menu_chat: "Р§Р°С‚",
    menu_library: "РљС–С‚Р°РїС…Р°РЅР°",
    menu_new_project: "Р–Р°РўР€Р° Р¶РѕР±Р°",
    menu_presentation: "РџСЂРµР·РµРЅС‚Р°С†РёСЏ",
    upgrade: "Premium-РўвЂњР° РЈВ©С‚Сѓ",
    upgrade_title: "Solifon Premium",
    upgrade_subtitle: "Р В РЎСљР В Р’ВµР В РІвЂћвЂ“Р РЋР вЂљР В РЎвЂўР В Р’В¶Р В Р’ВµР В В»Р РЋРІР‚вЂњР В В»Р В Р’ВµР РЋР вЂљР В РўвЂР РЋРІР‚вЂњР В РЎС›Р В РІвЂљВ¬ Р В Р’В±Р В Р’В°Р РЋР вЂљР В В»Р РЋРІР‚в„–Р В РЎС›Р Р†Р вЂљРЎвЂќ Р В РЎВР В РЎС›Р В РІР‚РЋР В РЎВР В РЎвЂќР РЋРІР‚вЂњР В Р вЂ¦Р В РўвЂР РЋРІР‚вЂњР В РЎвЂ“Р РЋРІР‚вЂњР В Р вЂ¦ Р В Р’В°Р РЋРІвЂљВ¬Р РЋРІР‚в„–Р В РЎС›Р В РІвЂљВ¬Р РЋРІР‚в„–Р В Р’В·",
    tariff1_type: "Pro",
    tariff1_desc: "Р В РЎв„ўР В РЎС›Р В РІР‚РЋР В Р вЂ¦Р В РўвЂР В Р’ВµР В В»Р РЋРІР‚вЂњР В РЎвЂќР РЋРІР‚С™Р РЋРІР‚вЂњ Р РЋРІР‚С™Р В Р’В°Р В РЎвЂ”Р РЋР С“Р РЋРІР‚в„–Р РЋР вЂљР В РЎВР В Р’В°Р В В»Р В Р’В°Р РЋР вЂљ Р В РЎС›Р В РІР‚РЋР РЋРІвЂљВ¬Р РЋРІР‚вЂњР В Р вЂ¦ Р В Р’ВµР В РЎС›Р В РІвЂљВ¬ Р В Р’В¶Р В Р’В°Р В РЎС›Р Р†Р вЂљРЎвЂќР РЋР С“Р РЋРІР‚в„– Р РЋРІР‚С™Р В Р’В°Р В РЎС›Р В РІвЂљВ¬Р В РўвЂР В Р’В°Р РЋРЎвЂњ",
    tariff1_btn: "Pro С‚Р°РўР€РґР°Сѓ",
    tariff2_type: "Max",
    tariff2_desc: "Р В РЎв„ўР В Р в‚¬Р Р†РІР‚С›РЎС›Р РЋР С“Р РЋРІР‚вЂњР В РЎвЂ”Р В РЎС›Р Р†Р вЂљРЎвЂќР В РЎвЂўР В РІвЂћвЂ“Р В В»Р В Р’В°Р РЋР вЂљ Р В РЎВР В Р’ВµР В Р вЂ¦ Р В Р в‚¬Р Р†РІР‚С›РЎС›Р В Р’В·Р РЋРІР‚вЂњР РЋР вЂљР В В»Р В Р’ВµР РЋРЎвЂњР РЋРІвЂљВ¬Р РЋРІР‚вЂњР В В»Р В Р’ВµР РЋР вЂљ Р В РЎС›Р В РІР‚РЋР РЋРІвЂљВ¬Р РЋРІР‚вЂњР В Р вЂ¦",
    tariff2_btn: "Max С‚Р°РўР€РґР°Сѓ",
    tariff3_type: "Alpha",
    tariff3_desc: "Р В РІР‚СћР РЋРІвЂљВ¬Р В РЎС›Р Р†Р вЂљРЎвЂќР В Р’В°Р В Р вЂ¦Р В РўвЂР В Р’В°Р В РІвЂћвЂ“ Р РЋРІвЂљВ¬Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В Р’ВµР РЋРЎвЂњР РЋР С“Р РЋРІР‚вЂњР В Р’В· Р В РЎВР В Р’В°Р В РЎвЂќР РЋР С“Р В РЎвЂР В РЎВР В Р’В°Р В В»Р В РўвЂР РЋРІР‚в„– Р В РЎвЂќР В РЎС›Р В РІР‚РЋР РЋРІвЂљВ¬",
    tariff3_btn: "Alpha С‚Р°РўР€РґР°Сѓ",
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
    tariff1_type: "Pro",
    tariff1_desc: "Best choice for daily tasks",
    tariff1_btn: "Choose Pro",
    tariff2_type: "Max",
    tariff2_desc: "For professionals and developers",
    tariff2_btn: "Choose Max",
    tariff3_type: "Alpha",
    tariff3_desc: "Maximum power without limits",
    tariff3_btn: "Choose Alpha",
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
    if (el && dict[key]) {
        const txt = dict[key];
        if (selector.includes('.menu-item') || selector.includes('#chatTrigger') || selector.includes('#libraryTrigger') || selector.includes('Game')) {
            const firstChar = txt.charAt(0);
            const rest = txt.slice(1);
            let grad = "linear-gradient(135deg, #ffd700, #ff8c00)";
            if (selector.includes('whatsNewModal')) grad = "linear-gradient(135deg, #ff9f43, #feca57)";
            else if (selector.includes('aboutModal')) grad = "linear-gradient(135deg, #00d2d3, #0984e3)";
            else if (selector.includes('chatTrigger')) grad = "linear-gradient(135deg, #5f27cd, #a29bfe)";
            else if (selector.includes('libraryTrigger')) grad = "linear-gradient(135deg, #ff6b6b, #ee5253)";
            else if (selector.includes('Game')) grad = "linear-gradient(135deg, #10ac84, #1dd1a1)";
            else if (selector.includes('NewFeature') || selector.includes('feature')) grad = "linear-gradient(135deg, #ffd32a, #ffa801)";
            el.innerHTML = `<span class="stylish-first-letter" style="--letter-grad: ${grad};">${firstChar}</span>${rest}`;
        } else {
            el.textContent = txt;
        }
    }
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
    const basePrices = {
        first: 14.99,
        second: 39.99,
        third: 119.99
    };
    
    const yearlyPrices = {
        first: 143.9,
        second: 359.9,
        third: 1000.9
    };
    
    const updatePrices = (period, months = 1) => {
        let suffix = '/month';
        let isYearly = false;
        
        if (period === 'year') {
            suffix = '/year';
            isYearly = true;
        } else if (period === 'custom') {
            suffix = `/per ${months} months`;
            if (customValueDisplay) customValueDisplay.textContent = `${months} months`;
        }
        
        const priceEls = {
            first: document.querySelector('.first-tariff .tariff__number'),
            second: document.querySelector('.second-tariff .tariff__number'),
            third: document.querySelector('.third-tariff .tariff__number')
        };
        const periodEls = {
            first: document.querySelector('.first-tariff .tariff__period'),
            second: document.querySelector('.second-tariff .tariff__period'),
            third: document.querySelector('.third-tariff .tariff__period')
        };
        const yearlyInfoEls = {
            first: document.querySelector('.first-tariff .tariff__yearly-info'),
            second: document.querySelector('.second-tariff .tariff__yearly-info'),
            third: document.querySelector('.third-tariff .tariff__yearly-info')
        };
        
        if (priceEls.first && periodEls.first) {
            let p = isYearly ? yearlyPrices.first : (period === 'custom' ? basePrices.first * months : basePrices.first);
            priceEls.first.textContent = '$' + p;
            periodEls.first.textContent = suffix;
            if(yearlyInfoEls.first) yearlyInfoEls.first.style.display = isYearly ? 'flex' : 'none';
        }
        if (priceEls.second && periodEls.second) {
            let p = isYearly ? yearlyPrices.second : (period === 'custom' ? basePrices.second * months : basePrices.second);
            priceEls.second.textContent = '$' + p;
            periodEls.second.textContent = suffix;
            if(yearlyInfoEls.second) yearlyInfoEls.second.style.display = isYearly ? 'flex' : 'none';
        }
        if (priceEls.third && periodEls.third) {
            let p = isYearly ? yearlyPrices.third : (period === 'custom' ? basePrices.third * months : basePrices.third);
            priceEls.third.textContent = '$' + p;
            periodEls.third.textContent = suffix;
            if(yearlyInfoEls.third) yearlyInfoEls.third.style.display = isYearly ? 'flex' : 'none';
        }
    };
    
    let currentPeriod = 'month';
    
    billingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            billingBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentPeriod = btn.dataset.period;
            
            if (currentPeriod === 'custom') {
                if (customContainer) customContainer.style.display = 'block';
                let months = customRange ? parseInt(customRange.value) : 1;
                updatePrices('custom', months);
            } else {
                if (customContainer) customContainer.style.display = 'none';
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
    // Р В РІР‚в„ўР В РЎвЂ™Р В РІР‚вЂњР В РЎСљР В РЎвЂє: Р В вЂ”Р В Р’В°Р В РЎВР В Р’ВµР В Р вЂ¦Р В РЎвЂ Р РЋР С“Р РЋР С“Р РЋРІР‚в„–Р В В»Р В РЎвЂќР РЋРЎвЂњ Р В Р вЂ¦Р В Р’В° URL Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂўР В Р’ВµР В РЎвЂ“Р В РЎвЂў Space Р В Р вЂ¦Р В Р’В° Hugging Face!
    const wsUrl = 'wss://РўР’РћР™-РЎР•Р Р’Р•Р .hf.space/ws/browser'; 
    
    // Р В Р Р‹Р В РЎвЂўР В Р’В·Р В РўвЂР В Р’В°Р В Р’ВµР В РЎВ Р РЋР С“Р В РЎвЂўР В РЎвЂўР В Р’В±Р РЋРІР‚В°Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В Р вЂ  Р РЋРІР‚РЋР В Р’В°Р РЋРІР‚С™Р В Р’Вµ Р В РЎвЂўР РЋРІР‚С™ Р В РЎвЂР В РЎВР В Р’ВµР В Р вЂ¦Р В РЎвЂ Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р РЋР С“ Р РЋРІР‚РЋР В Р’ВµР РЋР вЂљР В Р вЂ¦Р РЋРІР‚в„–Р В РЎВ Р РЋР РЉР В РЎвЂќР РЋР вЂљР В Р’В°Р В Р вЂ¦Р В РЎвЂўР В РЎВ
    const msgId = "browser-" + Date.now();
    const uiHtml = `
        <div style="font-size: 13px; color: #00f2ff; margin-bottom: 8px;">
            <i class="ph ph-globe"></i> Solifon Agent РїРѕРґРєР»СЋС‡РµРЅ Рє РёРЅС‚РµСЂРЅРµС‚Сѓ...
        </div>
        <div style="font-size: 14px; margin-bottom: 10px;"><b>Р¦РµР»СЊ:</b> ${task}</div>
        <img id='Р—Р°РіСЂСѓР·РєР° РѕР±Р»Р°С‡РЅРѕРіРѕ Р±СЂР°СѓР·РµСЂР°...' src="" style="width: 100%; border-radius: 12px; border: 1px solid #00f2ff; background: #050505; min-height: 200px;" alt="Р В вЂ”Р В Р’В°Р В РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР В Р’В·Р В РЎвЂќР В Р’В° Р В РЎвЂўР В Р’В±Р В В»Р В Р’В°Р РЋРІР‚РЋР В Р вЂ¦Р В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В Р’В±Р РЋР вЂљР В Р’В°Р РЋРЎвЂњР В Р’В·Р В Р’ВµР РЋР вЂљР В Р’В°...">
        <div id="btn-${msgId}" style="display: none; margin-top: 10px;"></div>
    `;
    
    // Р В Р’В Р вЂ™Р’ВР РЋР С“Р В РЎвЂ”Р В РЎвЂўР В В»Р РЋР Р‰Р В Р’В·Р РЋРЎвЂњР В Р’ВµР В РЎВ Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂўР РЋР вЂ№ Р В РЎвЂ“Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР В Р вЂ Р РЋРЎвЂњР РЋР вЂ№ Р РЋРІР‚С›Р РЋРЎвЂњР В Р вЂ¦Р В РЎвЂќР РЋРІР‚В Р В РЎвЂР РЋР вЂ№ Р В РўвЂР В РЎвЂўР В Р’В±Р В Р’В°Р В Р вЂ Р В В»Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р РЋР С“Р В РЎвЂўР В РЎвЂўР В Р’В±Р РЋРІР‚В°Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В РІвЂћвЂ“ (Р В Р’ВµР РЋР С“Р В В»Р В РЎвЂ Р В РЎвЂўР В Р вЂ¦Р В Р’В° Р В Р вЂ¦Р В Р’В°Р В Р’В·Р РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р В Р’ВµР РЋРІР‚С™Р РЋР С“Р РЋР РЏ Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќ)
    // Р›РёР±Рѕ РїСЂРѕСЃС‚Рѕ СЃРѕР·РґР°Р№ div Рё РґРѕР±Р°РІСЊ РµРіРѕ РІ #messagesContainer
    const container = document.getElementById('messagesContainer');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message';
    msgDiv.innerHTML = `<div class="text">${uiHtml}</div>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    // Р В вЂ”Р В Р’В°Р В РЎвЂ”Р РЋРЎвЂњР РЋР С“Р В РЎвЂќР В Р’В°Р В Р’ВµР В РЎВ WebSocket
    const ws = new WebSocket(wsUrl);
    const screen = document.getElementById(msgId);
    const btnContainer = document.getElementById(`btn-${msgId}`);

    ws.onopen = () => { ws.send(task); };

    ws.onmessage = (event) => {
        const data = event.data;
        if (data.startsWith("data:image")) {
            screen.src = data; // Р В РЎСџР В РЎвЂўР В РЎвЂќР В Р’В°Р В Р’В·Р РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р В Р’ВµР В РЎВ Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р РЋР С“Р В В»Р РЋР РЏР РЋРІР‚В Р В РЎвЂР РЋР вЂ№
            container.scrollTop = container.scrollHeight;
        } 
        else if (data.startsWith('РћС€РёР±РєР°')) {
            const link = data.split("LINK:")[1];
            btnContainer.style.display = "block";
            btnContainer.innerHTML = `<a href="${link}" target="_blank" style="padding: 10px 20px; background: #00f2ff; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">рџ“Ґ РЎРєР°С‡Р°С‚СЊ СЂРµР·СѓР»СЊС‚Р°С‚</a>`;
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
    window.addEventListener('resize', updateLamp);
});


// ============================================================
// AUTOCOMPLETE SYSTEM вЂ” Ghost Text + Dropdown Suggestions
// Based on cleaned_data.json (ru + en + kz)
// ============================================================
(function() {
    // ---- Р В РІР‚ВР В Р’В°Р В Р’В·Р В Р’В° Р В РўвЂР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦ Р В РЎвЂР В Р’В· cleaned_data.json ----
    const generatedData = {
        "ru": [
            "С‡С‚Рѕ С‚Р°РєРѕРµ API","С‡С‚Рѕ С‚Р°РєРѕРµ С†РёРєР»С‹","С‡С‚Рѕ С‚Р°РєРѕРµ Р»РѕСѓРєРѕРґ","С‡С‚Рѕ С‚Р°РєРѕРµ РѕР±Р»Р°РєРѕ",
            "Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р В Р’В±Р РЋРІР‚в„–Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂў Р РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋРЎвЂњР В В»Р РЋРЎвЂњР РЋРІР‚РЋР РЋРІвЂљВ¬Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋР вЂљР В Р’ВµР РЋРІР‚РЋР РЋР Р‰","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР вЂљР В Р’В°Р В Р’В·Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ”Р В Р’В°Р В РЎВР РЋР РЏР РЋРІР‚С™Р РЋР Р‰","Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„– Р В Р’В±Р В Р’В°Р В Р’В·Р РЋРІР‚в„– Р В РўвЂР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦",
            "Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„– Р В РЎвЂќР В РЎвЂўР В РўвЂР В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В Р’В°Р В В»Р В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋРІР‚С™Р В РЎВ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В Р’В±Р В В»Р В РЎвЂўР В РЎвЂќР РЋРІР‚РЋР В Р’ВµР В РІвЂћвЂ“Р В Р вЂ¦","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР В РЎвЂќР В РЎвЂўР В В»",
            "Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚В Р В Р’ВµР РЋР С“Р РЋР С“Р РЋРІР‚в„–","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР С“Р РЋРІР‚С™Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰ Р РЋРЎвЂњР В Р вЂ Р В Р’ВµР РЋР вЂљР В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В Р’ВµР В Р’Вµ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В Р вЂ¦Р В Р’ВµР В РІвЂћвЂ“Р РЋР вЂљР В РЎвЂўР РЋР С“Р В Р’ВµР РЋРІР‚С™Р РЋР Р‰","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р РЋРІР‚С›Р РЋР вЂљР В Р’ВµР В РІвЂћвЂ“Р В РЎВР В Р вЂ Р В РЎвЂўР РЋР вЂљР В РЎвЂќ",
            "Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р В Р вЂ¦Р В Р’В°Р В РІвЂћвЂ“Р РЋРІР‚С™Р В РЎвЂ Р В РЎВР В Р’ВµР В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В Р’В° Р В РЎвЂР РЋРІР‚С™","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР вЂљР В Р’В°Р В Р’В·Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В Р вЂ Р В Р вЂ¦Р В РЎвЂР В РЎВР В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР вЂљР В Р’В°Р В Р’В·Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋР С“Р В В»Р РЋРЎвЂњР РЋРІвЂљВ¬Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР С“Р В РЎвЂўР В Р’В·Р В РўвЂР В Р’В°Р РЋРІР‚С™Р РЋР Р‰ Р В Р вЂ Р В Р’ВµР В Р’В±-Р РЋР С“Р В Р’В°Р В РІвЂћвЂ“Р РЋРІР‚С™",
            "Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂ”Р В Р’ВµР РЋР вЂљР В Р’ВµР В РЎВР В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р РЋРІР‚РЋР В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В РЎвЂќР В РЎвЂўР В РўвЂ","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р В РЎвЂ“Р В РЎвЂўР В Р вЂ Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ”Р РЋРЎвЂњР В Р’В±Р В В»Р В РЎвЂР РЋРІР‚РЋР В Р вЂ¦Р В РЎвЂў","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р В Р вЂ¦Р В Р’В°Р РЋРЎвЂњР РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р РЋР Р‰Р РЋР С“Р РЋР РЏ Р РЋРЎвЂњР РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р РЋР Р‰Р РЋР С“Р РЋР РЏ",
            "Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋРЎвЂњР В В»Р РЋРЎвЂњР РЋРІР‚РЋР РЋРІвЂљВ¬Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В Р вЂ Р В Р вЂ¦Р В РЎвЂР В РЎВР В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ","Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„– Р В Р вЂ Р В Р’ВµР В Р’В±-Р РЋР вЂљР В Р’В°Р В Р’В·Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂќР В РЎвЂ","Р РЋРЎвЂњР В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р’В¶Р В Р вЂ¦Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РўвЂР В В»Р РЋР РЏ Р В РЎвЂ“Р В РЎвЂўР В В»Р В РЎвЂўР РЋР С“Р В Р’В°","Р РЋРЎвЂњР В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р’В¶Р В Р вЂ¦Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РўвЂР В В»Р РЋР РЏ Р В РўвЂР В РЎвЂР В РЎвЂќР РЋРІР‚В Р В РЎвЂР В РЎвЂ",
            "Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В Р’В±Р В Р’В°Р В Р’В·Р В Р’В° Р В РўвЂР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР вЂљР В Р’В°Р В Р’В·Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂўР РЋР вЂљР РЋРІР‚РЋР В Р’ВµР РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂў","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋРЎвЂњР РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р РЋР Р‰Р РЋР С“Р РЋР РЏ Р РЋР РЉР РЋРІР‚С›Р РЋРІР‚С›Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р В РЎвЂў","Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– Р РЋР вЂљР В Р’В°Р В Р’В·Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р В РЎвЂР РЋР РЏ Р В РЎвЂ”Р В Р’В°Р В РЎВР РЋР РЏР РЋРІР‚С™Р В РЎвЂ",
            "Р РЋРЎвЂњР В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р’В¶Р В Р вЂ¦Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РўвЂР В В»Р РЋР РЏ Р В РўвЂР РЋРІР‚в„–Р РЋРІР‚В¦Р В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎВР В РЎвЂР В РЎвЂќР РЋР вЂљР В РЎвЂўР РЋР С“Р В Р’ВµР РЋР вЂљР В Р вЂ Р В РЎвЂР РЋР С“Р РЋРІР‚в„–","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р РЋР С“Р В Р’ВµР РЋРІР‚С™Р В Р’ВµР В Р вЂ Р В РЎвЂўР В РІвЂћвЂ“ Р РЋР С“Р В В»Р В РЎвЂўР В РІвЂћвЂ“","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р В Р’В±Р РЋРІР‚в„–Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂў Р В Р вЂ Р РЋРІР‚в„–Р РЋРЎвЂњР РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋР С“Р РЋРІР‚С™Р В РЎвЂР РЋРІР‚В¦",
            "Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋРЎвЂњР В В»Р РЋРЎвЂњР РЋРІР‚РЋР РЋРІвЂљВ¬Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ”Р РЋРЎвЂњР В Р вЂ¦Р В РЎвЂќР РЋРІР‚С™Р РЋРЎвЂњР В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР вЂ№","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В Р вЂ Р В РЎвЂР РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњР В Р’В°Р В В»Р В РЎвЂР В Р’В·Р В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР вЂљР В Р’В°Р В Р’В·Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂќР В РЎвЂўР В РЎВР В РЎВР РЋРЎвЂњР В Р вЂ¦Р В РЎвЂР В РЎвЂќР В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР вЂ№","Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– spaced repetition",
            "РѕСЃРЅРѕРІС‹ Р±СЌРєРµРЅРґ СЂР°Р·СЂР°Р±РѕС‚РєРё","РѕСЃРЅРѕРІС‹ РїР°С‚С‚РµСЂРЅРѕРІ РґРёР·Р°Р№РЅР°","РѕСЃРЅРѕРІС‹ С‚РµСЃС‚РёСЂРѕРІР°РЅРёСЏ РєРѕРґР°","С‡С‚Рѕ С‚Р°РєРѕРµ Р±РѕР»СЊС€РёРµ РґР°РЅРЅС‹Рµ",
            "С‡С‚Рѕ С‚Р°РєРѕРµ РёРЅС‚РµСЂРЅРµС‚ РІРµС‰РµР№","С‡С‚Рѕ С‚Р°РєРѕРµ РЅРµР№СЂРѕРЅРЅР°СЏ СЃРµС‚СЊ","С‡С‚Рѕ С‚Р°РєРѕРµ РїР°СЂСЃРёРЅРі РґР°РЅРЅС‹С…","РєР°Рє РёР·Р±Р°РІРёС‚СЊСЃСЏ РѕС‚ Р°РєС†РµРЅС‚Р°",
            "Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р В Р вЂ¦Р В Р’В°Р РЋРЎвЂњР РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р РЋР Р‰Р РЋР С“Р РЋР РЏ Р В РЎвЂ”Р РЋР вЂљР В Р’ВµР В Р’В·Р В Р’ВµР В Р вЂ¦Р РЋРІР‚С™Р В Р’В°Р РЋРІР‚В Р В РЎвЂР В РЎвЂ","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋРЎвЂњР В В»Р РЋРЎвЂњР РЋРІР‚РЋР РЋРІвЂљВ¬Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂќР В РЎвЂўР В Р вЂ¦Р РЋРІР‚В Р В Р’ВµР В Р вЂ¦Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР вЂ№","Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– Р В Р’В°Р В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– Р В РЎвЂ“Р В В»Р РЋРЎвЂњР В Р’В±Р В РЎвЂўР В РЎвЂќР В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ",
            "Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„– Р В РЎвЂќР В РЎвЂўР В РЎВР В РЎвЂ”Р РЋР Р‰Р РЋР вЂ№Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦ Р РЋР С“Р В Р’ВµР РЋРІР‚С™Р В Р’ВµР В РІвЂћвЂ“","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В Р вЂ Р В Р’ВµР РЋР вЂљР РЋР С“Р В РЎвЂР В РЎвЂўР В Р вЂ¦Р В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂќР В РЎвЂўР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В РІвЂћвЂ“Р В Р вЂ¦Р В Р’ВµР РЋР вЂљР В РЎвЂР В Р’В·Р В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎВР В Р’В°Р РЋРІвЂљВ¬Р В РЎвЂР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В Р’Вµ Р В Р’В·Р РЋР вЂљР В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ",
            "РєР°Рє РЅР°СЃС‚СЂРѕРёС‚СЊ РіРѕР»РѕСЃ РґРёРєС†РёСЋ","РєР°Рє СѓР»СѓС‡С€РёС‚СЊ СЃРєРѕСЂРѕСЃС‚СЊ СЂРµС‡Рё","РѕСЃРЅРѕРІС‹ РґРёР·Р°Р№РЅР° РёРЅС‚РµСЂС„РµР№СЃРѕРІ","РѕСЃРЅРѕРІС‹ Р·Р°С‰РёС‚С‹ РѕС‚ РєРёР±РµСЂР°С‚Р°Рє",
            "РѕСЃРЅРѕРІС‹ С„СЂРѕРЅС‚РµРЅРґ СЂР°Р·СЂР°Р±РѕС‚РєРё","РїРѕРґРіРѕС‚РѕРІРєР° Рє С€РєРѕР»Рµ Р»РѕРіРѕРїРµРґ","СѓРїСЂР°Р¶РЅРµРЅРёСЏ РґР»СЏ Р°СЂС‚РёРєСѓР»СЏС†РёРё","СѓРїСЂР°Р¶РЅРµРЅРёСЏ РґР»СЏ Р±РµРіР»РѕР№ СЂРµС‡Рё",
            "Р РЋРЎвЂњР В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р’В¶Р В Р вЂ¦Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РўвЂР В В»Р РЋР РЏ Р РЋРЎвЂњР В Р вЂ Р В Р’ВµР РЋР вЂљР В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р В РЎвЂ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎВР В РЎвЂР В РЎвЂќР РЋР вЂљР В РЎвЂўР В Р’В°Р РЋР вЂљР РЋРІР‚В¦Р В РЎвЂР РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р РЋРЎвЂњР РЋР вЂљР В Р’В°","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂўР В Р’В±Р В В»Р В Р’В°Р РЋРІР‚РЋР В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ Р РЋР С“Р В Р’ВµР РЋР вЂљР В Р вЂ Р В РЎвЂР РЋР С“Р РЋРІР‚в„–","Р В Р’В·Р В Р’В°Р В РЎвЂР В РЎвЂќР В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р РЋРЎвЂњ Р В Р вЂ Р В Р’В·Р РЋР вЂљР В РЎвЂўР РЋР С“Р В В»Р РЋРІР‚в„–Р РЋРІР‚В¦ Р В В»Р В Р’ВµР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ",
            "Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р В РЎвЂўР РЋР вЂљР В РЎвЂ“Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’В·Р В РЎвЂўР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰ Р РЋР С“Р В Р вЂ Р В РЎвЂўР В Р’Вµ Р В Р вЂ Р РЋР вЂљР В Р’ВµР В РЎВР РЋР РЏ","Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– Р В Р’В°Р В РўвЂР В Р’В°Р В РЎвЂ”Р РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В Р’В±Р В В»Р В Р’ВµР В РЎВР В Р вЂ¦Р В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„– Р В РЎВР В РЎвЂўР В Р’В±Р В РЎвЂР В В»Р РЋР Р‰Р В Р вЂ¦Р В РЎвЂўР В РІвЂћвЂ“ Р РЋР вЂљР В Р’В°Р В Р’В·Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂќР В РЎвЂ",
            "Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂќР В РЎвЂР В Р’В±Р В Р’ВµР РЋР вЂљР В Р’В±Р В Р’ВµР В Р’В·Р В РЎвЂўР В РЎвЂ”Р В Р’В°Р РЋР С“Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎВР В Р’В°Р РЋРІвЂљВ¬Р В РЎвЂР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В Р’Вµ Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂўР В Р’В±Р В В»Р В Р’В°Р В РЎвЂќР В РЎвЂў Р В Р вЂ Р РЋРІР‚в„–Р РЋРІР‚РЋР В РЎвЂР РЋР С“Р В В»Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В РІвЂћвЂ“","Р В РўвЂР В РЎвЂР В Р’В·Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋР вЂљР В РЎвЂР РЋР РЏ Р РЋР С“Р В РЎвЂР В РЎВР В РЎвЂ”Р РЋРІР‚С™Р В РЎвЂўР В РЎВР РЋРІР‚в„– Р В РЎвЂ Р В В»Р В Р’ВµР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ",
            "РєР°Рє РЅР°СѓС‡РёС‚СЊСЃСЏ РіРѕРІРѕСЂРёС‚СЊ С‡РµС‚РєРѕ","РєР°Рє РїСЂРµРѕРґРѕР»РµС‚СЊ Р·Р°СЃС‚РµРЅС‡РёРІРѕСЃС‚СЊ","РєР°Рє СЂР°Р·РІРёС‚СЊ СѓРІРµСЂРµРЅРЅРѕСЃС‚СЊ СЂРµС‡Рё","РєР°Рє СѓР»СѓС‡С€РёС‚СЊ Р·РІСѓС‡Р°РЅРёРµ РіРѕР»РѕСЃР°",
            "Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋРЎвЂњР В В»Р РЋРЎвЂњР РЋРІР‚РЋР РЋРІвЂљВ¬Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ”Р В РЎвЂР РЋР С“Р РЋР Р‰Р В РЎВР В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р РЋРЎвЂњР РЋР вЂ№ Р РЋР вЂљР В Р’ВµР РЋРІР‚РЋР РЋР Р‰","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋРЎвЂњР В В»Р РЋРЎвЂњР РЋРІР‚РЋР РЋРІвЂљВ¬Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋР С“Р В В»Р В РЎвЂўР В Р вЂ Р В Р’В°Р РЋР вЂљР В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В Р’В·Р В Р’В°Р В РЎвЂ”Р В Р’В°Р РЋР С“","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋРЎвЂњР В В»Р РЋРЎвЂњР РЋРІР‚РЋР РЋРІвЂљВ¬Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋРІР‚РЋР РЋРЎвЂњР В Р вЂ Р РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂў Р В Р вЂ Р РЋР вЂљР В Р’ВµР В РЎВР В Р’ВµР В Р вЂ¦Р В РЎвЂ","Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– Р В РЎвЂ“Р В Р’ВµР В РІвЂћвЂ“Р В РЎВР В РЎвЂР РЋРІР‚С›Р В РЎвЂР В РЎвЂќР В Р’В°Р РЋРІР‚В Р В РЎвЂР В РЎвЂ Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ",
            "Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– Р РЋР вЂљР В Р’В°Р В Р’В·Р В Р вЂ Р В РЎвЂР В Р вЂ Р В Р’В°Р РЋР вЂ№Р РЋРІР‚В°Р В Р’ВµР В РЎвЂ“Р В РЎвЂў Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„– Р В Р вЂ Р РЋРІР‚в„–Р РЋРІР‚РЋР В РЎвЂР РЋР С“Р В В»Р В РЎвЂР РЋРІР‚С™Р В Р’ВµР В В»Р РЋР Р‰Р В Р вЂ¦Р В РЎвЂўР В РІвЂћвЂ“ Р РЋРІР‚С™Р В Р’ВµР В РЎвЂўР РЋР вЂљР В РЎвЂР В РЎвЂ","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р В Р вЂ Р РЋРІР‚в„–Р РЋРЎвЂњР РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋРІР‚С™Р В Р’В°Р В Р’В±Р В В»Р В РЎвЂР РЋРІР‚В Р РЋРЎвЂњ Р РЋРЎвЂњР В РЎВР В Р вЂ¦Р В РЎвЂўР В Р’В¶Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р В Р вЂ¦Р В Р’В°Р РЋРЎвЂњР РЋРІР‚РЋР В РЎвЂР РЋРІР‚С™Р РЋР Р‰Р РЋР С“Р РЋР РЏ Р В РЎвЂР В РЎВР В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В Р вЂ Р В РЎвЂР В Р’В·Р В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰",
            "Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– Р В Р’В·Р В Р’В°Р В РЎвЂ”Р В РЎвЂўР В РЎВР В РЎвЂР В Р вЂ¦Р В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С›Р В РЎвЂўР РЋР вЂљР В РЎВР В Р’В°Р РЋРІР‚В Р В РЎвЂР В РЎвЂ","Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„– Р В Р’В°Р РЋР вЂљР РЋРІР‚В¦Р В РЎвЂР РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р РЋРЎвЂњР РЋР вЂљР РЋРІР‚в„– Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР В В»Р В РЎвЂўР В Р’В¶Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В РІвЂћвЂ“","Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„– Р В РўвЂР В Р’В¶Р В Р’В°Р В Р вЂ Р В Р’В° Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РЎвЂ“Р РЋР вЂљР В Р’В°Р В РЎВР В РЎВР В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„– Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РЎвЂ“Р РЋР вЂљР В Р’В°Р В РЎВР В РЎВР В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РЎвЂ”Р В РЎвЂР РЋРІР‚С™Р В РЎвЂўР В Р вЂ¦",
            "Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В Р вЂ¦Р В Р’В°Р РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р В РЎвЂўР В Р’Вµ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР В В»Р В РЎвЂўР В Р’В¶Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂўР В Р’В±Р В В»Р В Р’В°Р РЋРІР‚РЋР В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ Р РЋРІР‚С™Р В Р’ВµР РЋРІР‚В¦Р В Р вЂ¦Р В РЎвЂўР В В»Р В РЎвЂўР В РЎвЂ“Р В РЎвЂР В РЎвЂ","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р В РЎвЂ”Р РЋР вЂљР В Р’ВµР В РЎвЂўР В РўвЂР В РЎвЂўР В В»Р В Р’ВµР РЋРІР‚С™Р РЋР Р‰ Р РЋР РЏР В Р’В·Р РЋРІР‚в„–Р В РЎвЂќР В РЎвЂўР В Р вЂ Р В РЎвЂўР В РІвЂћвЂ“ Р В Р’В±Р В Р’В°Р РЋР вЂљР РЋР Р‰Р В Р’ВµР РЋР вЂљ","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР РЋРЎвЂњР В РЎвЂќР РЋРІР‚С™Р РЋРЎвЂњР РЋР вЂљР В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С›Р В РЎвЂўР РЋР вЂљР В РЎВР В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР вЂ№",
            "Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В Р’В°Р В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р РЋР вЂљР В Р’В°Р В Р’В·Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р В РЎвЂР В Р’Вµ Р В РЎвЂќР РЋР вЂљР В РЎвЂР РЋРІР‚С™Р В РЎвЂР РЋРІР‚РЋР В Р’ВµР РЋР С“Р В РЎвЂќР В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В РЎВР РЋРІР‚в„–Р РЋРІвЂљВ¬Р В В»Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂќР В Р вЂ Р В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„–Р В Р’Вµ Р В РЎвЂќР В РЎвЂўР В РЎВР В РЎвЂ”Р РЋР Р‰Р РЋР вЂ№Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚в„–","Р РЋРЎвЂњР В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р’В¶Р В Р вЂ¦Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РўвЂР В В»Р РЋР РЏ Р РЋР вЂљР В Р’ВµР РЋРІР‚РЋР В Р’ВµР В Р вЂ Р В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В РўвЂР РЋРІР‚в„–Р РЋРІР‚В¦Р В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР РЏ",
            "Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В Р вЂ Р В РЎвЂР РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњР В Р’В°Р В В»Р РЋР Р‰Р В Р вЂ¦Р В Р’В°Р РЋР РЏ Р РЋР вЂљР В Р’ВµР В Р’В°Р В В»Р РЋР Р‰Р В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂ“Р РЋР вЂљР В Р’В°Р РЋРІР‚С›Р В РЎвЂР РЋРІР‚РЋР В Р’ВµР РЋР С“Р В РЎвЂќР В РЎвЂР В Р’Вµ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚В Р В Р’ВµР РЋР С“Р РЋР С“Р В РЎвЂўР РЋР вЂљР РЋРІР‚в„–","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР вЂљР В Р’В°Р В Р’В·Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂўР РЋР вЂљР В Р’В°Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР РЋР С“Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎВР В Р’В°Р РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂў","Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В РўвЂР В Р’ВµР РЋРІР‚С™Р В Р’ВµР В РІвЂћвЂ“ Р В РЎвЂР В Р вЂ¦Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В РЎВР РЋРЎвЂњ Р РЋР РЏР В Р’В·Р РЋРІР‚в„–Р В РЎвЂќР РЋРЎвЂњ",
            "Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р В РЎвЂР РЋР С“Р В РЎвЂќР РЋРЎвЂњР РЋР С“Р РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В В»Р В В»Р В Р’ВµР В РЎвЂќР РЋРІР‚С™","Р В РЎВР В Р’ВµР РЋРІР‚С™Р В РЎвЂўР В РўвЂР РЋРІР‚в„– Р В РЎвЂ”Р В РЎвЂўР В Р вЂ Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂўР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р В Р’ВµР В В»Р РЋР Р‰Р В Р вЂ¦Р В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В РЎвЂўР В Р’В±Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р В РЎвЂќР В РЎвЂўР РЋР вЂљР РЋР вЂљР В Р’ВµР В РЎвЂќР РЋРІР‚В Р В РЎвЂР РЋР РЏ Р В Р вЂ¦Р В Р’В°Р РЋР вЂљР РЋРЎвЂњР РЋРІвЂљВ¬Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В РІвЂћвЂ“ Р В РЎвЂ”Р В РЎвЂР РЋР С“Р РЋР Р‰Р В РЎВР В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В РІвЂћвЂ“ Р РЋР вЂљР В Р’ВµР РЋРІР‚РЋР В РЎвЂ","Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р РЋРІР‚в„– Р РЋР С“Р В РЎвЂР РЋР С“Р РЋРІР‚С™Р В Р’ВµР В РЎВР В Р вЂ¦Р В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В Р’В°Р В РўвЂР В РЎВР В РЎвЂР В Р вЂ¦Р В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР РЏ",
            "Р РЋРІР‚С™Р В Р’ВµР РЋРІР‚В¦Р В Р вЂ¦Р В РЎвЂР В РЎвЂќР В РЎвЂ Р В Р’В·Р В Р’В°Р В РЎвЂ”Р В РЎвЂўР В РЎВР В РЎвЂР В Р вЂ¦Р В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В Р’В°Р В Р вЂ¦Р В РЎвЂ“Р В В»Р В РЎвЂР В РІвЂћвЂ“Р РЋР С“Р В РЎвЂќР В РЎвЂР РЋРІР‚В¦ Р РЋР С“Р В В»Р В РЎвЂўР В Р вЂ ","Р В Р вЂ¦Р В Р’В°Р РЋР вЂљР РЋРЎвЂњР РЋРІвЂљВ¬Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РЎвЂ“Р В РЎвЂўР В В»Р В РЎвЂўР РЋР С“Р В Р’В° Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР РЋРІР‚РЋР В РЎвЂР В Р вЂ¦Р РЋРІР‚в„– Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚С›Р В РЎвЂР В В»Р В Р’В°Р В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В РЎвЂќР В Р’В°","Р В РЎвЂќР В Р’В°Р В РЎвЂќ Р РЋР вЂљР В Р’В°Р В Р’В·Р В Р вЂ Р В РЎвЂР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В Р’Вµ Р В РЎВР РЋРІР‚в„–Р РЋРІвЂљВ¬Р В В»Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ",
            "Р РЋРЎвЂњР В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р’В¶Р В Р вЂ¦Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РўвЂР В В»Р РЋР РЏ Р В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р вЂ Р В РЎвЂР В В»Р РЋР Р‰Р В Р вЂ¦Р В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РЎвЂР В Р’В·Р В Р вЂ¦Р В РЎвЂўР РЋРІвЂљВ¬Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ","Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂў Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂўР В Р’Вµ Р РЋРІР‚С™Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РЎвЂ“Р РЋР вЂљР В Р’В°Р В РЎВР В РЎВР В Р вЂ¦Р В РЎвЂўР В РЎвЂ“Р В РЎвЂў Р В РЎвЂўР В Р’В±Р В Р’ВµР РЋР С“Р В РЎвЂ”Р В Р’ВµР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ"
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
            "Р В Р’В°Р В РІвЂћвЂ“Р СћРІР‚С”Р РЋРІР‚в„–Р В Р вЂ¦ Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ","Р В Р’В¶Р В Р’В°Р В РўвЂР РЋРІР‚в„–Р В Р вЂ¦Р РЋРІР‚в„– Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ","Р В Р вЂ¦Р В Р’В°Р В Р’В·Р В Р’В°Р РЋР вЂљР В РўвЂР РЋРІР‚в„– Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ","API Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎвЂќР В РЎвЂўР В РўвЂР РЋРІР‚С™Р В Р’В°Р РЋРЎвЂњ Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ",
            "Р В РўвЂР В Р’В°Р РЋРЎвЂњР РЋРІР‚в„–Р РЋР С“ Р В Р’В¶Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р СћРІР‚СљР РЋРЎвЂњР В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–","Р В РЎвЂўР СћРІР‚С”Р РЋРЎвЂњР В РўвЂР РЋРІР‚в„– Р В РЎвЂўР СћРІР‚С”Р РЋРЎвЂњР В РўвЂР РЋРІР‚в„– Р СћР вЂЎР В РІвЂћвЂ“Р РЋР вЂљР В Р’ВµР В Р вЂ¦Р РЋРЎвЂњ","UI Р В РўвЂР В РЎвЂР В Р’В·Р В Р’В°Р В РІвЂћвЂ“Р В Р вЂ¦ Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В Р’В¶Р РЋРІР‚в„–Р В В»Р В РўвЂР В Р’В°Р В РЎВ Р В РЎвЂўР СћРІР‚С”Р РЋРЎвЂњ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ",
            "Р В Р’В°Р В РІвЂћвЂ“Р РЋРІР‚С™Р РЋРІР‚в„–Р В В»Р РЋРІР‚в„–Р В РЎВР РЋРІР‚в„–Р В Р вЂ¦ Р В Р’В¶Р СћР’В±Р В РЎВР РЋР С“Р В Р’В°Р В РЎвЂ” Р В Р’ВµР РЋРІР‚С™Р РЋРЎвЂњ","Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦ Р РЋРІР‚С™Р СћР’В±Р РЋР вЂљР СћРІР‚СљР РЋРІР‚в„–Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦Р В Р’В°Р В Р вЂ¦ Р В РЎвЂўР В РІвЂћвЂ“Р В В»Р В Р’В°Р РЋРЎвЂњ","Р РЋР С“Р Р€Р’В©Р В Р’В·Р В РўвЂР РЋРІР‚вЂњР В РЎвЂќ Р СћРІР‚С”Р В РЎвЂўР РЋР вЂљР РЋРІР‚в„–Р В Р вЂ¦ Р В РЎвЂќР В Р’ВµР СћР в‚¬Р В Р’ВµР В РІвЂћвЂ“Р РЋРІР‚С™Р РЋРЎвЂњ","Р РЋРІР‚С™Р В Р’В°Р В Р’В· Р В РЎвЂќР В РЎвЂўР В РўвЂ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В Р’ВµР СћР в‚¬ Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р РЋРІР‚В Р В РЎвЂР В РЎвЂќР В В»Р В РўвЂР В Р’В°Р РЋР вЂљ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В Р’В°Р В В»Р В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋРІР‚С™Р В РЎВ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В Р’В±Р В В»Р В РЎвЂўР В РЎвЂќР РЋРІР‚РЋР В Р’ВµР В РІвЂћвЂ“Р В Р вЂ¦ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р В Р вЂ Р В Р’ВµР В Р’В±-Р Р€РІвЂћСћР В Р’В·Р РЋРІР‚вЂњР РЋР вЂљР В В»Р В Р’ВµР РЋРЎвЂњ Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В РўвЂР В Р’В°Р РЋРЎвЂњР РЋРІР‚в„–Р РЋР С“ Р РЋР С“Р В Р’В°Р В РЎвЂ”Р В Р’В°Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦ Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р РЋР вЂљР РЋРЎвЂњ","Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р РЋРІР‚вЂњ Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ Р РЋРІР‚С™Р В Р’ВµР РЋРІР‚В¦Р В Р вЂ¦Р В РЎвЂР В РЎвЂќР В Р’В°Р РЋР С“Р РЋРІР‚в„–","Р В РЎвЂўР В Р’В±Р В В»Р В Р’В°Р СћРІР‚С” Р РЋР С“Р В Р’ВµР РЋР вЂљР В Р вЂ Р В РЎвЂР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ Р РЋРІвЂљВ¬Р В РЎвЂўР В В»Р РЋРЎвЂњ",
            "Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР В РЎвЂќР В РЎвЂўР В В» Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎвЂ”Р РЋРЎвЂњР В Р вЂ¦Р В РЎвЂќР РЋРІР‚С™Р РЋРЎвЂњР В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏР В Р вЂ¦Р РЋРІР‚в„– Р В Р’В¶Р В Р’В°Р СћРІР‚С”Р РЋР С“Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњ","Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р РЋР С“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р вЂ¦ Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ","Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В Р’ВµР СћР в‚¬ Р В РЎВР В Р’В°Р РЋРІвЂљВ¬Р В РЎвЂР В Р вЂ¦Р В Р’В°Р В В»Р РЋРІР‚в„–Р СћРІР‚С” Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ",
            "Р РЋРІР‚С™Р РЋРІР‚в„–Р В Р вЂ¦Р РЋРІР‚в„–Р РЋР С“ Р В Р’В°Р В В»Р РЋРЎвЂњ Р В Р’В¶Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р СћРІР‚СљР РЋРЎвЂњР В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–","Р В Р’В°Р В РЎвЂќР РЋРІР‚В Р В Р’ВµР В Р вЂ¦Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚вЂњ Р В Р’В¶Р В РЎвЂўР РЋР вЂ№Р РЋРЎвЂњ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В Р вЂ Р В Р’ВµР В Р’В±-Р РЋР С“Р В Р’В°Р В РІвЂћвЂ“Р РЋРІР‚С™ Р СћРІР‚С”Р СћР’В±Р РЋР вЂљР РЋРЎвЂњ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В Р вЂ¦Р В Р’ВµР В РІвЂћвЂ“Р РЋР вЂљР В РЎвЂўР В Р’В¶Р В Р’ВµР В В»Р РЋРІР‚вЂњ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р РЋР С“Р В Р’В°Р РЋРІР‚В¦Р В Р’В°Р РЋР вЂљР В Р’В°Р РЋРЎвЂњ Р СћРІР‚С”Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚в„–Р В Р вЂ¦Р В Р’В°Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦ Р В Р’В¶Р В Р’ВµР СћР в‚¬Р РЋРЎвЂњ","Р РЋРІР‚С™Р В РЎвЂР РЋРІР‚вЂњР В РЎВР В РўвЂР РЋРІР‚вЂњ Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРІР‚в„–Р СћР в‚¬ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р РЋРІР‚С™Р РЋРІР‚вЂњР В В» Р В Р’В±Р В Р’В°Р РЋР вЂљР РЋР Р‰Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњР В Р вЂ¦Р В Р’Вµ Р РЋРІР‚С™Р СћР вЂЎР РЋР С“ Р В Р’В±Р В РЎвЂўР В В»Р РЋРЎвЂњ","Р РЋРЎвЂњР В Р’В°Р СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„– Р РЋРІР‚С™Р В РЎвЂР РЋРІР‚вЂњР В РЎВР В РўвЂР РЋРІР‚вЂњ Р В Р’В±Р В Р’В°Р РЋР С“Р СћРІР‚С”Р В Р’В°Р РЋР вЂљР РЋРЎвЂњ",
            "Р РЋРІР‚С›Р РЋР вЂљР В Р’ВµР В РІвЂћвЂ“Р В РЎВР В Р вЂ Р В РЎвЂўР РЋР вЂљР В РЎвЂќ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р СћР’В±Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦Р РЋРЎвЂњ Р В РўвЂР В Р’В°Р СћРІР‚СљР В РўвЂР РЋРІР‚в„–Р В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–Р В Р вЂ¦ Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ","spaced repetition Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚вЂњ","Р В Р’В°Р В РІвЂћвЂ“Р В Р вЂ¦Р РЋРІР‚в„–Р В РЎВР В Р’В°Р В В»Р РЋРІР‚в„–Р РЋР С“Р РЋРІР‚в„– Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р В РЎвЂР РЋРІР‚С™ Р РЋР С“Р В Р’В°Р В В»Р В Р’В°Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦Р В РўвЂР В Р’В° Р В Р’В¶Р СћР’В±Р В РЎВР РЋРІР‚в„–Р РЋР С“ Р РЋРІР‚С™Р В Р’В°Р В Р’В±Р РЋРЎвЂњ","Р В РЎвЂўР В РІвЂћвЂ“Р РЋРІР‚в„–Р В Р вЂ¦ Р СћРІР‚С”Р В РЎвЂўР В Р’В·Р СћРІР‚СљР В Р’В°Р РЋРЎвЂњ Р РЋРІР‚С™Р В Р’ВµР РЋРІР‚В¦Р В Р вЂ¦Р В РЎвЂР В РЎвЂќР В Р’В°Р В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–","Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚В Р В Р’ВµР РЋР С“Р РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р вЂ¦ Р В РЎвЂќР В РЎвЂўР В РўвЂ Р В Р’В¶Р В Р’В°Р В Р’В·Р РЋРЎвЂњР В РўвЂР РЋРІР‚в„– Р СћР вЂЎР В РІвЂћвЂ“Р РЋР вЂљР В Р’ВµР В Р вЂ¦Р РЋРЎвЂњ",
            "У©Р»РµТЈРґС– Т›Р°Р»Р°Р№ Р¶Р°С‚С‚Р°Рї Р°Р»Сѓ","Р°Р»Т“Р°С€Т›С‹ РєРѕРґС‚С‹ Т›Р°Р»Р°Р№ Р¶Р°Р·Сѓ","Р±РµРіР»С– СЃУ©Р№Р»РµСѓ Р¶Р°С‚С‚С‹Т“СѓР»Р°СЂС‹","Р±СЌРєРµРЅРґ У™Р·С–СЂР»РµСѓ РЅРµРіС–Р·РґРµСЂС–",
            "Р В Р’В¶Р В Р’В°Р В Р’В·Р В Р’В±Р В Р’В° Р СћРІР‚С”Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚в„–Р В Р вЂ¦Р В Р’В°Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦ Р В Р’В¶Р В Р’В°Р СћРІР‚С”Р РЋР С“Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњ","Р В Р’В¶Р В Р’ВµР В В»Р РЋРІР‚вЂњ Р СћРІР‚С”Р В Р’В°Р В Р’В±Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚в„– Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В Р’В¶Р СћР вЂЎР РЋР вЂљР В РЎвЂ“Р РЋРІР‚вЂњР В Р вЂ¦Р В РўвЂР РЋРІР‚вЂњР В РЎвЂќ Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В РЎвЂР В РЎВР В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В Р вЂ Р В РЎвЂР В Р’В·Р В Р’Вµ Р РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋРЎвЂњР В РўвЂР РЋРІР‚вЂњ Р СћР вЂЎР В РІвЂћвЂ“Р РЋР вЂљР В Р’ВµР В Р вЂ¦Р РЋРЎвЂњ",
            "Р В РЎВР В РЎвЂР В РЎвЂќР РЋР вЂљР В РЎвЂўР РЋР С“Р В Р’ВµР РЋР вЂљР В Р вЂ Р В РЎвЂР РЋР С“ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎВР В РЎвЂўР В Р’В±Р В РЎвЂР В В»Р РЋР Р‰Р В РўвЂР РЋРІР‚вЂњ Р СћРІР‚С”Р В РЎвЂўР РЋР С“Р РЋРІР‚в„–Р В РЎВР РЋРІвЂљВ¬Р В Р’В° Р Р€РІвЂћСћР В Р’В·Р РЋРІР‚вЂњР РЋР вЂљР В В»Р В Р’ВµР РЋРЎвЂњ","Р В РЎВР Р€РІвЂћСћР В В»Р РЋРІР‚вЂњР В РЎВР В Р’ВµР РЋРІР‚С™Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В РўвЂР РЋРІР‚вЂњ Р СћР’В±Р В РІвЂћвЂ“Р РЋРІР‚в„–Р В РЎВР В РўвЂР В Р’В°Р РЋР С“Р РЋРІР‚С™Р РЋРІР‚в„–Р РЋР вЂљР РЋРЎвЂњ","Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р СћРІР‚С”Р В Р’В°Р РЋР вЂљР СћРІР‚С”Р РЋРІР‚в„–Р В Р вЂ¦Р РЋРІР‚в„–Р В Р вЂ¦ Р В Р’В¶Р В Р’В°Р СћРІР‚С”Р РЋР С“Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњ",
            "Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В Р’ВµР СћР в‚¬ Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р РЋРІР‚С™Р РЋРІР‚в„–Р СћР в‚¬Р В РўвЂР В Р’В°Р РЋРЎвЂњ Р В РўвЂР В Р’В°Р СћРІР‚СљР В РўвЂР РЋРІР‚в„–Р В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–Р В Р вЂ¦ Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ","Р СћР вЂЎР В РІвЂћвЂ“Р В РўвЂР В Р’Вµ Р В В»Р В РЎвЂўР В РЎвЂ“Р В РЎвЂўР В РЎвЂ”Р В Р’ВµР В РўвЂ Р В Р’В¶Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р СћРІР‚СљР РЋРЎвЂњР В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–","Р В Р’В°Р РЋРЎвЂњР РЋРІР‚в„–Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦Р В РўвЂР РЋРІР‚в„– Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р В РЎвЂќР В Р’ВµР СћР в‚¬Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ",
            "Р В Р’В±Р РЋР РЉР В РЎвЂќР В Р’ВµР В Р вЂ¦Р В РўвЂ Р РЋР вЂљР В Р’В°Р В Р’В·Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂќР В Р’В° Р В РЎвЂўР СћРІР‚С”Р РЋРЎвЂњР В В»Р РЋРІР‚в„–Р СћРІР‚СљР РЋРІР‚в„–","Р В РўвЂР В Р’В°Р РЋРЎвЂњР РЋРІР‚в„–Р РЋР С“ Р РЋРІР‚С™Р РЋРІР‚в„–Р В Р вЂ¦Р РЋРІР‚в„–Р РЋР С“ Р В Р’В°Р В В»Р РЋРЎвЂњ Р РЋРІР‚С™Р В Р’ВµР РЋРІР‚В¦Р В Р вЂ¦Р В РЎвЂР В РЎвЂќР В Р’В°Р РЋР С“Р РЋРІР‚в„–","Р В РЎвЂќР РЋР вЂљР В Р’ВµР В Р’В°Р РЋРІР‚С™Р В РЎвЂР В Р вЂ Р РЋРІР‚С™Р РЋРІР‚вЂњР В РЎвЂќ Р В РЎвЂўР В РІвЂћвЂ“Р В В»Р В Р’В°Р РЋРЎвЂњР В РўвЂР РЋРІР‚в„– Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ","Р В РЎВР В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В Р’ВµР В РЎвЂ”Р В РЎвЂќР В Р’Вµ Р В РўвЂР В Р’В°Р В РІвЂћвЂ“Р РЋРІР‚в„–Р В Р вЂ¦Р В РўвЂР РЋРІР‚в„–Р СћРІР‚С” Р В В»Р В РЎвЂўР В РЎвЂ“Р В РЎвЂўР В РЎвЂ”Р В Р’ВµР В РўвЂ",
            "Р В РЎВР Р€РІвЂћСћР В В»Р РЋРІР‚вЂњР В РЎВР В Р’ВµР РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚вЂњ Р РЋР С“Р В Р’В°Р СћРІР‚С”Р РЋРІР‚С™Р В Р’В°Р РЋРЎвЂњ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В РЎВР Р€РІвЂћСћР РЋР С“Р В Р’ВµР В В»Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР СћР в‚¬ Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р РЋРІР‚вЂњР В Р вЂ¦Р В РўвЂР В Р’Вµ Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ","Р РЋРІР‚С™Р СћР вЂЎР В Р вЂ¦Р В РўвЂР РЋРІР‚вЂњР В РЎвЂ“Р РЋРІР‚вЂњР В Р вЂ¦ Р В Р’В±Р В Р’ВµР РЋР вЂљР РЋРЎвЂњ Р В Р’В¶Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р СћРІР‚СљР РЋРЎвЂњР В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–","Р РЋРЎвЂњР В Р’В°Р СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™ Р В Р’В±Р В Р’В°Р РЋР С“Р СћРІР‚С”Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦ Р В Р’В¶Р В Р’В°Р СћРІР‚С”Р РЋР С“Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњ",
            "Р В Р вЂ Р В Р’ВµР В Р’В± Р РЋР С“Р В РЎвЂќР РЋР вЂљР В Р’ВµР В РІвЂћвЂ“Р В РЎвЂ”Р В РЎвЂР В Р вЂ¦Р В РЎвЂ“ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В Р вЂ Р В РЎвЂР РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњР В Р’В°Р В В»Р В РЎвЂР В Р’В·Р В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В Р’ВµР РЋР С“Р В Р’ВµР В РЎвЂ”Р РЋРІР‚С™Р В Р’ВµР РЋРЎвЂњ Р РЋРІР‚С™Р В Р’ВµР В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР РЏР РЋР С“Р РЋРІР‚в„– Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В Р’В¶Р В Р’В°Р В РўвЂР РЋРІР‚в„–Р В Р вЂ¦Р РЋРІР‚в„– Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р РЋР вЂљР РЋРЎвЂњ Р РЋРІР‚С™Р В Р’ВµР РЋРІР‚В¦Р В Р вЂ¦Р В РЎвЂР В РЎвЂќР В Р’В°Р В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–",
            "Р В РЎвЂР РЋРІР‚С™ Р В РЎВР В Р’В°Р В РЎВР В Р’В°Р В Р вЂ¦Р В РўвЂР РЋРІР‚в„–Р СћРІР‚СљР РЋРІР‚в„–Р В Р вЂ¦ Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р РЋРІР‚С™Р В Р’В°Р СћР в‚¬Р В РўвЂР В Р’В°Р РЋРЎвЂњ","Р В РЎвЂќР В РЎвЂР В Р’В±Р В Р’ВµР РЋР вЂљР СћРІР‚С”Р В Р’В°Р РЋРЎвЂњР РЋРІР‚вЂњР В РЎвЂ”Р РЋР С“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР РЋРІР‚вЂњР В РЎвЂќ Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р РЋР С“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР В РўвЂР РЋРІР‚вЂњ Р В Р’В¶Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р СћРІР‚СљР РЋРЎвЂњР В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–","Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р РЋР С“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР В РўвЂР РЋРІР‚вЂњР В В»Р РЋРІР‚вЂњР В РЎвЂ“Р РЋРІР‚вЂњР В Р вЂ¦ Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ",
            "Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњР В РўвЂР РЋРІР‚вЂњ Р В Р’В¶Р В Р’В°Р СћРІР‚С”Р РЋР С“Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р РЋРІР‚С›Р РЋР вЂљР В РЎвЂўР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В Р вЂ¦Р В РўвЂ Р Р€РІвЂћСћР В Р’В·Р РЋРІР‚вЂњР РЋР вЂљР В В»Р В Р’ВµР РЋРЎвЂњ Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р РЋР РЉР В РЎВР В РЎвЂ”Р В РЎвЂР РЋР вЂљР В РЎвЂР В РЎвЂќР В Р’В°Р В В»Р РЋРІР‚в„–Р СћРІР‚С” Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Java Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РЎвЂ“Р РЋР вЂљР В Р’В°Р В РЎВР В РЎВР В Р’В°Р В В»Р В Р’В°Р РЋРЎвЂњ Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ",
            "Р В Р’В°Р В Р вЂ¦Р В Р’В°Р В В»Р В РЎвЂР РЋРІР‚С™Р В РЎвЂР В РЎвЂќР В Р’В°Р В В»Р РЋРІР‚в„–Р СћРІР‚С” Р В РЎвЂўР В РІвЂћвЂ“Р В В»Р В Р’В°Р РЋРЎвЂњР В РўвЂР РЋРІР‚в„– Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ","Р В Р’В°Р СћРІР‚СљР РЋРІР‚в„–Р В В»Р РЋРІвЂљВ¬Р РЋРІР‚в„–Р В Р вЂ¦ Р РЋРІР‚С™Р РЋРІР‚вЂњР В В»Р РЋРІР‚вЂњР В Р вЂ¦ Р В Р’В¶Р РЋРІР‚в„–Р В В»Р В РўвЂР В Р’В°Р В РЎВ Р СћР вЂЎР В РІвЂћвЂ“Р РЋР вЂљР В Р’ВµР В Р вЂ¦Р РЋРЎвЂњ","Р В Р’В±Р В Р’ВµР В РІвЂћвЂ“Р РЋРІР‚вЂњР В РЎВР В РўвЂР РЋРІР‚вЂњ Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р В РЎвЂР РЋР РЏР В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–","Р В РўвЂР В Р’В°Р РЋРЎвЂњР РЋРІР‚в„–Р РЋР С“ Р В Р’В±Р СћР’В±Р В Р’В·Р РЋРІР‚в„–Р В В»Р РЋРЎвЂњР В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–Р В Р вЂ¦ Р В Р’В°Р В В»Р В РўвЂР РЋРІР‚в„–Р В Р вЂ¦ Р В Р’В°Р В В»Р РЋРЎвЂњ",
            "Р В РўвЂР В РЎвЂР В Р’В·Р В Р’В°Р В РІвЂћвЂ“Р В Р вЂ¦ Р РЋРІвЂљВ¬Р В Р’В°Р В Р’В±Р В В»Р В РЎвЂўР В Р вЂ¦Р В РўвЂР В Р’В°Р РЋР вЂљР РЋРІР‚в„– Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В Р’В°Р В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р РЋРІР‚С™Р РЋРІР‚вЂњ Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В РЎвЂќР В РЎвЂўР В РЎВР В РЎвЂ”Р РЋР Р‰Р РЋР вЂ№Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В В»Р РЋРІР‚вЂњР В РЎвЂќ Р В Р’В¶Р В Р’ВµР В В»Р РЋРІР‚вЂњ Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В РЎвЂўР В Р’В±Р В В»Р В Р’В°Р СћРІР‚С” Р В Р’ВµР РЋР С“Р В Р’ВµР В РЎвЂ”Р РЋРІР‚С™Р В Р’ВµР РЋРЎвЂњР РЋРІР‚вЂњ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р РЋР С“Р В Р’В°Р РЋРІР‚В¦Р В Р вЂ¦Р В Р’В° Р СћРІР‚С”Р В РЎвЂўР РЋР вЂљР СћРІР‚С”Р РЋРІР‚в„–Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІвЂљВ¬Р РЋРІР‚в„–Р В Р вЂ¦ Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р В Р’В¶Р В Р’ВµР СћР в‚¬Р РЋРЎвЂњ","Р РЋР С“Р В РЎВР В Р’В°Р РЋР вЂљР РЋРІР‚С™ Р В РЎвЂќР В РЎвЂўР В Р вЂ¦Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р В РЎвЂќР РЋРІР‚С™ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р В РЎвЂќР В Р’ВµР РЋРІвЂљВ¬Р РЋРІР‚вЂњР В РЎвЂ“Р РЋРЎвЂњР РЋРІР‚вЂњР В Р вЂ¦Р РЋРІР‚вЂњР СћР в‚¬ Р РЋР С“Р В Р’ВµР В Р’В±Р В Р’ВµР В РЎвЂ”Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р СћР вЂЎР В В»Р В РЎвЂќР В Р’ВµР В Р вЂ¦ Р В РўвЂР В Р’ВµР РЋР вЂљР В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В Р’ВµР РЋР вЂљ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р В Р’В°Р В РІвЂћвЂ“Р СћРІР‚С”Р РЋРІР‚в„–Р В Р вЂ¦ Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р СћР вЂЎР РЋРІвЂљВ¬Р РЋРІР‚вЂњР В Р вЂ¦ Р В Р’В¶Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р СћРІР‚СљР РЋРЎвЂњР В В»Р В Р’В°Р РЋР вЂљ","Р В Р’В±Р В Р’В°Р В В»Р В Р’В°Р В Р вЂ¦Р РЋРІР‚в„–Р СћР в‚¬ Р РЋР С“Р Р€Р’В©Р В Р’В·Р В РўвЂР РЋРІР‚вЂњР В РЎвЂќ Р СћРІР‚С”Р В РЎвЂўР РЋР вЂљР РЋРІР‚в„–Р В Р вЂ¦ Р В РЎвЂќР В Р’ВµР СћР в‚¬Р В Р’ВµР В РІвЂћвЂ“Р РЋРІР‚С™Р РЋРЎвЂњ","Р В Р’В±Р СћР’В±Р В В»Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р СћРІР‚С” Р В Р’ВµР РЋР С“Р В Р’ВµР В РЎвЂ”Р РЋРІР‚С™Р В Р’ВµР РЋРЎвЂњ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎвЂ“Р В РЎвЂР РЋРІР‚С™ Р В Р’В¶Р Р€РІвЂћСћР В Р вЂ¦Р В Р’Вµ Р В РЎвЂ“Р В РЎвЂР РЋРІР‚С™Р РЋРІР‚В¦Р В Р’В°Р В Р’В± Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р В РўвЂР В Р’ВµР В Р вЂ Р В РЎвЂўР В РЎвЂ”Р РЋР С“ Р В РЎвЂР В Р вЂ¦Р В Р’В¶Р В Р’ВµР В Р вЂ¦Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎвЂќР В РЎвЂўР В Р вЂ¦Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР РЋРЎвЂњР В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р РЋРІР‚С™Р РЋРІР‚вЂњ Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В РЎвЂќР В РЎвЂўР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В РІвЂћвЂ“Р В Р вЂ¦Р В Р’ВµР РЋР вЂљР В РЎвЂР В Р’В·Р В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎВР В Р’В°Р РЋРІвЂљВ¬Р В РЎвЂР В Р вЂ¦Р В Р’В°Р В В»Р РЋРІР‚в„–Р СћРІР‚С” Р В РЎвЂўР СћРІР‚С”Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р В РЎВР В Р’ВµР В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В РўвЂР РЋРІР‚в„– Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р РЋРІР‚С™Р В Р’В°Р В Р’В±Р РЋРЎвЂњР СћРІР‚СљР В Р’В° Р В Р’В±Р В РЎвЂўР В В»Р В Р’В°Р В РўвЂР РЋРІР‚в„–","Р В Р вЂ¦Р В Р’В°Р РЋРІР‚С™Р В РЎвЂР В Р вЂ Р РЋРІР‚С™Р РЋРІР‚вЂњ Р СћРІР‚С”Р В РЎвЂўР РЋР С“Р РЋРІР‚в„–Р В РЎВР РЋРІвЂљВ¬Р В Р’В° Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р РЋР вЂљ Р В Р’В¶Р Р€РІвЂћСћР В Р вЂ¦Р В Р’Вµ Р В В» Р В РўвЂР РЋРІР‚в„–Р В Р’В±Р РЋРІР‚в„–Р РЋР С“Р РЋРІР‚С™Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–Р В Р вЂ¦ Р В РўвЂР СћР’В±Р РЋР вЂљР РЋРІР‚в„–Р РЋР С“Р РЋРІР‚С™Р В Р’В°Р РЋРЎвЂњ","Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р В Р’В°Р В РІвЂћвЂ“Р СћРІР‚С”Р РЋРІР‚в„–Р В Р вЂ¦Р В РўвЂР РЋРІР‚в„–Р СћРІР‚СљР РЋРІР‚в„– Р В Р’В¶Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р СћРІР‚СљР РЋРЎвЂњР В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–",
            "Р РЋРІР‚С™Р СћР вЂЎР В РІвЂћвЂ“Р РЋРІР‚вЂњР В В»Р РЋРЎвЂњР РЋР вЂљР РЋРЎвЂњР В РўвЂР РЋРІР‚вЂњ Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р В Р’ВµР В РЎВР В РўвЂР В Р’ВµР РЋРЎвЂњ Р В РЎвЂќР В Р’ВµР РЋР вЂљР В Р’ВµР В РЎвЂќ","Python Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РЎвЂ“Р РЋР вЂљР В Р’В°Р В РЎВР В РЎВР В Р’В°Р В В»Р В Р’В°Р РЋРЎвЂњ Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В Р’В±Р В Р’В°Р В В»Р В Р’В°Р В В»Р В Р’В°Р РЋР вЂљР СћРІР‚СљР В Р’В° Р В Р’ВµР В РЎвЂќР РЋРІР‚вЂњР В Р вЂ¦Р РЋРІвЂљВ¬Р РЋРІР‚вЂњ Р РЋРІР‚С™Р РЋРІР‚вЂњР В В»Р В РўвЂР РЋРІР‚вЂњ Р СћР вЂЎР В РІвЂћвЂ“Р РЋР вЂљР В Р’ВµР РЋРІР‚С™Р РЋРЎвЂњ","Р В Р вЂ Р В РЎвЂР РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњР В Р’В°Р В В»Р В РўвЂР РЋРІР‚в„– Р РЋРІвЂљВ¬Р РЋРІР‚в„–Р В Р вЂ¦Р В РўвЂР РЋРІР‚в„–Р СћРІР‚С” Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р В Р’В¶Р РЋРІР‚в„–Р В В»Р В РўвЂР В Р’В°Р В РЎВ Р В РЎвЂўР СћРІР‚С”Р РЋРЎвЂњ Р РЋРІР‚С™Р В Р’ВµР РЋРІР‚В¦Р В Р вЂ¦Р В РЎвЂР В РЎвЂќР В Р’В°Р РЋР С“Р РЋРІР‚в„– Р Р€РІвЂћСћР В РўвЂР РЋРІР‚вЂњР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ","Р В Р’В¶Р СћР’В±Р В РЎВР РЋРІР‚в„–Р РЋР С“ Р В РЎвЂўР РЋР вЂљР В Р вЂ¦Р РЋРІР‚в„–Р В Р вЂ¦ Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р СћР’В±Р В РІвЂћвЂ“Р РЋРІР‚в„–Р В РЎВР В РўвЂР В Р’В°Р РЋР С“Р РЋРІР‚С™Р РЋРІР‚в„–Р РЋР вЂљР РЋРЎвЂњ","Р В Р’В·Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С™Р В Р’В°Р РЋР вЂљ Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В Р вЂ¦Р В Р’ВµР РЋРІР‚С™Р РЋРІР‚вЂњ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎвЂќР В РЎвЂР В Р’В±Р В Р’ВµР РЋР вЂљР СћРІР‚С”Р В Р’В°Р РЋРЎвЂњР РЋРІР‚вЂњР В РЎвЂ”Р РЋР С“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР РЋРІР‚вЂњР В РЎвЂќ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р В РЎвЂќР В РЎвЂўР В РўвЂ Р В Р’В¶Р В Р’В°Р В Р’В·Р РЋРЎвЂњР В РўвЂР РЋРІР‚в„– Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р В Р’В±Р В Р’В°Р РЋР С“Р РЋРІР‚С™Р В Р’В°Р РЋРЎвЂњ Р В РЎвЂќР В Р’ВµР РЋР вЂљР В Р’ВµР В РЎвЂќ","Р В РЎвЂќР Р€Р’В©Р В Р’В±Р В Р’ВµР В РІвЂћвЂ“Р РЋРІР‚С™Р РЋРЎвЂњ Р В РЎвЂќР В Р’ВµР РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР С“Р РЋРІР‚вЂњР В Р вЂ¦ Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р СћР вЂЎР В РІвЂћвЂ“Р РЋР вЂљР В Р’ВµР В Р вЂ¦Р РЋРЎвЂњ","Р В РЎВР В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В Р’ВµР В РЎвЂ”Р В РЎвЂќР В Р’Вµ Р В РўвЂР В Р’ВµР В РІвЂћвЂ“Р РЋРІР‚вЂњР В Р вЂ¦Р В РЎвЂ“Р РЋРІР‚вЂњ Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р В РўвЂР В Р’В°Р В РЎВР РЋРЎвЂњР РЋРІР‚в„–","Р В РЎВР В РЎвЂР В РЎвЂќР РЋР вЂљР В РЎвЂўР В Р’В°Р РЋР вЂљР РЋРІР‚В¦Р В РЎвЂР РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋРІР‚С™Р РЋРЎвЂњР РЋР вЂљР В Р’В° Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ",
            "Р В Р вЂ¦Р СћР’В±Р РЋР С“Р СћРІР‚С”Р В Р’В°Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ¦ Р В Р’В±Р В Р’В°Р РЋР С“Р СћРІР‚С”Р В Р’В°Р РЋР вЂљР РЋРЎвЂњ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎвЂ”Р В РЎвЂР РЋРІР‚С™Р В РЎвЂўР В Р вЂ¦Р В РўвЂР РЋРІР‚в„– Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р СћР вЂЎР В РІвЂћвЂ“Р РЋР вЂљР В Р’ВµР В Р вЂ¦Р РЋРЎвЂњР В РЎвЂ“Р В Р’Вµ Р В Р’В±Р В РЎвЂўР В В»Р В Р’В°Р В РўвЂР РЋРІР‚в„–","Р РЋР С“Р Р€Р’В©Р В РІвЂћвЂ“Р В В»Р В Р’ВµР РЋРЎвЂњ Р СћРІР‚С”Р В Р’В°Р РЋРІР‚С™Р В Р’ВµР В В»Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњР В Р вЂ¦ Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р РЋРІР‚С™Р СћР вЂЎР В Р’В·Р В Р’ВµР РЋРІР‚С™Р РЋРЎвЂњ","Р РЋРІР‚С›Р РЋР вЂљР В РЎвЂўР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В Р вЂ¦Р В РўвЂ Р РЋР вЂљР В Р’В°Р В Р’В·Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂќР В Р’В° Р В Р вЂ¦Р В Р’ВµР В РЎвЂ“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ",
            "Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р В Р’В¶Р РЋРІР‚в„–Р В В»Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋР вЂљР В Р’В°Р СћРІР‚С” Р В РЎвЂўР СћРІР‚С”Р РЋРЎвЂњР СћРІР‚СљР В Р’В° Р В Р’В±Р В РЎвЂўР В В»Р В Р’В°Р В РўвЂР РЋРІР‚в„–","Р В РўвЂР В РЎвЂР В Р’В·Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋР вЂљР В РЎвЂР РЋР РЏ Р В Р’В±Р В Р’ВµР В В»Р В РЎвЂ“Р РЋРІР‚вЂњР В В»Р В Р’ВµР РЋР вЂљР РЋРІР‚вЂњ Р В Р’В¶Р Р€РІвЂћСћР В Р вЂ¦Р В Р’Вµ Р В Р’ВµР В РЎВР В РўвЂР В Р’ВµР РЋРЎвЂњ","Р В Р’В¶Р В Р’В°Р В Р’В·Р В Р’В±Р В Р’В°Р РЋРІвЂљВ¬Р В Р’В° Р РЋРІР‚С™Р РЋРІР‚вЂњР В В» Р В Р’В±Р СћР’В±Р В Р’В·Р РЋРІР‚в„–Р В В»Р РЋРЎвЂњР В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–Р В Р вЂ¦ Р РЋРІР‚С™Р СћР вЂЎР В Р’В·Р В Р’ВµР РЋРІР‚С™Р РЋРЎвЂњ","Р В Р’В¶Р В Р’В°Р В Р’В·Р РЋРЎвЂњР В РўвЂР В Р’В°Р СћРІР‚СљР РЋРІР‚в„– Р В РЎвЂ“Р РЋР вЂљР В Р’В°Р В РЎВР В РЎВР В Р’В°Р РЋРІР‚С™Р В РЎвЂР В РЎвЂќР В Р’В°Р В Р вЂ¦Р РЋРІР‚в„– Р В Р’В¶Р В Р’В°Р СћРІР‚С”Р РЋР С“Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњ",
            "Р В Р’В¶Р В Р’В°Р РЋР С“Р В Р’В°Р В Р вЂ¦Р В РўвЂР РЋРІР‚в„– Р В РЎвЂР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В В»Р В В»Р В Р’ВµР В РЎвЂќР РЋРІР‚С™ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В Р’В·Р В Р’ВµР В РІвЂћвЂ“Р РЋРІР‚вЂњР В Р вЂ¦Р В РўвЂР РЋРІР‚вЂњ Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р В Р’В°Р РЋР вЂљР РЋРІР‚С™Р РЋРІР‚С™Р РЋРІР‚в„–Р РЋР вЂљР РЋРЎвЂњР СћРІР‚СљР В Р’В° Р В Р’В±Р В РЎвЂўР В В»Р В Р’В°Р В РўвЂР РЋРІР‚в„–","Р В РЎвЂќР В РЎвЂР В Р’В±Р В Р’ВµР РЋР вЂљ Р СћРІР‚С”Р В Р’В°Р РЋРЎвЂњР РЋРІР‚вЂњР В РЎвЂ”Р РЋР С“Р РЋРІР‚вЂњР В Р’В·Р В РўвЂР РЋРІР‚вЂњР В РЎвЂќ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎвЂќР В РЎвЂўР В РЎВР В РЎВР РЋРЎвЂњР В Р вЂ¦Р В РЎвЂР В РЎвЂќР В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ Р В РўвЂР В Р’В°Р СћРІР‚СљР В РўвЂР РЋРІР‚в„–Р В В»Р В Р’В°Р РЋР вЂљР РЋРІР‚в„–Р В Р вЂ¦ Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ",
            "Р В РЎвЂќР В РЎвЂўР В РЎВР В РЎвЂ”Р РЋР Р‰Р РЋР вЂ№Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В В»Р РЋРІР‚вЂњР В РЎвЂќ Р В РЎвЂќР Р€Р’В©Р РЋР вЂљР РЋРЎвЂњ Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎвЂќР РЋР вЂљР В Р’ВµР В Р’В°Р РЋРІР‚С™Р В РЎвЂР В Р вЂ Р РЋРІР‚С™Р РЋРІР‚вЂњ Р В РЎвЂўР В РІвЂћвЂ“Р В В»Р В Р’В°Р РЋРЎвЂњР В РўвЂР РЋРІР‚в„– Р СћРІР‚С”Р В Р’В°Р В В»Р В Р’В°Р В РІвЂћвЂ“ Р В РўвЂР В Р’В°Р В РЎВР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРЎвЂњ","Р В В»Р В РЎвЂўР РЋРЎвЂњР В РЎвЂќР В РЎвЂўР В РўвЂ Р РЋР вЂљР В Р’В°Р В Р’В·Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂќР В Р’В° Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ","Р В РЎВР Р€РІвЂћСћР В В»Р РЋРІР‚вЂњР В РЎВР В Р’ВµР РЋРІР‚С™Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљ Р В Р’В±Р В Р’В°Р В Р’В·Р В Р’В°Р РЋР С“Р РЋРІР‚в„– Р В РўвЂР В Р’ВµР В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р РЋРІР‚вЂњР В РЎВР РЋРІР‚вЂњР В Р’В· Р В Р вЂ¦Р В Р’Вµ"
        ]
    };

    // Р В РЎвЂєР В Р’В±Р РЋР вЂ°Р В Р’ВµР В РўвЂР В РЎвЂР В Р вЂ¦Р РЋР РЏР В Р’ВµР В РЎВ Р В Р вЂ Р РЋР С“Р В Р’Вµ Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂ Р РЋР РЏР В Р’В·Р РЋРІР‚в„–Р В РЎвЂќР В Р’В° Р В Р вЂ  Р В РЎвЂўР В РўвЂР В РЎвЂР В Р вЂ¦ Р В РЎВР В Р’В°Р РЋР С“Р РЋР С“Р В РЎвЂР В Р вЂ 
    const autocompleteDB = [
        ...generatedData.ru,
        ...generatedData.en,
        ...generatedData.kz
    ];

    // ---- DOM Р РЋР РЉР В В»Р В Р’ВµР В РЎВР В Р’ВµР В Р вЂ¦Р РЋРІР‚С™Р РЋРІР‚в„– ----
    const userInput = document.getElementById('userInput');
    const ghostText = document.getElementById('ghostText');
    const dropdown = document.getElementById('suggestionsDropdown');
    const suggestionsList = document.getElementById('suggestionsList');
    const chatHeader = document.getElementById('animatedChatHeader');
    const welcomeScreen = document.getElementById('welcomeScreen');

    if (!userInput) return; // Р В РІР‚ВР В Р’ВµР В Р’В·Р В РЎвЂўР В РЎвЂ”Р В Р’В°Р РЋР С“Р В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В Р вЂ Р РЋРІР‚в„–Р РЋРІР‚В¦Р В РЎвЂўР В РўвЂ Р В Р’ВµР РЋР С“Р В В»Р В РЎвЂ Р РЋР РЉР В В»Р В Р’ВµР В РЎВР В Р’ВµР В Р вЂ¦Р РЋРІР‚С™ Р В Р вЂ¦Р В Р’Вµ Р В Р вЂ¦Р В Р’В°Р В РІвЂћвЂ“Р В РўвЂР В Р’ВµР В Р вЂ¦

    let currentGhostSuggestion = '';
    let activeIndex = -1;
    let lastMatches = [];

    // ---- РџРѕРёСЃРє СЃРѕРІРїР°РґРµРЅРёР№ ----
    function findMatches(query) {
        if (!query || query.trim().length < 2) return [];
        const q = query.toLowerCase().trim();
        return autocompleteDB
            .filter(item => item.toLowerCase().startsWith(q))
            .slice(0, 2); // Р В РЎС™Р В Р’В°Р В РЎвЂќР РЋР С“Р В РЎвЂР В РЎВР РЋРЎвЂњР В РЎВ 2 Р В РЎвЂ”Р В РЎвЂўР В РўвЂР РЋР С“Р В РЎвЂќР В Р’В°Р В Р’В·Р В РЎвЂќР В РЎвЂ
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

            // Р В РЎСџР В РЎвЂўР В РўвЂР РЋР С“Р В Р вЂ Р В Р’ВµР РЋРІР‚РЋР В РЎвЂР В Р вЂ Р В Р’В°Р В Р’ВµР В РЎВ Р РЋР С“Р В РЎвЂўР В Р вЂ Р В РЎвЂ”Р В Р’В°Р В Р вЂ Р РЋРІвЂљВ¬Р РЋРЎвЂњР РЋР вЂ№ Р РЋРІР‚РЋР В Р’В°Р РЋР С“Р РЋРІР‚С™Р РЋР Р‰
            const matchLen = typed.length;
            const matchPart = item.slice(0, matchLen);
            const restPart = item.slice(matchLen);

            div.innerHTML = `
                <i class="ph ph-magnifying-glass suggestion-icon"></i>
                <span>
                    <span class="suggestion-text-match">${escapeHtml(matchPart)}</span><span class="suggestion-text-rest">${escapeHtml(restPart)}</span>
                </span>
                <span class="tab-hint">Tab РІвЂ в„–</span>
            `;

            div.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Р В РЎСљР В Р’Вµ Р РЋР С“Р В Р вЂ¦Р В РЎвЂР В РЎВР В Р’В°Р В Р’ВµР В РЎВ Р РЋРІР‚С›Р В РЎвЂўР В РЎвЂќР РЋРЎвЂњР РЋР С“ Р РЋР С“ textarea
                selectSuggestion(item);
            });

            suggestionsList.appendChild(div);
        });

        dropdown.classList.add('visible');
    }

    // ---- Р В РЎСџР РЋР вЂљР В РЎвЂР В РЎВР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В Р вЂ Р РЋРІР‚в„–Р В Р’В±Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРЎвЂњР РЋР вЂ№ Р В РЎвЂ”Р В РЎвЂўР В РўвЂР РЋР С“Р В РЎвЂќР В Р’В°Р В Р’В·Р В РЎвЂќР РЋРЎвЂњ ----
    function selectSuggestion(text) {
        if (!userInput) return;
        userInput.value = text;
        updateGhostText('', '');
        dropdown.classList.remove('visible');
        userInput.focus();

        // Р В Р Р‹Р РЋРІР‚С™Р В Р’В°Р В Р вЂ Р В РЎвЂР В РЎВ Р В РЎвЂќР РЋРЎвЂњР РЋР вЂљР РЋР С“Р В РЎвЂўР РЋР вЂљ Р В Р вЂ  Р В РЎвЂќР В РЎвЂўР В Р вЂ¦Р В Р’ВµР РЋРІР‚В 
        userInput.setSelectionRange(text.length, text.length);

        // Р В РЎвЂ™Р В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В РЎвЂР РЋР вЂљР РЋРЎвЂњР В Р’ВµР В РЎВ Р В РЎвЂќР В Р вЂ¦Р В РЎвЂўР В РЎвЂ”Р В РЎвЂќР РЋРЎвЂњ Send
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.classList.add('active');

        // Р В РЎС›Р РЋР вЂљР В РЎвЂР В РЎвЂ“Р В РЎвЂ“Р В Р’ВµР РЋР вЂљР В РЎвЂР В РЎВ resize textarea
        userInput.dispatchEvent(new Event('input'));
    }

    // ---- Р В РЎвЂ™Р В Р вЂ¦Р В РЎвЂР В РЎВР В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ Р В Р’В·Р В Р’В°Р В РЎвЂ“Р В РЎвЂўР В В»Р В РЎвЂўР В Р вЂ Р В РЎвЂќР В Р’В° ----
    function setHeaderTyping(isTyping) {
        if (!chatHeader) return;
        if (isTyping) {
            chatHeader.classList.add('typing-active');
        } else {
            chatHeader.classList.remove('typing-active');
        }
    }

    // ---- Р В РІР‚ВР В Р’ВµР В Р’В·Р В РЎвЂўР В РЎвЂ”Р В Р’В°Р РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р’Вµ Р РЋР РЉР В РЎвЂќР РЋР вЂљР В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ HTML ----
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

        // Р В РЎвЂ™Р В Р вЂ¦Р В РЎвЂР В РЎВР В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ Р В Р’В·Р В Р’В°Р В РЎвЂ“Р В РЎвЂўР В В»Р В РЎвЂўР В Р вЂ Р В РЎвЂќР В Р’В°
        setHeaderTyping(isTyping && welcomeScreen && welcomeScreen.style.display !== 'none');

        if (!isTyping) {
            updateGhostText('', '');
            if (dropdown) dropdown.classList.remove('visible');
            return;
        }

        // Р В Р’ВР РЋРІР‚В°Р В Р’ВµР В РЎВ Р РЋР С“Р В РЎвЂўР В Р вЂ Р В РЎвЂ”Р В Р’В°Р В РўвЂР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ
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

    // ---- Р В вЂ”Р В Р’В°Р В РЎвЂќР РЋР вЂљР РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р В Р’ВµР В РЎВ dropdown Р В РЎвЂ”Р РЋР вЂљР В РЎвЂ Р В РЎвЂќР В В»Р В РЎвЂР В РЎвЂќР В Р’Вµ Р В Р вЂ Р В Р вЂ¦Р В Р’Вµ Р В Р’ВµР В РЎвЂ“Р В РЎвЂў ----
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
// MENU FIX v4 Р Р†Р вЂљРІР‚Сњ document capture, no stopPropagation Р Р†РІР‚В РІР‚в„ў Р В В»Р В Р’В°Р В РЎВР В РЎвЂ”Р В Р’В° Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В Р’В°Р В Р’ВµР РЋРІР‚С™
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

    // Capture Р В Р вЂ¦Р В Р’В° document Р Р†Р вЂљРІР‚Сњ Р РЋР С“Р РЋР вЂљР В Р’В°Р В Р’В±Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р В Р’ВµР РЋРІР‚С™ Р В РІР‚СњР В РЎвЂє Р В Р вЂ Р РЋР С“Р В Р’ВµР РЋРІР‚В¦ listeners Р В Р вЂ¦Р В Р’В° Р РЋР РЉР В В»Р В Р’ВµР В РЎВР В Р’ВµР В Р вЂ¦Р РЋРІР‚С™Р В Р’Вµ
    // Р В РЎСљР В РІР‚Сћ Р В Р вЂ Р РЋРІР‚в„–Р В Р’В·Р РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р В Р’ВµР В РЎВ stopPropagation Р Р†РІР‚В РІР‚в„ў tubelight handler Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В Р’В°Р В Р’ВµР РЋРІР‚С™ Р Р†РІР‚В РІР‚в„ў Р В В»Р В Р’В°Р В РЎВР В РЎвЂ”Р В Р’В° Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В Р’В°Р В Р’ВµР РЋРІР‚С™ Р Р†РЎС™РІР‚Сљ
    document.addEventListener('click', function(e) {
        var lbl = document.querySelector('label[for="nav-toggle"]');
        if (!lbl) return;
        if (e.target === lbl || lbl.contains(e.target)) {
            // Р В РІР‚СњР В Р’В°Р РЋРІР‚ВР В РЎВ Р РЋР С“Р В РЎвЂўР В Р’В±Р РЋРІР‚в„–Р РЋРІР‚С™Р В РЎвЂР РЋР вЂ№ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РІвЂћвЂ“Р РЋРІР‚С™Р В РЎвЂ Р В РўвЂР В Р’В°Р В В»Р РЋР Р‰Р РЋРІвЂљВ¬Р В Р’Вµ (Р РЋРІР‚С™Р РЋРЎвЂњbelight Р В РЎвЂўР В Р’В±Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В РЎвЂР РЋРІР‚С™ Р В В»Р В Р’В°Р В РЎВР В РЎвЂ”Р РЋРЎвЂњ)
            // Р В РЎС™Р РЋРІР‚в„– Р РЋРІР‚С™Р В РЎвЂўР В В»Р РЋР Р‰Р В РЎвЂќР В РЎвЂў Р РЋРЎвЂњР В РЎвЂ”Р РЋР вЂљР В Р’В°Р В Р вЂ Р В В»Р РЋР РЏР В Р’ВµР В РЎВ Р В Р вЂ Р В РЎвЂР В РўвЂР В РЎвЂР В РЎВР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋР Р‰Р РЋР вЂ№ sidebar
            if (_open) { _hide(); } else { _show(); }
        }
    }, true); // capture = true, Р В Р вЂ¦Р В РЎвЂў Р В РІР‚ВР В РІР‚СћР В вЂ” stopPropagation

    // Р В Р Р‹Р В РЎвЂР В Р вЂ¦Р РЋРІР‚В¦Р РЋР вЂљР В РЎвЂўР В Р вЂ¦Р В РЎвЂР В Р’В·Р В Р’В°Р РЋРІР‚В Р В РЎвЂР РЋР РЏ: Р В РЎвЂќР В РЎвЂўР В РЎвЂ“Р В РўвЂР В Р’В° openModal() Р РЋР С“Р В Р’В±Р РЋР вЂљР В Р’В°Р РЋР С“Р РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р В Р’ВµР РЋРІР‚С™ checkbox Р Р†РІР‚В РІР‚в„ў Р В Р’В·Р В Р’В°Р В РЎвЂќР РЋР вЂљР РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р В Р’ВµР В РЎВ sidebar
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
            alert('РћР±СЂР°С‚РёС‚Рµ РІРЅРёРјР°РЅРёРµ: Р·Р°РіСЂСѓР¶РµРЅРЅРѕРµ РІРёРґРµРѕ Р±СѓРґРµС‚ СЂР°Р±РѕС‚Р°С‚СЊ С‚РѕР»СЊРєРѕ РґРѕ РїРµСЂРµР·Р°РіСЂСѓР·РєРё СЃС‚СЂР°РЅРёС†С‹. Р”Р»СЏ РїРѕСЃС‚РѕСЏРЅРЅРѕРіРѕ РІРёРґРµРѕС„РѕРЅР° РїРѕРјРµСЃС‚РёС‚Рµ С„Р°Р№Р» СЂСЏРґРѕРј СЃ index.html.');
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
// Р В РІР‚в„ўР В Р’ВР В Р’В Р В РЎС›Р В Р в‚¬Р В РЎвЂ™Р В РІР‚С”Р В Р’В¬Р В РЎСљР В РЎвЂ™Р В Р вЂЎ Р В РІР‚СњР В РЎвЂєР В Р Р‹Р В РЎв„ўР В РЎвЂ™ Р В Р’В Р В РЎСџР В Р’В Р В РЎвЂєР В РІР‚в„ўР В РІР‚СћР В Р’В Р В РЎв„ўР В РЎвЂ™ Р В РЎСџР В РЎвЂєР В РІР‚СњР В РЎСџР В Р’ВР В Р Р‹Р В РЎв„ўР В Р’В
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


// ==========================================
// GOOGLE DRIVE & DOCS INTEGRATION
// ==========================================
const CLIENT_ID = '1025199836674-lrrirvhvg3f5t9su2nckg7k0k0hr3h9v.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAv8nCfVZKTAMJUQy9xrqP91-0dnkdgJ90';

const DISCOVERY_DOCS = [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    'https://docs.googleapis.com/$discovery/rest?version=v1'
];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let oauthToken = null;

function gapiLoaded() {
    gapi.load('client:picker', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;
    console.log("GAPI Initialized");
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
            if (response.error !== undefined) {
                throw (response);
            }
            oauthToken = response.access_token;
            createPicker();
        },
    });
    gisInited = true;
    console.log("GIS Initialized");
}

function handleAuthClick() {
    if (oauthToken) {
        // РЈ РЅР°СЃ СѓР¶Рµ РµСЃС‚СЊ С‚РѕРєРµРЅ, РїСЂРѕСЃС‚Рѕ РѕС‚РєСЂС‹РІР°РµРј РїРёРєРµСЂ
        createPicker();
    } else {
        // РЎРїСЂР°С€РёРІР°РµРј РґРѕСЃС‚СѓРї
        tokenClient.requestAccessToken({prompt: 'consent'});
    }
}

function createPicker() {
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
    view.setIncludeFolders(true);
    
    const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setDeveloperKey(API_KEY)
        .setOAuthToken(oauthToken)
        .addView(view)
        .addView(new google.picker.DocsUploadView())
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
}

async function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const file = data.docs[0];
        const fileId = file.id;
        const mimeType = file.mimeType;
        
        console.log(`Р’С‹Р±СЂР°РЅ С„Р°Р№Р»: ${file.name} (ID: ${fileId}, Type: ${mimeType})`);
        
        let content = "";
        
        try {
            if (mimeType === 'application/vnd.google-apps.document') {
                // Р•СЃР»Рё СЌС‚Рѕ Google Docs
                const response = await gapi.client.docs.documents.get({ documentId: fileId });
                content = readDocsContent(response.result.body.content);
            } else {
                // Р•СЃР»Рё СЌС‚Рѕ РѕР±С‹С‡РЅС‹Р№ С‚РµРєСЃС‚РѕРІС‹Р№ С„Р°Р№Р»
                const response = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
                content = response.body;
            }
            
            // Р”РѕР±Р°РІР»СЏРµРј С„Р°Р№Р» РІ РёРЅС‚РµСЂС„РµР№СЃ
            addGoogleDriveFileToUI(file.name, content);
            
        } catch (error) {
            console.error("РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё С„Р°Р№Р»Р°", error);
            alert("РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р». РЈР±РµРґРёС‚РµСЃСЊ, С‡С‚Рѕ СЌС‚Рѕ С‚РµРєСЃС‚РѕРІС‹Р№ РґРѕРєСѓРјРµРЅС‚.");
        }
    }
}

function readDocsContent(contentElements) {
    let text = "";
    contentElements.forEach(element => {
        if (element.paragraph) {
            element.paragraph.elements.forEach(el => {
                if (el.textRun) {
                    text += el.textRun.content;
                }
            });
        }
    });
    return text;
}

function addGoogleDriveFileToUI(fileName, content) {
    // РСЃРїРѕР»СЊР·СѓРµРј СѓР¶Рµ РіРѕС‚РѕРІСѓСЋ С„СѓРЅРєС†РёСЋ handleFileSelect РёР· СЃРєСЂРёРїС‚Р°
    // РЎРѕР·РґР°РµРј РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹Р№ File РѕР±СЉРµРєС‚
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], fileName, { type: 'text/plain' });
    
    // Р­РјСѓР»РёСЂСѓРµРј РІС‹Р±РѕСЂ С„Р°Р№Р»Р°
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    const fileInput = document.getElementById('fileInput');
    fileInput.files = dataTransfer.files;
    
    // Р’С‹Р·С‹РІР°РµРј СЃСѓС‰РµСЃС‚РІСѓСЋС‰РµРµ СЃРѕР±С‹С‚РёРµ
    const event = new Event('change');
    fileInput.dispatchEvent(event);
}

// === VOICE TTS IMPLEMENTATION ===
window.currentAudio = null;
window.readAloud = async function(text) {
    if(!text) return;
    
    // Р•СЃР»Рё СѓР¶Рµ РёРіСЂР°РµС‚ Р·РІСѓРє, РѕСЃС‚Р°РЅР°РІР»РёРІР°РµРј РµРіРѕ
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
        return;
    }

    // РћРїСЂРµРґРµР»СЏРµРј С‚Р°СЂРёС„ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РЅР° РѕСЃРЅРѕРІРµ РІС‹Р±СЂР°РЅРЅРѕР№ РјРѕРґРµР»Рё
    const isPro = ['github', 'solifon-souldrive', 'solifon-pulse'].includes(window.selectedProvider);
    const plan = isPro ? 'pro' : 'free';

    try {
        const response = await fetch('http://localhost:7860/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, plan: plan })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            alert("РћС€РёР±РєР° РѕР·РІСѓС‡РєРё: " + errorText);
            return;
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        window.currentAudio = audio;
        audio.play();
        
        audio.onended = () => {
            window.currentAudio = null;
            URL.revokeObjectURL(url);
        };
    } catch (e) {
        console.error("TTS Error:", e);
        alert("РЎРµСЂРІРµСЂ РѕР·РІСѓС‡РєРё (app.py) РЅРµРґРѕСЃС‚СѓРїРµРЅ РЅР° РїРѕСЂС‚Сѓ 7860. РџРѕР¶Р°Р»СѓР№СЃС‚Р°, Р·Р°РїСѓСЃС‚РёС‚Рµ РµРіРѕ!");
    }
};

window.stopGeneration = function() {
    if (window.currentAbortController) {
        window.currentAbortController.abort();
        window.currentAbortController = null;
    }
    if (window.currentTypingInterval) {
        clearInterval(window.currentTypingInterval);
        window.currentTypingInterval = null;
        if (window.currentTypingElement) {
            window.currentTypingElement.innerHTML = window.currentTypingText
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00c8ff;">$1</strong>')
                .replace(/\n/g, '<br>');
            const container = document.getElementById('messagesContainer');
            if (container) container.scrollTop = container.scrollHeight;
            if (typeof addMinimalDock === 'function') {
                const textContainer = window.currentTypingElement.closest('.text');
                if (textContainer && !textContainer.querySelector('.dock-container')) {
                    addMinimalDock(textContainer);
                }
            }
        }
    }
    const stopBtn = document.getElementById('stopBtn');
    if(stopBtn) stopBtn.style.display = 'none';
};

// ============================================================
// DEEP SEARCH MENU вЂ” РєРѕРјР°РЅРґС‹ /pdf, /video, /image, /web
// ============================================================

window._deepMode = null;
window._pdfFileForEdit = null;
window._pdfDownloadName = 'solifon_document.pdf';

window.toggleDeepMenu = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('deepSearchMenu');
    const btn  = document.getElementById('deepBtn');
    if (!menu) return;
    const isOpen = menu.style.display === 'block';
    if (isOpen) {
        window.closeDeepMenu();
    } else {
        const btnRect = btn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.bottom = (window.innerHeight - btnRect.top + 10) + 'px';
        menu.style.right  = (window.innerWidth - btnRect.right) + 'px';
        menu.style.display = 'block';
        btn.classList.add('deep-active');
        setTimeout(() => {
            document.addEventListener('click', window._deepMenuOutsideHandler);
        }, 50);
    }
};

window._deepMenuOutsideHandler = function(e) {
    const menu = document.getElementById('deepSearchMenu');
    const btn  = document.getElementById('deepBtn');
    if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
        window.closeDeepMenu();
    }
};

window.closeDeepMenu = function() {
    const menu = document.getElementById('deepSearchMenu');
    const btn  = document.getElementById('deepBtn');
    if (menu) menu.style.display = 'none';
    if (btn)  btn.classList.remove('deep-active');
    document.removeEventListener('click', window._deepMenuOutsideHandler);
};

window.selectDeepCmd = function(cmd) {
    window.closeDeepMenu();
    const ta = document.getElementById('userInput');
    if (!ta) return;

    if (cmd === 'pdf_create') {
        window._deepMode = 'pdf_create';
        window._pdfFileForEdit = null;
        ta.value = '/pdf create ';
        ta.placeholder = 'РћРїРёС€Рё С‡С‚Рѕ СЃРѕР·РґР°С‚СЊ РІ PDF... (СЂРµР·СЋРјРµ, РѕС‚С‡С‘С‚, РґРѕРіРѕРІРѕСЂ, СЃС‚Р°С‚СЊСЏ...)';
        ta.focus();
        ta.dispatchEvent(new Event('input'));
        _showDeepTag('\uD83D\uDCC4 /pdf create', '#63b3ed');

    } else if (cmd === 'pdf_edit') {
        window._deepMode = 'pdf_edit';
        window._pdfFileForEdit = null;
        _showDeepTag('\u270F\uFE0F /pdf edit вЂ” Р·Р°РіСЂСѓР·Рё PDF С„Р°Р№Р»', '#9a75f3');
        ta.value = '/pdf edit ';
        ta.placeholder = 'Р—Р°РіСЂСѓР·Рё PDF Рё РѕРїРёС€Рё С‡С‚Рѕ РёР·РјРµРЅРёС‚СЊ...';
        ta.focus();
        const pdfInput = document.getElementById('pdfFileInput');
        if (pdfInput) setTimeout(() => pdfInput.click(), 100);

    } else if (cmd === 'video') {
        window._deepMode = null;
        ta.value = '/video ';
        ta.placeholder = 'Р’СЃС‚Р°РІСЊ СЃСЃС‹Р»РєСѓ РЅР° YouTube РІРёРґРµРѕ...';
        ta.focus();
        ta.dispatchEvent(new Event('input'));
        _showDeepTag('\uD83C\uDFA5 /video', '#fc814a');

    } else if (cmd === 'image') {
        window._deepMode = null;
        ta.value = '/image ';
        ta.placeholder = 'РћРїРёС€Рё РёР·РѕР±СЂР°Р¶РµРЅРёРµ РєРѕС‚РѕСЂРѕРµ РЅСѓР¶РЅРѕ СЃРѕР·РґР°С‚СЊ...';
        ta.focus();
        ta.dispatchEvent(new Event('input'));
        _showDeepTag('\uD83D\uDDBC\uFE0F /image', '#48c78e');

    } else if (cmd === 'web') {
        window._deepMode = null;
        ta.value = '/web ';
        ta.placeholder = 'Р§С‚Рѕ РЅР°Р№С‚Рё РІ РёРЅС‚РµСЂРЅРµС‚Рµ?';
        ta.focus();
        ta.dispatchEvent(new Event('input'));
        _showDeepTag('\uD83C\uDF10 /web', '#fbd33e');
    }
};

function _showDeepTag(label, color) {
    let tagEl = document.getElementById('pdfModeTag');
    if (!tagEl) {
        tagEl = document.createElement('div');
        tagEl.id = 'pdfModeTag';
        tagEl.className = 'pdf-mode-tag';
        const inputBox = document.querySelector('.animated-input-box');
        if (inputBox) inputBox.insertBefore(tagEl, inputBox.firstChild);
    }
    tagEl.style.display = 'inline-flex';
    tagEl.style.borderColor = color + '55';
    tagEl.style.color = color;
    tagEl.innerHTML = label + ' <span class="pdf-tag-remove" onclick="window._clearDeepMode()" title="\u041e\u0442\u043c\u0435\u043d\u0430">\u2715</span>';
}

window._clearDeepMode = function() {
    window._deepMode = null;
    window._pdfFileForEdit = null;
    const tagEl = document.getElementById('pdfModeTag');
    if (tagEl) tagEl.style.display = 'none';
    const ta = document.getElementById('userInput');
    if (ta) {
        ta.value = '';
        ta.placeholder = 'Ask SOLIFON AI anything...';
        ta.focus();
    }
    const preview = document.getElementById('imagePreviewContainer');
    if (preview) preview.style.display = 'none';
};

window.handlePdfFileSelect = function(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    window._pdfFileForEdit = file;
    const preview = document.getElementById('imagePreviewContainer');
    if (preview) {
        preview.style.display = 'flex';
        preview.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;' +
            'background:rgba(154,117,243,0.12);border:1px solid rgba(154,117,243,0.3);' +
            'border-radius:10px;color:#9a75f3;font-size:13px;">' +
            '<i class="ph ph-file-pdf" style="font-size:20px;"></i>' +
            '<span>' + file.name + '</span>' +
            '<span style="opacity:0.5;">(' + (file.size/1024).toFixed(1) + ' KB)</span>' +
            '</div>';
    }
    _showDeepTag('\u270F\uFE0F /pdf edit вЂ” ' + file.name, '#9a75f3');
    const ta = document.getElementById('userInput');
    if (ta) {
        if (!ta.value.trim() || ta.value.trim() === '/pdf edit') {
            ta.value = '/pdf edit ';
        }
        ta.placeholder = 'РћРїРёС€Рё С‡С‚Рѕ РёР·РјРµРЅРёС‚СЊ РІ СЌС‚РѕРј PDF...';
        ta.focus();
        ta.dispatchEvent(new Event('input'));
    }
    input.value = '';
};

// РџРµСЂРµС…РІР°С‚С‹РІР°РµРј handleAI РґР»СЏ PDF РєРѕРјР°РЅРґ
// Р’РђР–РќРћ: РёСЃРїРѕР»СЊР·СѓРµРј DOMContentLoaded С‡С‚РѕР±С‹ СЃСЂР°Р±РѕС‚Р°С‚СЊ РџРћРЎР›Р• РѕСЂРёРіРёРЅР°Р»Р°
window.addEventListener('DOMContentLoaded', function() {
    // Рљ СЌС‚РѕРјСѓ РјРѕРјРµРЅС‚Сѓ РѕСЂРёРіРёРЅР°Р»СЊРЅС‹Р№ DOMContentLoaded СѓР¶Рµ СѓСЃС‚Р°РЅРѕРІРёР» window.handleAI
    const _orig = window.handleAI;

    window.handleAI = async function() {
        const ta   = document.getElementById('userInput');
        const text = ta ? ta.value.trim() : '';
        const mode = window._deepMode;

        if (mode === 'pdf_create' || text.toLowerCase().startsWith('/pdf create')) {
            const prompt = text.replace(/^\/pdf create\s*/i, '').trim();
            if (!prompt) { if (ta) ta.placeholder = 'РќР°РїРёС€Рё С‡С‚Рѕ СЃРѕР·РґР°С‚СЊ РІ PDF...'; return; }
            await _callPdfCreate(prompt);
            window._clearDeepMode();
            return;
        }

        if (mode === 'pdf_edit' || text.toLowerCase().startsWith('/pdf edit')) {
            const prompt = text.replace(/^\/pdf edit\s*/i, '').trim();
            if (!window._pdfFileForEdit) {
                document.getElementById('pdfFileInput') && document.getElementById('pdfFileInput').click();
                return;
            }
            if (!prompt) { if (ta) ta.placeholder = 'РћРїРёС€Рё С‡С‚Рѕ РёР·РјРµРЅРёС‚СЊ РІ PDF...'; return; }
            await _callPdfEdit(prompt, window._pdfFileForEdit);
            window._clearDeepMode();
            return;
        }

        if (_orig) return _orig.apply(this, arguments);
    };

    // Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅРѕ: РїРµСЂРµС…РІР°С‚С‹РІР°РµРј sendBtn С‡РµСЂРµР· capture С‡С‚РѕР±С‹ Р±С‹С‚СЊ РїРµСЂРІС‹Рј
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', function(e) {
            const ta   = document.getElementById('userInput');
            const text = ta ? ta.value.trim() : '';
            const mode = window._deepMode;
            if (mode === 'pdf_create' || mode === 'pdf_edit' ||
                text.toLowerCase().startsWith('/pdf create') ||
                text.toLowerCase().startsWith('/pdf edit')) {
                e.stopImmediatePropagation();
                window.handleAI();
            }
        }, true); // capture=true вЂ” СЃСЂР°Р±РѕС‚Р°РµС‚ Р”Рћ РґСЂСѓРіРёС… СЃР»СѓС€Р°С‚РµР»РµР№
    }
});

async function _callPdfCreate(prompt) {
    const ta = document.getElementById('userInput');
    addMessageToUI('user', '📄 /pdf create: ' + prompt);
    const botEl = addMessageToUI('bot', '⏳ Создаю PDF...');
    try {
        const isLocal = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const BASE = isLocal ? 'http://127.0.0.1:7860' : 'https://germanhcsuj-itssoimportandforme.hf.space';
        const fd = new FormData();
        fd.append('prompt', prompt);
        fd.append('provider', window.currentProvider || 'gemini');
        const resp = await fetch(BASE + '/pdf/create', { method: 'POST', body: fd });
        if (!resp.ok) throw new Error('Server error ' + resp.status);
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/pdf')) {
            const blob = await resp.blob();
            const pdfUrl  = URL.createObjectURL(blob);
            const pdfName = 'solifon_' + prompt.slice(0, 30).replace(/[^a-z\u0430-\u044f0-9]/gi, '_') + '.pdf';
            _updateBotMsg(botEl, `
                <div style="background:rgba(99,179,237,0.08);border:1px solid rgba(99,179,237,0.3);border-radius:14px;padding:16px;margin-top:4px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                        <span style="font-size:26px;">📄</span>
                        <div>
                            <div style="color:#63b3ed;font-weight:700;font-size:15px;">PDF готов!</div>
                            <div style="color:rgba(255,255,255,0.5);font-size:12px;">${pdfName}</div>
                        </div>
                    </div>
                    <iframe src="${pdfUrl}" style="width:100%;height:440px;border:none;border-radius:10px;background:#fff;" title="PDF"></iframe>
                    <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
                        <a href="${pdfUrl}" download="${pdfName}" style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#63b3ed,#4299e1);color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;box-shadow:0 4px 14px rgba(99,179,237,0.35);">💾 Сохранить PDF</a>
                        <a href="${pdfUrl}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.1);color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,0.2);">🔗 Открыть в вкладке</a>
                    </div>
                </div>`);
        } else {
            const data = await resp.json();
            _updateBotMsg(botEl, data.reply || data.error || 'Готово!');
        }
    } catch (err) {
        _updateBotMsg(botEl, '❌ Ошибка создания PDF: ' + err.message);
    }
    if (ta) { ta.value = ''; ta.dispatchEvent(new Event('input')); }
}

async function _callPdfEdit(prompt, pdfFile) {
    const ta = document.getElementById('userInput');
    addMessageToUI('user', '✏️ /pdf edit: ' + prompt + ' [' + pdfFile.name + ']');
    const botEl = addMessageToUI('bot', '⏳ Читаю PDF и применяю изменения...');
    try {
        const isLocal = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const BASE = isLocal ? 'http://127.0.0.1:7860' : 'https://germanhcsuj-itssoimportandforme.hf.space';
        const fd = new FormData();
        fd.append('prompt', prompt);
        fd.append('provider', window.currentProvider || 'gemini');
        fd.append('file', pdfFile, pdfFile.name);
        const resp = await fetch(BASE + '/pdf/edit', { method: 'POST', body: fd });
        if (!resp.ok) throw new Error('Server error ' + resp.status);
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/pdf')) {
            const blob = await resp.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = 'edited_' + pdfFile.name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            _updateBotMsg(botEl, '✅ <strong style="color:#9a75f3">PDF изменён!</strong> Скачан как edited_' + pdfFile.name);
        } else {
            const data = await resp.json();
            _updateBotMsg(botEl, data.reply || data.error || 'Готово!');
        }
    } catch (err) {
        _updateBotMsg(botEl, '❌ Ошибка: ' + err.message);
    }
    if (ta) { ta.value = ''; ta.dispatchEvent(new Event('input')); }
    window._pdfFileForEdit = null;
}

function _updateBotMsg(el, html) {
    if (!el) return;
    const textEl = el.querySelector && el.querySelector('.text') || el;
    if (textEl) textEl.innerHTML = html;
}

// ============================================================
// PEXELS / PIXABAY IMAGE SEARCH (for non-Air models + /image)
// ============================================================
async function _callImageSearch(query) {
    const provider = window.selectedProvider || window.currentProvider || 'gemini';
    const isAir = !provider || provider === 'gemini';

    addMessageToUI('user', '🖼️ /image: ' + query);
    const botEl = addMessageToUI('bot', '🔍 Ищу фото...');

    try {
        // Fetch photo from Pexels (free, no key needed for limited use via proxy)
        const pexelsKey = 'P0WLSVc5eoJVKB0AYbgjGWQC1aovyFV2h0mhKfSfomJerCbDRZp2uSvv'; // public demo key
        const q = encodeURIComponent(query);
        const pexResp = await fetch(`https://api.pexels.com/v1/search?query=${q}&per_page=3`, {
            headers: { Authorization: pexelsKey }
        });

        let photoUrl = null;
        let photoCredit = '';
        if (pexResp.ok) {
            const pexData = await pexResp.json();
            if (pexData.photos && pexData.photos.length > 0) {
                const photo = pexData.photos[0];
                photoUrl = photo.src.large;
                photoCredit = photo.photographer;
            }
        }

        // Also ask AI to describe/write about the topic
        const BASE = (location.hostname === 'localhost' || location.protocol === 'file:' || location.hostname === '127.0.0.1')
            ? 'http://127.0.0.1:7860'
            : 'https://germanhcsuj-itssoimportandforme.hf.space';
        const fd = new FormData();
        fd.append('prompt', 'Напиши короткий красивый текст (2-3 предложения) про: ' + query + '. Без заголовков.');
        fd.append('provider', provider);
        let aiText = '';
        try {
            const aiResp = await fetch(BASE + '/chat', { method: 'POST', body: fd });
            if (aiResp.ok) {
                const aiData = await aiResp.json();
                aiText = aiData.reply || '';
            }
        } catch(e) { /* ignore */ }

        let html = '';
        if (photoUrl) {
            html += `<img src="${photoUrl}" alt="${query}" style="width:100%;max-width:480px;border-radius:14px;margin-bottom:12px;display:block;box-shadow:0 8px 30px rgba(0,0,0,0.4);">\n`;
            if (photoCredit) html += `<div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:8px;">📷 ${photoCredit} / Pexels</div>\n`;
        }
        if (aiText) html += `<div style="font-size:14px;line-height:1.65;">${aiText}</div>`;
        if (!html) html = '❌ Не удалось найти фото или получить ответ.';

        _updateBotMsg(botEl, html);
    } catch(err) {
        _updateBotMsg(botEl, '❌ Ошибка поиска фото: ' + err.message);
    }

    const ta = document.getElementById('userInput');
    if (ta) { ta.value = ''; ta.dispatchEvent(new Event('input')); }
}

// Intercept /image command for non-Air models
window.addEventListener('DOMContentLoaded', function() {
    const sendBtn = document.getElementById('sendBtn');
    const ta = document.getElementById('userInput');
    if (!sendBtn || !ta) return;
    sendBtn.addEventListener('click', function(e) {
        const text = ta.value.trim();
        const provider = window.selectedProvider || window.currentProvider || 'gemini';
        const isAir = !provider || provider === 'gemini';
        if (!isAir && text.toLowerCase().startsWith('/image ')) {
            e.stopImmediatePropagation();
            const query = text.slice(7).trim();
            if (query) _callImageSearch(query);
        }
    }, true);
    ta.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter' || e.shiftKey) return;
        const text = ta.value.trim();
        const provider = window.selectedProvider || window.currentProvider || 'gemini';
        const isAir = !provider || provider === 'gemini';
        if (!isAir && text.toLowerCase().startsWith('/image ')) {
            e.stopImmediatePropagation();
            const query = text.slice(7).trim();
            if (query) _callImageSearch(query);
        }
    }, true);
});

window.signInWithGoogle = function() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).then((result) => {
            if (typeof closeModal === 'function') closeModal('authModal');
        }).catch(err => {
            const errorEl = document.getElementById('authError');
            if (errorEl) errorEl.textContent = err.message;
        });
    } else if (typeof tokenClient !== 'undefined' && tokenClient) {
        tokenClient.requestAccessToken({prompt: 'consent'});
        if (typeof closeModal === 'function') closeModal('authModal');
    } else {
        const errorEl = document.getElementById('authError');
        if (errorEl) errorEl.textContent = 'Google API is loading... Please wait a second and try again.';
        else alert('Google API is loading... Please try again.');
    }
};

window.signInWithProvider = function(providerName) {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        let provider;
        if (providerName === 'github') provider = new firebase.auth.GithubAuthProvider();
        else if (providerName === 'apple') provider = new firebase.auth.OAuthProvider('apple.com');
        else {
             const errorEl = document.getElementById('authError');
             if (errorEl) errorEl.textContent = providerName.charAt(0).toUpperCase() + providerName.slice(1) + ' login is coming soon!';
             return;
        }
        
        if (provider) {
            firebase.auth().signInWithPopup(provider).then((result) => {
                if (typeof closeModal === 'function') closeModal('authModal');
            }).catch(err => {
                const errorEl = document.getElementById('authError');
                if (errorEl) errorEl.textContent = err.message;
            });
        }
    } else {
        const errorEl = document.getElementById('authError');
        if (errorEl) {
            errorEl.textContent = providerName.charAt(0).toUpperCase() + providerName.slice(1) + ' Sign-In is coming soon.';
        } else {
            alert(providerName + ' Sign-In is coming soon.');
        }
    }
};
