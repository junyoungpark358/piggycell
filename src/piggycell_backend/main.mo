import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import TrieMap "mo:base/TrieMap";
import ChargerNFT "./ChargerNFT";
import Admin "./Admin";

actor Main {
    private let nft = ChargerNFT.NFTCanister(Principal.fromText("2vxsx-fae"));  // dfx identity get-principal 으로 얻은 값으로 변경 필요
    private let adminManager = Admin.AdminManager();

    // ICRC-7 표준 메소드
    public query func icrc7_collection_metadata() : async [(Text, ChargerNFT.Metadata)] {
        nft.icrc7_collection_metadata()
    };

    public query func icrc7_supply() : async Nat {
        nft.icrc7_supply()
    };

    public query func icrc7_owner_of(token_id: Nat) : async ?ChargerNFT.Account {
        nft.icrc7_owner_of(token_id)
    };

    public query func icrc7_balance_of(account: ChargerNFT.Account) : async Nat {
        nft.icrc7_balance_of(account)
    };

    public query func icrc7_tokens_of(account: ChargerNFT.Account) : async [Nat] {
        nft.icrc7_tokens_of(account)
    };

    public query func icrc7_metadata(token_id: Nat) : async ?[(Text, ChargerNFT.Metadata)] {
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
    public shared({ caller }) func mint(args: ChargerNFT.MintArgs) : async Result.Result<Nat, Text> {
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            return #err("관리자만 NFT를 발행할 수 있습니다.");
        };
        nft.mint(caller, args)
    };

    public shared({ caller }) func updateMetadata(token_id: Nat, new_metadata: [(Text, ChargerNFT.Metadata)]) : async Result.Result<(), Text> {
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            return #err("관리자만 메타데이터를 수정할 수 있습니다.");
        };
        nft.updateMetadata(caller, token_id, new_metadata)
    };

    public shared({ caller }) func updateChargerHubStatus(token_id: Nat, status: Text) : async Result.Result<(), Text> {
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            return #err("관리자만 충전기 상태를 수정할 수 있습니다.");
        };
        nft.updateChargerHubStatus(caller, token_id, status)
    };

    // 전송 기능
    public shared({ caller }) func icrc7_transfer(args: ChargerNFT.TransferArgs) : async Result.Result<(), Text> {
        nft.icrc7_transfer(caller, args)
    };
};
