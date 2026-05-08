@echo off
setlocal
cd /d "%~dp0"

set "REPO_URL=https://github.com/dolwoo2234/image-dongsan.git"
set "APP_DIR=image-dongsan"

echo --- Dongsan installer ---
echo This folder will be used as the install location:
echo %CD%
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo Git is required to download Dongsan.
  echo Install Git for Windows from https://git-scm.com/download/win
  echo Then run this file again.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run Dongsan.
  echo Install the LTS version from https://nodejs.org/
  echo Then run this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js with npm enabled.
  echo.
  pause
  exit /b 1
)

if exist "%APP_DIR%\.git" (
  echo Dongsan folder already exists. Updating it first...
  cd /d "%APP_DIR%"
  git pull --ff-only
  if errorlevel 1 (
    echo.
    echo Update failed. If you edited files inside image-dongsan, move them away and try again.
    echo.
    pause
    exit /b 1
  )
) else (
  if exist "%APP_DIR%" (
    echo A folder named "%APP_DIR%" already exists, but it is not a Git repository.
    echo Rename or remove that folder, then run this file again.
    echo.
    pause
    exit /b 1
  )

  echo Downloading Dongsan from GitHub...
  git clone "%REPO_URL%" "%APP_DIR%"
  if errorlevel 1 (
    echo.
    echo Download failed. Check your internet connection and try again.
    echo.
    pause
    exit /b 1
  )
  cd /d "%APP_DIR%"
)

echo.
echo Installing dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo Dependency install failed. Check your internet connection and try again.
  echo.
  pause
  exit /b 1
)

echo.
echo Starting Dongsan...
call npm start
if errorlevel 1 (
  echo.
  echo Dongsan closed with an error.
  echo.
  pause
  exit /b 1
)

endlocal
