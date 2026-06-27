@echo off
cd /d C:\Users\USER\dmeast
del /f .git\index.lock 2>nul
git add -A
git commit -m "feat: macOS UI redesign — frosted glass navbar, SF Pro typography, apple gray surfaces"
git push origin main
pause
