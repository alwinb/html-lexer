var Html = require('./html')
	, Lexer = require('./lexer')

// The idea is to have custom token constructors,
//  a map of functions, that have access to all of the lexer state

var customTokens = {

	namedCharRef: function (chunck, state) {
		// console.log('namedCharRef in state', state)
		// TODO: Might need to split the character reference
		return ['namedCharRef', chunck, state.stack[0]]
	},

	bogusCharRef: function (chunck, state) {
		return ['bogusCharRef', chunck, state.stack[0]]
	},
  
	decimalCharRef: function (chunck, state) {
		return ['decimalCharRef', chunck, state.stack[0]]
	},
  
	hexadecimalCharRef: function (chunck, state) {
		return ['hexadecimalCharRef', chunck, state.stack[0]]
	},
  
	beginEndTag: function (chunck, state) {
		//console.log('beginEndTag', state)
		// This will be useful for the template language,
		// to have access to, e.g. the exact preceding string of
		// a placeholder in rawtext tags, etc. 
		return ['beginEndTag', chunck]
	}

}

module.exports = Lexer(Html, customTokens)

