@echo off
setlocal
pushd "%~dp0" || exit /b 1
if not exist ".runtime\uv.exe" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\bootstrap.ps1"
    if errorlevel 1 goto failed
)
".runtime\uv.exe" run --locked --python 3.12 workbench.py %*
if errorlevel 1 goto failed
popd
exit /b 0
:failed
echo Startup failed. Check the message above and restart to retry.
if "%~1"=="" pause
popd
exit /b 1
