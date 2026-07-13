@echo off
cd /d C:\Users\USER\dmeast
del /f .git\index.lock 2>nul
git add -A
git commit -m "fix: build error — restore App.jsx + logo 130px darken blend" --allow-empty
git push origin main
echo.
echo Done! Vercel will deploy in ~30-60 seconds.
pause
