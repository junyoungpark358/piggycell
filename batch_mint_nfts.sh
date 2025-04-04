#!/bin/bash
# 배치로 여러 NFT를 한 번에 생성하는 스크립트

# NFT 개수 설정 (기본값: 5)
NFT_COUNT=${1:-5}

# 네트워크 설정 (기본값: ic)
NETWORK=${2:-"ic"}
echo "사용 네트워크: $NETWORK"

# 한국 지명 배열 (실제 존재하는 지명으로 구성)
declare -a LOCATIONS=(
  # 서울
  "서울시 강남구" "서울시 서초구" "서울시 송파구" "서울시 마포구" "서울시 용산구"
  "서울시 영등포구" "서울시 종로구" "서울시 중구" "서울시 성동구" "서울시 광진구"
  "서울시 강동구" "서울시 강서구" "서울시 관악구" "서울시 구로구" "서울시 금천구"
  "서울시 노원구" "서울시 도봉구" "서울시 동대문구" "서울시 동작구" "서울시 서대문구"
  "서울시 성북구" "서울시 양천구" "서울시 중랑구" "서울시 은평구" "서울시 강북구"
  
  # 부산
  "부산시 해운대구" "부산시 수영구" "부산시 부산진구" "부산시 동래구" "부산시 남구"
  "부산시 북구" "부산시 금정구" "부산시 연제구" "부산시 사상구" "부산시 사하구"
  "부산시 서구" "부산시 동구" "부산시 중구" "부산시 영도구" "부산시 강서구" "부산시 기장군"
  
  # 인천
  "인천시 미추홀구" "인천시 연수구" "인천시 남동구" "인천시 부평구" "인천시 서구"
  "인천시 계양구" "인천시 동구" "인천시 중구" "인천시 강화군" "인천시 옹진군"
  
  # 대전
  "대전시 유성구" "대전시 서구" "대전시 중구" "대전시 동구" "대전시 대덕구"
  
  # 광주
  "광주시 광산구" "광주시 서구" "광주시 북구" "광주시 남구" "광주시 동구"
  
  # 대구
  "대구시 수성구" "대구시 동구" "대구시 북구" "대구시 중구" "대구시 서구"
  "대구시 남구" "대구시 달서구" "대구시 달성군"
  
  # 울산
  "울산시 남구" "울산시 중구" "울산시 북구" "울산시 동구" "울산시 울주군"
  
  # 경기도
  "경기도 수원시 장안구" "경기도 수원시 권선구" "경기도 수원시 팔달구" "경기도 수원시 영통구"
  "경기도 성남시 수정구" "경기도 성남시 분당구" "경기도 성남시 중원구"
  "경기도 고양시 덕양구" "경기도 고양시 일산동구" "경기도 고양시 일산서구"
  "경기도 용인시 처인구" "경기도 용인시 기흥구" "경기도 용인시 수지구"
  "경기도 부천시" "경기도 안산시 단원구" "경기도 안산시 상록구"
  "경기도 안양시 만안구" "경기도 안양시 동안구"
  "경기도 남양주시" "경기도 화성시" "경기도 평택시" "경기도 의정부시" "경기도 시흥시"
  "경기도 파주시" "경기도 김포시" "경기도 광명시" "경기도 광주시" "경기도 군포시"
  "경기도 오산시" "경기도 이천시" "경기도 양주시" "경기도 구리시" "경기도 안성시"
  "경기도 포천시" "경기도 의왕시" "경기도 하남시" "경기도 여주시" "경기도 동두천시"
  "경기도 과천시" "경기도 가평군" "경기도 연천군" "경기도 양평군"
  
  # 강원도
  "강원도 춘천시" "강원도 원주시" "강원도 강릉시" "강원도 동해시" "강원도 태백시"
  "강원도 속초시" "강원도 삼척시" "강원도 홍천군" "강원도 횡성군" "강원도 영월군"
  "강원도 평창군" "강원도 정선군" "강원도 철원군" "강원도 화천군" "강원도 양구군"
  "강원도 인제군" "강원도 고성군" "강원도 양양군"
  
  # 충청북도
  "충청북도 청주시 상당구" "충청북도 청주시 서원구" "충청북도 청주시 흥덕구" "충청북도 청주시 청원구"
  "충청북도 충주시" "충청북도 제천시" "충청북도 보은군" "충청북도 옥천군" "충청북도 영동군"
  "충청북도 진천군" "충청북도 괴산군" "충청북도 음성군" "충청북도 단양군"
  
  # 충청남도
  "충청남도 천안시 동남구" "충청남도 천안시 서북구" "충청남도 공주시" "충청남도 보령시"
  "충청남도 아산시" "충청남도 서산시" "충청남도 논산시" "충청남도 계룡시" "충청남도 당진시"
  "충청남도 금산군" "충청남도 부여군" "충청남도 서천군" "충청남도 청양군" "충청남도 홍성군"
  "충청남도 예산군" "충청남도 태안군"
  
  # 전라북도
  "전라북도 전주시 완산구" "전라북도 전주시 덕진구" "전라북도 군산시" "전라북도 익산시"
  "전라북도 정읍시" "전라북도 남원시" "전라북도 김제시" "전라북도 완주군" "전라북도 진안군"
  "전라북도 무주군" "전라북도 장수군" "전라북도 임실군" "전라북도 순창군" "전라북도 고창군"
  "전라북도 부안군"
  
  # 전라남도
  "전라남도 목포시" "전라남도 여수시" "전라남도 순천시" "전라남도 나주시" "전라남도 광양시"
  "전라남도 담양군" "전라남도 곡성군" "전라남도 구례군" "전라남도 고흥군" "전라남도 보성군"
  "전라남도 화순군" "전라남도 장흥군" "전라남도 강진군" "전라남도 해남군" "전라남도 영암군"
  "전라남도 무안군" "전라남도 함평군" "전라남도 영광군" "전라남도 장성군" "전라남도 완도군"
  "전라남도 진도군" "전라남도 신안군"
  
  # 경상북도
  "경상북도 포항시 남구" "경상북도 포항시 북구" "경상북도 경주시" "경상북도 김천시"
  "경상북도 안동시" "경상북도 구미시" "경상북도 영주시" "경상북도 영천시" "경상북도 상주시"
  "경상북도 문경시" "경상북도 경산시" "경상북도 군위군" "경상북도 의성군" "경상북도 청송군"
  "경상북도 영양군" "경상북도 영덕군" "경상북도 청도군" "경상북도 고령군" "경상북도 성주군"
  "경상북도 칠곡군" "경상북도 예천군" "경상북도 봉화군" "경상북도 울진군" "경상북도 울릉군"
  
  # 경상남도
  "경상남도 창원시 의창구" "경상남도 창원시 성산구" "경상남도 창원시 마산합포구"
  "경상남도 창원시 마산회원구" "경상남도 창원시 진해구" "경상남도 진주시" "경상남도 통영시"
  "경상남도 사천시" "경상남도 김해시" "경상남도 밀양시" "경상남도 거제시" "경상남도 양산시"
  "경상남도 의령군" "경상남도 함안군" "경상남도 창녕군" "경상남도 고성군" "경상남도 남해군"
  "경상남도 하동군" "경상남도 산청군" "경상남도 함양군" "경상남도 거창군" "경상남도 합천군"
  
  # 제주도
  "제주도 제주시" "제주도 서귀포시"
  
  # 세종특별자치시
  "세종특별자치시"
  
  # 서울 주요 동/지역 추가
  "서울시 강남구 역삼동" "서울시 강남구 삼성동" "서울시 강남구 신사동" "서울시 강남구 압구정동"
  "서울시 강남구 청담동" "서울시 서초구 방배동" "서울시 서초구 반포동" "서울시 서초구 잠원동"
  "서울시 송파구 잠실동" "서울시 송파구 문정동" "서울시 송파구 가락동" "서울시 마포구 합정동"
  "서울시 마포구 상암동" "서울시 마포구 망원동" "서울시 용산구 이태원동" "서울시 용산구 한남동"
  "서울시 영등포구 여의도동" "서울시 종로구 인사동" "서울시 종로구 삼청동" "서울시 종로구 북촌"
  
  # 부산 주요 동/지역 추가
  "부산시 해운대구 우동" "부산시 해운대구 중동" "부산시 수영구 광안동" "부산시 남구 대연동"
  
  # 더 많은 지역 조합 (구+동 형태로 추가)
  "서울시 강남구 대치동" "서울시 강남구 논현동" "서울시 강남구 개포동" "서울시 강남구 도곡동"
  "서울시 서초구 서초동" "서울시 서초구 양재동" "서울시 서초구 내곡동" "서울시 송파구 방이동"
  "서울시 송파구 석촌동" "서울시 송파구 오금동" "서울시 마포구 서교동" "서울시 마포구 연남동"
  "서울시 마포구 공덕동" "서울시 용산구 서빙고동" "서울시 용산구 원효로동" "서울시 용산구 후암동"
  
  # 경기도 주요 지역 세분화
  "경기도 수원시 영통구 광교동" "경기도 성남시 분당구 정자동" "경기도 성남시 분당구 서현동"
  "경기도 성남시 분당구 판교동" "경기도 고양시 일산동구 마두동" "경기도 고양시 일산서구 주엽동"
  "경기도 용인시 수지구 죽전동" "경기도 용인시 기흥구 동백동" "경기도 용인시 기흥구 보정동"
  
  # 추가 지역 (유명한 상권/지역)
  "서울시 강남구 강남역" "서울시 강남구 가로수길" "서울시 마포구 홍대입구" "서울시 종로구 광화문"
  "서울시 영등포구 타임스퀘어" "서울시 강동구 천호동" "서울시 송파구 롯데월드타워" "서울시 중구 명동"
  "서울시 중구 동대문" "서울시 중구 남대문" "서울시 관악구 신림동" "서울시 서초구 강남대로"
  
  # 다양한 형태의 지역명 추가
  "서울 강남 테헤란로" "서울 성수동 카페거리" "서울 연남동 경의선숲길" "서울 광장시장 먹자골목"
  "부산 해운대 달맞이길" "부산 광안리 해변" "인천 송도 센트럴파크" "대구 동성로 쇼핑거리"
  "대전 유성구 봉명동" "광주 충장로 상권" "제주 애월읍 해안도로" "제주 성산 일출봉"
  
  # 대학가 지역
  "서울시 관악구 서울대입구" "서울시 성북구 고려대" "서울시 서대문구 연세대" "서울시 중구 동국대"
  "서울시 광진구 건국대" "서울시 동대문구 경희대" "서울시 노원구 서울과학기술대"
  "경기도 수원시 아주대" "경기도 용인시 단국대" "대전시 유성구 카이스트"
  
  # 유명 관광지
  "서울 북한산" "서울 남산타워" "경기도 과천 서울대공원" "경기도 용인 에버랜드"
  "강원도 속초 설악산" "강원도 평창 알펜시아" "부산 감천문화마을" "부산 송정해수욕장"
  "제주 성산일출봉" "제주 우도" "제주 한라산" "제주 중문관광단지" "제주 함덕해수욕장"
  
  # 시군구 이상의 행정구역
  "경기도 과천시" "경기도 광주시" "경기도 하남시" "경기도 성남시" 
  "강원도 평창군" "강원도 정선군" "강원도 강릉시" "강원도 속초시"
  "충청북도 영동군" "충청북도 제천시" "충청남도 공주시" "충청남도 아산시"
  "전라북도 군산시" "전라북도 남원시" "전라남도 순천시" "전라남도 여수시"
  "경상북도 경주시" "경상북도 안동시" "경상남도 통영시" "경상남도 거제시"
  
  # 신도시 및 택지지구
  "경기도 화성시 동탄" "경기도 하남시 미사강변도시" "경기도 고양시 일산 킨텍스"
  "경기도 파주시 운정신도시" "경기도 수원시 광교신도시" "경기도 시흥시 배곧신도시"
  "경기도 성남시 위례신도시" "경기도 의왕시 포일테크노밸리" "세종시 첫마을"
  
  # 업무지구
  "서울시 강남구 테헤란밸리" "서울시 영등포구 여의도 금융가" "서울시 종로구 종로" 
  "서울시 강서구 마곡지구" "인천시 연수구 송도 국제업무지구" "부산시 해운대구 센텀시티"
  
  # 산업단지
  "경기도 성남시 판교 테크노밸리" "경기도 안산시 반월시화공단" "경기도 평택시 포승산업단지"
  "인천시 서구 인천산업단지" "울산시 남구 울산석유화학단지" "경상북도 구미시 구미산업단지"
  "경상남도 창원시 창원산업단지" "충청북도 청주시 오송생명과학단지"
)

# 충전기 수 범위 (5~20)
MIN_CHARGERS=5
MAX_CHARGERS=20

# 랜덤 위치 선택 함수 (중복 방지)
get_random_location() {
  # 모든 위치가 사용되었는지 확인
  if [[ ${#USED_LOCATIONS[@]} -ge ${#LOCATIONS[@]} ]]; then
    echo "모든 위치가 사용되었습니다. 더 이상 NFT를 생성할 수 없습니다."
    exit 1
  fi

  # 중복되지 않는 위치를 찾을 때까지 반복
  while true; do
    local idx=$((RANDOM % ${#LOCATIONS[@]}))
    local loc="${LOCATIONS[$idx]}"

    # 이미 사용된 위치인지 확인
    if ! is_location_used "$loc"; then
      # 사용된 위치 목록에 추가
      USED_LOCATIONS+=("$loc")
      echo "$loc"
      return
    fi
  done
}

# 랜덤 충전기 수 생성 함수
get_random_chargers() {
  local range=$((MAX_CHARGERS - MIN_CHARGERS + 1))
  local chargers=$((RANDOM % range + MIN_CHARGERS))
  echo "$chargers"
}

# 가격 계산 함수 - 충전기 수에 맞게 설정 (충전기 수 * 1 PGC)
calculate_price() {
  local chargers=$1
  local price=$((chargers * 100000000))  # 충전기 수 * 1 PGC (100000000 raw units)
  echo "$price"
}

# 이미 사용한 위치를 추적하기 위한 배열
declare -a USED_LOCATIONS

# 위치가 이미 사용되었는지 확인하는 함수
is_location_used() {
  local loc="$1"
  for used_loc in "${USED_LOCATIONS[@]}"; do
    if [[ "$used_loc" == "$loc" ]]; then
      return 0  # 이미 사용됨 (true)
    fi
  done
  return 1  # 사용되지 않음 (false)
}

# 메인 스크립트 시작
echo "배치 NFT 생성 시작 (총 $NFT_COUNT 개)"
echo "사용 가능한 위치 수: ${#LOCATIONS[@]}"

# 위치 수가 충분한지 확인
if [[ $NFT_COUNT -gt ${#LOCATIONS[@]} ]]; then
  echo "오류: 생성할 NFT 수($NFT_COUNT)가 사용 가능한 위치 수(${#LOCATIONS[@]})보다 많습니다."
  exit 1
fi

# NFT 생성 루프
SUCCESS_COUNT=0
FAIL_COUNT=0

for ((i=1; i<=NFT_COUNT; i++)); do
  echo -e "\n[$i/$NFT_COUNT] NFT 생성 중..."

  # 랜덤 파라미터 생성
  LOCATION=$(get_random_location)
  CHARGER_COUNT=$(get_random_chargers)
  PRICE=$(calculate_price $CHARGER_COUNT)

  echo "위치: $LOCATION"
  echo "충전기 수: $CHARGER_COUNT"
  echo "가격: $PRICE (raw units) - $CHARGER_COUNT PGC"

  # mint_nft.sh 스크립트 호출 (네트워크 파라미터 전달)
  ./mint_nft.sh "$LOCATION" "$CHARGER_COUNT" "$PRICE" "$NETWORK"
  RESULT=$?

  # 결과 카운터 업데이트
  if [[ $RESULT -eq 0 ]]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # 잠시 대기 (네트워크 부하 방지)
  sleep 1
done

# 결과 요약
echo -e "\n===== 배치 NFT 생성 완료 ====="
echo "총 시도: $NFT_COUNT"
echo "성공: $SUCCESS_COUNT"
echo "실패: $FAIL_COUNT"
echo "사용된 위치: ${#USED_LOCATIONS[@]}"

# 사용 방법 출력 (작성 완료 후)
echo -e "\n사용 방법 예시:"
echo "  ./batch_mint_nfts.sh                # 기본값 사용 (5개 NFT, 메인넷)"
echo "  ./batch_mint_nfts.sh 10             # 10개 NFT 생성 (메인넷)"
echo "  ./batch_mint_nfts.sh 10 local       # 10개 NFT 생성 (로컬 네트워크)"
