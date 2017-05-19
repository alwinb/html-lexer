
// # Lexer
// A wrapper around a lexer state machine with an
// emit/ emitError interface. Keeps track of the
// previous position and presents a lazy stream of
// lexemes, e.g. chuncks of the input stream. 

function Lexer (StateMachine, specials) { return function () {
	var specials = specials != null ? specials : {}

  // The global position in the stream
	var position = 0
		, line = 1
		, column = 0

  return { tokenize:tokenize, toArray:toArray, info:info }

  function init () {
    position = 0
		line = 1
		column = 0
  }

	function info () {
		return { position:position, line:line, column:column }
	}

	// `toArray` returns an array of tokens for a string
	function toArray (str) {
		var toks = []
    tokenize (str, function (tok) { toks.push (tok) })
		return toks
	}

  function tokenize (input, cb) {
    init () // later will allow chained calls soon
  	var last = 0
    var pos = 0
  	var finished = false
  	var sm = new StateMachine (advance, emit, emitError)

		while (!finished) {
      var char = input[pos]
		  char = char == '\r' ? '\n' : char
			if (char == null) {
				sm.run (null) // effectively sends an 'eof' to `sm`. 
				finished = true
			}
			else
				sm.run(char)
		}

  	// `advance` Increments by one char, but
  	//	treats CR and CR,LF as a single LF. 

  	function advance () {
  		var char = input[pos]
  		if (char === "\r")
        if (input[pos+1] === '\n') {
  				pos++ // position into chunck
          position++
        }
  		if (char === '\n') {
  			line++; column = 0 }
  		else
  			column++
  		pos++
      position++
  	}

  	function emitError (message) { cb (['error', message, info()]) }

  	function emit (type, attrs) {
  		var chunck = input.substring(last, pos)
  		last = pos
  		if (type in specials) // use a custom token constructor/ token splitter
  			specials[type](chunck, attrs).map (cb)
      else if (arguments.length > 1)
        cb ([type, chunck, attrs])
  		else
        cb ([type, chunck])
  	}
  }
}
}

module.exports = Lexer