var Lexer = require('../lib')
	, Samples = require('./data/html')


var L = new Lexer ()

function test (title, samples) {
	console.log('Test '+title+'\n'+new Array(title.length+6).join('=')+'\n')
	for (var a in samples) {
		console.log(samples[a])
		console.log(L.toArray(samples[a]))
		console.log('\n')
	}
}

test('samples', Samples.samples)
test('EOF samples', Samples.EOFSamples)
test('corner cases', Samples.weirdSamples)
