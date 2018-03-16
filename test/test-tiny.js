var tokens = require ('../lib/tiny-lexer')

// Test
// ====

var log = console.log.bind (console)
var sample = 'hello <!-- comment --> <textarea><span> data &as df<span asdf= &amp;asd as="asd" <e=f> </as> <!-- assas --!> as--> '

log (sample)

for (var tok of tokens (sample)) {
  log (tok)
}


// Now to make a html writer object that consumes tokens and outputs them

