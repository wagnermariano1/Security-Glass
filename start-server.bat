@echo off
echo ========================================
echo Security Glass - Servidor de Testes
echo ========================================
echo.
echo Iniciando servidor local...
echo.
echo Depois que o servidor iniciar:
echo 1. Anote o endereco que aparecer (ex: http://localhost:8080)
echo 2. No celular conectado a mesma rede Wi-Fi:
echo    - Descubra o IP do computador (digite 'ipconfig' em outro prompt)
echo    - Abra o Chrome no celular
echo    - Acesse: http://SEU_IP:8080
echo    - Exemplo: http://192.168.1.100:8080
echo.
echo Para descobrir o IP do Windows:
echo - Abra outro Prompt de Comando
echo - Digite: ipconfig
echo - Procure por "Endereco IPv4" ou "IPv4 Address"
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
echo ========================================
echo.

REM Verifica se o Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js nao esta instalado!
    echo.
    echo Por favor, instale o Node.js:
    echo https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Inicia o servidor
npx http-server -p 8080 -c-1

pause
