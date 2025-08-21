@echo off
setlocal enabledelayedexpansion

echo ===================================
echo   BUILD APK COM JAVA 17 - AGENTE
echo ===================================

echo.
echo [1/8] Verificando Java 17...
java -version | findstr "17.0"
if errorlevel 1 (
    echo ERRO: Java 17 nao encontrado!
    exit /b 1
)
echo ✓ Java 17 confirmado

echo.
echo [2/8] Limpando configuracoes anteriores...
if exist "platforms\android" rmdir /s /q "platforms\android"
if exist "plugins" rmdir /s /q "plugins"
if exist "node_modules" rmdir /s /q "node_modules"
echo ✓ Limpeza concluida

echo.
echo [3/8] Reinstalando dependencias...
npm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias
    exit /b 1
)
echo ✓ Dependencias instaladas

echo.
echo [4/8] Configurando Gradle para Java 17...
(
echo org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8
echo android.useAndroidX=true
echo android.enableJetifier=true
echo org.gradle.daemon=false
echo org.gradle.configureondemand=true
echo org.gradle.parallel=false
echo org.gradle.caching=false
) > gradle.properties
echo ✓ Gradle configurado

echo.
echo [5/8] Adicionando plataforma Android compativel com Java 17...
cordova platform add android@12.0.1
if errorlevel 1 (
    echo ERRO: Falha ao adicionar plataforma Android
    exit /b 1
)
echo ✓ Plataforma Android adicionada

echo.
echo [6/8] Configurando build.gradle personalizado...
timeout /t 2 > nul

:: Aguardar a criacao dos arquivos
:wait_files
if not exist "platforms\android\app\build.gradle" (
    timeout /t 1 > nul
    goto wait_files
)

:: Criar build-extras.gradle para Java 17
(
echo android {
echo     compileOptions {
echo         sourceCompatibility JavaVersion.VERSION_17
echo         targetCompatibility JavaVersion.VERSION_17
echo     }
echo     
echo     compileSdkVersion 34
echo     buildToolsVersion "34.0.0"
echo     
echo     defaultConfig {
echo         minSdkVersion 24
echo         targetSdkVersion 34
echo         versionCode 1
echo         versionName "1.0.0"
echo     }
echo     
echo     buildTypes {
echo         release {
echo             minifyEnabled false
echo             shrinkResources false
echo             proguardFiles getDefaultProguardFile('proguard-android.txt'^), 'proguard-rules.pro'
echo         }
echo     }
echo }
) > "platforms\android\app\build-extras.gradle"

:: Configurar Gradle Wrapper para versao compativel
echo distributionUrl=https\://services.gradle.org/distributions/gradle-8.4-bin.zip > "platforms\android\gradle\wrapper\gradle-wrapper.properties"

echo ✓ Build configurado para Java 17

echo.
echo [7/8] Criando keystore para assinatura...
set KEYSTORE_FILE=desenho-colaborativo.keystore
set KEYSTORE_ALIAS=desenho-app
set KEYSTORE_PASS=DesenhoColaborativo2024@

if not exist "%KEYSTORE_FILE%" (
    keytool -genkey -v -keystore "%KEYSTORE_FILE%" -alias "%KEYSTORE_ALIAS%" -keyalg RSA -keysize 2048 -validity 10000 -storepass "%KEYSTORE_PASS%" -keypass "%KEYSTORE_PASS%" -dname "CN=Desenho Colaborativo, OU=Mobile App, O=Desenho Colaborativo, L=Brasil, S=Brasil, C=BR"
    echo ✓ Keystore criado
) else (
    echo ✓ Keystore existente encontrado
)

:: Criar build.json para assinatura
(
echo {
echo   "android": {
echo     "release": {
echo       "keystore": "%KEYSTORE_FILE%",
echo       "storePassword": "%KEYSTORE_PASS%",
echo       "alias": "%KEYSTORE_ALIAS%",
echo       "password": "%KEYSTORE_PASS%",
echo       "keystoreType": "jks"
echo     }
echo   }
echo }
) > build.json

echo.
echo [8/8] Gerando APK de release...
echo Isso pode demorar alguns minutos...
cordova build android --release --verbose

if errorlevel 1 (
    echo.
    echo ❌ ERRO: Falha ao gerar APK
    echo.
    echo Tentando diagnosticar o problema...
    echo.
    echo Gradle version:
    platforms\android\gradlew.bat --version
    echo.
    echo Android SDK info:
    if defined ANDROID_HOME (
        echo ANDROID_HOME: %ANDROID_HOME%
    ) else (
        echo ANDROID_HOME nao definido
    )
    exit /b 1
)

echo.
echo ===================================
echo      ✓ APK GERADO COM SUCESSO!
echo ===================================

:: Localizar o APK
set APK_PATH=platforms\android\app\build\outputs\apk\release\app-release.apk
if exist "%APK_PATH%" (
    echo.
    echo 📱 APK localizado em: %APK_PATH%
    echo 📊 Tamanho do arquivo:
    dir "%APK_PATH%" | findstr "app-release.apk"
    echo.
    echo 🚀 PRONTO PARA GOOGLE PLAY STORE!
    echo.
    echo Proximos passos:
    echo 1. Teste o APK em um dispositivo Android
    echo 2. Faça upload no Google Play Console
    echo 3. Preencha as informacoes da loja
    echo.
) else (
    echo ❌ APK nao encontrado no local esperado
    echo Procurando em outros locais...
    dir platforms\android\app\build\outputs\apk\*.apk /s
)

echo.
echo Keystore salvo como: %KEYSTORE_FILE%
echo IMPORTANTE: Mantenha este arquivo seguro para updates futuros!
echo.
pause
