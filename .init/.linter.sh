#!/bin/bash
cd /home/kavia/workspace/code-generation/manga-and-anime-tracker-40880-41074/koma_corner_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

