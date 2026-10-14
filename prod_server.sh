#!/data/data/com.termux/files/usr/bin/bash
# Fontis production server launcher — detached
LOG=/data/data/com.termux/files/home/workspace/fontis/.prod-server.log
cd /data/data/com.termux/files/home/workspace/fontis
echo "=== prod start at $(date) ===" >> "$LOG"
nohup node node_modules/next/dist/bin/next start --port 3000 >> "$LOG" 2>&1 &
echo "launcher_pid=$!" >> "$LOG"
disown
exit 0
