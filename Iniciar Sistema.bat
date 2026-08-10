@echo off
echo =========================================
echo       INICIANDO SISTEMA CELL EXPRESS
echo =========================================
echo.
echo Iniciando o servidor local...
start cmd /k "npm run dev"
echo.
echo Aguardando o servidor carregar...
timeout /t 4 /nobreak >nul
echo.
echo Abrindo o sistema no navegador...
start http://localhost:5173/
exit
