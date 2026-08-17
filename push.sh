#!/bin/bash
cd "/home/kaarthicraja/Ipl mini auction"
git init
echo "ipl-auction-arena-deploy.zip" > .gitignore
git add .
git commit -m "Initial commit"
gh repo create "ipl mini auction" --public --source=. --remote=origin --push
