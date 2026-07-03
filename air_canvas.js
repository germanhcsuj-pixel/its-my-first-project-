const BACKEND_URL = 'http://localhost:8001';

// Узлы DOM
const premiumLock = document.getElementById('premiumLock');
const tokenInput = document.getElementById('tokenInput');
const authBtn = document.getElementById('authBtn');
const lockError = document.getElementById('lockError');

const camVideo = document.getElementById('camVideo');
const camOff = document.getElementById('camOff');
const drawCanvas = document.getElementById('drawCanvas');
const uiCanvas = document.getElementById('uiCanvas');
const colorBar = document.getElementById('colorBar');
const colorSwatches = document.querySelectorAll('.cb-swatch');
const clearBtn = document.getElementById('clearBtn');
const hint = document.getElementById('hint');

// Новые UI элементы
const gestureIndicator = document.getElementById('gestureIndicator');
const photoTimer = document.getElementById('photoTimer');
const photoFlash = document.getElementById('photoFlash');
const directorBox = document.getElementById('directorBox');

// Состояние
const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff'];
let colorIndex = 0;
let drawColor = colors[colorIndex];
let lineWidth = 6;
let isRainbow = false;
let rainbowHue = 0;

let isDrawing = false;
let isEraser = false;
let lastPt = null;
let hands = null;

// Защита и Таймеры
let cooldownUntil = 0;
let photoFrameStartTime = 0;
let isTakingPhoto = false;

// LERP для сглаживания рамки
let smoothedMinX = 0;
let smoothedMinY = 0;
let smoothedMaxX = 0;
let smoothedMaxY = 0;

// ==========================================
// 1. АВТОЗАПУСК (Временно открыто для тестов)
// ==========================================
setTimeout(() => {
  if (premiumLock) premiumLock.style.display = 'none';
  if (colorBar) colorBar.style.display = 'flex';
  showHint('✅ Test mode: Use 10 super-gestures!');
  startCamera();
}, 500);

// ==========================================
// 2. УПРАВЛЕНИЕ КАМЕРОЙ И MEDIAPIPE (60 FPS)
// ==========================================
function startCamera() {
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: 'user', 
      width: { ideal: 1280 }, 
      height: { ideal: 720 },
      frameRate: { ideal: 60 }
    }, 
    audio: false 
  })
    .then((stream) => {
      camVideo.srcObject = stream;
      camVideo.style.display = 'block';
      camOff.style.display = 'none';
      camVideo.play();
      initMediaPipe();
    })
    .catch((err) => {
      showHint('Camera access error: ' + err.message);
    });
}

function initMediaPipe() {
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2, 
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults(onHandsResults);

  let lastVideoTime = -1;
  async function renderLoop() {
    if (camVideo.readyState >= 2 && camVideo.currentTime !== lastVideoTime) {
      lastVideoTime = camVideo.currentTime;
      if (hands) await hands.send({ image: camVideo });
    }
    requestAnimationFrame(renderLoop);
  }
  renderLoop();
}

// ==========================================
// 3. ЛОГИКА ЖЕСТОВ
// ==========================================
function isFingerUp(landmarks, tipIdx, pipIdx) {
  return landmarks[tipIdx].y < landmarks[pipIdx].y;
}

// Улучшенный и "прощающий" алгоритм для L_Sign
function detectLSign(landmarks) {
  const palmSize = Math.hypot(landmarks[0].x - landmarks[9].x, landmarks[0].y - landmarks[9].y);
  
  // Дистанции от кончика пальца до костяшки
  const indexDist = Math.hypot(landmarks[8].x - landmarks[5].x, landmarks[8].y - landmarks[5].y);
  const middleDist = Math.hypot(landmarks[12].x - landmarks[9].x, landmarks[12].y - landmarks[9].y);
  const ringDist = Math.hypot(landmarks[16].x - landmarks[13].x, landmarks[16].y - landmarks[13].y);
  const pinkyDist = Math.hypot(landmarks[20].x - landmarks[17].x, landmarks[20].y - landmarks[17].y);
  const thumbDist = Math.hypot(landmarks[4].x - landmarks[5].x, landmarks[4].y - landmarks[5].y);

  // Указательный и большой должны быть вытянуты, остальные свернуты (сжаты)
  const isIndexOpen = indexDist > palmSize * 0.7;
  const isMiddleClosed = middleDist < palmSize * 0.7;
  const isRingClosed = ringDist < palmSize * 0.7;
  const isPinkyClosed = pinkyDist < palmSize * 0.7;
  const isThumbOpen = thumbDist > palmSize * 0.6;

  return isIndexOpen && isThumbOpen && isMiddleClosed && isRingClosed && isPinkyClosed;
}

function detectGesture(landmarks) {
  // Проверяем L_Sign по новой мягкой логике
  if (detectLSign(landmarks)) return 'L_Sign';

  // Старая логика для остальных жестов
  const indexUp = isFingerUp(landmarks, 8, 6);
  const middleUp = isFingerUp(landmarks, 12, 10);
  const ringUp = isFingerUp(landmarks, 16, 14);
  const pinkyUp = isFingerUp(landmarks, 20, 18);
  
  const pinchDist = Math.hypot(landmarks[8].x - landmarks[4].x, landmarks[8].y - landmarks[4].y);
  const isPinching = pinchDist < 0.05 && !middleUp && !ringUp && !pinkyUp;
  const thumbIsOut = Math.abs(landmarks[4].x - landmarks[9].x) > 0.05;
  const thumbUp = landmarks[4].y < landmarks[3].y && thumbIsOut;
  const thumbDown = landmarks[4].y > landmarks[3].y && thumbIsOut;

  if (isPinching) return 'Pinch';
  if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) return 'Thumb_Up';
  if (thumbDown && !indexUp && !middleUp && !ringUp && !pinkyUp) return 'Thumb_Down';
  if (indexUp && !middleUp && !ringUp && pinkyUp && !thumbIsOut) return 'Rock';
  if (indexUp && middleUp && ringUp && !pinkyUp && !thumbIsOut) return 'Three_Fingers';
  if (indexUp && middleUp && !ringUp && !pinkyUp && !thumbIsOut) return 'V_Sign';
  if (indexUp && !middleUp && !ringUp && !pinkyUp && !thumbIsOut) return 'Index_Open';
  if (indexUp && middleUp && ringUp && pinkyUp) return 'Open_Palm';
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbIsOut) return 'Fist';
  
  return 'Unknown';
}

function onHandsResults(results) {
  const screen = document.getElementById('screen');
  if (!screen) return;
  
  // Подстройка размеров
  [drawCanvas, uiCanvas].forEach(cvs => {
    if (cvs && (cvs.width !== screen.offsetWidth || cvs.height !== screen.offsetHeight)) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cvs.width;
      tempCanvas.height = cvs.height;
      tempCanvas.getContext('2d').drawImage(cvs, 0, 0);
      
      cvs.width = screen.offsetWidth;
      cvs.height = screen.offsetHeight;
      if(cvs === drawCanvas) cvs.getContext('2d').drawImage(tempCanvas, 0, 0);
    }
  });

  const ctx = drawCanvas.getContext('2d');
  const uiCtx = uiCanvas ? uiCanvas.getContext('2d') : null;
  const w = drawCanvas.width;
  const h = drawCanvas.height;
  
  if (uiCtx) uiCtx.clearRect(0, 0, w, h);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    isDrawing = false;
    lastPt = null;
    updateGestureUI('👀', 'Waiting for gesture...');
    if(cursorDiv) cursorDiv.style.display = 'none';
    resetDirectorFrame();
    return;
  }

  // --- ЛОГИКА РЕЖИССЕРСКОЙ РАМКИ (2 РУКИ) ---
  if (results.multiHandLandmarks.length === 2 && !isTakingPhoto) {
    const h1 = results.multiHandLandmarks[0];
    const h2 = results.multiHandLandmarks[1];
    
    // Проверка на двойную "Щепотку" (дистанция между большим и указательным)
    const pinchDist1 = Math.hypot(h1[8].x - h1[4].x, h1[8].y - h1[4].y);
    const pinchDist2 = Math.hypot(h2[8].x - h2[4].x, h2[8].y - h2[4].y);
    
    if (pinchDist1 < 0.05 && pinchDist2 < 0.05) {
      updateGestureUI('📸', 'Viewfinder (Hold!)');
      if(cursorDiv) cursorDiv.style.display = 'none';
      isDrawing = false;
      lastPt = null;

      // Берем среднюю точку между указательным и большим пальцем каждой руки
      const p1X = (1 - (h1[8].x + h1[4].x) / 2) * w;
      const p1Y = ((h1[8].y + h1[4].y) / 2) * h;
      const p2X = (1 - (h2[8].x + h2[4].x) / 2) * w;
      const p2Y = ((h2[8].y + h2[4].y) / 2) * h;

      const targetMinX = Math.min(p1X, p2X);
      const targetMaxX = Math.max(p1X, p2X);
      const targetMinY = Math.min(p1Y, p2Y);
      const targetMaxY = Math.max(p1Y, p2Y);
      
      // LERP (Сглаживание рамки)
      if (smoothedMinX === 0) {
        smoothedMinX = targetMinX; smoothedMaxX = targetMaxX;
        smoothedMinY = targetMinY; smoothedMaxY = targetMaxY;
      } else {
        smoothedMinX += (targetMinX - smoothedMinX) * 0.7;
        smoothedMaxX += (targetMaxX - smoothedMaxX) * 0.7;
        smoothedMinY += (targetMinY - smoothedMinY) * 0.7;
        smoothedMaxY += (targetMaxY - smoothedMaxY) * 0.7;
      }
      
      const boxW = smoothedMaxX - smoothedMinX;
      const boxH = smoothedMaxY - smoothedMinY;

      // Отрисовка UI Видоискателя
      if (uiCtx) {
        // Затемнение (Vignette)
        uiCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        uiCtx.fillRect(0, 0, w, h);
        // Вырезаем "дырку"
        uiCtx.clearRect(smoothedMinX, smoothedMinY, boxW, boxH);
        
        // 4 Уголка
        uiCtx.strokeStyle = '#fff';
        uiCtx.lineWidth = 4;
        const len = 40;
        uiCtx.beginPath();
        // top-left
        uiCtx.moveTo(smoothedMinX, smoothedMinY+len);
        uiCtx.lineTo(smoothedMinX, smoothedMinY);
        uiCtx.lineTo(smoothedMinX+len, smoothedMinY);
        // top-right
        uiCtx.moveTo(smoothedMaxX-len, smoothedMinY);
        uiCtx.lineTo(smoothedMaxX, smoothedMinY);
        uiCtx.lineTo(smoothedMaxX, smoothedMinY+len);
        // bottom-right
        uiCtx.moveTo(smoothedMaxX, smoothedMaxY-len);
        uiCtx.lineTo(smoothedMaxX, smoothedMaxY);
        uiCtx.lineTo(smoothedMaxX-len, smoothedMaxY);
        // bottom-left
        uiCtx.moveTo(smoothedMinX+len, smoothedMaxY);
        uiCtx.lineTo(smoothedMinX, smoothedMaxY);
        uiCtx.lineTo(smoothedMinX, smoothedMaxY-len);
        uiCtx.stroke();
      }

      const now = Date.now();
      if (!photoFrameStartTime) photoFrameStartTime = now;
      
      const elapsed = now - photoFrameStartTime;
      const secondsLeft = 3 - Math.floor(elapsed / 1000);

      if (elapsed < 3000) {
        if (photoTimer) {
          photoTimer.style.display = 'flex';
          photoTimer.textContent = secondsLeft;
          photoTimer.style.left = (smoothedMinX + boxW / 2) + 'px';
          photoTimer.style.top = (smoothedMinY + boxH / 2) + 'px';
        }
      } else {
        // Делаем фото!
        photoFrameStartTime = 0; 
        if (photoTimer) photoTimer.style.display = 'none';
        if (uiCtx) uiCtx.clearRect(0,0,w,h);
        
        takeCroppedPhotoWithWatermark();
      }
      return; // Выходим, чтобы не рисовать
    }
  }

  // Если рамка сломалась - сбрасываем таймер
  resetDirectorFrame();

  // --- ЛОГИКА РИСОВАНИЯ (ДЛЯ 1 РУКИ) ---
  if (isTakingPhoto) return; // Во время кулдауна ничего не делаем

  const landmarks = results.multiHandLandmarks[0];
  const indexX = (1 - landmarks[8].x) * w;
  const indexY = landmarks[8].y * h;
  updateCursor(indexX, indexY);
  
  const gesture = detectGesture(landmarks);
  const now = Date.now();

  let shouldDraw = false;
  isEraser = false;
  isRainbow = false;

  switch (gesture) {
    case 'Index_Open':
      updateGestureUI('☝️', 'Drawing');
      shouldDraw = true;
      break;
    case 'Fist':
      updateGestureUI('✊', 'Pause (Hover)');
      shouldDraw = false;
      break;
    case 'V_Sign':
      updateGestureUI('✌️', 'Eraser');
      shouldDraw = true;
      isEraser = true;
      break;
    case 'Rock':
      updateGestureUI('🤘', 'Rainbow brush');
      shouldDraw = true;
      isRainbow = true;
      break;
    case 'Pinch':
      updateGestureUI('🤏', `Thinner brush (${Math.floor(lineWidth)}px)`);
      lineWidth = Math.max(2, lineWidth - 0.5); 
      break;
    case 'Three_Fingers':
      updateGestureUI('🖐️', `Thicker brush (${Math.floor(lineWidth)}px)`);
      lineWidth = Math.min(30, lineWidth + 0.5); 
      break;
    case 'Thumb_Up':
      updateGestureUI('👍', 'Next color');
      if (now > cooldownUntil) {
        colorIndex = (colorIndex + 1) % colors.length;
        updateColorUI();
        cooldownUntil = now + 1000;
      }
      break;
    case 'Thumb_Down':
      updateGestureUI('👎', 'Previous color');
      if (now > cooldownUntil) {
        colorIndex = (colorIndex - 1 + colors.length) % colors.length;
        updateColorUI();
        cooldownUntil = now + 1000;
      }
      break;
    case 'Open_Palm':
      updateGestureUI('✋', 'Clear canvas');
      if (now > cooldownUntil) {
        ctx.clearRect(0, 0, w, h);
        cooldownUntil = now + 1500;
        showHint('🧹 Canvas cleared!');
      }
      break;
    case 'L_Sign':
      updateGestureUI('🤟', 'Waiting for second hand...');
      shouldDraw = false;
      break;
    default:
      updateGestureUI('🤔', 'Unknown gesture');
      break;
  }

  // Логика рисования
  if (shouldDraw) {
    if (isDrawing && lastPt) {
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = lineWidth * 2;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = lineWidth;
        if (isRainbow) {
          rainbowHue = (rainbowHue + 2) % 360;
          ctx.strokeStyle = `hsl(${rainbowHue}, 100%, 50%)`;
        } else {
          ctx.strokeStyle = drawColor;
        }
      }
      
      ctx.moveTo(lastPt.x, lastPt.y);
      ctx.lineTo(indexX, indexY);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    isDrawing = true;
    lastPt = { x: indexX, y: indexY };
  } else {
    isDrawing = false;
    lastPt = null;
  }
}

function resetDirectorFrame() {
  photoFrameStartTime = 0;
  smoothedMinX = 0; // Сбрасываем LERP
  if (directorBox) directorBox.style.display = 'none';
  if (photoTimer) photoTimer.style.display = 'none';
}

// ==========================================
// 4. ФОТОГРАФИЯ C РАМКОЙ И ВОДЯНЫМ ЗНАКОМ
// ==========================================
function takeCroppedPhotoWithWatermark() {
  isTakingPhoto = true;

  if (photoFlash) {
    photoFlash.style.display = 'block';
    setTimeout(() => { photoFlash.style.display = 'none'; }, 150);
  }
  
  const pad = 40;
  const cropX = Math.max(0, smoothedMinX - pad);
  const cropY = Math.max(0, smoothedMinY - pad);
  const cropW = Math.min(drawCanvas.width - cropX, (smoothedMaxX - smoothedMinX) + pad * 2);
  const cropH = Math.min(drawCanvas.height - cropY, (smoothedMaxY - smoothedMinY) + pad * 2);

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = cropW;
  finalCanvas.height = cropH;
  const ctx = finalCanvas.getContext('2d');
  
  // Создаем промежуточный Canvas для идеального наложения видео + рисунка
  const merged = document.createElement('canvas');
  merged.width = drawCanvas.width;
  merged.height = drawCanvas.height;
  const mctx = merged.getContext('2d');
  
  mctx.save();
  mctx.scale(-1, 1);
  mctx.drawImage(camVideo, -merged.width, 0, merged.width, merged.height);
  mctx.restore();
  mctx.drawImage(drawCanvas, 0, 0);

  // Копируем ТОЛЬКО ВЫРЕЗАННУЮ ЧАСТЬ на итоговый Canvas
  ctx.drawImage(merged, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  
  // Динамический водяной знак
  const fontSize = Math.max(14, Math.min(40, cropW * 0.06));
  ctx.font = `bold ${fontSize}px "Inter", system-ui, sans-serif`;
  const text = '✦ Solifon AI';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  
  ctx.lineWidth = fontSize * 0.1;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.strokeText(text, cropW - 15, cropH - 15);
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(text, cropW - 15, cropH - 15);
  
  // Скачивание файла
  const dataURL = finalCanvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `Solifon_DirectorPhoto_${Date.now()}.png`;
  a.click();
  
  showHint('📸 Photo saved from frame!');
  setTimeout(() => { isTakingPhoto = false; }, 3000);
}

// ==========================================
// 5. ВСПОМОГАТЕЛЬНЫЙ UI
// ==========================================
let cursorDiv = null;
function updateCursor(x, y) {
  if (!cursorDiv) {
    cursorDiv = document.createElement('div');
    cursorDiv.style.position = 'absolute';
    cursorDiv.style.width = '14px';
    cursorDiv.style.height = '14px';
    cursorDiv.style.border = '2px solid rgba(239, 68, 68, 0.9)';
    cursorDiv.style.borderRadius = '50%';
    cursorDiv.style.pointerEvents = 'none';
    cursorDiv.style.zIndex = '999';
    cursorDiv.style.transform = 'translate(-50%, -50%)';
    cursorDiv.style.transition = 'width 0.1s, height 0.1s';
    
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.top = '50%';
    dot.style.left = '50%';
    dot.style.width = '4px';
    dot.style.height = '4px';
    dot.style.background = 'red';
    dot.style.borderRadius = '50%';
    dot.style.transform = 'translate(-50%, -50%)';
    cursorDiv.appendChild(dot);
    
    const screen = document.getElementById('screen');
    if(screen) screen.appendChild(cursorDiv);
  }
  
  cursorDiv.style.display = 'block';
  cursorDiv.style.left = x + 'px';
  cursorDiv.style.top = y + 'px';
  
  const size = Math.max(14, lineWidth + 4);
  cursorDiv.style.width = size + 'px';
  cursorDiv.style.height = size + 'px';
}

function updateGestureUI(emoji, text) {
  if(gestureIndicator) {
    gestureIndicator.innerHTML = `<span>${emoji}</span> ${text}`;
  }
}

function updateColorUI() {
  drawColor = colors[colorIndex];
  colorSwatches.forEach((s, idx) => {
    if(idx === colorIndex) s.classList.add('active');
    else s.classList.remove('active');
  });
  showHint(`Цвет: ${drawColor}`);
}

colorSwatches.forEach((swatch, idx) => {
  swatch.addEventListener('click', (e) => {
    colorIndex = idx;
    updateColorUI();
  });
});

if(clearBtn) {
  clearBtn.addEventListener('click', () => {
    const ctx = drawCanvas.getContext('2d');
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    isDrawing = false;
  });
}

function showHint(text) {
  if(!hint) return;
  hint.textContent = text;
  hint.style.display = 'block';
  setTimeout(() => { hint.style.display = 'none'; }, 2500);
}
