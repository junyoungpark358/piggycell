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
import PiggyCellToken "./PiggyCellToken";
import ChargerHubNFT "./ChargerHubNFT";
import Debug "mo:base/Debug";

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

    public class MarketManager(token: PiggyCellToken.PiggyCellToken, nft: ChargerHubNFT.NFTCanister, marketCanister: Principal) {
        private let listings = TrieMap.TrieMap<Nat, Listing>(Nat.equal, Hash.hash);
        private var lastTokenId: Nat = 0; // 마지막으로 리스팅된 토큰 ID 추적
        private let listingsByTime = Buffer.Buffer<(Int, Nat)>(0); // (timestamp, tokenId) 쌍을 저장하는 버퍼
        
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
                    listingsByTime.add((listing.listedAt, tokenId));
                    if (tokenId > lastTokenId) { lastTokenId := tokenId };
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
                    
                    // 1. 판매자 계정 생성
                    let sellerAccount: PiggyCellToken.Account = {
                        owner = listing.seller;
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
                    
                    // 5. 토큰 전송 (구매자 -> 판매자, 마켓이 대신 처리)
                    let transferFromArgs: PiggyCellToken.TransferFromArgs = {
                        spender_subaccount = null;
                        from = buyerAccount;
                        to = sellerAccount;
                        amount = listing.price;
                        fee = ?token.icrc1_fee();
                        memo = null;
                        created_at_time = null;
                    };
                    
                    Debug.print("토큰 전송 시도(transfer_from): 금액=" # Nat.toText(listing.price) # ", 수수료=" # Nat.toText(token.icrc1_fee()));
                    Debug.print("시간 값: 생략됨 (null)");
                    
                    // 승인된 토큰 전송 시도
                    let tokenTransferResult = token.icrc2_transfer_from(marketCanister, transferFromArgs);
                    
                    switch(tokenTransferResult) {
                        case (#Err(transferError)) {
                            // 토큰 전송 실패 시 오류 정보 상세 로깅
                            switch(transferError) {
                                case (#InsufficientFunds({ balance })) { 
                                    Debug.print("토큰 전송 실패: 잔액 부족 - 잔액=" # Nat.toText(balance));
                                    return #err(#InsufficientBalance) 
                                };
                                case (#InsufficientAllowance({ allowance })) { 
                                    Debug.print("토큰 전송 실패: 승인 잔액 부족 - 승인액=" # Nat.toText(allowance));
                                    return #err(#InsufficientBalance) 
                                };
                                case (#BadFee({ expected_fee })) {
                                    Debug.print("토큰 전송 실패: 잘못된 수수료 - 예상 수수료=" # Nat.toText(expected_fee));
                                    return #err(#TransferError) 
                                };
                                case (_) { 
                                    Debug.print("토큰 전송 실패: 기타 오류");
                                    return #err(#TransferError) 
                                };
                            };
                        };
                        case (#Ok(_)) {
                            Debug.print("토큰 전송 성공. NFT 전송 시작");
                            // 토큰 전송 성공 시 NFT 전송 진행
                            let nftTransferArg: ChargerHubNFT.TransferArg = {
                                token_id = tokenId;
                                from_subaccount = null;
                                to = {
                                    owner = caller;
                                    subaccount = null;
                                };
                                memo = null;
                                // 시간 처리 완전 생략 - 오버플로우 방지
                                created_at_time = null;
                            };

                            // NFT 전송 시도 (마켓 캐니스터가 소유자이므로 marketCanister로 전송)
                            let transferResult = nft.icrc7_transfer(marketCanister, [nftTransferArg]);
                            Debug.print("NFT 전송 시도 결과: " # debug_show(transferResult));
                            
                            switch(transferResult[0]) {
                                case (null) { 
                                    Debug.print("NFT 전송 실패: 결과가 null");
                                    #err(#TransferError) 
                                };
                                case (?result) {
                                    switch(result) {
                                        case (#Ok(_)) {
                                            Debug.print("NFT 전송 성공. 리스팅 삭제 중");
                                            listings.delete(tokenId);
                                            // listingsByTime에서도 제거
                                            var i = 0;
                                            label l while (i < listingsByTime.size()) {
                                                let (_, tid) = listingsByTime.get(i);
                                                if (tid == tokenId) {
                                                    let _ = listingsByTime.remove(i);
                                                    Debug.print("리스팅 삭제 완료. 구매 성공!");
                                                    break l;
                                                };
                                                i += 1;
                                            };
                                            #ok(listing)
                                        };
                                        case (#Err(nftError)) { 
                                            Debug.print("NFT 전송 실패: " # debug_show(nftError));
                                            #err(#TransferError) 
                                        };
                                    }
                                };
                            }
                        };
                    };
                };
                case null { #err(#NotListed) };
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
            listings.size()
        };

        // 페이지네이션을 지원하는 리스팅 조회 (최적화된 버전)
        public func getListings(start: ?Nat, limit: Nat) : PageResult {
            let buffer = Buffer.Buffer<Listing>(0);
            var count = 0;
            var nextStartValue: ?Nat = null;
            
            let startIndex = switch (start) {
                case (?s) { s };
                case null { listingsByTime.size() };
            };

            let endIndex = if (startIndex < limit) { 0 } else { startIndex - limit };
            
            var i = startIndex;
            while (i > endIndex and i > 0) {
                i -= 1;
                if (i < listingsByTime.size()) {
                    let (_, tokenId) = listingsByTime.get(i);
                    switch (listings.get(tokenId)) {
                        case (?listing) {
                            buffer.add(listing);
                            count += 1;
                            if (count == limit) {
                                nextStartValue := ?i;
                            };
                        };
                        case null { };
                    };
                };
            };

            {
                items = Buffer.toArray(buffer);
                total = listings.size();
                nextStart = nextStartValue;
            }
        };
    };
}; 