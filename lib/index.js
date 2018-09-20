const tokens = require ('./tokens')
  , Lexer = require ('./lexer')

module.exports = Lexer
module.exports.tokenTypes = tokens

// TEST
/*
var s = new Lexer ({write:console.log.bind(console)})
s.write ('<!doctype html>sp')
s.write ('<sp')
s.write ('an>Hi</span>')
s.write ('&amp; &a')
s.write ('mp')
s.write (';I am &notit ok')
s.write ('\nI said: I am &not')
s.end ('<!asd')
//*/