@echo off
"c:\Users\FX517\Practicas\gre-vocab-app\node_modules\7zip-bin\win\x64\7za.exe" %*
set EXIT_CODE=%errorlevel%
if %EXIT_CODE% == 2 exit /b 0
exit /b %EXIT_CODE%
