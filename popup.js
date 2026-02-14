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
    const aspectRatio = (elementInfo.width / elementInfo.height).toFixed(2);

    // Iterate DOM inputs to get user text
    const inputs = document.querySelectorAll(".group-input");
    inputs.forEach((input) => {
      const label = input.dataset.label;
      const text = input.value || "No detailed observation provided.";
      const group = currentGroups.find((g) => g.label === label);

      let avgR = 0,
        avgC = 0;
      group.cells.forEach((c) => {
        avgR += c.r;
        avgC += c.c;
      });
      avgR /= group.cells.length;
      avgC /= group.cells.length;

      // Calculate approximate pixel coordinates relative to element
      const approxX = Math.round(avgC * 50);
      const approxY = Math.round(avgR * 50);

      const posDesc = `Grid Row ~${Math.round(avgR)}, Col ~${Math.round(avgC)} (Approx. ${approxX}px from left, ${approxY}px from top)`;

      groupMappings += `- **Group ${label}:** Consists of ${group.cells.length} cells. Centered at: ${posDesc}.\n`;

      userFeedback += `### Group ${label}\n**User Observation:** ${text}\n**Requirement:** Adjust the layout in this specific area to resolve the friction described above.\n\n`;
    });

    const prompt = `## Role & Objective
You are an expert Frontend Developer and UI/UX Designer. The user is "vibe coding" — visually debugging a web layout by selecting specific problem areas on a grid overlay.
Your goal is to **re-write the HTML/CSS** for the selected section to fix the described issues while maintaining the overall design integrity.

## Technical Context
**Viewport Size:** ${elementInfo.windowWidth}px width x ${elementInfo.windowHeight}px height
**Selected Element:** ${elementInfo.tagName} (ID: "${elementInfo.id}", Class: "${elementInfo.className}")
**Element Dimensions:** ${elementInfo.width}px width x ${elementInfo.height}px height
**Aspect Ratio:** ${aspectRatio}
**Grid System:** The user has identified problem areas using a granular **50px x 50px grid overlay**.
- **Red Squares:** Indicate technical or visual friction points.
- **Groupings:** Adjacent red squares are grouped (A, B, C...) to denote specific layout zones.

## Spatial Analysis (Problem Areas)
I have identified ${currentGroups.length} distinct problem groups on this element:
${groupMappings}
## User Feedback & Requirements
${userFeedback}## Execution Plan
Based on the spatial data and user feedback above, please generate the corrected code (HTML/CSS) to improve the layout organization. Ensure the new layout fits within the specified dimensions and responds correctly to the aspect ratio.`;

    outputArea.value = prompt;
  }
});
