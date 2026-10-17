# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — tsup bundles `src/index.ts` into `dist/` (ESM, CJS, `.d.ts`), and copies `src/index.css` to `dist/index.css`. `prepare` runs this on install.
- `npm run dev` — the same build in watch mode.
- `npm test` — Vitest (jsdom). Single file: `npx vitest run src/Console.test.tsx`; filter with `-t "name"`.
- `npm run typecheck`, `npm run lint`, `npm run format`.
- `npm run check` — typecheck + lint + test + build (what CI runs).
- Example app: `npm run example` builds the library, then runs the Vite app in `example/`, which consumes it via `file:..`. Run `npm install` in `example/` first.

## Architecture

The package is a React 19 component, `Console` (named and default export from `src/index.ts`).

- **State** is a pure reducer in `src/state.ts`: `history` (entries of `{original, current}`; the last is always the empty draft), `index` (which entry the input shows), `stdout` (`{key, value}` lines). `useConsoleState` wraps it so the latest state can be read synchronously. The imperative `ref` handle can dispatch several times in one tick, so don't replace this with a plain `useReducer`.
- **Commands** are plain functions in `programs`: `({argv}) => string | void | Promise<string | void>`. `Console.execute` echoes `prompt + input`, looks the program up with `Object.hasOwn`, runs it, and splits the result on `\n`. Sync programs write output synchronously (everything before the first `await`). Thrown errors print as `name: message`. Unknown programs print `name: command not found`. There is no stderr.
- **Keymap** (`src/keymap.ts`) is pure: `resolveKey` maps a key chord to a command name and `editLine` applies text commands. Add new shortcuts there, with a test in `keymap.test.ts`.
- **Input** (`src/Input.tsx`) is controlled by `Console` through props. It owns the consecutive-tab counter and key handling (readline-style shortcuts, Ctrl-R search, undo, Tab). Unhandled Ctrl combos (copy, paste) are left alone.
- **Tab completion**: `tabComplete` may be a function `(value, ntabs) => string`, an array of words, or omitted (use `programs` keys). Matching is in `src/completion.ts`. A repeat Tab with no progress lists the matches to stdout.
- **Imperative handle**: `pushCommand(command?)` and `appendToStdout(lines)`. With no argument `pushCommand` runs whatever is at `index`.
- **Styling**: `src/index.css` is plain CSS with stable `rt-*` class names, themed through `--rt-*` custom properties. It is not a CSS module and isn't imported by the component; consumers import `@bowdens/react-terminal/dist/index.css`.

## Conventions

- Prettier config in `.prettierrc` (single quotes, JSX single quotes, no semicolons, no trailing commas); run `npm run format`.
- Peer dependency is React 19. TypeScript is pinned to 6.0.x until typescript-eslint supports 7.
