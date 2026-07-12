// ============================================================
//  AIR CANVAS ELITE  –  v3.0  (Level 1 + Level 2 + Level 3)
// ============================================================

const videoElement = document.getElementById('camVideo');
const uiCanvas    = document.getElementById('uiCanvas');
const drawCanvas  = document.getElementById('drawCanvas');
const uiCtx       = uiCanvas   ? uiCanvas.getContext('2d', { willReadFrequently: true }) : null;
const drawCtx     = drawCanvas ? drawCanvas.getContext('2d', { willReadFrequently: true }) : null;

// ─── плавность курсора ───────────────────────────────────────
const LERP_FACTOR = 0.2;

// ─── системные флаги ─────────────────────────────────────────
let isRunning          = false;
let camera             = null;
let hands              = null;
let isLocked           = false;
let isPresentationMode = false;
let isDarkMode         = true;

// ─── состояния рук ───────────────────────────────────────────
const handStates = [
    { x: 0, y: 0, px: 0, py: 0, lastX: 0, lastY: 0, isDrawing: false, color: '#ef4444', action: '00000', brush: 'Premium Pen', width: 5, shadow: 0 },
    { x: 0, y: 0, px: 0, py: 0, lastX: 0, lastY: 0, isDrawing: false, color: '#3b82f6', action: '00000', brush: 'Premium Pen', width: 5, shadow: 0 }
];

// ─── данные галереи ───────────────────────────────────────────
let uploadedAssets  = [];
let galleryRotation = 0;

// ─── история Undo ─────────────────────────────────────────────
let canvasHistory    = [];
const MAX_HISTORY    = 10;
let lastSaveTime     = 0;

// ─── кулдауны ─────────────────────────────────────────────────
let lastClearTime       = 0;
let lastPaletteTime     = [0, 0];
let lastSnapshotTime    = 0;
let lastUndoTime        = 0;         // кулдаун жеста Undo  (Level 1)
let lastSnapGestureTime = 0;         // кулдаун жеста Snap  (Level 1)
let lastOpenPalmTime    = [0, 0];

// ─── система уровней ──────────────────────────────────────────
let currentLevel = 1;   // 1 | 2 | 3
let currentColor = '#ef4444';

const PREMIUM_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff', '#a855f7', '#ec4899'];
let colorIndex = [0, 0];

// ─── Three.js объекты ─────────────────────────────────────────
let threeScene    = null;
let threeCamera   = null;
let threeRenderer = null;
let torusKnot     = null;
let threeAnimId   = null;


// ══════════════════════════════════════════════════════════════
//  CSS-инъекция (флэш + кнопки)
// ══════════════════════════════════════════════════════════════
(function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #snapshotFlashOverlay {
            position: fixed; top: 0; left: 0;
            width: 100%; height: 100%;
            background-color: #ffffff;
            opacity: 0; pointer-events: none; z-index: 9999;
        }
        .cb-swatch, .color-btn { transition: all 0.2s ease; }
        .cb-swatch.active, .color-btn.active { transform: scale(1.2); box-shadow: 0 0 12px currentColor; }
        #levelSwitcherBtn { transition: all 0.3s ease; }
        #levelSwitcherBtn:hover { transition: all 0.3s ease; }

        /* Кнопки загрузки контента */
        .air-upload-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10000;
            padding: 12px 20px;
            border-radius: 10px;
            border: none;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.35);
            transition: all 0.25s ease;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            display: none;
        }
        .air-upload-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.45); }
        #uploadPhotoBtn  { background: #a855f7; color: #fff; }
        #uploadModelBtn  { background: #00ffcc; color: #000; }
    `;
    document.head.appendChild(style);
})();


// ══════════════════════════════════════════════════════════════
//  ИНИЦИАЛИЗАЦИЯ
// ══════════════════════════════════════════════════════════════
function initAirCanvasElite() {
    if (!videoElement || !uiCanvas || !drawCanvas) return;

    function resize() {
        uiCanvas.width   = window.innerWidth;
        uiCanvas.height  = window.innerHeight;
        drawCanvas.width = window.innerWidth;
        drawCanvas.height= window.innerHeight;
        if (threeRenderer) {
            threeRenderer.setSize(window.innerWidth, window.innerHeight);
            threeCamera.aspect = window.innerWidth / window.innerHeight;
            threeCamera.updateProjectionMatrix();
        }
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

    createLevelSwitcher();
    createUploadButtons();
    initThreeJS();
}


// ══════════════════════════════════════════════════════════════
//  THREE.JS — ИНИЦИАЛИЗАЦИЯ
// ══════════════════════════════════════════════════════════════
function initThreeJS() {
    // Получаем или создаём canvas
    let threeCanvas = document.getElementById('threeCanvas');
    if (!threeCanvas) {
        threeCanvas = document.createElement('canvas');
        threeCanvas.id = 'threeCanvas';
        threeCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100vw;height:100vh;z-index:7;pointer-events:none;';
        document.body.appendChild(threeCanvas);
    }

    threeScene  = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    threeCamera.position.z = 5;

    threeRenderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true, antialias: true });
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
    threeRenderer.setPixelRatio(window.devicePixelRatio);
    threeRenderer.setClearColor(0x000000, 0);

    // TorusKnot — главный 3D-объект
    const geometry = new THREE.TorusKnotGeometry(0.7, 0.25, 128, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
    torusKnot = new THREE.Mesh(geometry, material);
    threeScene.add(torusKnot);

    // По умолчанию сцена скрыта
    threeScene.visible = false;

    // Запускаем цикл рендера
    animateThree();
}

function animateThree() {
    threeAnimId = requestAnimationFrame(animateThree);
    if (threeRenderer && threeScene && threeCamera) {
        threeRenderer.render(threeScene, threeCamera);
    }
}


// ══════════════════════════════════════════════════════════════
//  КНОПКА ПЕРЕКЛЮЧЕНИЯ УРОВНЕЙ (1 → 2 → 3 → 1)
// ══════════════════════════════════════════════════════════════
function createLevelSwitcher() {
    if (document.getElementById('levelSwitcherBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'levelSwitcherBtn';
    Object.assign(btn.style, {
        position: 'fixed', top: '20px', right: '20px',
        zIndex: '10000', padding: '12px 20px', borderRadius: '8px',
        border: 'none', backgroundColor: '#ef4444', color: '#ffffff',
        fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'all 0.3s ease',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    });
    btn.textContent = '🎨 Уровень 1: Рисование';

    btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)';    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; });

    btn.addEventListener('click', () => {
        const next = currentLevel === 1 ? 2 : currentLevel === 2 ? 3 : 1;
        switchAirCanvasLevel(next);
    });

    document.body.appendChild(btn);
}


// ══════════════════════════════════════════════════════════════
//  КНОПКИ ЗАГРУЗКИ КОНТЕНТА
// ══════════════════════════════════════════════════════════════
function createUploadButtons() {
    // Фото (Level 2)
    if (!document.getElementById('uploadPhotoBtn')) {
        const photoInput = document.createElement('input');
        photoInput.type = 'file'; photoInput.accept = 'image/*'; photoInput.multiple = true;
        photoInput.style.display = 'none';
        photoInput.id = 'uploadPhotoInput';
        document.body.appendChild(photoInput);

        photoInput.addEventListener('change', (e) => {
            for (const file of e.target.files) {
                const img = new Image();
                img.src = URL.createObjectURL(file);
                img.onload = () => uploadedAssets.push(img);
            }
            photoInput.value = '';
        });

        const photoBtn = document.createElement('button');
        photoBtn.id = 'uploadPhotoBtn';
        photoBtn.className = 'air-upload-btn';
        photoBtn.textContent = '📁 Загрузить Фото';
        photoBtn.addEventListener('click', () => photoInput.click());
        document.body.appendChild(photoBtn);
    }

    // 3D-модель (Level 3) — пока только выбор файла
    if (!document.getElementById('uploadModelBtn')) {
        const modelInput = document.createElement('input');
        modelInput.type = 'file'; modelInput.accept = '.glb,.gltf,.obj,.fbx';
        modelInput.style.display = 'none';
        modelInput.id = 'uploadModelInput';
        document.body.appendChild(modelInput);

        modelInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                console.log('3D Model selected:', e.target.files[0].name);
                // TODO: добавить парсинг 3D-файла в следующей итерации
            }
            modelInput.value = '';
        });

        const modelBtn = document.createElement('button');
        modelBtn.id = 'uploadModelBtn';
        modelBtn.className = 'air-upload-btn';
        modelBtn.textContent = '🧊 Загрузить 3D Модель';
        modelBtn.addEventListener('click', () => modelInput.click());
        document.body.appendChild(modelBtn);
    }
}

function updateUploadButtons() {
    const photoBtn = document.getElementById('uploadPhotoBtn');
    const modelBtn = document.getElementById('uploadModelBtn');
    if (photoBtn) photoBtn.style.display = currentLevel === 2 ? 'block' : 'none';
    if (modelBtn) modelBtn.style.display = currentLevel === 3 ? 'block' : 'none';
}


// ══════════════════════════════════════════════════════════════
//  ИСТОРИЯ UNDO
// ══════════════════════════════════════════════════════════════
function saveHistory() {
    if (!drawCtx || !drawCanvas) return;
    if (Date.now() - lastSaveTime < 200) return;
    const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    canvasHistory.push(imageData);
    if (canvasHistory.length > MAX_HISTORY) canvasHistory.shift();
    lastSaveTime = Date.now();
}

function undo() {
    if (!drawCtx || !drawCanvas) return;
    if (canvasHistory.length > 0) {
        drawCtx.putImageData(canvasHistory.pop(), 0, 0);
    } else {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }
}


// ══════════════════════════════════════════════════════════════
//  УТИЛИТЫ
// ══════════════════════════════════════════════════════════════
function lerp(start, end, amt) { return (1 - amt) * start + amt * end; }

function getDistance(p1, p2, width, height) {
    const dx = (p1.x - p2.x) * width;
    const dy = (p1.y - p2.y) * height;
    return Math.sqrt(dx * dx + dy * dy);
}

function getFingerStates(landmarks) {
    const states = [0, 0, 0, 0, 0];
    const wrist  = landmarks[0];
    states[0] = getDistance(landmarks[4], landmarks[17], 1, 1) > getDistance(landmarks[3], landmarks[17], 1, 1) ? 1 : 0;
    states[1] = getDistance(landmarks[8],  wrist, 1, 1) > getDistance(landmarks[6],  wrist, 1, 1) ? 1 : 0;
    states[2] = getDistance(landmarks[12], wrist, 1, 1) > getDistance(landmarks[10], wrist, 1, 1) ? 1 : 0;
    states[3] = getDistance(landmarks[16], wrist, 1, 1) > getDistance(landmarks[14], wrist, 1, 1) ? 1 : 0;
    states[4] = getDistance(landmarks[20], wrist, 1, 1) > getDistance(landmarks[18], wrist, 1, 1) ? 1 : 0;
    return states;
}

function updatePaletteUI(selectedColor) {
    const norm = selectedColor.toLowerCase();
    document.querySelectorAll('.cb-swatch, .color-btn').forEach((el) => {
        const dc = (el.dataset.color || el.getAttribute('data-color') || '').toLowerCase();
        if (dc === norm && dc !== '') {
            el.classList.add('active');
            el.style.transform  = 'scale(1.2)';
            el.style.boxShadow  = `0 0 12px ${selectedColor}`;
        } else {
            el.classList.remove('active');
            el.style.transform  = 'scale(1)';
            el.style.boxShadow  = 'none';
        }
    });
}


// ══════════════════════════════════════════════════════════════
//  СНИМОК ЭКРАНА
// ══════════════════════════════════════════════════════════════
function ensureSnapshotFlash() {
    let flash = document.getElementById('snapshotFlashOverlay');
    if (!flash) {
        flash = document.createElement('div');
        flash.id = 'snapshotFlashOverlay';
        document.body.appendChild(flash);
    }
    return flash;
}

function flashSnapshot() {
    const flash = ensureSnapshotFlash();
    flash.style.transition = 'opacity 0.25s ease-out';
    flash.style.opacity    = '0.8';
    setTimeout(() => { flash.style.opacity = '0'; }, 80);
}

function takeSnapshot() {
    if (!drawCanvas || !videoElement) return;
    const w = drawCanvas.width, h = drawCanvas.height;
    const tmp    = document.createElement('canvas');
    tmp.width    = w; tmp.height = h;
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
}


// ══════════════════════════════════════════════════════════════
//  ПЕРЕКЛЮЧЕНИЕ УРОВНЕЙ
// ══════════════════════════════════════════════════════════════
function switchAirCanvasLevel(level) {
    currentLevel = level;

    // Сбросить состояния рук
    if (currentLevel === 1) {
        handStates[1].action    = '00000';
        handStates[1].isDrawing = false;
        handStates[1].x = handStates[1].y = handStates[1].px = handStates[1].py = 0;
        galleryRotation = 0;
    } else {
        for (let i = 0; i < 2; i++) handStates[i].isDrawing = false;
    }

    // Three.js — показываем только на Level 3
    if (threeScene) threeScene.visible = (currentLevel === 3);

    // Кнопка переключения уровней
    const btn = document.getElementById('levelSwitcherBtn');
    if (btn) {
        if (currentLevel === 1) {
            btn.textContent      = '🎨 Уровень 1: Рисование';
            btn.style.backgroundColor = '#ef4444';
        } else if (currentLevel === 2) {
            btn.textContent      = '🖼️ Уровень 2: Лента Фото';
            btn.style.backgroundColor = '#a855f7';
        } else {
            btn.textContent      = '🧊 Уровень 3: 3D Голограмма';
            btn.style.backgroundColor = '#00ffcc';
            btn.style.color      = '#000';
        }
        if (currentLevel !== 3) btn.style.color = '#fff';
    }

    updateUploadButtons();
    console.log('Switched to Air Canvas level', currentLevel);
}


// ══════════════════════════════════════════════════════════════
//  РИСОВАНИЕ
// ══════════════════════════════════════════════════════════════
function executeDrawingLogic(state, x, y, gestureString) {
    if (currentLevel !== 1) return;
    if (!drawCtx) return;

    drawCtx.globalCompositeOperation = 'source-over';

    switch (gestureString) {
        case '01000': state.brush = 'Premium Pen';    state.isDrawing = true;  state.width = 5;  state.shadow = 0; break;
        case '01100': state.brush = 'Smart Eraser';   state.isDrawing = true;  state.width = 40; state.shadow = 0;
                      drawCtx.globalCompositeOperation = 'destination-out'; break;
        case '01110': state.brush = 'Thick Marker';   state.isDrawing = true;  state.width = 15; state.shadow = 0; break;
        case '00001': state.brush = 'Calligraphy';    state.isDrawing = true;  state.width = 2;  state.shadow = 0; break;
        case '01001': state.brush = 'Neon Glow';      state.isDrawing = true;  state.width = 6;  state.shadow = 10;
                      drawCtx.shadowColor = state.color; break;
        case '11100': state.brush = 'Laser Pointer';  state.isDrawing = false; break;
        default:      state.isDrawing = false; break;
    }

    if (state.isDrawing && state.brush !== 'Laser Pointer') {
        if (state.px !== 0 && state.py !== 0) {
            drawCtx.beginPath();
            drawCtx.moveTo(state.px, state.py);
            drawCtx.lineTo(x, y);
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
}


// ══════════════════════════════════════════════════════════════
//  LEVEL 3 — ГОЛОГРАММА В РУКАХ
// ══════════════════════════════════════════════════════════════
function processLevel3(w, h) {
    if (!torusKnot || !threeCamera) return;

    const s1 = handStates[0];
    const s2 = handStates[1];

    // ── Якорь: Рука 1 кулак (00000) — позиционируем TorusKnot ──
    if (s1.action === '00000' && s1.x !== 0) {
        // Перевод 2D экранных координат → NDC → 3D позицию на z=0
        const ndcX = (s1.x / w) * 2 - 1;
        const ndcY = -(s1.y / h) * 2 + 1;

        // Проецируем точку на плоскость z=0 в мировом пространстве
        const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
        vector.unproject(threeCamera);
        const dir  = vector.sub(threeCamera.position).normalize();
        const dist = -threeCamera.position.z / dir.z;
        const pos  = threeCamera.position.clone().add(dir.multiplyScalar(dist));

        torusKnot.position.x = pos.x;
        torusKnot.position.y = pos.y + 0.8; // немного выше руки
    }

    // ── Контроллер: Рука 2 указательный (01000) — вращение ──
    if (s2.action === '01000' && s2.lastX !== 0) {
        const deltaX = s2.x - s2.lastX;
        const deltaY = s2.y - s2.lastY;
        torusKnot.rotation.y += deltaX * 0.015;
        torusKnot.rotation.x += deltaY * 0.015;
    }

    // ── Масштаб: дистанция между руками ──
    if (s1.x !== 0 && s2.x !== 0) {
        const dx   = s1.x - s2.x;
        const dy   = s1.y - s2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Нормируем: 100px → 0.4, 600px → 2.5
        const scale = Math.max(0.3, Math.min(3.0, dist / 220));
        torusKnot.scale.set(scale, scale, scale);
    }
}


// ══════════════════════════════════════════════════════════════
//  ОБРАБОТКА ЖЕСТОВ
// ══════════════════════════════════════════════════════════════
function processGestures(state, handIndex, landmarks, w, h, numHands = 1) {
    // Интерполируем позицию курсора
    const targetX = w - (landmarks[8].x * w);
    const targetY = landmarks[8].y * h;
    if (state.x === 0 && state.y === 0) {
        state.x = targetX; state.y = targetY;
    } else {
        state.x = lerp(state.x, targetX, LERP_FACTOR);
        state.y = lerp(state.y, targetY, LERP_FACTOR);
    }

    // Распознаём жест
    const states = getFingerStates(landmarks);
    const fStr   = states.slice(1).join('');

    let actionStr;
    if (fStr === '1000')              actionStr = '01000';
    else if (fStr === '1100')         actionStr = '01100';
    else if (fStr === '1001')         actionStr = '10001';
    else if (states.join('') === '11111') actionStr = '11111';
    else if (states.join('') === '10000') actionStr = '10000';
    else                              actionStr = '00000';

    state.action = actionStr;

    // ══ LEVEL 1: РИСОВАНИЕ (только первая рука) ══════════════
    if (currentLevel === 1) {
        if (actionStr === '11111') {
            if (Date.now() - lastClearTime > 1000) {
                drawCtx.clearRect(0, 0, w, h);
                canvasHistory  = [];
                lastClearTime  = Date.now();
            }
            state.isDrawing = false;

        } else if (actionStr === '01100') {
            // Жест Peace/Selfie → Undo (с кулдауном 1 сек)
            if (Date.now() - lastUndoTime > 1000) {
                undo();
                lastUndoTime = Date.now();
            }
            state.isDrawing = false;

        } else if (actionStr === '10000') {
            // Жест "Класс" → Snapshot (кулдаун 2 сек)
            if (Date.now() - lastSnapGestureTime > 2000) {
                takeSnapshot();
                lastSnapGestureTime = Date.now();
            }
            state.isDrawing = false;

        } else if (actionStr === '10001') {
            if (Date.now() - lastPaletteTime[handIndex] > 500) {
                colorIndex[handIndex] = (colorIndex[handIndex] + 1) % PREMIUM_COLORS.length;
                state.color = PREMIUM_COLORS[colorIndex[handIndex]];
                lastPaletteTime[handIndex] = Date.now();
                if (handIndex === 0) { currentColor = state.color; updatePaletteUI(currentColor); }
            }
            state.isDrawing = false;

        } else if (actionStr === '00000') {
            state.isDrawing = false;

        } else {
            state.isDrawing = true;
            executeDrawingLogic(state, state.x, state.y, actionStr);
        }
    }

    // ══ LEVEL 2: ГАЛЕРЕЯ ═════════════════════════════════════
    else if (currentLevel === 2) {
        if (actionStr === '11111') {
            if (Date.now() - lastOpenPalmTime[handIndex] > 1000) {
                uploadedAssets = [];
                lastOpenPalmTime[handIndex] = Date.now();
            }
            state.isDrawing = false;
        } else if (actionStr === '01000' && numHands === 1) {
            if (state.lastX !== 0 || state.lastY !== 0) {
                galleryRotation += (state.x - state.lastX) * 0.003;
            }
            state.isDrawing = false;
        } else {
            state.isDrawing = false;
        }
    }

    // ══ LEVEL 3: 3D ГОЛОГРАММА — жесты обрабатываются в processLevel3 ══
    else if (currentLevel === 3) {
        state.isDrawing = false;
    }

    // ── Курсор ────────────────────────────────────────────────
    // Курсор виден ВСЕГДА на всех уровнях
    let cursorColor = state.color;
    if (actionStr === '01100') cursorColor = '#ffffff';

    if (uiCtx) {
        try {
            uiCtx.fillStyle   = cursorColor;
            uiCtx.globalAlpha = 0.85;
            uiCtx.beginPath();
            uiCtx.arc(state.x, state.y, 10, 0, 2 * Math.PI);
            uiCtx.fill();
            uiCtx.globalAlpha = 1.0;
            uiCtx.shadowBlur  = 0;
        } catch (e) {
            console.error('Cursor render error:', e);
        }
    }

    // Сохраняем предыдущие позиции
    if (!state.isDrawing) { state.px = 0; state.py = 0; }
    else { state.px = state.x; state.py = state.y; }
    state.lastX = state.x;
    state.lastY = state.y;
}


// ══════════════════════════════════════════════════════════════
//  LEVEL 2 — ГОЛОГРАФИЧЕСКАЯ ЛЕНТА (ДВЕ РУКИ)
// ══════════════════════════════════════════════════════════════
function processTwoHands(w, h) {
    const s1 = handStates[0];
    const s2 = handStates[1];

    // ── Скриншот: обе руки показывают "Класс" (10000) ──
    if (s1.action === '10000' && s2.action === '10000') {
        if (Date.now() - lastSnapshotTime > 1500) {
            takeSnapshot();
            lastSnapshotTime = Date.now();
        }
        s1.isDrawing = false; s2.isDrawing = false;
        return;
    }

    // ── Лента: кулак + Peace ──
    const isRibbon = (s1.action === '00000' && s2.action === '01100') ||
                     (s1.action === '01100' && s2.action === '00000');

    if (isRibbon) {
        s1.isDrawing = false; s2.isDrawing = false;

        const pLeft  = s1.x < s2.x ? s1 : s2;
        const pRight = s1.x < s2.x ? s2 : s1;

        const dx       = pRight.x - pLeft.x;
        const dy       = pRight.y - pLeft.y;
        const distance = Math.hypot(dx, dy);
        const angle    = Math.atan2(dy, dx);

        let dynScale = distance / 400;
        if (dynScale < 0.6) dynScale = 0.6;
        if (dynScale > 1.1) dynScale = 1.1;

        const items      = uploadedAssets.length > 0 ? uploadedAssets : [null, null, null, null];
        const maxDisplay = Math.min(items.length, 8);

        uiCtx.save();
        for (let i = 0; i < maxDisplay; i++) {
            const amt = (i + 1) / (maxDisplay + 1);
            const lx  = lerp(pLeft.x, pRight.x, amt);
            const ly  = lerp(pLeft.y, pRight.y, amt);

            uiCtx.save();
            uiCtx.translate(lx, ly);
            uiCtx.rotate(angle + galleryRotation);
            uiCtx.scale(dynScale, dynScale);

            const sX = 80, sY = 80;
            if (items[i]) {
                uiCtx.drawImage(items[i], -sX / 2, -sY / 2, sX, sY);
                uiCtx.strokeStyle = '#00ffcc'; uiCtx.lineWidth = 2;
                uiCtx.strokeRect(-sX / 2, -sY / 2, sX, sY);
            } else {
                uiCtx.strokeStyle = '#a855f7'; uiCtx.lineWidth = 2;
                uiCtx.strokeRect(-sX / 2, -sY / 2, sX, sY);
            }
            uiCtx.restore();
        }
        uiCtx.restore();
    }
}


// ══════════════════════════════════════════════════════════════
//  ОСНОВНОЙ ОБРАБОТЧИК MEDIAPIPE
// ══════════════════════════════════════════════════════════════
function onResultsElite(results) {
    if (!uiCtx) return;
    const w = uiCanvas.width;
    const h = uiCanvas.height;

    // Очищаем UI-слой каждый кадр
    uiCtx.clearRect(0, 0, w, h);

    if (document.getElementById('camVideo')) {
        document.getElementById('camVideo').style.opacity = isPresentationMode ? '0' : '1';
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const numHands = results.multiHandLandmarks.length;

        // ── LEVEL 1: умный поиск активной руки ──
        if (currentLevel === 1) {
            // Жесты, которые считаются «активными» на Level 1
            const ACTIVE_GESTURES = new Set(['01000', '01100', '01110', '00001', '01001', '10001', '10000', '11111']);

            // Ищем руку с активным жестом
            let activeLandmarks = null;
            for (let i = 0; i < numHands; i++) {
                const lm     = results.multiHandLandmarks[i];
                const st     = getFingerStates(lm);
                const fStr   = st.slice(1).join('');
                let gesture;
                if (fStr === '1000')                 gesture = '01000';
                else if (fStr === '1100')             gesture = '01100';
                else if (fStr === '1001')             gesture = '10001';
                else if (st.join('') === '11111')     gesture = '11111';
                else if (st.join('') === '10000')     gesture = '10000';
                else                                  gesture = '00000';

                if (ACTIVE_GESTURES.has(gesture)) {
                    activeLandmarks = lm;
                    break;   // берём первую найденную активную руку
                }
            }

            // Если активной руки нет — берём первую по умолчанию
            if (!activeLandmarks) activeLandmarks = results.multiHandLandmarks[0];

            // Обнуляем вторую руку (Level 1 — одноручный режим)
            handStates[1].action    = '00000';
            handStates[1].isDrawing = false;
            handStates[1].x = handStates[1].y = handStates[1].px = handStates[1].py = 0;

            processGestures(handStates[0], 0, activeLandmarks, w, h, numHands);
        }
        // ── LEVEL 2 / 3: обе руки ──
        else {
            for (let i = 0; i < numHands && i < 2; i++) {
                processGestures(handStates[i], i, results.multiHandLandmarks[i], w, h, numHands);
            }
            if (numHands === 2) {
                if (currentLevel === 2) {
                    processTwoHands(w, h);
                } else if (currentLevel === 3) {
                    processLevel3(w, h);
                }
            }
        }
    } else {
        // Нет рук — сбрасываем состояния
        for (let i = 0; i < 2; i++) {
            handStates[i].px = handStates[i].py = 0;
            handStates[i].x  = handStates[i].y  = 0;
        }
    }
}


// ══════════════════════════════════════════════════════════════
//  ПУБЛИЧНЫЕ API (start / stop)
// ══════════════════════════════════════════════════════════════
window.startAirCanvasElite = function () {
    if (!camera) initAirCanvasElite();
    if (!isRunning && camera) {
        camera.start();
        isRunning = true;
        if (document.getElementById('authBtn'))    document.getElementById('authBtn').style.display    = 'none';
        if (document.getElementById('stopCamBtn')) document.getElementById('stopCamBtn').style.display = 'block';
        const lock = document.getElementById('premiumLock');
        if (lock) {
            lock.style.background     = 'transparent';
            lock.style.backdropFilter = 'none';
            lock.style.pointerEvents  = 'none';
            ['h3', 'p', '.lock-icon'].forEach(sel => {
                const el = lock.querySelector(sel); if (el) el.style.display = 'none';
            });
        }
        if (document.getElementById('stopCamBtn')) document.getElementById('stopCamBtn').style.pointerEvents = 'auto';
    }
};

window.stopAirCanvasElite = function () {
    if (isRunning && camera) {
        camera.stop();
        videoElement.srcObject = null;
        isRunning = false;
        if (uiCtx)   uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
        if (drawCtx) drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        if (document.getElementById('authBtn'))    document.getElementById('authBtn').style.display    = 'block';
        if (document.getElementById('stopCamBtn')) document.getElementById('stopCamBtn').style.display = 'none';
        const lock = document.getElementById('premiumLock');
        if (lock) {
            lock.style.background     = 'rgba(0,0,0,.85)';
            lock.style.backdropFilter = 'blur(8px)';
            lock.style.pointerEvents  = 'auto';
            ['h3', 'p', '.lock-icon'].forEach(sel => {
                const el = lock.querySelector(sel); if (el) el.style.display = 'block';
            });
        }
    }
};

window.addEventListener('message', (event) => {
    if (event.data === 'startCamera') window.startAirCanvasElite();
    else if (event.data === 'stopCamera') window.stopAirCanvasElite();
});

// ── Старый fileInput (обратная совместимость) ────────────────
const fileInput = document.getElementById('fileInput');
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        for (const f of e.target.files) {
            const img = new Image();
            img.src = URL.createObjectURL(f);
            img.onload = () => uploadedAssets.push(img);
        }
    });
}
