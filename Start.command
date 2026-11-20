#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ ! -x .runtime/uv ]; then
    case "$(uname -s)-$(uname -m)" in
        Darwin-arm64) target=aarch64-apple-darwin; digest=5aeca67f2283f75235de40d0bd9c0a5bbc5fce23b6d48b3bf9fa1b2db08382ca ;;
        Darwin-x86_64) target=x86_64-apple-darwin; digest=617a3211261b0fc739562f0071aa34e9739797c510208ede8e2977c30903d041 ;;
        Linux-x86_64) target=x86_64-unknown-linux-gnu; digest=a7fbaff2b9a271d85c1bdb540941090fd1ce011797b4abeb48e4dcd39c2471d5 ;;
        Linux-aarch64) target=aarch64-unknown-linux-gnu; digest=0797542018e541a9288855df555c8077eed06f7a47d206362030480e8ecc9f3d ;;
        *) echo "Unsupported desktop platform: $(uname -sm)" >&2; exit 1 ;;
    esac
    echo 'Preparing the local workbench for its first run...'
    mkdir -p .runtime
    stage=$(mktemp -d .runtime/bootstrap.XXXXXX)
    trap 'rm -rf "$stage"' EXIT
    curl -fL --retry 2 -o "$stage/uv.tar.gz" "https://github.com/astral-sh/uv/releases/download/0.13.9/uv-$target.tar.gz"
    if command -v sha256sum >/dev/null 2>&1; then
        printf '%s  %s\n' "$digest" "$stage/uv.tar.gz" | sha256sum -c -
    else
        printf '%s  %s\n' "$digest" "$stage/uv.tar.gz" | shasum -a 256 -c -
    fi
    tar -xzf "$stage/uv.tar.gz" -C "$stage" "uv-$target/uv"
    mv "$stage/uv-$target/uv" .runtime/uv
    rm -rf "$stage"
    trap - EXIT
fi
exec .runtime/uv run --locked --python 3.12 workbench.py "$@"
