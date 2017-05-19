var Html = require('./html')
	, Lexer = require('./lexer')
  , splitCharRef = require('./entities.js').splitCharRef
  , tokens = require('./tokens')

// The idea is to have custom token constructors,
//  but for now these are expected to return an array of tokens

var customTokens = {

	namedCharRef: function (chunck, attrs) {
    return splitCharRef (chunck, attrs.inAttribute, attrs.nextChar)
	},

}

module.exports = Lexer (Html, customTokens)
module.exports.tokenTypes = tokens