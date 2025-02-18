import Principal "mo:base/Principal";
import Result "mo:base/Result";
import TrieMap "mo:base/TrieMap";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Buffer "mo:base/Buffer";
import Hash "mo:base/Hash";
import Token "./Token";

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

    public class MarketManager(token: Token.Token) {
        private let listings = TrieMap.TrieMap<Nat, Listing>(Nat.equal, Hash.hash);
        private var lastTokenId: Nat = 0; // 마지막으로 리스팅된 토큰 ID 추적
        
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
                    #ok(())
                };
                case null { #err(#NotListed) };
            }
        };

        // NFT 구매
        public func buyNFT(caller: Principal, tokenId: Nat) : Result.Result<Listing, ListingError> {
            switch (listings.get(tokenId)) {
                case (?listing) {
                    // 구매자의 PGC 토큰 잔액 확인
                    let buyer: Token.Account = {
                        owner = caller;
                        subaccount = null;
                    };
                    let seller: Token.Account = {
                        owner = listing.seller;
                        subaccount = null;
                    };

                    // 토큰 전송
                    let transferArgs: Token.TransferArgs = {
                        from_subaccount = null;
                        to = seller;
                        amount = listing.price;
                        fee = ?token.icrc1_fee();
                        memo = null;
                        created_at_time = null;
                    };

                    switch(token.icrc1_transfer(caller, transferArgs)) {
                        case (#ok()) {
                            listings.delete(tokenId);
                            #ok(listing)
                        };
                        case (#err(_)) {
                            #err(#TransferError)
                        };
                    }
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

        // 페이지네이션을 지원하는 리스팅 조회
        public func getListings(start: ?Nat, limit: Nat) : PageResult {
            let buffer = Buffer.Buffer<Listing>(0);
            var count = 0;
            var nextStartValue: ?Nat = null;
            
            // start가 없으면 가장 최근 리스팅부터 시작
            let startValue = switch (start) {
                case (?s) { s };
                case null { lastTokenId + 1 };
            };

            // tokenId를 역순으로 순회하면서 limit 만큼만 수집
            var currentId = startValue;
            while (currentId > 0 and count < limit) {
                currentId -= 1;
                switch (listings.get(currentId)) {
                    case (?listing) {
                        buffer.add(listing);
                        count += 1;
                        if (count == limit) {
                            // 다음 페이지 시작점 설정
                            nextStartValue := ?currentId;
                        };
                    };
                    case null { };
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