Last updated on: 2026-02-12

# 2_background: Background Service Worker Module

## Module Overview

This module runs as the extension background service worker. It is responsible for cross-context orchestration, including message routing, settings/bootstrap responses for UI pages, translation/speech request handling, and centralized integration with backend APIs.

## File Structure

```
2_background/
├── README.md
├── index.ts
├── handlers/
├── messaging/
└── services/
```

## Core Responsibilities

### 1. Entry and Lifecycle (`index.ts`)

- Initializes background listeners when the service worker starts.
- Registers runtime message handlers for popup, content scripts, and options pages.
- Coordinates startup tasks that should be centralized in background context.

### 2. Message Routing (`messaging/`)

- Defines message contracts and dispatch logic for requests coming from UI/content contexts.
- Ensures each message type is handled in one place to keep contracts explicit and maintainable.

### 3. Request Handlers (`handlers/`)

- Implements concrete handler flows for translation, speech synthesis, and bootstrap/config requests.
- Validates incoming payload shape and returns structured success/error responses.

### 4. Infrastructure Services (`services/`)

- Encapsulates network-facing and external integrations used by handlers.
- Keeps transport and API details out of message router/handler layers.

## Design Notes

- Keep background code focused on orchestration and infrastructure, not content-script UI logic.
- Prefer strict message typing and explicit branching by message `type`.
- Keep side effects centralized in handlers/services so lifecycle logic remains predictable.