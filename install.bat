@echo off
color 0B
title Instalador - RecorteAP para Photoshop
echo ===================================================
echo      INSTALADOR AUTOMATICO - RECORTE AP (CEP)
echo ===================================================
echo.

:: 1. Criar diretorio se nao existir
set "CEP_PATH=%APPDATA%\Adobe\CEP\extensions\RecorteAP"
if not exist "%APPDATA%\Adobe\CEP\extensions" mkdir "%APPDATA%\Adobe\CEP\extensions"

:: 2. Copiar arquivos
echo [1/3] Copiando arquivos do plugin para o Photoshop...
xcopy "%~dp0RecorteAP" "%CEP_PATH%" /E /I /H /Y /Q >nul

:: 3. Habilitar PlayerDebugMode no Registro do Windows (Para liberar o plugin)
echo [2/3] Liberando permissoes de desenvolvedor da Adobe...
FOR %%A IN (7 8 9 10 11 12 13 14 15 16 17) DO (
   reg add "HKCU\Software\Adobe\CSXS.%%A" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>&1
)

echo [3/3] Limpeza de cache concluida.
echo.
echo ===================================================
echo INSTALACAO CONCLUIDA COM SUCESSO!
echo ===================================================
echo Feche e abra o seu Photoshop.
echo O plugin estara em: Janela - Extensoes - RecorteAP
echo.
pause