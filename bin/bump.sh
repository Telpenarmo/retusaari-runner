#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <new_version>"
    exit 1
fi
version=$(echo $1 | sed 's/^v//g')
sed -i "s/^version.*/version = \"$version\"/g" src-tauri/Cargo.toml
sed -i "s/\"version\".*/\"version\": \"$version\",/g" package.json
