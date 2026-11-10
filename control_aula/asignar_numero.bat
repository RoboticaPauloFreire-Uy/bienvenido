@echo off
title Asignar Numero a esta Maquina - Colegio Paulo Freire
chcp 65001 > nul
cls
echo ========================================================
echo   ASIGNAR NUMERO A ESTA COMPUTADORA (TALLER MAKER)
echo   Colegio Paulo Freire
echo ========================================================
echo.
set /p num="Ingresá el número para esta máquina (ej: 1, 2, 3, 4...): "
echo %num% > "%~dp0numero_maquina.txt"
echo.
echo ========================================================
echo   [OK] ¡Listo! Esta máquina ahora es: PC %num%
echo   El docente la verá identificada como PC %num% en su celular.
echo ========================================================
echo.
pause
