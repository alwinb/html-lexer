var Html = require('./html')
	, Lexer = require('./lexer')
  , splitCharRef = require('./entities.js').splitCharRef


// The idea is to have custom token constructors,
//  a map of functions, that have access to all of the lexer state
// Well well, for now... they return an ARRAY of tokens, so.. 

var customTokens = {

	namedCharRef: function (chunck, attrs) {
    return splitCharRef (chunck, attrs.inAttribute, attrs.nextChar)
	},

  // beginEndTag: function (chunck, state) {
  //   //console.log('beginEndTag', state)
  //   // This will be useful for the template language,
  //   // to have access to, e.g. the exact preceding string of
  //   // a placeholder in rawtext tags, etc.
  //   return ['beginEndTag', chunck]
  // }

}

module.exports = Lexer(Html, customTokens)

