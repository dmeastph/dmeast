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
    pause
    exit /b 1
)

REM Must have a pending instruction file
if not exist ".cowork-pending.txt" (
    echo [INFO] No .cowork-pending.txt found - nothing to push.
    echo.
    echo Cowork writes this file when there's a change ready.
    pause
    exit /b 0
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
    pause
    exit /b 1
)
if "!MSG!"=="" (
    echo [ERROR] Second line of .cowork-pending.txt must be the commit message.
    pause
    exit /b 1
)

echo Branch:  !BRANCH!
echo Message: !MSG!
echo.

REM Stash any working changes (will move to new branch)
echo [1/6] Stashing working changes...
git stash push -u -m "cowork-pending-stash" >nul 2>&1

REM Switch to main. Best-effort pull (don't fail if pull errors)
echo [2/6] Switching to main and trying to update from origin...
git checkout main >nul 2>&1
git pull --ff-only origin main >nul 2>&1
if errorlevel 1 (
    echo       [WARN] Could not fast-forward main from origin. Continuing with local main.
)

REM Delete the local branch if it exists from a previous attempt
git show-ref --verify --quiet refs/heads/!BRANCH!
if not errorlevel 1 (
    git branch -D !BRANCH! >nul 2>&1
)

REM Create new branch from main
echo [3/6] Creating branch !BRANCH!...
git checkout -b !BRANCH!
if errorlevel 1 (
    echo [ERROR] Could not create branch.
    git stash pop >nul 2>&1
    pause
    exit /b 1
)

REM Restore stashed changes onto new branch
echo [4/6] Restoring changes onto branch...
git stash pop >nul 2>&1

REM Stage all changes except the pending hint file
echo [5/6] Committing...
git add .
git reset HEAD .cowork-pending.txt >nul 2>&1
git commit -m "!MSG!"
if errorlevel 1 (
    echo [ERROR] Commit failed - nothing was staged.
    pause
    exit /b 1
)

REM Push
echo [6/6] Pushing to origin...
git push -u origin !BRANCH!
if errorlevel 1 (
    echo [ERROR] Push failed. Check network and GitHub access.
    pause
    exit /b 1
)

REM Switch back to main, delete the hint file
git checkout main >nul 2>&1
del .cowork-pending.txt >nul 2>&1

echo.
echo ============================================================
echo   SUCCESS - !BRANCH! is on GitHub
echo ============================================================
echo.
echo Vercel preview building - about 30-60 seconds.
echo Opening GitHub to create the Pull Request...
echo.
start "" "https://github.com/dmeastph/dmeast/pull/new/!BRANCH!"
pause
exit /b 0
