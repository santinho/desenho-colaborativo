@echo off
setlocal enabledelayedexpansion

echo ===================================
echo     BUILD APK JAVA 17 - ROBUSTO
echo ===================================

echo.
echo [1/8] Verificando Java 17...
java -version 2>&1 > java_version.tmp
type java_version.tmp | find "17.0" >nul
if errorlevel 1 (
    echo ERRO: Java 17 nao encontrado!
    type java_version.tmp
    del java_version.tmp
    exit /b 1
)
del java_version.tmp
echo ✓ Java 17 confirmado

echo.
echo [2/8] Verificando Node.js e Cordova...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    exit /b 1
)

cordova --version >nul 2>&1
if errorlevel 1 (
    echo Instalando Cordova...
    npm install -g cordova
    if errorlevel 1 (
        echo ERRO: Falha ao instalar Cordova
        exit /b 1
    )
)
echo ✓ Node.js e Cordova OK

echo.
echo [3/8] Limpando projeto...
if exist "platforms" rmdir /s /q "platforms"
if exist "plugins" rmdir /s /q "plugins"
if exist "node_modules" rmdir /s /q "node_modules"
echo ✓ Limpeza concluida

echo.
echo [4/8] Instalando dependencias...
npm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias
    exit /b 1
)
echo ✓ Dependencias instaladas

echo.
echo [5/8] Configurando Gradle para Java 17...
(
echo org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8 -XX:MaxMetaspaceSize=1024m
echo android.useAndroidX=true
echo android.enableJetifier=true
echo org.gradle.daemon=false
echo org.gradle.parallel=false
echo org.gradle.configureondemand=false
echo android.builder.sdkDownload=true
echo android.experimental.androidTest.numManagedDeviceShards=1
) > gradle.properties
echo ✓ Gradle configurado

echo.
echo [6/8] Adicionando plataforma Android...
echo Tentando Android 12 primeiro...
cordova platform add android@12.0.1 2>error.log
if errorlevel 1 (
    echo Falha no Android 12, tentando Android 11...
    cordova platform add android@11.0.0 2>error.log
    if errorlevel 1 (
        echo Falha no Android 11, tentando Android 10...
        cordova platform add android@10.1.2 2>error.log
        if errorlevel 1 (
            echo ERRO: Falha ao adicionar plataforma Android
            type error.log
            exit /b 1
        )
    )
)
del error.log 2>nul
echo ✓ Plataforma Android adicionada

echo.
echo [7/8] Configurando build personalizado...
timeout /t 3 >nul

:: Aguardar criacao dos arquivos
:aguardar
if not exist "platforms\android\app" (
    timeout /t 1 >nul
    goto aguardar
)

:: Configurar Gradle Wrapper
if exist "platforms\android\gradle\wrapper\gradle-wrapper.properties" (
    echo distributionUrl=https\://services.gradle.org/distributions/gradle-8.4-bin.zip > "platforms\android\gradle\wrapper\gradle-wrapper.properties"
)

:: Criar build-extras.gradle
(
echo android {
echo     compileOptions {
echo         sourceCompatibility JavaVersion.VERSION_17
echo         targetCompatibility JavaVersion.VERSION_17
echo     }
echo     compileSdkVersion 34
echo     buildToolsVersion "34.0.0"
echo     defaultConfig {
echo         minSdkVersion 24
echo         targetSdkVersion 34
echo     }
echo }
) > "platforms\android\app\build-extras.gradle"

echo ✓ Build personalizado configurado

echo.
echo [8/8] Gerando APK...
echo Isso pode demorar varios minutos...
echo Gradle baixara dependencias automaticamente...

cordova build android --verbose

if errorlevel 1 (
    echo.
    echo ❌ Build Android falhou!
    echo.
    echo Tentando alternativa com browser...
    cordova platform add browser
    cordova build browser
    
    if errorlevel 1 (
        echo ❌ Todas as tentativas falharam
        echo.
        echo Para debugar:
        echo 1. Instale Android Studio
        echo 2. Configure ANDROID_HOME
        echo 3. Execute: build-java17.bat
        exit /b 1
    ) else (
        echo.
        echo ✓ Build BROWSER gerado com sucesso!
        echo.
        echo Para testar:
        echo 1. Execute: cordova serve
        echo 2. Acesse: http://localhost:8000
        echo.
        echo Arquivos em: platforms\browser\www\
    )
) else (
    echo.
    echo ===================================
    echo      ✓ APK GERADO COM SUCESSO!
    echo ===================================
    
    :: Procurar APK
    set APK_FOUND=0
    if exist "platforms\android\app\build\outputs\apk\debug\app-debug.apk" (
        echo.
        echo 📱 APK DEBUG: platforms\android\app\build\outputs\apk\debug\app-debug.apk
        set APK_FOUND=1
    )
    
    if exist "platforms\android\app\build\outputs\apk\release\app-release.apk" (
        echo.
        echo 🚀 APK RELEASE: platforms\android\app\build\outputs\apk\release\app-release.apk
        set APK_FOUND=1
    )
    
    if !APK_FOUND! EQU 0 (
        echo.
        echo Procurando APKs...
        dir platforms\android\app\build\outputs\*.apk /s 2>nul
    )
    
    echo.
    echo ✓ Pronto para instalar em dispositivo Android!
)

echo.
pause
