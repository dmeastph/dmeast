@echo off
cd /d C:\Users\USER\dmeast
del /f .git\index.lock 2>nul
git add -A
git commit -m "feat: add 2 products (YUWELL suction + XSP-06 microscope) with images; fix logo blend + App.jsx restore" --allow-empty
git push origin main
echo.
echo Done! Vercel will deploy in ~30-60 seconds.
pause
