# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — bundles `src/index.js` into `dist/` (`index.js` CJS, `index.modern.js` ESM, plus CSS) via microbundle-crl. `prepare` runs this on install.
- `npm start` — same bundle in watch mode.
- `npm run test:unit` — Jest via react-scripts (jsdom).
- Single test file: `npx react-scripts test --env=jsdom src/index.test.js` (add `-t "name"` to filter by test name).
- `npm run test:watch` — unit tests in watch mode.
- `npm run test:lint` — `eslint .`
- `npm test` — unit + lint + build.
- Example app: `cd example && npm install && npm start`. It consumes the library via `file:..`, so run `npm run build` in the root first or the example uses the existing `dist/`.

## Architecture

The package is a single React component, `Console`, exported as the default from `src/index.js`. Everything else is a helper for it.

- **State lives in `Console`.** It holds `history` (an array of `{original, current}` entries), `index` (which entry is shown in the input), and `stdout` (an array of `{key, value}` lines). The last history entry is always an empty draft; submitting edits or runs an entry and then pushes a fresh draft.
- **Context, not props, for the input.** `Console` provides a `ConsoleContext` containing state and handlers. `src/components/Input.js` consumes it and owns only the local `tabsInARow` counter and keyboard handling. Input imports `ConsoleContext` from `".."` (the package entry), a circular import, so the context must stay defined in `src/index.js`.
- **Commands are plain functions.** `programs` maps a name to `({argv}) => string`. `executeCommand` splits input on whitespace, echoes `prompt + input` into stdout, runs the matching program, and splits its return value on `\n` into stdout lines. Unknown programs print `<name>: command not found`. There is no stderr channel.
- **Imperative handle.** `ref` exposes `pushCommand(command)` and `appendToStdout(lines)`, which lets code outside the input run commands and write output. `pushCommand()` with no argument runs whatever is currently at `index`. The example app uses this in `example/src/App.js`.
- **Tab completion.** `Input` calls the `tabComplete` prop, or `_tabComplete` in `index.js` by default. The default matches the last whitespace-separated token by prefix against `programs` keys, or against `tabComplete` if that is an array. A unique match or common prefix is completed in place; with several matches and no common prefix, they are printed to stdout. `Input` tracks consecutive tab presses and resets the count on any other key.
- **Keyboard.** `Input.handleKeyDown` implements Ctrl-A/B/C/E/F/L by hand, with Ctrl-L clearing stdout. Arrow keys move through history.
- **Styling.** `src/styles.module.css` is a CSS module. The `style` prop goes on the console container, and its color, background and font properties are also passed to the input line.

## Conventions

- Formatting follows `.prettierrc` (single quotes, JSX single quotes, no trailing commas, no semicolons), enforced through `.eslintrc` via `eslint-plugin-prettier`.
- The peer dependency is React 17.
