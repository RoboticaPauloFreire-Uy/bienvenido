@echo off
title Agente de Aula Paulo Freire
chcp 65001 > nul

:: Intentar con pythonw para no mostrar consola negra molesta
where pythonw >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" pythonw "%~dp0cliente_alumno.py"
) else (
    start /min python "%~dp0cliente_alumno.py"
)
exit
