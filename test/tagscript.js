var walk = require ('./walk')
module.exports =  { tag, leaf, end, comment, render }

// Prelude

var log = console.log.bind (console)

function compose (fn1, fn2, fn3, __) { 
  var fns = arguments
  return function (x) {
    for (var i=fns.length-1; i>=0; i--) x = fns[i](x)
    return x } }


// 'Tagscript' renderer
// TODO: add content maps, support for rawtext and rcdata??
// and perhaps value attributes?

function render (tag) {
  return tag instanceof Tag ? renderTag (tag)
    : tag instanceof Raw ? tag.value
    : renderData (tag)
}

// Raw token data types

var START = 'start'
  , END = 'end'
  , LEAF = 'leaf'
  , COMMENT = 'comment'

function Tag (type, name, attrs) {
  this.tag = type
  this.tagName = name
  this.attributes = attrs
}

function Comment (data) {
  this.type = COMMENT
  this.data = data
}


// Token builders
// Strings that do not match `ATTRNAME` cannot be attribute names
// and they cannot be escaped either, so I ignore them. 

var TAGNAME = /^[a-zA-Z][^>/\t\n\f ]*$/

function tag (name, attrs) {
  if (! TAGNAME.test (name))
    throw Error ('tagscript: invalid tag name: '+name)
  return new Tag (START, name, attrs)
}

function leaf (name, attrs) {
  if (! TAGNAME.test (name))
    throw Error ('tagscript: invalid tag name: '+name)
  return new Tag (LEAF, name, attrs ? attrs : {})
}

function end (name) {
  if (! TAGNAME.test (name))
    throw Error ('tagscript: invalid tag name: '+name)
  return new Tag (END, name)
}

function comment (data) {
  return new Comment (data)
}

////////////

function renderTag (tag) {
  var { tag, tagName, attributes:atts, value } = tag
  switch (tag) {
    case LEAF:    return ['<'+tagName, renderAttributes (atts), '/>'].join('')
    case END:     return ['</'+tagName, '>'].join ('')
    case COMMENT: return ['<!--', value, '-->'].join ('') // FIXME escape comment value
    default:      return ['<'+tagName, renderAttributes (atts), '>'].join('')
  }
}

// Converting tokens to strings
// ============================
// Copied from html-braces


// Render primitives
// -----------------
// Raw html data that results from evaluating templates
// (and subtemplates) is wrapped in a `Raw` object. 

function Raw (string) {
	this.content = string }

Raw.prototype.toString = function () {
	return this.content
}

// `AMPLT`, `AMPQ` and `escapeChar` are used for escaping 
// html-data, rcdata and attrbute values

var AMPLT = /[&<]/g
var AMPQ = /[&"]/g

function escapeChar (c) {
	return c === '&' ? '&amp;'
	: c === '<' ? '&lt;'
	: c === '"' ? '&quot;' : c }

// The `renderData` function is called for every
// placeholder `Tag` in an 'html-data' context. It escapes all 
// strings _except_ the strings wrapped in a `Raw` object. 

function renderData (value) {
	return (value instanceof Raw)
		? value.content
		: String (value) .replace (AMPLT, escapeChar)
}

// The `renderRcData` function is called for every `Tag` in
// 'rcdata' contexts. i.e. in `<textarea>` and `<title>` elements.
// It escapes all strings, _and_ the contents of `Raw` objects. 

/* NOTE: even though everyting is escaped, this is not safe unless
// the surrounding rcdata is escaped properly too. 
// Example: <textarea> Hi there </text{{ foo }}</textarea>
// with foo expanding to 'area ' will cause trouble. */

function renderRcData (value) {
	return String (value) .replace (AMPLT, escapeChar)
}

// The `renderAttributeValue` function takes a javascript value and
// returns a safe (escaped) string of html to be used as an
// html attribute value. 

function renderRawText (value) {
  // TODO
	// Idea: For 'escaping' ending sequneces in user visible tags,
	// insert an additional '\u200b' (8203) zero-width space character
	// after the tagName. 
	// However, for script tags, we want to use something else,
	// and probably for other things such as iframes etc too. 
}

// The `renderAttributes` function takes a javascript value and 
// returns safe html to be used as one or more attributes and/or
// attribute-value pairs.
//
// Strings that do not match `ATTRNAME` cannot be attribute names
// and they cannot be escaped either, so we ignore them (see below)

var ATTRNAME = /^[^\t\n\f />][^\t\n\f /=>]*$/

function renderAttributes (arg) {
  var r = ['']
	if (arg != null && typeof arg === 'object')
  for (var k in arg)
	if (arg[k] != null && typeof arg[k] !== 'function' && ATTRNAME.test(k)) {
		var v = String (arg[k])
		if (v === '') r.push (k)
		else r.push ([k, '="', String (v) .replace (AMPQ, escapeChar), '"'].join(''))
  }

	return r.join(' ')
}

