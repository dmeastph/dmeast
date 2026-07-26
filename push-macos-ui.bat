@echo off
cd /d C:\Users\USER\dmeast
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
del /f api\add-products.js 2>nul
git add -A
git commit -m "chore: remove temp add-products endpoint (products seeded directly via Firestore console)" --allow-empty
git push origin main
echo.
echo Done! Vercel will deploy in ~30-60 seconds.
pause
