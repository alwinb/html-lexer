"use strict"

const { tag, end, renderTo } = require ('tagscript')
const log = console.log.bind (console)
module.exports = { head, flush }


function head (cssfile) { return function (contents)  {
  const header = 
    [ tag ('html')
    ,   tag ('head')
    ,     stylesheet (cssfile)
    ,   end ('head')
    ,   tag ('body')
    ,     contents
    ,   end ('body')
    , end ('html') ]
  return header
} }

function stylesheet (href) {
  return tag ('link', { rel:'stylesheet', type:'text/css', href:href })
}

function flush (obj) {
  try {
    renderTo (process.stdout, obj)
    process.exit (205)
  }
  catch (e) {
    log (e)
  }
}
