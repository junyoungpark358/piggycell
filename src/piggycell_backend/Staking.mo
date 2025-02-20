import Principal "mo:base/Principal";
import Result "mo:base/Result";
import TrieMap "mo:base/TrieMap";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Hash "mo:base/Hash";
import Buffer "mo:base/Buffer";
import Token "./Token";
import ChargerHubNFT "./ChargerHubNFT";

module {
    // 스테이킹 정보 타입
    public type StakingInfo = {
        tokenId: Nat;
        owner: Principal;
        stakedAt: Int;
        lastRewardClaimAt: Int;
    };

    public type StakingError = {
        #NotOwner;
        #AlreadyStaked;
        #NotStaked;
        #TransferError;
    };

    public class StakingManager(token: Token.Token, nft: ChargerHubNFT.NFTCanister) {
        private let stakingInfos = TrieMap.TrieMap<Nat, StakingInfo>(Nat.equal, Hash.hash);
        
        // 스테이킹 보상 계산 (1시간당 1 PGC)
        private func calculateReward(stakingInfo: StakingInfo) : Nat {
            let now = Time.now();
            let timeSinceLastClaim = now - stakingInfo.lastRewardClaimAt;
            let hoursStaked = Int.abs(timeSinceLastClaim) / (1_000_000_000 * 60 * 60); // 나노초를 시간으로 변환
            Nat.max(Int.abs(hoursStaked), 0)
        };

        // NFT 스테이킹
        public func stakeNFT(caller: Principal, tokenId: Nat) : Result.Result<(), StakingError> {
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
                    };
                    stakingInfos.put(tokenId, stakingInfo);
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
                        let transferArgs: Token.TransferArgs = {
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
                            case (#err(_)) { return #err(#TransferError) };
                            case (#ok()) { };
                        };
                    };

                    // 스테이킹 정보 삭제
                    stakingInfos.delete(tokenId);
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
                        let transferArgs: Token.TransferArgs = {
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
                            case (#err(_)) { return #err(#TransferError) };
                            case (#ok()) {
                                // 마지막 보상 수령 시간 업데이트
                                let updatedInfo: StakingInfo = {
                                    tokenId = stakingInfo.tokenId;
                                    owner = stakingInfo.owner;
                                    stakedAt = stakingInfo.stakedAt;
                                    lastRewardClaimAt = Time.now();
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
    };
}; 