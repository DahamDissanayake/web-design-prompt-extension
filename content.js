// State variables
let isSelecting = false;
let lockedElement = null;
let overlay = null;
let gridCells = []; // 2D array or flat list with coordinates
let groups = [];
let debugMode = false;

// Styles for the inspector
const styles = `
  .vibe-check-highlight {
    outline: 2px solid blue !important;
    cursor: crosshair !important;
  }
  .vibe-check-overlay {
    position: absolute;
    z-index: 999999;
    backdrop-filter: blur(4px);
    background: rgba(0, 0, 255, 0.1);
    display: grid;
    /* Grid layout will be set dynamically */
  }
  .vibe-check-cell {
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: background 0.1s;
  }
  .vibe-check-cell:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  .vibe-check-cell.selected {
    background: rgba(255, 0, 0, 0.5) !important;
  }
  .vibe-check-label {
    position: absolute;
    color: darkred;
    font-weight: bold;
    font-size: 24px;
    background: rgba(255, 255, 255, 0.8);
    padding: 2px 8px;
    border-radius: 4px;
    pointer-events: none;
    transform: translate(-50%, -50%);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Messaging listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ACTIVATE") {
    isSelecting = true;
    startInspector();
    sendResponse({ status: "active" });
  } else if (request.action === "RESET") {
    resetInspector();
    sendResponse({ status: "reset" });
  } else if (request.action === "GET_STATE") {
    sendResponse({
      groups: groups,
      elementInfo: lockedElement
        ? {
            tagName: lockedElement.tagName,
            id: lockedElement.id,
            className: lockedElement.className,
            width: lockedElement.offsetWidth,
            height: lockedElement.offsetHeight,
          }
        : null,
    });
  }
});

function startInspector() {
  document.addEventListener("mouseover", handleHover);
  document.addEventListener("click", handleClick, { capture: true });
}

function stopInspector() {
  document.removeEventListener("mouseover", handleHover);
  document.removeEventListener("click", handleClick, { capture: true });
}

function resetInspector() {
  isSelecting = false;
  stopInspector();
  if (lockedElement) {
    lockedElement.classList.remove("vibe-check-highlight");
    lockedElement = null;
  }
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  gridCells = [];
  groups = [];
}

function handleHover(e) {
  if (!isSelecting || lockedElement) return;

  // Remove highlight from previous
  const prev = document.querySelector(".vibe-check-highlight");
  if (prev) prev.classList.remove("vibe-check-highlight");

  e.target.classList.add("vibe-check-highlight");
}

function handleClick(e) {
  if (!isSelecting || lockedElement) return;

  e.preventDefault();
  e.stopPropagation();

  // Lock the element
  lockedElement = e.target;
  lockedElement.classList.remove("vibe-check-highlight"); // Remove outline, overlay covers it
  isSelecting = false; // Stop selecting
  stopInspector(); // Stop listeners

  createOverlay(lockedElement);
}

function createOverlay(element) {
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  overlay = document.createElement("div");
  overlay.className = "vibe-check-overlay";
  overlay.style.top = rect.top + scrollTop + "px";
  overlay.style.left = rect.left + scrollLeft + "px";
  overlay.style.width = rect.width + "px";
  overlay.style.height = rect.height + "px";

  // Grid config
  const cellSize = 50;
  const cols = Math.ceil(rect.width / cellSize);
  const rows = Math.ceil(rect.height / cellSize);

  overlay.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  overlay.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  gridCells = [];

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "vibe-check-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener("click", () => toggleCell(r, c, cell));
      overlay.appendChild(cell);
      row.push({ selected: false, element: cell, row: r, col: c });
    }
    gridCells.push(row);
  }

  document.body.appendChild(overlay);
}

function toggleCell(r, c, cellElement) {
  const cell = gridCells[r][c];
  cell.selected = !cell.selected;

  if (cell.selected) {
    cellElement.classList.add("selected");
  } else {
    cellElement.classList.remove("selected");
  }

  updateGroups();
}

function updateGroups() {
  // Remove old labels
  const oldLabels = overlay.querySelectorAll(".vibe-check-label");
  oldLabels.forEach((l) => l.remove());

  // Run CCL (Connected Component Labeling)
  const rows = gridCells.length;
  const cols = gridCells[0].length;
  const visited = new Set();
  const newGroups = [];
  let groupLabelIndex = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (gridCells[r][c].selected && !visited.has(`${r},${c}`)) {
        // Start Flood Fill
        const group = [];
        const queue = [[r, c]];
        visited.add(`${r},${c}`);

        while (queue.length > 0) {
          const [currR, currC] = queue.shift();
          group.push({ r: currR, c: currC });

          // Neighbors (Orthogonal)
          const neighbors = [
            [currR - 1, currC],
            [currR + 1, currC],
            [currR, currC - 1],
            [currR, currC + 1],
          ];

          for (const [nR, nC] of neighbors) {
            if (
              nR >= 0 &&
              nR < rows &&
              nC >= 0 &&
              nC < cols &&
              gridCells[nR][nC].selected &&
              !visited.has(`${nR},${nC}`)
            ) {
              visited.add(`${nR},${nC}`);
              queue.push([nR, nC]);
            }
          }
        }

        // Assign Label
        const label = String.fromCharCode(65 + groupLabelIndex); // A, B, C...
        newGroups.push({ label, cells: group });
        groupLabelIndex++;
      }
    }
  }

  groups = newGroups;

  // Render Labels
  groups.forEach((g) => {
    // Calculate visualization center (centroid)
    let sumR = 0,
      sumC = 0;
    g.cells.forEach((cell) => {
      sumR += cell.r;
      sumC += cell.c;
    });

    const avgR = sumR / g.cells.length;
    const avgC = sumC / g.cells.length;

    // Position relative to overlay
    const cellH = overlay.offsetHeight / rows;
    const cellW = overlay.offsetWidth / cols;

    // Center of the target cell area
    const top = avgR * cellH + cellH / 2;
    const left = avgC * cellW + cellW / 2;

    const labelEl = document.createElement("div");
    labelEl.className = "vibe-check-label";
    labelEl.innerText = g.label;
    labelEl.style.top = top + "px";
    labelEl.style.left = left + "px";

    overlay.appendChild(labelEl);
  });

  // Notify Popup if it's listening (optional, but good practice)
  chrome.runtime
    .sendMessage({ action: "GROUPS_UPDATED", groups: groups })
    .catch(() => {});
}
