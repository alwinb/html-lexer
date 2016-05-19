(function(){

// tiny-lexer
// ==========

// This is attempt to implement a HTML5 compliant lexer that is tiny in size. 
// The idea is that the lexical grammar can be very compactly expressed by a 
// state machine that has transitions that are labeled with regular expressions
// rather than with individual characters. 

// The grammar
// -----------

var grammar = 
{ data:
	[ ['<[a-zA-Z][^>/\\t\\n\\f ]*' , 'beginStartTag'    , 'beforeAttribute']
	, ['</[a-zA-Z][^>/\\t\\n\\f ]*', 'beginEndTag'      , 'beforeAttribute']
	, ['<!--'                      , 'beginComment'     , 'commentStart']
	, ['</|<!|<\\?'                , 'beginBogusComment', 'bogusComment']
	, ['[^<&]+'                    , 'data'             , 'data']
	, ['<'                         , 'unescapedLessThan', 'data']
	].concat(charRefIn('data')),

beforeAttribute:
	[ ['>'                 , 'finishTag'           , 'content']
	, ['/>'                , 'finishSelfClosingTag', 'content']
	, ['[/\\t\\n\\f ]+'    , 'space'               , 'beforeAttribute']
	, ['.[^>/\\t\\n\\f =]*', 'attributeName'       , 'afterAttributeName']
	],

// '[^>/\\t\\n\\f ][^>/\\t\\n\\f =]*' (ATTRIBUTE NAME)
afterAttributeName:
	[ ['>'                 , 'finishTag'           , 'content']
	, ['/>'                , 'finishSelfClosingTag', 'content']
	, ['/+'                , 'space'               , 'beforeAttribute']
	, ['[\\t\\n\\f ]+'     , 'space'               , 'afterAttributeName']
	, ['=[\\t\\n\\f ]*'    , 'equals'              , 'attributeValue']
	, ['.[^>/\\t\\n\\f =]*', 'attributeName'       , 'afterAttributeName']
	],

attributeValue: // 'equals' has eaten all the space
	[ ['>'   , 'finishTag'          , 'content']
	, ['"'   , 'beginAttributeValue', 'attributeValueDoubleQuoted']
	, ["'"   , 'beginAttributeValue', 'attributeValueSingleQuoted']
	, ['.{0}', 'beginAttributeValue', 'attributeValueUnQuoted']
	],

// TODO emit finishAttribute token for unquoted attributes
attributeValueUnQuoted:
	[ ['>'               , 'finishTag'    , 'content']
	, ['[\\t\\n\\f ]+'   , 'space'        , 'beforeAttribute']
	, ['[^&>\\t\\n\\f ]+', 'attributeData', 'attributeValueUnQuoted']
	] .concat(charRefIn('attributeValueUnQuoted')),

attributeValueDoubleQuoted:
	[ ['[^"&]+', 'attributeData', 'attributeValueDoubleQuoted']
	, ['"'     , 'finishAttributeValue', 'beforeAttribute']
	] .concat(charRefIn('attributeValueDoubleQuoted')),

attributeValueSingleQuoted:
	[ ["[^'&]+", 'attributeData', 'attributeValueSingleQuoted']
	, ["'"     , 'finishAttributeValue', 'beforeAttribute']
	] .concat(charRefIn('attributeValueSingleQuoted')),
	
bogusComment:
	[ ['[^>]+', 'bogusCommentData',   'bogusComment']
	, ['>'    , 'finishBogusComment', 'content']
	],

commentStart:
	[ ['-?>'       , 'finishComment', 'content']
	, ['--!?>'     , 'finishComment', 'content']
	, ['--!'       , 'commentData'  , 'comment']
	, ['--?'       , 'commentData'  , 'comment']
	, ['[^>-][^-]*', 'commentData'  , 'comment']
	],

comment:
	[ ['--!?>', 'finishComment', 'content']
	, ['--!'  , 'commentData'  , 'comment']
	, ['--?'  , 'commentData'  , 'comment']
	, ['[^-]+', 'commentData'  , 'comment']
	],

// TODO add rawtext and rcData
plaintext: 
	[ ['.+', 'plaintext', 'plaintext']
	], 
}

function charRefIn (context) {
	var transitions = 
	[ ['&#[0-9]+;?'          , 'decimalCharRef'    , context]
	, ['&#[xX][0-9A-Fa-f]+;?', 'hexadecimalCharRef', context]
	, ['&[A-Za-z0-9]+;?'     , 'namedMaybeCharRef' , context]
	, ['&'                   , 'unescapedAmpersand', context]
	]
	return transitions }


// The compiler
// ------------
// Since the javascript RegExp object allows reading and writing the position
// of reference in the input string, it is possible to represent each state by
// a single RegExp object with capture groups. The capture groups then
// correspond to the transitions. 
	
function State (table) {
	this.regex = new RegExp('('+table.map(fst).join(')|(')+')', 'g')
	this.transitions = table.map(function(x){return x.slice(1)})
}

function compile (grammar) {
	var compiled = {}
	for (var state_name in grammar)
		compiled[state_name] = new State(grammar[state_name])
	return compiled
}

function fst (a) {
	return a[0] }


// The Lexer
// ---------
// A lazy stream of tokens

function Lexer (input) {
	var _sm = compile(grammar)
	var p = 0
		, state = 'data' // It's the state-name really
	return { next:next, all:all }

	function all () {
		var r = []
		var t = next()
		while (t != null) {
			r.push(t)
			t = next() }
		return r }

	function next () {
		if (_sm[state] == null) {
			console.log(['error', p, state])
			return null //['error', p, state]
		}
		
		var regex = _sm[state].regex
		var transitions = _sm[state].transitions
		
		regex.lastIndex = p
		
		var r = regex.exec(input)
		if (r == null) return null
		var i = 1; while (r[i] == null) i++
		
		var token = [transitions[i-1][0], r[i], state]
		p = regex.lastIndex
		state = transitions[i-1][1]

		if (state == 'content')
			state = 'data' // HACK // TODO: do the content-map check here

		//console.log('state', p, state)
		//console.log(token)
		return token
	}
}


// Test
// ====

var sample = '&as df<span asdf= &amp;asd as="asd" e=f> </ as> <!-- assas --!> as--> '

var l = new Lexer(sample)
console.log(l.all())


module.exports = Lexer
})()