@echo off
setlocal EnableExtensions EnableDelayedExpansion
title SVT ERP - Tally Import

REM ===================================================================
REM SVT ERP - TallyPrime XML Import
REM
REM Usage:
REM   1. Drag an invoice XML onto this BAT file.
REM   2. Double-click it to pick the newest *_tally.xml from Downloads.
REM
REM Tally HTTP:
REM   http://127.0.0.1:9000
REM ===================================================================

set "TALLY=http://127.0.0.1:9000"
set "XML=%~1"

if "%XML%"=="" (
  echo Koi file drag nahi ki - Downloads se sabse nayi _tally.xml dhoondh raha hoon...
  for /f "delims=" %%F in ('dir /b /o-d "%USERPROFILE%\Downloads\*_tally.xml" 2^>nul') do (
    set "XML=%USERPROFILE%\Downloads\%%F"
    goto :found
  )
  echo.
  echo   Downloads me koi *_tally.xml nahi mili.
  echo   Pehle ERP se invoice ka XML download karo, ya file ko is .bat pe drag karo.
  echo.
  pause
  exit /b 1
)

:found

if not exist "%XML%" (
  echo   File nahi mili: %XML%
  pause
  exit /b 1
)

echo.
echo   File  : %XML%
echo   Tally : %TALLY%
echo.

REM Tally import response file
set "RESP=%TEMP%\svt_tally_response.xml"
if exist "%RESP%" del "%RESP%" >nul 2>&1

REM Direct POST to Tally
curl -s -m 30 -X POST -H "Content-Type: application/xml" --data-binary "@%XML%" "%TALLY%" -o "%RESP%"
set "CURLERR=%errorlevel%"

if not "%CURLERR%"=="0" (
  echo   [X] Tally se connect nahi ho paya. ^(curl error %CURLERR%^)
  echo.
  echo       - Tally khula hai?
  echo       - F1 Help ^> Settings ^> Connectivity ^> Client/Server configuration
  echo         TallyPrime acts as: Both, Port: 9000
  echo.
  pause
  exit /b 1
)

if not exist "%RESP%" (
  echo   [X] Tally ne koi jawab nahi diya.
  pause
  exit /b 1
)

REM Read Tally response counts
set "CREATED="
set "ALTERED="
set "ERRORS="
set "EXCEPTIONS="

for /f "tokens=2 delims=<> " %%A in ('findstr /c:"<CREATED>" "%RESP%"') do set "CREATED=%%A"
for /f "tokens=2 delims=<> " %%A in ('findstr /c:"<ALTERED>" "%RESP%"') do set "ALTERED=%%A"
for /f "tokens=2 delims=<> " %%A in ('findstr /c:"<ERRORS>" "%RESP%"') do set "ERRORS=%%A"
for /f "tokens=2 delims=<> " %%A in ('findstr /c:"<EXCEPTIONS>" "%RESP%"') do set "EXCEPTIONS=%%A"

REM Validate that CREATED was actually parsed
echo %CREATED%| findstr /r "^[0-9][0-9]*$" >nul
if errorlevel 1 (
  echo   [X] Tally ka jawab samajh nahi aaya. Poora jawab:
  echo.
  type "%RESP%"
  echo.
  pause
  exit /b 1
)

echo   created=%CREATED%  altered=%ALTERED%  errors=%ERRORS%  exceptions=%EXCEPTIONS%
echo.

REM Explicit Tally voucher rejection
findstr /c:"<LINEERROR>" "%RESP%" >nul 2>&1
if not errorlevel 1 (
  echo   [X] Tally ne voucher reject kiya:
  echo.
  for /f "tokens=* delims= " %%L in ('findstr /c:"<LINEERROR>" "%RESP%"') do (
    set "LINE=%%L"
    for /f "tokens=2 delims=<>" %%A in ("!LINE!") do echo       %%A
  )
  echo.
  echo   Aam wajah:
  echo     - "Voucher date is missing"  =^> EDU mode sirf 1, 2, 31 tarikh leta hai
  echo     - "Ledger not found"         =^> party ka ledger Tally me banao
  echo     - "Could not set SVCurrentCompany" =^> sahi company kholo
  echo.
  pause
  exit /b 1
)

echo.
echo ===== TALLY FULL RESPONSE =====
type "%RESP%"
echo ===============================
echo.

REM SUCCESS:
REM - Created > 0 = new voucher created
REM - OR Altered > 0 = existing voucher updated
REM No errors/exceptions are expected for success.
if "%ERRORS%"=="0" if "%EXCEPTIONS%"=="0" (
  if not "%CREATED%"=="0" goto :success
  if not "%ALTERED%"=="0" goto :success
)

echo   [X] Voucher create ya alter nahi hua.
echo   Tally ka full response upar diya gaya hai.
echo.
pause
exit /b 1

:success
echo   [OK] Voucher Tally me import/update ho gaya.
echo.
echo   created=%CREATED%  altered=%ALTERED%
echo.
echo   Dekhne ke liye:
echo   Gateway of Tally ^> Day Book ^> F2: Date ^> invoice ki date
echo.
pause
exit /b 0
