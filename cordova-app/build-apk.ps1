# Build APK com Java 17 - PowerShell
# Desenho Colaborativo

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "    BUILD APK JAVA 17 - AGENTE" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "[1/8] Verificando Java 17..." -ForegroundColor Yellow

try {
    $javaVersion = java -version 2>&1 | Select-String "17.0"
    if ($javaVersion) {
        Write-Host "✓ Java 17 confirmado" -ForegroundColor Green
    } else {
        Write-Host "❌ Java 17 não encontrado!" -ForegroundColor Red
        java -version
        exit 1
    }
} catch {
    Write-Host "❌ Java não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/8] Verificando Node.js e Cordova..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
    exit 1
}

try {
    $cordovaVersion = cordova --version
    Write-Host "✓ Cordova: $cordovaVersion" -ForegroundColor Green
} catch {
    Write-Host "Instalando Cordova..." -ForegroundColor Yellow
    npm install -g cordova
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha ao instalar Cordova" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[3/8] Limpando projeto..." -ForegroundColor Yellow

if (Test-Path "platforms") { Remove-Item -Recurse -Force "platforms" }
if (Test-Path "plugins") { Remove-Item -Recurse -Force "plugins" }
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }

Write-Host "✓ Limpeza concluída" -ForegroundColor Green

Write-Host ""
Write-Host "[4/8] Instalando dependências..." -ForegroundColor Yellow

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falha ao instalar dependências" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependências instaladas" -ForegroundColor Green

Write-Host ""
Write-Host "[5/8] Configurando Gradle para Java 17..." -ForegroundColor Yellow

$gradleProps = @"
org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8 -XX:MaxMetaspaceSize=1024m
android.useAndroidX=true
android.enableJetifier=true
org.gradle.daemon=false
org.gradle.parallel=false
org.gradle.configureondemand=false
android.builder.sdkDownload=true
"@

$gradleProps | Out-File -FilePath "gradle.properties" -Encoding UTF8
Write-Host "✓ Gradle configurado" -ForegroundColor Green

Write-Host ""
Write-Host "[6/8] Adicionando plataforma Android..." -ForegroundColor Yellow

# Tentar diferentes versões do Android
$androidVersions = @("android@12.0.1", "android@11.0.0", "android@10.1.2")
$success = $false

foreach ($version in $androidVersions) {
    Write-Host "Tentando $version..." -ForegroundColor Cyan
    cordova platform add $version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $version adicionado com sucesso" -ForegroundColor Green
        $success = $true
        break
    }
}

if (-not $success) {
    Write-Host "❌ Falha ao adicionar plataforma Android" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[7/8] Configurando build personalizado..." -ForegroundColor Yellow

# Aguardar criação dos arquivos
Start-Sleep -Seconds 3

# Configurar Gradle Wrapper
$gradleWrapperPath = "platforms\android\gradle\wrapper\gradle-wrapper.properties"
if (Test-Path $gradleWrapperPath) {
    "distributionUrl=https\://services.gradle.org/distributions/gradle-8.4-bin.zip" | Out-File -FilePath $gradleWrapperPath -Encoding UTF8
}

# Criar build-extras.gradle
$buildExtras = @"
android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    compileSdkVersion 34
    buildToolsVersion "34.0.0"
    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 34
    }
}
"@

$buildExtras | Out-File -FilePath "platforms\android\app\build-extras.gradle" -Encoding UTF8
Write-Host "✓ Build personalizado configurado" -ForegroundColor Green

Write-Host ""
Write-Host "[8/8] Gerando APK..." -ForegroundColor Yellow
Write-Host "Isso pode demorar vários minutos..." -ForegroundColor Cyan
Write-Host "Gradle baixará dependências automaticamente..." -ForegroundColor Cyan

cordova build android --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Build Android falhou!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tentando alternativa com browser..." -ForegroundColor Yellow
    
    cordova platform add browser
    cordova build browser
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Todas as tentativas falharam" -ForegroundColor Red
        Write-Host ""
        Write-Host "Para debugar:" -ForegroundColor Yellow
        Write-Host "1. Instale Android Studio" -ForegroundColor White
        Write-Host "2. Configure ANDROID_HOME" -ForegroundColor White
        Write-Host "3. Execute novamente" -ForegroundColor White
        exit 1
    } else {
        Write-Host ""
        Write-Host "✓ Build BROWSER gerado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Para testar:" -ForegroundColor Yellow
        Write-Host "1. Execute: cordova serve" -ForegroundColor White
        Write-Host "2. Acesse: http://localhost:8000" -ForegroundColor White
        Write-Host ""
        Write-Host "Arquivos em: platforms\browser\www\" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "===================================" -ForegroundColor Green
    Write-Host "     ✓ APK GERADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    
    # Procurar APK
    $apkPaths = @(
        "platforms\android\app\build\outputs\apk\debug\app-debug.apk",
        "platforms\android\app\build\outputs\apk\release\app-release.apk"
    )
    
    foreach ($apkPath in $apkPaths) {
        if (Test-Path $apkPath) {
            $fileInfo = Get-Item $apkPath
            Write-Host ""
            Write-Host "📱 APK encontrado: $apkPath" -ForegroundColor Cyan
            Write-Host "📊 Tamanho: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "✓ Pronto para instalar em dispositivo Android!" -ForegroundColor Green
}

Write-Host ""
Read-Host "Pressione Enter para continuar"
