@echo off
title Agente de Aula Paulo Freire

where pythonw >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" pythonw "%~dp0cliente_alumno.py"
) else (
    start /min python "%~dp0cliente_alumno.py"
)
exit
