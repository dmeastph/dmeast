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
    goto :end
)

REM Must have a pending instruction file
if not exist ".cowork-pending.txt" (
    echo [INFO] No .cowork-pending.txt found - nothing to push.
    echo.
    echo Cowork writes this file when there's a change ready.
    echo Ask Cowork in chat to prepare a change first.
    goto :end
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
    goto :end
)
if "!MSG!"=="" (
    echo [ERROR] Second line of .cowork-pending.txt must be the commit message.
    goto :end
)

echo Branch:  !BRANCH!
echo Message: !MSG!
echo.

REM Stash any working tree changes (we'll move them onto the new branch)
echo [1/7] Stashing working changes...
git stash push -u -m "cowork-pending-stash" >nul 2>&1

REM Switch to main and pull latest
echo [2/7] Updating main from origin...
git checkout main >nul 2>&1
git pull origin main
if errorlevel 1 (
    echo [ERROR] Could not pull main. Resolve manually and re-run.
    git stash pop >nul 2>&1
    goto :end
)

REM Create or reuse the branch
echo [3/7] Creating branch !BRANCH!...
git show-ref --verify --quiet refs/heads/!BRANCH!
if not errorlevel 1 (
    echo       Branch already exists locally - resetting it to main.
    git branch -D !BRANCH! >nul 2>&1
)
git checkout -b !BRANCH!
if errorlevel 1 (
    echo [ERROR] Could not create branch.
    goto :end
)

REM Restore stashed changes onto the new branch
echo [4/7] Restoring changes onto branch...
git stash pop >nul 2>&1

REM Stage everything except the pending file
echo [5/7] Staging files...
git add .
git reset HEAD .cowork-pending.txt >nul 2>&1

REM Anything to commit?
git diff --staged --quiet
if not errorlevel 1 (
    echo [ERROR] Nothing staged - no files were changed.
    git checkout main >nul 2>&1
    goto :end
)

REM Commit
echo [6/7] Committing...
git commit -m "!MSG!"
if errorlevel 1 (
    echo [ERROR] Commit failed.
    goto :end
)

REM Push
echo [7/7] Pushing to origin...
git push -u origin !BRANCH!
if errorlevel 1 (
    echo [ERROR] Push failed. Check your network and GitHub access.
    goto :end
)

REM Back to main, delete the pending file
git checkout main >nul 2>&1
del .cowork-pending.txt >nul 2>&1

echo.
echo ============================================================
echo   SUCCESS - !BRANCH! is on GitHub
echo ============================================================
echo.
echo Vercel will build a preview in about 30-60 seconds.
echo Opening GitHub to create the Pull Request...
echo.
start "" "https://github.com/dmeastph/dmeast/pull/new/!BRANCH!"

:end
echo.
pause
