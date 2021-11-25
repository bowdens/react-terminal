# react-terminal

> A novelty terminal emulator for react. You probably shouldn't use this for anything serious. Pass in programs as callback functions that are called with the arguments the user specifies. The input line supports (some of) the bash shortcuts like control-L to clear the screen, as well as the arrow keys up and down to navigate command history.

[![NPM](https://img.shields.io/npm/v/react-terminal.svg)](https://www.npmjs.com/package/react-terminal) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save @bowdens/react-terminal
```

## Usage

```jsx
import React from 'react'

import Console from '@bowdens/react-terminal'
import '@bowdens/react-terminal/dist/index.css'

const Example = () => {
  const programs = {
    echo: ({argv: [_, ...args]}) => {
      return args.join(" ")
    },
  }
  return (
    <Console programs={programs}/>
  )
}
```

## Props
Prop | Description | Example
-----|------|-----
programs | An object with all of the programs. It should be in the form programName: function. The callback function is passed an object with a single element 'argv' which is an array of the arguments that were specified when the program was invoked. It expects a single string as output to return to stdout. There is no stderr functionality. | ```{echo: ({argv: [prog, ...args]}) => "example stdout"}```
prompt | The prompt to show before the user's text. Its best to use the \u00a0 at the end of the prompt so the rendered HTML won't compress the whitespace. Default is "$\u00a0" | ```">\u00a0"``` 
style | Any styling for the component. Colours will be passed down to the input elements | ```{ color: "limegreen", backgroundColor: "black" } ```
motd | A string that will be displayed when the component is first rendered. | ```"Welcome to the terminal!"```
tabComplete | A callback that is fired whenever the tab key is pressed while the console is focussed. It is passed the current value and the number of tab keys pressed in a row without the value changing. It expects a value to be returned, either the existing value if no change is to be made, or a new value which will update the current value in the console input. If it is not provided the default is used, which attempts to match the input value with the programs by prefix. | ```(value, ntabs)=>{...}```
ref | A ref that provides the following properties: pushCommand which accepts a single argument (a command) that executes that command, and appendToStdout which accepts a single argument, either a string or an array of strings, which are appended to stdout. This allows the console to be used programatically without direct user input.

Check out example/src/App.js for a more complete example with a working echo program.

## License

MIT © [bowdens](https://github.com/bowdens)
