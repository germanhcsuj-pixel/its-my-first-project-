// ============================================================
//  AIR CANVAS ELITE  –  v5.0 (ФИНАЛЬНЫЙ ФИКС AR И 3D)
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
let isFrozen           = false;   
let isFramingPhoto     = false;   
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
let demoModels        = [];
let currentModelIndex = 2; 
let modelSelected     = true;
let zoomBaseDist      = null;

const CD = {};
function cooldown(key, ms) {
    const now = Date.now();
    if (!CD[key] || now - CD[key] > ms) { CD[key] = now; return true; }
    return false;
}

// ============================================================
//  CSS-ИНЪЕКЦИЯ
// ============================================================
(function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #snapshotFlashOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #fff; opacity: 0; pointer-events: none; z-index: 9999;
            transition: opacity 0.25s ease-out;
        }
        #sysNotification {
            position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%) translateY(20px);
            background: rgba(10,10,10,0.85); border: 1px solid rgba(255,255,255,0.15);
            backdrop-filter: blur(16px); color: #fff; font-family: "Segoe UI", sans-serif;
            font-size: 18px; font-weight: 600; padding: 14px 32px; border-radius: 50px;
            opacity: 0; pointer-events: none; z-index: 99998;
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
        #sysNotification.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        .cb-swatch, .color-btn { transition: all 0.2s ease; }
        .cb-swatch.active, .color-btn.active { transform: scale(1.2); box-shadow: 0 0 12px currentColor; }
        #levelSwitcherBtn { transition: all 0.3s ease; }
        .air-upload-btn {
            position: fixed; bottom: 24px; right: 24px; z-index: 10000; padding: 12px 20px; 
            border-radius: 10px; border: none; font-size: 14px; font-weight: 600; cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.35); transition: all 0.25s ease; display: none;
        }
        .air-upload-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.45); }
        #uploadPhotoBtn  { background: #a855f7; color: #fff; }
        #modelLibraryContainer {
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            display: none; flex-direction: column; align-items: center;
            z-index: 10000; transition: transform 0.3s ease; margin: 0; padding: 0; pointer-events: none;
        }
        #modelLibraryContainer.hidden { transform: translate(-50%, 150%); }
        #modelLibraryPanel {
            display: flex; gap: 15px; padding: 15px 25px; background: rgba(15, 15, 15, 0.7);
            backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); pointer-events: auto;
        }
        .model-btn {
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
            color: white; font-size: 24px; width: 50px; height: 50px; border-radius: 12px;
            cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;
        }
        .model-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
        .model-btn.active { border-color: #00ffcc; box-shadow: 0 0 15px rgba(0, 255, 204, 0.5); }
        #toggleLibraryBtn {
            margin-bottom: 10px; background: rgba(0,0,0,0.5); color: #aaa; border: none; 
            border-radius: 10px; padding: 5px 15px; cursor: pointer; font-size: 12px;
            transition: color 0.2s; pointer-events: auto;
        }
        #toggleLibraryBtn:hover { color: #fff; }
    `;
    document.head.appendChild(style);
})();

function showSystemNotification(text, durationMs = 2200) {
    // Отключено по запросу
}

// ============================================================
//  СНИМКИ (СЕЛФИ И СКРИНШОТЫ)
// ============================================================
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
        // Отрисовка видео с отзеркаливанием
        tmpCtx.save();
        tmpCtx.translate(w, 0);
        tmpCtx.scale(-1, 1);
        tmpCtx.drawImage(videoElement, 0, 0, w, h);
        tmpCtx.restore();
        
        // Отрисовка 3D-маски (БЕЗ отзеркаливания, чтобы совпадала с лицом)
        const threeCanvas = document.getElementById('threeCanvas');
        if (threeCanvas) {
            tmpCtx.drawImage(threeCanvas, 0, 0, w, h);
        }
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

    arFlashEndTime = Date.now() + 150; 
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
}

// ============================================================
//  УТИЛИТЫ И ЖЕСТЫ
// ============================================================
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2D(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function getDistance(p1, p2) { return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2); }

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
function gestureCode(lm) { return getFingerStates(lm).join(''); }

const GestureEngine = {
    SWIPE_THRESHOLD: 28, PINCH_CLOSE_DIST: 0.06, CLAP_DIST: 120, CLAP_SPEED: 18,
    _lassoTrail: [], _lassoActive: false, _prevHandDist: null,
    reset() { this._lassoTrail = []; this._lassoActive = false; this._prevHandDist = null; },
    getCode(lm) { return getFingerStates(lm).join(''); },
    canonize(code) {
        const map = {
            '01000': 'INDEX', '00001': 'PINKY', '01110': 'THREE', '11000': 'GUN',
            '01100': 'PEACE', '11111': 'OPEN', '10000': 'THUMB', '00000': 'FIST',
            '01111': 'FOUR', '10001': 'SHAKA', '11110': 'OK_BASE', '01011': 'CROSS_FIN',
            // Усиленная поддержка жеста РОК (учитываем анатомию разных людей)
            '01001': 'ROCK', '11001': 'ROCK', '01101': 'ROCK', '11101': 'ROCK'
        };
        return map[code] || 'UNKNOWN';
    },
    detectSwipe(state) {
        if (state.px === 0) return null;
        const dx = state.x - state.px, dy = state.y - state.py, th = this.SWIPE_THRESHOLD;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < -th) return 'SWIPE_LEFT'; if (dx > th) return 'SWIPE_RIGHT';
        } else {
            if (dy < -th) return 'SWIPE_UP'; if (dy > th) return 'SWIPE_DOWN';
        }
        return null;
    },
    detectPinch(lm) { return getDistance(lm[4], lm[8]) < this.PINCH_CLOSE_DIST; },
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
    analyze(handLandmarks, handStatesArr) {
        const events = [];
        const n = handLandmarks.length;
        if (n === 0) { this.reset(); return events; }

        const codes = handLandmarks.map(lm => this.getCode(lm));
        const cans  = codes.map(c => this.canonize(c));

        const ok0 = this.detectOKSign(handLandmarks[0]);
        const cross0 = this.detectCrossedFingers(handLandmarks[0]);
        if (ok0) cans[0] = ok0; else if (cross0) cans[0] = cross0;

        events.push('CODE0:' + cans[0]);
        if (n >= 2) events.push('CODE1:' + cans[1]);

        if (n >= 2 && cans[0] === 'FIST' && cans[1] === 'FIST') events.push('DUAL_FIST');
        return events;
    }
};

// ============================================================
//  THREE.JS И МОДЕЛИ
// ============================================================
function initThreeJS() {
    let threeCanvas = document.getElementById('threeCanvas');
    if (!threeCanvas) {
        threeCanvas = document.createElement('canvas');
        threeCanvas.id = 'threeCanvas';
        threeCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:25;pointer-events:none;';
        document.body.appendChild(threeCanvas);
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
    for (let i = 0; i < 6; i++) {
        const g = new THREE.Group();
        g.visible = false;
        g.userData = { isPinned: false };
        threeScene.add(g);
        demoModels.push(g);
    }

    if (window.THREE && window.THREE.GLTFLoader) {
        const loader = new THREE.GLTFLoader();
        loader.load('models/ar_mask.glb', (gltf) => {
            arMaskModel = gltf.scene;
            arMaskModel.visible = false;
            const box = new THREE.Box3().setFromObject(arMaskModel);
            const size = box.getSize(new THREE.Vector3()).length();
            const scale = 3.0 / size; 
            arMaskModel.scale.set(scale, scale, scale);
            const center = box.getCenter(new THREE.Vector3());
            arMaskModel.position.sub(center.multiplyScalar(scale));
            threeScene.add(arMaskModel);
        });

        loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb', (gltf) => {
            const m = gltf.scene; m.scale.set(0.02, 0.02, 0.02); m.position.y = -0.5; demoModels[0].add(m);
        });
        loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb', (gltf) => {
            const m = gltf.scene; m.scale.set(1, 1, 1); m.position.y = -0.5; demoModels[1].add(m);
        });
    }

    const mat1 = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
    const hBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat1);
    const hRoof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.0, 4), mat1);
    hRoof.position.y = 1.1; hRoof.rotation.y = Math.PI / 4;
    demoModels[2].add(hBody, hRoof);

    const mat2 = new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true });
    const rHead = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat2); rHead.position.y = 0.9;
    const rBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 8), mat2);
    demoModels[3].add(rHead, rBody);

    const mat4 = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true });
    demoModels[5].add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), mat4));

    threeScene.visible = false;
    animateThree();
}

function switchDemoModel(idx) {
    if (!demoModels.length) return;
    demoModels[currentModelIndex].visible = false;
    currentModelIndex = ((idx % demoModels.length) + demoModels.length) % demoModels.length;
    
    const newModel = demoModels[currentModelIndex];
    newModel.scale.set(0.01, 0.01, 0.01);
    newModel.position.set(0, 0, 0); 
    newModel.userData.isPinned = false; // Автоматически летит за рукой
    newModel.visible = true;
    
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
}

function animateThree() {
    requestAnimationFrame(animateThree);
    threeRenderer.render(threeScene, threeCamera);
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ КАМЕРЫ И ИИ
// ============================================================
function initAirCanvasElite() {
    if (!videoElement || !uiCanvas || !drawCanvas) return;
    function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        uiCanvas.width = w; uiCanvas.height = h;
        drawCanvas.width = w; drawCanvas.height = h;
        if (threeRenderer) { threeRenderer.setSize(w, h); threeCamera.aspect = w / h; threeCamera.updateProjectionMatrix(); }
    }
    window.addEventListener('resize', resize); resize();

    hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    hands.onResults(onResultsElite);

    // ВАЖНО: АВТО-ЗАГРУЗКА FaceMesh (Исправляет баг невидимой маски!)
    if (typeof FaceMesh === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => loadFaceMesh();
        document.head.appendChild(script);
    } else {
        loadFaceMesh();
    }

    function loadFaceMesh() {
        faceMesh = new FaceMesh({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
        faceMesh.onResults((results) => { currentFaceLandmarks = results.multiFaceLandmarks; });
    }

    camera = new Camera(videoElement, {
        onFrame: async () => { 
            if (isRunning) {
                const promises = [hands.send({ image: videoElement })];
                if (faceMesh) promises.push(faceMesh.send({ image: videoElement }));
                await Promise.all(promises);
            }
        }, width: 1280, height: 720
    });

    initThreeJS();
    switchAirCanvasLevel(1);
}

// ============================================================
//  ОБРАБОТКА УРОВНЕЙ
// ============================================================
function switchAirCanvasLevel(level) {
    currentLevel = level;
    if (threeScene) {
        threeScene.visible = (level === 3 || level === 2);
        demoModels.forEach((m, i) => { m.visible = (level === 3 && i === currentModelIndex); });
        if (arMaskModel) arMaskModel.visible = (level === 2 && isArModeActive);
    }
}

// === УРОВЕНЬ 2: AR-МАСКА И СЕЛФИ ===
function processLevel2(events, codes, lms, w, h) {
    // Включение AR любой рукой жестом РОК
    if ((events.includes('CODE0:ROCK') || events.includes('CODE1:ROCK')) && cooldown('arToggle', 1500)) {
        isArModeActive = !isArModeActive;
        flashSnapshot(); 
        if (threeScene) threeScene.visible = true;
        if (!isArModeActive && arMaskModel) arMaskModel.visible = false;
    }

    if (isArModeActive) {
        if (currentFaceLandmarks && currentFaceLandmarks.length > 0) {
            window.lastFaceTime = Date.now();
            window.lastFaceData = currentFaceLandmarks[0];
        }

        const recentlyHadFace = (Date.now() - (window.lastFaceTime || 0)) < 600;

        if (arMaskModel && recentlyHadFace && window.lastFaceData) {
            const face = window.lastFaceData;
            const nose = face[1], leftEye = face[33], rightEye = face[263];
            
            const targetX = (1 - nose.x) * 2 - 1;
            const targetY = -(nose.y) * 2 + 1;
            const vec = new THREE.Vector3(targetX, targetY, 0.5);
            vec.unproject(threeCamera);
            const dir = vec.sub(threeCamera.position).normalize();
            const pos = threeCamera.position.clone().add(dir.multiplyScalar(-threeCamera.position.z / dir.z));
            
            arMaskModel.position.copy(pos);
            arMaskModel.position.z += 0.5; 
            
            const angleZ = Math.atan2(rightEye.y - leftEye.y, (1 - rightEye.x) - (1 - leftEye.x));
            arMaskModel.rotation.set((nose.y - 0.5) * -Math.PI / 4, (nose.x - 0.5) * -Math.PI / 4, -angleZ);
            arMaskModel.visible = true;
        }

        // Селфи по жесту ✌️ PEACE или ✊ ДВУМ КУЛАКАМ
        if ((events.includes('CODE0:PEACE') || events.includes('DUAL_FIST')) && cooldown('arSelfie', 1500)) {
            takeARSnapshot();
        }
    }
}

// === УРОВЕНЬ 3: ГОЛОГРАММЫ (ЛЕТЯТ ЗА РУКОЙ) ===
function processLevel3(events, codes, w, h) {
    if (!demoModels.length || !threeCamera) return;
    const model = demoModels[currentModelIndex];
    model.visible = true;

    // Жест PEACE закрепляет модель в воздухе
    if ((events.includes('CODE0:PEACE') || events.includes('CODE1:PEACE')) && cooldown('pin3d', 1000)) {
        model.userData.isPinned = !model.userData.isPinned;
        flashSnapshot(); 
    }

    // Если не закреплено, модель ВСЕГДА следует за ладонью (без кулака!)
    if (!model.userData.isPinned && handStates[0].x !== 0) {
        const ndcX = (handStates[0].x / w) * 2 - 1;
        const ndcY = -(handStates[0].y / h) * 2 + 1;
        const vec  = new THREE.Vector3(ndcX, ndcY, 0.5);
        vec.unproject(threeCamera);
        const dir  = vec.sub(threeCamera.position).normalize();
        const pos  = threeCamera.position.clone().add(dir.multiplyScalar(-threeCamera.position.z / dir.z));
        
        model.position.x = lerp(model.position.x, pos.x, 0.2);
        model.position.y = lerp(model.position.y, pos.y + 0.3, 0.2); 
    }

    // Вращение указательным пальцем второй руки
    if (codes[1] === 'INDEX' && handStates[1].lastX !== 0) {
        model.userData.vx = (handStates[1].x - handStates[1].lastX) * 0.01;
        model.userData.vy = (handStates[1].y - handStates[1].lastY) * 0.01;
    }
    
    if (model.userData.vx || model.userData.vy) {
        model.rotation.y += model.userData.vx;
        model.rotation.x += model.userData.vy;
        model.userData.vx *= 0.92;
        model.userData.vy *= 0.92;
    }
}

function updateCursor(state, landmarks, w, h) {
    const targetX = w - landmarks[8].x * w, targetY = landmarks[8].y * h;
    state.x = (state.x === 0) ? targetX : lerp(state.x, targetX, LERP_FACTOR);
    state.y = (state.y === 0) ? targetY : lerp(state.y, targetY, LERP_FACTOR);
}

function onResultsElite(results) {
    if (!uiCtx) return;
    const w = uiCanvas.width, h = uiCanvas.height;
    uiCtx.clearRect(0, 0, w, h);

    if (Date.now() < arFlashEndTime) {
        uiCtx.fillStyle = `rgba(255, 255, 255, ${(arFlashEndTime - Date.now()) / 150})`;
        uiCtx.fillRect(0, 0, w, h);
    }

    const lms = results.multiHandLandmarks || [];
    if (lms.length === 0) {
        GestureEngine.reset();
        handStates.forEach(s => s.x = s.y = s.px = s.py = 0);
        return;
    }

    updateCursor(handStates[0], lms[0], w, h);
    if (lms.length >= 2) updateCursor(handStates[1], lms[1], w, h);

    const codes = lms.map(lm => gestureCode(lm));
    const cans  = codes.map(c => GestureEngine.canonize(c));
    const events = GestureEngine.analyze(lms, handStates);

    if (currentLevel === 2) processLevel2(events, cans, lms, w, h);
    if (currentLevel === 3) processLevel3(events, cans, w, h);

    handStates.forEach(s => { s.lastX = s.x; s.lastY = s.y; });
}

window.startAirCanvasElite = function () {
    if (!camera) initAirCanvasElite();
    if (!isRunning && camera) { camera.start(); isRunning = true; }
};
window.stopAirCanvasElite = function () {
    if (isRunning && camera) { camera.stop(); videoElement.srcObject = null; isRunning = false; }
};

window.selectHoloModel = function(index) {
    switchDemoModel(index);
    const modal = document.getElementById('modal3DLibrary');
    if (modal) modal.classList.add('hidden');
};
