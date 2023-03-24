An HTML5 lexer for safe template languages
==========================================

[![NPM version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/html-lexer.svg
[npm-url]: https://npmjs.org/package/html-lexer

A standard compliant, incremental/ streaming HTML5 lexer. 

This is an HTML5 lexer designed to be used a basis for safe and HTML-context 
aware template languages, IDEs or syntax highlighters. It is different from the 
other available tokenizers in that it preserves all the information of the 
input string, e.g. formatting, quotation style and other idiosyncrasies. It 
does so by producing annotated chunks of the input string rather than the 
slightly more high level tokens that are described in the specification. 
However, it does do so in a manner that is compatible with the language defined
in the [HTML5 specification][1]. 

[1]: https://html.spec.whatwg.org/multipage/syntax.html#tokenization

The main motivation for this project is a jarring absence of safe HTML 
template languages. By safe, I mean that the template placeholders are typed 
according to their context, and that the template engine ensures that the 
strings that come to fill the placeholders are automatically and
correctly escaped to yield valid HTML. 

Usage
-----

The produced tokens are simply tuples (arrays) `[type, chunk]` of a token type
and a chunk of the input string.

The lexer has a ‘push parser’ API.
The `Lexer` constructor takes as its single argument a delegate object with 
methods: `write (token)` and `end ()`.

Example:

```javascript
const Lexer = require ('html-lexer')

const delegate = {
  write: (token) => console.log (token),
  end: () => null
}

const lexer = new Lexer (delegate)
lexer.write ('<h1>Hello, World</h1>')
lexer.end ()
```

Results in:

```javascript
[ 'startTagStart', '<' ]
[ 'tagName', 'h1' ]
[ 'tagEnd', '>' ]
[ 'data', 'Hello,' ]
[ 'space', ' ' ]
[ 'data', 'World' ]
[ 'endTagStart', '</' ]
[ 'tagName', 'h1' ]
[ 'tagEnd', '>' ]
```

The lexer is incremental: `delegate.write` will be called as soon as a token is
available and you can split the input across multiple writes:

```javascript
const lexer = new Lexer (delegate)
lexer.write ('<h')
lexer.write ('1>Hello, W')
lexer.write ('orld</h1>')
lexer.end ()
```


Token types
-----------

The tokens emitted are simple tuples `[type, chunk]`.
The type of a token is just a string, and it is one of:

- `attributeAssign`
- `attributeName`
- `attributeValueData`
- `attributeValueEnd`
- `attributeValueStart`
- `bogusCharRef`
- `charRefDecimal`
- `charRefHex`
- `charRefLegacy`
- `charRefNamed`
- `commentData`
- `commentEndBogus`
- `commentEnd`
- `commentStartBogus`
- `commentStart`
- `data`
- `endTagStart`
- `lessThanSign`
- `uncodedAmpersand`
- `newline`
- `nulls`
- `plaintext`
- `rawtext`
- `rcdata`
- `space`
- `startTagStart`
- `tagEndAutoclose`
- `tagEnd`
- `tagName`
- `tagSpace`

The `uncodedAmpersand` is emitted for ampersand `&` characters that *do not* start a character reference. 

The `tagSpace` is emitted for 'space' between attributes in
element tags. 

Otherwise the names should be self explanatory.


Limitations
-----------

* Doctype  
  The lexer still interprets doctypes as 'bogus comments'. 

* CDATA  
  The lexer interprets CDATA sections as 'bogus comments'.  
  (CDATA is only allowed in foreign content - svg and mathml.)

* Script tags  
  The lexer interprets script tags as rawtext elements. 
  This has no dire consequences, other than that html begin and 
  end comment tags that may surround it, are not marked as such. 


Changelog
------------

### 0.5.0

The projet has been rewritten to use the fast, hand-written DFA-based lexer,
from my related [html-parser] project. 
I have been inspired by the techniques described by [Sean Barrett] on their
page about [table-driven lexical analyis].

[html-parser]: https://github.com/alwinb/html-parser
[Sean Barrett]: http://nothings.org
[table-driven lexical analyis]: https://nothings.org/computer/lexing.html


- **NB** Small changes have been made to the token types:
- The `endTagPrefix` token has been removed: an `rcdata` or `rawtext` token is emitted instead.
- The `bogusCharRef` token has been removed: an `uncodedAmpersand` token is emitted for an ampersand `&` that *does not start a character reference* instead.
- Stretches of NUL-characters, whitespace, and individual newlines are now emitted as separate tokens of type `nulls`, `space`, and `newline`, respectively.


### 0.4.0

- **NB** The token types have changed to use a more consistent naming scheme. 
- Added a Makefile for building a browser version. 
- Added a browser based test page. 


License
-------

The source code for this project is licensed under the _Mozilla Public License Version 2.0_, copyright Alwin Blok 2016–2018, 2020–2021, 2023.

