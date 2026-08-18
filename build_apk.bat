@echo off
echo ========================================
echo  BUILD APK BLITECA
echo ========================================

echo 1. Atualizando projeto...
bubblewrap init --manifest https://www.bliteca.com.br/manifest.json --directory . --skip-prompts --jdk "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"

echo 2. Copiando splash screen...
copy /Y "src\assets\splash.png" "app\src\main\res\drawable-hdpi\splash.png"
copy /Y "src\assets\splash.png" "app\src\main\res\drawable-mdpi\splash.png"
copy /Y "src\assets\splash.png" "app\src\main\res\drawable-xhdpi\splash.png"
copy /Y "src\assets\splash.png" "app\src\main\res\drawable-xxhdpi\splash.png"
copy /Y "src\assets\splash.png" "app\src\main\res\drawable-xxxhdpi\splash.png"

echo 3. Buildando APK...
bubblewrap build

echo 4. Assinando APK...
"C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot\bin\java.exe" -Xmx1024M -Xss1m -jar "C:\Users\biel_\.bubblewrap\android_sdk\build-tools\34.0.0\lib\apksigner.jar" sign --ks "C:\repositorio\bio-tek\bio-tek\android.keystore" --ks-key-alias bliteca --out app-release-signed.apk app-release-unsigned-aligned.apk

echo ========================================
echo  APK PRONTO!
echo ========================================
pause
