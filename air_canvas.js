const videoElement = document.getElementById('camVideo');
const uiCanvas = document.getElementById('uiCanvas');
const drawCanvas = document.getElementById('drawCanvas');
const uiCtx = uiCanvas ? uiCanvas.getContext('2d', { willReadFrequently: true }) : null;
const drawCtx = drawCanvas ? drawCanvas.getContext('2d', { willReadFrequently: true }) : null;

// Плавность курсора
const LERP_FACTOR = 0.2; 

// Системные переменные
let isRunning = false;
let camera = null;
let hands = null;
let isLocked = false;
let isPresentationMode = false;
let isDarkMode = true;

// НЕЗАВИСИМЫЕ состояния для двух рук
const handStates = [
    { x: 0, y: 0, px: 0, py: 0, lastX: 0, lastY: 0, isDrawing: false, color: '#ef4444', action: '00000', brush: 'Premium Pen', width: 5, shadow: 0 },
    { x: 0, y: 0, px: 0, py: 0, lastX: 0, lastY: 0, isDrawing: false, color: '#3b82f6', action: '00000', brush: 'Premium Pen', width: 5, shadow: 0 }
];

// Данные для 3D Ленты
let uploadedAssets = [];
let galleryRotation = 0;

// История для Undo
let canvasHistory = [];
const MAX_HISTORY = 10;
let lastSaveTime = 0;

let lastClearTime = 0;
let lastPaletteTime = [0, 0];
let lastSnapshotTime = 0;
let lastOpenPalmTime = [0, 0]; // Для отслеживания открытой ладони на Level 2

// === СИСТЕМА УРОВНЕЙ ===
let currentLevel = 1; // Level 1: Рисование | Level 2: 3D Галерея
let currentColor = '#ef4444';

const PREMIUM_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff', '#a855f7', '#ec4899'];
let colorIndex = [0, 0];

// === ДОБАВЛЯЕМ CSS СТИЛИ ДЛЯ ВСПЫШКИ И КНОПОК ===
(function() {
    const style = document.createElement('style');
    style.textContent = `
        #snapshotFlashOverlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #ffffff;
            opacity: 0;
            pointer-events: none;
            z-index: 9999;
        }
        
        .cb-swatch, .color-btn {
            transition: all 0.2s ease;
        }
        
        .cb-swatch.active, .color-btn.active {
            transform: scale(1.2);
            box-shadow: 0 0 12px currentColor;
        }
        
        #levelSwitcherBtn {
            transition: all 0.3s ease;
        }
        
        #levelSwitcherBtn:hover {
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);
})();

function initAirCanvasElite() {
    if (!videoElement || !uiCanvas || !drawCanvas) return;
    function resize() {
        uiCanvas.width = window.innerWidth; uiCanvas.height = window.innerHeight;
        drawCanvas.width = window.innerWidth; drawCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    hands.onResults(onResultsElite);

    currentColor = handStates[0].color;
    updatePaletteUI(currentColor);

    camera = new Camera(videoElement, {
        onFrame: async () => { if (isRunning) await hands.send({ image: videoElement }); },
        width: 1280, height: 720
    });

    // === СОЗДАНИЕ UI-КНОПКИ ПЕРЕКЛЮЧЕНИЯ УРОВНЕЙ ===
    createLevelSwitcher();
}

function createLevelSwitcher() {
    // Если кнопка уже существует, не создаем новую
    if (document.getElementById('levelSwitcherBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'levelSwitcherBtn';
    btn.textContent = 'Level 1: Drawing';
    btn.style.position = 'fixed';
    btn.style.top = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '10000';
    btn.style.padding = '12px 20px';
    btn.style.borderRadius = '8px';
    btn.style.border = 'none';
    btn.style.backgroundColor = '#ef4444';
    btn.style.color = '#ffffff';
    btn.style.fontSize = '14px';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    btn.style.transition = 'all 0.3s ease';
    btn.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';

    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });

    btn.addEventListener('click', () => {
        if (currentLevel === 1) {
            switchAirCanvasLevel(2);
        } else {
            switchAirCanvasLevel(1);
        }
    });

    document.body.appendChild(btn);
}

function saveHistory() {
    if (!drawCtx || !drawCanvas) return;
    if (Date.now() - lastSaveTime < 200) return; 
    const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    canvasHistory.push(imageData);
    if (canvasHistory.length > MAX_HISTORY) canvasHistory.shift();
    lastSaveTime = Date.now();
}

function undo() {
    if (canvasHistory.length > 0) {
        const imageData = canvasHistory.pop();
        drawCtx.putImageData(imageData, 0, 0);
    } else {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }
}

function lerp(start, end, amt) { return (1 - amt) * start + amt * end; }

function getDistance(p1, p2, width, height) {
    const dx = (p1.x - p2.x) * width; const dy = (p1.y - p2.y) * height;
    return Math.sqrt(dx * dx + dy * dy);
}

// Мы вырезали багованный handedness. Теперь нейросеть просто считает пальцы!
function getFingerStates(landmarks) {
    const states = [0, 0, 0, 0, 0];
    const wrist = landmarks[0];
    states[0] = getDistance(landmarks[4], landmarks[17], 1, 1) > getDistance(landmarks[3], landmarks[17], 1, 1) ? 1 : 0;
    states[1] = getDistance(landmarks[8], wrist, 1, 1) > getDistance(landmarks[6], wrist, 1, 1) ? 1 : 0;
    states[2] = getDistance(landmarks[12], wrist, 1, 1) > getDistance(landmarks[10], wrist, 1, 1) ? 1 : 0;
    states[3] = getDistance(landmarks[16], wrist, 1, 1) > getDistance(landmarks[14], wrist, 1, 1) ? 1 : 0;
    states[4] = getDistance(landmarks[20], wrist, 1, 1) > getDistance(landmarks[18], wrist, 1, 1) ? 1 : 0;
    return states;
}

function updatePaletteUI(selectedColor) {
    const selectedNorm = selectedColor.toLowerCase();
    document.querySelectorAll('.cb-swatch, .color-btn').forEach((el) => {
        const dataColor = el.dataset.color || el.getAttribute('data-color') || '';
        const dataNorm = dataColor.toLowerCase();
        
        if (dataNorm === selectedNorm && dataNorm !== '') {
            el.classList.add('active');
            el.style.transform = 'scale(1.2)';
            el.style.boxShadow = `0 0 12px ${dataColor}`;
        } else {
            el.classList.remove('active');
            el.style.transform = 'scale(1)';
            el.style.boxShadow = 'none';
        }
    });
}

function ensureSnapshotFlash() {
    let flash = document.getElementById('snapshotFlashOverlay');
    if (!flash) {
        flash = document.createElement('div');
        flash.id = 'snapshotFlashOverlay';
        flash.className = 'snapshot-flash';
        document.body.appendChild(flash);
    }
    return flash;
}

function flashSnapshot() {
    const flash = ensureSnapshotFlash();
    flash.style.transition = 'opacity 0.25s ease-out';
    flash.style.opacity = '0.8';
    setTimeout(() => { flash.style.opacity = '0'; }, 80);
}

function takeSnapshot() {
    if (!drawCanvas || !videoElement) return;
    const width = drawCanvas.width;
    const height = drawCanvas.height;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    if (videoElement.readyState >= 2) {
        tempCtx.drawImage(videoElement, 0, 0, width, height);
    }
    tempCtx.drawImage(drawCanvas, 0, 0, width, height);
    tempCanvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Solifon_Air_Art.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    }, 'image/png');

    flashSnapshot();
}

function switchAirCanvasLevel(level) {
    currentLevel = level === 2 ? 2 : 1;
    if (currentLevel === 1) {
        handStates[1].action = '00000';
        handStates[1].isDrawing = false;
        handStates[1].x = 0;
        handStates[1].y = 0;
        handStates[1].px = 0;
        handStates[1].py = 0;
        galleryRotation = 0;
    } else {
        // Очищаем состояния рук для Level 2
        for (let i = 0; i < 2; i++) {
            handStates[i].isDrawing = false;
        }
    }

    // Обновляем текст кнопки
    const btn = document.getElementById('levelSwitcherBtn');
    if (btn) {
        btn.textContent = currentLevel === 1 ? 'Level 1: Drawing' : 'Level 2: Gallery';
        btn.style.backgroundColor = currentLevel === 1 ? '#ef4444' : '#a855f7';
    }

    console.log('Switched to Air Canvas level', currentLevel);
}

function executeDrawingLogic(state, x, y, gestureString) {
    // БЛОКИРУем рисование на Level 2
    if (currentLevel === 2) return;

    if (!drawCtx) return;
    drawCtx.globalCompositeOperation = 'source-over';
    switch (gestureString) {
        case '01000': state.brush = 'Premium Pen'; state.isDrawing = true; state.width = 5; state.shadow = 0; break;
        case '01100': state.brush = 'Smart Eraser'; state.isDrawing = true; state.width = 40; state.shadow = 0; drawCtx.globalCompositeOperation = 'destination-out'; break;
        case '01110': state.brush = 'Thick Marker'; state.isDrawing = true; state.width = 15; state.shadow = 0; break;
        case '00001': state.brush = 'Calligraphy'; state.isDrawing = true; state.width = 2; state.shadow = 0; break;
        case '01001': state.brush = 'Neon Glow'; state.isDrawing = true; state.width = 6; state.shadow = 10; drawCtx.shadowColor = state.color; break;
        case '11100': state.brush = 'Laser Pointer'; state.isDrawing = false; break;
        default: state.isDrawing = false; break;
    }

    if (state.isDrawing && state.brush !== 'Laser Pointer') {
        if (state.px !== 0 && state.py !== 0) {
            drawCtx.beginPath();
            drawCtx.moveTo(state.px, state.py);
            drawCtx.lineTo(x, y);
            drawCtx.strokeStyle = state.color;
            drawCtx.lineWidth = state.width;
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            drawCtx.shadowBlur = state.shadow;
            if (state.shadow > 0) drawCtx.shadowColor = state.color;
            drawCtx.stroke();
            drawCtx.shadowBlur = 0; 
            saveHistory(); 
        }
    }
}

// Защищенная функция обработки жестов (без крашей)
function processGestures(state, handIndex, landmarks, w, h, numHands = 1) {
    const targetX = w - (landmarks[8].x * w);
    const targetY = landmarks[8].y * h;

    if (state.x === 0 && state.y === 0) {
        state.x = targetX; state.y = targetY;
    } else {
        state.x = lerp(state.x, targetX, LERP_FACTOR);
        state.y = lerp(state.y, targetY, LERP_FACTOR);
    }

    const states = getFingerStates(landmarks);
    const fStr = states.slice(1).join('');

    let actionStr = '';
    if (fStr === '1000') actionStr = '01000';
    else if (fStr === '1100') actionStr = '01100';
    else if (fStr === '1001') actionStr = '10001';
    else if (states.join('') === '11111') actionStr = '11111';
    else if (states.join('') === '10000') actionStr = '10000';
    else actionStr = '00000';

    state.action = actionStr;

    // ===== LEVEL 1: РЕЖИМ РИСОВАНИЯ (ТОЛЬКО ПЕРВАЯ РУКА) =====
    if (currentLevel === 1) {
        if (actionStr === '11111') {
            if (Date.now() - lastClearTime > 1000) {
                drawCtx.clearRect(0, 0, w, h);
                canvasHistory = [];
                lastClearTime = Date.now();
            }
            state.isDrawing = false;
        } else if (actionStr === '10001') {
            if (Date.now() - lastPaletteTime[handIndex] > 500) {
                colorIndex[handIndex] = (colorIndex[handIndex] + 1) % PREMIUM_COLORS.length;
                state.color = PREMIUM_COLORS[colorIndex[handIndex]];
                lastPaletteTime[handIndex] = Date.now();
                if (handIndex === 0) {
                    currentColor = state.color;
                    updatePaletteUI(currentColor);
                }
            }
            state.isDrawing = false;
        } else if (actionStr === '00000' || actionStr === '10000') {
            state.isDrawing = false;
        } else {
            state.isDrawing = true;
            executeDrawingLogic(state, state.x, state.y, actionStr);
        }
    }
    // ===== LEVEL 2: РЕЖИМ 3D ГАЛЕРЕИ =====
    else if (currentLevel === 2) {
        // Открытая ладонь (11111) - очистка галереи после 1 сек
        if (actionStr === '11111') {
            if (Date.now() - lastOpenPalmTime[handIndex] > 1000) {
                uploadedAssets = [];
                lastOpenPalmTime[handIndex] = Date.now();
            }
            state.isDrawing = false;
        }
        // Указательный палец (01000) на одной руке - прокрутка (свайп)
        else if (actionStr === '01000' && numHands === 1) {
            if (state.lastX !== 0 || state.lastY !== 0) {
                galleryRotation += (state.x - state.lastX) * 0.003;
            }
            state.isDrawing = false;
        }
        // Остальные жесты на Level 2 - блокируем рисование
        else {
            state.isDrawing = false;
        }
    }

    // === ОТРИСОВКА КУРСОРА (НАДЕЖНАЯ И ЗАЩИЩЕННАЯ) ===
    // Определяем цвет курсора
    let cursorColor = state.color;
    if (actionStr === '01100') {
        cursorColor = '#ffffff';
    }
    
    // LEVEL 1: Рисуем курсор ТОЛЬКО для первой руки (handIndex === 0)
    // LEVEL 2: Рисуем курсоры для обеих рук
    let shouldDrawCursor = false;
    if (currentLevel === 1 && handIndex === 0) {
        shouldDrawCursor = true;
    } else if (currentLevel === 2) {
        shouldDrawCursor = true;
    }

    if (shouldDrawCursor && uiCtx) {
        try {
            uiCtx.fillStyle = cursorColor;
            uiCtx.globalAlpha = 0.85;
            uiCtx.beginPath();
            uiCtx.arc(state.x, state.y, 10, 0, 2 * Math.PI);
            uiCtx.fill();
            uiCtx.globalAlpha = 1.0;
            uiCtx.shadowBlur = 0;
        } catch(e) {
            console.error('Cursor render error:', e);
        }
    }

    if (!state.isDrawing) { state.px = 0; state.py = 0; } 
    else { state.px = state.x; state.py = state.y; }
    state.lastX = state.x;
    state.lastY = state.y;
}

// 3D Гармошка (Стиль TouchDesigner) + жесты для двух рук
function processTwoHands(w, h) {
    const s1 = handStates[0];
    const s2 = handStates[1];
    
    // === СКРИНШОТ: обе руки показывают щепотку (10000) ===
    if (s1.action === '10000' && s2.action === '10000') {
        if (Date.now() - lastSnapshotTime > 1500) {
            takeSnapshot();
            lastSnapshotTime = Date.now();
        }
        s1.isDrawing = false;
        s2.isDrawing = false;
        return;
    }

    // === ГОЛОГРАФИЧЕСКАЯ ЛЕНТА: кулак (00000) + Peace/Selfie (01100) ===
    const isRibbon = (s1.action === '00000' && s2.action === '01100') || (s1.action === '01100' && s2.action === '00000');

    if (isRibbon) {
        s1.isDrawing = false; s2.isDrawing = false;
        
        const pLeft = s1.x < s2.x ? s1 : s2;
        const pRight = s1.x < s2.x ? s2 : s1;

        const dx = pRight.x - pLeft.x; 
        const dy = pRight.y - pLeft.y; 
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        let dynamicScale = distance / 400; 
        if (dynamicScale < 0.6) dynamicScale = 0.6; 
        if (dynamicScale > 1.1) dynamicScale = 1.1; 

        const items = uploadedAssets.length > 0 ? uploadedAssets : [null, null, null, null];
        const maxDisplay = Math.min(items.length, 8);

        uiCtx.save();
        for(let i = 0; i < maxDisplay; i++) {
            let amt = (i + 1) / (maxDisplay + 1);
            let lx = lerp(pLeft.x, pRight.x, amt);
            let ly = lerp(pLeft.y, pRight.y, amt);
            
            uiCtx.save(); 
            uiCtx.translate(lx, ly); 
            uiCtx.rotate(angle + galleryRotation); 
            uiCtx.scale(dynamicScale, dynamicScale);
            
            const sizeX = 80, sizeY = 80;
            if (items[i]) {
                uiCtx.drawImage(items[i], -sizeX/2, -sizeY/2, sizeX, sizeY);
                uiCtx.strokeStyle = '#00ffcc'; uiCtx.lineWidth = 2;
                uiCtx.strokeRect(-sizeX/2, -sizeY/2, sizeX, sizeY);
            } else {
                uiCtx.strokeStyle = '#a855f7'; uiCtx.lineWidth = 2;
                uiCtx.strokeRect(-sizeX/2, -sizeY/2, sizeX, sizeY);
            }
            uiCtx.restore();
        }
        uiCtx.restore();
    }
}

function onResultsElite(results) {
    if (!uiCtx) return;
    const w = uiCanvas.width;
    const h = uiCanvas.height;

    // Жесткая очистка холста (Один раз на кадр)
    uiCtx.clearRect(0, 0, w, h);
    
    if (document.getElementById("camVideo")) { 
        document.getElementById("camVideo").style.opacity = isPresentationMode ? "0" : "1"; 
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const numHands = results.multiHandLandmarks.length;

        // === LEVEL 1: ОБРАБАТЫВАЕМ СТРОГО ТОЛЬКО ПЕРВУЮ РУКУ ===
        if (currentLevel === 1) {
            // Обнуляем вторую руку полностью
            handStates[1].action = '00000';
            handStates[1].isDrawing = false;
            handStates[1].x = 0;
            handStates[1].y = 0;
            handStates[1].px = 0;
            handStates[1].py = 0;

            // Обрабатываем ТОЛЬКО первую руку
            processGestures(handStates[0], 0, results.multiHandLandmarks[0], w, h, numHands);
        } 
        // === LEVEL 2: ОБРАБАТЫВАЕМ ОБЕ РУКИ ===
        else {
            for (let i = 0; i < numHands && i < 2; i++) {
                processGestures(handStates[i], i, results.multiHandLandmarks[i], w, h, numHands);
            }
            // Жесты для двух рук
            if (numHands === 2) {
                processTwoHands(w, h);
            }
        }
    } else {
        // Нет рук в кадре - обнуляем все состояния
        for (let i = 0; i < 2; i++) {
            handStates[i].px = 0; 
            handStates[i].py = 0;
            handStates[i].x = 0;
            handStates[i].y = 0;
        }
    }
}

// === СИСТЕМНЫЕ КНОПКИ СОХРАНЕНЫ ===
window.startAirCanvasElite = function() {
    if (!camera) initAirCanvasElite();
    if (!isRunning && camera) {
        camera.start();
        isRunning = true;
        if(document.getElementById('authBtn')) document.getElementById('authBtn').style.display = 'none';
        if(document.getElementById('stopCamBtn')) document.getElementById('stopCamBtn').style.display = 'block';
        if(document.getElementById('premiumLock')) {
            document.getElementById('premiumLock').style.background = 'transparent';
            document.getElementById('premiumLock').style.backdropFilter = 'none';
            document.getElementById('premiumLock').style.pointerEvents = 'none';
            const h3 = document.querySelector('#premiumLock h3'); if(h3) h3.style.display = 'none';
            const p = document.querySelector('#premiumLock p'); if(p) p.style.display = 'none';
            const icon = document.querySelector('#premiumLock .lock-icon'); if(icon) icon.style.display = 'none';
        }
        if(document.getElementById('stopCamBtn')) document.getElementById('stopCamBtn').style.pointerEvents = 'auto';
    }
};

window.stopAirCanvasElite = function() {
    if (isRunning && camera) {
        camera.stop();
        videoElement.srcObject = null; 
        isRunning = false;
        
        if (uiCtx) uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
        if (drawCtx) drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        
        if(document.getElementById('authBtn')) document.getElementById('authBtn').style.display = 'block';
        if(document.getElementById('stopCamBtn')) document.getElementById('stopCamBtn').style.display = 'none';
        if(document.getElementById('premiumLock')) {
            document.getElementById('premiumLock').style.background = 'rgba(0,0,0,.85)';
            document.getElementById('premiumLock').style.backdropFilter = 'blur(8px)';
            document.getElementById('premiumLock').style.pointerEvents = 'auto';
            const h3 = document.querySelector('#premiumLock h3'); if(h3) h3.style.display = 'block';
            const p = document.querySelector('#premiumLock p'); if(p) p.style.display = 'block';
            const icon = document.querySelector('#premiumLock .lock-icon'); if(icon) icon.style.display = 'block';
        }
    }
};

window.addEventListener('message', (event) => {
    if (event.data === 'startCamera') window.startAirCanvasElite();
    else if (event.data === 'stopCamera') window.stopAirCanvasElite();
});

// Слушатель для кнопок загрузки фото (если они есть в твоем интерфейсе)
const fileInput = document.getElementById('fileInput');
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const img = new Image();
                img.src = URL.createObjectURL(files[i]);
                img.onload = () => uploadedAssets.push(img);
            }
        }
    });
}
