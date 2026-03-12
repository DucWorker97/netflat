@echo off
TITLE NETFLAT Manager
CLS

:MENU
CLS
ECHO =================================================
ECHO           NETFLAT MANAGER
ECHO =================================================
ECHO.
ECHO   [1] START System (Infra + App + Browser)
ECHO   [2] STOP System (Kill Apps + Docker Down)
ECHO   [3] RESTART (Stop then Start)
ECHO   [4] OPEN Browser Only
ECHO   [5] EXIT
ECHO.
SET /P choice="Select an option (1-5): "

IF "%choice%"=="1" GOTO START
IF "%choice%"=="2" GOTO STOP
IF "%choice%"=="3" GOTO RESTART
IF "%choice%"=="4" GOTO BROWSER
IF "%choice%"=="5" GOTO EOF
GOTO MENU

:RESTART
CALL :STOP_LOGIC
timeout /t 3 /nobreak >nul
GOTO START

:START
CLS
ECHO [1/3] Starting Infrastructure (Docker)...
call pnpm infra:up
IF %ERRORLEVEL% NEQ 0 (
    ECHO Failed to start infrastructure. Is Docker Desktop running?
    PAUSE
    GOTO MENU
)

ECHO [2/3] Starting Application Services...
:: Starts pnpm dev in a new minimized window named "NETFLAT Application"
start "NETFLAT Application" /MIN cmd /c "pnpm dev"

ECHO [3/3] Waiting for services to initialize (15 seconds)...
timeout /t 15 /nobreak >nul

:BROWSER
ECHO Opening Browser Tabs...
start http://localhost:3002
start http://localhost:3001
start http://localhost:3000/api
start http://localhost:3002/status
ECHO.
ECHO =================================================
ECHO   SUCCESS! NETFLAT is running.
ECHO   - User App:  http://localhost:3002
ECHO   - Admin App: http://localhost:3001
ECHO   - API Docs:  http://localhost:3000/api
ECHO =================================================
PAUSE
GOTO MENU

:STOP
CALL :STOP_LOGIC
PAUSE
GOTO MENU

:STOP_LOGIC
CLS
ECHO Stopping Infrastructure...
call pnpm infra:down

ECHO Killing Application Processes (Node.js)...
:: Forcefully kills node processes to ensure ports are freed
taskkill /F /IM node.exe /T 2>nul
ECHO.
ECHO NETFLAT System has been shutdown.
EXIT /B 0

:EOF
EXIT
