"use strict"

const walk = require ('./walk')
  , { tag, end, render } = require ('./tagscript')

module.exports = { head, renderTokens, flush, flatten }


function head (contents)  {
  const header = 
    [ tag ('html')
    ,   tag ('head')
    ,     stylesheet ('file://'+__dirname+'/style/tokens.css')
    ,   end ('head')
    ,   tag ('body')
    ,     contents
    ,   end ('body')
    , end ('html') ]
  return header
}

function stylesheet (href) {
  return tag ('link', { rel:'stylesheet', type:'text/css', href:href })
}

function renderTokens (tokens) {
  const pre = 
    [ tag ('pre') //, samples[a], leaf ('br'), '\n'
    ,   map (token => 
          [ tag ('span', { class:token[0], title:token[0] }), token[1], end('span') ])
        (tokens)
    , end ('pre') ]
  return pre
}


//
const log = console.log.bind (console)


function map (fn) { return function* (obj) {
  for (let a of obj) yield fn (a)
} }


function flush (obj) {
  try {
    for (let a of obj)
      process.stdout.write (render (a))
    process.exit (205)
  }
  catch (e) {
    log (e)
  }
}


function* flatten (obj) {
  for (let a of (walk (obj, iterables)))
    if (a.tag === 'leaf') yield a.value
}

function iterables (obj) {
  return obj == null ? walk.leaf (obj)
    : typeof obj[Symbol.iterator] === 'function' ? walk.shape (obj)
    : obj instanceof Array ? walk.shape (obj)
    : walk.leaf (obj)
}



