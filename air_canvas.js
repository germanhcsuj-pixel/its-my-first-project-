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
    { x: 0, y: 0, px: 0, py: 0, isDrawing: false, color: '#ef4444', action: '00000', brush: 'Premium Pen', width: 5, shadow: 0 },
    { x: 0, y: 0, px: 0, py: 0, isDrawing: false, color: '#3b82f6', action: '00000', brush: 'Premium Pen', width: 5, shadow: 0 }
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

const PREMIUM_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff', '#a855f7', '#ec4899'];
let colorIndex = [0, 0]; 

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

    camera = new Camera(videoElement, {
        onFrame: async () => { if (isRunning) await hands.send({ image: videoElement }); },
        width: 1280, height: 720
    });
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

function executeDrawingLogic(state, x, y, gestureString) {
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
function processGestures(state, handIndex, landmarks, w, h) {
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
    else actionStr = '00000'; 

    state.action = actionStr;

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
        }
        state.isDrawing = false;
    } else if (actionStr === '00000') {
        state.isDrawing = false;
    } else {
        state.isDrawing = true;
        executeDrawingLogic(state, state.x, state.y, actionStr);
    }

    // Отрисовка курсора
    uiCtx.beginPath();
    uiCtx.arc(state.x, state.y, 10, 0, 2 * Math.PI);
    uiCtx.fillStyle = actionStr === '01100' ? '#ffffff' : state.color;
    uiCtx.fill();
    uiCtx.shadowBlur = 0;

    if (!state.isDrawing) { state.px = 0; state.py = 0; } 
    else { state.px = state.x; state.py = state.y; }
}

// 3D Гармошка (Стиль TouchDesigner)
function processTwoHands(w, h) {
    const s1 = handStates[0];
    const s2 = handStates[1];
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
        
        for (let i = 0; i < numHands && i < 2; i++) {
            // МЫ УБРАЛИ БАГОВАННЫЙ HANDEDNESS ЗДЕСЬ!
            processGestures(handStates[i], i, results.multiHandLandmarks[i], w, h);
        }
        
        if (numHands === 2) {
            processTwoHands(w, h);
        }
    } else {
        for (let i = 0; i < 2; i++) {
            handStates[i].px = 0; handStates[i].py = 0;
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
