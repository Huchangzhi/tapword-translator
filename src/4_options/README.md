Last updated on: 2026-01-07

# Options Module (`4_options`)

## 📚 Overview

The `4_options` module is responsible for rendering and managing the extension's settings page. This page allows users to configure various aspects of the extension, from general behavior and translation settings to appearance and custom API configurations. The entire page is a single, client-side HTML file that dynamically loads and saves settings using `chrome.storage`.

## 📂 File Structure

```
4_options/
├── modules/
│   └── settingsManager.ts  # Handles loading, saving, and logic for all settings.
├── index.html              # The main HTML structure for the settings page.
├── index.ts                # Entry point script that initializes the page and its event handlers.
└── styles.css              # CSS styles for the settings page UI.
```

## ✨ Core Components

### `index.html` (UI Structure)

This file provides the complete HTML markup for the options page. The layout is divided into several distinct sections, each corresponding to a category of settings:

-   **General:** Master switch, target language, and trigger behavior (icon vs. double-click).
-   **Text:** Font size and spacing adjustments for the translation tooltip.
-   **Audio:** Settings related to text-to-speech pronunciation.
-   **Appearance:** UI theme options, such as icon color.
-   **Custom API:** Configuration for users who want to use their own backend translation provider.

The page uses `data-i18n-key` attributes on various elements to support internationalization.

### `styles.css` (Styling)

This stylesheet defines the visual appearance of the options page. It uses CSS variables for a consistent theme and provides a modern, clean interface for all form controls, navigation elements, and layout containers.

### `index.ts` (Main Logic)

This is the primary script for the options page. Its main responsibilities include:

-   **Initialization:** Kicks off the entire process when the DOM is loaded.
-   **Internationalization:** Calls the `i18n` utility to apply translated strings to the UI.
-   **UI Overrides:** Applies special UI logic for the "Community Edition" of the extension.
-   **Event Handling:** Sets up navigation between sections and initializes the settings listeners from `settingsManager`.
-   **Dynamic Previews:** Manages the interactive tooltip spacing preview to give users immediate feedback on their changes.
-   **Version Display:** Fetches and displays the current extension version from the manifest.

### `modules/settingsManager.ts` (Settings Management)

This is the most critical logic file in the module. It centralizes all interactions with user settings.

-   **Loading & Saving:** It interfaces with `storageManagerModule` to load settings when the page opens and immediately saves any changes made by the user.
-   **State Management:** It handles the logic for enabling or disabling dependent UI controls. For example, if "Enable TapWord" is turned off, all other translation-related controls are disabled.
-   **Community Edition Logic:** It contains specific logic to enforce constraints in the community edition, such as locking the "Use Custom API" and "Auto-play Audio" toggles.
-   **Custom API Validation:** Implements the `validateCustomApiButton` functionality, which triggers a test translation call to the user-provided endpoint to verify their credentials.
