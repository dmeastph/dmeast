@echo off
cd /d C:\Users\USER\dmeast

echo ============================================
echo   DMEAST Firebase Functions Deployment
echo ============================================
echo.

REM Step 1: Install function dependencies
echo [1/3] Installing function dependencies...
cd functions
call npm install
cd ..
echo.

REM Step 2: Deploy functions
echo [2/3] Deploying to Firebase (project: dmeast-516cc)...
call firebase deploy --only functions --project dmeast-516cc
echo.

REM Step 3: Trigger immediate cleanup to free space NOW
echo [3/3] Triggering emergency cleanup to free storage space...
echo Calling cleanup endpoint...
curl -s -X POST ^
  -H "x-cleanup-secret: dmeast-cleanup-secret-2024" ^
  -H "Content-Length: 0" ^
  "https://asia-southeast1-dmeast-516cc.cloudfunctions.net/triggerStorageCleanup"
echo.
echo ============================================
echo Done! Check above for how many files deleted.
echo Uploads should work again after cleanup.
echo ============================================
pause
