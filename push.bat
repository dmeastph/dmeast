@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo ============================================================
echo   Cowork Push Helper - dmeast
echo ============================================================
echo.

REM Must be a git repo
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERROR] This folder is not a git repository.

)

REM Must have a pending instruction file
if not exist ".cowork-pending.txt" (
    echo [INFO] No .cowork-pending.txt found - nothing to push.
    echo.
    echo Cowork writes this file when there's a change ready.
main
)

REM Read branch (line 1) and commit message (line 2)
set "BRANCH="
set "MSG="
set "LINENUM=0"
for /f "usebackq tokens=* delims=" %%L in (".cowork-pending.txt") do (
    set /a LINENUM+=1
    if !LINENUM!==1 set "BRANCH=%%L"
    if !LINENUM!==2 set "MSG=%%L"
)

if "!BRANCH!"=="" (
    echo [ERROR] First line of .cowork-pending.txt must be the branch name.
>>>>>> main
)

echo Branch:  !BRANCH!
echo Message: !MSG!
echo.


git checkout main >nul 2>&1
del .cowork-pending.txt >nul 2>&1

echo.
echo ============================================================
echo   SUCCESS - !BRANCH! is on GitHub
echo ============================================================
echo.
