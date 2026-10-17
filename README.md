# react-terminal

> A novelty terminal emulator for React. You probably shouldn't use this for anything serious. Pass in programs as functions that are called with the arguments the user types. The input line supports some of the bash shortcuts (Ctrl-L to clear the screen, and so on) and the up and down arrows navigate command history.

## Install

```bash
npm install @bowdens/react-terminal
```

Requires React 19.

## Usage

```tsx
import { Console, type Programs } from '@bowdens/react-terminal'
import '@bowdens/react-terminal/dist/index.css'

const programs: Programs = {
  echo: ({ argv: [, ...args] }) => args.join(' ')
}

export const Example = () => (
  <Console programs={programs} style={{ height: 400, width: 500 }} />
)
```

`Console` is available as both a named and the default export. See `example/` for a fuller demo.

## Props

| Prop          | Type                                   | Description                                                                                                                                                                                                      |
| ------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `programs`    | `Record<string, Program>`              | Maps a program name to a function. It receives `{ argv }` (the name followed by its arguments) and returns a string for stdout, split on `\n`. It may return nothing or a promise. There is no stderr.           |
| `prompt`      | `string`                               | Shown before the input. Defaults to `"$ "`. End with a non-breaking space (` `) so the HTML doesn't collapse it.                                                                                                 |
| `onExit`      | `() => void`                           | Called on Ctrl-D with an empty line.                                                                                                                                                                             |
| `motd`        | `string`                               | Shown when the console first renders.                                                                                                                                                                            |
| `tabComplete` | `string[] \| (value, ntabs) => string` | An array of words to complete against, or a callback that receives the current input and the number of tab presses in a row (0 on the first), and returns the new input. Defaults to the names in `programs`.    |
| `style`       | `CSSProperties`                        | Applied to the container.                                                                                                                                                                                        |
| `className`   | `string`                               | Added to the container.                                                                                                                                                                                          |
| `ref`         | `Ref<ConsoleHandle>`                   | `pushCommand(command?)` runs a command as if typed (with no argument, it runs the current input) and returns a promise that resolves when the program finishes. `appendToStdout(lines)` takes a string or array. |

## Styling

The default stylesheet is small and themed with CSS custom properties. Set them on the container (through `className` or `style`) or any ancestor:

```css
.my-terminal {
  --rt-bg: #1e1e2e;
  --rt-fg: #cdd6f4;
  --rt-font: 'Fira Code', monospace;
  --rt-font-size: 14px;
  --rt-padding: 1rem;
}
```

The class names are stable (`rt-console`, `rt-stdout`, `rt-line`, `rt-input-line`, `rt-prompt`, `rt-input`) if you'd rather write your own rules. Plain `style` colors and fonts still work as before.

## Keyboard

Readline-style shortcuts. Alt shortcuts match the physical key, so they also work with Option on macOS.

| Keys                                  | Action                                                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Up / Ctrl-P, Down / Ctrl-N            | Previous / next history entry                                                                                                                                  |
| Alt-< , Alt->                         | First history entry / back to the new line                                                                                                                     |
| Ctrl-R                                | Reverse history search. Ctrl-R again for older matches, Ctrl-S for newer, Enter to run, Esc or Ctrl-G to cancel, any other key to accept the match for editing |
| Tab                                   | Complete; press again to list the options                                                                                                                      |
| Ctrl-A / Ctrl-E                       | Start / end of line                                                                                                                                            |
| Ctrl-B / Ctrl-F                       | Back / forward a character                                                                                                                                     |
| Alt-B / Alt-F, Ctrl-Left / Ctrl-Right | Back / forward a word                                                                                                                                          |
| Ctrl-D                                | Delete the character under the caret; on an empty line, calls `onExit`                                                                                         |
| Ctrl-H                                | Delete the character before the caret                                                                                                                          |
| Ctrl-K / Ctrl-U                       | Kill to the end / start of the line                                                                                                                            |
| Ctrl-W                                | Kill the previous whitespace-delimited word                                                                                                                    |
| Alt-D, Ctrl-Delete                    | Kill the next word                                                                                                                                             |
| Alt-Backspace, Ctrl-Backspace         | Kill the previous word                                                                                                                                         |
| Ctrl-Y                                | Yank (paste) the last killed text                                                                                                                              |
| Ctrl-T / Alt-T                        | Transpose characters / words                                                                                                                                   |
| Alt-U / Alt-L / Alt-C                 | Upper-case / lower-case / capitalise the word                                                                                                                  |
| Alt-.                                 | Insert the last argument of the previous command; repeat for earlier commands                                                                                  |
| Ctrl-Z, Ctrl-_, Ctrl-/, Ctrl-X Ctrl-U | Undo                                                                                                                                                           |
| Ctrl-C                                | Abandon the line, echoing `^C` (copies instead if text is selected)                                                                                            |
| Ctrl-L                                | Clear the screen                                                                                                                                               |

Browsers reserve Ctrl-W, Ctrl-T and Ctrl-N, so those can't be intercepted in a page; use the Alt alternatives. There is no process to interrupt, so Ctrl-C does not cancel a running async program.

## Migrating from 2.x

- React 19 is now required.
- `tabComplete` as a function now works as documented, and tab completes on the first press rather than the second.
- Ctrl-A and Ctrl-E were swapped; they now go to the start and end of the line.
- Running an edited older history entry now runs the edited text.
- Blank commands are not added to history, and arguments are split on runs of whitespace (no empty strings in `argv`).
- Programs that match inherited object keys (`constructor`, `toString`...) are now "command not found".
- `ConsoleContext` is no longer exported.
- The CSS is plain with `rt-` class names rather than a CSS module.

## Development

```bash
npm run check   # typecheck, lint, test, build
npm run example # build the library and run the example app
```

## License

MIT © [bowdens](https://github.com/bowdens)
