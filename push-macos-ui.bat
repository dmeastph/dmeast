@echo off
cd /d C:\Users\USER\dmeast
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
del /f api\add-products.js 2>nul
del /f move-images.bat 2>nul

REM Copy watermark-cleaned product images from Downloads
echo Copying product images...
if exist "%USERPROFILE%\Downloads\lab-07.png" (
  copy /Y "%USERPROFILE%\Downloads\lab-07.png" "public\images\lab-07.png"
  del "%USERPROFILE%\Downloads\lab-07.png" 2>nul
  echo [OK] lab-07.png (microscope)
) else (
  echo [SKIP] lab-07.png not in Downloads
)
if exist "%USERPROFILE%\Downloads\icu-04.png" (
  copy /Y "%USERPROFILE%\Downloads\icu-04.png" "public\images\icu-04.png"
  del "%USERPROFILE%\Downloads\icu-04.png" 2>nul
  echo [OK] icu-04.png (suction machine)
) else (
  echo [SKIP] icu-04.png not in Downloads
)

git add -A
git commit -m "feat: Maya payment — redirect Visa/Mastercard to paymaya.me link; add product images" --allow-empty
git push origin main
echo.
echo Done! Vercel will deploy in ~30-60 seconds.
pause
