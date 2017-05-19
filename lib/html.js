// HTML5 lexer
// ===========

var tokens = require('./tokens')

// 

var ALPHA = /[A-Za-z]/
var ALPHANUM = /[A-Za-z0-9]/
var DIGITS = /[0-9]/
var HEXDIGITS = /[0-9a-fA-F]/
var SPACE = /[\t\n\f ]/
var TAGEND = /[\t\n\f />]/

var EOF = null
var eof_msg = 'end of input '

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

// TODO: re enable these
//  just by checking the state in the lexer
//  maybe keep feeding eofs into the machine until the statestack is empty, too

var errors = { EOF: 
{ tagOpen: eof_msg+'after unescaped less-than sign'
, tagName: eof_msg+'in tag name'
, selfClosingStartTag: eof_msg+'before attribute name'
, endTagOpen: eof_msg+'before endtag name'
, beforeAttributeName: eof_msg+'before attribute name'
, attributeName: eof_msg+'in attribute name'
, afterAttributeName: eof_msg+'after attribute name'
, beforeAttributeValue: eof_msg+'before attribute value'
, attributeValue: eof_msg+'in attribute value'
, afterAttributeValueQuoted: eof_msg+'after attribute value'
, markupDeclarationOpen: eof_msg+'in markup declaration'
, commentStart: eof_msg+'in comment'
, rcdata: eof_msg+'in '+this.tagName+' content'
, rawtext: eof_msg+'in '+this.tagName+' content'
, bogusComment: eof_msg+'in invalid comment'
, commentEndBang: eof_msg+'in comment after --!'
, commentEnd: eof_msg+'in comment'
, commentEndDash: eof_msg+'in comment'
, comment: eof_msg+'in comment'
, commentStartDash: eof_msg+'in comment'
}}


// Html Lexer state machine
// ------------------------


function State () {
  this.state = 'data'
  this.stack = []
  this.tagName = ''
  this.tagType = null
  this.quotation = null
  this.prefixCount = 0
}

State.prototype.pushState = function (name) {
	this.stack.push(this.state)
	this.state = name
}

State.prototype.popState = function () {
	if (this.stack.length)
		this.state = this.stack.pop()
}


function StateMachine (consume, emit) {
  
  var state = new State ()
  
  function run (char) {
  	states[state.state].call(state, char) }

var states = {

// The `content` state doesn't occur in the html5 spec. It functions as
// an intermediate state for implementing support for rawtext / rcdata
// elements without requiring a full parser phase. 

content: function (peek) {
	this.state = (this.tagType === 'startTag' && this.tagName in content_map)
		? content_map[this.tagName]
		: 'data'
},

data: function (peek) {
	if (peek === EOF)
		emit(tokens.data)
	else if (peek === '<') {
		emit(tokens.data)
		consume()
		this.state = 'tagOpen'
	}
	else if (peek === '&') {
		emit(tokens.data)
		consume()
		this.pushState('charRef')
	}
	else {
		consume()
	}
},

// The `tagOpen` state is reached after a `<` symbol in html-data. 
tagOpen: function (peek) {
	if (peek === EOF) {
		emit(tokens.lessThanSign)
	}
	else if (peek === '!') {
		this.state = 'markupDeclarationOpen'
		consume()
	}
	else if (peek === '/') {
		this.state = 'endTagOpen'
		consume()
	}
	else if (ALPHA.test(peek)) {
		emit(tokens.beginStartTag)
		this.state = 'tagName'
			this.tagType = 'startTag'
			this.tagName = peek.toLowerCase()
		consume()
	}
	else if (peek === '?') {
		consume()
		emit(tokens.beginBogusComment, { error:'invalid tag opening \'<?\'' })
		this.state = 'bogusComment'
	}
	else {
		emit(tokens.lessThanSign, { error:'unescaped less-than sign' })
		if (peek === '<') {
			consume()
		}
		else if (peek === '&') {
			consume()
			this.state = 'data'
			this.pushState('charRef')
		}
		else {
			this.state = 'data'
			consume()
		}
	}
},

// The `tagName` state is reached after an alphabetic character
// that trails `<` or `</`. The machine stays in this state until
// whitespace, `/` or `>` is encountered. 

tagName: function (peek) {
	if (peek === EOF) {
		emit(tokens.tagName)
	}
	else if (SPACE.test(peek)) {
		emit(tokens.tagName)
		this.state = 'beforeAttributeName'
		consume()
	}
	else if (peek === "/") {
		emit(tokens.tagName)
		this.state = 'selfClosingStartTag'
		consume()
	}
	else if (peek === '>') {
		emit(tokens.tagName)
		consume()
		emit(tokens.finishTag)
		this.state = 'content'
	}
	else {
		consume()
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
		emit(tokens.space)
	}
	else if (peek === '>') {
		consume()
		emit(tokens.finishSelfClosingTag)
		this.state = 'data'
	}
	else if (SPACE.test(peek) || peek === "/") {
		consume()
	}
	else {
		emit(tokens.space)
		this.state = 'attributeName'
		consume()
	}
},

endTagOpen: function (peek) {
	if (peek === EOF) {
		emit(tokens.beginEndTag) // TODO error?
	}
	else if (ALPHA.test(peek)) {
		emit(tokens.beginEndTag)
		this.state = 'tagName'
			this.tagType = 'endTag'
			this.tagName = ''
		consume()
	}
	else if (peek === '>') {
		emit(tokens.beginBogusComment, { error:'invalid comment' })
		consume()
		emit(tokens.finishBogusComment)
		this.state = 'data'
	}
	else {
		emit(tokens.beginBogusComment, { error:'invalid comment (may be a malformed end tag)' })
		this.state = 'bogusComment'
		consume()
	}
},

// Attribute names may start with anything except space, `/`, `>`
// subsequent characters may be anything except space, `/`, `=`, `>`.	 
// e.g. ATTRNAME = `/^[^\t\n\f />][^\t\n\f /=>]*$/`

beforeAttributeName: function (peek) {
	if (peek === EOF) {
		emit(tokens.space)
	}
	else if (SPACE.test(peek)) {
		consume()
	}
	else if (peek === "/") {
		emit(tokens.space)
		this.state = 'selfClosingStartTag'
		consume()
	}
	else if (peek === '>') {
		emit(tokens.space)
		consume()
		emit(tokens.finishTag)
		this.state = 'content'
	}
	else {
		emit(tokens.space)
		this.state = 'attributeName'
		consume()
	}
},

attributeName: function (peek) {
	if (peek === EOF) {
		emit(tokens.attributeName)
	}
	else if (SPACE.test(peek)) {
		emit(tokens.attributeName)
		this.state = 'afterAttributeName'
		consume()
	}
	else if (peek === "/") {
		emit(tokens.attributeName) // Stand alone attribute
		this.state = 'selfClosingStartTag'
		consume()
	}
	else if (peek === "=") { // attribute with value
		emit(tokens.attributeName)
		consume()
		this.state = 'beforeAttributeValue'
	}
	else if (peek === '>') {
		emit(tokens.attributeName) // Stand alone attribute
		consume()
		emit(tokens.finishTag)
		this.state = 'content'
	}
	else {
		consume()
	}
},

afterAttributeName: function (peek) {
	if (peek === EOF) {
		emit(tokens.space)
	}
	else if (SPACE.test(peek)) {
		consume()
	}
	else if (peek === "/") {
		emit(tokens.space) // was a stand alone attribute
		this.state = 'selfClosingStartTag'
		consume()
	}
	else if (peek === "=") { // attribute with value
		consume()
		this.state = 'beforeAttributeValue'
	}
	else if (peek === '>') {
		emit(tokens.space) // it was a stand alone attribute
		consume()
		emit(tokens.finishTag)
		this.state = 'content'
	}
	else {
		emit(tokens.space) // it was a stand alone attribute
		this.state = 'attributeName'
		consume()
	}
},

beforeAttributeValue: function (peek) { // 'after equals'
	if (peek === EOF) {
		emit(tokens.equals)
	}
	else if (SPACE.test(peek)) {
		consume()
	}
	else if (peek === '"' || peek === "'") {
		emit(tokens.equals)
		this.state = 'attributeValue'
			this.quotation = peek
		consume()
		emit(tokens.beginAttributeValue)
	}
	else if (peek === '>') {
		emit(tokens.equals)
		emit(tokens.beginAttributeValue)
		emit(tokens.attributeData, { error:'missing attribute value' })
		emit(tokens.finishAttributeValue)
		consume()
		emit(tokens.finishTag)
		this.state = 'content'
	}
	else if (peek === '&') {
		emit(tokens.equals)
		emit(tokens.beginAttributeValue)
		this.state = 'attributeValue'
			this.quotation = ''
		consume()
		this.pushState('charRef')
  }
	else {
		emit(tokens.equals)
		emit(tokens.beginAttributeValue)
		consume()
		this.state = 'attributeValue'
			this.quotation = ''
		if (peek === '<' || peek === '=' || peek === '`')
		  emit (tokens.attributeData, { error: 'attribute values must not start with a '+peek+' character'})
	}
},

attributeValue: function (peek) {
	if (peek === EOF) {
		emit(tokens.attributeData)
	}
	else if (peek === '&') {
		emit(tokens.attributeData)
		consume()
		this.pushState('charRef')
	}
	else if (peek === this.quotation) {
		emit(tokens.attributeData)
		consume()
		emit(tokens.finishAttributeValue)
		this.state = 'afterAttributeValueQuoted'
		this.quotation = null
	}
	else if (this.quotation === '' && SPACE.test(peek)) {
		emit(tokens.attributeData)
		emit(tokens.finishAttributeValue)
		this.quotation = null
		consume()
		this.state = 'beforeAttributeName'
	}
	else if (this.quotation === '' && peek === '>') {
		emit(tokens.attributeData)
		emit(tokens.finishAttributeValue)
		this.quotation = null
		consume()
		emit(tokens.finishTag)
		this.state = 'content'
	}
	else {
		consume()
	}
},

afterAttributeValueQuoted: function (peek) {
	if (peek === EOF) {
		// allready emitted
	}
	else if (SPACE.test(peek)) {
		this.state = 'beforeAttributeName'
		consume()
	}
	else if (peek === "/") {
		consume()
		this.state = 'selfClosingStartTag'
	}
	else if (peek === '>') {
		consume()
		emit(tokens.finishTag)
		this.state = 'content'
	}
	else {
		emit(tokens.spaceMissing, { error:'missing space after attribute' })
		this.state = 'attributeName'
		consume()
	}
},

// Markup declaration
// This state is reached after <!

markupDeclarationOpen: function (peek) {
	if (peek === EOF) {
		emit(tokens.beginBogusComment)
	}
	else if (peek === "-") {
		// The spec uses a one character lookahead here,
		// I use an additional state 'markupDeclarationOpenDash' instead
		consume()
		this.state = 'markupDeclarationOpenDash'
	}
	// TWO cases are omitted here: doctype tags and cdata sections
	//	those will be tokenized as bogus comments instead. 
	else if (peek === '>') {
		emit(tokens.beginBogusComment, { error:'invalid comment' })
		consume()
		emit(tokens.finishBogusComment)
		this.state = 'data'
	}
	else {
		emit(tokens.beginBogusComment, { error: 'invalid comment (may be an unhandled markup declaration)'})
		consume()
		this.state = 'bogusComment'
	}
},

// This state is reached after <!-
markupDeclarationOpenDash: function (peek) {
	if (peek === EOF) {
		emit(tokens.beginBogusComment)
	}
	if (peek === '-') {
		consume()
		emit(tokens.beginComment)
		this.state = 'commentStart'
	}
	else {
		emit(tokens.beginBogusComment, { error: 'invalid comment (comments should start with <!--)'})
		consume()
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
		consume()
	}
	else if (peek === '>') {
		consume()
		emit(tokens.finishComment)
		this.state = 'data'
	}
	else {
		this.state = 'comment'
		consume()
	}
},

// This state is reached after an <!---
commentStartDash: function (peek) {
	if (peek === EOF) {
		emit(tokens.commentData)
	}
	else if (peek === "-") {
		consume()
		this.state = 'commentEnd'
	}
	else if (peek === '>') {
		consume()
		emit(tokens.finishComment)
		this.state = 'data'
	}
	else {
		this.state = 'comment'
		consume()
	}
},

comment: function (peek) {
	if (peek === EOF) {
		emit(tokens.commentData)
	}
	else if (peek === "-") {
		emit(tokens.commentData)
		consume()
		this.state = 'commentEndDash'
	}
	else {
		consume()
	}
},

// this state is reached after - in a comment
commentEndDash: function (peek) {
	if (peek === EOF) {
		emit(tokens.commentData)
	}
	else if (peek === "-") {
		this.state = 'commentEnd'
		consume()
	}
	else {
		this.state = 'comment'
		consume()
	}
},

// this state is reached after -- in a comment
commentEnd: function (peek) {
	if (peek === EOF) {
		emit(tokens.commentData)
	}
	else if (peek === '>') {
		consume()
		emit(tokens.finishComment)
		this.state = 'data'
	}
	else if (peek === "!") {
		// This is a parse error, will be reported in the next state
		consume()
		this.state = 'commentEndBang'
	}
	else {
		emit(tokens.commentData, { error:'comment data should not contain --'})
		this.state = 'comment'
		consume()
	}
},

// this state is reached after --! in a comment
commentEndBang: function (peek) {
	if (peek === EOF) {
		emit(tokens.commentData)
	}
	else if (peek === "-") {
		emit(tokens.commentData, { error:'comment data should not contain --!'})
		this.state = 'commentEndDash'
		consume()
	}
	else if (peek === '>') {
		consume()
		emit(tokens.finishComment, { error:'comment should end with -->' })
		this.state = 'data'
	}
	else {
		emit(tokens.commentData, { error:'comment data should not contain --!'})
		this.state = 'comment'
		consume()
	}
},

bogusComment: function (peek) {
	if (peek === EOF) {
		emit(tokens.bogusCommentData)
	}
	else if (peek === '>') {
		emit(tokens.bogusCommentData)
		consume()
		emit(tokens.finishBogusComment)
		this.state = 'data'
	}
	else {
		consume()
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
		emit(tokens.plaintext)
	else
		consume()
},

rawtext: function (peek) {
	if (peek === EOF) {
		emit(tokens.rawtext)
	}
	else if (peek === '<') {
		emit(tokens.rawtext)
		this.pushState('lessThanSignIn_')
		consume()
	}
	else
		consume()
},

rcdata: function (peek) {
	if (peek === EOF) {
		emit(tokens.rcdata)
	}
	else if (peek === '<') {
		emit(tokens.rcdata)
		consume()
		this.pushState('lessThanSignIn_')
	}
	else if (peek === '&') {
		emit(tokens.rcdata)
		consume() // The spec uses a var returnState instead
		this.pushState('charRef') 
    //console.log('after &', this)
	}
	else
		consume()
},

lessThanSignIn_: function (peek) {
	if (peek === "/") {
		consume()
		this.state = 'endTagOpenIn_'
			this.tagType = 'endTag'
			this.prefixCount = 0
	}
	else {
		emit(tokens.endTagPrefix)
		consume()
		this.popState()
	}
},

// This is different from, but equivalent to the specification

endTagOpenIn_: function (peek) {
	if (peek === EOF) {
		emit(tokens.endTagPrefix)
		this.popState()
	}
	else if (this.prefixCount < this.tagName.length) {
		if (peek.toLowerCase() === this.tagName[this.prefixCount]) {
			consume()
			this.prefixCount++
		}
		else {
			emit(tokens.endTagPrefix)
			consume()
			this.popState()
		}
	}
	else if (SPACE.test(peek)) {
		emit(tokens.beginEndTag)
		consume()
		this.popState()
		this.state = 'beforeAttributeName'
	}
	else if (peek === '/') {
		emit(tokens.beginEndTag)
		consume()
		this.popState()
		this.state = 'selfClosingStartTag'
	}
	else if (peek === '>') {
		emit(tokens.beginEndTag)
		consume()
		this.popState()
		emit(tokens.finishTag)
		this.state = 'data'
	}
	else {
		emit(tokens.endTagPrefix)
		consume()
		this.popState()
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
// (for as far as I've understood the spec). I kind of feel that the suggested
// behaviour shouldn't be implemented as part of the lexical analysis, but
// should be handled higher up. 
// 
// Any sequence starting with an ampersand and which is not a lexically valid
// character reference, is emitted as a `bogusCharRef` token. 

charRef: function (peek) { // after an &
	if (peek === '#') {
		consume()
		this.state = 'numericCharRef'
	}
	else if (peek !== EOF && ALPHANUM.test(peek)) {
		consume()
		this.state = 'namedCharRef'
	}
	else {
		// Branch does not consume
		emit(tokens.bogusCharRef)
		this.popState()
	}
},

numericCharRef: function (peek) {
	if (peek === 'x' || peek === 'X') {
		consume()
		this.state = 'hexadecimalCharRef'
	}
	else if (peek !== EOF && DIGITS.test(peek)) {
		consume()
		this.state = 'decimalCharRef'
	}
	else {
		// Branch does not consume
		emit(tokens.bogusCharRef)
		this.popState()
	}
},

decimalCharRef: function (peek) {
	if (peek !== EOF && DIGITS.test(peek)) {
		consume()
	}
	else if (peek === ';') {
		consume()
		emit(tokens.decimalCharRef)
		this.popState()
	}
	else {
		// Branch does not consume
		emit(tokens.decimalCharRef, { error:'unterminated decimal character reference' })
		this.popState()
	}
},

hexadecimalCharRef: function (peek) {
	if (peek !== EOF && HEXDIGITS.test(peek)) {
		consume()
		this.state = 'hexDigits'
	}
	else {
		// Branch does not consume
		emit(tokens.bogusCharRef)
		this.popState()
	}
},

hexDigits: function (peek) {
	if (peek !== EOF && HEXDIGITS.test(peek))
		consume()
	else if (peek === ';') {
		consume()
		emit(tokens.hexadecimalCharRef)
		this.popState()
	}
	else {
		// Branch does not consume
		emit(tokens.hexadecimalCharRef, { error:'unterminated hexadecimal character reference' })
		this.popState()
	}
},

namedCharRef: function (peek) {
	if (peek !== EOF && ALPHANUM.test(peek))
		consume()
	else if (peek === ';') {
		consume()
		emit(tokens.namedCharRef, { inAttribute:(this.stack[this.stack.length-1] === 'attributeValue') })
		this.popState()
	}
	else {
		// Branch does not consume
		emit(tokens.namedCharRef, { inAttribute:(this.stack[this.stack.length-1] === 'attributeValue'), nextChar:peek })
		this.popState()
	}
}

} /* end of states */

return { run:run, state:state, states:states }

} /* end of StateMachine */

StateMachine.State = State
module.exports = StateMachine