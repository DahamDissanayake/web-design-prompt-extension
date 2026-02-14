document.addEventListener("DOMContentLoaded", () => {
  const startArea = document.getElementById("startArea");
  const inspectorControls = document.getElementById("inspectorControls");
  const groupsContainer = document.getElementById("groupsContainer");
  const startBtn = document.getElementById("startBtn");
  const resetBtn = document.getElementById("resetBtn");
  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const outputArea = document.getElementById("output");
  const groupCountSpan = document.getElementById("groupCount");

  let currentGroups = [];
  let elementInfo = null;

  // Initialize state
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "GET_STATE" },
        (response) => {
          if (chrome.runtime.lastError) {
            // Content script might not be injected or ready
            startArea.style.display = "block";
            inspectorControls.style.display = "none";
            return;
          }

          if (response && response.elementInfo) {
            // Locked state
            elementInfo = response.elementInfo;
            currentGroups = response.groups || [];
            renderInspectorUI();
          } else {
            // Idle state
            startArea.style.display = "block";
            inspectorControls.style.display = "none";
          }
        },
      );
    }
  });

  // Listen for updates from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GROUPS_UPDATED") {
      currentGroups = request.groups;
      renderInspectorUI();
    }
  });

  startBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "ACTIVATE" });
      window.close(); // Close popup to let user interact
    });
  });

  resetBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "RESET" });
      startArea.style.display = "block";
      inspectorControls.style.display = "none";
      currentGroups = [];
      elementInfo = null;
    });
  });

  generateBtn.addEventListener("click", generatePrompt);

  copyBtn.addEventListener("click", () => {
    outputArea.select();
    document.execCommand("copy");
    const originalText = copyBtn.innerText;
    copyBtn.innerText = "Copied!";
    setTimeout(() => (copyBtn.innerText = originalText), 1500);
  });

  function renderInspectorUI() {
    startArea.style.display = "none";
    inspectorControls.style.display = "block";
    groupCountSpan.innerText = currentGroups.length;

    // Clear previous inputs but try to preserve values if re-rendering?
    // Use a map to store current values by label
    const userInputs = {};
    document.querySelectorAll(".group-input").forEach((textarea) => {
      userInputs[textarea.dataset.label] = textarea.value;
    });

    groupsContainer.innerHTML = "";

    currentGroups.forEach((group) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "group-item";

      const header = document.createElement("div");
      header.className = "group-header";
      header.innerHTML = `<span>Group ${group.label}</span> <span>${group.cells.length} blocks</span>`;

      const textarea = document.createElement("textarea");
      textarea.className = "group-input";
      textarea.dataset.label = group.label;
      textarea.rows = 3;
      textarea.placeholder = `Describe issue for Group ${group.label}...`;
      if (userInputs[group.label]) {
        textarea.value = userInputs[group.label];
      }

      groupDiv.appendChild(header);
      groupDiv.appendChild(textarea);
      groupsContainer.appendChild(groupDiv);
    });
  }

  function generatePrompt() {
    if (!elementInfo) return;

    let groupMappings = "";
    let userFeedback = "";

    // Iterate DOM inputs to get user text
    const inputs = document.querySelectorAll(".group-input");
    inputs.forEach((input) => {
      const label = input.dataset.label;
      const text = input.value || "No detailed observation provided.";
      const group = currentGroups.find((g) => g.label === label);

      // Calculate relative position description
      let posDesc = "Center";
      // Simple heuristic based on average row/col vs grid size
      // (This requires grid dimensions which we might not have explicitly here,
      // but we can infer or pass from content script. For now, specific coords or simplfied logic)

      // Let's use simplified logic if we don't have grid dims:
      // We can just estimate standard quadrants based on cell indices if we knew grid size.
      // Since we don't have grid dims in `elementInfo`, let's just use "Specific Area".
      // Or better, update content.js to send grid dims.
      // User prompt example says "Top-Left" or "Center".
      // I'll stick to a generic "Located at generated coordinates" or similar if logic is complex,
      // but let's try to be smart. R and C are available.

      // But for robustness, let's keep it simple for now or fetch bounds.
      // Let's assume (0,0) is top left.
      let avgR = 0,
        avgC = 0;
      group.cells.forEach((c) => {
        avgR += c.r;
        avgC += c.c;
      });
      avgR /= group.cells.length;
      avgC /= group.cells.length;

      posDesc = `Row ${Math.round(avgR)}, Col ${Math.round(avgC)}`;

      groupMappings += `- **Group ${label}:** Consists of ${group.cells.length} blocks. Located roughly at [${posDesc}].\n`;

      userFeedback += `### Group ${label}\n**User Observation:** ${text}\n**Requirement:** Please adjust the layout in this specific area to resolve the friction described above.\n\n`;
    });

    const prompt = `## VibeCheck Context
**Selected Element:** ${elementInfo.tagName} (Class: ${elementInfo.className}, ID: ${elementInfo.id})
**Dimensions:** ${elementInfo.width}px x ${elementInfo.height}px

## Spatial Mapping
I have identified ${currentGroups.length} distinct problem areas on this element based on a 50px grid overlay:
${groupMappings}
## User Feedback & Requirements
${userFeedback}## Execution Plan
Re-write the CSS/HTML for this section to accommodate these specific spatial groupings while maintaining the overall design integrity.`;

    outputArea.value = prompt;
  }
});
