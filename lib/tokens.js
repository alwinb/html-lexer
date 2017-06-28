// Token types, 
//  These should be symbols of some kind, 
//  just represented by strings for now.

var tokenTypes = 
{ attributeData: 'attributeData'
, attributeName: 'attributeName'
, beginAttributeValue: 'beginAttributeValue'
, beginBogusComment: 'beginBogusComment'
, beginComment: 'beginComment'
, beginEndTag: 'beginEndTag'
, beginStartTag: 'beginStartTag'
, bogusCharRef: 'bogusCharRef'
, bogusCommentData: 'bogusCommentData'
, commentData: 'commentData'
, data: 'data'
, decimalCharRef: 'decimalCharRef'
, endTagPrefix: 'endTagPrefix'
, equals: 'equals'
, finishAttributeValue: 'finishAttributeValue'
, finishBogusComment: 'finishBogusComment'
, finishComment: 'finishComment'
, finishSelfClosingTag: 'finishSelfClosingTag'
, finishTag: 'finishTag'
, hexadecimalCharRef: 'hexadecimalCharRef'
, lessThanSign: 'lessThanSign'
, namedCharRef: 'namedCharRef'
, plaintext: 'plaintext'
, rawtext: 'rawtext'
, rcdata: 'rcdata'
, space: 'space'
, spaceMissing: 'spaceMissing'
, tagName: 'tagName'
, error: 'error'
}


// TODO: re enable these
//  just by checking the state in the lexer
//  maybe keep feeding eofs into the machine until the statestack is empty, too

var eof_msg = 'end of input '

var errors = { EOF: 
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


module.exports = tokenTypes