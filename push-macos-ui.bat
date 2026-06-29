@echo off
cd /d C:\Users\USER\dmeast
del /f .git\index.lock 2>nul
git add -A
git commit -m "fix: logo 130px, navbar 100px, blend mode darken for bg removal"
git push origin main
echo.
echo Done! Vercel will deploy in ~30-60 seconds.
pause
