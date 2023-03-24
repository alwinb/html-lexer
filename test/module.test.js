const { Lexer } = require ('html-lexer')
const log = console.log.bind (console)
// log (html)

const delegate = {
  write: (token) => console.log (token),
  end: () => null
}

const lexer = new Lexer (delegate)
lexer.write ('<h1>Hello, World</h1>')
lexer.end ()
