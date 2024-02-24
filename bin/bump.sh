#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <new_version>"
    exit 1
fi
sed -i "s/^version.*/version = \"$1\"/g" src-tauri/Cargo.toml
sed -i "s/\"version\".*/\"version\": \"$1\",/g" package.json
