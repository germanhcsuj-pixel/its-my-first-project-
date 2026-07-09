/**
 * Solifon Air Canvas Elite 
 * Architecture: 20 Gestures, LERP Smoothing, Multi-hand logic, 3D Holographic Ribbon.
 */

const videoElement = document.getElementById('camVideo');
const uiCanvas = document.getElementById('uiCanvas');
const drawCanvas = document.getElementById('drawCanvas');
const uiCtx = uiCanvas ? uiCanvas.getContext('2d', { willReadFrequently: true }) : null;
const drawCtx = drawCanvas ? drawCanvas.getContext('2d', { willReadFrequently: true }) : null;

// LERP constant
const LERP_FACTOR = 0.45;

// State variables
let isRunning = false;
let camera = null;
let hands = null;

let isLocked = false;
let isPresentationMode = false;
let isDarkMode = true;

// Independent hand states (Step 1: Removed global smoothedX, smoothedY, prevX, prevY, isDrawing, currentColor)
const handStates = [
    { x: 0, y: 0, px: 0, py: 0, isDrawing: false, color: '#ef4444', action: '00000', brush: 'Premium Pen', width: 5, shadow: 0 },
    { x: 0, y: 0, px: 0, py: 0, isDrawing: false, color: '#3b82f6', action: '00000', brush: 'Premium Pen', width: 5, shadow: 0 }
];

// Assets and gallery for 3D Ribbon
let uploadedAssets = [];
let galleryRotation = 0;

// History for Undo
let canvasHistory = [];
const MAX_HISTORY = 10;
let lastSaveTime = 0;

// Cooldowns
let lastClearTime = 0;
let lastUndoTime = 0;
let lastPaletteTime = [0, 0]; // per hand
let lastLockTime = 0;
let lastModeTime = 0;
let lastPresentationTime = 0;
let lastSaveDocTime = 0;

const PREMIUM_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff', '#a855f7', '#ec4899'];
let colorIndex = [0, 0]; // per hand

// Initialization
function initAirCanvasElite() {
    if (!videoElement || !uiCanvas || !drawCanvas) return;

    // Set canvas sizes
    function resize() {
        uiCanvas.width = window.innerWidth;
        uiCanvas.height = window.innerHeight;
        drawCanvas.width = window.innerWidth;
        drawCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Initialize MediaPipe Hands
    hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1, // Premium accuracy
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    hands.onResults(onResultsElite);

    camera = new Camera(videoElement, {
        onFrame: async () => {
            if (isRunning) {
                await hands.send({ image: videoElement });
            }
        },
        width: 1280,
        height: 720
    });
}

function saveHistory() {
    if (!drawCtx || !drawCanvas) return;
    if (Date.now() - lastSaveTime < 200) return; // limit saving frequency
    
    const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    canvasHistory.push(imageData);
    if (canvasHistory.length > MAX_HISTORY) {
        canvasHistory.shift();
    }
    lastSaveTime = Date.now();
}

function undo() {
    if (Date.now() - lastUndoTime < 500) return;
    lastUndoTime = Date.now();
    if (canvasHistory.length > 0) {
        const imageData = canvasHistory.pop();
        drawCtx.putImageData(imageData, 0, 0);
    } else {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }
}

// Distance helper
function getDistance(p1, p2, width, height) {
    const dx = (p1.x - p2.x) * width;
    const dy = (p1.y - p2.y) * height;
    return Math.sqrt(dx * dx + dy * dy);
}

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

// 5-finger array logic
function getFingerStates(landmarks, handedness) {
    const states = [0, 0, 0, 0, 0];
    const wrist = landmarks[0];
    
    // Thumb: Using distance to pinky base (17) vs ip (3)
    const distTip = getDistance(landmarks[4], landmarks[17], 1, 1);
    const distIp = getDistance(landmarks[3], landmarks[17], 1, 1);
    states[0] = distTip > distIp ? 1 : 0;
    
    // Index, Middle, Ring, Pinky: distance to wrist vs pip to wrist
    states[1] = getDistance(landmarks[8], wrist, 1, 1) > getDistance(landmarks[6], wrist, 1, 1) ? 1 : 0;
    states[2] = getDistance(landmarks[12], wrist, 1, 1) > getDistance(landmarks[10], wrist, 1, 1) ? 1 : 0;
    states[3] = getDistance(landmarks[16], wrist, 1, 1) > getDistance(landmarks[14], wrist, 1, 1) ? 1 : 0;
    states[4] = getDistance(landmarks[20], wrist, 1, 1) > getDistance(landmarks[18], wrist, 1, 1) ? 1 : 0;
    
    return states;
}

function executeDrawingLogic(state, x, y, gestureString) {
    if (!drawCtx) return;

    // Reset some defaults before applying specific logic
    drawCtx.globalCompositeOperation = 'source-over';
    
    switch (gestureString) {
        case '01000': // Premium Pen
            state.brush = 'Premium Pen';
            state.isDrawing = true;
            state.width = 5;
            state.shadow = 0;
            break;
        case '01100': // Smart Eraser
            state.brush = 'Smart Eraser';
            state.isDrawing = true;
            state.width = 40;
            state.shadow = 0;
            drawCtx.globalCompositeOperation = 'destination-out';
            break;
        case '01110': // Thick Marker
            state.brush = 'Thick Marker';
            state.isDrawing = true;
            state.width = 15;
            state.shadow = 0;
            break;
        case '00001': // Calligraphy
            state.brush = 'Calligraphy';
            state.isDrawing = true;
            state.width = 2;
            state.shadow = 0;
            break;
        case '01001': // Neon Glow
            state.brush = 'Neon Glow';
            state.isDrawing = true;
            state.width = 6;
            state.shadow = 10;
            drawCtx.shadowColor = state.color;
            break;
        case '11100': // Laser Pointer
            state.brush = 'Laser Pointer';
            state.isDrawing = false; // Override: no drawing
            break;
        default:
            state.isDrawing = false;
            break;
    }

    if (state.isDrawing && state.brush !== 'Laser Pointer') {
        // Only start drawing if we moved enough to prevent dots or just starting
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
            drawCtx.shadowBlur = 0; // reset
            
            saveHistory(); // Async/debounce inside
        }
    }
}

function getColorFromVideo(x, y) {
    if (!uiCtx || !uiCanvas) return '#ffffff';
    // uiCanvas has the video frame drawn on it
    try {
        const pixel = uiCtx.getImageData(x, y, 1, 1).data;
        return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    } catch (e) {
        console.warn("CORS/Pixel read error, fallback to random color", e);
        return PREMIUM_COLORS[Math.floor(Math.random() * PREMIUM_COLORS.length)];
    }
}

function processGestures(state, handIndex, landmarks, handedness, w, h) {
    // Smoothed target
    const targetX = w - (landmarks[8].x * w); // Mirrored
    const targetY = landmarks[8].y * h;

    if (state.x === 0 && state.y === 0) {
        state.x = targetX;
        state.y = targetY;
    } else {
        state.x = lerp(state.x, targetX, LERP_FACTOR);
        state.y = lerp(state.y, targetY, LERP_FACTOR);
    }

    const states = getFingerStates(landmarks, handedness);
    
    // Ignore thumb state for drawing/erasing to make it more reliable
    const fStr = states.slice(1).join('');

    let actionStr = '';
    if (fStr === '1000') {
        actionStr = '01000'; // Drawing
    } else if (fStr === '1100') {
        actionStr = '01100'; // Eraser
    } else if (fStr === '1001') {
        actionStr = '10001'; // Next Color
    } else if (states.join('') === '11111') {
        actionStr = '11111'; // Clear
    } else {
        actionStr = '00000'; // Hover / Default
    }

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
            
            // Highlight color in UI if available
            const swatches = document.querySelectorAll('.cb-swatch');
            if (swatches.length > 0) {
                swatches.forEach(sw => sw.classList.remove('active'));
                const targetSwatch = Array.from(swatches).find(sw => sw.dataset.color === state.color);
                if (targetSwatch) targetSwatch.classList.add('active');
            }
        }
        state.isDrawing = false;
    } else if (actionStr === '00000') {
        state.isDrawing = false;
    } else {
        state.isDrawing = true;
        executeDrawingLogic(state, state.x, state.y, actionStr);
    }

    // Update gesture indicator (only for first hand to avoid conflicts)
    if (handIndex === 0) {
        const indicator = document.getElementById('gestureIndicator');
        if (indicator) {
            if (state.isDrawing && actionStr === '01000') {
                 indicator.innerHTML = '✨ Premium Pen';
            } else if (state.isDrawing && actionStr === '01100') {
                 indicator.innerHTML = '🧹 Smart Eraser';
            } else if (actionStr === '10001') {
                 indicator.innerHTML = '🎨 Color Changed';
            } else {
                 indicator.innerHTML = '✋ Waiting for gesture...';
            }
        }
    }

    // Draw UI Cursor for this hand
    uiCtx.beginPath();
    uiCtx.arc(state.x, state.y, 10, 0, 2 * Math.PI);
    uiCtx.fillStyle = actionStr === '01100' ? '#ffffff' : state.color;
    uiCtx.fill();
    uiCtx.shadowBlur = 0;

    if (!state.isDrawing) {
        state.px = 0;
        state.py = 0;
    } else {
        state.px = state.x;
        state.py = state.y;
    }
}

function processTwoHands(w, h) {
    const s1 = handStates[0];
    const s2 = handStates[1];
    const isRibbon = (s1.action === '00000' && s2.action === '01100') || (s1.action === '01100' && s2.action === '00000');

    if (isRibbon) {
        s1.isDrawing = false;
        s2.isDrawing = false;
        
        // Защита от переворота
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
                uiCtx.strokeStyle = '#00ffcc'; 
                uiCtx.lineWidth = 2;
                uiCtx.strokeRect(-sizeX/2, -sizeY/2, sizeX, sizeY);
            } else {
                uiCtx.strokeStyle = '#a855f7'; 
                uiCtx.lineWidth = 2;
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

    // Clear UI canvas STRICTLY ONCE at the beginning (Step 2)
    uiCtx.clearRect(0, 0, w, h);
    
    if (document.getElementById("camVideo")) { 
        document.getElementById("camVideo").style.opacity = isPresentationMode ? "0" : "1"; 
    }

    if (isLocked) {
        uiCtx.fillStyle = 'rgba(255,0,0,0.5)';
        uiCtx.font = '24px sans-serif';
        uiCtx.fillText("SCREEN LOCKED", 50, 50);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const numHands = results.multiHandLandmarks.length;
        
        // Step 2: Loop through hands and process each independently
        for (let i = 0; i < numHands && i < 2; i++) {
            processGestures(handStates[i], i, results.multiHandLandmarks[i], results.multiHandedness[i].label, w, h);
        }
        
        // If two hands detected, process two-hand gestures
        if (numHands === 2) {
            processTwoHands(w, h);
        }
    } else {
        // Reset drawing states when no hands detected
        for (let i = 0; i < 2; i++) {
            handStates[i].px = 0;
            handStates[i].py = 0;
        }
    }
}

window.startAirCanvasElite = function() {
    if (!camera) initAirCanvasElite();
    if (!isRunning && camera) {
        camera.start();
        isRunning = true;
        document.getElementById('authBtn').style.display = 'none';
        document.getElementById('stopCamBtn').style.display = 'block';
        document.getElementById('premiumLock').style.background = 'transparent';
        document.getElementById('premiumLock').style.backdropFilter = 'none';
        document.querySelector('#premiumLock h3').style.display = 'none';
        document.querySelector('#premiumLock p').style.display = 'none';
        document.querySelector('#premiumLock .lock-icon').style.display = 'none';
        document.getElementById('premiumLock').style.pointerEvents = 'none';
        document.getElementById('stopCamBtn').style.pointerEvents = 'auto';
    }
};

window.stopAirCanvasElite = function() {
    if (isRunning && camera) {
        camera.stop();
        videoElement.srcObject = null; // Ensure tracks stop
        isRunning = false;
        
        if (uiCtx) uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
        if (drawCtx) drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        
        document.getElementById('authBtn').style.display = 'block';
        document.getElementById('stopCamBtn').style.display = 'none';
        document.getElementById('premiumLock').style.background = 'rgba(0,0,0,.85)';
        document.getElementById('premiumLock').style.backdropFilter = 'blur(8px)';
        document.querySelector('#premiumLock h3').style.display = 'block';
        document.querySelector('#premiumLock p').style.display = 'block';
        document.querySelector('#premiumLock .lock-icon').style.display = 'block';
        document.getElementById('premiumLock').style.pointerEvents = 'auto';
    }
};

// Listeners from parent index.html
window.addEventListener('message', (event) => {
    if (event.data === 'startCamera') {
        window.startAirCanvasElite();
    } else if (event.data === 'stopCamera') {
        window.stopAirCanvasElite();
    }
});
