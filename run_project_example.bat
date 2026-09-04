@ECHO OFF
SETLOCAL enabledelayedexpansion

SET "WORKDIR=%~dp0"
SET "WORKDIR=%WORKDIR:~0,-1%"

SET "GITDIR=X:\Track-history\py-project"

SET "BUNDLE_INSTALL_DIR=%USERPROFILE%\AppData\Local\gitgui"

PUSHD "%BUNDLE_INSTALL_DIR%"

bash run.sh "!WORKDIR!" "!GITDIR!"

POPD


