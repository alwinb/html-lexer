"use strict"
module.exports = lex
var log = console.log.bind (console)

// tiny-lexer
// ==========
// An attempt to implement a HTML5 compliant lexer that is tiny,
// The idea is that the lexical grammar can be very compactly expressed by a 
// state machine that has transitions that are labeled with regular expressions
// rather than individual characters. 

// The grammar
// -----------

// Additional state magagement on transitions

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

function content () {
  var tag = this.tagName
  return tag && (tag in content_map) ? content_map[tag] : 'data'
}

function endTagIn (symbol) { 
  return function (_, chunk) {
    return chunk.substr (2) !== this.tagName ? symbol : 'beforeAttribute'
  }
}

function context () {
  return this.context
}

function startTag (_, chunk) {
  this.tagName = chunk.substr (1)
  return 'beforeAttribute'
}

function charRefIn (symbol) {
  return function () {
    this.context = symbol
    return 'charRef'
  }
}

// The rules

var BEGIN_START_TAG = '<[a-zA-Z][^>/\\t\\n\\f ]*'
var BEGIN_END_TAG   = '</[a-zA-Z][^>/\\t\\n\\f ]*'

var grammar = 
{ data: 
	[ [ BEGIN_START_TAG , 'beginStartTag'     , startTag           ]
	, [ BEGIN_END_TAG   , 'beginEndTag'       , 'beforeAttribute'  ]
	, ['<!--'           , 'beginComment'      , 'commentStart'     ]
	, ['</|<!|<\\?'     , 'beginBogusComment' , 'bogusComment'     ]
	, ['[^<&]+'         , 'data'                                   ]
	, ['<'              , 'unescapedLessThan'                      ]
	, ['.{0}'           , null                , charRefIn ('data') ]
	],

rawtext:
  [ [ BEGIN_END_TAG , 'beginEndTag' ,  endTagIn ('rawtext') ]
  , ['.[^<]*'       , 'rawtext'                             ]
  ],

rcdata:
  [ [ BEGIN_END_TAG ,'beginEndTag'       , endTagIn ('rcdata')  ]
	, ['[^<&]+'       ,'rcdata'                                   ]
	, ['<'            ,'unescapedLessThan'                        ]
	, ['.{0}'         , null               , charRefIn ('rcdata') ]
  ],

charRef:
  [ ['&#[0-9]+;?'          , 'decimalCharRef'    , context ]
	, ['&#[xX][0-9A-Fa-f]+;?', 'hexadecimalCharRef', context ]
	, ['&[A-Za-z0-9]+;?'     , 'namedMaybeCharRef' , context ]
	, ['&'                   , 'unescapedAmpersand', context ]
	],

beforeAttribute:
	[ ['>'                 , 'finishTag'           , content ]
	, ['/>'                , 'finishSelfClosingTag', content ]
	, ['[/\\t\\n\\f ]+'    , 'space'               , 'beforeAttribute'   ]
	, ['.[^>/\\t\\n\\f =]*', 'attributeName'       , 'afterAttributeName']
	],

// '[^>/\\t\\n\\f ][^>/\\t\\n\\f =]*' (ATTRIBUTE NAME)
afterAttributeName:
	[ ['>'                 , 'finishTag'           , content ]
	, ['/>'                , 'finishSelfClosingTag', content ]
	, ['/+'                , 'space'               , 'beforeAttribute'    ]
	, ['[\\t\\n\\f ]+'     , 'space'               , 'afterAttributeName' ]
	, ['=[\\t\\n\\f ]*'    , 'equals'              , 'attributeValue'     ]
	, ['.[^>/\\t\\n\\f =]*', 'attributeName'       , 'afterAttributeName' ]
	],

attributeValue: // 'equals' has eaten all the space
	[ [ '>'   , 'finishTag'           , content                      ]
	, [ '"'   , 'beginAttributeValue' , 'attributeValueDoubleQuoted' ]
	, [ "'"   , 'beginAttributeValue' , 'attributeValueSingleQuoted' ]
	, [ '.{0}', 'beginAttributeValue' , 'attributeValueUnQuoted'     ]
	],

// TODO emit finishAttribute token for unquoted attributes
attributeValueUnQuoted:
	[ ['>'               , 'finishTag    ', content ]
	, ['[\\t\\n\\f ]+'   , 'space        ', 'beforeAttribute' ]
	, ['[^&>\\t\\n\\f ]+', 'attributeData' ]
	, ['.{0}'            , null           , charRefIn ('attributeValueUnQuoted') ]
	],

attributeValueDoubleQuoted:
	[ ['[^"&]+', 'attributeData' ]
	, ['"'     , 'finishAttributeValue' , 'beforeAttribute']
	, ['.{0}'  , null                   , charRefIn ('attributeValueDoubleQuoted') ]
	],

attributeValueSingleQuoted:
	[ ["[^'&]+", 'attributeData' ]
	, ["'"     , 'finishAttributeValue' , 'beforeAttribute' ]
	, ['.{0}'  , null                   , charRefIn ('attributeValueSingleQuoted') ]
  ],

bogusComment:
	[ [ '[^>]+' , 'commentData'       , 'bogusComment' ]
	, [ '>'     , 'finishBogusComment', content        ]
	],

commentStart:
	[ [ '-?>'        , 'finishComment' , content   ]
	, [ '--!?>'      , 'finishComment' , content   ]
	, [ '--!'        , 'commentData' ]
	, [ '--?'        , 'commentData' ]
	, [ '[^>-][^-]*' , 'commentData' ]
	],

comment:
  [ ['--!?>', 'finishComment', content   ]
  , ['--!'  , 'commentData' ]
  , ['--?'  , 'commentData' ]
  , ['[^-]+', 'commentData' ]
  ],

plaintext: 
	[ ['.+', 'plaintext', 'plaintext']
	], 
}


// The compiler and runtime
// ------------------------
// Since the javascript RegExp object allows reading and writing the position
// of reference in the input string, it is possible to represent each state by
// a single RegExp object with capture groups. The capture groups then
// correspond to the transitions. 

function State (table, name) {
	this.regex = new RegExp ('('+table.map(fst).join(')|(')+')', 'g')
	this.edges = table.map ( fn )
  function fn (row) {
    return { nextSymbol:row.length > 2 ? row[2] : name, tokenType:row[1] }
  }
}

function compile (grammar) {
	var compiled = {}
	for (var state_name in grammar)
		compiled [state_name] = new State (grammar [state_name], state_name)
	return compiled
}

function fst (a) {
	return a[0] }


// The Lexer
// ---------
// A token iterator

function Lexer (input, customState) {
	var symbol = 'data' // Te state name
    , states = compile (grammar)
    , position = 0
		, self = this

  this.value
  this.done = false
  this.next = next
  this[Symbol.iterator] = _ => this

	function next () {
    if (states [symbol] == null) 
      throw new Error ('Lexer: no such symbol: '+symbol)

    var state = states [symbol]
      , regex = state.regex

    regex.lastIndex = position
		var r = regex.exec (input)
    // log (position, r)
		if (r == null) {
      self.done = true // FIXME end at EOF only
			return self
    }

    // TODO take care not to skip chars!
		position = regex.lastIndex
    var i = 1; while (r[i] == null) i++
    
    var edge = state.edges [i-1]
      , _symbol = edge.nextSymbol
      , chunk = r[i]

    if (typeof _symbol === 'function') {
      symbol = _symbol.call (customState, symbol, chunk) // want access to.. what? and allow to set.. what?
    }
    else {
      symbol = _symbol
    }

    self.value = [edge.tokenType, chunk]
    return self
	}
}


function lex (input) {
  return new Lexer (input, {})
}