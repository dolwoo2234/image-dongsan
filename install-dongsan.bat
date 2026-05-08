@echo off
setlocal
cd /d "%~dp0"

set "REPO_URL=https://github.com/dolwoo2234/image-dongsan.git"
set "APP_DIR=image-dongsan"
set "GIT_URL=https://git-scm.com/download/win"
set "NODE_URL=https://nodejs.org/"
set "MISSING_REQUIREMENTS=0"
set "INSTALL_ATTEMPTED=0"

echo --- Dongsan installer ---
echo This folder will be used as the install location:
echo %CD%
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo Git for Windows is not installed.
  where winget >nul 2>nul
  if errorlevel 1 (
    set "MISSING_REQUIREMENTS=1"
    echo winget was not found. Opening the Git for Windows download page...
    start "" "%GIT_URL%"
  ) else (
    set "INSTALL_ATTEMPTED=1"
    echo Installing Git for Windows with winget...
    winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
      set "MISSING_REQUIREMENTS=1"
      echo Git automatic install failed. Opening the Git for Windows download page...
      start "" "%GIT_URL%"
    )
  )
  echo.
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS is not installed.
  where winget >nul 2>nul
  if errorlevel 1 (
    set "MISSING_REQUIREMENTS=1"
    echo winget was not found. Opening the Node.js download page...
    start "" "%NODE_URL%"
  ) else (
    set "INSTALL_ATTEMPTED=1"
    echo Installing Node.js LTS with winget...
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
      set "MISSING_REQUIREMENTS=1"
      echo Node.js automatic install failed. Opening the Node.js download page...
      start "" "%NODE_URL%"
    )
  )
  echo.
)

if "%INSTALL_ATTEMPTED%"=="1" (
  echo Refreshing command path after automatic install...
  call refreshenv >nul 2>nul
  set "PATH=%PATH%;%ProgramFiles%\Git\cmd;%ProgramFiles%\nodejs"
  echo.
)

where npm >nul 2>nul
if errorlevel 1 (
  set "MISSING_REQUIREMENTS=1"
  echo npm was not found.
  echo npm is included with Node.js. Install Node.js LTS with npm enabled.
  start "" "%NODE_URL%"
  echo.
)

if "%MISSING_REQUIREMENTS%"=="1" (
  echo Required programs are missing.
  echo.
  echo 1. Complete any installer windows that opened.
  echo 2. Close and reopen this installer after installation finishes.
  echo 3. If automatic install failed, install Git or Node.js from the opened web page.
  echo.
  pause
  exit /b 1
)

echo Git and Node.js are installed.
echo.

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
