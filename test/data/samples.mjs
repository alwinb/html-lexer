const samples = 
[ '\n'
, '<h2>Legacy Named Character References</h2>'
, '<xmp title=&amp      >&amp</xmp>      <span>&amp</span>'
, '<xmp title=&amp;     >&amp;</xmp>     <span>&amp;</span>'
, '<xmp title=&ampo     >&ampo</xmp>     <span>&ampo</span>'
, '<xmp title=&amp*     >&amp*</xmp>     <span>&amp*</span>'
, '<xmp title="&amp "   >&amp </xmp>     <span>&amp </span>'
, '<xmp title=&amp=     >&amp=</xmp>     <span>&amp=</span>'
, '<xmp title=&notin    >&notin</xmp>    <span>&notin</span>'
, '<xmp title=&notit    >&notit</xmp>    <span>&notit</span>'
, '<xmp title=&notina   >&notina</xmp>   <span>&notina</span>'
, '<xmp title=&notita   >&notita</xmp>   <span>&notita</span>'
, '<xmp title=&notin;   >&notin;</xmp>   <span>&notin;</span>'
, '<xmp title=&notit;   >&notit;</xmp>   <span>&notit;</span>'
, '<xmp title=&notin;a  >&notin;a</xmp>  <span>&notin;a</span>'
, '<xmp title=&notit;a  >&notit;a</xmp>  <span>&notit;a</span>'
, '<xmp title=&notin=   >&notin=</xmp>   <span>&notin=</span>'
, '<xmp title=&notit=   >&notit=</xmp>   <span>&notit=</span>'
, '<xmp title=&notin;=  >&notin;=</xmp>  <span>&notin;=</span>'
, '<xmp title=&notit;=  >&notit;=</xmp>  <span>&notit;=</span>' // REVIEW (&notit; is not a named charref; but neither is &foo;)
, '<xmp title=&foo;=    >&foo;=</xmp>    <span>&foo;=</span>'
, '<xmp title=&foo;     >&foo;</xmp>     <span>&foo;</span>'
, '<a href="/foo&amp=a&amp&notin&notit&amp;&notin;&notit;">Link</a>'

, '\n'
, '<h2>Legacy character references in rcdata</h2>'
, `<textarea>Test &ampfoo`
, `<textarea>Test &notit;foo`
, `<textarea>Test &notin;foo`

, '\n'
, '<h2>Named Character References</h2>'
, 'charref: uncoded ampersand & in data'
, 'charref: <span title="uncoded ampersand & in attribute">'
, 'charref: named &amp; in data'
, 'charref: named non-terminated &amp in data'
, 'charref: named non-terminated &ampa in data'
, 'charref: hexadecimal &#xccc; in data'
, 'charref: hexadecimal non-terminated &#xccc in data'
, 'charref: decimal &#1092; in data'
, 'charref: decimal non-terminated &#110 in data'
, 'charref: special <input value=asda&not*=c></input>'
, 'charref: special <input value=asda&not=c></input>'
, 'charref: special <input value="asda&notit; I tell you"></input>'
, 'charref: non-special <input value=asda&notin*=c></input>'
, 'charref: non-special <input value=asda&notin=c></input>'
, 'charref: non-special <input value=asda&notin;=c></input>'
, 'charref: special &not*=c in data'
, 'charref: special &not=c in data'
, 'charref: special &notit; I tell you, in data'
, 'charref: special &notin; I tell you, in data'
, 'charref: non-special &notin*=c in data'
, 'charref: non-special &notin=c in data'
, 'charref: non-special &notin;=c in data'
, 'charref: named <input value="you &amp; me"/> in attribute'
, 'charref: named <input value=\'you &amp; me\'/> in attribute'
, 'charref: named <input value=you&#12me /> in attribute'
, 'charref: named <input value=&amp;me /> in attribute'
, 'charref: named <input value=&amp attr=val /> in attribute'
, 'charref: named <input value=&ampo attr=val /> in attribute'
, 'charref: bogus <input value="you &# am me"/> in attribute'
, 'charref: bogus <input value=\'you &# amp me\'/> in attribute'
, 'charref: bogus <input value=you&x ampme /> in attribute'
, 'charref: ampHash &amp;# such'

, '\n'
, 'rcdata <textarea> asdf & &amp; <textareaNot </textarea> and more'
, 'rcdata2 <textarea> asdf & &amp; </textarea( and not ending> it'
, 'rcdata3 <textarea> asdf & &amp; </textarea/ and ending> it, see <span>yes</span>'
, 'rcdata5 <textarea/> asdf & &amp and NOT ending < it, see <span>yes</span>'
, 'rcdata4 <textarea> asdf & &amp; </textarea and ending> it'
, 'rawtext <script> asdf &amp; <span> </scriptNot </script> and more'
, 'rawtext2 <script> asdf &amp; <span> </script( and> not ending it <span>'
, 'rawtext3 <script> asdf &amp; <span> </script/ and> ending it <span> see'
, 'rawtext4 <script> asdf &amp; <span> </script and ending it <span> see'
, 'script <!doctype html>hello <script><!-- asdf</script> thus'
, 'nonalpha tag This is not a <ém attr>tag</ém>'
, 'double open tag A double less than sign <<div attr>content</div>'
, 'bad end tag <div style=color:blue> This is blue </ div> And this too!'
, 'closePlaintext hi <plaintext>asd<as &ap, </plaintext> cannot be ended'

, '\n'
, 'comment: <!weird markup declaration> and such'
, 'comment: <!> and such'
, 'comment: <?> and such'
, 'comment: </> and such'
, 'comment: <!-> and such'
, 'comment: <?-> and such'
, 'comment: <!-> and such'
, 'comment: <!--> and such'
, 'comment: <?--> and such'
, 'comment: <!--> and such'
, 'comment: <!--!> part of the comment --> and such'
, 'comment: <!---!> part of the comment --> and such'
, 'comment: <!----!> and such'
, 'comment: <!-> and such'
, 'comment: <!-- with -> within --> and subsequent data'
, 'comment: <!-- with bogus end -> part of the comment --> and subsequent data'
, 'comment: <!-- Comment with -- double dash within --> and subsequent data'
, 'comment: <!-- Comment with --!- weird stuff within --> and subsequent data'
, 'comment: <!-- Comment with strange end --!> and subsequent data'
, 'bogus comment: <! with end !@> and subsequent data'
, 'bogus comment: </ with end !@> and subsequent data'
, 'bogus comment: <? with end !@> and subsequent data'
, 'bogus comment: <!- with end -> and subsequent data'

, '\n'
, '<!doctype foo>'
, `<!ba>`
, `<! xos >`

, '\n'
, 'missing space attribues connected <div name="a"name="b" >'
, 'nonalpha attribute weird template tag <div {name="a" name="b" >'
, 'normalHtml This is <span class = "s1">html</span> Yeah!'
, 'unescaped ampersand  data & such'
, 'unescaped ampersand Hash data &# such'
, 'unescaped ampersand HashEx data &#x such'
, 'unescaped ampersand HashExZed data &#xz such'

, '\n'
, 'slashes: <span/>'
, 'slashes: <span name=foo//>'
, 'slashes: <div//>'
, 'slashes: <div/foo/bar//>'
, 'slashes: <span//>'
, 'slashes: <span />'
, 'slashes: <span <>'
, 'slashes: <span //>'
, 'slashes: <span / />'
, 'slashes: <span/////>'
, 'slashes: <span/////name////=/blabla>'
, 'slashes: <span / attr >foo bar</span>'
, 'slashes: <span name=/ >asdf'
, 'slashes: <span name=/>asdf'
, 'slashes: <span name=// />asdf'
, 'slashes: <span name= / />asdf'

, '\n'
, 'weirdEquals <span attr = / asd >content</span>'
, 'weirdEquals2 <span attr = @ asd >content</span>'
, 'weirdEquals3 <span attr /= asd >content</span>'
, 'weirdEquals4 <span attr @= asd >content</span>'
, 'missingValue <span name=>asdf'
, 'invalidAttributeValue1 <div class= =at >'
, 'invalidAttributeValue2 <div class= <at >'
, 'invalidAttributeValue3 <div class= `at >'
]


const EOFSamples =
[ 'data state eof in da'
, 'tagOpen state eof in <'
, 'tagName state eof in <d'
, 'selfClosingStartTag state in <div /'
, 'endTagOpen state in </a'
, 'beforeAttributeName state <div '
, 'attributeName state <div at'
, 'afterAttributeName state <div attr '
, 'beforeAttributeValue state <div attr ='
, 'attributeValueDoubleQuoted state <div attr="te'
, 'attributeValueSingleQuoted state <div attr=\'te'
, 'attributeValueUnquoted state <div attr=te'
, 'afterAttributeValueQuoted state <div attr="test"'
, 'markupDeclarationOpen state a markup decl <!'
, 'selfClosingTag state An eof after a / <span /'
, 'commentStart state a comment start <!--'
, 'commentStartDash state a comment start dash <!---'
, 'comment state a comment <!-- hello th'
, 'commentEndDash state a comment end dash <!-- hello th -'
, 'commentEnd state a comment end <!-- hello th --'
, 'commentEndBang state a comment end bang <!-- hello th --!'
, 'bogusComment state <! bogus comment'
, 'charRefIn_ state data &'
, 'numericCharRef state data &#'
, 'hexadecimalCharRef state data &#x'
, 'hexDigits state data &#x1a'
, 'decimalCharRef state data &#1'
, 'namedCharRef state data &name'
, 'namedCharRefInAttr state <span attr="asd&amp;a&b c">text</span>'
, 'namedCharRefInData state named charref in data asd&amp;a&b cde'
, 'rawtext state eof in raw text <script> funct'
, 'plaintext state eof in raw text <plaintext> asdf'
, 'rawtextLessThanSign state eof in raw text less than sign <script> if (i<'
, 'rawtextEndTagOpen state eof in raw text end tag open <script> asdf </'
]

const samples2 = [
  '<span a=&amp b>',
  '<table><input type=hidden type=still-hidden>',

  // '</ tttt>',
  // '<table><input type = hidden  ///  /  type= still-hidden&amp;foo >foo',
  // '<script type=hidden ///type=still-hidden&amp;foo >foo</x>bae',
  // '<!doctype script type = hidden ///type= still-hidden&amp;foo >foo</x>bae',
  // '<!--> <!---> <!-----> bae',
  // `<test val = unq&amped bar="foo" bee='buzz'> bae`,
  // `<plaintext = unq&amped bar="foo" bee='buzz'> baeasas </plaintext > `,
  // `<test val = unq&amped b   //   >`,

  '<script a   =\n  b>foo bar </script>',
  '<h1>Hello, World</h1>',
  '<!namas >',
  '<foo/>',

  // Newlines
  // --------

  // Newlines in data
  `Test &amp; Line1\nLine2\r\rLine4\r\nLine5`,
  `Test &amp; Line1 \nLine2 \r\r Line4 \r\nLine5`,

  // Newlines in rcdata
  `<textarea>Test &amp; Line1\nLine2\r\rLine4\r\nLine5`,
  `<textarea>Test &amp; Line1<\nLine2<\r\rLine4<\r\nLine5`,
  `<textarea>Test &amp; Line1</\nLine2</\r\rLine4</\r\nLine5`,

  // Newlines in attribute values
  `<div title="Test &amp; Line1\nLine2\r\rLine4\r\nLine5" foo >`,
  `<div title='Test &amp; Line1\nLine2\r\rLine4\r\nLine5' foo >`,
  `<div title="Test &amp; Line1 \nLine2 \r\rLine4 \r\nLine5" foo >`,
  `<div title='Test &amp; Line1 \nLine2 \r\rLine4 \r\nLine5' foo >`,

  // Newlines in rawtext
  `<style>Test &amp; Line1\nLine2\r\rLine4\r\nLine5`,
  `<style>Test &amp; Line1<\nLine2<\r\rLine4<\r\nLine5`,
  `<style>Test &amp; Line1</\nLine2</\r\rLine4</\r\nLine5`,

  // Newlines in comments
  `<!-- Test &amp; Line1\nLine2\r\rLine4\r\nLine5`,
  `<!? Test &amp; Line1\nLine2\r\rLine4\r\nLine5`,

  // No newlines in plaintext then
  `<plaintext>Test &amp; Line1\nLine2\r\rLine4\r\nLine5`,
  
  // NUL
  // ---

  // NULs in data
  `Test &amp; Line1\0Line2\0\0Line4\0\0Line5`,
  `Test &amp; Line1 \0Line2 \0\0 Line4 \0\0Line5`,

  // NULs in rcdata
  `<textarea>Test &amp; Line1\0Line2\0\0Line4\0\0Line5`,
  `<textarea>Test &amp; Line1<\0Line2<\0\0Line4<\0\0Line5`,
  `<textarea>Test &amp; Line1</\0Line2</\0\0Line4</\0\0Line5`,

  // NULs in attribute values
  `<div title="Test &amp; Line1\0Line2\0\0Line4\0\0Line5" foo >`,
  `<div title='Test &amp; Line1\0Line2\0\0Line4\0\0Line5' foo >`,
  `<div title=Line1\0Line2\0\0Line4\0\0Line5 foo >`,

  // NULs in rawtext
  `<style>Test &amp; Line1\0Line2\0\0Line4\0\0Line5`,
  `<style>Test &amp; Line1<\0Line2<\0\0Line4<\0\0Line5`,
  `<style>Test &amp; Line1</\0Line2</\0\0Line4</\0\0Line5`,

  // NULs in comments
  `<!-- Test &amp; Line1\0Line2\0\0Line4\0\0Line5`,
  `<!? Test &amp; Line1\0Line2\0\0Line4\0\0Line5`,

  // No NULs in plaintext then
  `<plaintext>Test &amp; Line1\0Line2\0\0Line4\0\0Line5`,


]


// Exports
// -------
export { samples, samples2, EOFSamples }