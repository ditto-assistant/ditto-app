set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

start:
	bun run start

build:
	bun run build

serve:
	bun run serve

build-dev:
	bun run build:dev

# build and serve the development version
bs: build-dev serve

format:
	prettier --write **/*.{ts,tsx,js,jsx,md,json,css}

# push a new tag to the remote repository
tag-latest:
	#!/bin/sh
	VERSION=$(cat package.json | jq -r .version)
	git tag -a v$VERSION -m "Release $VERSION"
	git push origin --tags

# print the command to push a new tag to the remote repository
tag-latest-dry:
	#!/bin/sh
	VERSION=$(cat package.json | jq -r .version)
	echo "git tag -a v$VERSION -m \"Release $VERSION\""
	echo "git push origin --tags"

install-stripe:
	brew install stripe/stripe-cli/stripe