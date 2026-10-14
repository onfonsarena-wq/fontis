#!/data/data/com.termux/files/usr/bin/bash
# Fontis dev server launcher — fully detached
LOG=/data/data/com.termux/files/home/workspace/fontis/.dev-server.log
cd /data/data/com.termux/files/home/workspace/fontis
echo "=== starting at $(date) ===" >> "$LOG"
nohup node node_modules/next/dist/bin/next dev --webpack --port 3000 >> "$LOG" 2>&1 &
echo "launcher_pid=$!" >> "$LOG"
disown
exit 0
