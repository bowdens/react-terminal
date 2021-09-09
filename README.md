# react-terminal

> A novelty terminal emulator for react. You probably shouldn't use this for anything serious.

[![NPM](https://img.shields.io/npm/v/react-terminal.svg)](https://www.npmjs.com/package/react-terminal) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save git@github.com:bowdens/react-terminal.git
```

## Usage

```jsx
import React from 'react'

import Console from 'react-terminal'
import 'react-terminal/dist/index.css'

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

## License

MIT © [bowdens](https://github.com/bowdens)
