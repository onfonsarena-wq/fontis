#!/data/data/com.termux/files/usr/bin/bash
# Vercel 환경변수 일괄 등록 + 배포 스크립트
set -e
cd /data/data/com.termux/files/home/workspace/fontis

# 토큰 로드
VERCEL_TOKEN=$(python3 -c "
env={}
with open('.env') as f:
    for line in f:
        line=line.strip()
        if line and not line.startswith('#') and '=' in line:
            k,v=line.split('=',1); env[k.strip()]=v.strip()
print(env['VERCEL_TOKEN'])")

# .env 값 로드
get_env() {
  python3 -c "
env={}
with open('.env') as f:
    for line in f:
        line=line.strip()
        if line and not line.startswith('#') and '=' in line:
            k,v=line.split('=',1); env[k.strip()]=v.strip()
print(env['$1'])"
}

echo "== 1. 프로젝트 링크 =="
vercel link --yes --token "$VERCEL_TOKEN" 2>&1 | tail -3

echo "== 2. 환경변수 등록 =="
for VAR in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY API_CHALLENGE_SECRET BANK_ACCOUNT BANK; do
  VAL=$(get_env "$VAR")
  echo "$VAL" | vercel env add "$VAR" production --force --token "$VERCEL_TOKEN" 2>&1 | tail -1
done

echo "== 3. 프로덕션 배포 =="
vercel --prod --yes --token "$VERCEL_TOKEN" 2>&1 | tail -15
