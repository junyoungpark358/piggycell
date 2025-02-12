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

actor Main {
    private let nft = ChargerNFT.NFTCanister(Principal.fromText("2vxsx-fae"));  // dfx identity get-principal 으로 얻은 값으로 변경 필요

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

    // 관리자 기능
    public shared({ caller }) func mint(args: ChargerNFT.MintArgs) : async Result.Result<Nat, Text> {
        nft.mint(caller, args)
    };

    public shared({ caller }) func updateMetadata(token_id: Nat, new_metadata: [(Text, ChargerNFT.Metadata)]) : async Result.Result<(), Text> {
        nft.updateMetadata(caller, token_id, new_metadata)
    };

    public shared({ caller }) func updateChargerHubStatus(token_id: Nat, status: Text) : async Result.Result<(), Text> {
        nft.updateChargerHubStatus(caller, token_id, status)
    };

    // 전송 기능
    public shared({ caller }) func icrc7_transfer(args: ChargerNFT.TransferArgs) : async Result.Result<(), Text> {
        nft.icrc7_transfer(caller, args)
    };
};
