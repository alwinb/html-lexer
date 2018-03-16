"use strict"
var tokens = require ('../lib/tiny-lexer')
  , samples = require ('./data/html').samples
  // For html output
  , { tag, end, render } = require ('./tagscript')
  , walk = require ('./walk')
  

var log = console.log.bind (console)

function compose (fn1, fn2, fn3, __) { 
  var fns = arguments
  return function (x) {
    for (var i=fns.length-1; i>=0; i--) x = fns[i](x)
    return x } }


function flush (obj) {
  try {
    for (var a of obj) process.stdout.write (a)
  }
  catch (e) {
    log (e)
  }
}


// Test
// ====

// Lazy pipeline!

compose (flush, map (render), flatten, head, map (renderSample)) (samples)
process.exit (205)



function stylesheet (href) {
  return tag ('link', { rel:'stylesheet', type:'text/css', href:href })
}

function head (tags)  {
  var r = 
    [ tag ('html')
    ,   tag ('head')
    ,     stylesheet ('file://'+__dirname+'/style/tokens.css')
    ,   end ('head')
    ,  tag ('body')
    ,  tags
    ,  end ('body')
    , end ('html')]
  return r
}

function* flatten (obj) {
  for (var a of (walk (obj, arrays)))
    if (a.tag === 'leaf') yield a.value
}

function map (fn) { return function* (obj) {
  for (var a of obj) yield fn (a)
} }

function arrays (obj) {
  //log ('myShape', obj)
  return obj == null ? walk.leaf (obj)
    : typeof obj[Symbol.iterator] === 'function' ? walk.shape (obj)
    : obj instanceof Array ? walk.shape (obj)
    : walk.leaf (obj)
}

function renderSample (sample) {
  var r = 
    [ tag ('pre') //, samples[a], leaf ('br'), '\n'
    , map (tok => [ tag('span', { class:tok[0], title:tok[0] }), tok[1], end('span') ]) (tokens (sample))
    , end ('pre') ]
  return r
}

