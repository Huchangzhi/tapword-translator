Last updated on: 2026-02-09

# 1_content: Content Script Module

## Module Overview

This module is the core of the extension that runs on web pages. It is responsible for detecting user text selections, handling user interactions (clicks, double-clicks), managing the UI overlay (translation icon, floating cards, modals), and coordinating the translation process with the background script.

## File Structure

```
1_content/
├── README.md                       # This document
├── index.ts                        # Main entry point, initializes listeners and settings
├── constants/
│   ├── index.ts                    # Module constants exports
│   ├── cssClasses.ts               # CSS class names for UI elements
│   └── iconColors.ts               # Color definitions for the translation icon
├── handlers/
│   ├── InputListener.ts            # Captures DOM events (click, selection) and triggers pipeline
│   ├── TranslationPipeline.ts      # Orchestrates the translation flow (validation, batching, API calls)
│   └── utils/                      # Handler-specific utilities
│       ├── editableElementDetector.ts # Detects if interaction is within an editable field
│       ├── rangeAdjuster.ts        # Trims and expands selection ranges
│       ├── rangeSplitter.ts        # Splits ranges by block elements
│       ├── selectionClassifier.ts  # Classifies selection (word vs fragment)
│       ├── selectionValidator.ts   # Validates if a selection is suitable for translation
│       ├── tapWordDetector.ts      # Identifies word boundaries from point coordinates
│       └── translationOverlapDetector.ts # Detects overlapping translation anchors
├── resources/                      # Static resources (HTML templates, CSS)
│   ├── content.css                 # CSS for the translation icon and display card
│   ├── modal.css                   # CSS for the translation modal
│   └── ...                         # Various HTML templates for modal states
├── services/
│   └── translationRequest.ts       # Communicates with the background script for translation APIs
├── ui/
│   ├── iconManager.ts              # Manages the translation icon's lifecycle
│   ├── modalTemplates.ts           # Loads and renders HTML templates for the modal
│   ├── toastNotification.ts        # Displays temporary feedback messages (toasts)
│   ├── translationDisplay.ts       # Renders translation results (anchors, tooltips)
│   └── translationModal.ts         # Manages the detailed translation modal
└── utils/
    ├── concurrencyLimiter.ts       # Queues and limits parallel translation requests
    ├── contextExtractorV2.ts       # Extracts sentence-level context around the selection
    ├── domSanitizer.ts             # Cleans DOM selections from extension's UI elements
    ├── languageDetector.ts         # Detects the source language of text
    ├── languageValidator.ts        # Determines if translation is needed (native speaker logic)
    ├── lineHeightAdjuster.ts       # Dynamically adjusts line-height for tooltips
    ├── modalPositioner.ts          # Calculates optimal position for the translation modal
    ├── styleCalculator.ts          # Calculates tooltip styles based on context
    └── versionStatus.ts            # Caches version check results from background
```

## Core Components

### 1. Entry Point (`index.ts`)

- **`index.ts`**: Initializes the content script. It loads user settings, applies dynamic styles, and registers global event listeners that delegate to `InputListener`.

### 2. Event Handling & Pipeline (`handlers/`)

- **`InputListener.ts`**: The first responder to DOM events. It handles:
  - `handleTextSelection`: Shows the translation icon for manual selections.
  - `handleSingleClick`: Triggers word translation when clicking a word (if enabled).
  - `handleDoubleClick`: Triggers direct translation for the selected text.
  - Validates interactions to ignore editable areas or the extension's own UI.

- **`TranslationPipeline.ts`**: The brain of the translation process. It:
  - Receives a `Range` from the listener.
  - Sanitizes the input and detects the source language.
  - Determines the translation strategy (Word vs. Fragment) based on language type (CJK vs. Space-delimited).
  - Manages concurrency using `concurrencyLimiter`.
  - Splits ranges that cross block boundaries using `rangeSplitter`.
  - Calls `translationRequest` to fetch data and `translationDisplay` to show results.

### 3. UI Management (`ui/`)

- **`translationDisplay.ts`**: Responsible for the "inline" translation experience. It wraps the translated text in a styled anchor and displays the floating tooltip with the result. It handles loading, success, and error states.
- **`translationModal.ts`**: Manages the detailed view. When a user clicks a translation anchor, this opens a modal with full definitions, sentence context, and extra options (TTS, delete).
- **`iconManager.ts`**: Controls the small floating icon that appears near a selection, allowing the user to trigger translation manually.
- **`toastNotification.ts`**: A utility to show brief, auto-dismissing feedback messages (e.g., "Copied to clipboard", "Error").
- **`modalTemplates.ts`**: Handles the loading and injection of raw HTML templates for the modal, keeping view logic separate from state.

### 4. Utilities (`utils/` & `handlers/utils/`)

- **`contextExtractorV2.ts`**: Analyzes the DOM to extract the full sentence containing the selection, plus surrounding sentences. This context is crucial for AI translation accuracy.
- **`languageValidator.ts`**: Implements "Native Speaker Suppression." It checks if the selected text matches the user's target language (e.g., a Chinese user selecting Chinese text) to avoid unnecessary translations.
- **`concurrencyLimiter.ts`**: Ensures the extension doesn't overwhelm the backend or browser by limiting the number of simultaneous translation requests (default: 3).
- **`versionStatus.ts`**: Caches the extension's version status to reduce communication overhead with the background script during UI updates.
- **`domSanitizer.ts`**: Ensures text extraction ignores the extension's own UI elements (tooltips, icons) to prevent "pollution" of the source text.

### 5. Backend Communication (`services/`)

- **`translationRequest.ts`**: specific functions (`requestTranslation`, `requestFragmentTranslation`) that package the text and context, then send them to the background script via Chrome runtime messaging.