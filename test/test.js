const Lexer = require ('../lib')

const delegate = {
  write: (token) => console.log (token),
  end: () => console.log('\n')
}

{
  const lexer = new Lexer (delegate)
  lexer.write ('<h1>Hello, World</h1>')
  lexer.end ()
}

{
  const lexer = new Lexer (delegate)
  lexer.write ('<h')
  lexer.write ('1>Hello, W')
  lexer.write ('orld</h1>')
  lexer.end ()
}

{
  // OK this works, but it is not accurate;
  // this queries the lexer state; not the token boundaries. 

  let lexer
  const delegate = {
    write: (token) => console.log (token, lexer.position),
    end: () => null
  }

  lexer = new Lexer (delegate)
  lexer.write ('<h1>Hello, World</h1>')
  lexer.end ()
}


{
  const lexer = new Lexer (delegate)
  lexer.write ('<!doctype html>sp')
  lexer.write ('<sp')
  lexer.write ('an>Hi</span>')
  lexer.write ('&amp; &a')
  lexer.write ('mp')
  lexer.write (';I am &notit ok')
  lexer.write ('\nI said: I am &not')
  lexer.end ('<!asd')
}



