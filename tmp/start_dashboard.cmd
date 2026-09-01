@echo off
cd /d "%~dp0.."
set "NODE=C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"
start "" /b "%NODE%" dashboard\server.js
