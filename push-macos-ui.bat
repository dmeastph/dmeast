@echo off
cd /d C:\Users\USER\dmeast
del /f .git\index.lock 2>nul
git add -A
git commit -m "feat: homepage hybrid redesign — Rose bold headline, clinical category list in hero, Watsons deal cards, stats trust band"
git push origin main
echo.
echo Done! Vercel will deploy in ~30-60 seconds.
pause
