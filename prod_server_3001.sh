#!/data/data/com.termux/files/usr/bin/bash
# Fontis prod server launcher on port 3001 (검증 전용)
LOG=/data/data/com.termux/files/home/workspace/fontis/.prod-server-3001.log
cd /data/data/com.termux/files/home/workspace/fontis
echo "=== prod start :3001 at $(date) ===" >> "$LOG"
nohup node node_modules/next/dist/bin/next start --port 3001 >> "$LOG" 2>&1 &
disown
exit 0
