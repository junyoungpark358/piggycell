import Principal "mo:base/Principal";
import Result "mo:base/Result";
import TrieMap "mo:base/TrieMap";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Buffer "mo:base/Buffer";
import Hash "mo:base/Hash";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Option "mo:base/Option";
import PiggyCellToken "./PiggyCellToken";
import ChargerHubNFT "./ChargerHubNFT";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Error "mo:base/Error";
import Admin "./Admin";

module {
    // 리스팅 정보 타입
    public type Listing = {
        tokenId: Nat;
        seller: Principal;
        price: Nat;
        listedAt: Int;
    };

    public type ListingError = {
        #NotOwner;
        #AlreadyListed;
        #NotListed;
        #InvalidPrice;
        #InsufficientBalance;
        #TransferError;
    };

    public type PageResult = {
        items: [Listing];
        total: Nat;
        nextStart: ?Nat;
    };

    public class MarketManager(token: PiggyCellToken.PiggyCellToken, nft: ChargerHubNFT.NFTCanister, marketCanister: Principal, adminManager: Admin.AdminManager) {
        // 맞춤형 해시 함수로 구현
        private func natHash(n: Nat) : Hash.Hash {
            Text.hash(Nat.toText(n))
        };
        
        private let listings = TrieMap.TrieMap<Nat, Listing>(Nat.equal, natHash);
        private var lastTokenId: Nat = 0; // 마지막으로 리스팅된 토큰 ID 추적
        private let listingsByTime = Buffer.Buffer<(Int, Nat)>(0); // (timestamp, tokenId) 쌍을 저장하는 버퍼
        
        // 판매 완료된 NFT 관리를 위한 데이터 구조 추가
        private let soldNFTs = TrieMap.TrieMap<Nat, Int>(Nat.equal, natHash); // tokenId -> sellTime
        private let soldNFTsByTime = Buffer.Buffer<(Int, Nat)>(0); // (판매시각, NFT ID) 저장
        
        // 통계 데이터를 위한 캐시 변수 추가
        private var cachedAvailableNFTs: Nat = 0;
        private var cachedSoldNFTs: Nat = 0;
        
        // 초기화 함수 추가
        public func initializeStats() {
            cachedAvailableNFTs := listings.size();
            cachedSoldNFTs := soldNFTs.size();
            Debug.print("마켓 통계 초기화 완료: 판매중 NFT = " # Nat.toText(cachedAvailableNFTs) # ", 판매완료 NFT = " # Nat.toText(cachedSoldNFTs));
        };
        
        // 생성자에서 초기화 호출
        initializeStats();
        
        // NFT 리스팅
        public func listNFT(caller: Principal, tokenId: Nat, price: Nat) : Result.Result<(), ListingError> {
            // 이미 리스팅된 NFT인지 확인
            switch (listings.get(tokenId)) {
                case (?_) { return #err(#AlreadyListed) };
                case null {
                    let listing: Listing = {
                        tokenId = tokenId;
                        seller = caller;
                        price = price;
                        listedAt = Time.now();
                    };
                    listings.put(tokenId, listing);
                    // 판매 항목도 맨 앞에 추가하여 최신 항목이 앞에 오도록 변경
                    listingsByTime.insert(0, (listing.listedAt, tokenId));
                    if (tokenId > lastTokenId) { lastTokenId := tokenId };
                    
                    // 통계 업데이트
                    cachedAvailableNFTs += 1;
                    Debug.print("NFT 리스팅 통계 업데이트: 판매중 NFT = " # Nat.toText(cachedAvailableNFTs));
                    
                    #ok(())
                };
            }
        };

        // NFT 리스팅 취소
        public func delistNFT(caller: Principal, tokenId: Nat) : Result.Result<(), ListingError> {
            switch (listings.get(tokenId)) {
                case (?listing) {
                    if (listing.seller != caller) {
                        return #err(#NotOwner);
                    };
                    listings.delete(tokenId);
                    // listingsByTime에서도 제거
                    var i = 0;
                    label l while (i < listingsByTime.size()) {
                        let (_, tid) = listingsByTime.get(i);
                        if (tid == tokenId) {
                            let _ = listingsByTime.remove(i);
                            break l;
                        };
                        i += 1;
                    };
                    
                    // 통계 업데이트
                    cachedAvailableNFTs := Nat.max(0, cachedAvailableNFTs - 1);
                    Debug.print("NFT 리스팅 취소 통계 업데이트: 판매중 NFT = " # Nat.toText(cachedAvailableNFTs));
                    
                    #ok(())
                };
                case null { #err(#NotListed) };
            }
        };

        // NFT 구매
        public func buyNFT(caller : Principal, tokenId: Nat) : Result.Result<Listing, ListingError> {
            Debug.print("buyNFT 시작: caller=" # Principal.toText(caller) # ", tokenId=" # Nat.toText(tokenId));
            
            switch (listings.get(tokenId)) {
                case (?listing) {
                    Debug.print("Listing 정보: 판매자=" # Principal.toText(listing.seller) # ", 가격=" # Nat.toText(listing.price));
                    
                    // SuperAdmin 정보 가져오기
                    let superAdminOpt = adminManager.getSuperAdmin();
                    
                    // SuperAdmin이 설정되지 않았으면 오류 반환
                    switch (superAdminOpt) {
                        case (null) {
                            Debug.print("SuperAdmin이 설정되지 않았습니다.");
                            return #err(#TransferError);
                        };
                        case (?superAdmin) {
                            // 1. SuperAdmin 계정 생성
                            let superAdminAccount: PiggyCellToken.Account = {
                                owner = superAdmin;
                                subaccount = null;
                            };
                            
                            // 2. 구매자 계정 생성
                            let buyerAccount: PiggyCellToken.Account = {
                                owner = caller;
                                subaccount = null;
                            };
                            
                            // 3. 마켓 계정 생성
                            let marketAccount: PiggyCellToken.Account = {
                                owner = marketCanister;
                                subaccount = null;
                            };
                            
                            // 4. 구매자가 마켓에 승인한 금액 확인
                            let allowanceArgs: PiggyCellToken.AllowanceArgs = {
                                account = buyerAccount;
                                spender = marketAccount;
                            };
                            
                            let allowanceResponse = token.icrc2_allowance(allowanceArgs);
                            let allowanceAmount = allowanceResponse.allowance;
                            Debug.print("승인된 금액: " # Nat.toText(allowanceAmount) # ", 필요 금액: " # Nat.toText(listing.price));
                            
                            if (allowanceAmount < listing.price) {
                                Debug.print("승인 금액 부족: 승인=" # Nat.toText(allowanceAmount) # ", 필요=" # Nat.toText(listing.price));
                                return #err(#InsufficientBalance);
                            };
                            
                            // 5. 토큰 전송 (구매자 -> SuperAdmin, 마켓이 대신 처리)
                            let transferFromArgs: PiggyCellToken.TransferFromArgs = {
                                spender_subaccount = null;
                                from = buyerAccount;
                                to = superAdminAccount;  // SuperAdmin 계정으로 전송
                                amount = listing.price;
                                fee = ?token.icrc1_fee();
                                memo = null;
                                created_at_time = null;
                            };
                            
                            Debug.print("토큰 전송 시도(transfer_from): 금액=" # Nat.toText(listing.price) # ", 수수료=" # Nat.toText(token.icrc1_fee()));
                            Debug.print("시간 값: 생략됨 (null)");
                            
                            // icrc2_transfer_from 함수 호출
                            let transferFromResult = switch (token.icrc2_transfer_from(marketCanister, transferFromArgs)) {
                                case (#Ok(blockIndex)) { #Ok(blockIndex) };
                                case (#Err(error)) { #Err(error) };
                            };
                            
                            Debug.print("transfer_from 결과: " # debug_show(transferFromResult));
                            
                            switch (transferFromResult) {
                                case (#Ok(blockIndex)) {
                                    Debug.print("토큰 전송 성공: 블록 인덱스 " # Nat.toText(blockIndex));
                                    
                                    // 6. NFT 전송 처리
                                    // NFT 소유권을 구매자에게 이전
                                    switch(nft.updateOwner(marketCanister, tokenId, caller)) {
                                        case (#ok()) {
                                            Debug.print("NFT 소유권 이전 성공: tokenId=" # Nat.toText(tokenId) # ", 새 소유자=" # Principal.toText(caller));
                                            
                                            // 7. 처리 완료 후 리스팅 제거
                                            Debug.print("구매 완료, 리스팅 제거: tokenId=" # Nat.toText(tokenId));
                                            listings.delete(tokenId);
                                            
                                            // listingsByTime에서도 제거
                                            var i = 0;
                                            label l while (i < listingsByTime.size()) {
                                                let (_, tid) = listingsByTime.get(i);
                                                if (tid == tokenId) {
                                                    let _ = listingsByTime.remove(i);
                                                    break l;
                                                };
                                                i += 1;
                                            };
                                            
                                            // 판매 완료된 NFT 추적 로직 추가
                                            let sellTime = Time.now();
                                            soldNFTs.put(tokenId, sellTime);
                                            // 최신 판매 항목이 버퍼 앞에 오도록 맨 앞에 추가
                                            soldNFTsByTime.insert(0, (sellTime, tokenId));
                                            
                                            // 통계 업데이트
                                            cachedAvailableNFTs := Nat.max(0, cachedAvailableNFTs - 1);
                                            cachedSoldNFTs += 1;
                                            Debug.print("NFT 판매 통계 업데이트: 판매중 NFT = " # Nat.toText(cachedAvailableNFTs) # ", 판매완료 NFT = " # Nat.toText(cachedSoldNFTs));
                                            
                                            #ok(listing)
                                        };
                                        case (#err(error)) {
                                            Debug.print("NFT 소유권 이전 실패: " # error);
                                            #err(#TransferError)
                                        };
                                    };
                                };
                                case (#Err(error)) {
                                    Debug.print("토큰 전송 실패: " # debug_show(error));
                                    #err(#TransferError)
                                };
                            }
                        };
                    };
                };
                case (null) {
                    Debug.print("NFT가 판매 중이 아님: tokenId=" # Nat.toText(tokenId));
                    #err(#NotListed)
                };
            }
        };

        // 특정 NFT의 리스팅 정보 조회
        public func getListing(tokenId: Nat) : ?Listing {
            listings.get(tokenId)
        };

        // 모든 리스팅된 NFT 조회
        public func getAllListings() : [Listing] {
            let buffer = Buffer.Buffer<Listing>(0);
            for ((_, listing) in listings.entries()) {
                buffer.add(listing);
            };
            Buffer.toArray(buffer)
        };

        // 특정 판매자의 리스팅된 NFT 조회 (페이지네이션)
        public func getListingsBySeller(seller: Principal, start: ?Nat, limit: Nat) : PageResult {
            let buffer = Buffer.Buffer<Listing>(0);
            var count = 0;
            var nextStartValue: ?Nat = null;
            var totalCount = 0;
            
            let startValue = switch (start) {
                case (?s) { s };
                case null { lastTokenId + 1 };
            };

            // 전체 개수 계산
            for ((_, listing) in listings.entries()) {
                if (listing.seller == seller) {
                    totalCount += 1;
                };
            };

            var currentId = startValue;
            while (currentId > 0 and count < limit) {
                currentId -= 1;
                switch (listings.get(currentId)) {
                    case (?listing) {
                        if (listing.seller == seller) {
                            buffer.add(listing);
                            count += 1;
                            if (count == limit) {
                                nextStartValue := ?currentId;
                            };
                        };
                    };
                    case null { };
                };
            };

            {
                items = Buffer.toArray(buffer);
                total = totalCount;
                nextStart = nextStartValue;
            }
        };

        // NFT가 리스팅되어 있는지 확인
        public func isListed(tokenId: Nat) : Bool {
            switch (listings.get(tokenId)) {
                case (?_) { true };
                case null { false };
            }
        };

        // 리스팅된 총 NFT 수 조회
        public func getTotalListings() : Nat {
            cachedAvailableNFTs
        };

        // 페이지네이션을 지원하는 리스팅 조회 (최신순 정렬 지원)
        public func getListings(start: ?Nat, limit: Nat) : PageResult {
            let buffer = Buffer.Buffer<Listing>(0);
            var count = 0;
            var nextStartValue: ?Nat = null;
            
            // 시작 인덱스 계산
            let startIndex = switch (start) {
                case (?s) { s };
                case null { 0 }; // 첫 페이지는 가장 최신 NFT부터 시작
            };

            // 끝 인덱스 계산
            let endIndex = Nat.min(startIndex + limit, listingsByTime.size());
            
            var i = startIndex;
            // 인덱스 범위 검증 
            while (i < endIndex and i < listingsByTime.size()) {
                // 최신 항목이 버퍼 앞에 있으므로 그대로 접근
                let (_, tokenId) = listingsByTime.get(i);
                switch (listings.get(tokenId)) {
                    case (?listing) {
                        buffer.add(listing);
                        count += 1;
                    };
                    case null { };
                };
                
                i += 1;
            };

            // 다음 페이지가 있는지 확인
            let nextStart = if (i < listingsByTime.size()) { ?i } else { null };

            {
                items = Buffer.toArray(buffer);
                total = cachedAvailableNFTs; // 캐시된 값 사용
                nextStart = nextStart;
            }
        };

        // 판매 완료된 NFT 조회 API 개선 (최신순 정렬 자동 지원)
        public func getSoldNFTs(start: ?Nat, limit: Nat) : PageResult {
            let buffer = Buffer.Buffer<Listing>(0);
            var count = 0;
            var nextStartValue: ?Nat = null;
            
            // 시작 인덱스 계산
            let startIndex = switch (start) {
                case (?s) { s };
                case null { 0 }; // 첫 페이지는 가장 최신 판매된 NFT부터 시작
            };

            // 끝 인덱스 계산
            let endIndex = Nat.min(startIndex + limit, soldNFTsByTime.size());
            
            var i = startIndex;
            // 인덱스 범위 검증 
            while (i < endIndex and i < soldNFTsByTime.size()) {
                // 최신 항목이 버퍼 앞에 있으므로 그대로 접근
                let (sellTime, tokenId) = soldNFTsByTime.get(i);
                
                // NFT 소유자 확인 (소유자 정보가 있어야 판매 완료 정보를 제공)
                let ownerResult = nft.icrc7_owner_of([tokenId]);
                if (ownerResult.size() > 0 and ownerResult[0] != null) {
                    let ownerAccount = Option.unwrap(ownerResult[0]);
                    
                    // 가격 정보를 얻기 위해 메타데이터를 조회해볼 수 있으나,
                    // 여기서는 간단하게 판매자를 구매자로 대체하고 가격 정보는 0으로 설정
                    let soldListing: Listing = {
                        tokenId = tokenId;
                        seller = ownerAccount.owner; // 현재 소유자를 판매자로 표시
                        price = 0; // 판매 가격 정보가 없으므로 0으로 설정
                        listedAt = sellTime; // 판매 시간으로 설정
                    };
                    
                    buffer.add(soldListing);
                    count += 1;
                };
                
                i += 1;
            };

            // 다음 페이지가 있는지 확인
            let nextStart = if (i < soldNFTsByTime.size()) { ?i } else { null };

            {
                items = Buffer.toArray(buffer);
                total = cachedSoldNFTs; // 캐시된 값 사용
                nextStart = nextStart;
            }
        };

        // 생성자 아래에 추가
        public func migrateSoldNFTsOrder() : () {
            // 기존 데이터를 임시 배열로 복사
            let tempArray = Buffer.toArray(soldNFTsByTime);
            
            // 시간(첫 번째 요소)을 기준으로 내림차순 정렬
            let sortedArray = Array.sort<(Int, Nat)>(tempArray, func(a, b) {
                Int.compare(b.0, a.0) // 내림차순 정렬 (최신순)
            });
            
            // soldNFTsByTime 버퍼 초기화
            soldNFTsByTime.clear();
            
            // 정렬된 데이터를 다시 버퍼에 추가
            for (item in sortedArray.vals()) {
                soldNFTsByTime.add(item);
            };
            
            Debug.print("판매 완료된 NFT 데이터 " # Nat.toText(soldNFTsByTime.size()) # "개가 최신순으로 재정렬되었습니다.");
        };
    };
}; 