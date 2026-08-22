@echo off
cd /d "%~dp0"
start "" "http://127.0.0.1:4173"

if exist "C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  "C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" dashboard\server.js
) else (
  node dashboard\server.js
)
