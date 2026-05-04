@echo off
setlocal
cd /d "%~dp0"

echo --- Dongsan ---

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is required to run Dongsan.
  echo Install the LTS version from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo npm was not found. Reinstall Node.js with npm enabled.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo.
  echo Installing Dongsan dependencies. This runs once after download or update.
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency install failed. Check your internet connection and try again.
    echo.
    pause
    exit /b 1
  )
)

if not exist "node_modules\.bin\electron.cmd" (
  echo.
  echo Electron launcher was not found. Reinstalling dependencies.
  call npm install
  if errorlevel 1 (
    echo.
    echo Electron install failed.
    echo.
    pause
    exit /b 1
  )
)

call "node_modules\.bin\electron.cmd" .
if errorlevel 1 (
  echo.
  echo Dongsan closed with an error.
  echo.
  pause
  exit /b 1
)

endlocal
