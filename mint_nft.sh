#!/bin/bash
# NFT 생성용 스크립트 (자동 ID 할당)

# 네트워크 설정 (기본값: ic)
NETWORK=${4:-"ic"}

# 네트워크별 캐니스터 ID 설정
if [[ "$NETWORK" == "local" ]]; then
  CANISTER_ID="bd3sg-teaaa-aaaaa-qaaba-cai"
  NETWORK_FLAG=""
else
  CANISTER_ID="6mv2y-6qaaa-aaaaf-qanfq-cai"
  NETWORK_FLAG="--network ic"
fi

echo "사용 네트워크: $NETWORK"
echo "캐니스터 ID: $CANISTER_ID"

# 현재 토큰 ID 가져오기
CURRENT_SUPPLY=$(dfx canister $NETWORK_FLAG call $CANISTER_ID icrc7_total_supply | sed -n "s/(\(.*\) : nat)/\1/p")
NEXT_TOKEN_ID=$CURRENT_SUPPLY
echo "현재 NFT 총 공급량: $CURRENT_SUPPLY"
echo "다음 토큰 ID: $NEXT_TOKEN_ID"

# 필요한 변수 설정 (명령줄 인자로 받거나 기본값 사용)
LOCATION=${1:-"서울시 강남구"}
CHARGER_COUNT=${2:-10}
MARKET_PRICE=${3:-100000000}  # 1 PGC (raw units)

echo "위치: $LOCATION"
echo "충전기 수: $CHARGER_COUNT"
echo "가격: $MARKET_PRICE (raw units)"

# 마켓에 등록하는 민팅 명령어
echo "마켓에 NFT 등록 명령어 실행 중..."
RESULT=$(dfx canister $NETWORK_FLAG call $CANISTER_ID mint "(record { to = record { owner = principal \"$CANISTER_ID\"; subaccount = null; }; token_id = $NEXT_TOKEN_ID; metadata = vec { record { \"location\"; variant { Text = \"$LOCATION\" } }; record { \"chargerCount\"; variant { Nat = $CHARGER_COUNT } }; }; }, \"market\", opt $MARKET_PRICE)")

echo "결과: $RESULT"

# 결과 확인
if [[ $RESULT == *"ok"* ]]; then
  echo "✅ NFT 생성 성공!"
  NEW_SUPPLY=$(dfx canister $NETWORK_FLAG call $CANISTER_ID icrc7_total_supply | sed -n "s/(\(.*\) : nat)/\1/p")
  echo "새로운 NFT 총 공급량: $NEW_SUPPLY"
else
  echo "❌ NFT 생성 실패!"
fi

# 사용 방법 출력
echo ""
echo "사용 방법 예시:"
echo "  ./mint_nft.sh                         # 기본값 사용 (메인넷)"
echo "  ./mint_nft.sh \"서울시 송파구\"         # 위치만 변경 (메인넷)"
echo "  ./mint_nft.sh \"서울시 송파구\" 15      # 위치, 충전기 수 변경 (메인넷)"
echo "  ./mint_nft.sh \"서울시 송파구\" 15 150000000  # 위치, 충전기 수, 가격 변경 (메인넷)"
echo "  ./mint_nft.sh \"서울시 송파구\" 15 150000000 local  # 로컬 네트워크에서 실행"
