@echo off
cd /d "%~dp0"

echo ============================================================
echo   dmeast - Push to GitHub + Vercel
echo ============================================================
echo.

REM ── Delete ALL stale git lock files ──────────────────────────
if exist ".git\index.lock"       del /f /q ".git\index.lock"
if exist ".git\HEAD.lock"        del /f /q ".git\HEAD.lock"
if exist ".git\MERGE_HEAD.lock"  del /f /q ".git\MERGE_HEAD.lock"
if exist ".git\COMMIT_EDITMSG.lock" del /f /q ".git\COMMIT_EDITMSG.lock"
echo [OK] Lock files cleared.

REM ── Stage everything that changed ────────────────────────────
git add -A
echo [OK] Staged all changes.

REM ── Commit if there is anything new ──────────────────────────
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "fix: editable order dates + remove date from track page"
    echo [OK] Committed.
) else (
    echo [INFO] Nothing new to commit.
)

REM ── Push ─────────────────────────────────────────────────────
git push origin main
if errorlevel 1 (
    echo [ERROR] Push failed. Check above for details.
) else (
    echo [OK] Pushed! Vercel deploying now - wait ~2 min then refresh.
)
echo.
pause
