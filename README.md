# react-terminal

> A novelty terminal emulator for react. You probably shouldn't use this for anything serious.

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

## License

MIT © [bowdens](https://github.com/bowdens)
