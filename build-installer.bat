@echo off
setlocal enabledelayedexpansion
title MINSA Surat Manager — Build Installer
color 0B

echo.
echo ========================================================
echo   MINSA Surat Manager — Windows Installer Builder
echo   Menghasilkan: EXE (Setup), EXE (Portable), MSI
echo ========================================================
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan. Install dari https://nodejs.org
    pause
    exit /b 1
)

:: Check npm/bun
where bun >nul 2>&1
if not errorlevel 1 (
    set PKG_MGR=bun
) else (
    where npm >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] npm tidak ditemukan.
        pause
        exit /b 1
    )
    set PKG_MGR=npm
)

echo [INFO] Menggunakan package manager: %PKG_MGR%
echo.

:: Install dependencies
echo [1/3] Menginstall dependencies...
%PKG_MGR% install
if errorlevel 1 (
    echo [ERROR] Gagal install dependencies.
    pause
    exit /b 1
)

:: Build React app
echo.
echo [2/3] Membangun aplikasi React (Vite build)...
%PKG_MGR% run build
if errorlevel 1 (
    echo [ERROR] Gagal build aplikasi.
    pause
    exit /b 1
)

:: Choose build type
echo.
echo [3/3] Pilih jenis installer yang ingin dibuat:
echo.
echo   [1] EXE Setup + Portable + MSI (semua — direkomendasikan)
echo   [2] EXE Setup saja (NSIS)
echo   [3] MSI saja
echo   [4] Portable EXE saja
echo   [5] MSIX (Windows Store) — perlu tanda tangan sertifikat
echo.
set /p CHOICE="Pilih [1-5]: "

if "%CHOICE%"=="1" (
    echo Membangun semua installer...
    npx electron-builder build --win nsis msi portable --x64
) else if "%CHOICE%"=="2" (
    echo Membangun EXE Setup...
    npx electron-builder build --win nsis --x64
) else if "%CHOICE%"=="3" (
    echo Membangun MSI...
    npx electron-builder build --win msi --x64
) else if "%CHOICE%"=="4" (
    echo Membangun Portable EXE...
    npx electron-builder build --win portable --x64
) else if "%CHOICE%"=="5" (
    echo Membangun MSIX...
    echo [PERINGATAN] MSIX memerlukan sertifikat code signing untuk distribusi.
    echo              Untuk testing lokal, Windows harus dalam Developer Mode.
    npx electron-builder build --win appx --x64
) else (
    echo Pilihan tidak valid. Keluar.
    pause
    exit /b 1
)

if errorlevel 1 (
    echo.
    echo [ERROR] Build gagal. Periksa log di atas.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   BUILD SELESAI!
echo   Output tersimpan di folder: dist-electron\
echo ========================================================
echo.
explorer dist-electron
pause
