@ECHO OFF
SETLOCAL enabledelayedexpansion

SET "WORKDIR=%~dp0"
SET "WORKDIR=%WORKDIR:~0,-1%"

SET "GITDIRLOC=X:\Track-history\py-project"

SET "BUNDLE_INSTALL_DIR=%USERPROFILE%\AppData\Local\gitgui"

PUSHD "%BUNDLE_INSTALL_DIR%"

bash run.sh "!WORKDIR!" "!GITDIRLOC!"
IF !ERRORLEVEL! NEQ 0 ( ECHO Error! && pause && exit /b !ERRORLEVEL! )


POPD


