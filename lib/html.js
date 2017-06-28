// HTML5 lexer
// ===========

var tokens = require ('./tokens')

// Character classes

var ALPHA = /[A-Za-z]/
var ALPHANUM = /[A-Za-z0-9]/
var DIGITS = /[0-9]/
var HEXDIGITS = /[0-9a-fA-F]/
var SPACE = /[\t\r\n\f ]/
var TAGEND = /[\t\r\n\f />]/

var EOF = {}

var content_map = 
{ style: 'rawtext'
, script: 'rawtext'
, xmp: 'rawtext'
, iframe: 'rawtext'
, noembed: 'rawtext'
, noframes: 'rawtext'
, textarea: 'rcdata'
, title: 'rcdata'
, plaintext: 'plaintext'
//, noscript: 'rawtext' // if scripting is enabled in a UA...
}


// Html Lexer state machine
// ------------------------

function Lexer (emit) {
  this.state = 'data'
  this.stack = []
  this.tagName = ''
  this.tagType = null
  this.quotation = null
  this.prefixCount = 0
  // 
  this.p
  this.position = { line:1, column:0 }
  this.consume
  this.emit = function (type, attrs) { emit (type, attrs, this.p) }
}


Lexer.prototype = {

info: function () {
  var p = this.position
  return { line:p.line, column:p.column }
},

_pushState: function (name) {
	this.stack.push (this.state)
	this.state = name
},

_popState: function () {
  if (this.stack.length)
	  this.state = this.stack.pop ()
},

end: function (chunk) {
  if (arguments.length)
    this.write (chunk)
  states [this.state] .call (this, EOF) // TODO should we keep doing this until the state stack is empty?
},

write: function (chunk) {
  var p = 0
    , l = chunk.length

  this.consume = function () { this.p = p = p + 1 } // Bah

  while (p < l) {
    var char = chunk [p]

    // Count global line/ column position
    // TODO treat CR, LF, CRLF as a single LF. (Also in output ?? Noo..) 

		if (char === '\r' || char === '\n') {
		  this.position.line ++
      this.position.column = 0
    }
		else
			this.position.column ++

    // console.log (this.state, char)
    states [this.state] .call (this, char)
  }
},

} /* end of Lexer.prototype */



var states = {

// The `content` state doesn't occur in the html5 spec. It functions as
// an intermediate state for implementing support for rawtext / rcdata
// elements without requiring a full parser phase. It does not consume. 

content: function (peek) {
	this.state = (this.tagType === 'startTag' && this.tagName in content_map)
		? content_map [this.tagName]
		: 'data'
},

data: function (peek) {
	if (peek === EOF)
		this.emit (tokens.data)
	else if (peek === '<') {
		this.emit (tokens.data)
		this.consume ()
		this.state = 'tagOpen'
	}
	else if (peek === '&') {
		this.emit (tokens.data)
		this.consume ()
		this._pushState ('charRef')
	}
	else {
		this.consume ()
	}
},

// The `tagOpen` state is reached after a `<` symbol in html-data. 
tagOpen: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.lessThanSign)
	}
	else if (peek === '!') {
		this.state = 'markupDeclarationOpen'
		this.consume ()
	}
	else if (peek === '/') {
		this.state = 'endTagOpen'
		this.consume ()
	}
	else if (ALPHA.test (peek)) {
		this.emit (tokens.beginStartTag)
		this.state = 'tagName'
			this.tagType = 'startTag'
			this.tagName = peek.toLowerCase()
		this.consume ()
	}
	else if (peek === '?') {
		this.consume ()
		this.emit (tokens.beginBogusComment, { error:'invalid tag opening \'<?\'' })
		this.state = 'bogusComment'
	}
	else {
		this.emit (tokens.lessThanSign, { error:'unescaped less-than sign' })
		if (peek === '<') {
			this.consume ()
		}
		else if (peek === '&') {
			this.consume ()
			this.state = 'data'
			this._pushState ('charRef')
		}
		else {
			this.state = 'data'
			this.consume ()
		}
	}
},

// The `tagName` state is reached after an alphabetic character
// that trails `<` or `</`. The machine stays in this state until
// whitespace, `/` or `>` is encountered. 

tagName: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.tagName)
	}
	else if (SPACE.test (peek)) {
		this.emit (tokens.tagName)
		this.state = 'beforeAttributeName'
		this.consume ()
	}
	else if (peek === "/") {
		this.emit (tokens.tagName)
		this.state = 'selfClosingStartTag'
		this.consume ()
	}
	else if (peek === '>') {
		this.emit (tokens.tagName)
		this.consume ()
		this.emit (tokens.finishTag)
		this.state = 'content'
	}
	else {
		this.consume ()
		// The following is a bit of a hack, used in `content`,
		// for supporting rcdata and rawtext elements
		if (this.tagType === 'startTag')
			this.tagName = this.tagName+peek.toLowerCase();
	}
},

// The `selfClosingStartTag` state is reached after the
// `/` symbol within tags. 

selfClosingStartTag: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.space)
	}
	else if (peek === '>') {
		this.consume ()
		this.emit (tokens.finishSelfClosingTag)
		this.state = 'data'
	}
	else if (SPACE.test (peek) || peek === "/") {
		this.consume ()
	}
	else {
		this.emit (tokens.space)
		this.state = 'attributeName'
		this.consume ()
	}
},

endTagOpen: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.beginEndTag) // TODO error?
	}
	else if (ALPHA.test (peek)) {
		this.emit (tokens.beginEndTag)
		this.state = 'tagName'
			this.tagType = 'endTag'
			this.tagName = ''
		this.consume ()
	}
	else if (peek === '>') {
		this.emit (tokens.beginBogusComment, { error:'invalid comment' })
		this.consume ()
		this.emit (tokens.finishBogusComment)
		this.state = 'data'
	}
	else {
		this.emit (tokens.beginBogusComment, { error:'invalid comment (may be a malformed end tag)' })
		this.state = 'bogusComment'
		this.consume ()
	}
},

// Attribute names may start with anything except space, `/`, `>`
// subsequent characters may be anything except space, `/`, `=`, `>`.	 
// e.g. ATTRNAME = `/^[^\t\n\f />][^\t\n\f /=>]*$/`

beforeAttributeName: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.space)
	}
	else if (SPACE.test (peek)) {
		this.consume ()
	}
	else if (peek === "/") {
		this.emit (tokens.space)
		this.state = 'selfClosingStartTag'
		this.consume ()
	}
	else if (peek === '>') {
		this.emit (tokens.space)
		this.consume ()
		this.emit (tokens.finishTag)
		this.state = 'content'
	}
	else {
		this.emit (tokens.space)
		this.state = 'attributeName'
		this.consume ()
	}
},

attributeName: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.attributeName)
	}
	else if (SPACE.test (peek)) {
		this.emit (tokens.attributeName)
		this.state = 'afterAttributeName'
		this.consume ()
	}
	else if (peek === "/") {
		this.emit (tokens.attributeName) // Stand alone attribute
		this.state = 'selfClosingStartTag'
		this.consume ()
	}
	else if (peek === "=") { // attribute with value
		this.emit (tokens.attributeName)
		this.consume ()
		this.state = 'beforeAttributeValue'
	}
	else if (peek === '>') {
		this.emit (tokens.attributeName) // Stand alone attribute
		this.consume ()
		this.emit (tokens.finishTag)
		this.state = 'content'
	}
	else {
		this.consume ()
	}
},

afterAttributeName: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.space)
	}
	else if (SPACE.test (peek)) {
		this.consume ()
	}
	else if (peek === "/") {
		this.emit (tokens.space) // was a stand alone attribute
		this.state = 'selfClosingStartTag'
		this.consume ()
	}
	else if (peek === "=") { // attribute with value
		this.consume ()
		this.state = 'beforeAttributeValue'
	}
	else if (peek === '>') {
		this.emit (tokens.space) // it was a stand alone attribute
		this.consume ()
		this.emit (tokens.finishTag)
		this.state = 'content'
	}
	else {
		this.emit (tokens.space) // it was a stand alone attribute
		this.state = 'attributeName'
		this.consume ()
	}
},

beforeAttributeValue: function (peek) { // 'after equals'
	if (peek === EOF) {
		this.emit (tokens.equals)
	}
	else if (SPACE.test (peek)) {
		this.consume ()
	}
	else if (peek === '"' || peek === "'") {
		this.emit (tokens.equals)
		this.state = 'attributeValue'
			this.quotation = peek
		this.consume ()
		this.emit (tokens.beginAttributeValue)
	}
	else if (peek === '>') {
		this.emit (tokens.equals)
		this.emit (tokens.beginAttributeValue)
		this.emit (tokens.attributeData, { error:'missing attribute value' })
		this.emit (tokens.finishAttributeValue)
		this.consume ()
		this.emit (tokens.finishTag)
		this.state = 'content'
	}
	else if (peek === '&') {
		this.emit (tokens.equals)
		this.emit (tokens.beginAttributeValue)
		this.state = 'attributeValue'
			this.quotation = ''
		this.consume ()
		this._pushState ('charRef')
  }
	else {
		this.emit (tokens.equals)
		this.emit (tokens.beginAttributeValue)
		this.consume ()
		this.state = 'attributeValue'
			this.quotation = ''
		if (peek === '<' || peek === '=' || peek === '`')
		  this.emit (tokens.attributeData, { error: 'attribute values must not start with a ('+peek+') character'})
	}
},

attributeValue: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.attributeData)
	}
	else if (peek === '&') {
		this.emit (tokens.attributeData)
		this.consume ()
		this._pushState ('charRef')
	}
	else if (peek === this.quotation) {
		this.emit (tokens.attributeData)
		this.consume ()
		this.emit (tokens.finishAttributeValue)
		this.state = 'afterAttributeValueQuoted'
		this.quotation = null
	}
	else if (this.quotation === '' && SPACE.test (peek)) {
		this.emit (tokens.attributeData)
		this.emit (tokens.finishAttributeValue)
		this.quotation = null
		this.consume ()
		this.state = 'beforeAttributeName'
	}
	else if (this.quotation === '' && peek === '>') {
		this.emit (tokens.attributeData)
		this.emit (tokens.finishAttributeValue)
		this.quotation = null
		this.consume ()
		this.emit (tokens.finishTag)
		this.state = 'content'
	}
	else {
		this.consume ()
	}
},

afterAttributeValueQuoted: function (peek) {
	if (peek === EOF) {
		// allready emitted
	}
	else if (SPACE.test (peek)) {
		this.state = 'beforeAttributeName'
		this.consume ()
	}
	else if (peek === "/") {
		this.consume ()
		this.state = 'selfClosingStartTag'
	}
	else if (peek === '>') {
		this.consume ()
		this.emit (tokens.finishTag)
		this.state = 'content'
	}
	else {
		this.emit (tokens.spaceMissing, { error:'missing space after attribute' })
		this.state = 'attributeName'
		this.consume ()
	}
},

// Markup declaration
// This state is reached after <!

markupDeclarationOpen: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.beginBogusComment)
	}
	else if (peek === "-") {
		// The spec uses a one character lookahead here,
		// I use an additional state 'markupDeclarationOpenDash' instead
		this.consume ()
		this.state = 'markupDeclarationOpenDash'
	}
	// TWO cases are omitted here: doctype tags and cdata sections
	//	those will be tokenized as bogus comments instead. 
	else if (peek === '>') {
		this.emit (tokens.beginBogusComment, { error:'invalid comment' })
		this.consume ()
		this.emit (tokens.finishBogusComment)
		this.state = 'data'
	}
	else {
		this.emit (tokens.beginBogusComment, { error: 'invalid comment (may be an unhandled markup declaration)'})
		this.consume ()
		this.state = 'bogusComment'
	}
},

// This state is reached after <!-
markupDeclarationOpenDash: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.beginBogusComment)
	}
	if (peek === '-') {
		this.consume ()
		this.emit (tokens.beginComment)
		this.state = 'commentStart'
	}
	else {
		this.emit (tokens.beginBogusComment, { error: 'invalid comment (comments should start with <!--)'})
		this.consume ()
		this.state = 'bogusComment'
	}
},

// Comments
// This state is reached after <!--
commentStart: function (peek) {
	if (peek === EOF) {
		// allready emitted
	}
	else if (peek === "-") {
		this.state = 'commentStartDash'
		this.consume ()
	}
	else if (peek === '>') {
		this.consume ()
		this.emit (tokens.finishComment)
		this.state = 'data'
	}
	else {
		this.state = 'comment'
		this.consume ()
	}
},

// This state is reached after an <!---
commentStartDash: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.commentData)
	}
	else if (peek === "-") {
		this.consume ()
		this.state = 'commentEnd'
	}
	else if (peek === '>') {
		this.consume ()
		this.emit (tokens.finishComment)
		this.state = 'data'
	}
	else {
		this.state = 'comment'
		this.consume ()
	}
},

comment: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.commentData)
	}
	else if (peek === "-") {
		this.emit (tokens.commentData)
		this.consume ()
		this.state = 'commentEndDash'
	}
	else {
		this.consume ()
	}
},

// this state is reached after - in a comment
commentEndDash: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.commentData)
	}
	else if (peek === "-") {
		this.state = 'commentEnd'
		this.consume ()
	}
	else {
		this.state = 'comment'
		this.consume ()
	}
},

// this state is reached after -- in a comment
commentEnd: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.commentData)
	}
	else if (peek === '>') {
		this.consume ()
		this.emit (tokens.finishComment)
		this.state = 'data'
	}
	else if (peek === "!") {
		// This is a parse error, will be reported in the next state
		this.consume ()
		this.state = 'commentEndBang'
	}
	else {
		this.emit (tokens.commentData, { error:'comment data should not contain --'})
		this.state = 'comment'
		this.consume ()
	}
},

// this state is reached after --! in a comment
commentEndBang: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.commentData)
	}
	else if (peek === "-") {
		this.emit (tokens.commentData, { error:'comment data should not contain --!'})
		this.state = 'commentEndDash'
		this.consume ()
	}
	else if (peek === '>') {
		this.consume ()
		this.emit (tokens.finishComment, { error:'comment should end with -->' })
		this.state = 'data'
	}
	else {
		this.emit (tokens.commentData, { error:'comment data should not contain --!'})
		this.state = 'comment'
		this.consume ()
	}
},

bogusComment: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.bogusCommentData)
	}
	else if (peek === '>') {
		this.emit (tokens.bogusCommentData)
		this.consume ()
		this.emit (tokens.finishBogusComment)
		this.state = 'data'
	}
	else {
		this.consume ()
	}
},


// ### RAWTEXT, RCDATA and PLAINTEXT states
// Raw text may contain anything except the beginnings of an
// end tag for the current element. Raw text cannot be escaped. 
// The only rawtext elements in the html5 specification are
// 'script' and 'style'. 
// Rcdata may contain anyting like rawtext, but can be escaped,
// that is, it may contain character references. 
// Plaintext may contain anything, nothing can be escaped, and
// does not have an endtag. 

plaintext: function (peek) {
	if (peek === EOF)
		this.emit (tokens.plaintext)
	else
		this.consume ()
},

rawtext: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.rawtext)
	}
	else if (peek === '<') {
		this.emit (tokens.rawtext)
		this._pushState ('lessThanSignIn_')
		this.consume ()
	}
	else
		this.consume ()
},

rcdata: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.rcdata)
	}
	else if (peek === '<') {
		this.emit (tokens.rcdata)
		this.consume ()
		this._pushState ('lessThanSignIn_')
	}
	else if (peek === '&') {
		this.emit (tokens.rcdata)
		this.consume () // The spec uses a var returnState instead
		this._pushState ('charRef') 
    //console.log('after &', this)
	}
	else
		this.consume ()
},

lessThanSignIn_: function (peek) {
	if (peek === "/") {
		this.consume ()
		this.state = 'endTagOpenIn_'
			this.tagType = 'endTag'
			this.prefixCount = 0
	}
	else {
		this.emit (tokens.endTagPrefix)
		this.consume ()
		this._popState ()
	}
},

// This is different from, but equivalent to the specification

endTagOpenIn_: function (peek) {
	if (peek === EOF) {
		this.emit (tokens.endTagPrefix)
		this._popState ()
	}
	else if (this.prefixCount < this.tagName.length) {
		if (peek.toLowerCase() === this.tagName [this.prefixCount]) {
			this.consume ()
			this.prefixCount++
		}
		else {
			this.emit (tokens.endTagPrefix)
			this.consume ()
			this._popState ()
		}
	}
	else if (SPACE.test (peek)) {
		this.emit (tokens.beginEndTag)
		this.consume ()
		this._popState ()
		this.state = 'beforeAttributeName'
	}
	else if (peek === '/') {
		this.emit (tokens.beginEndTag)
		this.consume ()
		this._popState ()
		this.state = 'selfClosingStartTag'
	}
	else if (peek === '>') {
		this.emit (tokens.beginEndTag)
		this.consume ()
		this._popState ()
		this.emit (tokens.finishTag)
		this.state = 'data'
	}
	else {
		this.emit (tokens.endTagPrefix)
		this.consume ()
		this._popState ()
	}
},


// ### Character references
//
// The character reference states as implemented below,
// are not in the specification and in fact, the following is not
// completely equivalent to the suggested behaviour (keep reading). 
//
// The main difference is in the tokenization of named references. 
// A named character reference token with an unknown name **ought** to
// have been interpreted as data, likewise for named references that aren't
// terminated by a semicolon and occur in attribute values (IIRC). 
// Named references with an unknown name, a prefix of which **is** a known name,
// **ought** to have been interpreted as a such named reference
// followed by the rest of the unknown name as data. 
// Furthermore, numeric character references are not checked for
// being 'out of range', so no 'out of range' errors are emitted for those. 
// 
// The above isn't needed for correct tokenization of the rest of the document
// and I kind of feel that the suggested behaviour shouldn't be implemented as
// part of the lexical analysis, but should be handled higher up. 
// 
// Any sequence starting with an ampersand and which is not a lexically valid
// character reference, is emitted as a `bogusCharRef` token. 

charRef: function (peek) { // after an &
	if (peek === '#') {
		this.consume ()
		this.state = 'numericCharRef'
	}
	else if (peek !== EOF && ALPHANUM.test (peek)) {
		this.consume ()
		this.state = 'namedCharRef'
	}
	else {
		// Branch does not consume
		this.emit (tokens.bogusCharRef)
		this._popState ()
	}
},

numericCharRef: function (peek) {
	if (peek === 'x' || peek === 'X') {
		this.consume ()
		this.state = 'hexadecimalCharRef'
	}
	else if (peek !== EOF && DIGITS.test (peek)) {
		this.consume ()
		this.state = 'decimalCharRef'
	}
	else {
		// Branch does not consume
		this.emit (tokens.bogusCharRef)
		this._popState ()
	}
},

decimalCharRef: function (peek) {
	if (peek !== EOF && DIGITS.test (peek)) {
		this.consume ()
	}
	else if (peek === ';') {
		this.consume ()
		this.emit (tokens.decimalCharRef)
		this._popState ()
	}
	else {
		// Branch does not consume
		this.emit (tokens.decimalCharRef, { error:'unterminated decimal character reference' })
		this._popState ()
	}
},

hexadecimalCharRef: function (peek) {
	if (peek !== EOF && HEXDIGITS.test (peek)) {
		this.consume ()
		this.state = 'hexDigits'
	}
	else {
		// Branch does not consume
		this.emit (tokens.bogusCharRef)
		this._popState ()
	}
},

hexDigits: function (peek) {
	if (peek !== EOF && HEXDIGITS.test (peek))
		this.consume ()
	else if (peek === ';') {
		this.consume ()
		this.emit (tokens.hexadecimalCharRef)
		this._popState ()
	}
	else {
		// Branch does not consume
		this.emit (tokens.hexadecimalCharRef, { error:'unterminated hexadecimal character reference' })
		this._popState ()
	}
},

namedCharRef: function (peek) {
	if (peek !== EOF && ALPHANUM.test (peek))
		this.consume ()
	else if (peek === ';') {
		this.consume ()
		this.emit (tokens.namedCharRef, { inAttribute:(this.stack[this.stack.length-1] === 'attributeValue') })
		this._popState ()
	}
	else {
		// Branch does not consume
		this.emit (tokens.namedCharRef, { inAttribute:(this.stack[this.stack.length-1] === 'attributeValue'), nextChar:peek })
		this._popState ()
	}
}

} /* end of states */


module.exports = Lexer