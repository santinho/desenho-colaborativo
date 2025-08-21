@echo off
echo ===================================
echo  VERIFICACAO JAVA 17 + ANDROID SDK
echo ===================================

echo.
echo [1] Verificando Java 17...
java -version 2>&1 | findstr "version"
java -version 2>&1 | findstr "17.0" >nul
if errorlevel 1 (
    echo ❌ Java 17 nao encontrado
    echo.
    echo Instale Java 17 de: https://adoptium.net/
    goto :fim
) else (
    echo ✓ Java 17 confirmado
)

echo.
echo [2] Verificando JAVA_HOME...
if defined JAVA_HOME (
    echo ✓ JAVA_HOME: %JAVA_HOME%
) else (
    echo ⚠️  JAVA_HOME nao definido
    echo Configurando automaticamente...
    
    for /f "tokens=*" %%i in ('where java') do set JAVA_BIN=%%i
    for %%i in ("!JAVA_BIN!") do set JAVA_DIR=%%~dpi
    set JAVA_HOME=!JAVA_DIR:~0,-5!
    setx JAVA_HOME "!JAVA_HOME!" >nul
    echo ✓ JAVA_HOME configurado: !JAVA_HOME!
)

echo.
echo [3] Verificando Android SDK...
if defined ANDROID_HOME (
    echo ✓ ANDROID_HOME: %ANDROID_HOME%
    
    if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
        echo ✓ Platform Tools encontrado
    ) else (
        echo ❌ Platform Tools nao encontrado
    )
    
    if exist "%ANDROID_HOME%\build-tools" (
        echo ✓ Build Tools disponiveis:
        dir "%ANDROID_HOME%\build-tools" /b | findstr "^[0-9]"
    ) else (
        echo ❌ Build Tools nao encontrado
    )
    
) else (
    echo ❌ ANDROID_HOME nao definido
    echo.
    echo Para configurar Android SDK:
    echo 1. Instale Android Studio
    echo 2. Abra SDK Manager
    echo 3. Instale: Android SDK Platform-Tools, Build-Tools 34.0.0
    echo 4. Configure ANDROID_HOME para o caminho do SDK
    echo.
    echo Caminho comum: C:\Users\%USERNAME%\AppData\Local\Android\Sdk
)

echo.
echo [4] Verificando Node.js e Cordova...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js nao encontrado
) else (
    echo ✓ Node.js: 
    node --version
)

cordova --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Cordova nao encontrado
    echo Instalando...
    npm install -g cordova
) else (
    echo ✓ Cordova:
    cordova --version
)

echo.
echo [5] Verificando dependencias do projeto...
if exist "package.json" (
    echo ✓ package.json encontrado
) else (
    echo ❌ package.json nao encontrado
)

if exist "config.xml" (
    echo ✓ config.xml encontrado
) else (
    echo ❌ config.xml nao encontrado
)

echo.
echo ===================================
echo         DIAGNOSTICO COMPLETO
echo ===================================

:fim
echo.
echo Para continuar com o build, execute: build-java17.bat
pause
