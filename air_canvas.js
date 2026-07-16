// ============================================================
//  AIR CANVAS ELITE  –  v4.0  (GestureEngine + 40 жестов)
//  Levels: 1=Drawing  2=Gallery/3D  3=Hologram
// ============================================================

const videoElement = document.getElementById('camVideo');
const uiCanvas    = document.getElementById('uiCanvas');
const drawCanvas  = document.getElementById('drawCanvas');
const uiCtx       = uiCanvas   ? uiCanvas.getContext('2d',   { willReadFrequently: true }) : null;
const drawCtx     = drawCanvas ? drawCanvas.getContext('2d',  { willReadFrequently: true }) : null;

// ─── Плавность курсора ───────────────────────────────────────
const LERP_FACTOR = 0.2;

// ─── Системные флаги ─────────────────────────────────────────
let isRunning          = false;
let camera             = null;
let hands              = null;
let faceMesh           = null;
let currentFaceLandmarks = null;
let arMaskModel        = null;
let isPresentationMode = false;
let isFrozen           = false;   // заморозка вращения 3D
let isFramingPhoto     = false;   // Selfie Drop (обе Peace)
let isGridVisible      = false;
let fillHoldTimer      = 0;
let isFilling          = false;
let isArModeActive     = false;
let arFlashEndTime     = 0;

// ─── Состояния рук ───────────────────────────────────────────
const handStates = [
    { x: 0, y: 0, px: 0, py: 0, lastX: 0, lastY: 0,
      isDrawing: false, color: '#ef4444', action: '00000',
      brush: 'Premium Pen', width: 5, shadow: 0, isLoupeActive: false },
    { x: 0, y: 0, px: 0, py: 0, lastX: 0, lastY: 0,
      isDrawing: false, color: '#3b82f6', action: '00000',
      brush: 'Premium Pen', width: 5, shadow: 0, isLoupeActive: false }
];

// ─── Галерея ─────────────────────────────────────────────────
let uploadedAssets   = [];
let galleryRotation  = 0;
let galleryZoom      = 1.0;

// ─── История Undo / Redo ──────────────────────────────────────
let canvasHistory    = [];
let redoStack        = [];
const MAX_HISTORY    = 20;
let lastSaveTime     = 0;

// ─── Уровни ──────────────────────────────────────────────────
let currentLevel = 1;
let currentColor = '#ef4444';

const PREMIUM_COLORS = ['#ef4444','#3b82f6','#10b981','#f59e0b','#ffffff','#a855f7','#ec4899'];
let colorIndex = [0, 0];

// ─── Three.js объекты ─────────────────────────────────────────
let threeScene        = null;
let threeCamera       = null;
let threeRenderer     = null;
let threeAnimId       = null;
let demoModels        = [];
let currentModelIndex = 2; // Default to procedural house
let modelSelected = true;
let zoomBaseDist      = null;

// ─── Глобальные кулдауны ──────────────────────────────────────
const CD = {};   // cooldown map: key → lastFiredTime
function cooldown(key, ms) {
    const now = Date.now();
    if (!CD[key] || now - CD[key] > ms) { CD[key] = now; return true; }
    return false;
}


// ══════════════════════════════════════════════════════════════
//  CSS-ИНЪЕКЦИЯ
// ══════════════════════════════════════════════════════════════
(function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #snapshotFlashOverlay {
            position: fixed; top: 0; left: 0;
            width: 100%; height: 100%;
            background: #fff;
            opacity: 0; pointer-events: none; z-index: 9999;
            transition: opacity 0.25s ease-out;
        }
        #sysNotification {
            position: fixed; bottom: 60px; left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: rgba(10,10,10,0.85);
            border: 1px solid rgba(255,255,255,0.15);
            backdrop-filter: blur(16px);
            color: #fff; font-family: "Segoe UI", sans-serif;
            font-size: 18px; font-weight: 600;
            padding: 14px 32px; border-radius: 50px;
            letter-spacing: 0.5px;
            opacity: 0; pointer-events: none; z-index: 99998;
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
        #sysNotification.show {
            opacity: 1; transform: translateX(-50%) translateY(0);
        }
        .cb-swatch, .color-btn { transition: all 0.2s ease; }
        .cb-swatch.active, .color-btn.active { transform: scale(1.2); box-shadow: 0 0 12px currentColor; }
        #levelSwitcherBtn { transition: all 0.3s ease; }
        .air-upload-btn {
            position: fixed; bottom: 24px; right: 24px;
            z-index: 10000; padding: 12px 20px; border-radius: 10px;
            border: none; font-size: 14px; font-weight: 600; cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.35); transition: all 0.25s ease;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            display: none;
        }
        .air-upload-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.45); }
        #uploadPhotoBtn  { background: #a855f7; color: #fff; }
        #uploadModelBtn  { background: #00ffcc; color: #000; }
        #modelLibraryContainer {
            position: fixed; bottom: 20px; left: 50%;
            transform: translateX(-50%);
            display: none; flex-direction: column; align-items: center;
            z-index: 10000;
            transition: transform 0.3s ease;
            margin: 0; padding: 0;
            pointer-events: none;
        }
        #modelLibraryContainer.hidden {
            transform: translate(-50%, 150%);
        }
        #modelLibraryPanel {
            display: flex; gap: 15px; padding: 15px 25px;
            background: rgba(15, 15, 15, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            pointer-events: auto;
        }
        .model-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white; font-size: 24px;
            width: 50px; height: 50px; border-radius: 12px;
            cursor: pointer; transition: all 0.2s ease;
            display: flex; align-items: center; justify-content: center;
        }
        .model-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: scale(1.1);
        }
        .model-btn.active {
            border-color: #00ffcc;
            box-shadow: 0 0 15px rgba(0, 255, 204, 0.5);
        }
        #toggleLibraryBtn {
            margin-bottom: 10px; background: rgba(0,0,0,0.5);
            color: #aaa; border: none; border-radius: 10px;
            padding: 5px 15px; cursor: pointer; font-size: 12px;
            transition: color 0.2s;
            pointer-events: auto;
        }
        #toggleLibraryBtn:hover { color: #fff; }
    `;
    document.head.appendChild(style);
})();


// ══════════════════════════════════════════════════════════════
//  УВЕДОМЛЕНИЯ (showSystemNotification)
// ══════════════════════════════════════════════════════════════
let _notifTimer = null;
function showSystemNotification(text, durationMs = 2200) {
    // Notifications disabled as per user request
}



// ══════════════════════════════════════════════════════════════
//  СНИМОК ЭКРАНА
// ══════════════════════════════════════════════════════════════
function flashSnapshot() {
    let flash = document.getElementById('snapshotFlashOverlay');
    if (!flash) {
        flash = document.createElement('div');
        flash.id = 'snapshotFlashOverlay';
        document.body.appendChild(flash);
    }
    flash.style.opacity = '0.9';
    setTimeout(() => { flash.style.opacity = '0'; }, 120);
}

function takeARSnapshot() {
    if (!videoElement || !uiCanvas) return;
    const w = uiCanvas.width, h = uiCanvas.height;
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tmpCtx = tmp.getContext('2d');
    if (!tmpCtx) return;
    
    if (videoElement.readyState >= 2) {
        tmpCtx.save();
        tmpCtx.translate(w, 0);
        tmpCtx.scale(-1, 1); // Отзеркаливаем ОДНОВРЕМЕННО и видео, и 3D маску
        tmpCtx.drawImage(videoElement, 0, 0, w, h);
        
        const threeCanvas = document.getElementById('threeCanvas');
        if (threeCanvas) {
            tmpCtx.drawImage(threeCanvas, 0, 0, w, h);
        }
        tmpCtx.restore();
    }

    tmp.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Solifon_AR_Selfie.png';
        document.body.appendChild(link);
        link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    }, 'image/png');

    arFlashEndTime = Date.now() + 150; // Белая вспышка на экране
}

function takeSnapshot() {
    if (!drawCanvas || !videoElement) return;
    const w = drawCanvas.width, h = drawCanvas.height;
    const tmp    = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tmpCtx = tmp.getContext('2d');
    if (!tmpCtx) return;
    if (videoElement.readyState >= 2) tmpCtx.drawImage(videoElement, 0, 0, w, h);
    tmpCtx.drawImage(drawCanvas, 0, 0, w, h);
    tmp.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href  = URL.createObjectURL(blob);
        link.download = 'Solifon_Air_Art.png';
        document.body.appendChild(link);
        link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    }, 'image/png');
    flashSnapshot();
    showSystemNotification('📸  Скриншот сохранён!');
}


// ══════════════════════════════════════════════════════════════
//  УТИЛИТЫ
// ══════════════════════════════════════════════════════════════
function lerp(a, b, t) { return a + (b - a) * t; }

function dist2D(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function getDistance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function getFingerStates(lm) {
    const s = [0, 0, 0, 0, 0];
    const w = lm[0];
    s[0] = getDistance(lm[4], lm[17]) > getDistance(lm[3], lm[17]) ? 1 : 0;
    s[1] = getDistance(lm[8],  w) > getDistance(lm[6],  w) ? 1 : 0;
    s[2] = getDistance(lm[12], w) > getDistance(lm[10], w) ? 1 : 0;
    s[3] = getDistance(lm[16], w) > getDistance(lm[14], w) ? 1 : 0;
    s[4] = getDistance(lm[20], w) > getDistance(lm[18], w) ? 1 : 0;
    return s;
}

function gestureCode(lm) {
    const s = getFingerStates(lm);
    return s.join('');
}

function updatePaletteUI(col) {
    const norm = col.toLowerCase();
    document.querySelectorAll('.cb-swatch, .color-btn').forEach(el => {
        const dc = (el.dataset.color || el.getAttribute('data-color') || '').toLowerCase();
        const active = dc === norm && dc !== '';
        el.classList.toggle('active', active);
        el.style.transform = active ? 'scale(1.2)' : 'scale(1)';
        el.style.boxShadow = active ? `0 0 12px ${col}` : 'none';
    });
}


// ══════════════════════════════════════════════════════════════
//  ИСТОРИЯ UNDO / REDO
// ══════════════════════════════════════════════════════════════
function saveHistory() {
    if (!drawCtx || !drawCanvas) return;
    if (Date.now() - lastSaveTime < 200) return;
    const imgData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    canvasHistory.push(imgData);
    if (canvasHistory.length > MAX_HISTORY) canvasHistory.shift();
    redoStack = [];   // новое действие сбрасывает redo
    lastSaveTime = Date.now();
}

function undo() {
    if (!drawCtx || !drawCanvas) return;
    if (canvasHistory.length > 0) {
        // Перед отменой сохраняем текущее состояние в redo
        redoStack.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
        drawCtx.putImageData(canvasHistory.pop(), 0, 0);
        showSystemNotification('↩️  Отмена');
    }
}

function redo() {
    if (!drawCtx || !drawCanvas) return;
    if (redoStack.length > 0) {
        canvasHistory.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
        drawCtx.putImageData(redoStack.pop(), 0, 0);
        showSystemNotification('↪️  Повтор');
    }
}

function floodFill(ctx, startX, startY, fillColorHex) {
    if (!ctx || !ctx.canvas) return;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    if (startX < 0 || startY < 0 || startX >= w || startY >= h) return;
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fillColorHex);
    if (!result) return;
    const fillR = parseInt(result[1], 16);
    const fillG = parseInt(result[2], 16);
    const fillB = parseInt(result[3], 16);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const startPos = (startY * w + startX) * 4;
    const targetR = data[startPos];
    const targetG = data[startPos+1];
    const targetB = data[startPos+2];

    const initDiff = Math.abs(fillR - targetR) + Math.abs(fillG - targetG) + Math.abs(fillB - targetB);
    if (initDiff <= 80) return;

    const tolerance = 80;

    function colorMatch(pos) {
        const diff = Math.abs(data[pos] - targetR) + Math.abs(data[pos+1] - targetG) + Math.abs(data[pos+2] - targetB);
        return diff <= tolerance;
    }

    const pixelStack = [[startX, startY]];

    while(pixelStack.length > 0) {
        const newPos = pixelStack.pop();
        let x = newPos[0];
        let y = newPos[1];
        let pixelPos = (y * w + x) * 4;
        
        while(y-- >= 0 && colorMatch(pixelPos)) {
            pixelPos -= w * 4;
        }
        pixelPos += w * 4;
        ++y;
        let reachLeft = false;
        let reachRight = false;
        
        while(y++ < h-1 && colorMatch(pixelPos)) {
            data[pixelPos] = fillR;
            data[pixelPos+1] = fillG;
            data[pixelPos+2] = fillB;
            data[pixelPos+3] = 255;

            if (x > 0) {
                if (colorMatch(pixelPos - 4)) {
                    if (!reachLeft) { pixelStack.push([x - 1, y]); reachLeft = true; }
                } else if (reachLeft) { reachLeft = false; }
            }

            if (x < w - 1) {
                if (colorMatch(pixelPos + 4)) {
                    if (!reachRight) { pixelStack.push([x + 1, y]); reachRight = true; }
                } else if (reachRight) { reachRight = false; }
            }

            pixelPos += w * 4;
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

// ══════════════════════════════════════════════════════════════
//  РАМКА КАДРИРОВАНИЯ (Selfie Drop)
// ══════════════════════════════════════════════════════════════
function drawFramingOverlay(ctx, w, h) {
    const m = 30, cl = 50, lw = 4;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, w, m);
    ctx.fillRect(0, h - m, w, m);
    ctx.fillRect(0, 0, m, h);
    ctx.fillRect(w - m, 0, m, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = lw; ctx.lineCap = 'round';
    const x0 = m, y0 = m, x1 = w - m, y1 = h - m;
    ctx.beginPath(); ctx.moveTo(x0, y0+cl); ctx.lineTo(x0, y0); ctx.lineTo(x0+cl, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1-cl, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0+cl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y1-cl); ctx.lineTo(x0, y1); ctx.lineTo(x0+cl, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1-cl, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1-cl); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✌️  SELFIE FRAME  —  сожми кулаки чтобы снять', w / 2, h - m - 12);
    ctx.restore();
}


// ══════════════════════════════════════════════════════════════
//  ██████  GestureEngine  ██████
//  Единый движок: распознаёт позы, вычисляет события-жесты
// ══════════════════════════════════════════════════════════════
const GestureEngine = {

    // ── Настройки порогов ────────────────────────────────────
    SWIPE_THRESHOLD   : 28,   // px за кадр для свайпа
    PINCH_CLOSE_DIST  : 0.06, // нормализованное расстояние = щепотка
    CLAP_DIST         : 120,  // px — расстояние рук при хлопке
    CLAP_SPEED        : 18,   // px/кадр скорость сближения
    CROSS_WRIST_DIST  : 0.05, // нормализованная дельта-X запястий

    // ── История координат для детекции кругов ───────────────
    _lassoTrail : [],
    _lassoActive: false,

    // ── Хлопок: запоминаем дистанцию прошлого кадра ─────────
    _prevHandDist: null,

    // ── Сброс между сессиями ─────────────────────────────────
    reset() {
        this._lassoTrail  = [];
        this._lassoActive = false;
        this._prevHandDist = null;
    },

    // ── Код жеста из landmarks → '01000' и т.п. ─────────────
    getCode(lm) {
        return getFingerStates(lm).join('');
    },

    // ── Канонический маппинг кода жеста ─────────────────────
    canonize(code) {
        const map = {
            '01000': 'INDEX',      // Указательный
            '00001': 'PINKY',      // Мизинец
            '01001': 'ROCK',       // Указательный + Мизинец (большой прижат)
            '11001': 'ROCK',       // Указательный + Мизинец (большой оттопырен)
            '01110': 'THREE',      // Три пальца
            '11000': 'GUN',        // Пистолет (большой + указательный)
            '01100': 'PEACE',      // V / Peace
            '11111': 'OPEN',       // Открытая ладонь
            '10000': 'THUMB',      // Большой вверх
            '00000': 'FIST',       // Кулак
            '01111': 'FOUR',       // Четыре пальца
            '10001': 'SHAKA',      // Shaka / Телефон
            '11110': 'OK_BASE',    // 4 пальца без большого (ОК)
            '01011': 'CROSS_FIN',  // Указательный + средний скрещены
        };
        return map[code] || 'UNKNOWN';
    },

    // ── Детектировать свайп по одной руке ───────────────────
    //    Возвращает 'SWIPE_LEFT' | 'SWIPE_RIGHT' | 'SWIPE_UP' |
    //              'SWIPE_DOWN' | null
    detectSwipe(state) {
        if (state.px === 0) return null;
        const dx = state.x - state.px;
        const dy = state.y - state.py;
        const th = this.SWIPE_THRESHOLD;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < -th) return 'SWIPE_LEFT';
            if (dx >  th) return 'SWIPE_RIGHT';
        } else {
            if (dy < -th) return 'SWIPE_UP';
            if (dy >  th) return 'SWIPE_DOWN';
        }
        return null;
    },

    // ── Пинч-детектор для одной руки ────────────────────────
    //    landmarks[4] = большой, landmarks[8] = указательный
    detectPinch(lm) {
        return getDistance(lm[4], lm[8]) < this.PINCH_CLOSE_DIST;
    },

    // ── Хлопок: обе руки резко сближаются ───────────────────
    detectClap(s1, s2) {
        if (s1.x === 0 || s2.x === 0) return false;
        const d = dist2D(s1.x, s1.y, s2.x, s2.y);
        const wasApart = this._prevHandDist !== null && this._prevHandDist > this.CLAP_DIST + 60;
        const speedIn  = this._prevHandDist !== null ? (this._prevHandDist - d) : 0;
        this._prevHandDist = d;
        return wasApart && d < this.CLAP_DIST && speedIn > this.CLAP_SPEED;
    },



    // ── Руки раздвинуты → разведение ────────────────────────
    detectHandsApart(s1, s2, threshold = 400) {
        if (s1.x === 0 || s2.x === 0) return false;
        return dist2D(s1.x, s1.y, s2.x, s2.y) > threshold;
    },

    detectOKSign(lm) {
        const w = lm[0];
        const isPinch = getDistance(lm[4], lm[8]) < this.PINCH_CLOSE_DIST;
        const midUp = getDistance(lm[12], w) > getDistance(lm[10], w);
        const ringUp = getDistance(lm[16], w) > getDistance(lm[14], w);
        const pinkyUp = getDistance(lm[20], w) > getDistance(lm[18], w);
        return isPinch && midUp && ringUp && pinkyUp ? 'OK_SIGN' : null;
    },

    detectCrossedFingers(lm) {
        const w = lm[0];
        const indUp = getDistance(lm[8], w) > getDistance(lm[6], w);
        const midUp = getDistance(lm[12], w) > getDistance(lm[10], w);
        const crossX = Math.abs(lm[8].x - lm[12].x) < 0.02;
        const crossY = Math.abs(lm[8].y - lm[12].y) < 0.05;
        return indUp && midUp && crossX && crossY ? 'CROSS_FIN' : null;
    },

    // ── Лассо: круговое движение указательным ───────────────
    updateLasso(state, code) {
        if (code === 'INDEX') {
            this._lassoTrail.push({ x: state.x, y: state.y });
            if (this._lassoTrail.length > 60) this._lassoTrail.shift();
            if (this._lassoTrail.length > 30) return this._checkCircle();
        } else {
            this._lassoTrail = [];
        }
        return false;
    },

    _checkCircle() {
        const t = this._lassoTrail;
        const cx = t.reduce((s, p) => s + p.x, 0) / t.length;
        const cy = t.reduce((s, p) => s + p.y, 0) / t.length;
        const radii = t.map(p => dist2D(p.x, p.y, cx, cy));
        const mean  = radii.reduce((s, r) => s + r, 0) / radii.length;
        if (mean < 20) return false;
        const variance = radii.reduce((s, r) => s + (r - mean) ** 2, 0) / radii.length;
        return Math.sqrt(variance) / mean < 0.35;  // достаточно круглое
    },

    // ── Главный анализ кадра ─────────────────────────────────
    //    Возвращает массив строк-событий: ['SWIPE_LEFT', 'LASSO', ...]
    analyze(handLandmarks, handStatesArr) {
        const events = [];
        const n = handLandmarks.length;
        if (n === 0) { this.reset(); return events; }

        const codes = handLandmarks.map(lm => this.getCode(lm));
        const cans  = codes.map(c => this.canonize(c));

        // ── Одна рука ───────────────────────────────────────
        const s0 = handStatesArr[0];
        
        const ok0 = this.detectOKSign(handLandmarks[0]);
        const cross0 = this.detectCrossedFingers(handLandmarks[0]);
        if (ok0) cans[0] = ok0;
        else if (cross0) cans[0] = cross0;

        const swipe0 = this.detectSwipe(s0);
        if (swipe0) events.push(swipe0 + '_H0');   // H0 = рука 0

        const s1 = handStatesArr[1];
        if (n >= 2) {
            const swipe1 = this.detectSwipe(s1);
            if (swipe1) events.push(swipe1 + '_H1');
        }

        // ── Pinch ────────────────────────────────────────────
        if (this.detectPinch(handLandmarks[0])) events.push('PINCH_H0');
        if (n >= 2 && this.detectPinch(handLandmarks[1])) events.push('PINCH_H1');

        // ── Лассо ────────────────────────────────────────────
        if (this.updateLasso(s0, cans[0])) events.push('LASSO');

        // ── Двуручные ────────────────────────────────────────
        if (n >= 2) {
            if (this.detectClap(s0, s1))
                events.push('CLAP');
            // Два одинаковых жеста
            const both = `${cans[0]}+${cans[1]}`;
            events.push('DUAL:' + both);
            // Два кулака = зум
            if (cans[0] === 'FIST' && cans[1] === 'FIST') events.push('DUAL_FIST');
            // Две "козы" (Рок) = AR режим
            if (cans[0] === 'ROCK' && cans[1] === 'ROCK') events.push('DUAL_ROCK');
            // Обе Peace = Selfie
            if (cans[0] === 'PEACE' && cans[1] === 'PEACE') events.push('DUAL_PEACE');
            // Оба Thumb
            if (cans[0] === 'THUMB' && cans[1] === 'THUMB') events.push('DUAL_THUMB');
            // Левый кулак + правая ладонь
            if ((cans[0] === 'FIST' && cans[1] === 'OPEN') ||
                (cans[0] === 'OPEN' && cans[1] === 'FIST'))
                events.push('FIST_OPEN');
            // Два указательных сводятся
            if (cans[0] === 'INDEX' && cans[1] === 'INDEX') events.push('DUAL_INDEX');
        }

        // ── Добавляем базовые коды обеих рук ────────────────
        events.push('CODE0:' + cans[0]);
        if (n >= 2) events.push('CODE1:' + cans[1]);

        return events;
    }
};


// ══════════════════════════════════════════════════════════════
//  РИСОВАНИЕ (Level 1)
// ══════════════════════════════════════════════════════════════
function executeDrawingLogic(state, code) {
    if (!drawCtx) return;
    drawCtx.globalCompositeOperation = 'source-over';
    state.shadow = 0;

    switch (code) {
        case 'INDEX':        state.brush='Premium Pen';   state.width=5;  break;
        case 'PINKY':        state.brush='Calligraphy';   state.width=2;  break;
        case 'ROCK':         state.brush='Neon Glow';     state.width=6;  state.shadow=12; break;
        case 'THREE':        state.brush='Thick Marker';  state.width=18; break;
        case 'PEACE':
            state.brush='Smart Eraser'; state.width=40;
            drawCtx.globalCompositeOperation = 'destination-out';
            break;
        case 'GUN':
            // Лазерная указка — не рисует, только курсор
            state.isDrawing = false; return;
        default: state.isDrawing = false; return;
    }

    state.isDrawing = true;
    if (state.px !== 0 && state.py !== 0) {
        drawCtx.beginPath();
        drawCtx.moveTo(state.px, state.py);
        drawCtx.lineTo(state.x, state.y);
        drawCtx.strokeStyle = state.color;
        drawCtx.lineWidth   = state.width;
        drawCtx.lineCap     = 'round';
        drawCtx.lineJoin    = 'round';
        drawCtx.shadowBlur  = state.shadow;
        if (state.shadow > 0) drawCtx.shadowColor = state.color;
        drawCtx.stroke();
        drawCtx.shadowBlur = 0;
        saveHistory();
    }
}

// Лазерный курсор
function drawLaserPointer(x, y) {
    if (!uiCtx) return;
    uiCtx.save();
    uiCtx.beginPath();
    uiCtx.arc(x, y, 6, 0, Math.PI * 2);
    uiCtx.fillStyle = '#ff0000';
    uiCtx.shadowColor = '#ff4444';
    uiCtx.shadowBlur  = 20;
    uiCtx.fill();
    uiCtx.restore();
}

// Лассо-визуализация
function drawLassoTrail() {
    const t = GestureEngine._lassoTrail;
    if (t.length < 3 || !uiCtx) return;
    uiCtx.save();
    uiCtx.beginPath();
    uiCtx.moveTo(t[0].x, t[0].y);
    for (let i = 1; i < t.length; i++) uiCtx.lineTo(t[i].x, t[i].y);
    uiCtx.strokeStyle = 'rgba(168,85,247,0.7)';
    uiCtx.lineWidth = 2;
    uiCtx.setLineDash([6, 4]);
    uiCtx.stroke();
    uiCtx.setLineDash([]);
    uiCtx.restore();
}


// ══════════════════════════════════════════════════════════════
//  THREE.JS — ИНИЦИАЛИЗАЦИЯ
// ══════════════════════════════════════════════════════════════
function initThreeJS() {
    let threeCanvas = document.getElementById('threeCanvas');
    if (!threeCanvas) {
        threeCanvas = document.createElement('canvas');
        threeCanvas.id = 'threeCanvas';
        threeCanvas.style.cssText =
            'position:absolute;top:0;left:0;width:100%;height:100%;z-index:25;pointer-events:none;';
    }
    const container = document.querySelector('.tablet-screen') || document.body;
    if (threeCanvas.parentNode !== container) {
        container.appendChild(threeCanvas);
    }

    threeScene  = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    threeCamera.position.z = 5;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemiLight.position.set(0, 20, 0);
    threeScene.add(hemiLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    threeScene.add(dirLight);

    threeRenderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
    threeRenderer.setPixelRatio(window.devicePixelRatio);
    threeRenderer.setClearColor(0x000000, 0);

    demoModels = [];

    // 0: Fox, 1: Duck, 2: House, 3: Robot, 4: Rocket, 5: Crystal
    for (let i = 0; i < 6; i++) {
        const g = new THREE.Group();
        g.visible = false;
        g.userData = { isPinned: false };
        threeScene.add(g);
        demoModels.push(g);
    }

    if (window.THREE && window.THREE.GLTFLoader) {
        const loader = new THREE.GLTFLoader();
        
        loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb', (gltf) => {
            arMaskModel = gltf.scene;
            arMaskModel.visible = false;
            // Центрируем и масштабируем маску
            const box = new THREE.Box3().setFromObject(arMaskModel);
            const size = box.getSize(new THREE.Vector3()).length();
            const scale = 3.0 / size; 
            arMaskModel.scale.set(scale, scale, scale);
            const center = box.getCenter(new THREE.Vector3());
            arMaskModel.position.sub(center.multiplyScalar(scale));
            
            threeScene.add(arMaskModel);
        });

        // Fox
        loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb', (gltf) => {
            const m = gltf.scene; m.scale.set(0.02, 0.02, 0.02); m.position.y = -0.5; demoModels[0].add(m);
        });
        // Duck
        loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb', (gltf) => {
            const m = gltf.scene; m.scale.set(1, 1, 1); m.position.y = -0.5; demoModels[1].add(m);
        });

        // Custom Upload Event
        const btnCustomUpload = document.getElementById('btnCustomUpload');
        const uploadModelInput = document.getElementById('uploadModelInput');
        if (btnCustomUpload && uploadModelInput) {
            btnCustomUpload.addEventListener('click', () => uploadModelInput.click());
            uploadModelInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                loader.load(URL.createObjectURL(file), (gltf) => {
                    const m = gltf.scene;
                    const box = new THREE.Box3().setFromObject(m);
                    const size = box.getSize(new THREE.Vector3()).length();
                    const scale = 2.5 / size; 
                    m.scale.set(scale, scale, scale);
                    const center = box.getCenter(new THREE.Vector3());
                    m.position.sub(center.multiplyScalar(scale));
                    
                    const group = new THREE.Group();
                    group.add(m); group.visible = false; group.userData = { isPinned: false };
                    threeScene.add(group);
                    demoModels.push(group);
                    
                    const grid = document.querySelector('.holo-grid');
                    if (grid) {
                        const newItem = document.createElement('div');
                        newItem.className = 'holo-item';
                        const idx = demoModels.length - 1;
                        newItem.innerHTML = `🌟 ${file.name.substring(0,10)}...`;
                        newItem.onclick = () => selectHoloModel(idx);
                        grid.insertBefore(newItem, btnCustomUpload);
                    }
                    showSystemNotification('✅ Модель загружена!');
                    document.getElementById('modal3DLibrary').classList.add('hidden');
                    switchDemoModel(demoModels.length - 1);
                });
                uploadModelInput.value = '';
            });
        }
    }

    // Procedural House
    const mat1 = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
    const hBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat1);
    const hRoof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.0, 4), mat1);
    hRoof.position.y = 1.1; hRoof.rotation.y = Math.PI / 4;
    demoModels[2].add(hBody, hRoof);

    // Procedural Robot
    const mat2 = new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true });
    const rHead = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat2); rHead.position.y = 0.9;
    const rBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 8), mat2);
    const rArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8), mat2);
    rArmL.position.set(-0.6, 0.2, 0); rArmL.rotation.z = Math.PI / 4;
    const rArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8), mat2);
    rArmR.position.set(0.6, 0.2, 0); rArmR.rotation.z = -Math.PI / 4;
    demoModels[3].add(rHead, rBody, rArmL, rArmR);

    // Procedural Rocket
    const mat3 = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true });
    const roBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.5, 8), mat3);
    const roNose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 8), mat3); roNose.position.y = 1.05;
    const roWing1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 3), mat3);
    roWing1.position.set(-0.5, -0.2, 0); roWing1.rotation.z = Math.PI / 4;
    const roWing2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 3), mat3);
    roWing2.position.set(0.5, -0.2, 0); roWing2.rotation.z = -Math.PI / 4;
    demoModels[4].add(roBody, roNose, roWing1, roWing2);

    // Crystal
    const mat4 = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true });
    demoModels[5].add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), mat4));

    threeScene.visible = false;
    animateThree();
}

function switchDemoModel(idx) {
    if (!demoModels.length) return;
    modelSelected = true;
    demoModels[currentModelIndex].visible = false;
    currentModelIndex = ((idx % demoModels.length) + demoModels.length) % demoModels.length;
    
    const newModel = demoModels[currentModelIndex];
    newModel.scale.set(0.01, 0.01, 0.01);
    newModel.position.set(0, 0, 0); 
    newModel.userData.isPinned = true;
    
    let targetScale = 1.0;
    function animateSpawn() {
        if (newModel.scale.x < targetScale - 0.01) {
            const s = newModel.scale.x + (targetScale - newModel.scale.x) * 0.15;
            newModel.scale.set(s, s, s);
            requestAnimationFrame(animateSpawn);
        } else {
            newModel.scale.set(targetScale, targetScale, targetScale);
        }
    }
    animateSpawn();
    
    const panelBtns = document.querySelectorAll('.model-btn');
    if (panelBtns.length > 0) {
        panelBtns.forEach(b => b.classList.remove('active'));
        if (panelBtns[currentModelIndex]) panelBtns[currentModelIndex].classList.add('active');
    }
}

function animateThree() {
    requestAnimationFrame(animateThree);
    if (threeScene && threeScene.visible && demoModels.length && modelSelected) {
        const model = demoModels[currentModelIndex];
        if (model) {
            model.userData.vx = (model.userData.vx || 0) * 0.92;
            model.userData.vy = (model.userData.vy || 0) * 0.92;
            model.rotation.y += model.userData.vx;
            model.rotation.x += model.userData.vy;
        }
    }
    threeRenderer.render(threeScene, threeCamera);
}


// ══════════════════════════════════════════════════════════════
//  ПЕРЕКЛЮЧЕНИЕ УРОВНЕЙ
// ══════════════════════════════════════════════════════════════
function switchAirCanvasLevel(level) {
    currentLevel = level;
    for (let i = 0; i < 2; i++) {
        handStates[i].isDrawing = false;
        handStates[i].px = handStates[i].py = 0;
    }
    if (level === 1) {
        handStates[1].x = handStates[1].y = 0;
        galleryRotation = 0;
    }
    if (threeScene) {
        // Сцена должна работать и на 2, и на 3 уровне, а также если AR активен
        threeScene.visible = (level === 3 || level === 2 || isArModeActive);
        
        if (level === 3 && demoModels.length) {
            demoModels.forEach((m, i) => { m.visible = (i === currentModelIndex); });
            if (arMaskModel) arMaskModel.visible = false;
        } else if (level === 2) {
            demoModels.forEach(m => { m.visible = false; });
            // Видимость arMaskModel переключается локально внутри processLevel2
        } else {
            demoModels.forEach(m => { m.visible = false; });
            if (arMaskModel) arMaskModel.visible = false;
        }
    }

    const btn = document.getElementById('levelSwitcherBtn');
    if (btn) {
        const labels = ['','🎨 Уровень 1: Рисование','🖼️ Уровень 2: Галерея','🧊 Уровень 3: Голограмма'];
        const colors = ['','#ef4444','#a855f7','#00ffcc'];
        btn.textContent = labels[level];
        btn.style.backgroundColor = colors[level];
        btn.style.color = level === 3 ? '#000' : '#fff';
    }
    updateUploadButtons();
    
    const btnOpen3DLibrary = document.getElementById('btnOpen3DLibrary');
    if (btnOpen3DLibrary) {
        btnOpen3DLibrary.style.display = level === 3 ? 'block' : 'none';
    }
    
    const colorBar = document.getElementById('colorBar');
    if (colorBar) {
        colorBar.style.display = level === 1 ? 'flex' : 'none';
    }
    
    if (level === 3) {
        // notification removed
    }
    
    GestureEngine.reset();
}


// ══════════════════════════════════════════════════════════════
//  КНОПКИ UI
// ══════════════════════════════════════════════════════════════
function createLevelSwitcher() {
    if (document.getElementById('levelSwitcherBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'levelSwitcherBtn';
    Object.assign(btn.style, {
        position: 'fixed', top: '20px', right: '20px',
        zIndex: '10000', padding: '12px 20px', borderRadius: '8px',
        border: 'none', backgroundColor: '#ef4444', color: '#fff',
        fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'all 0.3s ease',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    });
    btn.textContent = '🎨 Уровень 1: Рисование';
    btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', () => {
        const next = currentLevel === 1 ? 2 : currentLevel === 2 ? 3 : 1;
        switchAirCanvasLevel(next);
    });
    document.body.appendChild(btn);
}

function createUploadButtons() {
    if (!document.getElementById('uploadPhotoBtn')) {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '*/*'; inp.multiple = true;
        inp.style.display = 'none'; inp.id = 'uploadPhotoInput';
        inp.addEventListener('change', (e) => {
            for (const f of e.target.files) {
                const img = new Image();
                img.src = URL.createObjectURL(f);
                img.onload = () => uploadedAssets.push(img);
            }
            inp.value = '';
        });
        document.body.appendChild(inp);
        const btn = document.createElement('button');
        btn.id = 'uploadPhotoBtn'; btn.className = 'air-upload-btn';
        btn.textContent = '📁 Загрузить Фото';
        btn.addEventListener('click', () => inp.click());
        document.body.appendChild(btn);
    }
}

function updateUploadButtons() {
    const p = document.getElementById('uploadPhotoBtn');
    if (p) p.style.display = currentLevel === 2 ? 'block' : 'none';
}

function updatePaletteUIColor(col) {
    currentColor = col;
    updatePaletteUI(col);
}

function createModelLibraryPanel() {
    if (document.getElementById('modelLibraryContainer')) return;
    
    const container = document.createElement('div');
    container.id = 'modelLibraryContainer';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggleLibraryBtn';
    toggleBtn.textContent = '▼ Скрыть библиотеку';
    toggleBtn.onclick = () => {
        container.classList.toggle('hidden');
        toggleBtn.textContent = container.classList.contains('hidden') ? '▲ Показать библиотеку' : '▼ Скрыть библиотеку';
    };
    
    const panel = document.createElement('div');
    panel.id = 'modelLibraryPanel';
    
    const models = [
        { icon: '🍩', title: 'Тор' },
        { icon: '🧊', title: 'Куб' },
        { icon: '🌍', title: 'Сфера' },
        { icon: '💎', title: 'Икосаэдр' }
    ];
    
    models.forEach((m, idx) => {
        const btn = document.createElement('button');
        btn.className = 'model-btn' + (idx === 0 ? ' active' : '');
        btn.title = m.title;
        btn.innerHTML = m.icon;
        btn.onclick = () => switchDemoModel(idx);
        panel.appendChild(btn);
    });
    
    container.appendChild(toggleBtn);
    container.appendChild(panel);
    document.body.appendChild(container);
}


// ══════════════════════════════════════════════════════════════
//  ИНИЦИАЛИЗАЦИЯ
// ══════════════════════════════════════════════════════════════
function initAirCanvasElite() {
    if (!videoElement || !uiCanvas || !drawCanvas) return;
    function resize() {
        const container = document.querySelector('.tablet-screen') || document.body;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        uiCanvas.width   = w;
        uiCanvas.height  = h;
        drawCanvas.width = w;
        drawCanvas.height= h;
        if (threeRenderer) {
            threeRenderer.setSize(w, h);
            threeCamera.aspect = w / h;
            threeCamera.updateProjectionMatrix();
        }
    }
    window.addEventListener('resize', resize);
    resize();

    hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    hands.onResults(onResultsElite);

    // ── Авто-загрузка FaceMesh, если ещё не загружен ──────
    if (typeof FaceMesh === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            // После загрузки библиотеки инициализируем FaceMesh
            if (typeof FaceMesh !== 'undefined' && !faceMesh) {
                faceMesh = new FaceMesh({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
                faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
                faceMesh.onResults((results) => {
                    currentFaceLandmarks = results.multiFaceLandmarks;
                });
            }
        };
        document.head.appendChild(script);
    } else {
        // FaceMesh уже доступен — инициализируем сразу
        faceMesh = new FaceMesh({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
        faceMesh.onResults((results) => {
            currentFaceLandmarks = results.multiFaceLandmarks;
        });
    }

    updatePaletteUI(handStates[0].color);

    camera = new Camera(videoElement, {
        onFrame: async () => { 
            if (isRunning) {
                const promises = [hands.send({ image: videoElement })];
                if (faceMesh) promises.push(faceMesh.send({ image: videoElement }));
                await Promise.all(promises);
            }
        },
        width: 1280, height: 720
    });

    createLevelSwitcher();
    createUploadButtons();
    initThreeJS();
    createModelLibraryPanel();
}



// ══════════════════════════════════════════════════════════════
//  ██████  LEVEL 1: РИСОВАНИЕ  ██████
// ══════════════════════════════════════════════════════════════
function processLevel1(events, codes, state, lms0, w, h) {

    let code = GestureEngine.canonize(codes[0]);
    if (GestureEngine.detectOKSign(lms0)) code = 'OK_SIGN';
    else if (GestureEngine.detectCrossedFingers(lms0)) code = 'CROSS_FIN';

    state.isLoupeActive = (code === 'OK_SIGN');

    if (code !== 'CROSS_FIN') {
        fillHoldTimer = 0;
        isFilling = false;
    }

    // Жесты рисования
    const DRAWING_CODES = new Set(['INDEX','PINKY','ROCK','THREE','GUN','PEACE']);

    if (DRAWING_CODES.has(code)) {
        if (code === 'GUN') {
            // Лазерная указка
            drawLaserPointer(state.x, state.y);
            state.isDrawing = false;
        } else {
            executeDrawingLogic(state, code);
        }
        state.px = state.x; state.py = state.y;

    } else if (code === 'OPEN') {
        // 🖐 Открытая ладонь > 1.5 сек → очистка
        if (cooldown('clearCanvas', 1500)) {
            if (drawCtx) { drawCtx.clearRect(0, 0, w, h); canvasHistory = []; redoStack = []; }
            showSystemNotification('🗑️  Холст очищен');
        }
        state.isDrawing = false; state.px = 0; state.py = 0;

    } else if (code === 'SHAKA') {
        // 🤙 Смена цвета палитры
        if (cooldown('colorSwitch', 600)) {
            colorIndex[0] = (colorIndex[0] + 1) % PREMIUM_COLORS.length;
            state.color = PREMIUM_COLORS[colorIndex[0]];
            updatePaletteUIColor(state.color);
            showSystemNotification('🎨  ' + state.color);
        }
        state.isDrawing = false; state.px = 0; state.py = 0;

    } else if (code === 'CROSS_FIN') {
        if (fillHoldTimer === 0) {
            fillHoldTimer = Date.now();
            isFilling = false;
        } else if (Date.now() - fillHoldTimer > 600 && !isFilling) {
            floodFill(drawCtx, Math.floor(state.x), Math.floor(state.y), state.color);
            saveHistory();
            showSystemNotification('🪣 Заливка применена');
            isFilling = true;
        }
        state.isDrawing = false; state.px = 0; state.py = 0;

    } else if (code === 'OK_SIGN') {
        if (cooldown('smartFocus', 2000)) showSystemNotification('🔍 Умное выделение (Фокус)');
        state.isDrawing = false; state.px = 0; state.py = 0;

    } else if (code === 'FOUR') {
        if (cooldown('gridToggle', 1500)) isGridVisible = !isGridVisible;
        state.isDrawing = false; state.px = 0; state.py = 0;

    } else {
        state.isDrawing = false; state.px = 0; state.py = 0;
    }

    // ── Свайп Peace ВЛЕВО → Undo ──────────────────────────────
    if (code === 'PEACE' && events.some(e => e.startsWith('SWIPE_LEFT'))) {
        if (cooldown('undo', 900)) undo();
    }
    // ── Свайп Peace ВПРАВО → Redo ─────────────────────────────
    if (code === 'PEACE' && events.some(e => e.startsWith('SWIPE_RIGHT'))) {
        if (cooldown('redo', 900)) redo();
    }
}


// ══════════════════════════════════════════════════════════════
//  ██████  LEVEL 2: ГАЛЕРЕЯ / 3D-ЛЕНТА  ██████
// ══════════════════════════════════════════════════════════════
function processLevel2(events, codes, lms, w, h) {
    const s0 = handStates[0];
    const s1 = handStates[1];
    const n = lms.length;

    // ── Включаем AR-маску ЛЮБОЙ одной рукой (жест РОК 🤘) ──
    if ((events.includes('CODE0:ROCK') || events.includes('CODE1:ROCK')) && cooldown('arToggle', 1500)) {
        isArModeActive = !isArModeActive;
        flashSnapshot(); // Вспышка при переключении режима
        
        if (!isArModeActive && arMaskModel) arMaskModel.visible = false;
        if (threeScene) threeScene.visible = (currentLevel === 3 || isArModeActive);
    }

    // ── ИЗОЛИРОВАННЫЙ AR РЕЖИМ (ФИЛЬТРЫ ЛИЦА) ──
    if (isArModeActive) {
        if (currentFaceLandmarks && currentFaceLandmarks.length > 0) {
            window.lastFaceTime = Date.now();
            window.lastFaceData = currentFaceLandmarks[0];
        }

        const recentlyHadFace = (Date.now() - (window.lastFaceTime || 0)) < 600;

        if (arMaskModel && recentlyHadFace && window.lastFaceData) {
            const face = window.lastFaceData;
            const nose = face[1];
            const leftEye = face[33];
            const rightEye = face[263];
            
            const targetX = (1 - nose.x) * 2 - 1;
            const targetY = -(nose.y) * 2 + 1;
            const vec = new THREE.Vector3(targetX, targetY, 0.5);
            vec.unproject(threeCamera);
            const dir = vec.sub(threeCamera.position).normalize();
            const dist = -threeCamera.position.z / dir.z;
            const pos = threeCamera.position.clone().add(dir.multiplyScalar(dist));
            
            arMaskModel.position.copy(pos);
            arMaskModel.position.z += 0.5; // Смещение к камере
            
            const screenDx = (1 - rightEye.x) - (1 - leftEye.x);
            const screenDy = rightEye.y - leftEye.y;
            const angleZ = Math.atan2(screenDy, screenDx);
            arMaskModel.rotation.z = -angleZ;
            
            const yaw = (nose.x - 0.5) * -Math.PI / 4; 
            const pitch = (nose.y - 0.5) * -Math.PI / 4;
            arMaskModel.rotation.y = yaw;
            arMaskModel.rotation.x = pitch;

            arMaskModel.visible = true;
        } else if (arMaskModel) {
            arMaskModel.visible = false;
        }

        // ── AR СЕЛФИ ПО ЖЕСТУ PEACE ✌️ ИЛИ ДВУМ КУЛАКАМ ──
        if ((events.includes('CODE0:PEACE') || events.includes('CODE1:PEACE') || events.includes('DUAL_FIST')) && cooldown('arSelfie', 1500)) {
            takeARSnapshot();
        }
        
        return; // Блокируем обычную фото-ленту, пока включен AR
    }

    // ── ОБЫЧНАЯ ФОТО-ЛЕНТА ──
    if (n === 2) {
        const a0 = s0.action;
        const a1 = s1.action;
        if (a0 === '01100' && a1 === '01100') {
            isFramingPhoto = true;
        } else if (isFramingPhoto && a0 === '00000' && a1 === '00000') {
            if (cooldown('snapshotDirector', 2000)) takeSnapshot();
            isFramingPhoto = false;
        } else if ((a0 !== '01100' && a0 !== '00000') || (a1 !== '01100' && a1 !== '00000')) {
            isFramingPhoto = false;
        }
    } else {
        isFramingPhoto = false;
    }

    if (isFramingPhoto) drawFramingOverlay(uiCtx, w, h);

    if (events.includes('CODE0:INDEX') && s0.lastX !== 0) {
        galleryRotation += (s0.x - s0.lastX) * 0.004;
    }

    if (events.includes('CODE0:OPEN') && cooldown('clearGallery', 1500)) {
        uploadedAssets = []; galleryRotation = 0; galleryZoom = 1.0;
    }

    if (events.includes('DUAL_FIST') && s0.x !== 0 && s1.x !== 0) {
        const d = dist2D(s0.x, s0.y, s1.x, s1.y);
        if (zoomBaseDist === null) zoomBaseDist = d;
        galleryZoom = Math.max(0.4, Math.min(2.5, (d / Math.max(zoomBaseDist, 1))));
    } else {
        zoomBaseDist = null;
    }

    const isRibbonDetected = (events.includes('CODE0:FIST') && events.includes('CODE1:PEACE')) ||
                             (events.includes('CODE0:PEACE') && events.includes('CODE1:FIST'));
                             
    if (isRibbonDetected) window.lastRibbonTime = Date.now();
    const isRibbonActive = (Date.now() - (window.lastRibbonTime || 0)) < 600;

    if (isRibbonActive && s0.x !== 0 && s1.x !== 0) {
        renderGalleryRibbon(s0, s1, w, h);
    }
}

function renderGalleryRibbon(s0, s1, w, h) {
    const pL = s0.x < s1.x ? s0 : s1;
    const pR = s0.x < s1.x ? s1 : s0;
    const dx  = pR.x - pL.x, dy = pR.y - pL.y;
    const distance = Math.hypot(dx, dy);
    const angle    = Math.atan2(dy, dx);

    let scale = (distance / 400) * galleryZoom;
    scale = Math.max(0.3, Math.min(2.5, scale));

    const items = uploadedAssets.length > 0
        ? uploadedAssets
        : [null, null, null, null];
    const maxDisplay = Math.min(items.length, 8);

    uiCtx.save();
    for (let i = 0; i < maxDisplay; i++) {
        const amt = (i + 1) / (maxDisplay + 1);
        const lx  = lerp(pL.x, pR.x, amt);
        const ly  = lerp(pL.y, pR.y, amt);
        uiCtx.save();
        uiCtx.translate(lx, ly);
        uiCtx.rotate(angle + galleryRotation);
        uiCtx.scale(scale, scale);
        const sX = 80, sY = 80;
        if (items[i]) {
            uiCtx.drawImage(items[i], -sX/2, -sY/2, sX, sY);
            uiCtx.strokeStyle = '#00ffcc'; uiCtx.lineWidth = 2;
            uiCtx.strokeRect(-sX/2, -sY/2, sX, sY);
        } else {
            uiCtx.strokeStyle = '#a855f7'; uiCtx.lineWidth = 2;
            uiCtx.strokeRect(-sX/2, -sY/2, sX, sY);
        }
        uiCtx.restore();
    }
    uiCtx.restore();
}


// ══════════════════════════════════════════════════════════════
//  ██████  LEVEL 3: 3D-ГОЛОГРАММА  ██████
// ══════════════════════════════════════════════════════════════
function processLevel3(events, codes, w, h) {
    if (!demoModels.length || !threeCamera || !modelSelected) return;
    const model = demoModels[currentModelIndex];
    
    // Всегда показываем выбранную модель на 3 уровне
    model.visible = true;

    // ── Жест PEACE (✌️) переключает закрепление модели ──
    if (events.some(e => e === 'CODE0:PEACE' || e === 'CODE1:PEACE')) {
        if (cooldown('togglePin', 800)) {
            model.userData.isPinned = !model.userData.isPinned;
            showSystemNotification(model.userData.isPinned ? '📌 Модель закреплена' : '🔄 Модель свободна');
        }
    }

    // ── Следование за первой рукой (если не закреплена) ──
    const hand = handStates[0];
    if (hand && hand.x !== 0 && hand.y !== 0) {
        // Преобразуем координаты экрана в 3D
        const ndcX = (hand.x / w) * 2 - 1;
        const ndcY = -(hand.y / h) * 2 + 1;
        const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
        vec.unproject(threeCamera);
        const dir = vec.sub(threeCamera.position).normalize();
        const dist = -threeCamera.position.z / dir.z;
        const pos = threeCamera.position.clone().add(dir.multiplyScalar(dist));

        if (!model.userData.isPinned) {
            // Плавное следование
            model.position.x = lerp(model.position.x, pos.x, 0.2);
            model.position.y = lerp(model.position.y, pos.y + 0.5, 0.2); // смещение вверх
            model.position.z = lerp(model.position.z, pos.z, 0.2);
        }
        // Если закреплено, позиция не меняется
    }

    // ── Вращение указательным пальцем (с инерцией) ──
    let indexHand = null;
    if (codes[0] === 'INDEX') indexHand = handStates[0];
    else if (codes[1] === 'INDEX') indexHand = handStates[1];

    if (indexHand && indexHand.lastX !== 0 && indexHand.x !== 0) {
        const dx = indexHand.x - indexHand.lastX;
        const dy = indexHand.y - indexHand.lastY;
        model.userData.vx = dx * 0.01;
        model.userData.vy = dy * 0.01;
    }
    
    // Применяем инерцию
    if (model.userData.vx || model.userData.vy) {
        model.rotation.y += model.userData.vx;
        model.rotation.x += model.userData.vy;
        model.userData.vx *= 0.92;
        model.userData.vy *= 0.92;
    }
}


// ══════════════════════════════════════════════════════════════
//  КУРСОР (LERP + отрисовка)
// ══════════════════════════════════════════════════════════════
function updateCursor(state, landmarks, w, h) {
    const targetX = w - landmarks[8].x * w;
    const targetY = landmarks[8].y * h;
    if (state.x === 0 && state.y === 0) {
        state.x = targetX; state.y = targetY;
    } else {
        state.x = lerp(state.x, targetX, LERP_FACTOR);
        state.y = lerp(state.y, targetY, LERP_FACTOR);
    }
}

function drawCursor(state, code) {
    if (!uiCtx) return;
    const isEraser = code === 'PEACE';
    const isLaser  = code === 'GUN';

    if (state.isLoupeActive) {
        const size = 100;
        const scale = 2;
        uiCtx.save();
        uiCtx.beginPath();
        uiCtx.arc(state.x, state.y, size / 2, 0, Math.PI * 2);
        uiCtx.clip();

        if (drawCanvas) {
            uiCtx.drawImage(
                drawCanvas,
                state.x - size / (2 * scale), state.y - size / (2 * scale),
                size / scale, size / scale,
                state.x - size / 2, state.y - size / 2,
                size, size
            );
        }

        uiCtx.lineWidth = 4;
        uiCtx.strokeStyle = state.color;
        uiCtx.shadowBlur = 15;
        uiCtx.shadowColor = state.color;
        uiCtx.stroke();
        uiCtx.restore();
        return;
    }

    if (isLaser) {
        drawLaserPointer(state.x, state.y);
        return;
    }

    uiCtx.save();
    uiCtx.beginPath();
    uiCtx.arc(state.x, state.y, isEraser ? 20 : 10, 0, Math.PI * 2);
    uiCtx.fillStyle   = isEraser ? 'rgba(255,255,255,0.3)' : state.color;
    uiCtx.globalAlpha = 0.85;
    uiCtx.fill();
    if (isEraser) {
        uiCtx.strokeStyle = 'rgba(255,255,255,0.8)';
        uiCtx.lineWidth   = 2;
        uiCtx.stroke();
    }
    uiCtx.globalAlpha = 1;
    uiCtx.restore();
}


// ══════════════════════════════════════════════════════════════
//  ГЛАВНЫЙ ОБРАБОТЧИК MEDIAPIPE
// ══════════════════════════════════════════════════════════════
function onResultsElite(results) {
    if (!uiCtx) return;
    const w = uiCanvas.width;
    const h = uiCanvas.height;

    uiCtx.clearRect(0, 0, w, h);

    if (Date.now() < arFlashEndTime) {
        const alpha = (arFlashEndTime - Date.now()) / 150;
        uiCtx.save();
        uiCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        uiCtx.fillRect(0, 0, w, h);
        uiCtx.restore();
    }

    if (currentLevel === 1 && isGridVisible === true) {
        uiCtx.save();
        uiCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        uiCtx.lineWidth = 1;
        uiCtx.beginPath();
        for (let x = 0; x < w; x += 50) { uiCtx.moveTo(x, 0); uiCtx.lineTo(x, h); }
        for (let y = 0; y < h; y += 50) { uiCtx.moveTo(0, y); uiCtx.lineTo(w, y); }
        uiCtx.stroke();
        uiCtx.restore();
    }

    const camEl = document.getElementById('camVideo');
    if (camEl) camEl.style.opacity = isPresentationMode ? '0' : '1';

    const lms = results.multiHandLandmarks || [];
    const n   = lms.length;

    if (n === 0) {
        // Нет рук
        GestureEngine.reset();
        zoomBaseDist = null;
        for (let i = 0; i < 2; i++) {
            handStates[i].x = handStates[i].y = 0;
            handStates[i].px = handStates[i].py = 0;
            handStates[i].isDrawing = false;
        }
        // Сбрасываем zoom холста
        if (drawCanvas) drawCanvas.style.transform = '';
        return;
    }

    // ── Обновляем LERP позиции курсоров ──────────────────────
    updateCursor(handStates[0], lms[0], w, h);
    if (n >= 2) updateCursor(handStates[1], lms[1], w, h);
    else {
        handStates[1].x = handStates[1].y = 0;
        handStates[1].px = handStates[1].py = 0;
    }

    // ── Получаем коды жестов ──────────────────────────────────
    const codes = lms.map(lm => gestureCode(lm));
    const cans  = codes.map(c => GestureEngine.canonize(c));

    // Синхронизируем action для совместимости
    handStates[0].action = codes[0];
    if (n >= 2) handStates[1].action = codes[1];

    // ── GestureEngine: получаем массив событий ────────────────
    const events = GestureEngine.analyze(lms, handStates);

    // ── Логика по уровням ─────────────────────────────────────
    if (currentLevel === 1) {
        // На Level 1 — активная одна рука (умный выбор)
        const ACTIVE = new Set(['INDEX','PINKY','ROCK','THREE','GUN','PEACE','OPEN','SHAKA','FIST', 'OK_SIGN', 'CROSS_FIN', 'FOUR']);
        let activeLm = lms[0];
        for (let i = 0; i < n; i++) {
            if (ACTIVE.has(GestureEngine.canonize(gestureCode(lms[i])))) { activeLm = lms[i]; break; }
        }
        updateCursor(handStates[0], activeLm, w, h);
        codes[0] = gestureCode(activeLm);
        cans[0]  = GestureEngine.canonize(codes[0]);
        handStates[0].action = codes[0];

        processLevel1(events, codes, handStates[0], activeLm, w, h);
        drawCursor(handStates[0], cans[0]);

    } else if (currentLevel === 2) {
        processLevel2(events, cans, lms, w, h);
        drawCursor(handStates[0], cans[0]);
        if (n >= 2) drawCursor(handStates[1], cans[1]);

    } else if (currentLevel === 3) {
        processLevel3(events, cans, w, h);
        drawCursor(handStates[0], cans[0]);
        if (n >= 2) drawCursor(handStates[1], cans[1]);
    }

    // ── Сохраняем lastX/Y ─────────────────────────────────────
    for (let i = 0; i < 2; i++) {
        handStates[i].lastX = handStates[i].x;
        handStates[i].lastY = handStates[i].y;
        if (!handStates[i].isDrawing) {
            handStates[i].px = 0;
            handStates[i].py = 0;
        } else {
            handStates[i].px = handStates[i].x;
            handStates[i].py = handStates[i].y;
        }
    }
}


// ══════════════════════════════════════════════════════════════
//  ПУБЛИЧНЫЕ API
// ══════════════════════════════════════════════════════════════
window.startAirCanvasElite = function () {
    if (!camera) initAirCanvasElite();
    if (!isRunning && camera) {
        camera.start();
        isRunning = true;
        const authBtn = document.getElementById('authBtn');
        const stopBtn = document.getElementById('stopCamBtn');
        const lock = document.getElementById('premiumLock');
        if (authBtn) authBtn.style.display = 'none';
        if (stopBtn) { stopBtn.style.display = 'block'; stopBtn.style.pointerEvents = 'auto'; }
        if (lock) {
            lock.style.background = 'transparent';
            lock.style.backdropFilter = 'none';
            lock.style.pointerEvents = 'none';
            ['h3', 'p', '.lock-icon'].forEach(sel => {
                const el = lock.querySelector(sel);
                if (el) el.style.display = 'none';
            });
        }
    }
};

window.stopAirCanvasElite = function () {
    if (isRunning && camera) {
        camera.stop();
        videoElement.srcObject = null;
        isRunning = false;
        if (uiCtx)   uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
        if (drawCtx) drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        if (drawCanvas) drawCanvas.style.transform = '';
        const authBtn = document.getElementById('authBtn');
        const stopBtn = document.getElementById('stopCamBtn');
        const lock = document.getElementById('premiumLock');
        if (authBtn) authBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
        if (lock) {
            lock.style.background = 'rgba(0,0,0,.85)';
            lock.style.backdropFilter = 'blur(8px)';
            lock.style.pointerEvents = 'auto';
            ['h3', 'p', '.lock-icon'].forEach(sel => {
                const el = lock.querySelector(sel);
                if (el) el.style.display = 'block';
            });
        }
    }
};

window.addEventListener('message', (e) => {
    if (e.data === 'startCamera') window.startAirCanvasElite();
    else if (e.data === 'stopCamera') window.stopAirCanvasElite();
});

// ── Обратная совместимость: fileInput ────────────────────────
const _fi = document.getElementById('fileInput');
if (_fi) {
    _fi.addEventListener('change', (e) => {
        for (const f of e.target.files) {
            const img = new Image();
            img.src = URL.createObjectURL(f);
            img.onload = () => uploadedAssets.push(img);
        }
    });
}

// ── Логика UI для модалки 3D и кнопок запуска ──────────────
document.addEventListener("DOMContentLoaded", () => {
    // Модалка 3D библиотеки
    const btnOpen = document.getElementById('btnOpen3DLibrary');
    const btnClose = document.getElementById('btnClose3DLibrary');
    const modal = document.getElementById('modal3DLibrary');

    if (btnOpen && modal) {
        btnOpen.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
    }

    if (btnClose && modal) {
        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (modal) {
        // Закрытие при клике на прозрачный фон
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'modal3DLibrary') {
                e.target.classList.add('hidden');
            }
        });
    }

    // ── Прямое управление кнопками камеры ──────────────────
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        // Убираем старые слушатели и вешаем прямой запуск
        authBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof window.startAirCanvasElite === 'function') {
                window.startAirCanvasElite();
            }
        };
    }
    const stopBtn = document.getElementById('stopCamBtn');
    if (stopBtn) {
        stopBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof window.stopAirCanvasElite === 'function') {
                window.stopAirCanvasElite();
            }
        };
    }
});

// Глобальная функция для сетки. Она вызывает существующую switchDemoModel
window.selectHoloModel = function(index) {
    if (typeof switchDemoModel === 'function') {
        switchDemoModel(index);
    } else {
        console.warn('Функция switchDemoModel не найдена!');
    }
    const modal = document.getElementById('modal3DLibrary');
    if (modal) {
        modal.classList.add('hidden');
    }
};
