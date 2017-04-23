
// # Lexer
// A wrapper around a lexer state machine with an
// emit/ emitError interface. Keeps track of the
// previous position and presents a lazy stream of
// lexemes, e.g. chuncks of the input stream. 

var Stream = require('./stream')

function Lexer (StateMachine, specials) {
	var specials = specials != null ? specials : {}

return function (str) {
	var position = 0
		, finished = false
		, buffer = []
		, string = String(str)
		, stream = Stream(string)
		, sm = new StateMachine(stream.advance, emit, emitError)

	return { next:next, toArray:toArray, info:stream.info }

	// `next` returns the next lexeme in the stream,
	//	or null if the end of the stream was reached. 

  function next () {
		while (!finished && !buffer.length) {
      var char = stream.peek()
			if (char == null) {
				sm.run(null) // effectively sends an 'eof' to `sm`. 
				finished = true
			}
			else
				sm.run(char)
		}
		return buffer.shift()
	}

	// `toArray` returns an array with all the
	// remaining lexemes in the stream. 

	function toArray () {
		var toks = []
		var t = next()
		while (t != null) {
			toks.push(t)
			t = next()
		}
		return toks
	}

	function emitError (message) {
		buffer.push(['error', message, stream.info()]) }

	function emit (type, attrs) {
		var l = position
		position = stream.info().position
		var chunck = string.substring(l,position)
		if (type in specials) {// use a custom token constructor
			buffer = buffer.concat(specials[type](chunck, attrs)) // Hmm push may be quicker
    }
		else if (arguments.length > 1)
      buffer.push([type, chunck, attrs])
		else
      buffer.push([type, chunck])
	}
}}


module.exports = Lexer