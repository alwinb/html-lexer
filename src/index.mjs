const log = console.log.bind (console)
const { defineProperties:define } = Object

// Imports - DFA
// -------------

import DFA from './dfa.mjs'
const { eqClass, defaultClass, tokens:T, states:S, initialState, table, minAccepts } = DFA
const FAIL = 0
const errorToken = 0


// TokenTypes
// ----------

// This maps the DFA tokenTypes from ints to strings;
// It renames some of the token-types to maintain some
// compatibility with previous versions of html-lexer.

const names = []
for (const k in T) names[T[k]] = k
names [T.unquoted]       = 'attributeValueData'
names [T.quoted]         = 'attributeValueData'
names [T.squoted]        = 'attributeValueData'
names [T.attributeSep]   = 'tagSpace'
names [T.valueStartApos] = 'attributeValueStart'
names [T.valueStartQuot] = 'attributeValueStart'
names [T.valueEnd]       = 'attributeValueEnd'
names [T.bogusStart]     = 'commentStartBogus'
names [T.bogusData]      = 'commentData'
names [T.bogusEnd]       = 'commentEndBogus'
names [T.lt]             = 'lessThanSign'
names [T.ampersand]      = 'uncodedAmpersand'

const tokenTypes = {}
for (const x of names) tokenTypes[x] = x
delete tokenTypes.errorToken
delete tokenTypes.mDeclStart


// Lexer / Push Parser
// -------------------

function Lexer (delegate) {

  // State

  let buffer = ''
  let closed = false               // true after end() call
  let line = 1, lastnl = 0, _c = 0 // line counter
  let anchor = 0, end = 0, pos = 0 // lexer position
  let entry = S.Main               // lexer (entry) state-id
  let lastTagType = 0
  let lastStartTagName = ''
  
  // API

  return define (this, {
    position: { get:getPosition },
    write:    { value: write,    hidden:true },
    end:      { value: writeEOF, hidden:true },
    parse:    { value: writeEOF, hidden:true }
  })

  // Public methods

  function write (input) {
    buffer += input
    const length = buffer.length
    while (pos < length) {
      let state = entry
      let exit = entry < minAccepts ? FAIL : entry
      do {
        const c = buffer.charCodeAt(pos++)
        state = table [state] [c <= 0x7a ? eqClass[c] : defaultClass]
        if (minAccepts <= state) (exit = state, end = pos)
        // Newline counter
        if (c === 0xD || c === 0xA) (lastnl = pos, line += (_c !== 0xD));
        _c = c
      } while (state && pos < length)

      if (end < buffer.length || closed)
        emit (table [exit] [0], anchor, end)
      else {
        pos = end = anchor
        break
      }
    }
    buffer = buffer.substr (end)
    anchor = pos = end = 0
  }

  function writeEOF (input = '') {
    closed = true
    write (input)
    delegate.end ()
  }

  // Private methods

  function getPosition () {
    return { line, column: pos-lastnl }
  }

  function emit (type, anchor_, end_) {
    // log ('emit', {buffer, l:buffer.length, anchor_, end_, closed })
    switch (type) {

      case errorToken: {
        const message = `Lexer error at line ${line}:${pos-lastnl}`
        throw new SyntaxError (message)
      } break
    
      case T.startTagStart: {
        const tagName = buffer.substring (anchor+1, end_)
        lastTagType = type
        lastStartTagName = tagName.toLowerCase ()
        delegate.write (['startTagStart', '<'])
        delegate.write (['tagName', tagName])
        entry = S.BeforeAttribute
        return anchor = pos = end_ // NB returns
      }

      case T.endTagStart: {
        const tagName = buffer.substring (anchor+2, end_)
        lastTagType = type
        if (entry === S.Main || lastStartTagName === tagName.toLowerCase ())
          entry = S.BeforeAttribute
        else entry === S.RcData ? T.rcdata : T.rawtext
        delegate.write (['endTagStart', '</'])
        delegate.write (['tagName', tagName])
        return anchor = pos = end_ // NB returns
      }

      case T.mDeclStart: {
        entry = S.Bogus;
        delegate.write ([names[T.bogusStart], '<!'])
        delegate.write ([names[T.bogusData], buffer.substring (anchor+2, end_)])
        return anchor = pos = end_ // NB returns
      }

      case T.tagEnd: {
        const xmlIsh = false // needs the feedback // TODO support SVG / MathML
        entry = lastTagType === T.startTagStart && !xmlIsh ? contentMap [lastStartTagName] || S.Main : S.Main
        const ttype = buffer[end_ - 2] === '/' ? 'tagEndAutoclose' : 'tagEnd'
        delegate.write ([ttype, buffer.substring (anchor, end_)])
        return anchor = pos = end_ // NB returns
      }

      case T.charRefNamed:
      case T.charRefLegacy: {
        const nextChar = buffer[end_]  // FIXME case at buffer end ? need to back up...
        const parts = splitCharRef (buffer.substring (anchor, end_), entry, nextChar)
        for (const item of parts) delegate.write (item)
        return anchor = pos = end_ // NB returns
      }

      case T.attributeSep:    entry = S.BeforeAttribute;   break
      case T.attributeName:   entry = S.BeforeAssign;      break
      case T.attributeAssign: entry = S.BeforeValue;       break
      case T.valueStartQuot:  entry = S.ValueQuoted;       break
      case T.valueStartApos:  entry = S.ValueAposed;       break
      case T.valueEnd:        entry = S.BeforeAttribute;   break
      case T.unquoted:        entry = S.ValueUnquoted;     break
      case T.commentStart:    entry = S.BeforeCommentData; break
      case T.commentData:     entry = S.InCommentData;     break
      case T.commentEnd:      entry = S.Main;              break
      case T.bogusStart:      entry = S.Bogus;             break
      case T.bogusData:       entry = S.Bogus;             break
      case T.bogusEnd:        entry = S.Main;              break
      // case T.newline:      entry = entry;               break
    }
    const name = names [type]
    delegate.write ([name, buffer.substring (anchor, end_)])
    anchor = pos = end_
  }

}

// The contentMap defines the lexer state to use 
// immediately _after_ specific html start-tags.

const contentMap = {
  style:     S.RawText,
  script:    S.RawText,
  xmp:       S.RawText,
  iframe:    S.RawText,
  noembed:   S.RawText,
  noframes:  S.RawText,
  textarea:  S.RcData,
  title:     S.RcData,
  plaintext: S.PlainText
  // noscript: scriptingEnabled ? S.RawText : S.Main
}


// Legacy Character References
// ---------------------------

// Legacy character references are named character references that
// may occur without a terminating semicolon.

// `LEGACY` and `PREFIXED` result from preprocessing the table of all
// entity names in the HTML5 specification, specifically, by selecting
// 1. The names that may occur without a terminating semicolon.
// 2. Semicolon terminated names that have a legacy name as a prefix.

const LEGACY = /^&([AEIOUYaeiouy]?acute|[AEIOUaeiou](?:grave|circ|uml)|y?uml|[ANOano]tilde|[Aa]ring|[Oo]slash|[Cc]?cedil|brvbar|curren|divide|frac(?:12|14|34)|iquest|middot|plusmn|(?:AE|ae|sz)lig|[lr]aquo|iexcl|micro|pound|THORN|thorn|times|COPY|copy|cent|macr|nbsp|ord[fm]|para|QUOT|quot|sect|sup[123]|AMP|amp|ETH|eth|REG|reg|deg|not|shy|yen|GT|gt|LT|lt)(;|.*)$/
const PREFIXED = /^&(?:copysr|centerdot|divideontimes|[gl]t(?:quest|dot|cir|cc)|[gl]trPar|gtr(?:dot|less|eqqless|eqless|approx|arr|sim)|ltr(?:i|if|ie|mes)|ltlarr|lthree|notin(?:dot|E|v[abc])?|notni(?:v[abc])?|parallel|times(?:bar|d|b));$/

function splitCharRef (string, entry, nextChar) {

  // A semicolon-terminated, known charref
  if (PREFIXED.test (string))
    return [['charRefNamed', string]]

  // Test legacy charrefs (terminated or nonterminated)
  const r = LEGACY.exec (string)
  const terminated = string[string.length-1] === ';'

  const dataTokenType
    = entry === S.Main   ? 'data'
    : entry === S.RcData ? 'rcdata' : 'attributeValueData'

  // Not a special charref, nor one with trailing alphanums
  if (!r) return (terminated
      ? [['charRefNamed', string]]
      : [[dataTokenType, string]])

  // A semicolon terminated legacy charref
  if (r[2] === ';')
    return [['charRefNamed', '&'+r[1]+';']]

  const inAttribute
    =  entry === S.BeforeValue
    || entry === S.ValueQuoted
    || entry === S.ValueAposed
    || entry === S.ValueUnquoted
  // A nonterminated legacy charref (exact match)
  if (r[2] === '')
    return (!inAttribute || nextChar !== '=')
      ? [['charRefLegacy', string]] // And also a parse error
      : [[dataTokenType, string]]

  // A nonterminated legacy charref with trailing alphanums
  else return (!inAttribute)
    ? [['charRefLegacy', '&'+r[1]], [dataTokenType, r[2]]]
    : [[dataTokenType, string]]
}


// Exports
// -------

export { DFA, tokenTypes, Lexer }