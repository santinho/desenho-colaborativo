@echo off
setlocal enabledelayedexpansion

echo ===================================
echo   BUILD APK SEM ANDROID STUDIO
echo ===================================

echo.
echo [1/7] Verificando Java 17...
java -version | findstr "17.0"
if errorlevel 1 (
    echo ERRO: Java 17 nao encontrado!
    exit /b 1
)
echo ✓ Java 17 confirmado

echo.
echo [2/7] Configurando ambiente minimo...
set ANDROID_HOME=%CD%\android-sdk
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\build-tools\34.0.0

echo Criando estrutura Android SDK minima...
mkdir "%ANDROID_HOME%\platform-tools" 2>nul
mkdir "%ANDROID_HOME%\build-tools\34.0.0" 2>nul
mkdir "%ANDROID_HOME%\platforms\android-34" 2>nul

echo ✓ Estrutura criada

echo.
echo [3/7] Limpando projeto anterior...
if exist "platforms\android" rmdir /s /q "platforms\android"
if exist "plugins" rmdir /s /q "plugins"
echo ✓ Limpeza concluida

echo.
echo [4/7] Configurando Gradle standalone...
(
echo org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8
echo android.useAndroidX=true
echo android.enableJetifier=true
echo org.gradle.daemon=false
echo android.builder.sdkDownload=true
) > gradle.properties
echo ✓ Gradle configurado

echo.
echo [5/7] Adicionando plataforma Android...
cordova platform add android@12.0.1
if errorlevel 1 (
    echo Tentando versao anterior...
    cordova platform add android@11.0.0
    if errorlevel 1 (
        echo ERRO: Falha ao adicionar plataforma
        exit /b 1
    )
)
echo ✓ Plataforma adicionada

echo.
echo [6/7] Configurando build para download automatico...
timeout /t 2 > nul

:: Configurar para download automatico do SDK
if exist "platforms\android\project.properties" (
    echo target=android-34 > "platforms\android\project.properties"
)

:: Criar local.properties
echo sdk.dir=%CD%\android-sdk > "platforms\android\local.properties"

:: Configurar build.gradle para download automatico
if exist "platforms\android\build.gradle" (
    echo. >> "platforms\android\build.gradle"
    echo android.automaticSdkDownload=true >> "platforms\android\build.gradle"
)

echo ✓ Configuracao de download automatico

echo.
echo [7/7] Gerando APK...
echo Gradle vai baixar as dependencias automaticamente...
echo Isso pode demorar bastante na primeira vez...

cordova build android --release --verbose

if errorlevel 1 (
    echo.
    echo ❌ Build falhou. Tentando com browser como alternativa...
    echo.
    
    :: Fallback para browser
    cordova platform add browser
    cordova build browser
    
    if errorlevel 1 (
        echo ❌ Todas as tentativas falharam
        exit /b 1
    ) else (
        echo.
        echo ✓ Build browser gerado com sucesso!
        echo Pasta: platforms\browser\www\
        echo.
        echo Para testar: cordova serve
        echo Acesse: http://localhost:8000
    )
) else (
    echo.
    echo ✓ APK Android gerado com sucesso!
    echo Local: platforms\android\app\build\outputs\apk\release\
)

echo.
echo ===================================
echo       BUILD CONCLUIDO!
echo ===================================
pause
