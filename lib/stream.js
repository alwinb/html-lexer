
// # Stream
// A wrapper around an input string,
// keeps track of the position, counts lines
// and presents CR,LF character sequences
// as a single LF character. 
// (I might add an indentation counter too)

function Stream (string) {
	var input = string
		, position = 0
		, line = 1
		, column = 0

	return { peek:peek, unsafePeek:unsafePeek, advance:advance, info:info }

	// `advance` Increments by one char, but
	//	treats CR and CR,LF as a single LF. 

	function advance () {
		var char = input[position]
		if (char === "\r")
			if (input[position+1] === '\n')
				position++
		if (char === '\n') {
			line++; column = 0 }
		else
			column++
		position++
	}

	// `peek` returns the head char of the input,
	//	and null when reading beyound the end of input. 

	function peek () {
		var char = input[position]
		return char == null ? null : (char == '\r' ? '\n' : char)
	}

	// `unsafePeek` returns the next `l` characters;
	//	but does not preprocess CRLFs

	function unsafePeek (l) {
		return input.substr(position,l)
	}

	function info () {
		return { position:position, line:line, column:column }
	}

}

module.exports = Stream