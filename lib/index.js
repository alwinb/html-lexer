const tokens = require ('./tokens')
  , Lexer = require ('./lexer')
  , splitCharRef = require ('./entities.js') .splitCharRef

// The idea is to have custom token constructors,
//  but for now these are expected to return an array of tokens

var customTokens = {

	namedCharRef: function (chunck, attrs) {
    return splitCharRef (chunck, attrs.inAttribute, attrs.nextChar)
	},

}

module.exports = Lexer
module.exports.tokenTypes = tokens



// TEST

//var s = new Splitter (console.log.bind(console))
var s = new Lexer ({write:console.log.bind(console)})
s.write ('<sp')
s.write ('an>Hi</span>')
s.write ('&amp; &a')
s.write ('mp')
s.end (';<!')

