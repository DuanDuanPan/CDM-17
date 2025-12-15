# Project Overview

This is a mind-map driven collaborative R&D platform, designed to be a single source of truth for projects, from ideation to delivery. It's a monorepo using `pnpm` and `turbo`.

The core technologies are:

*   **Frontend:** React (with Vite) and Tailwind CSS.
*   **Backend:** Fastify (a Node.js framework).
*   **Language:** TypeScript.
*   **Testing:** Playwright for end-to-end testing.

The architecture is plugin-based, with a core server and client, and a default set of plugins. The goal is to provide a highly performant and secure collaborative environment for complex projects.

# Building and Running

To get started with the project, you'll need to have `pnpm` installed.

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Run the development servers:**

    *   To run both the frontend and backend concurrently:
        ```bash
        ./tooling/scripts/dev-all.sh
        ```
    *   To run the frontend (Vite) separately:
        ```bash
        pnpm --filter @cdm/web dev
        ```
        The web app will be available at http://localhost:5173.

    *   To run the backend (Fastify) separately:
        ```bash
        pnpm --filter @cdm/api dev
        ```
        The API will be available at http://localhost:4000.

3.  **Build for production:**
    ```bash
    pnpm build
    ```

4.  **Run tests:**
    ```bash
    pnpm test
    ```

5.  **Linting and Formatting:**
    *   To lint the code:
        ```bash
        pnpm lint
        ```
    *   To check formatting:
        ```bash
        pnpm format
        ```

# Development Conventions

*   **Coding Style:** The project uses Prettier for code formatting (single quotes, trailing commas) and ESLint for linting.
*   **Naming Conventions:**
    *   Files and packages should be named in `kebab-case`.
    *   Commit messages should follow the conventional commits format (e.g., `feat: ...`, `fix: ...`).
*   **Architecture:** The project follows a "everything is a plugin" philosophy. The core logic is in `@cdm/core-server` and `@cdm/core-client`, with a default set of plugins in `@cdm/preset-default`. UI components are located in `@cdm/ui`.
*   **Aliases:** The project uses TypeScript path aliases (e.g., `@cdm/core-client`) for easier imports between packages. These are defined in `tsconfig.base.json`.
