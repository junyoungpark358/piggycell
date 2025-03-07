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

module {
    //-----------------------------------------------------------------------------
    // 타입 정의
    //-----------------------------------------------------------------------------
    
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
        // 내부 유틸리티 함수
        //-----------------------------------------------------------------------------
        
        // 사용자가 관리자인지 확인
        private func isAdmin(user: Principal) : Bool {
            adminManager.isAdmin(user)
        };
        
        // 향후 ICRC-3 이용 방법에 대한 슈도 코드
        // 이 함수는 실제로 구현되지 않으며, 향후 ICRC-3가 PiggyCellToken에 구현될 때 사용할 코드입니다.
        private func recordDistributionTransaction(user: Principal, tokenId: Nat, amount: Nat, timestamp: Int) {
            /* 슈도 코드 - 실제 구현 시 아래와 같은 방식으로 호출할 예정
             * 
             * // ICRC-3 호환 블록 형식의 트랜잭션 기록
             * // 실제 구현에서는 이 부분이 PiggyCellToken에 구현될 예정
             * let blockData = {
             *   btype = "1mint";  // ICRC-3 표준에 맞는 블록 타입
             *   tx = {
             *     amt = amount;
             *     to = { owner = user; subaccount = null };
             *     memo = "Revenue distribution for NFT #" # Nat.toText(tokenId);
             *   };
             *   ts = timestamp;
             * };
             * 
             * // ICRC-3 블록 로그에 트랜잭션 기록
             * token.recordTransactionToBlockLog(blockData);
             */
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
                    
                    // 트랜잭션 기록 (향후 ICRC-3 사용)
                    // 슈도 코드로만 표시, 실제 동작하지 않음
                    recordDistributionTransaction(user, tokenId, amount, timestamp);
                };
                case (#Err(_)) {
                    // 실패 - 로그만 기록하고 계속 진행
                    // 민팅 실패에 대한 로그나 알림 기능을 여기에 추가할 수 있음
                };
            };
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
        
        // 트랜잭션 기록 조회 (향후 ICRC-3 사용 예시 - 슈도 코드)
        public func getTransactions(start: Nat, limit: Nat) : [UserDistributionRecord] {
            /* 슈도 코드 - 실제 구현 시 아래와 같은 방식으로 호출할 예정
             *
             * // ICRC-3 블록 가져오기
             * let blocksResult = token.icrc3_get_blocks([{ start = start; length = limit }]);
             * 
             * // 블록을 UserDistributionRecord 형태로 변환하여 반환
             * // (이 부분은 실제 구현에서 더 정교하게 작성되어야 함)
             */
            
            // 임시로 기존 함수 동작을 유지
            let allRecords = Iter.toArray(userDistributionRecords.vals());
            let sortedRecords = Array.sort(allRecords, func(a: UserDistributionRecord, b: UserDistributionRecord) : {#less; #equal; #greater} {
                if (a.distributedAt > b.distributedAt) { #less }
                else if (a.distributedAt < b.distributedAt) { #greater }
                else { #equal }
            });
            
            let totalRecords = sortedRecords.size();
            if (start >= totalRecords) {
                return [];
            };
            
            let end = Nat.min(start + limit, totalRecords);
            let result = Buffer.Buffer<UserDistributionRecord>(end - start);
            
            var i = start;
            while (i < end) {
                result.add(sortedRecords[i]);
                i += 1;
            };
            
            Buffer.toArray(result)
        };
        
        // 사용자 관련 트랜잭션 조회 (향후 ICRC-3 사용 예시 - 슈도 코드)
        public func getUserTransactions(user: Principal, start: Nat, limit: Nat) : [UserDistributionRecord] {
            /* 슈도 코드 - 실제 구현 시 아래와 같은 방식으로 호출할 예정
             *
             * // ICRC-3 API를 통해 사용자 관련 블록만 필터링하는 쿼리 실행
             * // 이 함수는 PiggyCellToken에 구현될 예정
             * let userBlocks = token.icrc3_getUserBlocks(user, start, limit);
             * 
             * // 블록을 UserDistributionRecord 형태로 변환하여 반환
             */
            
            // 임시로 기존 사용자 배분 기록을 반환
            return getUserDistributionRecords(user);
        };
    };
}; 