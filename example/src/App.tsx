import { useRef } from 'react'
import {
  Console,
  type ConsoleHandle,
  type Programs
} from '@bowdens/react-terminal'
import '@bowdens/react-terminal/dist/index.css'

const programs: Programs = {
  echo: ({ argv: [, ...args] }) => args.join(' '),
  echolocation: () => 'ping',
  emu: () => 'The Emu is a species of bird native to Australia',
  apple: () => "``Owch'' - Newton",
  aardvark: () => "It's really high in the alphabet.",
  sleep: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return 'woke up'
  }
}

export default function App() {
  const consoleRef = useRef<ConsoleHandle>(null)
  return (
    <>
      <Console
        ref={consoleRef}
        programs={programs}
        onExit={() => window.alert('Ctrl-D on an empty line')}
        motd={'Welcome to the terminal\nTry the echo command!'}
        style={{
          height: 400,
          width: 500,
          color: 'limegreen',
          backgroundColor: 'black'
        }}
      />
      <hr />
      <button
        onClick={() => consoleRef.current?.pushCommand('echo Hello World!')}
      >
        Click me!
      </button>
    </>
  )
}
