@echo off
cls
echo ========================================================
echo   ASIGNAR NUMERO A ESTA COMPUTADORA (TALLER MAKER)
echo   Colegio Paulo Freire
echo ========================================================
echo.
set /p num="Ingresa el numero para esta maquina (ej: 1, 2, 3, 4): "
> "%~dp0numero_maquina.txt" echo %num%
echo.
echo ========================================================
echo   [OK] Listo! Esta maquina ahora es: PC %num%
echo   El docente la vera como PC %num% en su celular.
echo ========================================================
echo.
pause
