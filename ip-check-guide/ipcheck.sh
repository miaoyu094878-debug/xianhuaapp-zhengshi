#!/usr/bin/env bash
# ipcheck.sh —— 批量检测 IP 归属质量（海外社媒运营用）
# 用法： ./ipcheck.sh 205.186.118.7
#        ./ipcheck.sh 1.2.3.4 5.6.7.8
# 依赖： curl, python3

set -u

check_one() {
  local ip="$1"
  echo "=============================================="
  echo "IP: $ip"
  echo "=============================================="

  # 1. ARIN RDAP —— 注册局原始记录（最权威）
  local rdap
  rdap=$(curl -s --max-time 20 "https://rdap.arin.net/registry/ip/$ip")
  if [ -n "$rdap" ]; then
    echo "$rdap" | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    print('  [RDAP] 解析失败'); sys.exit()
print('  [RDAP] 网段注册人 :', d.get('name') or d.get('handle') or '-')
print('  [RDAP] 地址段     :', d.get('startAddress'), '-', d.get('endAddress'))

def find_abuse(ents):
    for e in ents or []:
        if 'abuse' in (e.get('roles') or []):
            v = e.get('vcardArray')
            if v:
                org = [x[3] for x in v[1] if x[0]=='org']
                fn  = [x[3] for x in v[1] if x[0]=='fn']
                if org or fn:
                    return (org or fn)[0]
        r = find_abuse(e.get('entities'))
        if r:
            return r
    return None

ab = find_abuse(d.get('entities'))
if ab:
    print('  [RDAP] 滥用联系人 :', ab)
" 2>/dev/null
  else
    echo "  [RDAP] 无返回（可能非 ARIN 管辖，试 RIPE/APNIC）"
  fi

  # 2. ipinfo —— ASN / 组织
  local info
  info=$(curl -s --max-time 15 "https://ipinfo.io/$ip/json")
  if [ -n "$info" ]; then
    echo "$info" | python3 -c "
import json,sys
try: d=json.load(sys.stdin)
except Exception: print('  [ipinfo] 解析失败'); sys.exit()
print('  [ipinfo] 位置     :', d.get('country'), d.get('region'), d.get('city'))
print('  [ipinfo] 组织/ASN :', d.get('org','-'))
print('  [ipinfo] 反向解析 :', d.get('hostname','(无)'))
" 2>/dev/null
  else
    echo "  [ipinfo] 无返回"
  fi

  # 3. 简易分级建议
  echo "  ------ 参考建议（需结合 rDNS 与 Scamalytics 复核） ------"
  local org host
  org=$(echo "$info" | python3 -c "import json,sys;print((json.load(sys.stdin).get('org') or '').lower())" 2>/dev/null)
  host=$(echo "$info" | python3 -c "import json,sys;print((json.load(sys.stdin).get('hostname') or '').lower())" 2>/dev/null)

  case "$org $host" in
    *amazon*|*google*|*linode*|*digitalocean*|*vultr*|*akamai*|*microsoft*|*oracle*|*hetzner*|*ovh*|*contabo*)
      echo "  >> 疑似【C 级 机房/云】—— 不建议用于账号运营" ;;
    *comcast*|*verizon*|*at\&t*|*spectrum*|*centurylink*|*metronet*|*cox*|*charter*)
      echo "  >> 疑似【B 级 ISP/住宅段】—— 需再看 rDNS 是否为代理商域名" ;;
    *mobile*|*wireless*|*cellular*|*t-mobile*|*gsm*)
      echo "  >> 疑似【A 级 移动网络】—— 优质" ;;
    *)
      echo "  >> 无法自动判定，请人工看 rDNS + Scamalytics 的 Datacenter 字段" ;;
  esac

  echo "  >> 人工复核: https://scamalytics.com/ip/$ip  (看 Datacenter 是否为 No)"
  echo
}

if [ $# -eq 0 ]; then
  echo "用法: $0 <IP> [IP2] [IP3] ..."
  exit 1
fi

for ip in "$@"; do
  check_one "$ip"
done
