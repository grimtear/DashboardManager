@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

set "CMD=%~1"

if /I "%CMD%"=="prod" goto :prod
if /I "%CMD%"=="open" goto :open
if /I "%CMD%"=="stop" goto :stop
if /I "%CMD%"=="close" goto :close
if /I "%CMD%"=="list" goto :list
if /I "%CMD%"=="running" goto :running
if /I "%CMD%"=="kill" goto :kill
if /I "%CMD%"=="launch-folder" goto :launch_folder
if /I "%CMD%"=="list-bats" goto :list_bats
if /I "%CMD%"=="run-bat" goto :run_bat
if /I "%CMD%"=="apps" goto :apps
if /I "%CMD%"=="help" goto :help
if /I "%CMD%"=="start" goto :start
if /I "%CMD%"=="status" goto :status
if /I "%CMD%"=="watch-status" goto :watch_status
if /I "%CMD%"=="tasks" goto :tasks

if not exist "node_modules" call npm install
set "PORT=5004"
set "NODE_ENV=development"
set "HOST_BIND=0.0.0.0"
if not defined PUBLIC_HOST set "PUBLIC_HOST=192.168.1.194"
for /f "usebackq tokens=* delims=" %%C in (`powershell -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'server/index.ts|dist/index.cjs' }).Count"`) do set "RUNNING=%%C"
if "%RUNNING%"=="0" (
  call :find_free_port
  start "DashboardManager (dev)" cmd /k npx tsx server/index.ts
) else (
  goto :open
)
popd
endlocal
exit /b

:prod
set "NODE_ENV=production"
if not defined HOST set "HOST=192.168.1.194"
call npm run build
start "DashboardManager (prod)" cmd /k node dist/index.cjs
popd
endlocal
exit /b

:open
if not defined PORT set "PORT=5004"
if not defined PUBLIC_HOST set "PUBLIC_HOST=192.168.1.194"
for /f "usebackq tokens=* delims=" %%A in (`powershell -NoProfile -Command "$p=[Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent(); if ($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { '1' } else { '0' }"`) do set "IS_ADMIN=%%A"
if "%IS_ADMIN%"=="0" (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList 'open' -Verb RunAs"
  popd
  endlocal
  exit /b
)
for /f "usebackq tokens=* delims=" %%C in (`powershell -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'server/index.ts' -or $_.CommandLine -match 'dist/index.cjs' }).Count"`) do set "RUNNING=%%C"
if "%RUNNING%"=="0" (
  call :find_free_port
  start "DashboardManager (dev)" cmd /k npx tsx server/index.ts
  rem give it a moment to start
  timeout /t 2 >nul
)
for /f "usebackq tokens=* delims=" %%P in (`powershell -NoProfile -Command "$p=Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'server/index.ts|dist/index.cjs' } | Select-Object -First 1 -ExpandProperty ProcessId; if ($p) { $l=Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq $p } | Select-Object -First 1 -ExpandProperty LocalPort; if ($l) { $l } else { $env:PORT } } else { $env:PORT }"`) do set "PORT=%%P"
powershell -NoProfile -Command "$port=[int]$env:PORT; $name=\"DashboardManager \"+$port; $r=Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue; if (-not $r) { try { New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow -Profile Any -Protocol TCP -LocalPort $port -ErrorAction Stop | Out-Null; Write-Host \"Opened firewall for port\" $port } catch { Write-Host \"Failed to open firewall for port\" $port \". Run as Administrator.\" } } else { Write-Host \"Firewall already open for port\" $port }"
for /f "usebackq tokens=* delims=" %%R in (`powershell -NoProfile -Command "try { $u=\"http://$env:PUBLIC_HOST:$env:PORT/api/dashboards\"; Invoke-RestMethod -UseBasicParsing -Uri $u -TimeoutSec 1 | Out-Null; 'ok' } catch { 'fail' }"`) do set "REACHABLE=%%R"
if "%REACHABLE%"=="ok" (
  start "" http://%PUBLIC_HOST%:%PORT%/
) else (
  start "" http://127.0.0.1:%PORT%/
)
popd
endlocal
exit /b

:stop
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'server/index.ts|dist/index.cjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
popd
endlocal
exit /b

:close
for /f "usebackq tokens=* delims=" %%A in (`powershell -NoProfile -Command "$p=[Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent(); if ($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { '1' } else { '0' }"`) do set "IS_ADMIN=%%A"
if "%IS_ADMIN%"=="0" (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList 'close' -Verb RunAs"
  popd
  endlocal
  exit /b
)
if not defined PORT set "PORT=5004"
powershell -NoProfile -Command "$port=[int]$env:PORT; $name=\"DashboardManager \"+$port; $r=Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue; if ($r) { try { Remove-NetFirewallRule -DisplayName $name -ErrorAction Stop; Write-Host \"Closed firewall for port\" $port } catch { Write-Host \"Failed to close firewall for port\" $port \". Run as Administrator.\" } } else { Write-Host \"Firewall rule not found for port\" $port }"
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'server/index.ts|dist/index.cjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
popd
endlocal
exit /b

:list
powershell -NoProfile -Command "Get-ChildItem -Path $env:USERPROFILE\Documents -Directory | Select-Object Name,@{Name='IndexHtml';Expression={Test-Path (Join-Path $_.FullName 'index.html')}},@{Name='LastWrite';Expression={$_.LastWriteTime}} | Format-Table -AutoSize"
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'node' } | Select-Object ProcessId, Name, CommandLine | Format-Table -AutoSize"
popd
endlocal
exit /b

:running
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'server/index.ts|dist/index.cjs' } | Select-Object ProcessId, Name, CommandLine | Format-Table -AutoSize"
popd
endlocal
exit /b

:kill
set "PID=%~2"
if "%PID%"=="" (
  echo Usage: launch_app.bat kill <pid>
  popd
  endlocal
  exit /b 1
)
powershell -NoProfile -Command "Stop-Process -Id %PID% -Force"
popd
endlocal
exit /b

:launch_folder
set "TARGET=%~2"
if "%TARGET%"=="" (
  echo Usage: launch_app.bat launch-folder "<name or path>"
  popd
  endlocal
  exit /b 1
)
set "DOCS=%USERPROFILE%\Documents"
if exist "%TARGET%" (
  set "FOLDER=%TARGET%"
) else (
  set "FOLDER=%DOCS%\%TARGET%"
)
if exist "%FOLDER%\index.html" (
  start "" "%FOLDER%\index.html"
) else if exist "%FOLDER%" (
  start "" "%FOLDER%"
) else (
  echo Not found: %FOLDER%
)
popd
endlocal
exit /b

:list_bats
powershell -NoProfile -Command "Get-ChildItem -Path $env:USERPROFILE\Documents -Filter *.bat -Recurse | Select-Object Name, Directory, LastWriteTime | Sort-Object Name | Format-Table -AutoSize"
popd
endlocal
exit /b

:run_bat
set "TARGET=%~2"
if "%TARGET%"=="" (
  echo Usage: launch_app.bat run-bat "<name or fullpath>"
  popd
  endlocal
  exit /b 1
)
if exist "%TARGET%" (
  start "" "%TARGET%"
) else (
  for /f "usebackq tokens=* delims=" %%P in (`powershell -NoProfile -Command "Get-ChildItem -Path $env:USERPROFILE\Documents -Filter *.bat -Recurse | Where-Object { $_.Name -ieq '%TARGET%' } | Select-Object -First 1 -ExpandProperty FullName"`) do set "FOUND=%%P"
  if defined FOUND (
    start "" "%FOUND%"
  ) else (
    echo BAT not found: %TARGET%
  )
)
popd
endlocal
exit /b

:apps
powershell -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object Id, ProcessName, MainWindowTitle | Sort-Object ProcessName | Format-Table -AutoSize"
popd
endlocal
exit /b

:help
echo Usage:
echo   launch_app.bat start ^| prod ^| open ^| stop ^| close
echo   launch_app.bat list        ^(folders ^+ node processes^)
echo   launch_app.bat running     ^(server processes only^)
echo   launch_app.bat list-bats   ^(find all .bat in Documents^)
echo   launch_app.bat run-bat "name or fullpath"
echo   launch_app.bat launch-folder "name or fullpath"
echo   launch_app.bat kill ^<pid^
echo   launch_app.bat status      ^(show dashboard status from API^)
echo   launch_app.bat watch-status ^(print status every 10 minutes^)
popd
endlocal
exit /b

:start
set "PORT=%PORT%"
set "NODE_ENV=development"
set "HOST_BIND=0.0.0.0"
if not defined PUBLIC_HOST set "PUBLIC_HOST=192.168.1.194"
call :find_free_port
start "DashboardManager (dev)" cmd /k npx tsx server/index.ts
popd
endlocal
exit /b

:status
if not defined PORT set "PORT=5004"
if not defined PUBLIC_HOST set "PUBLIC_HOST=192.168.1.194"
for /f "usebackq tokens=* delims=" %%P in (`powershell -NoProfile -Command "$p=Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'server/index.ts|dist/index.cjs' } | Select-Object -First 1 -ExpandProperty ProcessId; if ($p) { $l=Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq $p } | Select-Object -First 1 -ExpandProperty LocalPort; if ($l) { $l } else { $env:PORT } } else { $env:PORT }"`) do set "PORT=%%P"
powershell -NoProfile -Command "try { $data = Invoke-RestMethod -UseBasicParsing -Uri \"http://$env:PUBLIC_HOST:$env:PORT/api/dashboards\"; $data | Select-Object name,frontendStatus,backendStatus | Format-Table -AutoSize } catch { Write-Host $_.Exception.Message }"
popd
endlocal
exit /b

:tasks
if not defined PORT set "PORT=5004"
if not defined PUBLIC_HOST set "PUBLIC_HOST=192.168.1.194"
powershell -NoProfile -Command "try { $data = Invoke-RestMethod -UseBasicParsing -Uri \"http://$env:PUBLIC_HOST:$env:PORT/api/processes\"; foreach ($app in $data) { Write-Host \"== \" $app.name \" (\" $app.id \" )\"; $app.processes | Format-Table pid,name,exe -AutoSize; Write-Host \"\" } } catch { Write-Host $_.Exception.Message }"
popd
endlocal
exit /b

:find_free_port
setlocal
if not defined PORT set "PORT=5004"
set "CUR=%PORT%"

:__chk
for /f "usebackq tokens=* delims=" %%C in (`powershell -NoProfile -Command "try { (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $env:CUR }).Count } catch { 0 }"`) do set "COUNT=%%C"
if "%COUNT%"=="0" (
  endlocal & set "PORT=%CUR%" & goto :eof
) else (
  set /a CUR=CUR+1
  goto :__chk
)


:watch_status
if not defined PORT set "PORT=5004"
if not defined PUBLIC_HOST set "PUBLIC_HOST=192.168.1.194"
start "Status Watch (every 10m)" powershell -NoProfile -Command "while ($true) { try { $data = Invoke-RestMethod -UseBasicParsing -Uri \"http://$env:PUBLIC_HOST:$env:PORT/api/dashboards\"; $data | Select-Object name,frontendStatus,backendStatus | Format-Table -AutoSize } catch { Write-Host $_.Exception.Message } ; Start-Sleep -Seconds 600 }"
popd
endlocal
exit /b
