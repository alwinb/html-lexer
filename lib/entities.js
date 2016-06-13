
// `NONTERMS` and `PREFIXED` result from preprocessing the table of all
// entity names in the HTML5 specification, specifically, by identifying
// 1. The names that may occur without a terminating semicolon and
// 2. Terminated names that have one of the above as a prefix

var NONTERMS = /^&([AEIOUYaeiouy]?acute|[AEIOUaeiou](?:grave|circ)|[ANOano]tilde|[Oo]slash|[Cc]?cedil|brvbar|curren|divide|frac(?:12|14|34)|iquest|middot|plusmn|(?:AE|ae|sz)lig|[Aa]ring|[lr]aquo|iexcl|micro|pound|THORN|thorn|times|[AEIOUaeiouy]?uml|COPY|copy|cent|macr|nbsp|ord[fm]|para|QUOT|quot|sect|sup[123]|AMP|amp|ETH|eth|REG|reg|deg|not|shy|yen|GT|gt|LT|lt)(;|.*)/
var NONTERMS = /^&([AEIOUYaeiouy]?acute|[AEIOUaeiou](?:grave|circ|uml)|y?uml|[ANOano]tilde|[Aa]ring|[Oo]slash|[Cc]?cedil|brvbar|curren|divide|frac(?:12|14|34)|iquest|middot|plusmn|(?:AE|ae|sz)lig|[lr]aquo|iexcl|micro|pound|THORN|thorn|times|COPY|copy|cent|macr|nbsp|ord[fm]|para|QUOT|quot|sect|sup[123]|AMP|amp|ETH|eth|REG|reg|deg|not|shy|yen|GT|gt|LT|lt)(;|.*)/
var PREFIXED = /^&(?:copysr|centerdot|divideontimes|[gl]t(?:quest|dot|cir|cc)|[gl]trPar|gtr(?:dot|less|eqqless|eqless|approx|arr|sim)|ltr(?:i|if|ie|mes)|ltlarr|lthree|notin(?:dot|E|v[abc])?|notni(?:v[abc])?|parallel|times(?:bar|d|b));/


// quick hack
var inattribute
var mod

function splitCharRef (string) {
	// An exact match, terminated
	if (PREFIXED.test(string)) 
		return [['namedCharRef', string]]

	// Unhandled cases
	var r = NONTERMS.exec(string)
	if (!r) 
		return [['namedMaybeCharRef', string]]

	// An exact match, terminated
	if (r[2] === ';')
		return [['namedCharRef', '&'+r[1]+';']]

	// An exact match, nonterminated
	if (r[2] === '')
		return (inattribute && mod !== '=')
			? [['namedCharRef', string]]
			: [['bogusCharRef', string]]

	// A prefix match
	else return (inattribute)
		? [['bogusCharRef', string]]
		: [['namedCharRef', '&'+r[1]], ['data', r[2]]]

}


// Quick Test
// ----------

var samples = ['&not;', '&not', '&notinit;', '&copy', '&copysr;', '&copysr', '&gtalsk', '&asd', '&notindot;', '&notindot', '&notindoti;', '&notindoti', '&amp']

console.log(samples.map(splitCharRef))

inattribute = true
console.log(samples.map(splitCharRef))

mod = '='
console.log(samples.map(splitCharRef))


