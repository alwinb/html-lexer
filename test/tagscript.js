const walk = require ('./walk')
module.exports =  { tag, leaf, end, comment, render }

// This is what I call 'tagscript', it is a cousin to 'hyperscript' that,
// ather than exposing a single 'h' function to create element trees,
// it exposes start tag/ end tag functions to create html on the token level. 
// Only, just using it in the tests, so far. 

// Prelude
// -------

const log = console.log.bind (console)

function compose (fn1, fn2, fn3, __) { 
  const fns = arguments
  return function (x) {
    for (let i=fns.length-1; i>=0; i--) x = fns[i](x)
    return x } }

// 'Tagscript' renderer
// --------------------
// TODO: add content maps, support for rawtext and void elements??
// or perhaps value attributes/  vnodes in place of rawtext/ rcdata elements?

function render (tag) {
  return tag instanceof Tag ? renderTag (tag)
    : renderData (tag)
}


// Data types for tags
// -------------------

const START = 'start'
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


// Tag builders
// Strings that do not match `ATTRNAME` cannot be attribute names
// and they cannot be escaped either, so I ignore them. 
// TODO make the distinction between void tags and self-closing tags

const TAGNAME = /^[a-zA-Z][^>/\t\n\f ]*$/

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


// Serialize
// ---------

function renderTag (tag) {
  const { tagName, attributes:atts, value } = tag
  switch (tag.tag) {
    case LEAF:    return ['<'+tagName, renderAttributes (atts), '/>'].join('')
    case END:     return ['</'+tagName, '>'].join ('')
    case COMMENT: return ['<!--', value, '-->'].join ('') // FIXME escape comment value
    default:      return ['<'+tagName, renderAttributes (atts), '>'].join('')
  }
}

const AMPLT = /[&<]/g
const AMPQ = /[&"]/g
const ATTRNAME = /^[^\t\n\f />][^\t\n\f /=>]*$/

function escapeChar (c) {
  return c === '&' ? '&amp;'
  : c === '<' ? '&lt;'
  : c === '"' ? '&quot;' : c }

// The `renderData` function is called for every
// placeholder `Tag` in an 'html-data' context. 

function renderData (value) {
  return String (value) .replace (AMPLT, escapeChar)
}

function renderRawText (value) {
  // TODO
  // Idea: For 'escaping' ending sequneces in user visible tags,
  // insert an additional '\u200b' (8203) zero-width space character
  // after the tagName. 
  // However, for script tags, we want to use something else,
  // and probably for other things such as iframes etc too. 
  // Maybe this should just throw for now? Or return empty?
}

// Strings that do not match `ATTRNAME` cannot be attribute names
// and they cannot be escaped either, so we ignore them (see below)

function renderAttributes (arg) {
  const r = ['']
  if (arg != null && typeof arg === 'object')
  for (let k in arg)
  if (arg[k] != null && typeof arg[k] !== 'function' && ATTRNAME.test(k)) {
    let v = String (arg[k])
    if (v === '') r.push (k)
    else r.push ([k, '="', String (v) .replace (AMPQ, escapeChar), '"'].join(''))
  }

  return r.join(' ')
}

