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

module.exports = tokenTypes