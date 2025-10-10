.PHONY: all install build

build:
	@npm run build

install:
	@npm install --verbose

all: install build

