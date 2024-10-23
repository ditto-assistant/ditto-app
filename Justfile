set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

start:
	bun run start

build:
	bun run build

serve:
	bun run serve
