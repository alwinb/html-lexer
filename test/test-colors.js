"use strict"
const Lexer = require ('../lib')
	, Samples = require ('./data/samples')
  , { tag, end, renderTo } = require ('tagscript')
  , { head, flush } = require ('./templates')


const log = console.log.bind (console)

function compose (fn1, fn2, fn3, __) {
  var fns = arguments
  return function (x) {
    for (let i = fns.length - 1; i >= 0; i--) x = fns [i] (x)
    return x } }


function map (fn) { return function* (obj) {
  for (let a of obj) yield fn (a) } }


function renderTokens (tokens) {
  const pre = 
    [ tag ('pre') //, samples[a], leaf ('br'), '\n'
    ,   map (token => 
          [ tag ('span', { class:token[0], title:token[0] }), token[1], end('span') ])
        (tokens)
    , end ('pre') ]
  return pre
}


// Test
// ====

const samples = Samples.samples.concat (Samples.EOFSamples)

compose (flush, head ('file://'+__dirname+'/style/tokens.css?'+Math.random()), map (renderTokens), map (map (_ => [_[0], _[1]])), map (tokenize)) (samples)

function tokenize (sample) {
  const r = []
  const p = new Lexer ({write:r.push.bind (r), end:() => null})
  p.end (sample)
  // FIXME nulls in output
  return r
}

function test (title, samples) {
	log ('Test '+title+'\n'+new Array (title.length+6) .join('=')+'\n')
	for (let a in samples) {
		log (samples [a])
		log (tokenize (samples[a]))
		log ('\n')
	}
}

//test ('samples', Samples.samples)
//test ('EOF samples', Samples.EOFSamples)
