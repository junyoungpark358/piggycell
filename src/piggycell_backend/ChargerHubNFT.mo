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

module {
    // 계정 관련 타입
    public type Subaccount = Blob;
    public type Account = {
        owner: Principal;
        subaccount: ?Subaccount;
    };

    // 메타데이터 관련 타입
    public type Metadata = {
        #Text: Text;
        #Nat: Nat;
        #Int: Int;
        #Blob: Blob;
    };

    // 충전기 허브 메타데이터
    public type ChargerHubMetadata = {
        location: Text;
        chargerCount: Nat;
        status: Text;
    };

    // 전송 관련 타입
    public type TransferArgs = {
        token_ids: [Nat];
        from_subaccount: ?Subaccount;
        to: Account;
        memo: ?Blob;
        created_at_time: ?Nat64;
    };

    // 민팅 관련 타입
    public type MintArgs = {
        to: Account;
        token_id: Nat;
        metadata: [(Text, Metadata)];
    };

    public class NFTCanister(init_owner: Principal) {
        private var owner: Principal = init_owner;
        private var tokens = TrieMap.TrieMap<Nat, Account>(Nat.equal, Hash.hash);
        private var metadata = TrieMap.TrieMap<Nat, [(Text, Metadata)]>(Nat.equal, Hash.hash);
        private var totalSupply: Nat = 0;

        public func getOwner() : Principal {
            owner
        };

        public func icrc7_collection_metadata() : [(Text, Metadata)] {
            [
                ("name", #Text("PiggyCell Charger Hub NFTs")),
                ("symbol", #Text("PCH")),
                ("description", #Text("Tokenized charging infrastructure NFTs")),
                ("logo", #Text("YOUR_LOGO_URL"))
            ]
        };

        public func icrc7_supply() : Nat {
            totalSupply
        };

        public func icrc7_owner_of(token_id: Nat) : ?Account {
            tokens.get(token_id)
        };

        public func icrc7_balance_of(account: Account) : Nat {
            var balance: Nat = 0;
            for ((_, owner) in tokens.entries()) {
                if (account.owner == owner.owner) {
                    balance += 1;
                };
            };
            balance
        };

        public func icrc7_tokens_of(account: Account) : [Nat] {
            let buffer = Buffer.Buffer<Nat>(0);
            for ((token_id, owner) in tokens.entries()) {
                if (account.owner == owner.owner) {
                    buffer.add(token_id);
                };
            };
            Buffer.toArray(buffer)
        };

        public func icrc7_metadata(token_id: Nat) : ?[(Text, Metadata)] {
            metadata.get(token_id)
        };

        public func mint(caller: Principal, args: MintArgs) : Result.Result<Nat, Text> {
            if (caller != owner) {
                return #err("Unauthorized: Only owner can mint");
            };

            switch (tokens.get(args.token_id)) {
                case (?_) { return #err("Token ID already exists") };
                case null {
                    tokens.put(args.token_id, args.to);
                    metadata.put(args.token_id, args.metadata);
                    totalSupply += 1;
                    #ok(args.token_id)
                };
            };
        };

        public func icrc7_transfer(caller: Principal, args: TransferArgs) : Result.Result<(), Text> {
            for (token_id in args.token_ids.vals()) {
                switch (tokens.get(token_id)) {
                    case (?current_owner) {
                        if (current_owner.owner != caller) {
                            return #err("Unauthorized: Not token owner");
                        };
                    };
                    case null {
                        return #err("Token not found");
                    };
                };
            };

            for (token_id in args.token_ids.vals()) {
                tokens.put(token_id, args.to);
            };

            #ok()
        };

        public func updateMetadata(caller: Principal, token_id: Nat, new_metadata: [(Text, Metadata)]) : Result.Result<(), Text> {
            if (caller != owner) {
                return #err("Unauthorized: Only owner can update metadata");
            };

            switch (tokens.get(token_id)) {
                case (?_) {
                    metadata.put(token_id, new_metadata);
                    #ok()
                };
                case null {
                    #err("Token not found")
                };
            };
        };

        public func updateChargerHubStatus(caller: Principal, token_id: Nat, status: Text) : Result.Result<(), Text> {
            if (caller != owner) {
                return #err("Unauthorized: Only owner can update status");
            };

            switch (metadata.get(token_id)) {
                case (?current_metadata) {
                    let updated_metadata = Array.map<(Text, Metadata), (Text, Metadata)>(
                        current_metadata,
                        func((key, value)) : (Text, Metadata) {
                            if (key == "status") {
                                return (key, #Text(status));
                            };
                            (key, value)
                        }
                    );
                    metadata.put(token_id, updated_metadata);
                    #ok()
                };
                case null {
                    #err("Token not found")
                };
            };
        };
    };
}; 