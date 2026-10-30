@echo off
setlocal enabledelayedexpansion

set "prefix=team_"
set "counter=1"

for %%F in (*.jpg *.jpeg *.png *.gif *.bmp *.tif *.tiff) do (
    set "extension=%%~xF"
    ren "%%F" "!prefix!!counter!!extension!"
    set /a "counter+=1"
)

echo Renaming completed.
pause
