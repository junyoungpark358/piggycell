import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import TrieMap "mo:base/TrieMap";
import ChargerHubNFT "./ChargerHubNFT";
import Admin "./Admin";
import Market "./Market";
import Token "./Token";

actor Main {
    private let nft = ChargerHubNFT.NFTCanister(Principal.fromActor(Main));
    private let adminManager = Admin.AdminManager();
    private let token = Token.Token();
    private let marketManager = Market.MarketManager(token, nft, Principal.fromActor(Main));

    // ICRC-7 표준 메소드
    public query func icrc7_collection_metadata() : async [(Text, ChargerHubNFT.Metadata)] {
        nft.icrc7_collection_metadata()
    };

    public query func icrc7_supply() : async Nat {
        nft.icrc7_supply()
    };

    public query func icrc7_owner_of(token_id: Nat) : async ?ChargerHubNFT.Account {
        nft.icrc7_owner_of(token_id)
    };

    public query func icrc7_balance_of(account: ChargerHubNFT.Account) : async Nat {
        nft.icrc7_balance_of(account)
    };

    public query func icrc7_tokens_of(account: ChargerHubNFT.Account) : async [Nat] {
        nft.icrc7_tokens_of(account)
    };

    public query func icrc7_metadata(token_id: Nat) : async ?[(Text, ChargerHubNFT.Metadata)] {
        nft.icrc7_metadata(token_id)
    };

    // 관리자 관련 메소드
    public shared({ caller }) func addAdmin(newAdmin: Principal) : async Result.Result<(), Text> {
        switch(adminManager.addAdmin(caller, newAdmin)) {
            case (#ok()) { #ok(()) };
            case (#err(error)) {
                switch(error) {
                    case (#NotAuthorized) { #err("슈퍼 관리자만 새로운 관리자를 추가할 수 있습니다.") };
                    case (#AlreadyAdmin) { #err("이미 관리자로 등록된 계정입니다.") };
                    case (_) { #err("알 수 없는 오류가 발생했습니다.") };
                }
            };
        }
    };

    public shared({ caller }) func removeAdmin(adminToRemove: Principal) : async Result.Result<(), Text> {
        switch(adminManager.removeAdmin(caller, adminToRemove)) {
            case (#ok()) { #ok(()) };
            case (#err(error)) {
                switch(error) {
                    case (#NotAuthorized) { #err("슈퍼 관리자만 관리자를 제거할 수 있습니다.") };
                    case (#NotAdmin) { #err("해당 계정은 관리자가 아닙니다.") };
                    case (_) { #err("알 수 없는 오류가 발생했습니다.") };
                }
            };
        }
    };

    public shared({ caller }) func changeSuperAdmin(newSuperAdmin: Principal) : async Result.Result<(), Text> {
        switch(adminManager.changeSuperAdmin(caller, newSuperAdmin)) {
            case (#ok()) { #ok(()) };
            case (#err(error)) {
                switch(error) {
                    case (#NotAuthorized) { #err("현재 슈퍼 관리자만 새로운 슈퍼 관리자를 지정할 수 있습니다.") };
                    case (_) { #err("알 수 없는 오류가 발생했습니다.") };
                }
            };
        }
    };

    // 관리자 기능
    public shared({ caller }) func mint(args: ChargerHubNFT.MintArgs, transferType: Text, price: ?Nat) : async Result.Result<Nat, Text> {
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            return #err("관리자만 NFT를 발행할 수 있습니다.");
        };

        switch(nft.mint(caller, args)) {
            case (#ok(token_id)) {
                // NFT 마켓 등록인 경우
                if (transferType == "market") {
                    switch(price) {
                        case (?listing_price) {
                            // NFT 소유자를 마켓으로 직접 변경
                            switch(nft.updateOwner(caller, token_id, Principal.fromActor(Main))) {
                                case (#ok()) {
                                    // 마켓에 리스팅
                                    switch(marketManager.listNFT(caller, token_id, listing_price)) {
                                        case (#ok()) { #ok(token_id) };
                                        case (#err(error)) { 
                                            #err("마켓 리스팅 실패: " # debug_show(error))
                                        };
                                    };
                                };
                                case (#err(error)) {
                                    #err("NFT 소유자 변경 실패: " # error)
                                };
                            };
                        };
                        case (null) {
                            #err("마켓 등록을 위한 가격이 지정되지 않았습니다.")
                        };
                    };
                } else {
                    #ok(token_id)
                };
            };
            case (#err(error)) {
                #err(error)
            };
        }
    };

    public shared({ caller }) func updateMetadata(token_id: Nat, new_metadata: [(Text, ChargerHubNFT.Metadata)]) : async Result.Result<(), Text> {
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            return #err("관리자만 메타데이터를 수정할 수 있습니다.");
        };
        nft.updateMetadata(caller, token_id, new_metadata)
    };

    public shared({ caller }) func updateChargerHubMetadata(token_id: Nat, location: Text, chargerCount: Nat) : async Result.Result<(), Text> {
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            return #err("관리자만 충전 허브 메타데이터를 수정할 수 있습니다.");
        };
        nft.updateChargerHubMetadata(caller, token_id, location, chargerCount)
    };

    // 전송 기능
    public shared({ caller }) func icrc7_transfer(args: ChargerHubNFT.TransferArgs) : async Result.Result<(), Text> {
        nft.icrc7_transfer(caller, args)
    };

    // 마켓 관련 인터페이스
    public shared({ caller }) func listNFT(tokenId: Nat, price: Nat) : async Result.Result<(), Market.ListingError> {
        marketManager.listNFT(caller, tokenId, price)
    };

    public shared({ caller }) func delistNFT(tokenId: Nat) : async Result.Result<(), Market.ListingError> {
        marketManager.delistNFT(caller, tokenId)
    };

    public shared({ caller }) func buyNFT(tokenId: Nat) : async Result.Result<Market.Listing, Market.ListingError> {
        marketManager.buyNFT(caller, tokenId)
    };

    public query func getListing(tokenId: Nat) : async ?Market.Listing {
        marketManager.getListing(tokenId)
    };

    public query func getListings(start: ?Nat, limit: Nat) : async Market.PageResult {
        marketManager.getListings(start, limit)
    };

    public query func getListingsBySeller(seller: Principal, start: ?Nat, limit: Nat) : async Market.PageResult {
        marketManager.getListingsBySeller(seller, start, limit)
    };

    public query func isListed(tokenId: Nat) : async Bool {
        marketManager.isListed(tokenId)
    };

    public query func getTotalListings() : async Nat {
        marketManager.getTotalListings()
    };

    // PGC 토큰 관련 인터페이스
    public query func icrc1_name() : async Text {
        token.icrc1_name()
    };

    public query func icrc1_symbol() : async Text {
        token.icrc1_symbol()
    };

    public query func icrc1_decimals() : async Nat8 {
        token.icrc1_decimals()
    };

    public query func icrc1_fee() : async Nat {
        token.icrc1_fee()
    };

    public query func icrc1_total_supply() : async Nat {
        token.icrc1_total_supply()
    };

    public query func icrc1_balance_of(account : Token.Account) : async Nat {
        token.icrc1_balance_of(account)
    };

    public shared({ caller }) func icrc1_transfer(args : Token.TransferArgs) : async Result.Result<(), Token.TransferError> {
        token.icrc1_transfer(caller, args)
    };

    // 관리자용 토큰 발행/소각 기능
    public shared({ caller }) func mint_tokens(to : Token.Account, amount : Nat) : async Result.Result<(), Text> {
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            return #err("관리자만 토큰을 발행할 수 있습니다.");
        };
        token.mint(to, amount)
    };

    public shared({ caller }) func burn_tokens(from : Token.Account, amount : Nat) : async Result.Result<(), Text> {
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            return #err("관리자만 토큰을 소각할 수 있습니다.");
        };
        token.burn(from, amount)
    };
};
