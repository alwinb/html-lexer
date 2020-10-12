.PHONY: all clean

files = browser.js index.js lexer.js tokens.js
sources = $(addprefix lib/, $(files))

#run: all
#	@ echo $(sources)

all: dist/html-lexer.min.js

dist/html-lexer.min.js: dist/ $(sources)
	@ echo "Making a minified browser bundle"
	@ browserify lib/browser.js | terser -cm > dist/html-lexer.min.js

dist/:
	@ mkdir dist/

clean:
	@ echo "Removing dist/ directory"
	@ test -d dist/ && rm -r dist/ || exit 0

