@echo off
echo ===============================================================
echo   Building NickOS Focus Guard Native Windows Agent (.NET 8)
echo ===============================================================

dotnet build NickOS.FocusGuard.Agent.csproj -c Release

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed. Make sure .NET 8 SDK is installed.
    exit /b %ERRORLEVEL%
)

echo.
echo [SUCCESS] Build completed successfully.
echo Output binary located at: bin\Release\net8.0-windows\NickOS.FocusGuard.Agent.exe
echo.
echo To run the agent:
echo   dotnet run
echo.
pause
