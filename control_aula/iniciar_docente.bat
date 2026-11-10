@echo off
title Servidor Docente - Control de Aula Paulo Freire
chcp 65001 > nul
cls
echo ========================================================
echo   INICIANDO SERVIDOR DOCENTE - CONTROL DE AULA MAKER
echo   Colegio Paulo Freire
echo ========================================================
echo.

:: Abrir navegador automáticamente tras 1.5 segundos
start "" cmd /c "timeout /t 2 > nul && start http://localhost:5000"

:: Ejecutar servidor docente
python "%~dp0servidor_docente.py"
pause
