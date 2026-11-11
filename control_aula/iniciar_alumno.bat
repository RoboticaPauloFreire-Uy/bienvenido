@echo off
title Agente Alumno - Colegio Paulo Freire
cls
echo ========================================================
echo   INICIANDO AGENTE ALUMNO - COLEGIO PAULO FREIRE
echo ========================================================
echo.
python -u "%~dp0cliente_alumno.py"
if %ERRORLEVEL% EQU 0 exit
echo.
echo ========================================================
echo   No se pudo iniciar Python. Verifica que este instalado.
echo ========================================================
pause
