import React, { useRef } from 'react'

import Console from 'react-terminal'
import 'react-terminal/dist/index.css'

const programs = {
	echo: ({ argv: [_, ...args] }) => {
		return args.join(" ")
	},
	echolocation: () => "ping",
	emu: () => "The Emu is a species of bird native to Australia",
	apple: () => "``Owch'' - Newton",
	aardvark: () => "It's really high in the alphabet."
}

const App = () => {
	const consoleRef = useRef(null);
	return (
		<>
			<Console
				style={{ height: "400px", width: "500px", color: "limegreen", backgroundColor: "black" }}
				programs={programs} motd={"Welcome to the terminal\nTry the echo command!"}
				ref={consoleRef}
			/>
			<hr />
			<button onClick={()=>{
				consoleRef.current.pushCommand(`echo Hello World!`);
			}}>Click me!</button>
			<hr />
		</>
	)
}

export default App
