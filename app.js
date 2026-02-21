(function () {
  'use strict';

  const LOGIC_WIDTH = 60;
  const LOGIC_HEIGHT = 40;
  const CROP_LEFT_WIDTH = 40;
  const CROP_RIGHT_WIDTH = 20;
  const ZOOM_FIXED = 10;
  const MOBILE_BREAKPOINT = 480;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
  const CYAN_LINE = 'rgba(0, 204, 204, 0.6)';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadError = document.getElementById('uploadError');
  const workspaceSection = document.getElementById('workspaceSection');
  const workspaceCanvas = document.getElementById('workspaceCanvas');
  const canvasWrapper = workspaceCanvas.parentElement;
  const previewCanvas = document.getElementById('previewCanvas');
  const bgColorInput = document.getElementById('bgColor');
  const bgColorHexEl = document.getElementById('bgColorHex');
  const scaleRange = document.getElementById('scaleRange');
  const scaleValueEl = document.getElementById('scaleValue');
  const downloadBtn = document.getElementById('downloadBtn');

  let state = {
    image: null,
    bgColor: '#000000',
    imageScale: 1,
    zoom: ZOOM_FIXED,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartOffsetX: 0,
    dragStartOffsetY: 0
  };

  function setError(msg) {
    uploadError.textContent = msg || '';
  }

  function isValidFile(file) {
    return file && file.type && ALLOWED_TYPES.includes(file.type);
  }

  function loadImage(file) {
    if (!isValidFile(file)) {
      setError('Solo se permiten archivos JPG, JPEG o PNG.');
      return;
    }
    setError('');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      state.image = img;
      state.imageScale = 1;
      state.offsetX = 0;
      state.offsetY = 0;
      workspaceSection.hidden = false;
      updateScaleRangeFromImage();
      draw();
      requestAnimationFrame(function () { requestAnimationFrame(draw); });
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      setError('No se pudo cargar la imagen.');
    };
    img.src = url;
  }

  function updateScaleRangeFromImage() {
    if (!state.image) return;
    const scaleToFit = Math.min(
      LOGIC_WIDTH / state.image.width,
      LOGIC_HEIGHT / state.image.height
    );
    scaleRange.min = Math.round(scaleToFit * 50);
    scaleRange.max = 200;
    scaleRange.value = 100;
    state.imageScale = 1;
    scaleValueEl.textContent = '100%';
  }

  dropZone.addEventListener('click', function (e) {
    if (e.target === fileInput) return;
    fileInput.click();
  });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadImage(file);
  });

  fileInput.addEventListener('change', function () {
    const file = fileInput.files && fileInput.files[0];
    if (file) loadImage(file);
    fileInput.value = '';
  });

  function getImageDrawSize() {
    if (!state.image) return { w: 0, h: 0, x: 0, y: 0 };
    const scale = state.imageScale * Math.min(
      LOGIC_WIDTH / state.image.width,
      LOGIC_HEIGHT / state.image.height
    );
    const w = state.image.width * scale;
    const h = state.image.height * scale;
    const x = state.offsetX + (LOGIC_WIDTH - w) / 2;
    const y = state.offsetY + (LOGIC_HEIGHT - h) / 2;
    return { w, h, x, y };
  }

  function drawToContext(ctx, logicalWidth, logicalHeight, drawCyanLine) {
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    if (state.image) {
      const { w, h, x, y } = getImageDrawSize();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(state.image, 0, 0, state.image.width, state.image.height, x, y, w, h);
    }

    if (drawCyanLine) {
      ctx.strokeStyle = CYAN_LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.lineTo(40, logicalHeight);
      ctx.stroke();
    }
  }

  function getDisplayZoom() {
    if (!window.matchMedia('(max-width: ' + MOBILE_BREAKPOINT + 'px)').matches) return ZOOM_FIXED;
    var wrapper = workspaceCanvas.parentElement;
    if (!wrapper) return ZOOM_FIXED;
    var w = wrapper.clientWidth;
    if (w <= 0) w = Math.min(window.innerWidth - 24, 600);
    return Math.min(ZOOM_FIXED, Math.max(3, Math.floor(w / LOGIC_WIDTH)));
  }

  function draw() {
    var zoom = getDisplayZoom();
    state.zoom = zoom;
    var width = LOGIC_WIDTH * zoom;
    var height = LOGIC_HEIGHT * zoom;

    workspaceCanvas.width = width;
    workspaceCanvas.height = height;

    var ctx = workspaceCanvas.getContext('2d');
    ctx.save();
    ctx.scale(zoom, zoom);
    drawToContext(ctx, LOGIC_WIDTH, LOGIC_HEIGHT, false);
    ctx.restore();
    ctx.strokeStyle = CYAN_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40 * zoom, 0);
    ctx.lineTo(40 * zoom, LOGIC_HEIGHT * zoom);
    ctx.stroke();

    if (previewCanvas) {
      previewCanvas.width = LOGIC_WIDTH;
      previewCanvas.height = LOGIC_HEIGHT;
      var prevCtx = previewCanvas.getContext('2d');
      drawToContext(prevCtx, LOGIC_WIDTH, LOGIC_HEIGHT, false);
    }
  }

  bgColorInput.addEventListener('input', function () {
    state.bgColor = bgColorInput.value;
    if (bgColorHexEl) bgColorHexEl.textContent = bgColorInput.value;
    draw();
  });

  scaleRange.addEventListener('input', function () {
    state.imageScale = Number(scaleRange.value) / 100;
    scaleValueEl.textContent = scaleRange.value + '%';
    draw();
  });

  workspaceCanvas.addEventListener('mousedown', function (e) {
    if (!state.image) return;
    state.isDragging = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.dragStartOffsetX = state.offsetX;
    state.dragStartOffsetY = state.offsetY;
  });

  function applyDragDelta(deltaX, deltaY) {
    state.offsetX = state.dragStartOffsetX + deltaX / state.zoom;
    state.offsetY = state.dragStartOffsetY + deltaY / state.zoom;
    draw();
  }

  window.addEventListener('mousemove', function (e) {
    if (!state.isDragging) return;
    applyDragDelta(e.clientX - state.dragStartX, e.clientY - state.dragStartY);
  });

  window.addEventListener('mouseup', function () {
    state.isDragging = false;
  });

  function onTouchStart(e) {
    if (!state.image || e.touches.length !== 1) return;
    e.preventDefault();
    state.isDragging = true;
    state.dragStartX = e.touches[0].clientX;
    state.dragStartY = e.touches[0].clientY;
    state.dragStartOffsetX = state.offsetX;
    state.dragStartOffsetY = state.offsetY;
  }

  function onTouchMove(e) {
    if (!state.isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    var tx = e.touches[0].clientX;
    var ty = e.touches[0].clientY;
    applyDragDelta(tx - state.dragStartX, ty - state.dragStartY);
    state.dragStartOffsetX = state.offsetX;
    state.dragStartOffsetY = state.offsetY;
    state.dragStartX = tx;
    state.dragStartY = ty;
  }

  function onTouchEnd(e) {
    if (e.touches.length === 0) state.isDragging = false;
  }

  function onTouchCancel() {
    state.isDragging = false;
  }

  var touchOpts = { passive: false };
  [workspaceCanvas, canvasWrapper].forEach(function (el) {
    if (!el) return;
    el.addEventListener('touchstart', onTouchStart, touchOpts);
    el.addEventListener('touchmove', onTouchMove, touchOpts);
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });
  });

  window.addEventListener('resize', function () {
    if (state.image) draw();
  });

  function buildOffscreenCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = LOGIC_WIDTH;
    canvas.height = LOGIC_HEIGHT;
    const ctx = canvas.getContext('2d');
    drawToContext(ctx, LOGIC_WIDTH, LOGIC_HEIGHT, false);
    return canvas;
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportAndDownload() {
    if (!state.image) return;
    const main = buildOffscreenCanvas();

    const leftCanvas = document.createElement('canvas');
    leftCanvas.width = CROP_LEFT_WIDTH;
    leftCanvas.height = LOGIC_HEIGHT;
    const leftCtx = leftCanvas.getContext('2d');
    leftCtx.drawImage(main, 0, 0, CROP_LEFT_WIDTH, LOGIC_HEIGHT, 0, 0, CROP_LEFT_WIDTH, LOGIC_HEIGHT);

    const rightCanvas = document.createElement('canvas');
    rightCanvas.width = CROP_RIGHT_WIDTH;
    rightCanvas.height = LOGIC_HEIGHT;
    const rightCtx = rightCanvas.getContext('2d');
    rightCtx.drawImage(main, CROP_LEFT_WIDTH, 0, CROP_RIGHT_WIDTH, LOGIC_HEIGHT, 0, 0, CROP_RIGHT_WIDTH, LOGIC_HEIGHT);

    leftCanvas.toBlob(function (blob) {
      if (blob) downloadBlob(blob, 'logo-izquierdo.png');
    }, 'image/png');

    rightCanvas.toBlob(function (blob) {
      if (blob) downloadBlob(blob, 'logo-derecho.png');
    }, 'image/png');
  }

  downloadBtn.addEventListener('click', exportAndDownload);

  scaleValueEl.textContent = '100%';
})();
