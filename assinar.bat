@echo off
echo ========================================
echo  ASSINANDO APK BLITECA
echo ========================================

"C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot\bin\java.exe" -Xmx1024M -Xss1m -jar "C:\Users\biel_\.bubblewrap\android_sdk\build-tools\34.0.0\lib\apksigner.jar" sign --ks "C:\repositorio\bio-tek\bio-tek\android.keystore" --ks-key-alias bliteca --out app-release-signed.apk app-release-unsigned-aligned.apk

echo ========================================
echo  APK ASSINADO COM SUCESSO!
echo  Arquivo: app-release-signed.apk
echo ========================================
pause
