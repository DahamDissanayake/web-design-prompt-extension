# VibeCheck Layout Assistant

**VibeCheck Layout Assistant** is a powerful Chrome Extension designed to help developers and designers "vibe code" by debugging web layouts visually. It allows you to select page elements, overlay a grid, identify specific problem areas, and automatically generate structured prompts to fix design issues.

## Features

- **🎯 Interactive Inspector**: Hover over any element on a webpage to highlight it.
- **🔒 Grid Overlay**: Lock onto an element to generate a 50px precision grid.
- **🔴 Problem Area Detection**: Click grid cells to mark areas that need adjustment.
- **🤖 Smart Grouping**: Automatically groups adjacent selected cells (Connected-Component Labeling) and assigns them unique labels (A, B, C...).
- **📝 Structured Prompt Generation**: Generates detailed, context-aware prompts for fixing layout issues, ready to copy and paste into your favorite coding assistant.
- **⚡ Vanilla Implementation**: Built with pure JavaScript, HTML, and CSS (Manifest V3) - no heavy frameworks or dependencies.

## Installation

1.  **Clone or Download** this repository to your local machine.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** by toggling the switch in the top-right corner.
4.  Click the **Load unpacked** button.
5.  Select the directory where you saved this project (the folder containing `manifest.json`).
6.  The **VibeCheck Layout Assistant** icon should appear in your extensions toolbar.

## Usage Guide

1.  **Activate the Inspector**:
    - Click the extension icon in your toolbar.
    - Click the **"Start Inspector"** button in the popup.

2.  **Select an Element**:
    - Hover over any element on the page. You will see a blue outline.
    - **Click** to lock your selection and generate the grid overlay.

3.  **Mark Problem Areas**:
    - Click on the grid cells (50x50px) that correspond to the layout issue you want to fix.
    - Cells will turn **red** when selected.
    - The extension automatically groups touching cells and labels them (Group A, Group B, etc.).

4.  **Describe Issues**:
    - Open the extension popup again (click the icon).
    - You will see a list of detected groups (e.g., "Group A").
    - Enter a brief description of the issue for each group (e.g., "Too much padding here", "Misaligned text").

5.  **Generate Prompt**:
    - Click **"Generate Prompt"**.
    - The extension will build a detailed prompt containing:
      - Element details (Tag, ID, Class, Dimensions).
      - Spatial mapping of problem areas.
      - Your specific user feedback.
    - Click **"Copy to Clipboard"** and use it to fix your code!

## Project Structure

- `manifest.json`: Extension configuration (Manifest V3).
- `content.js`: Handles element selection, grid overlay, and grouping logic.
- `popup.html`: The user interface for the extension popup.
- `popup.js`: Logic for the popup, including state management and prompt generation.
- `styles.css`: Styling for the popup UI.

## Technologies Used

- **Manifest V3**: The latest Chrome Extension platform version.
- **JavaScript (ES6+)**: Core logic.
- **CSS3**: Styling and Grid layout.
- **HTML5**: Structure.

## License

This project is open-source and available for personal and commercial use.
