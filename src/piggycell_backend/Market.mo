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
        public func buyNFT(caller: Principal, tokenId: Nat) : Result.Result<Listing, ListingError> {
            switch (listings.get(tokenId)) {
                case (?listing) {
                    // 1. 구매자의 PGC 잔액 확인
                    let buyerAccount: PiggyCellToken.Account = {
                        owner = caller;
                        subaccount = null;
                    };
                    let balance = token.icrc1_balance_of(buyerAccount);
                    
                    // 잔액이 부족한 경우 오류 반환
                    if (balance < listing.price) {
                        return #err(#InsufficientBalance);
                    };
                    
                    // 2. 판매자 계정 생성
                    let sellerAccount: PiggyCellToken.Account = {
                        owner = listing.seller;
                        subaccount = null;
                    };
                    
                    // 3. 토큰 전송 (구매자 -> 판매자)
                    let transferArgs: PiggyCellToken.TransferArgs = {
                        from_subaccount = null;
                        to = sellerAccount;
                        amount = listing.price;
                        fee = ?token.icrc1_fee();
                        memo = null;
                        created_at_time = ?Nat64.fromNat(Int.abs(Time.now()) / 1_000_000);
                    };
                    
                    // PGC 토큰 전송 시도
                    let tokenTransferResult = token.icrc1_transfer(caller, transferArgs);
                    
                    switch(tokenTransferResult) {
                        case (#err(transferError)) {
                            // 토큰 전송 실패 시 오류 반환
                            switch(transferError) {
                                case (#InsufficientFunds(_)) { return #err(#InsufficientBalance) };
                                case (_) { return #err(#TransferError) };
                            };
                        };
                        case (#ok(_)) {
                            // 토큰 전송 성공 시 NFT 전송 진행
                            let nftTransferArg: ChargerHubNFT.TransferArg = {
                                token_id = tokenId;
                                from_subaccount = null;
                                to = {
                                    owner = caller;
                                    subaccount = null;
                                };
                                memo = null;
                                created_at_time = ?Nat64.fromNat(Int.abs(Time.now()) / 1_000_000);
                            };

                            // NFT 전송 시도 (마켓 캐니스터가 소유자이므로 marketCanister로 전송)
                            let transferResult = nft.icrc7_transfer(marketCanister, [nftTransferArg]);
                            switch(transferResult[0]) {
                                case (null) { #err(#TransferError) };
                                case (?result) {
                                    switch(result) {
                                        case (#Ok(_)) {
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
                                            #ok(listing)
                                        };
                                        case (#Err(_)) { #err(#TransferError) };
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