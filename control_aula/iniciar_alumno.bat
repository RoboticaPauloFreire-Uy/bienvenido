@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

:: Desactivar chequeo estricto de SSL en Python para evitar fallas en netbooks escolares con certificados viejos
set PYTHONHTTPSVERIFY=0

set "RUTA_ACTUAL=%~dp0"
set "BAT_ACTUAL=%~f0"
if exist "%~dp0sistema\cliente_alumno.py" (
    set "SCRIPT_PY=%~dp0sistema\cliente_alumno.py"
    set "UPDATER_PY=%~dp0sistema\actualizador.py"
) else (
    set "SCRIPT_PY=%~dp0cliente_alumno.py"
    set "UPDATER_PY=%~dp0actualizador.py"
)
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_BAT=%STARTUP_DIR%\Iniciar_Alumno_Freire.bat"

:: --------------------------------------------------------
:: 1. Detectar Python (incluso en cuentas sin Administrador)
:: --------------------------------------------------------
set "PY_EXE="
set "PYW_EXE="

where pythonw.exe >nul 2>&1 && (
    for /f "delims=" %%P in ('where pythonw.exe 2^>nul') do if not defined PYW_EXE set "PYW_EXE=%%P"
)
where python.exe >nul 2>&1 && (
    for /f "delims=" %%P in ('where python.exe 2^>nul') do if not defined PY_EXE set "PY_EXE=%%P"
)

if not defined PY_EXE (
    for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*" "C:\Python*" "%ProgramFiles%\Python*") do (
        if exist "%%~fD\python.exe" set "PY_EXE=%%~fD\python.exe"
        if exist "%%~fD\pythonw.exe" set "PYW_EXE=%%~fD\pythonw.exe"
    )
)

:: --------------------------------------------------------
:: 2. Configurar auto-inicio SIN permisos de Administrador
::    (Carpeta Startup del usuario + Registro HKCU\Run)
:: --------------------------------------------------------
if exist "%STARTUP_DIR%" (
    (
        echo @echo off
        echo cd /d "%RUTA_ACTUAL%"
        echo call "%BAT_ACTUAL%" --auto
        echo exit /b 0
    ) > "%STARTUP_BAT%" 2>nul
)

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "AgenteAlumnoFreire" /t REG_SZ /d "\"%BAT_ACTUAL%\" --auto" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d 0 /f >nul 2>&1

:: --------------------------------------------------------
:: 3. Si se inicio automaticamente al prender la PC (--auto)
::    Lanzar agente PRIMERO para restaurar cualquier bloqueo al instante,
::    y ejecutar actualizador en segundo plano sin retrasar el arranque
:: --------------------------------------------------------
if /I "%~1"=="--auto" (
    if defined PYW_EXE (
        start "" "!PYW_EXE!" "%SCRIPT_PY%" --oculto
    ) else if defined PY_EXE (
        start "" /min "!PY_EXE!" "%SCRIPT_PY%" --oculto
    ) else (
        where py.exe >nul 2>&1 && start "" pyw "%SCRIPT_PY%" --oculto
    )
    if exist "%UPDATER_PY%" (
        if defined PYW_EXE (
            start "" "!PYW_EXE!" "%UPDATER_PY%"
        ) else if defined PY_EXE (
            start "" /min "!PY_EXE!" "%UPDATER_PY%"
        )
    )
    exit /b 0
)

:: --------------------------------------------------------
:: 4. Ejecucion manual (primera vez o verificacion)
:: --------------------------------------------------------
title Agente Alumno - Colegio Paulo Freire
cls
echo ========================================================
echo   INICIANDO AGENTE ALUMNO - COLEGIO PAULO FREIRE
echo ========================================================
echo.
echo   [OK] Inicio automatico configurado (SIN Administrador).
echo   [OK] Se ejecutara solo cada vez que se prenda la PC.
echo.

if exist "%UPDATER_PY%" (
    echo   [*] Verificando si hay nueva version en Google Drive...
    if defined PY_EXE (
        "!PY_EXE!" "%UPDATER_PY%"
    ) else (
        py "%UPDATER_PY%" 2>nul
    )
    echo.
)

if defined PY_EXE (
    "!PY_EXE!" -u "%SCRIPT_PY%"
    if !ERRORLEVEL! EQU 0 exit /b 0
) else (
    py -u "%SCRIPT_PY%" 2>nul
    if !ERRORLEVEL! EQU 0 exit /b 0
)

echo.
echo ========================================================
echo   No se pudo iniciar Python. Verifica que este instalado.
echo ========================================================
pause
