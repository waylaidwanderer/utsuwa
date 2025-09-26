<p align="center">
  <img src="./public/utsuwa-hero.svg" alt="Utsuwa - a window to your agents." width="800" />
</p>

# Utsuwa

Utsuwa (器), from the Japanese word for "vessel," is the official web client for the [Sumika](https://github.com/waylaidwanderer/sumika) API server. It provides a polished, intuitive user interface for managing workspaces and interacting with stateful, multi-session AI agents.

## Features

-   **Workspace Management**: Create, rename, pin, and delete workspaces.
-   **Session Management**: Start new chat sessions, view history, and resume disconnected sessions.
-   **Real-time Interaction**: Live streaming of agent responses, including thoughts and tool calls.
-   **Tool Call Support**: UI for granting or denying agent tool-use permissions.
-   **Dark Mode**: Supports light, dark, and system themes.

## Quick Start

The easiest way to run Utsuwa is with `npx`. This command will download the latest versions, automatically start the Sumika server in the background, and open the Utsuwa web UI in your browser.

```bash
npx @waylaidwanderer/utsuwa
```

That's it! The application will be running at `http://localhost:3000`.

## For Developers

If you want to contribute to the project, you'll need to run both the `sumika` backend and the `utsuwa` frontend from their separate repositories.

### Prerequisites

-   Node.js
-   pnpm

### Installation & Running

**1. Run the Sumika Backend**

In a new terminal, clone and run the `sumika` server:

```bash
git clone https://github.com/waylaidwanderer/sumika.git
cd sumika
pnpm install
pnpm dev
```

The API server will be running at `http://localhost:8787`.

**2. Run the Utsuwa Frontend**

In a second terminal, clone and run the `utsuwa` UI:

```bash
# In a new terminal
git clone https://github.com/waylaidwanderer/utsuwa.git
cd utsuwa
pnpm install
pnpm dev
```

The Utsuwa web client will be available at `http://localhost:5173`. It is pre-configured to proxy API requests to the Sumika server running on port `8787`.

## Project Scripts

*The following scripts should be run from within the `utsuwa` directory.*

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
pnpm test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
pnpm test:e2e
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```