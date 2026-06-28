@echo off
cd /d C:\Users\USER\dmeast
del /f .git\index.lock 2>nul
git add -A
git commit -m "fix: missing imports — AboutPage WhyChooseSection, CartPage LeafletAddressMap+PaymentProofUpload, TrackOrderPage PaymentProofUpload"
git push origin main
echo.
echo Done! Vercel will deploy in ~30-60 seconds.
pause
