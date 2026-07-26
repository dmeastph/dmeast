@echo off
cd /d C:\Users\USER\dmeast
del /f .git\index.lock 2>nul
git add -A
git commit -m "fix: bust Vercel build cache — force fresh bundle for sandbox fix + new products" --allow-empty
git push origin main
echo.
echo Done! Vercel will deploy in ~30-60 seconds.
pause
