import { Lexer } from 'html-lexer'
import { samples, samples2, EOFSamples } from './data/samples.mjs'
const log = console.log.bind (console)


// Test
// ----

const delegate = { write:log, end:log }

for (const samples_ of [samples, samples2, EOFSamples])
for (const x of samples_) {
  log (JSON.stringify (x))
  log ('================')
  const lexer = new Lexer (delegate)
  lexer.parse (x)
}


