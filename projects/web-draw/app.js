const canvas = document.getElementById("drawingCanvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const colorInput = document.getElementById("brushColor");
const sizeInput = document.getElementById("brushSize");
const sizeValue = document.getElementById("brushSizeValue");
const statusMessage = document.getElementById("drawingStatus");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const canvasFrame = document.querySelector(".canvas-frame");
const history = [];
const redoHistory = [];
const maxHistory = 10;
const minZoom = 25;
const maxZoom = 300;

let tool = "pencil";
let zoom = 100;
let drawing = false;
let startPoint = null;
let previousPoint = null;
let activeSnapshot = null;
let shapeSnapshot = null;

function getPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * canvas.width / bounds.width,
    y: (event.clientY - bounds.top) * canvas.height / bounds.height
  };
}

function updateHistoryControls() {
  undoButton.disabled = history.length === 0;
  redoButton.disabled = redoHistory.length === 0;
}

function trimHistory() {
  while (history.length + redoHistory.length > maxHistory) {
    if (history.length > redoHistory.length) history.shift();
    else redoHistory.shift();
  }
}

function saveHistory() {
  const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
  history.push(snapshot);
  redoHistory.length = 0;
  trimHistory();
  updateHistoryControls();
  return snapshot;
}

function restoreSnapshot(snapshot) {
  if (snapshot) context.putImageData(snapshot, 0, 0);
}

function setStrokeStyle() {
  const zoomScale = zoom / 100;
  context.lineWidth = Number(sizeInput.value) * canvas.width / (canvas.getBoundingClientRect().width / zoomScale);
  context.strokeStyle = tool === "eraser" ? "rgba(0, 0, 0, 1)" : colorInput.value;
  context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
  context.lineCap = "round";
  context.lineJoin = "round";
}

function drawShape(from, to) {
  setStrokeStyle();
  context.beginPath();
  if (tool === "line") {
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
  } else if (tool === "rectangle") {
    context.rect(from.x, from.y, to.x - from.x, to.y - from.y);
  } else if (tool === "ellipse") {
    const centerX = (from.x + to.x) / 2;
    const centerY = (from.y + to.y) / 2;
    context.ellipse(centerX, centerY, Math.max(.5, Math.abs(to.x - from.x) / 2), Math.max(.5, Math.abs(to.y - from.y) / 2), 0, 0, Math.PI * 2);
  }
  context.stroke();
  context.globalCompositeOperation = "source-over";
}

function drawDot(point) {
  setStrokeStyle();
  context.beginPath();
  context.arc(point.x, point.y, context.lineWidth / 2, 0, Math.PI * 2);
  context.fillStyle = context.strokeStyle;
  context.fill();
  context.globalCompositeOperation = "source-over";
}

function selectTool(nextTool) {
  tool = nextTool;
  document.querySelectorAll(".tool-button").forEach((button) => {
    const selected = button.dataset.tool === tool;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  canvas.style.cursor = tool === "eraser" ? "cell" : "crosshair";
  statusMessage.textContent = `${tool[0].toUpperCase()}${tool.slice(1)} selected`;
}

document.querySelectorAll(".tool-button").forEach((button) => {
  button.addEventListener("click", () => selectTool(button.dataset.tool));
});

sizeInput.addEventListener("input", () => {
  sizeValue.value = `${sizeInput.value} px`;
  sizeValue.textContent = `${sizeInput.value} px`;
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.pointerType === "mouse") return;
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  drawing = true;
  startPoint = getPoint(event);
  previousPoint = startPoint;
  activeSnapshot = saveHistory();
  shapeSnapshot = ["line", "rectangle", "ellipse"].includes(tool) ? activeSnapshot : null;
  if (tool === "pencil" || tool === "eraser") drawDot(startPoint);
});

canvas.addEventListener("pointermove", (event) => {
  if (!drawing) return;
  const point = getPoint(event);
  if (shapeSnapshot) {
    restoreSnapshot(shapeSnapshot);
    drawShape(startPoint, point);
  } else if (tool === "pencil" || tool === "eraser") {
    setStrokeStyle();
    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.globalCompositeOperation = "source-over";
  }
  previousPoint = point;
});

function finishDrawing() {
  if (!drawing) return;
  drawing = false;
  activeSnapshot = null;
  shapeSnapshot = null;
  startPoint = null;
  previousPoint = null;
  statusMessage.textContent = "Drawing updated";
}

canvas.addEventListener("pointerup", finishDrawing);
canvas.addEventListener("pointercancel", () => {
  restoreSnapshot(activeSnapshot);
  if (drawing && history.length) history.pop();
  updateHistoryControls();
  finishDrawing();
});

undoButton.addEventListener("click", () => {
  const previous = history.pop();
  if (!previous) return;
  redoHistory.push(context.getImageData(0, 0, canvas.width, canvas.height));
  restoreSnapshot(previous);
  trimHistory();
  updateHistoryControls();
  statusMessage.textContent = "Last action undone";
});

redoButton.addEventListener("click", () => {
  const next = redoHistory.pop();
  if (!next) return;
  history.push(context.getImageData(0, 0, canvas.width, canvas.height));
  restoreSnapshot(next);
  trimHistory();
  updateHistoryControls();
  statusMessage.textContent = "Last action restored";
});

function setZoom(nextZoom) {
  zoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));
  canvas.style.width = `${zoom}%`;
  document.getElementById("zoomLevel").value = `${zoom}%`;
  document.getElementById("zoomLevel").textContent = `${zoom}%`;
  document.getElementById("zoomOutButton").disabled = zoom === minZoom;
  document.getElementById("zoomInButton").disabled = zoom === maxZoom;
}

document.getElementById("zoomOutButton").addEventListener("click", () => setZoom(zoom - 25));
document.getElementById("zoomInButton").addEventListener("click", () => setZoom(zoom + 25));
document.getElementById("resetViewButton").addEventListener("click", () => {
  setZoom(100);
  canvasFrame.scrollTo({ top: 0, left: 0 });
  statusMessage.textContent = "Default view restored";
});

document.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
  const key = event.key.toLowerCase();
  if (key === "z" && event.shiftKey) {
    event.preventDefault();
    redoButton.click();
  } else if (key === "z") {
    event.preventDefault();
    undoButton.click();
  } else if (key === "y") {
    event.preventDefault();
    redoButton.click();
  }
});

document.getElementById("clearButton").addEventListener("click", () => {
  saveHistory();
  context.clearRect(0, 0, canvas.width, canvas.height);
  updateHistoryControls();
  statusMessage.textContent = "Canvas cleared";
});

document.getElementById("exportButton").addEventListener("click", () => {
  const format = document.getElementById("exportFormat").value;
  const mimeType = `image/${format}`;
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const exportContext = exportCanvas.getContext("2d");
  if (format === "jpeg") {
    exportContext.fillStyle = "#ffffff";
    exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  }
  exportContext.drawImage(canvas, 0, 0);
  exportCanvas.toBlob((blob) => {
    if (!blob) {
      statusMessage.textContent = `Could not export as ${format.toUpperCase()}`;
      return;
    }
    if (blob.type !== mimeType) {
      statusMessage.textContent = `${format.toUpperCase()} export is not supported by this browser`;
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `drawing.${format}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusMessage.textContent = `Downloaded drawing.${format}`;
  }, mimeType);
});

setZoom(100);
