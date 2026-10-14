#!/data/data/com.termux/files/usr/bin/bash
# Fontis prod server launcher on port 3002 (최신 빌드 검증)
LOG=/data/data/com.termux/files/home/workspace/fontis/.prod-server-3002.log
cd /data/data/com.termux/files/home/workspace/fontis
echo "=== prod start :3002 at $(date) ===" >> "$LOG"
nohup node node_modules/next/dist/bin/next start --port 3002 >> "$LOG" 2>&1 &
disown
exit 0
