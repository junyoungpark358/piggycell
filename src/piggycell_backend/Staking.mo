import Principal "mo:base/Principal";
import Result "mo:base/Result";
import TrieMap "mo:base/TrieMap";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Hash "mo:base/Hash";
import Buffer "mo:base/Buffer";
import PiggyCellToken "./PiggyCellToken";
import ChargerHubNFT "./ChargerHubNFT";
import Admin "./Admin";
import Text "mo:base/Text";

module {
    //-----------------------------------------------------------------------------
    // 타입 정의
    //-----------------------------------------------------------------------------
    
    // 스테이킹 정보 타입
    public type StakingInfo = {
        tokenId: Nat;
        owner: Principal;
        stakedAt: Int;
        lastRewardClaimAt: Int;
        price: Nat;  // NFT 가격 정보 추가
    };

    // 스테이킹 오류 타입
    public type StakingError = {
        #NotOwner;
        #AlreadyStaked;
        #NotStaked;
        #TransferError;
        #NotAuthorized;
    };

    //-----------------------------------------------------------------------------
    // 스테이킹 관리자 구현
    //-----------------------------------------------------------------------------
    
    public class StakingManager(token: PiggyCellToken.PiggyCellToken, nft: ChargerHubNFT.NFTCanister) {
        //-----------------------------------------------------------------------------
        // 변수 및 초기화
        //-----------------------------------------------------------------------------
        
        // 맞춤형 해시 함수로 구현
        private func natHash(n: Nat) : Hash.Hash {
            Text.hash(Nat.toText(n))
        };
        
        // 스테이킹 정보 저장소
        private let stakingInfos = TrieMap.TrieMap<Nat, StakingInfo>(Nat.equal, natHash);
        
        // 누적 집계를 위한 변수 추가
        private var cachedStakedCount: Nat = 0;
        
        // 캐시 초기화 함수
        private func initializeStats() {
            cachedStakedCount := stakingInfos.size();
        };
        
        // 생성자에서 초기화 호출
        initializeStats();
        
        //-----------------------------------------------------------------------------
        // 내부 유틸리티 함수
        //-----------------------------------------------------------------------------
        
        // 스테이킹 보상 계산 (1시간당 1 PGC)
        private func calculateReward(stakingInfo: StakingInfo) : Nat {
            let now = Time.now();
            let timeSinceLastClaim = now - stakingInfo.lastRewardClaimAt;
            let hoursStaked = Int.abs(timeSinceLastClaim) / (1_000_000_000 * 60 * 60); // 나노초를 시간으로 변환
            Nat.max(Int.abs(hoursStaked), 0)
        };
        
        // 사용자가 관리자인지 확인 - adminManager가 없으므로 항상 false 반환
        private func _isAdmin(_: Principal) : Bool {
            false  // 관리자 체크를 하지 않음
        };
        
        //-----------------------------------------------------------------------------
        // 스테이킹 주요 기능 함수
        //-----------------------------------------------------------------------------
        
        // NFT 스테이킹 (가격 정보 추가)
        public func stakeNFT(caller: Principal, tokenId: Nat, price: Nat) : Result.Result<(), StakingError> {
            // 토큰 소유자 확인
            let owners = nft.icrc7_owner_of([tokenId]);
            
            switch(owners[0]) {
                case null { return #err(#NotOwner) };
                case (?currentOwner) {
                    if (currentOwner.owner != caller) {
                        return #err(#NotOwner);
                    };
                };
            };

            // 이미 스테이킹된 NFT인지 확인
            switch(stakingInfos.get(tokenId)) {
                case (?_) { return #err(#AlreadyStaked) };
                case null {
                    let now = Time.now();
                    let stakingInfo: StakingInfo = {
                        tokenId = tokenId;
                        owner = caller;
                        stakedAt = now;
                        lastRewardClaimAt = now;
                        price = price;  // 가격 정보 저장
                    };
                    stakingInfos.put(tokenId, stakingInfo);
                    
                    // 스테이킹 통계 업데이트
                    cachedStakedCount += 1;
                    
                    #ok(())
                };
            }
        };

        // NFT 언스테이킹 (보상 포함)
        public func unstakeNFT(caller: Principal, tokenId: Nat) : Result.Result<Nat, StakingError> {
            switch(stakingInfos.get(tokenId)) {
                case (?stakingInfo) {
                    if (stakingInfo.owner != caller) {
                        return #err(#NotOwner);
                    };

                    // 보상 계산
                    let reward = calculateReward(stakingInfo);

                    // 보상 지급
                    if (reward > 0) {
                        let transferArgs: PiggyCellToken.TransferArgs = {
                            from_subaccount = null;
                            to = {
                                owner = caller;
                                subaccount = null;
                            };
                            amount = reward;
                            fee = null;
                            memo = null;
                            created_at_time = null;
                        };
                        
                        switch(token.icrc1_transfer(caller, transferArgs)) {
                            case (#Err(_)) { return #err(#TransferError) };
                            case (#Ok(_)) { };
                        };
                    };

                    // 스테이킹 정보 삭제
                    stakingInfos.delete(tokenId);
                    
                    // 스테이킹 통계 업데이트
                    cachedStakedCount := Nat.max(0, cachedStakedCount - 1);
                    
                    #ok(reward)
                };
                case null {
                    #err(#NotStaked)
                };
            }
        };

        // 스테이킹 보상 수령
        public func claimReward(caller: Principal, tokenId: Nat) : Result.Result<Nat, StakingError> {
            switch(stakingInfos.get(tokenId)) {
                case (?stakingInfo) {
                    if (stakingInfo.owner != caller) {
                        return #err(#NotOwner);
                    };

                    // 보상 계산
                    let reward = calculateReward(stakingInfo);
                    if (reward > 0) {
                        let transferArgs: PiggyCellToken.TransferArgs = {
                            from_subaccount = null;
                            to = {
                                owner = caller;
                                subaccount = null;
                            };
                            amount = reward;
                            fee = null;
                            memo = null;
                            created_at_time = null;
                        };
                        
                        switch(token.icrc1_transfer(caller, transferArgs)) {
                            case (#Err(_)) { return #err(#TransferError) };
                            case (#Ok(_)) {
                                // 마지막 보상 수령 시간 업데이트
                                let updatedInfo: StakingInfo = {
                                    tokenId = stakingInfo.tokenId;
                                    owner = stakingInfo.owner;
                                    stakedAt = stakingInfo.stakedAt;
                                    lastRewardClaimAt = Time.now();
                                    price = stakingInfo.price;  // 가격 유지
                                };
                                stakingInfos.put(tokenId, updatedInfo);
                            };
                        };
                    };
                    #ok(reward)
                };
                case null {
                    #err(#NotStaked)
                };
            }
        };
        
        // NFT 가격 업데이트 함수 추가
        public func updateNFTPrice(caller: Principal, tokenId: Nat, newPrice: Nat) : Result.Result<(), StakingError> {
            switch(stakingInfos.get(tokenId)) {
                case (?info) {
                    // 권한 검증 (소유자만 가능)
                    if (info.owner != caller) {
                        return #err(#NotAuthorized);
                    };
                    
                    // 가격 업데이트
                    let updatedInfo: StakingInfo = {
                        tokenId = info.tokenId;
                        owner = info.owner;
                        stakedAt = info.stakedAt;
                        lastRewardClaimAt = info.lastRewardClaimAt;
                        price = newPrice;
                    };
                    stakingInfos.put(tokenId, updatedInfo);
                    #ok(())
                };
                case null { #err(#NotStaked) };
            }
        };
        
        // 모든 스테이킹된 NFT ID 목록 반환
        public func getAllStakedTokenIds() : [Nat] {
            let buffer = Buffer.Buffer<Nat>(0);
            for ((tokenId, _) in stakingInfos.entries()) {
                buffer.add(tokenId);
            };
            Buffer.toArray(buffer)
        };
        
        // 총 스테이킹 가치 계산 함수 추가
        public func getTotalStakedValue() : Nat {
            var total: Nat = 0;
            for ((_, info) in stakingInfos.entries()) {
                total += info.price;
            };
            total
        };

        //-----------------------------------------------------------------------------
        // 조회 함수
        //-----------------------------------------------------------------------------
        
        // 스테이킹 정보 조회
        public func getStakingInfo(tokenId: Nat) : ?StakingInfo {
            stakingInfos.get(tokenId)
        };

        // 사용자의 스테이킹된 NFT 목록 조회
        public func getStakedNFTs(owner: Principal) : [Nat] {
            let buffer = Buffer.Buffer<Nat>(0);
            for ((tokenId, info) in stakingInfos.entries()) {
                if (info.owner == owner) {
                    buffer.add(tokenId);
                };
            };
            Buffer.toArray(buffer)
        };

        // NFT가 스테이킹되어 있는지 확인
        public func isStaked(tokenId: Nat) : Bool {
            switch (stakingInfos.get(tokenId)) {
                case (?_) { true };
                case null { false };
            }
        };

        // 예상 보상 조회
        public func getEstimatedReward(tokenId: Nat) : Result.Result<Nat, StakingError> {
            switch(stakingInfos.get(tokenId)) {
                case (?stakingInfo) {
                    #ok(calculateReward(stakingInfo))
                };
                case null {
                    #err(#NotStaked)
                };
            }
        };

        // 총 스테이킹된 NFT 개수 조회 함수 추가
        public func getTotalStakedCount() : Nat {
            cachedStakedCount
        };
    };
}; 