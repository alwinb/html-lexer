const Symbols = new Proxy({}, { get: (_, k) => Symbol (k) })
const log = console.log.bind (console)

// Token types, 
//  These should be symbols of some kind, 
//  just represented by strings for now.

// I do like the idea of lexing data / rcdata etc as well
// and emitting separate newline tokens there

const tokenTypes = 
{ tagName: 'tagName'

, attributeName: 'attributeName'
, attributeAssign: 'attributeAssign'
, attributeData: 'attributeData'
, space: 'space'

, data: 'data'
, rcdata: 'rcdata'
, rawtext: 'rawtext'
, plaintext: 'plaintext'
, commentData: 'commentData'
, bogusCommentData: 'bogusCommentData'

, lessThanSign: 'lessThanSign'
, bogusCharRef: 'bogusCharRef'
, endTagPrefix: 'endTagPrefix'

, legacyCharRef: 'legacyCharRef'
, namedCharRef: 'namedCharRef'
, decimalCharRef: 'decimalCharRef'
, hexadecimalCharRef: 'hexadecimalCharRef'

// Openers
, beginAttributeValue: 'beginAttributeValue'
, beginBogusComment: 'beginBogusComment'
, beginComment: 'beginComment'
, beginEndTag: 'beginEndTag'
, beginStartTag: 'beginStartTag'

// Closers
, finishAttributeValue: 'finishAttributeValue'
, finishBogusComment: 'finishBogusComment'
, finishComment: 'finishComment'
, finishSelfClosingTag: 'finishSelfClosingTag'
, finishTag: 'finishTag'
}

/* 
// Some states should show a warning/ error 
// if an EOF is encountered within.. 

const eof_msg = 'end of input '
const errors = { EOF: 
{ tagOpen: eof_msg+'after unescaped less-than sign'
, tagName: eof_msg+'in tag name'
, selfClosingStartTag: eof_msg+'before attribute name'
, endTagOpen: eof_msg+'before endtag name'
, beforeAttributeName: eof_msg+'before attribute name'
, attributeName: eof_msg+'in attribute name'
, afterAttributeName: eof_msg+'after attribute name'
, beforeAttributeValue: eof_msg+'before attribute value'
, attributeValue: eof_msg+'in attribute value'
, afterAttributeValueQuoted: eof_msg+'after attribute value'
, markupDeclarationOpen: eof_msg+'in markup declaration'
, commentStart: eof_msg+'in comment'
//, rcdata: eof_msg+'in '+this.tagName+' content'
//, rawtext: eof_msg+'in '+this.tagName+' content'
, bogusComment: eof_msg+'in invalid comment'
, commentEndBang: eof_msg+'in comment after --!'
, commentEnd: eof_msg+'in comment'
, commentEndDash: eof_msg+'in comment'
, comment: eof_msg+'in comment'
, commentStartDash: eof_msg+'in comment'
}}
*/

module.exports = tokenTypes