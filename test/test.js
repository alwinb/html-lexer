var Lexer = require('../lib')
	, Samples = require('./data/html')


function test (title, samples) {
	console.log('Test '+title+'\n'+new Array(title.length+6).join('=')+'\n')
	for (var a in samples) {
		console.log(samples[a])
		console.log(new Lexer(samples[a]).all())
		console.log('\n')
	}
}

test('samples', Samples.samples)
test('EOF samples', Samples.EOFSamples)
test('corner cases', Samples.weirdSamples)
