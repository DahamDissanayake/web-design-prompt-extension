# VibeCheck Layout Assistant

**VibeCheck Layout Assistant** is a professional Chrome Extension designed to streamline the "vibe coding" process. It enables developers and designers to visually debug web layouts by selecting elements, applying a precision grid overlay, identifying friction points, and automatically generating structured implementation prompts.

## Features

- **Interactive Inspector**: Precision element selection with visual highlighting.
- **Grid Overlay System**: Locks onto elements to generate a 50px reference grid.
- **Friction Point Detection**: Clickable grid cells to explicitly mark areas requiring adjustment.
- **Algorithmic Grouping**: Uses Connected-Component Labeling (CCL) to automatically group adjacent markers into distinct zones (A, B, C...).
- **Structured Prompt Generation**: synthesizing spatial data and user observations into context-aware prompts for AI coding assistants.
- **Lightweight Architecture**: Built with Vanilla JavaScript and CSS (Manifest V3) for zero-dependency performance.

## Installation

1.  **Clone or Download** this repository.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** in the top-right corner.
4.  Click **Load unpacked**.
5.  Select the project directory (containing `manifest.json`).
6.  The extension icon will appear in your toolbar.

## Usage Guide

1.  **Activate Inspector**: Click the extension icon and select **Start Inspector**.
2.  **Select Element**: Hover to highlight and click to lock the target element.
3.  **Identify Issues**: Click grid cells to mark areas of concern. The system groups them automatically.
4.  **Annotate**: Open the popup to view detected groups and add specific observations.
5.  **Generate Prompt**: Click **Generate Fix Prompt** to build a detailed engineering request.
6.  **Execute**: Copy the prompt to your clipboard and use it with your preferred coding tool.

## Technical Details

- **Platform**: Chrome Extension Manifest V3
- **Stack**: JavaScript (ES6+), HTML5, CSS3
- **Theme**: Professional Monochrome (Inter/System Font Stack)

## License

This project is open-source and available for personal and commercial use.

---

Built by [DAMA](https://github.com/DahamDissanayake/web-design-prompt-extension)
