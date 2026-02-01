# 9_offscreen: Offscreen Document

This module provides an offscreen document environment for the extension.

## Purpose

Web extensions (Manifest V3) have limitations on what they can do in background service workers (which don't have a DOM) and content scripts (which are subject to the host page's Content Security Policy).

The Offscreen Document provides a hidden HTML page that:
1.  **Has a DOM**: Can parse HTML, use `Audio` APIs, etc.
2.  **Has Independent CSP**: Is not restricted by the security policy of the webpage the user is visiting.

## Primary Use Cases

-   **Audio Playback**: Playing text-to-speech audio (blob/base64) without being blocked by sites like GitHub.
-   **DOM Parser**: (Future use) Parsing HTML strings if needed by the background script.

## Structure

-   `offscreen.html`: The minimal HTML entry point.
-   `offscreen.ts`: The script that listens for messages from the background service worker and executes tasks (like playing audio).
