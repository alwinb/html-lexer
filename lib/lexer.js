"use strict"
//const log = console.log.bind (console)

const
  Tokens = require ('./tokens'),
  T = Tokens,
  Symbols = new Proxy ({}, {get:(_,k) => Symbol (k) }) /* Symbol maker */

// HTML5 Lexer
// ===========

// State machine state names

const {
  tagName,
  attributeName,
  attributeData,

  data,
  rcdata,
  rawtext,
  plaintext,

  namedCharRef,
  decimalCharRef,
  hexadecimalCharRef,

  afterAttributeName,
  afterAttributeValueQuoted,
  beforeAttributeName,
  beforeAttributeValue,
  bogusComment,
  comment,
  commentEnd,
  commentEndBang,
  commentEndDash,
  commentStart,
  commentStartDash,
  content,
  charRef,
  endTagOpen,
  endTagOpenIn_,
  hexDigits,
  markupDeclarationOpen,
  markupDeclarationOpenDash,
  numericCharRef,
  selfClosingStartTag,
  lessThanSignIn_,
  tagOpen } = Symbols


// Tag types, used in Lexer state

const {
  startTag,
  endTag } = Symbols


// Character classes

const
  ALPHA = /[A-Za-z]/,
  ALPHANUM = /[A-Za-z0-9]/,
  DIGITS = /[0-9]/,
  HEXDIGITS = /[0-9a-fA-F]/,
  SPACE = /[\t\r\n\f ]/,
  TAGEND = /[\t\r\n\f />]/


// The content map specifies the names of 
// rawtext, rcdata and plaintext elements.
// Script elements will use scriptdata in a future version. 
// NB. if scripting is enabled in the user agent, then 
// noscript tags are rawtext elements, but defaulting to
// data appears to be more appropriate to me. 

const content_map = {
  style: rawtext,
  script: rawtext,
  xmp: rawtext,
  iframe: rawtext,
  noembed: rawtext,
  noframes: rawtext,
  textarea: rcdata,
  title: rcdata,
  plaintext: plaintext,
}


// The token_map specifies the token type based on the current state
// This is used by to determine the type of the remaining chunk, in `end`.

const token_map = {
  [attributeData]:             T.attributeData,
  [attributeName]:             T.attributeName,
  [afterAttributeName]:        T.space,
  [afterAttributeValueQuoted]: null,
  [beforeAttributeName]:       T.space,
  [beforeAttributeValue]:      T.attributeAssign,
  [bogusComment]:              T.bogusCommentData,
  [comment]:                   T.commentData,
  [commentEnd]:                T.commentData,
  [commentEndBang]:            T.commentData,
  [commentEndDash]:            T.commentData,
  [commentStart]:              null,
  [commentStartDash]:          T.commentData,
  [content]:                   null,
  [charRef]:                   T.bogusCharRef,
  [data]:                      T.data,
  [decimalCharRef]:            T.decimalCharRef, // unterminated,
  [endTagOpen]:                T.beginEndTag, // TODO, error?,
  [endTagOpenIn_]:             T.endTagPrefix,
  [hexDigits]:                 T.hexadecimalCharRef, // unterminated,
  [hexadecimalCharRef]:        T.hexadecimalCharRef, // unterminated,
  [markupDeclarationOpen]:     T.beginBogusComment,
  [markupDeclarationOpenDash]: T.beginBogusComment,
  [namedCharRef]:              T.namedCharRef,
  [numericCharRef]:            T.bogusCharRef,
  [selfClosingStartTag]:       T.space, // Actually, a slash-space,
  [plaintext]:                 T.plaintext,
  [rawtext]:                   T.rawtext,
  [rcdata]:                    T.rcdata,
  [lessThanSignIn_]:           T.endTagPrefix,
  [tagName]:                   T.tagName,
  [tagOpen]:                   T.lessThanSign,
}


// And finally, the Lexer class

class Lexer {

  constructor (delegate) {
    this.delegate = delegate
    this.init ()
  }
  
  init () {
    this.state = data /* state name */
    this.returnState = data /* return state used by charRef(In_) and endTagOpenIn_ states */
    this.tagName = '#document' /* last seen open tag */
    this.tagType = null
    this.quotation = null /* attribute value quotation style, can be '', '"' or "'" */
    this.prefixCount = 0 /* used in rawtext and rcdata to compare tentative endTags to tagName */
    this.position = { line:1, column:0 } /* over-all line/ column position */
    this._remains = '' /* possible leftovers from previous write call */
  }

  write (chunk) {
    let start = 0, p = 0

    if (this._remains) {
      chunk = this._remains + chunk
      p = this._remains.length
      this._remains = null
    }
    
    // Right, eeh. so resetting emit here in order to
    //  keep p private in an unverified assumption that it is faster. 

    this.emit = function (type, ...rest) {
      this._emit (type, chunk.substring (start, p), ...rest)
      start = p
    }
    
    this.emitInclusive = function (type, ...rest) {
      this._emit (type, chunk.substring (start, p+1), ...rest)
      start = p+1
    }

    const l = chunk.length
    while (p < l) {
      const char = chunk [p]

      // Count global line/ column position
      // TODO treat CR, LF, CRLF as a single LF. (Also in output ?? Noo..)
      // Furthermore, output them as a separate tokens, please. 

  		if (char === '\r' || char === '\n') {
  		  this.position.line ++
        this.position.column = 0
      }
  
      let r = this [this.state] (char)
      if (r !== false) {
        p++
  			this.position.column ++
      }
    }
    if (start < l)
      this._remains = chunk.substring (start)
  }

  end (chunk = null) {
    if (chunk) this.write (chunk)
    // And emit the rest as specified in token_map
    let type = token_map [this.state]
    if (type) this._emit (type, this._remains, {})
    this.delegate.end ()
    this.init () /* re-init for reuse */
  }

  _emit (type, data, ...mods) {
    if (type === T.namedCharRef) {
      for (let token of splitCharRef (data, mods[0].inAttribute, mods.nextChar))
        this.delegate.write (token)
    }
    else
      this.delegate.write ([type, data, ...mods])
  }


  // All methods that follow implement specific named lexer states. 

  // The `content` state doesn't occur in the html5 spec. It functions as
  // an intermediate state for implementing support for rawtext / rcdata
  // elements without requiring a full parser phase. It does not consume. 

  // These methods are assumed to 'consume' their input character by default,
  //  however, they may choose to signal that they did not by returning false. 

  [content] (char) {
  	this.state = this.tagType === startTag && this.tagName in content_map
  		? content_map [this.tagName] : data
    return false
  }

  [data] (char) {
  	if (char === '<') {
  		this.emit (T.data)
  		this.state = tagOpen
  	}
  	else if (char === '&') {
  		this.emit (T.data)
      this.returnState = data
  		this.state = charRef
  	}
    // TODO tokenize newlines separately
  }

  // reached after a `<` symbol in html-data. 
  [tagOpen] (char) {
  	if (char === '!') {
  		this.state = markupDeclarationOpen
  	}
  	else if (char === '/') {
  		this.state = endTagOpen
  	}
  	else if (ALPHA.test (char)) {
  		this.emit (T.beginStartTag)
  		this.state = tagName
  			this.tagType = startTag
  			this.tagName = char.toLowerCase()
  	}
  	else if (char === '?') {
  		this.emitInclusive (T.beginBogusComment, { error:'invalid tag opening \'<?\'' })
  		this.state = bogusComment
  	}
  	else {
  		this.emit (T.lessThanSign, { error:'unescaped less-than sign' })
  		if (char === '<') {
  		}
  		else if (char === '&') {
  			this.returnState = data
  			this.state = charRef
  		}
  		else {
  			this.state = data
  		}
  	}
  }

  // The `tagName` state is reached after an alphabetic character
  // that trails `<` or `</`. We stay in this state until
  // whitespace, `/` or `>` is encountered. 

  [tagName] (char) {
  	if (SPACE.test (char)) {
  		this.emit (T.tagName)
  		this.state = beforeAttributeName
  	}
  	else if (char === '/') {
  		this.emit (T.tagName)
  		this.state = selfClosingStartTag
  	}
  	else if (char === '>') {
  		this.emit (T.tagName)
  		this.emitInclusive (T.finishTag)
  		this.state = content
  	}
  	else {
  		this.p++
  		// The following is a bit of a hack, used in `content`,
  		// for supporting rcdata and rawtext elements
  		if (this.tagType === startTag)
  			this.tagName = this.tagName + char.toLowerCase ()
  	}
  }

  // reached after the `/` symbol within tags
  [selfClosingStartTag] (char) {
  	if (char === '>') {
  		this.emitInclusive (T.finishSelfClosingTag)
  		this.state = data
  	}
  	else if (SPACE.test (char) || char === '/') {
  	}
  	else {
  		this.emit (T.space)
  		this.state = attributeName
  	}
  }

  // reached after `</`
  [endTagOpen] (char) {
  	if (ALPHA.test (char)) {
  		this.emit (T.beginEndTag)
  		this.state = tagName
  			this.tagType = endTag
  			this.tagName = ''
  	}
  	else if (char === '>') {
  		this.emit (T.beginBogusComment, { error:'invalid comment' })
  		this.emitInclusive (T.finishBogusComment)
  		this.state = data
  	}
  	else {
  		this.emit (T.beginBogusComment, { error:'invalid comment (may be a malformed end tag)' })
  		this.state = bogusComment
  	}
  }

  // Attribute names may start with anything except space, `/`, `>`
  // subsequent characters may be anything except space, `/`, `=`, `>`.	 
  // e.g. ATTRNAME = `/^[^\t\n\f />][^\t\n\f /=>]*$/`

  [beforeAttributeName] (char) {
  	if (SPACE.test (char)) {
  	}
  	else if (char === '/') {
  		this.emit (T.space)
  		this.state = selfClosingStartTag
  	}
  	else if (char === '>') {
  		this.emit (T.space)
  		this.emitInclusive (T.finishTag)
  		this.state = content
  	}
  	else {
  		this.emit (T.space)
  		this.state = attributeName
  	}
  }

  [attributeName] (char) {
  	if (SPACE.test (char)) {
  		this.emit (T.attributeName)
  		this.state = afterAttributeName
  	}
  	else if (char === '/') {
  		this.emit (T.attributeName) // Stand alone attribute
  		this.state = selfClosingStartTag
  	}
  	else if (char === "=") { // attribute with value
  		this.emit (T.attributeName)
  		this.state = beforeAttributeValue
  	}
  	else if (char === '>') {
  		this.emit (T.attributeName) // Stand alone attribute
  		this.emitInclusive (T.finishTag)
  		this.state = content
  	}
  	else {
  	}
  }

  [afterAttributeName] (char) {
    if (SPACE.test (char)) {
  	}
  	else if (char === '/') {
  		this.emit (T.space) /* was a standalone attribute */
  		this.state = selfClosingStartTag
  	}
  	else if (char === "=") { // attribute with value
  		this.state = beforeAttributeValue
  	}
  	else if (char === '>') {
  		this.emit (T.space) /* was a standalone attribute */
  		this.emitInclusive (T.finishTag)
  		this.state = content
  	}
  	else {
  		this.emit (T.space) /* was a standalone attribute */
  		this.state = attributeName
  	}
  }

  // reached after the `=` sign after an attribute name 
  // NB trailing space is (at the moment) seen as part of the equals token
  [beforeAttributeValue] (char) {
  	if (SPACE.test (char)) {
  	}
  	else if (char === '"' || char === "'") {
  		this.emit (T.attributeAssign)
  		this.state = attributeData
  			this.quotation = char
  		this.emitInclusive (T.beginAttributeValue)
  	}
  	else if (char === '>') {
  		this.emit (T.attributeAssign)
  		this.emit (T.beginAttributeValue)
  		this.emit (T.attributeData, { error:'missing attribute value' })
  		this.emit (T.finishAttributeValue)
  		this.emitInclusive (T.finishTag)
  		this.state = content
  	}
  	else if (char === '&') {
  		this.emit (T.attributeAssign)
  		this.emit (T.beginAttributeValue)
        this.quotation = ''
        this.returnState = attributeData
  		this.state = charRef
    }
  	else {
  		this.emit (T.attributeAssign)
  		this.emit (T.beginAttributeValue)
  		this.state = attributeData
  			this.quotation = ''
  		if (char === '<' || char === '=' || char === '`')
  		  this.emit (T.attributeData, { error: 'attribute values must not start with a ('+char+') character'})
  	}
  }

  [attributeData] (char) {
  	if (char === '&') {
  		this.emit (T.attributeData)
      this.returnState = attributeData
  		this.state = charRef
  	}
  	else if (char === this.quotation) {
  		this.emit (T.attributeData)
  		this.emitInclusive (T.finishAttributeValue)
  		this.state = afterAttributeValueQuoted
  	}
  	else if (this.quotation === '' && SPACE.test (char)) {
  		this.emit (T.attributeData)
  		this.emit (T.finishAttributeValue)
  		this.state = beforeAttributeName
  	}
  	else if (this.quotation === '' && char === '>') {
  		this.emit (T.attributeData)
  		this.emit (T.finishAttributeValue)
  		this.emitInclusive (T.finishTag)
  		this.state = content
  	}
  	else {
  	}
  }

  [afterAttributeValueQuoted] (char) {
  	if (SPACE.test (char)) {
  		this.state = beforeAttributeName
  	}
  	else if (char === '/') {
  		this.state = selfClosingStartTag
  	}
  	else if (char === '>') {
  		this.emitInclusive (T.finishTag)
  		this.state = content
  	}
  	else {
  		this.emit (T.space, { error:'missing space after attribute' })
  		this.state = attributeName
  	}
  }

  // ### Markup declaration

  // reached after `<!`
  [markupDeclarationOpen] (char) {
    if (char === '-') {
      // The spec uses a one character lookahead here,
      // I use an additional state 'markupDeclarationOpenDash' instead
  		this.state = markupDeclarationOpenDash
  	}
  	// TWO cases are omitted here: doctype tags and cdata sections
  	//	those will be tokenized as bogus comments instead. 
  	else if (char === '>') {
  		this.emit (T.beginBogusComment, { error:'invalid comment' })
  		this.emitInclusive (T.finishBogusComment)
  		this.state = data
  	}
  	else {
  		this.emit (T.beginBogusComment, { error: 'invalid comment (may be an unhandled markup declaration)'})
  		this.state = bogusComment
  	}
  }

  // reached after `<!-`
  [markupDeclarationOpenDash] (char) {
  	if (char === '-') {
  		this.emitInclusive (T.beginComment)
  		this.state = commentStart
  	}
  	else {
  		this.emit (T.beginBogusComment, { error: 'invalid comment (comments should start with <!--)'})
  		this.state = bogusComment
  	}
  }

  // ### Comments

  // reached after `<!--`
  [commentStart] (char) {
    if (char === '-') {
  		this.state = commentStartDash
  	}
  	else if (char === '>') {
  		this.emitInclusive (T.finishComment)
  		this.state = data
  	}
  	else {
  		this.state = comment
  	}
  }

  // reached after `<!---`
  [commentStartDash] (char) {
  	if (char === '-') {
  		this.state = commentEnd
  	}
  	else if (char === '>') {
  		this.emitInclusive (T.finishComment)
  		this.state = data
  	}
  	else {
  		this.state = comment
  	}
  }

  [comment] (char) {
  	if (char === '-') {
  		this.emit (T.commentData)
  		this.state = commentEndDash
  	}
  	else {
  	}
  }

  // reached after `-` in a comment
  [commentEndDash] (char) {
    if (char === '-') {
  		this.state = commentEnd
  	}
  	else {
  		this.state = comment
  	}
  }

  // reached after `--` in a comment
  [commentEnd] (char) {
  	if (char === '>') {
  		this.emitInclusive (T.finishComment)
  		this.state = data
  	}
  	else if (char === "!") {
  		// This is a parse error, will be reported in the next state
  		this.state = commentEndBang
  	}
  	else {
  		this.emit (T.commentData, { error:'comment data should not contain --'})
  		this.state = comment
  	}
  }

  // reached after `--!` in a comment
  [commentEndBang] (char) {
  	if (char === '-') {
  		this.emit (T.commentData, { error:'comment data should not contain --!'})
  		this.state = commentEndDash
  	}
  	else if (char === '>') {
  		this.emitInclusive (T.finishComment, { error:'comment should end with -->' })
  		this.state = data
  	}
  	else {
  		this.emit (T.commentData, { error:'comment data should not contain --!'})
  		this.state = comment
  	}
  }

  [bogusComment] (char) {
  	if (char === '>') {
  		this.emit (T.bogusCommentData)
  		this.emitInclusive (T.finishBogusComment)
  		this.state = data
  	}
  	else {
  	}
  }


  // ### RAWTEXT, RCDATA and PLAINTEXT states
  // Raw text may contain anything except the beginnings of an
  // end tag for the current element. Raw text cannot be escaped. 
  // The only rawtext elements in the HTML5 specification are
  // 'script' and 'style'. 
  // Rcdata may contain anyting like rawtext, but can be escaped,
  // that is, it may contain character references. 
  // Plaintext may contain anything, nothing can be escaped, and
  // does not have an endtag. 

  [plaintext] (char) {
  }

  [rawtext] (char) {
  	if (char === '<') {
  		this.emit (T.rawtext)
      this.returnState = rawtext
  		this.state = lessThanSignIn_
  	}
  	else {
  	}
  }

  [rcdata] (char) {
  	if (char === '<') {
  		this.emit (T.rcdata)
      this.returnState = rcdata
  		this.state = lessThanSignIn_
  	}
  	else if (char === '&') {
  		this.emit (T.rcdata)
      this.returnState = rcdata
  		this.state = charRef
  	}
  	else {
  	}
  }

  [lessThanSignIn_] (char) {
  	if (char === '/') {
  		this.state = endTagOpenIn_
  		this.tagType = endTag
  		this.prefixCount = 0
  	}
  	else {
  		this.emit (T.endTagPrefix)
  		this.state = this.returnState
  	}
  }

  // More fine-grained than the specification,
  // I am emitting 'endTagPrefix' tokens, which may be useful 
  // for escaping/ safe interpolation. 

  [endTagOpenIn_] (char) {
  	if (this.prefixCount < this.tagName.length) {
  		if (char.toLowerCase () === this.tagName [this.prefixCount]) {
  			this.prefixCount++
  		}
  		else {
  			this.emit (T.endTagPrefix)
  			this.state = this.returnState
  		}
  	}
  	else if (SPACE.test (char)) {
  		this.emit (T.beginEndTag)
  		this.state = beforeAttributeName
  	}
  	else if (char === '/') {
  		this.emit (T.beginEndTag)
  		this.state = selfClosingStartTag
  	}
  	else if (char === '>') {
  		this.emit (T.beginEndTag)
  		this.emitInclusive (T.finishTag)
  		this.state = data
  	}
  	else {
  		this.emit (T.endTagPrefix)
  		this.state = this.returnState
  	}
  }


  // ### Character references

  // reached after `&` in data, rcdata or attribute data
  [charRef] (char) {
  	if (char === '#') {
  		this.state = numericCharRef
  	}
  	else if (ALPHANUM.test (char)) {
  		this.state = namedCharRef
  	}
  	else {
  		this.emit (T.bogusCharRef)
  		this.state = this.returnState
      return false /* Branch does not consume */
  	}
  }

  // reached after `&#`
  [numericCharRef] (char) {
  	if (char === 'x' || char === 'X') {
  		this.state = hexadecimalCharRef
  	}
  	else if (DIGITS.test (char)) {
  		this.state = decimalCharRef
  	}
  	else {
  		this.emit (T.bogusCharRef)
  		this.state = this.returnState
      return false /* Branch does not consume */
  	}
  }

  [decimalCharRef] (char) {
  	if (DIGITS.test (char)) {
  	}
  	else if (char === ';') {
  		this.emitInclusive (T.decimalCharRef)
  		this.state = this.returnState
  	}
  	else {
  		this.emit (T.decimalCharRef, { error:'unterminated decimal character reference' })
  		this.state = this.returnState
      return false /* Branch does not consume */
  	}
  }

  // reached after `&#x` or `&#X`
  [hexadecimalCharRef] (char) {
  	if (HEXDIGITS.test (char)) {
  		this.state = hexDigits
  	}
  	else {
  		this.emit (T.bogusCharRef)
  		this.state = this.returnState
      return false /* Branch does not consume */
  	}
  }

  [hexDigits] (char) {
  	if (HEXDIGITS.test (char)) {
  	}
  	else if (char === ';') {
  		this.emitInclusive (T.hexadecimalCharRef)
  		this.state = this.returnState
  	}
  	else {
  		this.emit (T.hexadecimalCharRef, { error:'unterminated hexadecimal character reference' })
  		this.state = this.returnState
      return false /* Branch does not consume */
  	}
  }

  [namedCharRef] (char) {
    // TODO, so the max length of named refs is 32
    // so it's an idea to cut it off after that and let emit handle the splitting/ fixup
  	if (ALPHANUM.test (char)) {
  	}
  	else if (char === ';') {
  		this.emitInclusive (T.namedCharRef, { inAttribute: this.returnState === attributeData })
  		this.state = this.returnState
  	}
  	else {
  		this.emit (T.namedCharRef, { inAttribute: this.returnState === attributeData, nextChar:char })
  		this.state = this.returnState
      return false /* Branch does not consume */
  	}
  }

}


// ## Support for legacy character references,

// 'Special' character references are named character references that may 
// occur without a terminating semicolon. 

// `SPECIALS` and `PREFIXED` result from preprocessing the table of all
// entity names in the HTML5 specification, specifically, by selecting
// 1. The names that may occur without a terminating semicolon (specials). 
// 2. Semicolon terminated names that have a special as a prefix (prefixeds).

const SPECIALS = /^&([AEIOUYaeiouy]?acute|[AEIOUaeiou](?:grave|circ|uml)|y?uml|[ANOano]tilde|[Aa]ring|[Oo]slash|[Cc]?cedil|brvbar|curren|divide|frac(?:12|14|34)|iquest|middot|plusmn|(?:AE|ae|sz)lig|[lr]aquo|iexcl|micro|pound|THORN|thorn|times|COPY|copy|cent|macr|nbsp|ord[fm]|para|QUOT|quot|sect|sup[123]|AMP|amp|ETH|eth|REG|reg|deg|not|shy|yen|GT|gt|LT|lt)(;|.*)/

const PREFIXED = /^&(?:copysr|centerdot|divideontimes|[gl]t(?:quest|dot|cir|cc)|[gl]trPar|gtr(?:dot|less|eqqless|eqless|approx|arr|sim)|ltr(?:i|if|ie|mes)|ltlarr|lthree|notin(?:dot|E|v[abc])?|notni(?:v[abc])?|parallel|times(?:bar|d|b));/


// TODO clean this up a bit

function splitCharRef (string, inAttribute, nextChar) {

	// A semicolon terminated, known charref
	if (PREFIXED.test (string))
		return [[T.namedCharRef, string]]

	// Test 'special' charrefs (terminated or nonterminated)
	var r = SPECIALS.exec (string)
  var terminated = string[string.length-1] === ';'

	// Not a special charref, nor one with trailing alphanums
	if (!r) return (terminated // TODO check this
      ? [['unresolvedNamedCharRef', string]]
      : [[inAttribute ? T.attributeData : 'data', string]])

  // A semicolon terminated special charref
  if (r[2] === ';')
		return [[T.namedCharRef, '&'+r[1]+';']]

	// A nonterminated special charref (exact match)
	if (r[2] === '')
    return (!inAttribute || nextChar !== '=')
		  ? [[T.legacyCharRef, string]] // And also a parse error
		  : [[T.attributeData, string]]

	// A nonterminated special charref with trailing alphanums
  // NB Splitting should always produce a parse error
  else return (!inAttribute)
		? [[T.legacyCharRef, '&'+r[1]], ['data', r[2]]]
		: [[T.attributeData, string]]

}


module.exports = Lexer