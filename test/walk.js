var log = console.log.bind (console)
module.exports = walk

var NUMBER = 'number'
  , STRING = 'string'
  , OBJECT = 'object'
  , FUNCTION = 'function'

function walk (obj, shape) {
  shape = arguments.length > 1 ? shape : defaultShape
  return new Walker (obj, shape)
}

walk.shape = defaultShape
walk.leaf = function (obj) { return new Leaf (obj) }

function Walker (obj, shape) {
	var stack = [ defaultShape ({'#root': obj}) ] // careful 
  var self = this

  this.done = false
  this.value
	this.next = next
  this[Symbol.iterator] = _ => self

	// where
	function next () {
		var head = stack [stack.length - 1]

    if (head.done) {
		  if (stack.length > 1) {
			  stack.pop ()
			  var k = stack [stack.length - 1] .selection
		    stack [stack.length - 1] .increment ()
			  self.value = { tag:'end', type:head.type, key:k } //, head.node]
		  }
		  else 
        self.done = true
    }

		else {
      var child = shape (head.child, stack)
      if (child instanceof Leaf) {
  			self.value = { tag:'leaf', type:child.type, key:head.selection, value:child.value }
        head.increment ()
      }
      else {
        self.value = { tag:'start', type:child.type, key:head.selection } //, child.node]
			  stack.push (child)
      }
		}

    return self
	}
}

// 'Shapes' are basically lateral iterators,
// calling 'increment' updates their 'child' value 
// to the next sibling. 

function defaultShape (obj) {
  return obj == null ? new Leaf (obj)
    : typeof obj === STRING ? new Leaf (obj)
    : Array.isArray (obj) ? new ArrayShape (obj)
    : typeof obj[Symbol.iterator] === 'function' ? new IteratorShape (obj)
    : typeof obj === OBJECT ? new ObjectShape (obj)
    : new Leaf (obj)
}

function Leaf (obj) {
  this.type = typeof obj
  this.value = obj
}

function IteratorShape (obj) {
  var index = -1
  var obj = obj[Symbol.iterator]()
  this.type = 'iterator'

  this.increment = function () {
    var n = obj.next ()
    index += 1
    this.selection = index
    this.done = n.done
    this.child = n.value
    return this
  }

  this.increment ()
}

function ArrayShape (obj) {
  var index = -1
  this.type = 'array'
  this.increment = function () { 
    index += 1
    this.selection = index
    this.done = index >= obj.length
    this.child = !this.done ? obj[index] : null
    return this
  }
  this.increment ()
}

function ObjectShape (obj) {
  var index = -1
	var keys = Object.keys (obj)
  this.type = 'object'
	this.increment = function () { 
    index += 1
    this.selection = keys [index]
    this.done = index >= keys.length
    this.child = !this.done ? obj[keys[index]] : null
    return this
  }
  this.increment ()
}

