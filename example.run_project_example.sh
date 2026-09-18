#!/usr/bin/env bash
set -e

WORKDIR="/path/to/my/project"
WORKDIR=$(realpath "$WORKDIR")

GITDIRLOC="/path/to/where/history/is/stored"
GITDIRLOC=$(realpath "$GITDIRLOC")

BUNDLE_INSTALL_DIR="../dist/"

pushd "$BUNDLE_INSTALL_DIR"

./run.sh "$WORKDIR" "$GITDIRLOC"

popd




