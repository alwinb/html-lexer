"use strict"
module.exports = lex
const log = console.log.bind (console)

// A tiny-lexer based tokenizer for HTML5
// =======================================

// The idea is that the lexical grammar can be very compactly expressed by
// a state machine that has transitions labeled with regular expressions
// rather than individual characters. 

// TODO list:
// [ ] emit finishAtt token for unquoted attributes
// [ ] reenable colors
// [ ] separate project on github

// ### The tokens

const T_att_name = 'attribute-name'
  , T_att_equals = 'attribute-equals'
  , T_att_value_start = 'attribute-value-start'
  , T_att_value_data = 'attribute-value-data'
  , T_att_value_end = 'attribute-value-end'
  , T_comment_start = 'comment-start'
  , T_comment_start_bogus = 'comment-start-bogus'
  , T_comment_data = 'comment-data'
  , T_comment_end = 'comment-end'
  , T_comment_end_bogus = 'comment-end-bogus'
  , T_startTag_start = 'startTag-start'
  , T_endTag_start = 'endTag-start'
  , T_tag_end = 'tag-end'
  , T_tag_end_close = 'tag-end-autoclose'
  , T_charRef_decimal = 'charRef-decimal'
  , T_charRef_hex = 'charRef-hex'
  , T_charRef_named = 'charRef-named'
  , T_unescaped = 'unescaped'
  , T_space = 'space'
  , T_data = 'data'
  , T_rcdata = 'rcdata'
  , T_rawtext = 'rawtext'
  , T_plaintext = 'plaintext'


//### The grammar

const STARTTAG_START = '<[a-zA-Z][^>/\\t\\n\\f ]*'
const ENDTAG_START = '</[a-zA-Z][^>/\\t\\n\\f ]*'
const CHARREF_HEX = '&#[xX][0-9A-Fa-f]+;?'
const CHARREF_NAME = '&[A-Za-z0-9]+;?'
const ATTNAME = '.[^>/\\t\\n\\f =]*' /* '[^>/\\t\\n\\f ][^>/\\t\\n\\f =]*' */
const ATT_UNQUOT = '[^&>\\t\\n\\f ]+'

const grammar = 
{ data: [
	{ if: STARTTAG_START,   emit: T_startTag_start,     goto: startTag      },
	{ if: ENDTAG_START,     emit: T_endTag_start,       goto:'beforeAtt'    },
	{ if: '<!--',           emit: T_comment_start,      goto:'commentStart' },
	{ if: '<[/!?]',         emit: T_comment_start_bogus,goto:'bogusComment' },
	{ if: '[^<&]+',         emit: T_data                                    },
	{ if: '<',              emit: T_unescaped                               },
	{                       emit: T_data,               goto: charRefIn     }],

rawtext: [
  { if: ENDTAG_START,     emit: maybeEndTagT,         goto: maybeEndTag   },
  { if: '.[^<]*',         emit: T_rawtext                                 }],

rcdata: [
  { if: ENDTAG_START,     emit: maybeEndTagT,         goto: maybeEndTag   },
	{ if: '<',              emit: T_unescaped                               },
	{ if: '[^<&]+',         emit: T_rcdata                                  },
	{                       emit: T_rcdata,             goto: charRefIn     }],

plaintext: [
	{ if:'.+',              emit: T_plaintext                               }],

charRef: [
  { if: '&#[0-9]+;?',     emit: T_charRef_decimal,    goto: content       },
	{ if: CHARREF_HEX,      emit: T_charRef_hex,        goto: content       },
	{ if: CHARREF_NAME,     emit: T_charRef_named,      goto: content       },
	{ if: '&',              emit: T_unescaped,          goto: content       }],

beforeAtt: [
	{ if: '>',              emit: T_tag_end,            goto: content       },
	{ if: '/>',             emit: T_tag_end_close,      goto: content       },
	{ if: '[/\\t\\n\\f ]+', emit: T_space,                                  },
	{ if: ATTNAME,          emit: T_att_name,           goto:'afterAttName' }],

afterAttName: [
	{ if: '>',              emit: T_tag_end,            goto: content       },
	{ if: '/>',             emit: T_tag_end_close,      goto: content       },
	{ if: '=[\\t\\n\\f ]*', emit: T_att_equals,         goto:'attValue'     },
	{ if: '/+',             emit: T_space,              goto:'beforeAtt'    },
	{ if: '[\\t\\n\\f ]+',  emit: T_space                                   },
	{ if: ATTNAME,          emit: T_att_name                                }],

attValue: [ // 'equals' has eaten all the space
  { if: '>' ,             emit: T_tag_end,            goto: content       },
  { if: '"' ,             emit: T_att_value_start,    goto:'valueDoubleQ' },
  { if: "'" ,             emit: T_att_value_start,    goto:'valueSingleQ' },
  {                       emit: T_att_value_start,    goto:'valueNoQ'     }],

valueNoQ: [
  { if: ATT_UNQUOT,       emit: T_att_value_data                          },
  { if: '>',              emit: T_tag_end,            goto: content       },
  { if: '[\\t\\n\\f ]+',  emit: T_space,              goto:'beforeAtt'    },
  {                       emit: T_att_value_data,     goto: charRefIn     }],

valueDoubleQ: [
  { if: '[^"&]+',         emit: T_att_value_data                          },
  { if: '"',              emit: T_att_value_end,      goto:'beforeAtt'    },
  {                       emit: T_att_value_data,     goto: charRefIn     }],

valueSingleQ: [
  { if: "[^'&]+",         emit: T_att_value_data                          },
	{ if: "'",              emit: T_att_value_end,      goto: 'beforeAtt'   },
	{                       emit: T_att_value_data,     goto: charRefIn     }],

bogusComment: [
  { if: '[^>]+',          emit: T_comment_data,       goto:'bogusComment' },
  { if: '>',              emit: T_comment_end_bogus,  goto: content       }],

commentStart: [
  { if: '-?>',            emit: T_comment_end,        goto: content       },
  { if: '--!?>',          emit: T_comment_end,        goto: content       },
  { if: '--!',            emit: T_comment_data,       goto:'comment'      },
  { if: '--?',            emit: T_comment_data,       goto:'comment'      },
  { if: '[^>-][^-]*',     emit: T_comment_data,       goto:'comment'      }],

comment: [
  { if: '--!?>',          emit: T_comment_end,        goto: content       },
  { if: '--!'  ,          emit: T_comment_data                            },
  { if: '--?'  ,          emit: T_comment_data                            },
  { if: '[^-]+',          emit: T_comment_data                            }]
}


// Additional state management, to
//  supplement the grammar/ state machine. 

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
  //, noscript: 'rawtext' // if scripting is enabled in a UA
  }

function CustomState () {
  this.content = 'data' // one of { data, rcdata, rawtext, valueNoQ, valueDoubleQ, valueSingleQ }
  this.tagName // the last seen 'startTag-start' name 
}

function startTag (_, chunk) {
  let tagName = chunk.substr (1)
  this.tagName = tagName
  this.content = tagName in content_map ? content_map[tagName] : 'data'
  return 'beforeAtt'      
}

function content () {
  return this.content
}

function maybeEndTagT (_, chunk) {
  if (chunk.substr (2) === this.tagName) {
    this.content = 'data'
    return T_endTag_start }
  else return this.content // TODO careful, this should be a token type, not a state!
}

function maybeEndTag (symbol, chunk) {
  if (chunk.substr (2) === this.tagName) {
    this.content = 'data'
    return 'beforeAtt'       
  }
  else return symbol
}

function charRefIn (symbol, chunk) {
  this.content = symbol
  return 'charRef'
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
    let edge = state.edges [i-1]
      , chunk = r[i]

    self.value = (typeof edge.emit === 'function')
      ? [ edge.emit.call (customState, symbol, chunk), chunk] // output token
      : [ edge.emit, chunk]

    symbol = (typeof edge.goto === 'function')
      ? edge.goto.call (customState, symbol, chunk)
      : edge.goto

    return self
	}
}


function lex (input) {
  return new Lexer (input, new CustomState ())
}

