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

module {
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
            totalDistributionCount += 1;
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
            // 관리자 권한 확인
            if (not isAdmin(caller)) {
                return #err(#NotAuthorized);
            };
            
            // 금액 유효성 확인
            if (totalAmount == 0) {
                return #err(#InvalidAmount);
            };
            
            // 스테이킹된 모든 NFT ID 목록 수집
            let stakedTokenIds = stakingManager.getAllStakedTokenIds();
            
            // 총 스테이킹 가치 계산
            let totalStakedValue = stakingManager.getTotalStakedValue();
            
            // 총 스테이킹 가치가 0인 경우
            if (totalStakedValue == 0) {
                return #err(#InvalidAmount);
            };
            
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
            
            // 각 NFT별 수익 계산 및 분배
            for (tokenId in stakedTokenIds.vals()) {
                switch (stakingManager.getStakingInfo(tokenId)) {
                    case (?stakingInfo) {
                        // 가중치에 따른 수익 계산
                        let shareRatio = Float.fromInt(stakingInfo.price) / Float.fromInt(totalStakedValue);
                        let amount = Int.abs(Float.toInt(shareRatio * Float.fromInt(totalAmount)));
                        
                        let owner = stakingInfo.owner;
                        
                        // 자동 배분 - 사용자 선호도 없이 즉시 배분
                        distributeToUser(owner, tokenId, amount, distributionId, now);
                    };
                    case (null) {
                        // 스테이킹 정보가 없는 경우 (이론상 발생하지 않아야 함)
                        // 빈 블록으로 처리
                    }
                };
            };
            
            #ok(distributionId)
        };
        
        // 개별 사용자에게 수익 배분하기
        private func distributeToUser(user: Principal, tokenId: Nat, amount: Nat, recordId: Nat, timestamp: Int) {
            // 사용자 계정 생성
            let userAccount: PiggyCellToken.Account = {
                owner = user;
                subaccount = null;
            };
            
            // 토큰 민팅으로 수익 배분
            switch (token.mint(userAccount, amount)) {
                case (#Ok(_)) {
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
                    
                    // 통계 인덱스 업데이트
                    updateStatIndices(userRecord);
                    
                    // ICRC-3 수익 배분 블록 추가 (PiggyCellToken의 addRevenueDistributionBlock 사용)
                    token.addRevenueDistributionBlock(userAccount, amount, tokenId, recordId);
                };
                case (#Err(_)) {
                    // 실패 - 로그만 기록하고 계속 진행
                    // 민팅 실패에 대한 로그나 알림 기능을 여기에 추가할 수 있음
                };
            };
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
            
            // 수익 이력 계산 (최근 10개)
            let revenueHistoryBuffer = Buffer.Buffer<UserRevenuePoint>(10);
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
                // 각 배분에 대한 수신자 수 계산
                var recipients = 0;
                for ((_, userRecord) in userDistributionRecords.entries()) {
                    if (userRecord.recordId == record.id) {
                        recipients += 1;
                    };
                };
                
                recentBuffer.add({
                    id = record.id;
                    amount = record.totalAmount;
                    timestamp = record.distributedAt;
                    recipientCount = recipients;
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
        
        // ICRC-3 트랜잭션 조회 구현 (PiggyCellToken의 ICRC-3 구현 사용)
        // start: 조회 시작 블록 인덱스, limit: 조회할 최대 블록 수
        // 반환: 수익 배분(3revDist) 블록에서 추출한 UserDistributionRecord 배열
        public func getTransactions(start: Nat, limit: Nat) : [UserDistributionRecord] {
            // ICRC-3 API를 사용하여 블록 가져오기
            let blocksResult = token.icrc3_get_blocks([{ start = start; length = limit }]);
            
            // 블록에서 UserDistributionRecord로 변환할 항목 저장용 버퍼
            let resultBuffer = Buffer.Buffer<UserDistributionRecord>(blocksResult.blocks.size());
            
            for (blockData in blocksResult.blocks.vals()) {
                let id = blockData.id;
                let block = blockData.block;
                
                // "3revDist" 타입 블록만 처리
                switch (block) {
                    case (#Map(fields)) {
                        // 블록 타입 확인
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
                                        if (btype == "3revDist") {
                                            isRevDist := true;
                                        };
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
                                // 트랜잭션 데이터 추출
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
                                                // NFT 토큰 ID 추출
                                                switch (txFieldValue) {
                                                    case (#Nat(id)) { tokenId := ?id; };
                                                    case (_) {};
                                                };
                                            } else if (txFieldName == "distributionId") {
                                                // 수익 배분 ID 추출
                                                switch (txFieldValue) {
                                                    case (#Nat(id)) { distributionId := ?id; };
                                                    case (_) {};
                                                };
                                            };
                                        };
                                    };
                                    case (_) {};
                                };
                            };
                        };
                        
                        // 유효한 수익 배분 블록인 경우 레코드 생성
                        if (isRevDist and userId != null and tokenId != null and distributionId != null) {
                            let record : UserDistributionRecord = {
                                recordId = Option.get(distributionId, 0);
                                userId = Option.get(userId, Principal.fromText("aaaaa-aa"));
                                tokenId = Option.get(tokenId, 0);
                                amount = amount;
                                distributedAt = timestamp;
                                claimed = true;  // 블록에 기록되었으므로 이미 청구됨
                                claimedAt = ?timestamp;
                            };
                            
                            resultBuffer.add(record);
                        };
                    };
                    case (_) {};
                };
            };
            
            Buffer.toArray(resultBuffer)
        };
        
        // 특정 사용자의 수익 배분 트랜잭션 조회 (PiggyCellToken의 ICRC-3 구현 사용)
        // user: 조회할 사용자 ID, start: 조회 시작 블록 인덱스, limit: 조회할 최대 레코드 수
        // 반환: 특정 사용자에게 배분된 수익 레코드 배열
        public func getUserTransactions(user: Principal, start: Nat, limit: Nat) : [UserDistributionRecord] {
            // 특정 개수의 블록 가져오기 (충분한 결과를 얻기 위해 요청한 limit보다 더 많은 블록 가져옴)
            let blocksResult = token.icrc3_get_blocks([{ start = start; length = limit * 5 }]);
            
            // 블록에서 UserDistributionRecord로 변환할 항목 저장용 버퍼
            let resultBuffer = Buffer.Buffer<UserDistributionRecord>(blocksResult.blocks.size());
            
            for (blockData in blocksResult.blocks.vals()) {
                let id = blockData.id;
                let block = blockData.block;
                
                // "3revDist" 타입 블록만 처리 및 특정 사용자 필터링
                switch (block) {
                    case (#Map(fields)) {
                        // 필드 분석에 필요한 변수 초기화
                        var isRevDist = false;
                        var timestamp : Int = 0;
                        var amount : Nat = 0;
                        var userId : ?Principal = null;
                        var tokenId : ?Nat = null;
                        var distributionId : ?Nat = null;
                        
                        // 블록의 모든 필드 분석
                        for ((fieldName, fieldValue) in fields.vals()) {
                            if (fieldName == "btype") {
                                // 블록 타입 확인
                                switch (fieldValue) {
                                    case (#Text(btype)) {
                                        if (btype == "3revDist") {
                                            isRevDist := true;
                                        };
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
                                                // 수신자 ID 추출 (이 사용자가 현재 요청한 사용자와 일치하는지 확인용)
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
                                                    case (#Nat(id)) { tokenId := ?id; };
                                                    case (_) {};
                                                };
                                            } else if (txFieldName == "distributionId") {
                                                // 수익 배분 ID 추출
                                                switch (txFieldValue) {
                                                    case (#Nat(id)) { distributionId := ?id; };
                                                    case (_) {};
                                                };
                                            };
                                        };
                                    };
                                    case (_) {};
                                };
                            };
                        };
                        
                        // 유효한 수익 배분 블록이며 현재 사용자의 블록인 경우 레코드 생성
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
                        };
                    };
                    case (_) {};
                };
            };
            
            // 결과 개수 제한
            let filteredResults = Buffer.toArray(resultBuffer);
            if (filteredResults.size() <= limit) {
                return filteredResults;
            } else {
                // 요청한 limit 개수로 제한
                let limitedResults = Buffer.Buffer<UserDistributionRecord>(limit);
                for (i in Iter.range(0, limit - 1)) {
                    limitedResults.add(filteredResults[i]);
                };
                return Buffer.toArray(limitedResults);
            };
        };
    };
}; 