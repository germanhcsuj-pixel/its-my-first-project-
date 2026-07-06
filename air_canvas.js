/**
 * Solifon Air Canvas Elite 
 * Architecture: 20 Gestures, LERP Smoothing, Multi-hand logic.
 */

const videoElement = document.getElementById('camVideo');
const uiCanvas = document.getElementById('uiCanvas');
const drawCanvas = document.getElementById('drawCanvas');
const uiCtx = uiCanvas ? uiCanvas.getContext('2d', { willReadFrequently: true }) : null;
const drawCtx = drawCanvas ? drawCanvas.getContext('2d', { willReadFrequently: true }) : null;

// LERP variables
let smoothedX = 0, smoothedY = 0;
const LERP_FACTOR = 0.45;

// State variables
let isRunning = false;
let camera = null;
let hands = null;

let isLocked = false;
let isPresentationMode = false;
let isDarkMode = true;

// Drawing state
let currentBrush = 'Premium Pen';
let currentColor = '#ef4444'; // Default Premium Gold
let lineWidth = 5;
let shadowBlur = 0;
let isDrawing = false;
let prevX = 0, prevY = 0;

// History for Undo
let canvasHistory = [];
const MAX_HISTORY = 10;
let lastSaveTime = 0;

// Cooldowns
let lastClearTime = 0;
let lastUndoTime = 0;
let lastPaletteTime = 0;
let lastLockTime = 0;
let lastModeTime = 0;
let lastPresentationTime = 0;
let lastSaveDocTime = 0;

const PREMIUM_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff', '#a855f7', '#ec4899'];
let colorIndex = 0;

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

function executeDrawingLogic(x, y, gestureString) {
    if (!drawCtx) return;

    // Reset some defaults before applying specific logic
    drawCtx.globalCompositeOperation = 'source-over';
    
    switch (gestureString) {
        case '01000': // Premium Pen
            currentBrush = 'Premium Pen';
            isDrawing = true;
            lineWidth = 5;
            shadowBlur = 0;
            break;
        case '01100': // Smart Eraser
            currentBrush = 'Smart Eraser';
            isDrawing = true;
            lineWidth = 40;
            shadowBlur = 0;
            drawCtx.globalCompositeOperation = 'destination-out';
            break;
        case '01110': // Thick Marker
            currentBrush = 'Thick Marker';
            isDrawing = true;
            lineWidth = 15;
            shadowBlur = 0;
            break;
        case '00001': // Calligraphy
            currentBrush = 'Calligraphy';
            isDrawing = true;
            lineWidth = 2;
            shadowBlur = 0;
            break;
        case '01001': // Neon Glow
            currentBrush = 'Neon Glow';
            isDrawing = true;
            lineWidth = 6;
            shadowBlur = 10;
            drawCtx.shadowColor = currentColor;
            break;
        case '11100': // Laser Pointer
            currentBrush = 'Laser Pointer';
            isDrawing = false; // Override: no drawing
            break;
        default:
            isDrawing = false;
            break;
    }

    if (isDrawing && currentBrush !== 'Laser Pointer') {
        // Only start drawing if we moved enough to prevent dots or just starting
        if (prevX !== 0 && prevY !== 0) {
            drawCtx.beginPath();
            drawCtx.moveTo(prevX, prevY);
            drawCtx.lineTo(x, y);
            drawCtx.strokeStyle = currentColor;
            drawCtx.lineWidth = lineWidth;
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            drawCtx.shadowBlur = shadowBlur;
            if (shadowBlur > 0) drawCtx.shadowColor = currentColor;
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

function processGestures(landmarks, handedness, w, h) {
    // Smoothed target
    const targetX = w - (landmarks[8].x * w); // Mirrored
    const targetY = landmarks[8].y * h;

    if (smoothedX === 0 && smoothedY === 0) {
        smoothedX = targetX;
        smoothedY = targetY;
    } else {
        smoothedX = lerp(smoothedX, targetX, LERP_FACTOR);
        smoothedY = lerp(smoothedY, targetY, LERP_FACTOR);
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

    if (actionStr === '11111') {
        if (Date.now() - lastClearTime > 1000) {
            drawCtx.clearRect(0, 0, w, h);
            canvasHistory = [];
            lastClearTime = Date.now();
        }
        isDrawing = false;
    } else if (actionStr === '10001') {
        if (Date.now() - lastPaletteTime > 500) {
            colorIndex = (colorIndex + 1) % PREMIUM_COLORS.length;
            currentColor = PREMIUM_COLORS[colorIndex];
            lastPaletteTime = Date.now();
            
            // Highlight color in UI if available
            const swatches = document.querySelectorAll('.cb-swatch');
            if (swatches.length > 0) {
                swatches.forEach(sw => sw.classList.remove('active'));
                const targetSwatch = Array.from(swatches).find(sw => sw.dataset.color === currentColor);
                if (targetSwatch) targetSwatch.classList.add('active');
            }
        }
        isDrawing = false;
    } else if (actionStr === '00000') {
        isDrawing = false;
    } else {
        isDrawing = true;
        executeDrawingLogic(smoothedX, smoothedY, actionStr);
    }

    // Update gesture indicator
    const indicator = document.getElementById('gestureIndicator');
    if (indicator) {
        if (isDrawing && actionStr === '01000') {
             indicator.innerHTML = '✨ Premium Pen';
        } else if (isDrawing && actionStr === '01100') {
             indicator.innerHTML = '🧹 Smart Eraser';
        } else if (actionStr === '10001') {
             indicator.innerHTML = '🎨 Color Changed';
        } else {
             indicator.innerHTML = '✋ Waiting for gesture...';
        }
    }

    // Draw UI Cursor
    uiCtx.beginPath();
    uiCtx.arc(smoothedX, smoothedY, 10, 0, 2 * Math.PI);
    uiCtx.fillStyle = actionStr === '01100' ? '#ffffff' : currentColor;
    uiCtx.fill();
    uiCtx.shadowBlur = 0;

    if (!isDrawing) {
        prevX = 0;
        prevY = 0;
    } else {
        prevX = smoothedX;
        prevY = smoothedY;
    }
}

function processTwoHands(handsData, w, h) {
    // Disabled all complex two hand gestures for simplicity
    return;
}

function onResultsElite(results) {
    if (!uiCtx) return;
    const w = uiCanvas.width;
    const h = uiCanvas.height;

    // Draw video to UI canvas (mirrored)
    uiCtx.save();
    uiCtx.clearRect(0, 0, w, h);
    if (document.getElementById("camVideo")) { document.getElementById("camVideo").style.opacity = isPresentationMode ? "0" : "1"; }
    uiCtx.restore();

    if (isLocked) {
        uiCtx.fillStyle = 'rgba(255,0,0,0.5)';
        uiCtx.font = '24px sans-serif';
        uiCtx.fillText("SCREEN LOCKED", 50, 50);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const numHands = results.multiHandLandmarks.length;
        
        if (numHands === 1) {
            processGestures(results.multiHandLandmarks[0], results.multiHandedness[0].label, w, h);
        } else if (numHands === 2) {
            const handsData = [
                { landmarks: results.multiHandLandmarks[0], classification: results.multiHandedness[0].label },
                { landmarks: results.multiHandLandmarks[1], classification: results.multiHandedness[1].label }
            ];
            processTwoHands(handsData, w, h);
            // Also process gestures for the dominant hand (index 0 usually)
            processGestures(handsData[0].landmarks, handsData[0].classification, w, h);
        }
    } else {
        prevX = 0; prevY = 0;
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


