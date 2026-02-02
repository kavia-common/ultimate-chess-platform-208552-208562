#!/bin/bash
cd /home/kavia/workspace/code-generation/ultimate-chess-platform-208552-208562/chess_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

