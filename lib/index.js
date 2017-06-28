var Html = require('./html')
  , splitCharRef = require('./entities.js').splitCharRef
  , tokens = require('./tokens')

// The idea is to have custom token constructors,
//  but for now these are expected to return an array of tokens

var customTokens = {

	namedCharRef: function (chunck, attrs) {
    return splitCharRef (chunck, attrs.inAttribute, attrs.nextChar)
	},

}

module.exports = Splitter
module.exports.tokenTypes = tokens


// TODO: add .end and reenable entities/splitting

function Splitter (_emit) {

  function emit (typ, atts, local_end_pos) {
    // console.log (typ, last, local_end_pos)
    atts = (typeof atts === 'undefined') ? null : atts
    slice = rest + chunk.substring (last, local_end_pos)
    last = local_end_pos
    rest = ''
    _emit ([typ, atts, slice])
  }

  var st = new Html (emit)
  var rest = ''
  var chunk
  var last


  this.write = function (chunk_) {
    // console.log (chunk_)
    last = 0
    chunk = chunk_
    st.write (chunk, emit)

    if (last !== chunk.length) {
      // Token overlaps chunk boundary;
      // Store the remaining piece
      rest += chunk.substr (last)
    }
  }
  
  this.end = function (chunk) {
    if (arguments.length)
      this.write (chunk)
    st.end ()
  }

}


var s = new Splitter (console.log.bind(console))
s.write ('<sp')
s.write ('an>Hi</span>')
s.write ('amp &a')
s.write ('mp')
s.end (';<!')

