#!/bin/bash
cd /home/kavia/workspace/code-generation/snake-and-ladder-ai-play-142166-142175/snake_and_ladder_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

