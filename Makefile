.PHONY: all clean

files = index.mjs dfa.mjs
sources = $(addprefix src/, $(files))

#run: all
#	@ echo $(sources)

all: dist/html-lexer.mjs dist/html-lexer.js

dist/html-lexer.mjs: dist/ $(sources) Makefile
	@ echo "Making an ESModule"
	@ esbuild --bundle --minify --keep-names --format=esm src/index.mjs > dist/html-lexer.mjs

dist/html-lexer.js: dist/ $(sources) Makefile
	@ echo "Making an CommonJS bundle"
	@ esbuild --bundle --minify --keep-names --platform=node src/index.mjs > dist/html-lexer.js

dist/:
	@ mkdir dist/

clean:
	@ echo "Removing dist/ directory"
	@ test -d dist/ && rm -r dist/ || exit 0

