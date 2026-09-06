#!/usr/bin/env bash
set -e

WORKDIR="/path/to/my/project"
WORKDIR=$(realpath "$WORKDIR")

GITDIR="/path/to/where/history/is/stored"
GITDIR=$(realpath "$GITDIR")

BUNDLE_INSTALL_DIR="../dist/"

pushd "$BUNDLE_INSTALL_DIR"

./run.sh "$WORKDIR" "$GITDIR"

popd




