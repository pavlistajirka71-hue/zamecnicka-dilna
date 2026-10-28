@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Uklid projektu zamecnicka-dilna
echo   Smaze jen nepouzivane soubory. Databaze se NICEHO netyka.
echo ============================================================
echo.

REM --- Pojistka: musi to byt koren spravneho projektu ---
if not exist "package.json" goto spatne
if not exist "app\page.jsx" goto spatne
if not exist "components\OrderDetail.jsx" goto spatne
if not exist "lib\supabaseClient.js" goto spatne
findstr /c:"zamecnictvi-app" package.json >nul || goto spatne

echo Smazu tyto soubory a slozky (pokud existuji):
echo.
echo   app\api\precti-uctenku\   (cela slozka)
echo   components\ReceiptFlow.jsx
echo   components\PrehledPanel.jsx
echo   lib\diakritika.js
echo   + 47 starych kopii primo v koreni projektu
echo     (napr. OrderDetail.jsx, route (2).js, page (1).jsx ...)
echo.
echo Slozky app, components, lib, public, supabase, fonts zustanou.
echo.
set /p OK=Pokracovat? Napis A a stiskni Enter: 
if /i not "%OK%"=="A" (
  echo Zruseno, nic se nesmazalo.
  goto konec
)

echo.
if exist "app\api\precti-uctenku" rmdir /s /q "app\api\precti-uctenku" && echo smazano: app\api\precti-uctenku\

for %%F in (
  "components\ReceiptFlow.jsx"
  "components\PrehledPanel.jsx"
  "lib\diakritika.js"
  "KalkulaceForm.jsx"
  "MaterialOrderView.jsx"
  "MaterialRow.jsx"
  "MaterialyKatalog.jsx"
  "NakladyForm.jsx"
  "NastaveniForm.jsx"
  "Nastenka.jsx"
  "OrderDetail.jsx"
  "OrderForm.jsx"
  "OrderPicker.jsx"
  "PhotoThumbnail.jsx"
  "PraceReport.jsx"
  "ProtokolContent.jsx"
  "ProtokolPrintView.jsx"
  "ProtokolView.jsx"
  "QuoteView.jsx"
  "ReceiptFlow.jsx"
  "ReceiptThumbnail.jsx"
  "ServiceWorkerRegister.jsx"
  "SignaturePad.jsx"
  "WorkLogFlow.jsx"
  "WorkPhotoFlow.jsx"
  "ZalohaPanel.jsx"
  "diakritika.js"
  "download"
  "env.local.example"
  "globals.css"
  "googleDrive.js"
  "layout.jsx"
  "manifest.json"
  "orderPdf.js"
  "page (1).jsx"
  "page.jsx"
  "photoUpload.js"
  "route (2).js"
  "route (3).js"
  "route (4).js"
  "route.js"
  "schema.sql"
  "seed_materialy_mzhutni.csv"
  "supabaseAdmin.js"
  "supabaseClient.js"
  "sw.js"
  "theme.js"
  "ui.jsx"
  "uploadClient.js"
) do (
  if exist "%%~F" (
    del /f /q "%%~F" && echo smazano: %%~F
  )
)

echo.
echo Hotovo. Zkontroluj zmeny v GitHub Desktop a pak dej Commit + Push.
echo Tenhle soubor uklid.bat muzes potom taky smazat.
goto konec

:spatne
echo CHYBA: Soubor uklid.bat neni v korenove slozce projektu zamecnicka-dilna.
echo Presun ho do slozky, kde je package.json, app, components, lib
echo a spust ho znovu. Nic se nesmazalo.

:konec
echo.
pause
