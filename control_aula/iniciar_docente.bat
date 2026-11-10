@echo off
title Servidor Docente - Control de Aula Paulo Freire
cls
echo ========================================================
echo   INICIANDO SERVIDOR DOCENTE - CONTROL DE AULA MAKER
echo   Colegio Paulo Freire
echo ========================================================
echo.

start "" cmd /c "timeout /t 2 > nul && start http://localhost:5000"

python -u "%~dp0servidor_docente.py"
pause
