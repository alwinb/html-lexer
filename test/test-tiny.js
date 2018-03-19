"use strict"

const tokenize = require ('../lib/tiny-lexer')
  , samples = require ('./data/html').samples
  , { head, renderTokens, flush, flatten } = require ('./templates')

const log = console.log.bind (console)


function compose (fn1, fn2, fn3, __) { 
  var fns = arguments
  return function (x) {
    for (let i = fns.length - 1; i >= 0; i--) x = fns [i] (x)
    return x } }


function map (fn) { return function* (obj) {
  for (let a of obj) yield fn (a) } }


// Test
// ====

compose (flush, flatten, head, map (renderTokens), map (tokenize)) (samples)

