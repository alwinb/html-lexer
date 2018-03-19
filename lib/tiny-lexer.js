"use strict"
module.exports = lex
const log = console.log.bind (console)

// tiny-lexer
// ==========
// An attempt to implement a HTML5 compliant lexer that is tiny,
// The idea is that the lexical grammar can be very compactly expressed by a 
// state machine that has transitions that are labeled with regular expressions
// rather than individual characters. 

// The grammar
// -----------

// Additional state magagement on transitions

const content_map = 
{ style: 'rawtext'
, script: 'rawtext'
, xmp: 'rawtext'
, iframe: 'rawtext'
, noembed: 'rawtext'
, noframes: 'rawtext'
, textarea: 'rcdata'
, title: 'rcdata'
, plaintext: 'plaintext'
//, noscript: 'rawtext' // if scripting is enabled in a UA..., else data
}


function CustomState () {
  this.content = 'data' // data, rcdata or rawtext, valueUnQuoted, valueQuoted
  this.tagName // the last seen 'beginStartTag' 
}

function startTag (_, chunk) {
  let tagName = chunk.substr (1)
  this.tagName = tagName
  this.content = tagName in content_map ? content_map[tagName] : 'data'
  return 'beforeAttribute'
}

function content () {
  return this.content
}

function maybeEndTagT (symbol, chunk) {
  if (chunk.substr (2) === this.tagName) {
    this.content = 'data'
    return ['beginEndTag', chunk] }
  else return [this.content, chunk]
}

function maybeEndTag (symbol, chunk) {
  if (chunk.substr (2) === this.tagName) {
    this.content = 'data'
    return 'beforeAttribute' 
  }
  else return symbol
}

function charRefIn (symbol, chunk) {
  this.content = symbol
  return 'charRef'
}

// The rules

const BEGIN_START_TAG = '<[a-zA-Z][^>/\\t\\n\\f ]*'
const BEGIN_END_TAG = '</[a-zA-Z][^>/\\t\\n\\f ]*'
const HEX_CHARREF = '&#[xX][0-9A-Fa-f]+;?'

const grammar = 
{ data: 
	[ { if: BEGIN_START_TAG, emit:'beginStartTag',     goto: startTag }
	, { if: BEGIN_END_TAG,   emit:'beginEndTag',       goto:'beforeAttribute' }
	, { if: '<!--',          emit:'beginComment',      goto:'commentStart' }
	, { if: '</|<!|<\\?',    emit:'beginBogusComment', goto:'bogusComment' }
	, { if: '[^<&]+',        emit:'data' }
	, { if: '<',             emit:'unescapedLessThan' }
	, { emit:'data', goto: charRefIn }
	],

rawtext:
  [ { if: BEGIN_END_TAG , emit: maybeEndTagT,  goto: maybeEndTag }
  , { if: '.[^<]*'      , emit:'rawtext' }
  ],

rcdata:
  [ { if: BEGIN_END_TAG, emit: maybeEndTagT, goto: maybeEndTag }
	, { if: '<',           emit:'unescapedLessThan' }
	, { if: '[^<&]+',      emit:'rcdata' }
	, { emit:'rcdata', goto: charRefIn }
  ],

plaintext: 
	[ { if:'.+', emit:'plaintext', goto:'plaintext' }
	], 

charRef:
  [ { if: '&#[0-9]+;?',      emit:'decimalCharRef',     goto: content }
	, { if: HEX_CHARREF,       emit:'hexadecimalCharRef', goto: content }
	, { if: '&[A-Za-z0-9]+;?', emit:'maybeNamedCharRef',  goto: content }
	, { if: '&',               emit:'unescapedAmpersand', goto: content }
	],

beforeAttribute:
	[ ['>'                 , 'finishTag'    , content ]
	, ['/>'                , 'finishSelfClosingTag', content ]
	, ['[/\\t\\n\\f ]+'    , 'space'        , 'beforeAttribute'   ]
	, ['.[^>/\\t\\n\\f =]*', 'attributeName', 'afterAttributeName']
	],

// '[^>/\\t\\n\\f ][^>/\\t\\n\\f =]*' (ATTRIBUTE NAME)
afterAttributeName:
	[ ['>'                 , 'finishTag'     , content ]
	, ['/>'                , 'finishSelfClosingTag', content ]
	, ['/+'                , 'space'         , 'beforeAttribute'    ]
	, ['[\\t\\n\\f ]+'     , 'space'         , 'afterAttributeName' ]
	, ['=[\\t\\n\\f ]*'    , 'equals'        , 'attributeValue'     ]
	, ['.[^>/\\t\\n\\f =]*', 'attributeName' , 'afterAttributeName' ]
	],

attributeValue: // 'equals' has eaten all the space
	[ { if: '>' , emit:'finishTag'           , goto: content            }
	, { if: '"' , emit:'beginAttributeValue' , goto:'valueDoubleQuoted' }
	, { if: "'" , emit:'beginAttributeValue' , goto:'valueSingleQuoted' }
	, {           emit:'beginAttributeValue' , goto:'valueUnQuoted'     }
	],

// TODO emit finishAttribute token for unquoted attributes
valueUnQuoted:
	[ { if: '>'               , emit:'finishTag',     goto:content           }
	, { if: '[\\t\\n\\f ]+'   , emit:'space',         goto:'beforeAttribute' }
	, { if: '[^&>\\t\\n\\f ]+', emit:'attributeData'                         }
	, {                         emit:'attributeData', goto: charRefIn        }
	],

valueDoubleQuoted:
	[ { if: '[^"&]+', emit:'attributeData' }
	, { if: '"',      emit:'finishAttributeValue', goto:'beforeAttribute' }
	, { emit:'attributeData', goto: charRefIn }
	],

valueSingleQuoted:
	[ ["[^'&]+", 'attributeData' ]
	, ["'"     , 'finishAttributeValue' , 'beforeAttribute' ]
	, { emit:'attributeData', goto: charRefIn }
  ],

bogusComment:
	[ [ '[^>]+' , 'commentData','bogusComment']
	, [ '>'     , 'finishBogusComment', content]
	],

commentStart:
	[ [ '-?>'        , 'finishComment', content   ]
	, [ '--!?>'      , 'finishComment', content   ]
	, [ '--!'        , 'commentData'  , 'comment' ]
	, [ '--?'        , 'commentData'  , 'comment' ]
	, [ '[^>-][^-]*' , 'commentData'  , 'comment' ]
	],

comment:
  [ ['--!?>', 'finishComment', content   ]
  , ['--!'  , 'commentData' ]
  , ['--?'  , 'commentData' ]
  , ['[^-]+', 'commentData' ]
  ],

}


// The compiler and runtime
// ------------------------
// Since the javascript RegExp object allows reading and writing the position
// of reference in the input string, it is possible to represent each state by
// a single RegExp object with capture groups. The capture groups then
// correspond to the transitions. 

function State (table, name) {
	this.regex = new RegExp ('(' + table.map (fst) .join (')|(') + ')', 'g')
	this.edges = table.map ( fn )
  function fn (row) {
    if (row instanceof Array)
    return { goto:row.length > 2 ? row[2] : name, emit: row[1] }
    else return { goto:'goto' in row ? row.goto : name, emit: 'emit' in row ? row.emit : null }
    //return { emit:row.emit goto:row.goto }
  }
}

function compile (grammar) {
	const compiled = {}
	for (let state_name in grammar)
		compiled [state_name] = new State (grammar [state_name], state_name)
	return compiled
}

function fst (row) {
  if (row instanceof Array) return row[0]
  else return ('if' in row) ? row ['if'] : '.{0}'
}



// The Lexer
// ---------
// A token iterator

function Lexer (input, customState) {
	let symbol = 'data' // The state name
    , states = compile (grammar)
    , position = 0
		, self = this

  this.value
  this.done = false
  this.next = next
  this[Symbol.iterator] = _ => this // That should create a copy instead, or be up one level

	function next () {
    if (states [symbol] == null) 
      throw new Error ('Lexer: no such symbol: '+symbol)

    let state = states [symbol]
      , regex = state.regex

    regex.lastIndex = position
		let r = regex.exec (input)
    // log (position, r)

		if (r == null) { // FIXME end at EOF only, else emit error? or throw it?
      self.value = '' // Or even specify that explicitly in the grammar?
      self.done = true
			return self
    }

    // TODO take care not to skip chars!
		position = regex.lastIndex
    let i = 1; while (r[i] == null) i++
    
    // TODO use substr instead? To coalesce ?
    // That would be slow, no?
    let edge = state.edges [i-1]
      , chunk = r[i]

    self.value = (typeof edge.emit === 'function')
      ? edge.emit.call (customState, symbol, chunk) // output token
      : [edge.emit, chunk]

    symbol = (typeof edge.goto === 'function')
      ? edge.goto.call (customState, symbol, chunk)
      : edge.goto

    return self
	}
}


function lex (input) {
  return new Lexer (input, new CustomState ())
}

