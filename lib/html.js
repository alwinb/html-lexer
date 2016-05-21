// HTML5 lexer
// ===========
// The token-types emitted by this tokenizer are
//
// - attributeData
// - attributeName
// - attributeValueMissing
// - beginAttributeValue
// - beginBogusComment
// - beginComment
// - beginEndTag
// - beginStartTag
// - bogusCharRef
// - bogusCommentData
// - commentData
// - data
// - decimalCharRef
// - equals
// - finishAttributeValue
// - finishBogusComment
// - finishComment
// - finishSelfClosingTag
// - finishTag
// - hexadecimalCharRef
// - lessThanSign
// - namedCharRef
// - plaintext
// - rawtext
// - rcdata
// - space
// - spaceMissing
// - tagName

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

// Html Lexer state machine
// ------------------------

function StateMachine (stream, emit, emitError) {
var state = { state:'data', quotation:null, tagName:'', tagType:null, stack:[] }
var consume = stream.advance

function popState () {
	if (state.stack.length)
		state.state = state.stack.pop() }

function pushState (newstate) {
	state.stack.push(state.state)
	state.state = newstate }

function info () {
	// TODO a function to return safe & clean access to the lexer state
	//
}


var states = {

// The `content` state doesn't occur in the html5 spec. It functions as
// an intermediate state for implementing support for rawtext / rcdata
// elements without requiring a full parser phase. 

content: function (peek) {
	this.state = (this.tagName in content_map)
		? content_map[this.tagName]
		: 'data'
},

data: function (peek) {
	if (peek === EOF)
		emit('data')
	else if (peek === '<') {
		emit('data')
		consume()
		this.state = 'tagOpen'
	}
	else if (peek === '&') {
		emit('data')
		consume()
		pushState('charRefIn_')
	}
	else {
		consume()
	}
},

// The `tagOpen` state is reached after a `<` symbol in html-data. 
tagOpen: function (peek) {
	if (peek === '!') {
		this.state = 'markupDeclarationOpen'
		consume()
	}
	else if (peek === '/') {
		this.state = 'endTagOpen'
		consume()
	}
	else if (peek === EOF) {
		emitError('unescaped less-than sign')
		emit('lessThanSign')
		this.state = 'content'
	}
	else if (ALPHA.test(peek)) {
		emit('beginStartTag')
		this.state = 'tagName'
			this.tagType = 'startTag'
			this.tagName = peek.toLowerCase()
		consume()
	}
	else if (peek === '?') {
		emitError('invalid comment opening')
		this.state = 'bogusComment'
		consume()
	}
	else {
		emitError('unescaped less-than sign')
		emit('lessThanSign')
		// Warning: branch does not consume
		this.state = 'content'
	}
},

// The `tagName` state is reached after an alphabetic character
// that trails `<` or `</`. The machine stays in this state until
// whitespace, `/` or `>` is encountered. 

tagName: function (peek) {
	if (peek === EOF) {
		emitError(eof_msg+'in tag name')
		emit('tagName')
	}
	else if (SPACE.test(peek)) {
		emit('tagName')
		this.state = 'beforeAttributeName'
		consume()
	}
	else if (peek === "/") {
		emit('tagName')
		this.state = 'selfClosingStartTag'
		consume()
	}
	else if (peek === '>') {
		emit('tagName')
		consume()
		emit('finishTag')
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
// `/` symbol (in the appropriate contexts). 

selfClosingStartTag: function (peek) {
	if (peek === '>') {
		consume()
		emit('finishSelfClosingTag')
		this.state = 'content'
	}
	else if (peek === EOF) {
		// This is the same as the EOF branch in 'beforeAttributeName'
		emit('space')
		emitError(eof_msg+'before attribute name')
	}
	else {
		// Warning: branch does not consume
		this.state = 'beforeAttributeName'
		//states.beforeAttributeName.apply(this, arguments)
	}
},

endTagOpen: function (peek) {
	if (ALPHA.test(peek)) {
		emit('beginEndTag')
		this.state = 'tagName'
			this.tagType = 'endTag'
			this.tagName = ''
		consume()
	}
	else if (peek === '>') {
		emitError('invalid empty comment tag')
		emit('beginBogusComment')
		consume()
		emit('finishBogusComment')
		this.state = 'content'
	}
	else if (peek === EOF) {
		emit('beginEndTag')
		emitError(eof_msg+'before endtag name')
	}
	else {
		emitError('invalid comment tag (may be a malformed end tag)')
		emit('beginBogusComment')
		this.state = 'bogusComment'
		consume()
	}
},

// Attribute names may start with anything except space, `/`, `>`
// subsequent characters may be anything except space, `/`, `=`, `>`.	 
// e.g. ATTRNAME = `/^[^\t\n\f />][^\t\n\f /=>]*$/`

beforeAttributeName: function (peek) {
	if (peek === EOF) {
		emit('space')
		emitError(eof_msg+'before attribute name')
	}
	else if (SPACE.test(peek)) {
		consume()
	}
	else if (peek === "/") {
		emit('space')
		this.state = 'selfClosingStartTag'
		consume()
	}
	else if (peek === '>') {
		emit('space')
		consume()
		emit('finishTag')
		this.state = 'content'
	}
	else {
		emit('space')
		this.state = 'attributeName'
		consume()
	}
},

attributeName: function (peek) {
	if (peek === EOF) {
		emitError(eof_msg+'in attribute name')
		emit('attributeName')
	}
	else if (SPACE.test(peek)) {
		emit('attributeName')
		this.state = 'afterAttributeName'
		consume()
	}
	else if (peek === "/") {
		emit('attributeName') // Stand alone attribute
		this.state = 'selfClosingStartTag'
		consume()
	}
	else if (peek === "=") { // attribute with value
		emit('attributeName')
		consume()
		this.state = 'beforeAttributeValue'
	}
	else if (peek === '>') {
		emit('attributeName') // Stand alone attribute
		consume()
		emit('finishTag')
		this.state = 'content'
	}
	else {
		consume()
	}
},

afterAttributeName: function (peek) {
	if (peek === EOF) {
		emitError(eof_msg+'after attribute name')
		emit('space')
	}
	else if (SPACE.test(peek)) {
		consume()
	}
	else if (peek === "/") {
		emit('space') // was a stand alone attribute
		this.state = 'selfClosingStartTag'
		consume()
	}
	else if (peek === "=") { // attribute with value
		consume()
		this.state = 'beforeAttributeValue'
	}
	else if (peek === '>') {
		emit('space') // it was a stand alone attribute
		consume()
		emit('finishTag')
		this.state = 'content'
	}
	else {
		emit('space') // it was a stand alone attribute
		this.state = 'attributeName'
		consume()
	}
},

beforeAttributeValue: function (peek) { // 'after equals'
	if (peek === EOF) {
		emit('equals')
		emitError(eof_msg+'before attribute value')
	}
	else if (SPACE.test(peek)) {
		consume()
	}
	else if (peek === '"' || peek === "'") {
		emit('equals')
		this.state = 'attributeValue'
		this.quotation = peek
		consume()
		emit('beginAttributeValue')
	}
	else if (peek === '>') {
		emit('equals')
		emitError('missing attribute value')
		emit('attributeValueMissing')
		consume()
		emit('finishTag')
		this.state = 'content'
	}
	else {
		// TODO should produce errors on <, =, `
		emit('equals')
		emit('beginAttributeValue')
		this.state = 'attributeValue'
		this.quotation = ''
		consume()
	}
},

attributeValue: function (peek) {
	if (peek === EOF) {
		emitError(eof_msg+'in attribute value')
		emit('attributeData')
	}
	else if (peek === '&') {
		emit('attributeData')
		consume()
		pushState('charRefIn_')
	}
	else if (peek === this.quotation) {
		emit('attributeData')
		consume()
		emit('finishAttributeValue')
		this.quotation = null
		this.state = 'afterAttributeValueQuoted'
	}
	else if (this.quotation === '' && SPACE.test(peek)) {
		emit('attributeData')
		emit('finishAttributeValue')
		this.quotation = null
		consume()
		this.state = 'beforeAttributeName'
	}
	else if (this.quotation === '' && peek === '>') {
		emit('attributeData')
		emit('finishAttributeValue')
		this.quotation = null
		consume()
		emit('finishTag')
		this.state = 'content'
	}
	else {
		consume()
	}
},

afterAttributeValueQuoted: function (peek) {
	if (peek === EOF) {
		emitError(eof_msg+'after attribute value')
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
		emit('finishTag')
		this.state = 'content'
	}
	else {
		emitError('missing space after attribute')
		emit('spaceMissing')
		this.state = 'beforeAttributeName'
		// Warning: branch does not consume
	}
},

// Markup declaration

markupDeclarationOpen: function (peek, stream) {
	if (peek === EOF) {
		emitError(eof_msg+'in markup declaration')
		emit('beginBogusComment')
	}
	else if (stream.unsafePeek(2) === "--") {
		consume()
		consume()
		emit('beginComment')
		this.state = 'commentStart'
	}
	// TWO cases are omitted here: doctype tags and cdata sections
	//	those will be tokenized as bogus comments instead. 
	else {
		emit('beginBogusComment')
		this.state = 'bogusComment'
		emitError('invalid comment (may be an unhandled markup declaration)')
		// Warning: branch does not consume
	}
},


// Comments
// This state is reached after an <!--
commentStart: function (peek) {
	if (peek === EOF) {
		emitError(eof_msg+'in comment')
	}
	else if (peek === "-") {
		this.state = 'commentStartDash'
		consume()
	}
	else if (peek === '>') {
		consume()
		emit('finishComment')
		this.state = 'content'
	}
	else {
		this.state = 'comment'
		consume()
	}
},

// This state is reached after an <!---
commentStartDash: function (peek) {
	if (peek === EOF) {
		emit('commentData')
		emitError(eof_msg+'in comment')
	}
	else if (peek === "-") {
		consume()
		this.state = 'commentEnd'
	}
	else if (peek === '>') {
		consume()
		emit('finishComment')
		this.state = 'content'
	}
	else {
		this.state = 'comment'
		consume()
	}
},

comment: function (peek) {
	if (peek === EOF) {
		emit('commentData')
		emitError(eof_msg+'in comment')
	}
	else if (peek === "-") {
		emit('commentData')
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
		emit('commentData')
		emitError(eof_msg+'in comment')
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
		emit('commentData')
		emitError(eof_msg+'in comment')
	}
	else if (peek === '>') {
		consume()
		emit('finishComment')
		this.state = 'content'
	}
	else if (peek === "!") {
		// This is a parse error, will be reported in the next state
		consume()
		this.state = 'commentEndBang'
	}
	else {
		emitError('comment data should not contain --')
		this.state = 'comment'
		consume()
	}
},

commentEndBang: function (peek) {
	if (peek === EOF) {
		emitError('comment data should not contain --!')
		emitError(eof_msg+'in comment')
		emit('commentData')
	}
	else if (peek === "-") {
		emitError('comment data should not contain --!')
		this.state = 'commentEndDash'
		consume()
	}
	else if (peek === '>') {
		consume()
		emitError('comment should end with -->')
		emit('finishComment')
		this.state = 'content'
	}
	else {
		emitError('comment data should not contain --!')
		this.state = 'comment'
		consume()
	}
},

bogusComment: function (peek) {
	if (peek === EOF) {
		emit('bogusCommentData')
		emitError(eof_msg+'in invalid comment')
	}
	else if (peek === '>') {
		emit('bogusCommentData')
		consume()
		emit('finishBogusComment')
		this.state = 'content'
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
		emit('plaintext')
	else
		consume()
},

rawtext: function (peek) {
	if (peek === EOF) {
		emit('rawtext')
		emitError(eof_msg+'in '+this.tagName+' content')
	}
	else if (peek === '<') {
		emit('rawtext')
		pushState('lessThanSignIn_')
		consume()
	}
	else
		consume()
},

rcdata: function (peek) {
	if (peek === EOF) {
		emit('rcdata')
		emitError(eof_msg+'in '+this.tagName+' content')
	}
	else if (peek === '<') {
		emit('rcdata')
		consume()
		pushState('lessThanSignIn_')
	}
	else if (peek === '&') {
		emit('rcdata')
		consume()
		pushState('charRefIn_')
	}
	else
		consume()
},

// This is different from, but equivalent to the specification, here
// using a lookahead into the token stream to check if the `<` sign
// starts an appropriate end tag token. 

// I want to redo this to preserve enough of the preceding content
// to be useful for valid escaping in the template language

lessThanSignIn_: function (peek) {
	if (peek === "/") {
		consume()
		this.state = 'endTagOpenIn_'
	}
	else {
		// Warning: branch does not consume
		popState()
	}
},

// So how to do that?
// Well, keep consuming and compare against the lastStartTag
// and store that in a separate piece of state
// 

endTagOpenIn_: function (peek) {
	var l = this.tagName.length, look = stream.unsafePeek(l+1)
	if (peek !== EOF && ALPHA.test(peek) && TAGEND.test(look[l]) && look.substr(0,l).toLowerCase() === this.tagName) {
		emit('beginEndTag')
		this.state = 'tagName'
			this.tagName = ''
		consume()
	}
	else {
		// Warning: branch does not consume
		popState()
	}
},

//endTagNameIn_:


// ### Character References
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

charRefIn_: function (peek) { // after an &
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
		emit('bogusCharRef')
		popState()
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
		emit('bogusCharRef')
		popState()
	}
},

decimalCharRef: function (peek) {
	if (peek !== EOF && DIGITS.test(peek)) {
		consume()
	}
	else if (peek === ';') {
		consume()
		emit('decimalCharRef')
		popState()
	}
	else {
		// Branch does not consume
		emitError('unterminated decimal character reference')
		emit('decimalCharRef')
		popState()
	}
},

hexadecimalCharRef: function (peek) {
	if (peek !== EOF && HEXDIGITS.test(peek)) {
		consume()
		this.state = 'hexDigits'
	}
	else {
		// Branch does not consume
		emit('bogusCharRef')
		popState()
	}
},

hexDigits: function (peek) {
	if (peek !== EOF && HEXDIGITS.test(peek))
		consume()
	else if (peek === ';') {
		consume()
		emit('hexadecimalCharRef')
		popState()
	}
	else {
		// Branch does not consume
		emitError('unterminated hexadecimal character reference')
		emit('hexadecimalCharRef')
		popState()
	}
},

namedCharRef: function (peek) {
	if (peek !== EOF && ALPHANUM.test(peek))
		consume()
	else if (peek === ';') {
		consume()
		emit('namedCharRef')
		popState()
	}
	else {
		// Branch does not consume
		emit('namedCharRef')
		popState()
	}
}

} /* end of states */

function run () {
	state.peek = stream.peek()
	states[state.state].call(state, stream.peek(), stream) }

return { run:run, state:state, states:states }
}

module.exports = StateMachine