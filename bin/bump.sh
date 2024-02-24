#!/bin/bash

version=$(git describe --tags --abbrev=0)
version=$(echo $version | sed 's/^v//g')
sed -i "s/^version.*/version = \"$version\"/g" src-tauri/Cargo.toml
sed -i "s/\"version\".*/\"version\": \"$version\",/g" package.json
