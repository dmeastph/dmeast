@echo off
cd /d C:\Users\USER\dmeast
del /f .git\index.lock 2>nul
git add -A
git commit -m "fix: shop page crash, about page full name, hero heading, bigger logo"
git push origin main
echo.
echo Done! Vercel will deploy in ~30-60 seconds.
pause
