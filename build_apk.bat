@echo off
echo ========================================
echo  BUILD AAB BLITECA
echo ========================================

echo 1. Atualizando projeto...
bubblewrap init --manifest https://www.bliteca.com.br/manifest.json --directory . --skip-prompts --jdk "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"

echo 2. Copiando splash screen...
copy /Y "src\assets\splash.png" "app\src\main\res\drawable-hdpi\splash.png"
copy /Y "src\assets\splash.png" "app\src\main\res\drawable-mdpi\splash.png"
copy /Y "src\assets\splash.png" "app\src\main\res\drawable-xhdpi\splash.png"
copy /Y "src\assets\splash.png" "app\src\main\res\drawable-xxhdpi\splash.png"
copy /Y "src\assets\splash.png" "app\src\main\res\drawable-xxxhdpi\splash.png"

echo 3. Buildando AAB...
bubblewrap build --skipPwaValidation

echo ========================================
echo  AAB GERADO COM SUCESSO!
echo  Arquivo: app-release-bundle.aab
echo ========================================
pause
