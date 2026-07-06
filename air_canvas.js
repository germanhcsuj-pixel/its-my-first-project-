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
let currentColor = '#FFD700'; // Default Premium Gold
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

const PREMIUM_COLORS = ['#FFD700', '#C0C0C0', '#1A1A1A', '#ec4899', '#3b82f6', '#ffffff'];
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
    
    // Thumb: Using distance to pinky base (17) vs mcp (2)
    const distTip = getDistance(landmarks[4], landmarks[17], 1, 1);
    const distMcp = getDistance(landmarks[2], landmarks[17], 1, 1);
    states[0] = distTip > distMcp ? 1 : 0;
    
    // Index, Middle, Ring, Pinky (y comparison)
    states[1] = landmarks[8].y < landmarks[6].y ? 1 : 0;
    states[2] = landmarks[12].y < landmarks[10].y ? 1 : 0;
    states[3] = landmarks[16].y < landmarks[14].y ? 1 : 0;
    states[4] = landmarks[20].y < landmarks[18].y ? 1 : 0;
    
    return states;
}

function executeDrawingLogic(x, y, gestureString) {
    if (!drawCtx) return;

    // Reset some defaults before applying specific logic
    drawCtx.globalCompositeOperation = 'source-over';
    
    switch (gestureString) {
        case '01000': // Premium Pen
            currentBrush = 'Premium Pen';
            lineWidth = 5;
            shadowBlur = 0;
            break;
        case '01100': // Smart Eraser
            currentBrush = 'Smart Eraser';
            lineWidth = 40;
            shadowBlur = 0;
            drawCtx.globalCompositeOperation = 'destination-out';
            break;
        case '01110': // Thick Marker
            currentBrush = 'Thick Marker';
            lineWidth = 15;
            shadowBlur = 0;
            break;
        case '00001': // Calligraphy
            currentBrush = 'Calligraphy';
            lineWidth = 2;
            shadowBlur = 0;
            break;
        case '01001': // Neon Glow
            currentBrush = 'Neon Glow';
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

    // Initial jump if smoothed is 0
    if (smoothedX === 0 && smoothedY === 0) {
        smoothedX = targetX;
        smoothedY = targetY;
    } else {
        smoothedX = lerp(smoothedX, targetX, LERP_FACTOR);
        smoothedY = lerp(smoothedY, targetY, LERP_FACTOR);
    }

    const states = getFingerStates(landmarks, handedness);
    const gStr = states.join('');
    
    // Distances for Pinches
    const dThumbIndex = getDistance(landmarks[4], landmarks[8], w, h);
    const dThumbMiddle = getDistance(landmarks[4], landmarks[12], w, h);
    const dThumbRing = getDistance(landmarks[4], landmarks[16], w, h);
    const dThumbPinky = getDistance(landmarks[4], landmarks[20], w, h);
    const PINCH_THRESH = 40;

    // Crossed Fingers (Index X crosses Middle X)
    // Remember mirrored X! So if left hand is mirrored, 8.x > 12.x might mean crossed
    const isCrossed = Math.abs(landmarks[8].x - landmarks[12].x) * w > 10 && landmarks[8].y > landmarks[12].y;

    // 17. Crossed Fingers -> Lock Screen
    if (states[1] && states[2] && !states[3] && !states[4] && isCrossed) {
        if (Date.now() - lastLockTime > 1000) {
            isLocked = !isLocked;
            lastLockTime = Date.now();
        }
    }

    if (isLocked) {
        // Only allow Fist to unlock
        if (gStr === '00000') {
             if (Date.now() - lastLockTime > 1000) {
                 isLocked = false;
                 lastLockTime = Date.now();
             }
        }
        return; // Block everything else
    }

    // Draw UI Cursor
    uiCtx.beginPath();
    uiCtx.arc(smoothedX, smoothedY, currentBrush === 'Laser Pointer' ? 6 : 10, 0, 2 * Math.PI);
    uiCtx.fillStyle = currentBrush === 'Laser Pointer' ? 'red' : currentColor;
    if (currentBrush === 'Laser Pointer') {
        uiCtx.shadowColor = 'red';
        uiCtx.shadowBlur = 15;
    }
    uiCtx.fill();
    uiCtx.shadowBlur = 0;

    // 16. All Pinch (Beak) -> Presentation Mode
    if (dThumbIndex < PINCH_THRESH && dThumbMiddle < PINCH_THRESH && dThumbRing < PINCH_THRESH && dThumbPinky < PINCH_THRESH) {
        if (Date.now() - lastPresentationTime > 1000) {
            isPresentationMode = !isPresentationMode;
            lastPresentationTime = Date.now();
        }
        isDrawing = false;
    }
    // 12. Pinch (Index) -> Color Picker
    else if (dThumbIndex < PINCH_THRESH && !states[2] && !states[3] && !states[4]) {
        currentColor = getColorFromVideo(smoothedX, smoothedY);
        isDrawing = false;
    }
    // 13. Pinch Middle
    else if (dThumbMiddle < PINCH_THRESH && !states[1] && !states[3] && !states[4]) {
        currentColor = '#ef4444'; // Red
        isDrawing = false;
    }
    // 14. Pinch Ring
    else if (dThumbRing < PINCH_THRESH && !states[1] && !states[2] && !states[4]) {
        currentColor = '#3b82f6'; // Blue
        isDrawing = false;
    }
    // 15. Pinch Pinky
    else if (dThumbPinky < PINCH_THRESH && !states[1] && !states[2] && !states[3]) {
        currentColor = '#ffffff'; // White
        isDrawing = false;
    }
    // Static Gestures Map
    else {
        switch (gStr) {
            case '00000': // 7. Pan / Hover
                isDrawing = false;
                break;
            case '11111': // 8. Hard Reset
                if (Date.now() - lastClearTime > 1000) {
                    drawCtx.clearRect(0, 0, w, h);
                    canvasHistory = [];
                    lastClearTime = Date.now();
                }
                isDrawing = false;
                break;
            case '10000': // 9. Undo
                undo();
                isDrawing = false;
                break;
            case '10001': // 10. Palette Switch
                if (Date.now() - lastPaletteTime > 500) {
                    colorIndex = (colorIndex + 1) % PREMIUM_COLORS.length;
                    currentColor = PREMIUM_COLORS[colorIndex];
                    lastPaletteTime = Date.now();
                }
                isDrawing = false;
                break;
            case '11000': // 11. Save Document
                if (Date.now() - lastSaveDocTime > 2000) {
                    const link = document.createElement('a');
                    link.download = 'solifon-elite-canvas.png';
                    link.href = drawCanvas.toDataURL();
                    link.click();
                    lastSaveDocTime = Date.now();
                }
                isDrawing = false;
                break;
            default:
                // Try drawing logic (returns true if drawing happens, wait execute handles it)
                isDrawing = true;
                executeDrawingLogic(smoothedX, smoothedY, gStr);
                break;
        }
    }

    if (!isDrawing) {
        prevX = 0;
        prevY = 0;
    } else {
        prevX = smoothedX;
        prevY = smoothedY;
    }
}

// Two hands logic
let lastDirectorTime = 0;
function processTwoHands(handsData, w, h) {
    const states0 = getFingerStates(handsData[0].landmarks, handsData[0].classification);
    const states1 = getFingerStates(handsData[1].landmarks, handsData[1].classification);
    const str0 = states0.join('');
    const str1 = states1.join('');

    // 18. Two Palms -> End Session
    if (str0 === '11111' && str1 === '11111') {
        stopAirCanvasElite();
        // optionally send message to parent to hide iframe
//         window.parent.postMessage('closeNewFeatureModal', '*');
        return;
    }

    // 19. Two Fists -> Invert Colors
    if (str0 === '00000' && str1 === '00000') {
        if (Date.now() - lastModeTime > 1000) {
            isDarkMode = !isDarkMode;
            document.body.style.filter = isDarkMode ? 'none' : 'invert(1)';
            lastModeTime = Date.now();
        }
        return;
    }

    // 20. Ruler Mode (Left Pinch + Right Index)
    // simplified: just check if one is pinch, one is index
    const isPinch0 = getDistance(handsData[0].landmarks[4], handsData[0].landmarks[8], w, h) < 40 && !states0[2] && !states0[3] && !states0[4];
    const isPinch1 = getDistance(handsData[1].landmarks[4], handsData[1].landmarks[8], w, h) < 40 && !states1[2] && !states1[3] && !states1[4];
    const isIndex0 = str0 === '01000';
    const isIndex1 = str1 === '01000';

    if ((isPinch0 && isIndex1) || (isPinch1 && isIndex0)) {
        const anchor = isPinch0 ? handsData[0].landmarks[8] : handsData[1].landmarks[8];
        const drawer = isIndex0 ? handsData[0].landmarks[8] : handsData[1].landmarks[8];
        
        const ax = w - (anchor.x * w);
        const ay = anchor.y * h;
        const dx = w - (drawer.x * w);
        const dy = drawer.y * h;

        uiCtx.beginPath();
        uiCtx.moveTo(ax, ay);
        uiCtx.lineTo(dx, dy);
        uiCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        uiCtx.setLineDash([5, 5]);
        uiCtx.stroke();
        uiCtx.setLineDash([]);
        
        // Actually draw a solid line on drawCanvas if needed, but usually ruler mode previews first
        return;
    }

    // Director's Frame (Two pinch) with Hysteresis
    const distPinchToPinch = getDistance(handsData[0].landmarks[8], handsData[1].landmarks[8], 1, 1);
    
    // Hysteresis: start if dist < 0.8 (hands not too far, just a simple frame check)
    // Actually hysteresis was about starting the timer vs cancelling it.
    if (isPinch0 && isPinch1) {
        if (!window.directorTimer) {
            window.directorTimer = { start: Date.now(), active: true };
        }
        
        const anchor0 = handsData[0].landmarks[8];
        const anchor1 = handsData[1].landmarks[8];
        const x1 = Math.min(anchor0.x, anchor1.x) * w;
        const x2 = Math.max(anchor0.x, anchor1.x) * w;
        const y1 = Math.min(anchor0.y, anchor1.y) * h;
        const y2 = Math.max(anchor0.y, anchor1.y) * h;
        
        // Draw frame with dark overlay
        uiCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
        uiCtx.fillRect(0, 0, w, h);
        uiCtx.clearRect(w - x2, y1, x2 - x1, y2 - y1);
        uiCtx.strokeStyle = "#fff";
        uiCtx.lineWidth = 2;
        uiCtx.strokeRect(w - x2, y1, x2 - x1, y2 - y1);
        
        const elapsed = Date.now() - window.directorTimer.start;
        const remaining = Math.ceil(3 - (elapsed / 1000));
        
        if (remaining > 0) {
            uiCtx.fillStyle = "#fff";
            uiCtx.font = "bold 72px sans-serif";
            uiCtx.textAlign = "center";
            uiCtx.fillText(remaining, w / 2, h / 2);
        } else if (window.directorTimer.active) {
            window.directorTimer.active = false;
            // Flash and Save
            const flash = document.createElement("div");
            flash.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:white;z-index:9999;transition:opacity 0.5s;";
            document.body.appendChild(flash);
            setTimeout(() => { flash.style.opacity = "0"; setTimeout(() => flash.remove(), 500); }, 50);
            
            // Save cropped image
            const tCanvas = document.createElement("canvas");
            const fw = x2 - x1; const fh = y2 - y1;
            if (fw > 0 && fh > 0) {
                tCanvas.width = fw; tCanvas.height = fh;
                const tCtx = tCanvas.getContext("2d");
                tCtx.drawImage(uiCanvas, w - x2, y1, fw, fh, 0, 0, fw, fh);
                tCtx.drawImage(drawCanvas, w - x2, y1, fw, fh, 0, 0, fw, fh);
                
                // Watermark
                tCtx.fillStyle = "rgba(255, 255, 255, 0.8)";
                tCtx.font = "bold 20px sans-serif";
                tCtx.fillText("Solifon AI", fw - 120, fh - 20);
                
                const link = document.createElement("a");
                link.download = "director_shot.png";
                link.href = tCanvas.toDataURL();
                link.click();
            }
        }
    } else {
        if (window.directorTimer) window.directorTimer = null;
    }
}

function onResultsElite(results) {
    if (!uiCtx) return;
    const w = uiCanvas.width;
    const h = uiCanvas.height;

    // Draw video to UI canvas (mirrored)
    uiCtx.save();
    uiCtx.clearRect(0, 0, w, h);
    if (!isPresentationMode) {
        uiCtx.scale(-1, 1);
        uiCtx.translate(-w, 0);
        uiCtx.drawImage(results.image, 0, 0, w, h);
    }
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


