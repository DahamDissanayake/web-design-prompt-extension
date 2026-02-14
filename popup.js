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
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "ACTIVATE" },
          (response) => {
            if (chrome.runtime.lastError) {
              // Suppress error if content script is not ready
              console.warn(
                "Content script not ready:",
                chrome.runtime.lastError.message,
              );
            }
          },
        );
        window.close(); // Close popup to let user interact
      }
    });
  });

  resetBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "RESET" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "Content script not ready:",
              chrome.runtime.lastError.message,
            );
          }
        });
      }
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
    const cellSize = elementInfo.cellSize || 50;

    inputs.forEach((input) => {
      const label = input.dataset.label;
      const text = input.value || "No detailed observation provided.";
      const group = currentGroups.find((g) => g.label === label);

      if (group && group.cells.length > 0) {
        // Calculate Bounding Box
        let minR = Infinity,
          maxR = -Infinity;
        let minC = Infinity,
          maxC = -Infinity;

        group.cells.forEach((c) => {
          if (c.r < minR) minR = c.r;
          if (c.r > maxR) maxR = c.r;
          if (c.c < minC) minC = c.c;
          if (c.c > maxC) maxC = c.c;
        });

        // Calculate pixel dimensions relative to the element
        const top = minR * cellSize;
        const left = minC * cellSize;
        const width = (maxC - minC + 1) * cellSize;
        const height = (maxR - minR + 1) * cellSize;

        // Bounding Box Description
        const boundingBoxDesc = `Top: ${top}px, Left: ${left}px, Width: ${width}px, Height: ${height}px`;

        groupMappings += `- **Group ${label}:** Pixel Bounding Box: [${boundingBoxDesc}]. Covers grid rows ${minR}-${maxR} and cols ${minC}-${maxC}.\n`;

        userFeedback += `### Group ${label} (Target Area)\n`;
        userFeedback += `**User Observation:** ${text}\n`;
        userFeedback += `**Precise Location:** The user selected area is defined by: ${boundingBoxDesc}.\n`;
        userFeedback += `**STRICT REQUIREMENT:** Any content moved or generated for this group MUST be resized and styled to fit EXACTLY within this ${width}px x ${height}px area. Do not overflow. Adjust font-sizes, image sizes, and padding to fit.\n\n`;
      }
    });

    // Build the "Before" Code section
    const codeContext = `
### 1. The "Before" Code (Current State)
**Context:** The user is working on an existing component.
- **HTML Snippet:**
\`\`\`html
${elementInfo.outerHTML}
\`\`\`
- **Computed Styles:**
  - Display: ${elementInfo.computedStyles.display}
  - Font: ${elementInfo.computedStyles.fontFamily} (${elementInfo.computedStyles.fontSize})
  - Colors: ${elementInfo.computedStyles.color} (Text), ${elementInfo.computedStyles.backgroundColor} (Background)
  - Layout: Position ${elementInfo.computedStyles.position}, Grid: ${elementInfo.computedStyles.gridTemplateColumns || "N/A"}, Flex: ${elementInfo.computedStyles.flexDirection || "N/A"}

### 2. Content Breakdown
- **Text Length:** ${elementInfo.contentSummary.textLength} chars
- **Images:** ${elementInfo.contentSummary.imageCount} images present
- **Sample Text:** "${elementInfo.contentSummary.sampleText}..."

### 3. Layout Context (Parent Relationship)
- **Parent Element:** <${elementInfo.parent.tagName}> (ID: ${elementInfo.parent.id || "N/A"}, Class: ${elementInfo.parent.className || "N/A"})
- **Parent Display:** ${elementInfo.parent.display}
`;

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

${codeContext}

## Spatial Analysis (Problem Areas)
I have identified ${currentGroups.length} distinct problem groups on this element:
${groupMappings}
## User Feedback & Requirements
${userFeedback}

## Execution Plan
Generate the corrected HTML/CSS.

**CRITICAL INSTRUCTIONS:**
1. **EXACT FIT:** For each Group, you are provided a **Pixel Bounding Box** (Top, Left, Width, Height). You MUST ensure the content for that group fits entirely within those dimensions.
2. **RESIZE CONTENT:** If the user asks to "Move X to Group A", you must explicitly write CSS to resize X (e.g., \`width: 100%; height: 100%; object-fit: contain\`) so it fits the bounding box.
3. **NO OVERFLOW:** The modified layout must NOT exceed the original element dimensions (${elementInfo.width}px x ${elementInfo.height}px).
4. **Reshape:** If the aspect ratio of the content differs from the bounding box, use CSS grid or flexbox to center/stretch it appropriately as per the bounding box shape.`;

    outputArea.value = prompt;
  }
});
