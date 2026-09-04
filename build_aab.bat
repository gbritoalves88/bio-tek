@echo off
echo ========================================
echo  GERANDO AAB BLITECA
echo ========================================

cd /d "C:\repositorio\bio-tek\bio-tek\app"

echo Gerando AAB com Gradle...

call gradlew.bat bundleRelease

echo ========================================
echo  BUILD CONCLUIDO!
echo  Arquivo: app-release.aab
echo  Pasta: build\outputs\bundle\release\
echo ========================================
pause
