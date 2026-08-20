@echo off
cd /d "C:\Users\user\Desktop\SOLIFON_GITHUB_READY"
git init
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/germanhcsuj-pixel/its-my-first-project-.git
git add -A
git -c user.name="germanhcsuj-pixel" -c user.email="germanhcsuj-pixel@users.noreply.github.com" commit -m "Upload Solifon AI and Studio"
git push -u origin main --force
pause
