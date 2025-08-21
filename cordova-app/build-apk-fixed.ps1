# Build APK com Java 17 - PowerShell
# Desenho Colaborativo

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "    BUILD APK JAVA 17 - AGENTE" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "[1/8] Verificando Java 17..." -ForegroundColor Yellow

try {
    $javaOutput = java -version 2>&1
    if ($javaOutput -match "17\.0") {
        Write-Host "checkmark Java 17 confirmado" -ForegroundColor Green
    } else {
        Write-Host "x Java 17 nao encontrado!" -ForegroundColor Red
        Write-Host $javaOutput
        exit 1
    }
} catch {
    Write-Host "x Java nao encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/8] Verificando Node.js e Cordova..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "checkmark Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "x Node.js nao encontrado!" -ForegroundColor Red
    exit 1
}

try {
    $cordovaVersion = cordova --version 2>&1
    Write-Host "checkmark Cordova OK" -ForegroundColor Green
} catch {
    Write-Host "Instalando Cordova..." -ForegroundColor Yellow
    npm install -g cordova
    if ($LASTEXITCODE -ne 0) {
        Write-Host "x Falha ao instalar Cordova" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[3/8] Limpando projeto..." -ForegroundColor Yellow

if (Test-Path "platforms") { Remove-Item -Recurse -Force "platforms" }
if (Test-Path "plugins") { Remove-Item -Recurse -Force "plugins" }
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }

Write-Host "checkmark Limpeza concluida" -ForegroundColor Green

Write-Host ""
Write-Host "[4/8] Instalando dependencias..." -ForegroundColor Yellow

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "x Falha ao instalar dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "checkmark Dependencias instaladas" -ForegroundColor Green

Write-Host ""
Write-Host "[5/8] Configurando Gradle para Java 17..." -ForegroundColor Yellow

$gradleProps = "org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8`nandroid.useAndroidX=true`nandroid.enableJetifier=true`norg.gradle.daemon=false`nandroid.builder.sdkDownload=true"

$gradleProps | Out-File -FilePath "gradle.properties" -Encoding UTF8
Write-Host "checkmark Gradle configurado" -ForegroundColor Green

Write-Host ""
Write-Host "[6/8] Adicionando plataforma Android..." -ForegroundColor Yellow

$androidVersions = @("android@12.0.1", "android@11.0.0", "android@10.1.2")
$success = $false

foreach ($version in $androidVersions) {
    Write-Host "Tentando $version..." -ForegroundColor Cyan
    $result = cordova platform add $version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "checkmark $version adicionado com sucesso" -ForegroundColor Green
        $success = $true
        break
    }
}

if (-not $success) {
    Write-Host "x Falha ao adicionar plataforma Android" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[7/8] Configurando build personalizado..." -ForegroundColor Yellow

Start-Sleep -Seconds 3

$gradleWrapperPath = "platforms\android\gradle\wrapper\gradle-wrapper.properties"
if (Test-Path $gradleWrapperPath) {
    "distributionUrl=https\://services.gradle.org/distributions/gradle-8.4-bin.zip" | Out-File -FilePath $gradleWrapperPath -Encoding UTF8
}

$buildExtras = "android {`n    compileOptions {`n        sourceCompatibility JavaVersion.VERSION_17`n        targetCompatibility JavaVersion.VERSION_17`n    }`n    compileSdkVersion 34`n    buildToolsVersion `"34.0.0`"`n    defaultConfig {`n        minSdkVersion 24`n        targetSdkVersion 34`n    }`n}"

$buildExtras | Out-File -FilePath "platforms\android\app\build-extras.gradle" -Encoding UTF8
Write-Host "checkmark Build personalizado configurado" -ForegroundColor Green

Write-Host ""
Write-Host "[8/8] Gerando APK..." -ForegroundColor Yellow
Write-Host "Isso pode demorar varios minutos..." -ForegroundColor Cyan

$buildResult = cordova build android --verbose 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "x Build Android falhou!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tentando alternativa com browser..." -ForegroundColor Yellow
    
    cordova platform add browser
    cordova build browser
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "x Todas as tentativas falharam" -ForegroundColor Red
        exit 1
    } else {
        Write-Host ""
        Write-Host "checkmark Build BROWSER gerado com sucesso!" -ForegroundColor Green
        Write-Host "Para testar: cordova serve" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "===================================" -ForegroundColor Green
    Write-Host "     checkmark APK GERADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    
    $apkPaths = @(
        "platforms\android\app\build\outputs\apk\debug\app-debug.apk",
        "platforms\android\app\build\outputs\apk\release\app-release.apk"
    )
    
    foreach ($apkPath in $apkPaths) {
        if (Test-Path $apkPath) {
            $fileInfo = Get-Item $apkPath
            Write-Host ""
            Write-Host "smartphone APK encontrado: $apkPath" -ForegroundColor Cyan
            Write-Host "chart Tamanho: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "checkmark Pronto para instalar em dispositivo Android!" -ForegroundColor Green
}

Write-Host ""
Read-Host "Pressione Enter para continuar"
