@echo off
echo ========================================
echo  ASSINANDO AAB BLITECA
echo ========================================

set JARSIGNER="C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot\bin\jarsigner.exe"
set KEYSTORE="C:\repositorio\bio-tek\bio-tek\android.keystore"
set AAB_IN="C:\repositorio\bio-tek\bio-tek\android\app\build\outputs\bundle\release\app-release.aab"
set AAB_OUT="C:\repositorio\bio-tek\bio-tek\android\app-release-signed.aab"

echo Assinando AAB com jarsigner...

%JARSIGNER% -keystore %KEYSTORE% -storepass "27184546Biel$$$" -keypass "27184546Biel$$$" -signedjar %AAB_OUT% %AAB_IN% bliteca

echo ========================================
echo  AAB ASSINADO COM SUCESSO!
echo  Arquivo: app-release-signed.aab
echo ========================================
pause
