html-lexer
===========

An HTML5 lexer. Converts the input string to a lazy stream of tokens according
to the [HTML5 specification][1]. The produced tokens however are simply
tuples (arrays) `[type, chunck]` of a token type and a chunck of the input
string. All formatting– and other idiosyncracies of the input are maintained. 

Inspired by [simple-html-tokenizer][2], but I needed the low level output and
ended up writing my own lexer instead. 


Usage
-----

To tokenize an entire string at once

	var TokenStream = require ('html-lexer')
		, sample = '<span class="hello">Hello, world</span>'
	
	console.log(new TokenStream(sample).all())


To incrementally tokenize a string:

	var TokenStream = require ('html-lexer')
		, sample = '<span class="hello">Hello, world</span>'
		, tokens = new TokenStream(sample)
		
	var token = tokens.next()
	while (token != null) {
		console.log (token)
		// do something with token
		token = tokens.next()
	}


To incrementally tokenize a string whilst tracking the token positions:

	var TokenStream = require ('html-lexer')
		, sample = '<span class="hello">Hello, world</span>'
		, tokens = new TokenStream(sample)
		
	var info = tokens.info()
		, token = tokens.next()
		
	while (token != null) {
		console.log (info, token)
		info = tokens.info()
		token = tokens.next()
	}


Token types
-----------

The tokens emitted are simple tuples `[type, chunck]`, or
`["error", message, position]` where position is the position in the input
string at which the error occurs: an object `{ position, line, column }`. 

The type of a token is just a string, and it is one of:

- attributeData
- attributeName
- beginAttributeValue
- beginBogusComment
- beginComment
- beginEndTag
- beginStartTag
- bogusCharRef
- bogusCommentData
- commentData
- data
- decimalCharRef
- endTagPrefix
- equals
- finishAttributeValue
- finishBogusComment
- finishComment
- finishSelfClosingTag
- finishTag
- hexadecimalCharRef
- lessThanSign
- namedCharRef
- plaintext
- rawtext
- rcdata
- space
- spaceMissing
- tagName

The `"bogusCharRef"` is emitted for sequences that start with an ampersand,
but that *do not* start a character referece, specifically, one of `"&"`,
`"&#"`, `"&#X"` or `"&#x"`. 

The `"space"` and `"spaceMissing"` are emitted for space between attributes in
element tags. 

Otherwise the names should be self explanatory.


Limitations
-----------

A fair subset, but not all of the states in the specification is
implemented. See notes/checklist.txt for more details. 

* Doctype  
	The doctype states are not implemented.  
	The lexer interprets doctypes as 'bogus comments'. 

* CDATA  
	The lexer interprets CDATA sections as 'bogus comments'.  
	(CDATA is only allowed in foreign content - svg and mathml.)

* Script tags  
	The lexer interprets script tags as rawtext elements.  
	(And I think this is correct.)

* Character references  
	The lexer only does a lexical analysis. This means that
	character references are not interpreted.  
	See notes/charrefs.txt for details. 


[1]: https://html.spec.whatwg.org/multipage/syntax.html#tokenization
[2]: https://github.com/tildeio/simple-html-tokenizer
