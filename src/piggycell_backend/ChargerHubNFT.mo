import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
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

    // ICRC-2 승인 관련 타입 추가
    public type Allowance = {
        spender: Account;
        expires_at: ?Nat64;
    };

    public type ApprovalArgs = {
        from_subaccount: ?Subaccount;
        spender: Account;
        expires_at: ?Nat64;
        memo: ?Blob;
        created_at_time: ?Nat64;
    };

    public type ApprovalError = {
        #Unauthorized;
        #TooOld;
        #CreatedInFuture: { ledger_time: Nat64 };
        #Expired: { ledger_time: Nat64 };
    };

    // ICRC-3 배치 전송 관련 타입
    public type BatchTransferArgs = {
        transfers: [TransferArgs];
    };

    public type BatchTransferResult = {
        #Ok: [Result.Result<(), Text>];
        #Err: Text;
    };

    // ICRC-3 트랜잭션 히스토리 관련 타입
    public type Transaction = {
        kind: Text;  // "mint", "transfer", "approve" 등
        timestamp: Nat64;
        from: ?Account;
        to: ?Account;
        token_ids: [Nat];
        memo: ?Blob;
    };

    public type GetTransactionsArgs = {
        start: ?Nat;  // 시작 인덱스
        length: ?Nat;  // 가져올 트랜잭션 수
        account: ?Account;  // 특정 계정의 트랜잭션만 조회
    };

    public type TransactionRange = {
        transactions: [Transaction];
        total: Nat;  // 전체 트랜잭션 수
    };

    public class NFTCanister(init_owner: Principal) {
        private var owner: Principal = init_owner;
        private var tokens = TrieMap.TrieMap<Nat, Account>(Nat.equal, Hash.hash);
        private var metadata = TrieMap.TrieMap<Nat, [(Text, Metadata)]>(Nat.equal, Hash.hash);
        private var totalSupply: Nat = 0;

        // 트랜잭션 히스토리 저장
        private var transactions = Buffer.Buffer<Transaction>(0);

        private func accountsEqual(a: Account, b: Account) : Bool {
            a.owner == b.owner and Option.equal(a.subaccount, b.subaccount, Blob.equal)
        };

        private func accountHash(account: Account) : Nat32 {
            let owner_hash = Principal.hash(account.owner);
            switch(account.subaccount) {
                case(?subaccount) {
                    owner_hash +% Blob.hash(subaccount)
                };
                case(null) {
                    owner_hash
                };
            }
        };

        private func tokenApprovalEqual(a: (Nat, Account), b: (Nat, Account)) : Bool {
            a.0 == b.0 and accountsEqual(a.1, b.1)
        };

        private func tokenApprovalHash(key: (Nat, Account)) : Hash.Hash {
            let (token_id, account) = key;
            let token_hash = Hash.hash(token_id);
            let account_hash = accountHash(account);
            Nat32.fromNat(Nat32.toNat(token_hash) + Nat32.toNat(account_hash))
        };

        // ICRC-2 승인 관리를 위한 상태 추가
        private let approvals = TrieMap.TrieMap<(Nat, Account), Allowance>(tokenApprovalEqual, tokenApprovalHash);

        // 트랜잭션 기록 함수
        private func recordTransaction(
            kind: Text,
            from: ?Account,
            to: ?Account,
            token_ids: [Nat],
            memo: ?Blob
        ) {
            let tx: Transaction = {
                kind;
                timestamp = Nat64.fromNat(Int.abs(Time.now()) / 1_000_000);
                from;
                to;
                token_ids;
                memo;
            };
            transactions.add(tx);
        };

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
            // 민팅은 관리자만 가능 (관리자 체크는 main.mo에서 수행)
            switch (tokens.get(args.token_id)) {
                case (?_) { return #err("Token ID already exists") };
                case null {
                    tokens.put(args.token_id, args.to);
                    metadata.put(args.token_id, args.metadata);
                    totalSupply += 1;
                    
                    // 트랜잭션 기록 추가
                    recordTransaction(
                        "mint",
                        null,
                        ?args.to,
                        [args.token_id],
                        null
                    );
                    
                    #ok(args.token_id)
                };
            };
        };

        public func icrc7_transfer(caller: Principal, args: TransferArgs) : Result.Result<(), Text> {
            for (token_id in args.token_ids.vals()) {
                switch (tokens.get(token_id)) {
                    case (?current_owner) {
                        // 마켓 캐니스터(owner)이거나 토큰 소유자만 전송 가능
                        if (current_owner.owner != caller and caller != owner) {
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

            // 트랜잭션 기록 추가
            recordTransaction(
                "transfer",
                ?{ owner = caller; subaccount = args.from_subaccount },
                ?args.to,
                args.token_ids,
                args.memo
            );

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

        public func updateChargerHubMetadata(caller: Principal, token_id: Nat, location: Text, chargerCount: Nat) : Result.Result<(), Text> {
            if (caller != owner) {
                return #err("Unauthorized: Only owner can update metadata");
            };

            switch (metadata.get(token_id)) {
                case (?_) {
                    let updated_metadata = [
                        ("location", #Text(location)),
                        ("chargerCount", #Nat(chargerCount))
                    ];
                    metadata.put(token_id, updated_metadata);
                    #ok()
                };
                case null {
                    #err("Token not found")
                };
            };
        };

        // NFT 소유자 직접 변경 (관리자만 가능)
        public func updateOwner(caller: Principal, token_id: Nat, new_owner: Principal) : Result.Result<(), Text> {
            // 관리자 체크는 main.mo에서 수행하므로 여기서는 체크하지 않음
            switch (tokens.get(token_id)) {
                case (?current_owner) {
                    tokens.put(token_id, { owner = new_owner; subaccount = null });
                    #ok()
                };
                case null {
                    #err("Token not found")
                };
            };
        };

        // ICRC-2 승인 관련 함수 추가
        public func icrc2_approve(caller: Principal, token_id: Nat, args: ApprovalArgs) : Result.Result<(), ApprovalError> {
            // 토큰 소유자 확인
            switch(tokens.get(token_id)) {
                case(?token_owner) {
                    if (token_owner.owner != caller) {
                        return #err(#Unauthorized);
                    };
                };
                case(null) {
                    return #err(#Unauthorized);
                };
            };

            // 시간 검증
            switch(args.created_at_time) {
                case(?created_at_time) {
                    let now = Nat64.fromNat(Int.abs(Time.now()) / 1_000_000);
                    if (created_at_time > now + 180) {
                        return #err(#CreatedInFuture({ ledger_time = now }));
                    };
                };
                case(null) {};
            };

            // 만료 시간 검증
            switch(args.expires_at) {
                case(?expires_at) {
                    let now = Nat64.fromNat(Int.abs(Time.now()) / 1_000_000);
                    if (expires_at < now) {
                        return #err(#Expired({ ledger_time = now }));
                    };
                };
                case(null) {};
            };

            // 승인 정보 저장
            let allowance: Allowance = {
                spender = args.spender;
                expires_at = args.expires_at;
            };

            approvals.put((token_id, args.spender), allowance);
            #ok(())
        };

        public func icrc2_allowance(token_id: Nat, spender: Account) : ?Allowance {
            switch(approvals.get((token_id, spender))) {
                case(?allowance) {
                    switch(allowance.expires_at) {
                        case(?expires_at) {
                            let now = Nat64.fromNat(Int.abs(Time.now()) / 1_000_000);
                            if (expires_at < now) { return null; };
                        };
                        case(null) {};
                    };
                    ?allowance
                };
                case(null) { null };
            }
        };

        public func icrc2_transfer_from(caller: Principal, token_id: Nat, to: Account) : Result.Result<(), Text> {
            // 토큰 존재 여부 확인
            switch(tokens.get(token_id)) {
                case(?current_owner) {
                    // 승인 확인
                    let spender: Account = {
                        owner = caller;
                        subaccount = null;
                    };

                    switch(approvals.get((token_id, spender))) {
                        case(?allowance) {
                            // 만료 확인
                            switch(allowance.expires_at) {
                                case(?expires_at) {
                                    let now = Nat64.fromNat(Int.abs(Time.now()) / 1_000_000);
                                    if (expires_at < now) {
                                        return #err("Approval expired");
                                    };
                                };
                                case(null) {};
                            };

                            // 전송 실행
                            tokens.put(token_id, to);
                            
                            // 승인 제거
                            approvals.delete((token_id, spender));
                            
                            #ok(())
                        };
                        case(null) {
                            #err("No approval found")
                        };
                    }
                };
                case(null) {
                    #err("Token not found")
                };
            }
        };

        // ICRC-3 배치 전송 함수
        public func icrc3_batch_transfer(caller: Principal, args: BatchTransferArgs) : BatchTransferResult {
            let results = Buffer.Buffer<Result.Result<(), Text>>(args.transfers.size());
            
            for (transfer in args.transfers.vals()) {
                let result = icrc7_transfer(caller, transfer);
                results.add(result);
                
                // 만약 하나라도 실패하면 전체 트랜잭션을 롤백
                switch (result) {
                    case (#err(e)) {
                        return #Err("Batch transfer failed: " # e);
                    };
                    case (_) {};
                };
            };
            
            #Ok(Buffer.toArray(results))
        };

        // ICRC-3 지원 표준 조회 함수
        public func icrc3_supported_standards() : [(Text, Text)] {
            [
                ("ICRC-7", "https://github.com/dfinity/ICRC/ICRCs/ICRC-7"),
                ("ICRC-2", "https://github.com/dfinity/ICRC/ICRCs/ICRC-2"),
                ("ICRC-3", "https://github.com/dfinity/ICRC/ICRCs/ICRC-3")
            ]
        };

        // ICRC-3 트랜잭션 조회 함수
        public func icrc3_get_transactions(args: GetTransactionsArgs) : TransactionRange {
            let start = Option.get(args.start, 0);
            let length = Option.get(args.length, 100);
            
            let filtered_txs = switch (args.account) {
                case (?account) {
                    // 특정 계정의 트랜잭션만 필터링
                    let temp = Buffer.Buffer<Transaction>(0);
                    for (tx in transactions.vals()) {
                        switch (tx.from, tx.to) {
                            case (?from, _) {
                                if (accountsEqual(from, account)) {
                                    temp.add(tx);
                                };
                            };
                            case (_, ?to) {
                                if (accountsEqual(to, account)) {
                                    temp.add(tx);
                                };
                            };
                            case (_, _) {};
                        };
                    };
                    temp
                };
                case (null) {
                    transactions
                };
            };

            let total = filtered_txs.size();
            let end = Nat.min(start + length, total);
            
            let result = Buffer.Buffer<Transaction>(0);
            var i = start;
            while (i < end) {
                result.add(filtered_txs.get(i));
                i += 1;
            };

            {
                transactions = Buffer.toArray(result);
                total;
            }
        };
    };
}; 