
// 'Special' character references are named character references that may 
// occur without a terminating semicolon. 

// `PREFIXED` and `SPECIALS` result from preprocessing the table of all
// entity names in the HTML5 specification, specifically, by identifying
// 1. Semicolon terminated names that have one of the below as a prefix, and
// 2. The names that may occur without a terminating semicolon (specials). 

var PREFIXED = /^&(?:copysr|centerdot|divideontimes|[gl]t(?:quest|dot|cir|cc)|[gl]trPar|gtr(?:dot|less|eqqless|eqless|approx|arr|sim)|ltr(?:i|if|ie|mes)|ltlarr|lthree|notin(?:dot|E|v[abc])?|notni(?:v[abc])?|parallel|times(?:bar|d|b));/
var SPECIALS = /^&([AEIOUYaeiouy]?acute|[AEIOUaeiou](?:grave|circ|uml)|y?uml|[ANOano]tilde|[Aa]ring|[Oo]slash|[Cc]?cedil|brvbar|curren|divide|frac(?:12|14|34)|iquest|middot|plusmn|(?:AE|ae|sz)lig|[lr]aquo|iexcl|micro|pound|THORN|thorn|times|COPY|copy|cent|macr|nbsp|ord[fm]|para|QUOT|quot|sect|sup[123]|AMP|amp|ETH|eth|REG|reg|deg|not|shy|yen|GT|gt|LT|lt)(;|.*)/


function splitCharRef (string, inAttribute, nextChar) {

	// A semicolon terminated, known charref
	if (PREFIXED.test(string))
		return [['namedCharRef', string]]

	// Test 'special' charrefs (terminated or nonterminated)
	var r = SPECIALS.exec(string)
  var terminated = string[string.length-1] === ';'

	// Not a special charref, nor one with trailing alphanums
	if (!r)
		return (terminated)
      ? [['unresolvedNamedCharRef', string]]
      : [[inAttribute ? 'attributeData' : 'data', string]]

	// A semicolon terminated special charref
	if (r[2] === ';')
		return [['namedCharRef', '&'+r[1]+';']]

	// A nonterminated special charref (exact match)
	if (r[2] === '')
    return (!inAttribute || nextChar !== '=')
		  ? [['namedCharRef', string]] // And also a parse error
		  : [['attributeData', string]] // And no parse error

	// A nonterminated special charref with trailing alphanums
  // NB Splitting should always produce a parse error
  else return (!inAttribute)
		? [['namedCharRef', '&'+r[1]], ['data', r[2]]]
		: [['attributeData', string]]

}


module.exports = {
  splitCharRef: splitCharRef
}