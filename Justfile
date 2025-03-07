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
	bun run format

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

# create a github release for the latest tag with auto-generated release notes
gh-release:
	#!/bin/sh
	VERSION=$(cat package.json | jq -r .version)
	gh release create v$VERSION --generate-notes

# create a new release for the latest tag with auto-generated release notes
create-release: tag-latest gh-release
alias cr := create-release

lint:
	bun lint

lint-fix:
	bun lint-fix
