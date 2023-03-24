function* range (a, z = Infinity) { while (a <= z) yield a++ }
const intsInto = (map, i = 0) => new Proxy ({}, { get:($,k) => (map [k] = i, i++) })
const log = console.log.bind (console)


// HTML Lexer
// ==========

// TODO: Doctypes, CDATA, Plaintext, ...
// and clean up the produced token tags


// Characters - Equivalence Classes
// --------------------------------

let defaultClass
const eqClass = (() => {

  const
    [ nul, cr, lf, other, quot, squo, space, term, hash, amp, eq, que, excl, dash, lt, gt, slash, digit, A_F, G_WYZ, X ] = range (1)
  defaultClass = other

  const eqClassFn = c =>
    0x00 === c ? nul :
    0x0D === c ? cr :
    0x0A === c ? lf :
    0x09 === c ? space :
    0x20 === c ? space :
    0x21 === c ? excl :
    0x22 === c ? quot :
    0x23 === c ? hash :
    0x26 === c ? amp  :
    0x27 === c ? squo :
    0x2D === c ? dash :
    0x2F === c ? slash : 
    0x30 <= c && c <= 0x39 ? digit :
    0x3B === c ? term : 
    0x3C === c ? lt : 
    0x3D === c ? eq :
    0x3E === c ? gt : 
    0x3F === c ? que :
    0x41 <= c && c <= 0x46 ? A_F :
    0x58 === c ? X :
    0x78 === c ? X :
    0x47 <= c && c <= 0x5A ? G_WYZ :
    0x61 <= c && c <= 0x66 ? A_F :
    0x66 <= c && c <= 0x7A ? G_WYZ : defaultClass;

  // Precompute a lookup table

  const eq_array = new Uint8Array (0x7F);
  for (let i=0, l=0x7F; i<=l; i++)
    eq_array [i] = eqClassFn (i)
  return eq_array
}) ()


// Token Ids 
// ---------

const errorToken = 0
const tokens = { errorToken }
const {
  data, rawtext, rcdata, plaintext,
  nulls, space, newline,
  ampersand, lt,
  charRefDecimal, charRefHex, charRefNamed, charRefLegacy,
  mDeclStart,
  commentStart, commentData, commentEnd,
  bogusStart, bogusData, bogusEnd,
  startTagStart, endTagStart, tagEnd,
  attributeSep, attributeName, attributeAssign,
  valueStartApos, valueStartQuot, valueEnd,
  unquoted,
  squoted,
  quoted,
} = intsInto (tokens, 1)

const names = []
for (const k in tokens) names[tokens[k]] = k
// log (tokens, names)


// DFA States
// ----------

const [
  
  // Entry States

  Main, RcData, RawText,
  BeforeAttribute, BeforeAssign, /*BeforeValue,*/
  BeforeCommentData, InCommentData, Bogus,
  ValueQuoted, ValueAposed, ValueUnquoted,

  // Internal States

  RLTs, LXD, DD, DX,
  AmpH, AmpX, TOP,
  Nul, Wsp, BeforeValue, CR, Tsp, Wrd, Raw, Rcd, Att,
  Val, ValQ, ValS,
  Bog, Cmt, CmtD, CmtSD, Sep,   
  Amp, Ref, xRef, dRef,
  LT, LTs, LTx,
  STN, ETN, DTN,
  RawLT, RcdLT, LXDD, 
  TagE, Bog_, Cmt_,
  Eq, lQ_, Sq_, rQ_, nRef_, dRef_, xRef_, NL_

] = range (1)


const STOP = 0
const states = {
  Main, RcData, RawText, PlainText:TOP,
  BeforeAttribute, BeforeAssign, BeforeValue,
  BeforeCommentData, InCommentData, Bogus,
  ValueQuoted, ValueAposed, ValueUnquoted,
}


// State Transitions
// -----------------

// Columns are character classes, rows are states.
// The first column marks the acceptance of states, by labeling
// it with a nonzero token-type. The runtime assumes that states
// are pre-sorted, such that all states st >= minAccepts are
// accepting states that produce an output token. 

const ___ = STOP
const minAccepts = TOP

// REVIEW How shshould NUL be handled in rawtext / rcdata?
// TODO handle newlines separately always
// NB nulls in attribute names and values are to be always
// converted to u+fffd and they do not end unquoted values.


const table =  [
//                 nul   CR    LF    other  "     '    \s     ;     #     &     =     ?     !     -     <     >     /    0-9   A-F   G-WYZ  X   ;
[ 0,               ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // STOP
[ 0,               Nul,  CR,   NL_,  Wrd,  Wrd,  Wrd,  Wsp,  Wrd,  Wrd,  Amp,  Wrd,  Wrd,  Wrd,  Wrd,  LT,   Wrd,  Wrd,  Wrd,  Wrd,  Wrd,  Wrd  ], // Main
[ 0,               Nul,  CR,   NL_,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Amp,  Rcd,  Rcd,  Rcd,  Rcd,  RcdLT,Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd  ], // RcData
[ 0,               Nul,  CR,   NL_,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  RawLT,Raw,  Raw,  Raw,  Raw,  Raw,  Raw  ], // RawText
[ 0, /*TODO CRLF*/ Att,  Sep,  Sep,  Att,  Att,  Att,  Sep,  Att,  Att,  Att,  Att,  Att,  Att,  Att,  Att,  TagE, Sep,  Att,  Att,  Att,  Att  ], // BeforeAttribute
[ 0, /*TODO CRLF*/ Att,  Tsp,  Tsp,  Att,  Att,  Att,  Tsp,  Att,  Att,  Att,  Eq,   Att,  Att,  Att,  Att,  TagE, Sep,  Att,  Att,  Att,  Att  ], // BeforeAssign
[ 0,               Nul,  CR,   NL_,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  CmtSD,Cmt,  Cmt_, Cmt,  Cmt,  Cmt,  Cmt,  Cmt  ], // BeforeCommentData
[ 0,               Nul,  CR,   NL_,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  CmtD, Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt  ], // InCommentData
[ 0,               Nul,  CR,   NL_,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog_, Bog,  Bog,  Bog,  Bog,  Bog  ], // Bogus
[ 0,               Nul,  CR,   NL_,  ValQ, rQ_,  ValQ, ValQ, ValQ, ValQ, Amp,  ValQ, ValQ, ValQ, ValQ, ValQ, ValQ, ValQ, ValQ, ValQ, ValQ, ValQ ], // ValueQuoted
[ 0,               Nul,  CR,   NL_,  ValS, ValS, rQ_,  ValS, ValS, ValS, Amp,  ValS, ValS, ValS, ValS, ValS, ValS, ValS, ValS, ValS, ValS, ValS ], // ValueAposed
[ 0, /*TODO CRLF*/ Val,  Sep,  Sep,  Val,  Val,  Val,  Sep,  Val,  Val,  Amp,  Val,  Val,  Val,  Val,  Val,  TagE, Val,  Val,  Val,  Val,  Val  ], // ValueUnquoted
[ 0,               ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ETN,  ETN,  ETN  ], // RLTs:  after </ in rcdata and rawtext
[ 0,               ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  LXDD, ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // LXD:   after <!-
[ 0, /*TODO CRLF*/ Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  DX,   ___,  Cmt,  Cmt_, Cmt,  Cmt,  Cmt,  Cmt,  Cmt  ], // DD:    after --
[ 0, /*TODO CRLF*/ Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt_, Cmt,  Cmt,  Cmt,  Cmt,  Cmt  ], // DX:    after -!
[ 0        ,       ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  dRef, ___,  ___,  AmpX ], // AmpH:  after &#
[ 0        ,       ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  xRef, xRef, ___,  ___  ], // AmpX:  after &#x or &#X
[ plaintext,       TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP,  TOP  ], // TOP
[ nulls,           Nul,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // Nul    null bytes
[ space,           ___,  ___,  ___,  ___,  ___,  ___,  Wsp,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // Wsp    whitespace
[ unquoted,        Val,  ___,  ___,  Val,  lQ_,  Sq_,  ___,  Val,  Val,  Amp,  Val,  Val,  Val,  Val,  Val,  TagE, Val,  Val,  Val,  Val,  Val  ], // BeforeValue
[ newline,         ___,  ___,  NL_,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // CR     after CR
[ attributeSep,    ___,  Tsp,  Tsp,  ___,  ___,  ___,  Tsp,  ___,  ___,  ___,  Eq,   ___,  ___,  ___,  ___,  TagE, Sep,  ___,  ___,  ___,  ___  ], // Tsp    after space after attribute name
[ data,            ___,  ___,  ___,  Wrd,  Wrd,  Wrd,  ___,  Wrd,  Wrd,  ___,  Wrd,  Wrd,  Wrd,  Wrd,  ___,  Wrd,  Wrd,  Wrd,  Wrd,  Wrd,  Wrd  ], // Wrd    alphanumeric
[ rawtext,         ___,  ___,  ___,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  ___,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw  ], // Raw    rawtext
[ rcdata,          ___,  ___,  ___,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  ___,  Rcd,  Rcd,  Rcd,  Rcd,  ___,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd  ], // Rcd    rcdata
[ attributeName,   Att,  ___,  ___,  Att,  Att,  Att,  ___,  Att,  Att,  Att,  ___,  Att,  Att,  Att,  Att,  ___,  ___,  Att,  Att,  Att,  Att  ], // Att
[ unquoted,        Val,  ___,  ___,  Val,  Val,  Val,  ___,  Val,  Val,  ___,  Val,  Val,  Val,  Val,  Val,  ___,  Val,  Val,  Val,  Val,  Val  ], // Val
[ quoted,          ___,  ___,  ___,  ValQ, ___,  ValQ, ValQ, ValQ, ValQ, ___,  ValQ, ValQ, ValQ, ValQ, ValQ,ValQ,  ValQ, ValQ, ValQ, ValQ, ValQ ], // ValQ   double-quoted value
[ squoted,         ___,  ___,  ___,  ValS, ValS, ___,  ValS, ValS, ValS, ___,  ValS, ValS, ValS, ValS, ValS,ValS,  ValS, ValS, ValS, ValS, ValS ], // ValS   single-quoted value
[ bogusData  ,     ___,  ___,  ___,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  Bog,  ___,  Bog,  Bog,  Bog,  Bog,  Bog  ], // Bog    bogus-comment-data
[ commentData,     ___,  ___,  ___,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  ___,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt  ], // Cmt:   comment-data
[ commentData,     ___,  ___,  ___,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  DD,   Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt  ], // CmtD:  after - in comment
[ commentData,     ___,  ___,  ___,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt,  DX,   DD,   Cmt, Cmt_,  Cmt,  Cmt,  Cmt,  Cmt,  Cmt  ], // CmtSD: after - after <!--
[ attributeSep,    ___,  Sep,  Sep,  ___,  ___,  ___,  Sep,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___, TagE,  Sep,  ___,  ___,  ___,  ___  ], // Sep
[ ampersand,       ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  AmpH, ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  Ref,  Ref,  Ref  ], // Amp
[ charRefLegacy,   ___,  ___,  ___,  ___,  ___,  ___,  ___,  nRef_,___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  Ref,  Ref,  Ref,  Ref  ], // Ref
[ charRefHex,      ___,  ___,  ___,  ___,  ___,  ___,  ___,  xRef_,___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  xRef, xRef, ___,  ___  ], // xRef
[ charRefDecimal,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  dRef_,___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  dRef, ___,  ___,  ___  ], // dRef
[ lt,              ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  LTx,  LTx,  ___,  ___,  ___,  LTs,  ___,  STN,  STN,  STN  ], // LT:    after <
[ bogusStart,      ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ETN,  ETN,  ETN  ], // LTs:   after </
[ bogusStart,      ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  LXD,  ___,  ___,  ___,  ___,  DTN,  DTN,  DTN  ], // LTx:   after <!
[ startTagStart,   STN,  ___,  ___,  STN,  STN,  STN,  ___,  STN,  STN,  STN,  STN,  STN,  STN,  STN,  STN,  ___,  ___,  STN,  STN,  STN,  STN  ], // STN:   after <a
[ endTagStart,     ETN,  ___,  ___,  ETN,  ETN,  ETN,  ___,  ETN,  ETN,  ETN,  ETN,  ETN,  ETN,  ETN,  ETN,  ___,  ___,  ETN,  ETN,  ETN,  ETN  ], // ETN:   after </a
[ mDeclStart,      DTN,  ___,  ___,  DTN,  DTN,  DTN,  ___,  DTN,  DTN,  DTN,  DTN,  DTN,  DTN,  DTN,  DTN,  ___,  ___,  DTN,  DTN,  DTN,  DTN  ], // DTN:   after <!a
[ rawtext,         ___,  ___,  ___,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  Raw,  ___,  Raw,  RLTs, Raw,  Raw,  Raw,  Raw  ], // RawLT: after <
[ rcdata,          ___,  ___,  ___,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  Rcd,  ___,  Rcd,  RLTs, Rcd,  Rcd,  Rcd,  Rcd  ], // RcdLT: after <
[ commentStart,    ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // LXDD:  after <!--
[ tagEnd,          ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // TagE:  after >
[ bogusEnd,        ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // Bog_:  after >
[ commentEnd,      ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // Cmt_:  
[ attributeAssign, ___,  Eq ,  Eq ,  ___,  ___,  ___,  Eq ,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // Eq:    after =
[ valueStartQuot,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // lQ_    after "
[ valueStartApos,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // Sq_    after '
[ valueEnd,        ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // rQ_    after ' or " (or space)
[ charRefNamed,    ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // nRef_  after eg. &amp;
[ charRefDecimal,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // dRef_  after eg. &#10;
[ charRefHex,      ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // xRef_  after eg. &#xAA;
[ newline,         ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___,  ___  ], // NL_    after CRLF or LF
//                 nul   CR    LF    other  "     '    \s     ;     #     &     =     ?     !     -     <     >     /    0-9   A-F   G-WYZ  X   ;
]


// State machine bundle
// --------------------

const DFA = {
  eqClass,
  defaultClass,
  tokens,
  states,
  table,
  initialState: Main,
  minAccepts,
}

export default DFA