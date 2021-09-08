import React from 'react'

import Console from 'react-terminal'
import 'react-terminal/dist/index.css'

const programs = {
	echo: ({argv: [_, ...args]}) => {
		return args.join(" ")
	},
}

const App = () => {
	return (
		<Console style={{ height: "400px", width: "500px" }} programs={programs} />
	)
}

export default App
