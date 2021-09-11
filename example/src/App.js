import React from 'react'

import Console from 'react-terminal'
import 'react-terminal/dist/index.css'

const programs = {
	echo: ({ argv: [_, ...args] }) => {
		return args.join(" ")
	},
}

const App = () => {
	return (
		<Console
			style={{ height: "400px", width: "500px", color: "limegreen", backgroundColor: "black" }}
			programs={programs} motd={"Welcome to the terminal\nTry the echo command!"}
		/>
	)
}

export default App
