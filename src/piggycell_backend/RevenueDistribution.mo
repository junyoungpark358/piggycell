import Principal "mo:base/Principal";
import Result "mo:base/Result";
import TrieMap "mo:base/TrieMap";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Hash "mo:base/Hash";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Float "mo:base/Float";
import PiggyCellToken "./PiggyCellToken";
import Staking "./Staking";
import Admin "./Admin";
import Blob "mo:base/Blob";   // ICRC-3 구현을 위해 추가
import Text "mo:base/Text";   // 날짜 변환을 위해 추가
import Timer "mo:base/Timer"; // 타이머 기능을 위해 추가
import Nat64 "mo:base/Nat64"; // Nat64 변환을 위해 추가
import Debug "mo:base/Debug"; // Debug 모듈을 추가
import Bool "mo:base/Bool";   // Bool 모듈을 추가
import List "mo:base/List";   // List 모듈을 추가
import TrieSet "mo:base/TrieSet"; // TrieSet 모듈을 추가

module {
    //-----------------------------------------------------------------------------
    // Date 유틸리티 모듈
    //-----------------------------------------------------------------------------
    
    // 날짜 관련 유틸리티 함수
    module Date {
        public type Date = {
            year: Nat;
            month: Nat;
            day: Nat;
            hour: Nat;
            minute: Nat;
            second: Nat;
        };
        
        // 타임스탬프를 Date 객체로 변환
        public func fromTime(timestamp: Int) : Date {
            // 나노초를 초로 변환
            let seconds = timestamp / 1_000_000_000;
            
            // UTC 1970-01-01 00:00:00 기준
            let SECONDS_PER_DAY = 86400;
            let SECONDS_PER_HOUR = 3600;
            let SECONDS_PER_MINUTE = 60;
            
            // 날짜 계산 (간단한 알고리즘, 실제로는 더 복잡한 달력 계산 필요)
            let secondsInDay = Int.abs(seconds) % SECONDS_PER_DAY;
            let days = Int.abs(seconds) / SECONDS_PER_DAY;
            
            // 1970년 1월 1일부터의 날짜 계산 (대략적인 계산)
            // 실제 구현에서는 윤년과 월별 일수를 고려해야 함
            let year = 1970 + days / 365;
            let dayOfYear = days % 365;
            
            // 매우 단순화된 월 계산 (실제로는 복잡함)
            let month = 1 + dayOfYear / 30;
            let day = 1 + dayOfYear % 30;
            
            let hour = secondsInDay / SECONDS_PER_HOUR;
            let minute = (secondsInDay % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE;
            let second = secondsInDay % SECONDS_PER_MINUTE;
            
            {
                year = Int.abs(year);
                month = Int.abs(month);
                day = Int.abs(day);
                hour = Int.abs(hour);
                minute = Int.abs(minute);
                second = Int.abs(second);
            }
        };
        
        // Date 객체를 타임스탬프로 변환
        public func toTime(date: Date) : Int {
            // 매우 간단한 구현 (실제로는 더 정확한 계산 필요)
            let SECONDS_PER_DAY = 86400;
            let SECONDS_PER_HOUR = 3600;
            let SECONDS_PER_MINUTE = 60;
            
            // 1970년부터의 일수 계산 (대략적)
            let years = date.year - 1970;
            let daysFromYears = years * 365;
            
            // 월별 일수 (매우 단순화)
            let daysFromMonths = (date.month - 1) * 30;
            
            // 총 일수
            let days = daysFromYears + daysFromMonths + (date.day - 1);
            
            // 초 계산
            let seconds = days * SECONDS_PER_DAY +
                         date.hour * SECONDS_PER_HOUR +
                         date.minute * SECONDS_PER_MINUTE +
                         date.second;
            
            // 나노초로 변환
            seconds * 1_000_000_000
        };
    };
    
    //-----------------------------------------------------------------------------
    // 타입 정의
    //-----------------------------------------------------------------------------
    
    // ICRC-3 Value 타입 (ICRC-3 표준)
    public type Value = {
        #Blob : Blob;
        #Text : Text;
        #Nat : Nat;
        #Int : Int;
        #Array : [Value];
        #Map : [(Text, Value)];
    };
    
    // 블록 타입 (슈도 코드)
    public type Block = {
        phash : ?Blob;         // 부모 블록 해시
        btype : Text;          // 블록 타입
        ts : Nat;              // 타임스탬프
        tx : {                 // 트랜잭션 정보
            amt : Nat;         // 금액
            to : PiggyCellToken.Account;  // 수신자
            // 수익 배분 추가 필드
            tokenId : Nat;             // NFT ID
            distributionId : Nat;      // 배분 ID
            revenueType : Text;        // 수익 유형 (NFT에서 발생)
        };
    };
    
    // GetBlocksArgs 타입 (ICRC-3 표준)
    public type GetBlocksArgs = [{start : Nat; length : Nat}];
    
    // GetBlocksResult 타입 (ICRC-3 표준)
    public type GetBlocksResult = {
        log_length : Nat;
        blocks : [{id : Nat; block: Value}];
        archived_blocks : [{
            args : GetBlocksArgs;
            callback : shared query (GetBlocksArgs) -> async GetBlocksResult;
        }];
    };
    
    // 데이터 인증서 타입 (ICRC-3 표준)
    public type DataCertificate = {
        certificate : Blob;    // 인증서 서명
        hash_tree : Blob;      // CBOR 인코딩된 해시 트리
    };

    // 수익 배분 기록 타입
    public type DistributionRecord = {
        id: Nat;
        totalAmount: Nat;
        distributedAt: Int;
        distributedBy: Principal;
    };

    // 사용자별 수익 배분 기록 타입
    public type UserDistributionRecord = {
        recordId: Nat;
        userId: Principal;
        tokenId: Nat;
        amount: Nat;
        distributedAt: Int;
        claimed: Bool;
        claimedAt: ?Int;
    };

    // 블록 정보 타입 정의
    public type BlockInfo = {
        userId: Principal;       // 사용자 ID
        tokenId: Nat;            // NFT ID
        distributionId: Nat;     // 배분 ID
        amount: Nat;             // 배분 금액
        timestamp: Int;          // 배분 시간
    };

    // 수익 배분 오류 타입
    public type DistributionError = {
        #NotAuthorized;
        #InvalidAmount;
        #TransferError;
        #NFTNotFound;
        #RecordNotFound;
        #AlreadyClaimed;
        #InsufficientFunds;
        #SystemError;
    };
    
    //-----------------------------------------------------------------------------
    // 통계 관련 타입 정의
    //-----------------------------------------------------------------------------
    
    // 배분 통계 요약 타입
    public type DistributionStats = {
        totalDistributions: Nat;        // 총 배분 횟수
        totalAmountDistributed: Nat;    // 총 배분된 금액
        averageDistributionAmount: Nat; // 평균 배분 금액
        lastDistributionTime: ?Int;     // 최근 배분 시간
        activeUserCount: Nat;           // 수익을 받은 고유 사용자 수
        totalNFTsRewarded: Nat;         // 수익을 발생시킨 NFT 수
    };
    
    // 기간별 통계 타입
    public type PeriodStats = {
        period: Text;                 // "daily", "weekly", "monthly" 등
        data: [TimedStatPoint];       // 시간별 데이터 포인트
    };

    public type TimedStatPoint = {
        timestamp: Int;               // 시간 포인트
        distributionCount: Nat;       // 해당 기간 배분 횟수
        totalAmount: Nat;             // 해당 기간 총 금액
    };
    
    // NFT 성과 통계 타입
    public type NFTPerformanceStats = {
        topPerformers: [NFTStat];      // 수익 상위 NFT 목록
        categoryBreakdown: [CategoryStat]; // 카테고리별 분석
    };

    public type NFTStat = {
        tokenId: Nat;
        totalRevenue: Nat;
        distributionCount: Nat;
        lastRevenueTime: Int;
    };

    public type CategoryStat = {
        category: Text;
        totalRevenue: Nat;
        nftCount: Nat;
    };
    
    // 사용자 통계 타입
    public type UserStats = {
        totalRevenue: Nat;
        totalDistributions: Nat;
        lastDistributionTime: ?Int;
        nftBreakdown: [UserNFTStat];
        revenueHistory: [UserRevenuePoint];
        comparisonToAverage: Float;  // 평균 대비 % (1.0 = 평균, 2.0 = 평균의 2배)
    };

    public type UserNFTStat = {
        tokenId: Nat;
        revenue: Nat;
        percentage: Float;  // 사용자 총 수익에서의 비율
    };

    public type UserRevenuePoint = {
        timestamp: Int;
        amount: Nat;
    };
    
    // 대시보드 데이터 타입
    public type DashboardData = {
        recentDistributions: [RecentDistribution];
        todayTotal: Nat;
        weeklyChange: Float;  // 전주 대비 % 변화
        activeNFTCount: Nat;
        pendingDistributions: Nat;
    };

    public type RecentDistribution = {
        id: Nat;
        amount: Nat;
        timestamp: Int;
        recipientCount: Nat;
    };
    
    // 일별 통계 저장용 타입
    private type DailyStats = {
        count: Nat;
        totalAmount: Nat;
    };

    //-----------------------------------------------------------------------------
    // 수익 배분 매니저 구현
    //-----------------------------------------------------------------------------
    
    public class RevenueDistributionManager(
        token: PiggyCellToken.PiggyCellToken, 
        stakingManager: Staking.StakingManager,
        adminManager: Admin.AdminManager
    ) {
        //-----------------------------------------------------------------------------
        // 변수 및 초기화
        //-----------------------------------------------------------------------------
        
        // 다음 배분 기록 ID (자동 증가)
        private var nextDistributionId: Nat = 1;
        
        // 다음 사용자 배분 기록 ID
        private var nextUserDistributionId: Nat = 1;
        
        // 수익 배분 기록 저장소
        private let distributionRecords = TrieMap.TrieMap<Nat, DistributionRecord>(Nat.equal, Hash.hash);
        
        // 사용자별 수익 배분 기록 저장소
        private let userDistributionRecords = TrieMap.TrieMap<Nat, UserDistributionRecord>(Nat.equal, Hash.hash);
        
        //-----------------------------------------------------------------------------
        // 통계 관련 변수
        //-----------------------------------------------------------------------------
        
        // 전체 통계 요약
        private var totalDistributionCount: Nat = 0;
        private var totalDistributedAmount: Nat = 0;
        private var lastDistributionTimestamp: ?Int = null;
        
        // NFT별 누적 수익 인덱스
        private let nftRevenueIndex = TrieMap.TrieMap<Nat, Nat>(Nat.equal, Hash.hash);
        
        // NFT별 배분 횟수 인덱스
        private let nftDistributionCountIndex = TrieMap.TrieMap<Nat, Nat>(Nat.equal, Hash.hash);
        
        // NFT별 마지막 수익 시간 인덱스
        private let nftLastRevenueIndex = TrieMap.TrieMap<Nat, Int>(Nat.equal, Hash.hash);
        
        // 사용자별 누적 수익 인덱스
        private let userRevenueIndex = TrieMap.TrieMap<Principal, Nat>(Principal.equal, Principal.hash);
        
        // 사용자별 배분 횟수 인덱스
        private let userDistributionCountIndex = TrieMap.TrieMap<Principal, Nat>(Principal.equal, Principal.hash);
        
        // 사용자별 마지막 수익 시간 인덱스
        private let userLastRevenueIndex = TrieMap.TrieMap<Principal, Int>(Principal.equal, Principal.hash);
        
        // 일별 통계 저장소
        private let dailyStats = TrieMap.TrieMap<Int, DailyStats>(Int.equal, Int.hash);
        
        // 고유 사용자 ID 세트
        private let activeUsers = TrieMap.TrieMap<Principal, Bool>(Principal.equal, Principal.hash);
        
        // 고유 NFT ID 세트
        private let activeNFTs = TrieMap.TrieMap<Nat, Bool>(Nat.equal, Hash.hash);
        
        //-----------------------------------------------------------------------------
        // 자동 수익 분배 관련 변수 및 함수
        //-----------------------------------------------------------------------------
        
        // 매일 분배되는 토큰 양
        private var dailyDistributionAmount: Nat = 10_000_000_000; // 100 PGC (decimals=8)
        
        // 타이머 ID 저장 변수 - 현재 타이머 제약으로 인해 사용하지 않음
        private var timerId: ?Nat = null;
        
        // 마지막 분배 날짜 (일 단위)
        private var lastDistributionDay: Int = 0;
        
        // 타이머 취소 함수 - 사용하지 않음
        private func cancelCurrentTimer() {
            switch (timerId) {
                case (?id) {
                    Timer.cancelTimer(id);
                    timerId := null;
                };
                case (null) {};
            };
        };
        
        // 테스트용: 수동으로 호출하여 분배 실행
        public func executeDistribution(amount: Nat) : async Result.Result<(), Text> {
            Debug.print("[RevenueDistribution] executeDistribution 함수 시작");
            Debug.print("[RevenueDistribution] 요청된 금액: " # Nat.toText(amount));
            
            // 현재 날짜 확인
            let now = Time.now();
            let currentDay = Int.abs(now) / (86400 * 1_000_000_000);
            Debug.print("[RevenueDistribution] 현재 일자: " # Int.toText(currentDay));
            
            // 테스트 모드: 날짜 확인 로직 비활성화
            // 이미 오늘 실행했는지 확인 (중복 실행 방지)
            // if (currentDay <= lastDistributionDay) {
            //    return;
            // };
            
            // 항상 실행되도록 함
            
            // 스테이킹된 NFT 확인
            let stakedTokenIds = stakingManager.getAllStakedTokenIds();
            Debug.print("[RevenueDistribution] 스테이킹된 NFT 개수: " # Nat.toText(stakedTokenIds.size()));
            
            if (stakedTokenIds.size() > 0) {
                Debug.print("[RevenueDistribution] 스테이킹된 NFT 발견, 배분 시작");
                
                // 분배할 토큰 금액 (사용자 지정)
                let distributionAmount = amount;
                Debug.print("[RevenueDistribution] 배분할 금액: " # Nat.toText(distributionAmount));
                
                // 민팅 로직 제거 - 시스템 계정에 토큰을 민팅하지 않음
                
                // 분배 실행 (슈퍼 관리자 사용)
                Debug.print("[RevenueDistribution] distributeRevenue 함수 호출");
                
                // superAdmin이 ?Principal 타입으로 변경되었으므로, 처리 필요
                switch (adminManager.getSuperAdmin()) {
                    case (?superAdmin) {
                        // 슈퍼 관리자가 설정된 경우
                        let result = distributeRevenue(superAdmin, distributionAmount);
                        Debug.print("[RevenueDistribution] distributeRevenue 결과: " # debug_show(result));
                        
                        switch (result) {
                            case (#ok(_)) {
                                Debug.print("[RevenueDistribution] 수익 배분 성공");
                                // 성공 시 기본 분배량으로 리셋
                                dailyDistributionAmount := 10_000_000_000; // 100 PGC (decimals=8)
                                // 마지막 분배 날짜 업데이트
                                lastDistributionDay := currentDay;
                                return #ok(());
                            };
                            case (#err(error)) {
                                Debug.print("[RevenueDistribution] 수익 배분 실패: " # debug_show(error));
                                // 오류 발생 시에도 기본값으로 리셋 (로깅 로직 추가 가능)
                                dailyDistributionAmount := 10_000_000_000; // 100 PGC (decimals=8)
                                return #err("수익 분배 중 오류가 발생했습니다: " # debug_show(error));
                            };
                        };
                    };
                    case (null) {
                        // 슈퍼 관리자가 설정되지 않은 경우
                        Debug.print("[RevenueDistribution] 슈퍼 관리자가 설정되지 않아 배분을 진행할 수 없습니다.");
                        return #err("슈퍼 관리자가 설정되지 않아 배분을 진행할 수 없습니다.");
                    };
                };
            } else {
                Debug.print("[RevenueDistribution] 스테이킹된 NFT 없음");
                // 스테이킹된 NFT가 없으면 누적하지 않고 다음날에는 항상 기본값인 100 PGC로 시작
                dailyDistributionAmount := 10_000_000_000; // 100 PGC (decimals=8)
                // 마지막 분배 날짜 업데이트
                lastDistributionDay := currentDay;
                Debug.print("[RevenueDistribution] 기본값 100 PGC로 설정됨");
                return #ok(());
            };
            
            // 마지막 분배 날짜 업데이트
            lastDistributionDay := currentDay;
            Debug.print("[RevenueDistribution] executeDistribution 함수 종료");
            
            // 기본 성공 반환
            #ok(())
        };
        
        // 원래 타이머 설정 함수 (사용하지 않음)
        public func setupDailyDistribution() : async () {
            // 타이머 제약으로 인해 사용하지 않음
            // 실제 배포 시 올바른 타이머 구현 필요
        };
        
        // 금액 조회 함수
        public func getDailyDistributionAmount() : Nat {
            dailyDistributionAmount
        };
        
        // 수동으로 타이머 재설정 (관리자용)
        public func reinitializeTimer(caller: Principal) : Result.Result<(), DistributionError> {
            if (not isAdmin(caller)) {
                return #err(#NotAuthorized);
            };
            
            // 타이머 설정 로직 - 현재는 불필요
            // setupDailyDistribution 호출 제거
            
            return #ok(());
        };
        
        //-----------------------------------------------------------------------------
        // ICRC-3 관련 함수 - PiggyCellToken을 통해 호출
        //-----------------------------------------------------------------------------
        
        // ICRC-3 블록 가져오기 (PiggyCellToken으로 위임)
        public func icrc3_get_blocks(args : GetBlocksArgs) : GetBlocksResult {
            // PiggyCellToken의 구현 호출
            token.icrc3_get_blocks(args)
        };
        
        // ICRC-3 인증서 가져오기 (PiggyCellToken으로 위임)
        public func icrc3_get_tip_certificate() : ?DataCertificate {
            // PiggyCellToken의 구현 호출
            token.icrc3_get_tip_certificate()
        };
        
        // ICRC-3 지원하는 블록 타입 가져오기 (PiggyCellToken으로 위임)
        public func icrc3_supported_block_types() : [{block_type : Text; url : Text}] {
            // PiggyCellToken의 구현 호출
            token.icrc3_supported_block_types()
        };
        
        // ICRC-3 아카이브 노드 가져오기 (PiggyCellToken으로 위임)
        public func icrc3_get_archives(from : ?Principal) : [{
            canister_id : Principal;
            start : Nat;
            end : Nat;
        }] {
            // PiggyCellToken의 구현 호출
            token.icrc3_get_archives(from)
        };
        
        //-----------------------------------------------------------------------------
        // 내부 유틸리티 함수
        //-----------------------------------------------------------------------------
        
        // 사용자가 관리자인지 확인
        private func isAdmin(user: Principal) : Bool {
            adminManager.isAdmin(user)
        };
        
        // 날짜를 일 단위로 정규화 (타임스탬프 -> 일 인덱스)
        private func normalizeToDay(timestamp: Int) : Int {
            // 날짜를 일 단위(86400000000 나노초)로 나누어 정규화
            timestamp / 86400000000
        };
        
        // 일별 데이터 추가
        private func addDailyStatPoint(timestamp: Int, amount: Nat) {
            let day = normalizeToDay(timestamp);
            
            switch (dailyStats.get(day)) {
                case (?stats) {
                    let updatedStats = {
                        count = stats.count + 1;
                        totalAmount = stats.totalAmount + amount;
                    };
                    dailyStats.put(day, updatedStats);
                };
                case (null) {
                    dailyStats.put(day, { count = 1; totalAmount = amount });
                };
            };
        };
        
        // 통계 인덱스 업데이트 함수
        private func updateStatIndices(distribution: UserDistributionRecord) {
            // 전체 통계 업데이트
            totalDistributedAmount += distribution.amount;
            lastDistributionTimestamp := ?distribution.distributedAt;
            
            // NFT 인덱스 업데이트
            let tokenId = distribution.tokenId;
            activeNFTs.put(tokenId, true);
            
            // NFT별 누적 수익 업데이트
            switch(nftRevenueIndex.get(tokenId)) {
                case (?revenue) {
                    nftRevenueIndex.put(tokenId, revenue + distribution.amount);
                };
                case (null) {
                    nftRevenueIndex.put(tokenId, distribution.amount);
                };
            };
            
            // NFT별 배분 횟수 업데이트
            switch(nftDistributionCountIndex.get(tokenId)) {
                case (?count) {
                    nftDistributionCountIndex.put(tokenId, count + 1);
                };
                case (null) {
                    nftDistributionCountIndex.put(tokenId, 1);
                };
            };
            
            // NFT별 마지막 수익 시간 업데이트
            nftLastRevenueIndex.put(tokenId, distribution.distributedAt);
            
            // 사용자 인덱스 업데이트
            let userId = distribution.userId;
            activeUsers.put(userId, true);
            
            // 사용자별 누적 수익 업데이트
            switch(userRevenueIndex.get(userId)) {
                case (?revenue) {
                    userRevenueIndex.put(userId, revenue + distribution.amount);
                };
                case (null) {
                    userRevenueIndex.put(userId, distribution.amount);
                };
            };
            
            // 사용자별 배분 횟수 업데이트
            switch(userDistributionCountIndex.get(userId)) {
                case (?count) {
                    userDistributionCountIndex.put(userId, count + 1);
                };
                case (null) {
                    userDistributionCountIndex.put(userId, 1);
                };
            };
            
            // 사용자별 마지막 수익 시간 업데이트
            userLastRevenueIndex.put(userId, distribution.distributedAt);
            
            // 일별 통계 업데이트
            addDailyStatPoint(distribution.distributedAt, distribution.amount);
        };
        
        //-----------------------------------------------------------------------------
        // 수익 배분 주요 기능 함수
        //-----------------------------------------------------------------------------
        
        // 전체 수익 입력 및 분배 (관리자만 호출 가능)
        public func distributeRevenue(caller: Principal, totalAmount: Nat) : Result.Result<Nat, DistributionError> {
            Debug.print("[RevenueDistribution] distributeRevenue 함수 시작: caller=" # Principal.toText(caller) # ", amount=" # Nat.toText(totalAmount));
            
            // 관리자 권한 확인 (isAdmin 함수는 슈퍼 관리자도 자동으로 true 반환)
            let isAdminResult = isAdmin(caller);
            Debug.print("[RevenueDistribution] 관리자 권한 확인: " # Bool.toText(isAdminResult));
            
            if (not isAdminResult) {
                Debug.print("[RevenueDistribution] 권한 없음: NotAuthorized");
                return #err(#NotAuthorized);
            };
            
            // 금액 유효성 확인
            if (totalAmount == 0) {
                Debug.print("[RevenueDistribution] 금액이 0: InvalidAmount");
                return #err(#InvalidAmount);
            };
            
            // 스테이킹된 모든 NFT ID 목록 수집
            let stakedTokenIds = stakingManager.getAllStakedTokenIds();
            Debug.print("[RevenueDistribution] 스테이킹된 NFT 개수: " # Nat.toText(stakedTokenIds.size()));
            
            // 총 스테이킹 가치 계산
            let totalStakedValue = stakingManager.getTotalStakedValue();
            Debug.print("[RevenueDistribution] 총 스테이킹 가치: " # Nat.toText(totalStakedValue));
            
            // 총 스테이킹 가치가 0인 경우
            if (totalStakedValue == 0) {
                Debug.print("[RevenueDistribution] 총 스테이킹 가치가 0: InvalidAmount");
                return #err(#InvalidAmount);
            };
            
            // 배분 이벤트 카운트 증가 - 이 부분을 추가해서 관리자 배분 작업 횟수만 카운트
            totalDistributionCount += 1;
            Debug.print("[RevenueDistribution] 총 배분 횟수 증가: " # Nat.toText(totalDistributionCount));
            
            // 배분 기록 생성
            let distributionId = nextDistributionId;
            nextDistributionId += 1;
            
            let now = Time.now();
            let record: DistributionRecord = {
                id = distributionId;
                totalAmount = totalAmount;
                distributedAt = now;
                distributedBy = caller;
            };
            
            distributionRecords.put(distributionId, record);
            Debug.print("[RevenueDistribution] 배분 기록 생성 완료, ID: " # Nat.toText(distributionId));
            
            // 각 NFT별 수익 계산 및 분배
            Debug.print("[RevenueDistribution] NFT별 수익 계산 및 분배 시작");
            for (tokenId in stakedTokenIds.vals()) {
                Debug.print("[RevenueDistribution] TokenID: " # Nat.toText(tokenId) # " 처리 중");
                switch (stakingManager.getStakingInfo(tokenId)) {
                    case (?stakingInfo) {
                        // 가중치에 따른 수익 계산
                        let shareRatio = Float.fromInt(stakingInfo.price) / Float.fromInt(totalStakedValue);
                        let amount = Int.abs(Float.toInt(shareRatio * Float.fromInt(totalAmount)));
                        
                        let owner = stakingInfo.owner;
                        Debug.print("[RevenueDistribution] TokenID: " # Nat.toText(tokenId) # 
                                  ", 소유자: " # Principal.toText(owner) # 
                                  ", 금액: " # Nat.toText(amount));
                        
                        // 자동 배분 - 사용자 선호도 없이 즉시 배분
                        distributeToUser(owner, tokenId, amount, distributionId, now);
                    };
                    case (null) {
                        Debug.print("[RevenueDistribution] TokenID: " # Nat.toText(tokenId) # "에 대한 스테이킹 정보 없음");
                        // 스테이킹 정보가 없는 경우 (이론상 발생하지 않아야 함)
                        // 빈 블록으로 처리
                    }
                };
            };
            
            Debug.print("[RevenueDistribution] distributeRevenue 함수 종료: 성공");
            #ok(distributionId)
        };
        
        // 개별 사용자에게 수익 배분하기
        private func distributeToUser(user: Principal, tokenId: Nat, amount: Nat, recordId: Nat, timestamp: Int) {
            Debug.print("[RevenueDistribution] distributeToUser 시작: user=" # Principal.toText(user) # 
                      ", tokenId=" # Nat.toText(tokenId) # 
                      ", amount=" # Nat.toText(amount));
            
            // 사용자 계정 생성
            let userAccount: PiggyCellToken.Account = {
                owner = user;
                subaccount = null;
            };
            
            // 토큰 민팅으로 수익 배분
            Debug.print("[RevenueDistribution] 사용자에게 토큰 민팅 시도");
            switch (token.mint(userAccount, amount)) {
                case (#Ok(_)) {
                    Debug.print("[RevenueDistribution] 토큰 민팅 성공");
                    // 성공 - 사용자 배분 기록 생성
                    let userDistId = nextUserDistributionId;
                    nextUserDistributionId += 1;
                    
                    let userRecord: UserDistributionRecord = {
                        recordId = recordId;
                        userId = user;
                        tokenId = tokenId;
                        amount = amount;
                        distributedAt = timestamp;
                        claimed = true;  // 자동 배분되었으므로 이미 청구됨
                        claimedAt = ?timestamp;
                    };
                    
                    userDistributionRecords.put(userDistId, userRecord);
                    Debug.print("[RevenueDistribution] 사용자 배분 기록 생성 완료, ID: " # Nat.toText(userDistId));
                    
                    // 통계 인덱스 업데이트
                    updateStatIndices(userRecord);
                    
                    // ICRC-3 수익 배분 블록 추가 - 전용 블록 저장소 구현 (타입 명시)
                    let blockId = token.addRevenueDistributionBlock(userAccount, amount, tokenId, recordId);
                    Debug.print("[RevenueDistribution] ICRC-3 블록 추가 완료, 블록ID: " # Nat.toText(blockId));
                    
                    // 블록 인덱스 업데이트
                    updateBlockIndex(user, blockId);
                    
                    // 전체 수익 배분 블록 목록에도 추가
                    revenueBlockIds.add(blockId);
                    
                    // 배포 블록 정보 맵에 저장
                    let blockInfo: BlockInfo = {
                        userId = user;
                        tokenId = tokenId;
                        distributionId = recordId;
                        amount = amount;
                        timestamp = timestamp;
                    };
                    distributionBlockInfoMap.put(blockId, blockInfo);
                    
                    Debug.print("[RevenueDistribution] 블록 정보 맵 추가 완료, 블록ID: " # Nat.toText(blockId));
                };
                case (#Err(error)) {
                    Debug.print("[RevenueDistribution] 토큰 민팅 실패: " # debug_show(error));
                    // 실패 - 로그만 기록하고 계속 진행
                    // 민팅 실패에 대한 로그나 알림 기능을 여기에 추가할 수 있음
                };
            };
            Debug.print("[RevenueDistribution] distributeToUser 종료");
        };
        
        //-----------------------------------------------------------------------------
        // 통계 관련 함수 구현
        //-----------------------------------------------------------------------------
        
        // 배분 통계 요약 조회
        public func getDistributionStats() : DistributionStats {
            let avgAmount = if (totalDistributionCount > 0) {
                totalDistributedAmount / totalDistributionCount
            } else {
                0
            };
            
            {
                totalDistributions = totalDistributionCount;
                totalAmountDistributed = totalDistributedAmount;
                averageDistributionAmount = avgAmount;
                lastDistributionTime = lastDistributionTimestamp;
                activeUserCount = activeUsers.size();
                totalNFTsRewarded = activeNFTs.size();
            }
        };
        
        // 기간별 통계 조회
        public func getDistributionStatsByPeriod(period: Text, startTime: Int, endTime: Int) : PeriodStats {
            let resultBuffer = Buffer.Buffer<TimedStatPoint>(0);
            
            // 일별 데이터 수집
            if (period == "daily") {
                let startDay = Int.abs(normalizeToDay(startTime));
                let endDay = Int.abs(normalizeToDay(endTime));
                
                for (day in Iter.range(startDay, endDay)) {
                    let intDay = day; // 필요한 경우 Nat에서 Int로 변환하는 위치
                    let dataPoint = switch (dailyStats.get(intDay)) {
                        case (?stats) {
                            {
                                timestamp = Int.abs(day) * 86400000000; // 일 -> 타임스탬프로 변환
                                distributionCount = stats.count;
                                totalAmount = stats.totalAmount;
                            }
                        };
                        case (null) {
                            // 데이터가 없는 날은 0으로 설정
                            {
                                timestamp = Int.abs(day) * 86400000000;
                                distributionCount = 0;
                                totalAmount = 0;
                            }
                        };
                    };
                    resultBuffer.add(dataPoint);
                };
            };
            
            // 다른 기간(주별, 월별 등)은 필요에 따라 추가 구현 가능
            
            {
                period = period;
                data = Buffer.toArray(resultBuffer);
            }
        };
        
        // NFT 성과 통계 조회
        public func getNFTPerformanceStats(limit: Nat) : NFTPerformanceStats {
            // 상위 성과 NFT 목록 생성
            let nftStatsBuffer = Buffer.Buffer<NFTStat>(0);
            
            for ((tokenId, revenue) in nftRevenueIndex.entries()) {
                let distributionCount = Option.get(nftDistributionCountIndex.get(tokenId), 0);
                let lastRevenueTime = Option.get(nftLastRevenueIndex.get(tokenId), 0);
                
                let nftStat : NFTStat = {
                    tokenId = tokenId;
                    totalRevenue = revenue;
                    distributionCount = distributionCount;
                    lastRevenueTime = lastRevenueTime;
                };
                
                nftStatsBuffer.add(nftStat);
            };
            
            // 수익순으로 정렬
            let sortedNFTs = Array.sort(Buffer.toArray(nftStatsBuffer), func(a: NFTStat, b: NFTStat) : {#less; #equal; #greater} {
                if (a.totalRevenue > b.totalRevenue) { #less }
                else if (a.totalRevenue < b.totalRevenue) { #greater }
                else { #equal }
            });
            
            // 결과 제한
            let topNFTs = if (sortedNFTs.size() <= limit) {
                sortedNFTs
            } else {
                Array.subArray(sortedNFTs, 0, limit)
            };
            
            // 카테고리 분석 (예시로 단순 구현)
            let categoryBuffer = Buffer.Buffer<CategoryStat>(0);
            categoryBuffer.add({
                category = "일반";
                totalRevenue = totalDistributedAmount;
                nftCount = activeNFTs.size();
            });
            
            {
                topPerformers = topNFTs;
                categoryBreakdown = Buffer.toArray(categoryBuffer);
            }
        };
        
        // 사용자 통계 조회
        public func getUserStats(user: Principal) : UserStats {
            let totalRevenue = Option.get(userRevenueIndex.get(user), 0);
            let totalDistributions = Option.get(userDistributionCountIndex.get(user), 0);
            let lastDistributionTime = userLastRevenueIndex.get(user);
            
            // 사용자의 NFT별 분석 계산
            let nftBreakdownBuffer = Buffer.Buffer<UserNFTStat>(0);
            let recordedNFTs = TrieMap.TrieMap<Nat, Nat>(Nat.equal, Hash.hash);
            
            // 사용자의 모든 배분 기록 검색하여 NFT별 수익 계산
            for ((_, record) in userDistributionRecords.entries()) {
                if (Principal.equal(record.userId, user)) {
                    let tokenId = record.tokenId;
                    
                    switch (recordedNFTs.get(tokenId)) {
                        case (?amount) {
                            recordedNFTs.put(tokenId, amount + record.amount);
                        };
                        case (null) {
                            recordedNFTs.put(tokenId, record.amount);
                        };
                    };
                };
            };
            
            // NFT별 비율 계산
            for ((tokenId, amount) in recordedNFTs.entries()) {
                let percentage = if (totalRevenue > 0) {
                    Float.fromInt(amount) / Float.fromInt(totalRevenue)
                } else {
                    0.0
                };
                
                let nftStat : UserNFTStat = {
                    tokenId = tokenId;
                    revenue = amount;
                    percentage = percentage;
                };
                
                nftBreakdownBuffer.add(nftStat);
            };
            
            // 수익 이력 계산 (최근 30개)
            let revenueHistoryBuffer = Buffer.Buffer<UserRevenuePoint>(30);
            let userRecords = getUserDistributionRecords(user);
            let sortedRecords = Array.sort(userRecords, func(a: UserDistributionRecord, b: UserDistributionRecord) : {#less; #equal; #greater} {
                if (a.distributedAt > b.distributedAt) { #less }
                else if (a.distributedAt < b.distributedAt) { #greater }
                else { #equal }
            });
            
            let recordsToProcess = if (sortedRecords.size() <= 10) {
                sortedRecords
            } else {
                Array.subArray(sortedRecords, 0, 10)
            };
            
            for (record in recordsToProcess.vals()) {
                revenueHistoryBuffer.add({
                    timestamp = record.distributedAt;
                    amount = record.amount;
                });
            };
            
            // 전체 평균 대비 사용자 수익 비율
            let averagePerUser = if (activeUsers.size() > 0 and totalDistributedAmount > 0) {
                Float.fromInt(totalDistributedAmount) / Float.fromInt(activeUsers.size())
            } else {
                1.0 // 비교 기준이 없으면 1.0으로 설정
            };
            
            let comparisonRatio = if (averagePerUser > 0.0 and totalRevenue > 0) {
                Float.fromInt(totalRevenue) / averagePerUser
            } else {
                0.0
            };
            
            {
                totalRevenue = totalRevenue;
                totalDistributions = totalDistributions;
                lastDistributionTime = lastDistributionTime;
                nftBreakdown = Buffer.toArray(nftBreakdownBuffer);
                revenueHistory = Buffer.toArray(revenueHistoryBuffer);
                comparisonToAverage = comparisonRatio;
            }
        };
        
        // 특정 배분 ID에 대한 유니크한 사용자 수 계산
        public func getDistributionUniqueUserCount(distributionId: Nat) : Nat {
            var uniqueUsers = TrieSet.empty<Principal>();
            
            for ((_, userRecord) in userDistributionRecords.entries()) {
                if (userRecord.recordId == distributionId) {
                    uniqueUsers := TrieSet.put(uniqueUsers, userRecord.userId, Principal.hash(userRecord.userId), Principal.equal);
                };
            };
            
            TrieSet.size(uniqueUsers)
        };
        
        // 대시보드 데이터 조회
        public func getDashboardData() : DashboardData {
            // 최근 배분 내역 (최대 5개)
            let recentBuffer = Buffer.Buffer<RecentDistribution>(5);
            let allRecords = Iter.toArray(distributionRecords.vals());
            let sortedRecords = Array.sort(allRecords, func(a: DistributionRecord, b: DistributionRecord) : {#less; #equal; #greater} {
                if (a.distributedAt > b.distributedAt) { #less }
                else if (a.distributedAt < b.distributedAt) { #greater }
                else { #equal }
            });
            
            let recordsToProcess = if (sortedRecords.size() <= 5) {
                sortedRecords
            } else {
                Array.subArray(sortedRecords, 0, 5)
            };
            
            for (record in recordsToProcess.vals()) {
                // 각 배분에 대한 유니크한 수신자 수 계산
                var uniqueUsers = TrieSet.empty<Principal>();
                
                for ((_, userRecord) in userDistributionRecords.entries()) {
                    if (userRecord.recordId == record.id) {
                        uniqueUsers := TrieSet.put(uniqueUsers, userRecord.userId, Principal.hash(userRecord.userId), Principal.equal);
                    };
                };
                
                recentBuffer.add({
                    id = record.id;
                    amount = record.totalAmount;
                    timestamp = record.distributedAt;
                    recipientCount = TrieSet.size(uniqueUsers);
                });
            };
            
            // 오늘 총액 계산
            let today = normalizeToDay(Time.now());
            let todayTotal = switch (dailyStats.get(today)) {
                case (?stats) { stats.totalAmount };
                case (null) { 0 };
            };
            
            // 주간 변화율 계산
            let lastWeek = normalizeToDay(Time.now() - 7 * 86400000000); // 1주일 전
            let lastWeekTotal = switch (dailyStats.get(lastWeek)) {
                case (?stats) { stats.totalAmount };
                case (null) { 0 };
            };
            
            let weeklyChange = if (lastWeekTotal > 0) {
                Float.fromInt(todayTotal - lastWeekTotal) / Float.fromInt(lastWeekTotal)
            } else if (todayTotal > 0) {
                1.0 // 지난주 데이터가 없고 오늘 데이터가 있으면 100% 증가
            } else {
                0.0 // 둘 다 0이면 변화 없음
            };
            
            // 보류 중인 배분 카운트
            var pendingCount = 0;
            for ((_, record) in userDistributionRecords.entries()) {
                if (not record.claimed) {
                    pendingCount += 1;
                };
            };
            
            {
                recentDistributions = Buffer.toArray(recentBuffer);
                todayTotal = todayTotal;
                weeklyChange = weeklyChange;
                activeNFTCount = activeNFTs.size();
                pendingDistributions = pendingCount;
            }
        };
        
        //-----------------------------------------------------------------------------
        // 관리자 기능
        //-----------------------------------------------------------------------------
        
        // 관리자 설정
        public func setAdmin(caller: Principal, newAdmin: Principal) : Result.Result<(), DistributionError> {
            if (not isAdmin(caller)) {
                return #err(#NotAuthorized);
            };
            
            switch (adminManager.addAdmin(caller, newAdmin)) {
                case (#ok(_)) { #ok(()) };
                case (#err(_)) { #err(#SystemError) };
            }
        };
        
        //-----------------------------------------------------------------------------
        // 조회 함수
        //-----------------------------------------------------------------------------
        
        // 배분 기록 조회
        public func getDistributionRecord(id: Nat) : ?DistributionRecord {
            distributionRecords.get(id)
        };
        
        // 모든 배분 기록 조회
        public func getAllDistributionRecords() : [DistributionRecord] {
            Iter.toArray(distributionRecords.vals())
        };
        
        // 사용자별 배분 기록 조회
        public func getUserDistributionRecords(user: Principal) : [UserDistributionRecord] {
            let buffer = Buffer.Buffer<UserDistributionRecord>(0);
            
            for ((_, record) in userDistributionRecords.entries()) {
                if (record.userId == user) {
                    buffer.add(record);
                };
            };
            
            Buffer.toArray(buffer)
        };
        
        // 특정 토큰ID의 배분 기록 조회
        public func getTokenDistributionRecords(tokenId: Nat) : [UserDistributionRecord] {
            let buffer = Buffer.Buffer<UserDistributionRecord>(0);
            
            for ((_, record) in userDistributionRecords.entries()) {
                if (record.tokenId == tokenId) {
                    buffer.add(record);
                };
            };
            
            Buffer.toArray(buffer)
        };
        
        // 사용자의 보류 중인 배분 조회
        public func getPendingDistributions(user: Principal) : [UserDistributionRecord] {
            let buffer = Buffer.Buffer<UserDistributionRecord>(0);
            
            for ((_, record) in userDistributionRecords.entries()) {
                if (record.userId == user and not record.claimed) {
                    buffer.add(record);
                };
            };
            
            Buffer.toArray(buffer)
        };
        
        // 모든 수익 분배 내역 조회 (페이지네이션 지원)
        public func getTransactions(start: Nat, limit: Nat): async PaginatedResult<UserDistributionRecord> {
            Debug.print("[RevenueDistribution] getTransactions 호출됨: start=" # Nat.toText(start) # ", limit=" # Nat.toText(limit));
            
            // 최대 조회 개수 제한
            let maxResults = Nat.min(limit, 20);
            
            // 전체 수익 배분 블록 ID 활용
            let totalBlocks = revenueBlockIds.size();
            
            // 시작 인덱스 검증
            if (start >= totalBlocks) {
                Debug.print("[RevenueDistribution] 시작 인덱스가 총 블록 수를 초과합니다");
                return {
                    items = [];
                    nextStart = start;
                    hasMore = false;
                };
            };
            
            // 페이지네이션 범위 계산
            let endIndex = Nat.min(start + maxResults, totalBlocks);
            let hasMore = endIndex < totalBlocks;
            let nextStart = if (hasMore) endIndex else start;
            
            Debug.print("[RevenueDistribution] 페이지네이션 범위: start=" # Nat.toText(start) # 
                      ", end=" # Nat.toText(endIndex) # 
                      ", hasMore=" # Bool.toText(hasMore));
            
            // 블록 ID 추출 - 페이지네이션 범위에 맞춰 배열 잘라내기
            let blockIdsToLoad = Array.subArray(Buffer.toArray(revenueBlockIds), start, endIndex - start);
            Debug.print("[RevenueDistribution] 로드할 블록 ID: " # debug_show(blockIdsToLoad));
            
            if (blockIdsToLoad.size() == 0) {
                Debug.print("[RevenueDistribution] 로드할 블록이 없습니다");
                return {
                    items = [];
                    nextStart = start;
                    hasMore = false;
                };
            };
            
            // 결과 버퍼
            let resultBuffer = Buffer.Buffer<UserDistributionRecord>(blockIdsToLoad.size());
            
            // 최적화된 배치 블록 검색 구현
            // 블록 정보 맵을 사용하여 효율적으로 결과 구성
            for (blockId in blockIdsToLoad.vals()) {
                Debug.print("[RevenueDistribution] 블록 정보 맵에서 블록 조회: ID=" # Nat.toText(blockId));
                
                switch (distributionBlockInfoMap.get(blockId)) {
                    case (?blockInfo) {
                        // 블록 정보 맵에서 직접 데이터 가져오기
                        let record : UserDistributionRecord = {
                            recordId = blockInfo.distributionId;
                            userId = blockInfo.userId;
                            tokenId = blockInfo.tokenId;
                            amount = blockInfo.amount;
                            distributedAt = blockInfo.timestamp;
                            claimed = true;  // 블록에 기록되었으므로 이미 청구됨
                            claimedAt = ?blockInfo.timestamp;
                        };
                        
                        resultBuffer.add(record);
                        Debug.print("[RevenueDistribution] 블록 정보 맵에서 기록 추가됨: 블록ID=" # Nat.toText(blockId));
                    };
                    case (null) {
                        // 맵에 없는 경우 블록 데이터 직접 로드 (fallback)
                        Debug.print("[RevenueDistribution] 블록 정보 맵에 없음, 직접 블록 로드 시도: ID=" # Nat.toText(blockId));
                        
                        // 블록을 하나씩 조회
                        let blockRequest = token.icrc3_get_blocks([{ start = blockId; length = 1 }]);
                        
                        if (blockRequest.blocks.size() > 0) {
                            let blockData = blockRequest.blocks[0];
                            let block = blockData.block;
                            
                            // "3revDist" 타입 블록만 처리
                            switch (block) {
                                case (#Map(fields)) {
                                    // 필드 추출
                                    var isRevDist = false;
                                    var timestamp : Int = 0;
                                    var amount : Nat = 0;
                                    var userId : ?Principal = null;
                                    var tokenId : ?Nat = null;
                                    var distributionId : ?Nat = null;
                                    
                                    // 필드 추출
                                    for ((fieldName, fieldValue) in fields.vals()) {
                                        if (fieldName == "btype") {
                                            // 블록 타입 확인
                                            switch (fieldValue) {
                                                case (#Text(btype)) { 
                                                    isRevDist := btype == "3revDist"; 
                                                };
                                                case (_) {};
                                            };
                                        } else if (fieldName == "ts") {
                                            // 타임스탬프 추출
                                            switch (fieldValue) {
                                                case (#Nat(ts)) { timestamp := Int.abs(ts); };
                                                case (_) {};
                                            };
                                        } else if (fieldName == "tx") {
                                            // 트랜잭션 세부 정보 추출
                                            switch (fieldValue) {
                                                case (#Map(txFields)) {
                                                    for ((txFieldName, txFieldValue) in txFields.vals()) {
                                                        if (txFieldName == "amt") {
                                                            // 금액 추출
                                                            switch (txFieldValue) {
                                                                case (#Nat(amt)) { amount := amt; };
                                                                case (_) {};
                                                            };
                                                        } else if (txFieldName == "to") {
                                                            // 수신자 ID 추출
                                                            switch (txFieldValue) {
                                                                case (#Array(accountData)) {
                                                                    if (accountData.size() > 0) {
                                                                        switch (accountData[0]) {
                                                                            case (#Blob(ownerBlob)) {
                                                                                userId := ?Principal.fromBlob(ownerBlob);
                                                                            };
                                                                            case (_) {};
                                                                        };
                                                                    };
                                                                };
                                                                case (_) {};
                                                            };
                                                        } else if (txFieldName == "tokenId") {
                                                            // NFT ID 추출
                                                            switch (txFieldValue) {
                                                                case (#Nat(tid)) { tokenId := ?tid; };
                                                                case (_) {};
                                                            };
                                                        } else if (txFieldName == "distributionId") {
                                                            // 배분 ID 추출
                                                            switch (txFieldValue) {
                                                                case (#Nat(did)) { distributionId := ?did; };
                                                                case (_) {};
                                                            };
                                                        };
                                                    };
                                                };
                                                case (_) {};
                                            };
                                        };
                                    };
                                    
                                    // 유효한 수익 배분 블록 처리 (사용자와 관계없이 모든 레코드)
                                    if (isRevDist and userId != null and tokenId != null and distributionId != null) {
                                        let userPrincipal = Option.get(userId, Principal.fromText("aaaaa-aa"));
                                        
                                        let record : UserDistributionRecord = {
                                            recordId = Option.get(distributionId, 0);
                                            userId = userPrincipal;
                                            tokenId = Option.get(tokenId, 0);
                                            amount = amount;
                                            distributedAt = timestamp;
                                            claimed = true;  // 블록에 기록되었으므로 이미 청구됨
                                            claimedAt = ?timestamp;
                                        };
                                        
                                        resultBuffer.add(record);
                                        Debug.print("[RevenueDistribution] 블록에서 직접 기록 추가됨: 블록ID=" # Nat.toText(blockId));
                                        
                                        // 블록 정보 맵에 저장 (다음 조회 최적화)
                                        let blockInfo: BlockInfo = {
                                            userId = userPrincipal;
                                            tokenId = Option.get(tokenId, 0);
                                            distributionId = Option.get(distributionId, 0);
                                            amount = amount;
                                            timestamp = timestamp;
                                        };
                                        distributionBlockInfoMap.put(blockId, blockInfo);
                                        Debug.print("[RevenueDistribution] 블록 정보 맵에 추가됨: 블록ID=" # Nat.toText(blockId));
                                    };
                                };
                                case (_) {};
                            };
                        };
                    };
                };
            };
            
            // 결과를 배열로 변환
            let results = Buffer.toArray(resultBuffer);
            
            // 결과 정렬 (최신 배분부터)
            let sortedResults = Array.sort(results, func(a: UserDistributionRecord, b: UserDistributionRecord) : {#less; #equal; #greater} {
                if (a.distributedAt > b.distributedAt) { #less } 
                else if (a.distributedAt < b.distributedAt) { #greater } 
                else { #equal };
            });
            
            Debug.print("[RevenueDistribution] 페이지네이션 결과: " # Nat.toText(sortedResults.size()) # "개 항목, " # 
                      "hasMore=" # Bool.toText(hasMore) # 
                      ", nextStart=" # Nat.toText(nextStart));
            
            return {
                items = sortedResults;
                nextStart = nextStart;
                hasMore = hasMore;
            };
        };

        //-----------------------------------------------------------------------------
        // 블록 인덱싱 관련 구조 및 변수
        //-----------------------------------------------------------------------------
        
        // 페이지네이션 결과 타입 정의
        public type PaginatedResult<T> = {
            items: [T];          // 결과 아이템 배열
            nextStart: Nat;      // 다음 조회 시작점
            hasMore: Bool;       // 더 가져올 데이터가 있는지 여부
        };
        
        // 사용자별 블록 인덱스 맵 - Key: Principal(사용자 ID), Value: Nat 리스트(해당 사용자의 블록 ID들)
        private let userBlockIndex = TrieMap.TrieMap<Principal, List.List<Nat>>(Principal.equal, Principal.hash);
        
        // 수익 배분 블록 ID들 (3revDist 타입 블록만)
        private let revenueBlockIds = Buffer.Buffer<Nat>(100);
        
        // 블록 정보 맵 - Key: 블록 ID, Value: 블록 정보
        private let distributionBlockInfoMap = TrieMap.TrieMap<Nat, BlockInfo>(Nat.equal, Hash.hash);

        // 블록 인덱스를 업데이트하는 함수 (내부용)
        private func updateBlockIndex(userId: Principal, blockId: Nat) {
            // 해당 사용자의 블록 리스트 가져오기
            let userBlocks = switch (userBlockIndex.get(userId)) {
                case (null) { List.nil<Nat>() };
                case (?blocks) { blocks };
            };
            
            // 리스트 앞에 새 블록 ID 추가 (최신 블록이 앞에 오도록)
            let updatedBlocks = List.push(blockId, userBlocks);
            userBlockIndex.put(userId, updatedBlocks);
            
            // 전체 수익 배분 블록 목록에도 추가
            revenueBlockIds.add(blockId);
            
            Debug.print("[RevenueDistribution] 블록 인덱스 업데이트: 사용자=" # Principal.toText(userId) # 
                      ", 블록ID=" # Nat.toText(blockId) # 
                      ", 현재 블록 수=" # Nat.toText(List.size(updatedBlocks)));
        };
        
        // 특정 사용자의 수익 배분 내역 조회 (페이지네이션 지원)
        public func getUserTransactions(user: Principal, start: Nat, limit: Nat): async PaginatedResult<UserDistributionRecord> {
            Debug.print("[RevenueDistribution] getUserTransactions 호출됨: user=" # Principal.toText(user) # ", start=" # Nat.toText(start) # ", limit=" # Nat.toText(limit));
            
            // 최대 조회 개수 제한
            let maxResults = Nat.min(limit, 20);
            
            // 사용자별 블록 인덱스 활용 (최적화된 조회)
            let userBlocks = switch (userBlockIndex.get(user)) {
                case (null) {
                    // 해당 사용자 블록이 없음
                    Debug.print("[RevenueDistribution] 해당 사용자의 블록 인덱스가 없습니다: " # Principal.toText(user));
                    return {
                        items = [];
                        nextStart = start;
                        hasMore = false;
                    };
                };
                case (?blocks) { blocks };
            };
            
            Debug.print("[RevenueDistribution] 사용자 블록 인덱스 발견: 총 " # Nat.toText(List.size(userBlocks)) # "개");
            
            // 사용자의 블록 리스트를 배열로 변환
            let userBlocksArray = List.toArray(userBlocks);
            
            // 페이지네이션 처리
            let totalBlocks = userBlocksArray.size();
            
            // 시작 인덱스 검증
            if (start >= totalBlocks) {
                Debug.print("[RevenueDistribution] 시작 인덱스가 총 블록 수를 초과합니다");
                return {
                    items = [];
                    nextStart = start;
                    hasMore = false;
                };
            };
            
            // 페이지네이션 범위 계산
            let endIndex = Nat.min(start + maxResults, totalBlocks);
            let hasMore = endIndex < totalBlocks;
            let nextStart = if (hasMore) endIndex else start;
            
            Debug.print("[RevenueDistribution] 페이지네이션 범위: start=" # Nat.toText(start) # 
                      ", end=" # Nat.toText(endIndex) # 
                      ", hasMore=" # Bool.toText(hasMore));
            
            // 블록 ID 추출 - 페이지네이션 범위에 맞춰 배열 잘라내기
            let blockIdsToLoad = Array.subArray(userBlocksArray, start, endIndex - start);
            Debug.print("[RevenueDistribution] 로드할 블록 ID: " # debug_show(blockIdsToLoad));
            
            if (blockIdsToLoad.size() == 0) {
                Debug.print("[RevenueDistribution] 로드할 블록이 없습니다");
                return {
                    items = [];
                    nextStart = start;
                    hasMore = false;
                };
            };
            
            // 결과 버퍼
            let resultBuffer = Buffer.Buffer<UserDistributionRecord>(blockIdsToLoad.size());
            
            // 최적화된 배치 블록 검색 구현
            // 블록 정보 맵을 사용하여 효율적으로 결과 구성
            for (blockId in blockIdsToLoad.vals()) {
                Debug.print("[RevenueDistribution] 블록 정보 맵에서 블록 조회: ID=" # Nat.toText(blockId));
                
                switch (distributionBlockInfoMap.get(blockId)) {
                    case (?blockInfo) {
                        // 블록 정보 맵에서 직접 데이터 가져오기
                        if (blockInfo.userId == user) {
                            let record : UserDistributionRecord = {
                                recordId = blockInfo.distributionId;
                                userId = blockInfo.userId;
                                tokenId = blockInfo.tokenId;
                                amount = blockInfo.amount;
                                distributedAt = blockInfo.timestamp;
                                claimed = true;  // 블록에 기록되었으므로 이미 청구됨
                                claimedAt = ?blockInfo.timestamp;
                            };
                            
                            resultBuffer.add(record);
                            Debug.print("[RevenueDistribution] 블록 정보 맵에서 기록 추가됨: 블록ID=" # Nat.toText(blockId));
                        };
                    };
                    case (null) {
                        // 맵에 없는 경우 블록 데이터 직접 로드 (fallback)
                        Debug.print("[RevenueDistribution] 블록 정보 맵에 없음, 직접 블록 로드 시도: ID=" # Nat.toText(blockId));
                        
                        // 블록을 하나씩 조회
                        let blockRequest = token.icrc3_get_blocks([{ start = blockId; length = 1 }]);
                        
                        if (blockRequest.blocks.size() > 0) {
                            let blockData = blockRequest.blocks[0];
                            let block = blockData.block;
                            
                            // "3revDist" 타입 블록만 처리
                            switch (block) {
                                case (#Map(fields)) {
                                    // 필드 추출
                                    var isRevDist = false;
                                    var timestamp : Int = 0;
                                    var amount : Nat = 0;
                                    var userId : ?Principal = null;
                                    var tokenId : ?Nat = null;
                                    var distributionId : ?Nat = null;
                                    
                                    // 필드 추출
                                    for ((fieldName, fieldValue) in fields.vals()) {
                                        if (fieldName == "btype") {
                                            // 블록 타입 확인
                                            switch (fieldValue) {
                                                case (#Text(btype)) { 
                                                    isRevDist := btype == "3revDist"; 
                                                };
                                                case (_) {};
                                            };
                                        } else if (fieldName == "ts") {
                                            // 타임스탬프 추출
                                            switch (fieldValue) {
                                                case (#Nat(ts)) { timestamp := Int.abs(ts); };
                                                case (_) {};
                                            };
                                        } else if (fieldName == "tx") {
                                            // 트랜잭션 세부 정보 추출
                                            switch (fieldValue) {
                                                case (#Map(txFields)) {
                                                    for ((txFieldName, txFieldValue) in txFields.vals()) {
                                                        if (txFieldName == "amt") {
                                                            // 금액 추출
                                                            switch (txFieldValue) {
                                                                case (#Nat(amt)) { amount := amt; };
                                                                case (_) {};
                                                            };
                                                        } else if (txFieldName == "to") {
                                                            // 수신자 ID 추출
                                                            switch (txFieldValue) {
                                                                case (#Array(accountData)) {
                                                                    if (accountData.size() > 0) {
                                                                        switch (accountData[0]) {
                                                                            case (#Blob(ownerBlob)) {
                                                                                userId := ?Principal.fromBlob(ownerBlob);
                                                                            };
                                                                            case (_) {};
                                                                        };
                                                                    };
                                                                };
                                                                case (_) {};
                                                            };
                                                        } else if (txFieldName == "tokenId") {
                                                            // NFT ID 추출
                                                            switch (txFieldValue) {
                                                                case (#Nat(tid)) { tokenId := ?tid; };
                                                                case (_) {};
                                                            };
                                                        } else if (txFieldName == "distributionId") {
                                                            // 배분 ID 추출
                                                            switch (txFieldValue) {
                                                                case (#Nat(did)) { distributionId := ?did; };
                                                                case (_) {};
                                                            };
                                                        };
                                                    };
                                                };
                                                case (_) {};
                                            };
                                        };
                                    };
                                    
                                    if (isRevDist and userId != null and Option.get(userId, Principal.fromText("aaaaa-aa")) == user and tokenId != null and distributionId != null) {
                                        let record : UserDistributionRecord = {
                                            recordId = Option.get(distributionId, 0);
                                            userId = user;
                                            tokenId = Option.get(tokenId, 0);
                                            amount = amount;
                                            distributedAt = timestamp;
                                            claimed = true;  // 블록에 기록되었으므로 이미 청구됨
                                            claimedAt = ?timestamp;
                                        };
                                        
                                        resultBuffer.add(record);
                                        Debug.print("[RevenueDistribution] 블록에서 직접 기록 추가됨: 블록ID=" # Nat.toText(blockId));
                                        
                                        // 블록 정보 맵에 저장 (다음 조회 최적화)
                                        let blockInfo: BlockInfo = {
                                            userId = user;
                                            tokenId = Option.get(tokenId, 0);
                                            distributionId = Option.get(distributionId, 0);
                                            amount = amount;
                                            timestamp = timestamp;
                                        };
                                        distributionBlockInfoMap.put(blockId, blockInfo);
                                        Debug.print("[RevenueDistribution] 블록 정보 맵에 추가됨: 블록ID=" # Nat.toText(blockId));
                                    };
                                };
                                case (_) {};
                            };
                        };
                    };
                };
            };
            
            // 결과를 배열로 변환
            let results = Buffer.toArray(resultBuffer);
            
            // 결과 정렬 (최신 배분부터)
            let sortedResults = Array.sort(results, func(a: UserDistributionRecord, b: UserDistributionRecord) : {#less; #equal; #greater} {
                if (a.distributedAt > b.distributedAt) { #less } 
                else if (a.distributedAt < b.distributedAt) { #greater } 
                else { #equal };
            });
            
            Debug.print("[RevenueDistribution] 페이지네이션 결과: " # Nat.toText(sortedResults.size()) # "개 항목, " # 
                      "hasMore=" # Bool.toText(hasMore) # 
                      ", nextStart=" # Nat.toText(nextStart));
            
            return {
                items = sortedResults;
                nextStart = nextStart;
                hasMore = hasMore;
            };
        };
    };
}; 