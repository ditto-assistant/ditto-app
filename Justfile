set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

start:
	bun run start

build:
	bun run build

serve:
	bun run serve

bs: build serve

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