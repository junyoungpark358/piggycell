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
    public type Value = {
        #Blob : Blob;
        #Text : Text;
        #Nat : Nat;
        #Int : Int;
        #Nat64 : Nat64;
        #Array : [Value];
        #Map : [(Text, Value)];
    };

    // 충전기 허브 메타데이터
    public type ChargerHubMetadata = {
        location: Text;
        chargerCount: Nat;
    };

    // 전송 관련 타입
    public type TransferArg = {
        from_subaccount: ?Subaccount;
        to : Account;
        token_id : Nat;
        memo : ?Blob;
        created_at_time : ?Nat64;
    };

    public type BatchTransferArgs = {
        transfers: [TransferArg];
    };

    public type BatchTransferResult = {
        #Ok: [?TransferResult];
        #Err: Text;
    };

    // 민팅 관련 타입
    public type MintArgs = {
        to: Account;
        token_id: Nat;
        metadata: [(Text, Value)];
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

    // ICRC-3 트랜잭션 히스토리 관련 타입
    public type Block = {
        btype: Text;  // "7mint", "7burn", "7xfer", "7update_token"
        ts: Nat64;    // 블록 생성 시간
        tx: {
            tid: Nat;  // 토큰 ID
            from: ?Account;
            to: ?Account;
            memo: ?Blob;
            ts: ?Nat64;  // 사용자가 지정한 생성 시간
            meta: ?Value;  // 토큰 메타데이터 (mint, update_token에서 사용)
        };
    };

    public type Transaction = {
        block: Block;
        index: Nat;  // 트랜잭션 인덱스
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

    public type TransferError = {
        #NonExistingTokenId;
        #InvalidRecipient;
        #Unauthorized;
        #TooOld;
        #CreatedInFuture : { ledger_time: Nat64 };
        #Duplicate : { duplicate_of : Nat };
        #GenericError : { error_code : Nat; message : Text };
        #GenericBatchError : { error_code : Nat; message : Text };
    };

    public type TransferResult = {
        #Ok : Nat;
        #Err : TransferError;
    };

    public class NFTCanister(init_owner: Principal) {
        private var owner: Principal = init_owner;
        private var tokens = TrieMap.TrieMap<Nat, Account>(Nat.equal, Hash.hash);
        private var metadata = TrieMap.TrieMap<Nat, [(Text, Value)]>(Nat.equal, Hash.hash);
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
            btype: Text,
            token_id: Nat,
            from: ?Account,
            to: ?Account,
            memo: ?Blob,
            created_at_time: ?Nat64,
            meta: ?Value
        ) {
            let block: Block = {
                btype;
                ts = Nat64.fromNat(Int.abs(Time.now()) / 1_000_000);
                tx = {
                    tid = token_id;
                    from;
                    to;
                    memo;
                    ts = created_at_time;
                    meta;
                };
            };

            transactions.add({
                block;
                index = transactions.size();
            });
        };

        public func getOwner() : Principal {
            owner
        };

        // ICRC-7 표준 메소드
        public func icrc7_collection_metadata() : [(Text, Value)] {
            [
                ("icrc7:name", #Text("PiggyCell Charger Hub NFTs")),
                ("icrc7:symbol", #Text("PCH")),
                ("icrc7:description", #Text("Tokenized charging infrastructure NFTs for the PiggyCell ecosystem")),
                ("icrc7:logo", #Text("https://piggycell.com/logo.png")),
                ("icrc7:total_supply", #Nat(totalSupply)),
                ("icrc7:supply_cap", #Nat(10000)),
                ("icrc7:max_query_batch_size", #Nat(1000)),
                ("icrc7:max_update_batch_size", #Nat(100)),
                ("icrc7:default_take_value", #Nat(100)),
                ("icrc7:max_take_value", #Nat(1000)),
                ("icrc7:max_memo_size", #Nat(32)),
                ("icrc7:atomic_batch_transfers", #Text("true")),
                ("icrc7:tx_window", #Nat(86400)),
                ("icrc7:permitted_drift", #Nat(120)),
                // 추가 메타데이터
                ("piggycell:version", #Text("1.0.0")),
                ("piggycell:network", #Text("ICP")),
                ("piggycell:contract_type", #Text("ChargerHub")),
                ("piggycell:features", #Array([
                    #Text("Staking"),
                    #Text("Trading"),
                    #Text("Metadata Update")
                ])),
                ("piggycell:supported_charger_types", #Array([
                    #Map([
                        ("type", #Text("AC")),
                        ("power", #Text("7kW")),
                        ("connector", #Text("Type 2"))
                    ]),
                    #Map([
                        ("type", #Text("DC")),
                        ("power", #Text("50kW")),
                        ("connector", #Text("CCS"))
                    ])
                ]))
            ]
        };

        public func icrc7_symbol() : Text {
            "PCH"
        };

        public func icrc7_name() : Text {
            "PiggyCell Charger Hub NFTs"
        };

        public func icrc7_description() : Text {
            "Tokenized charging infrastructure NFTs for the PiggyCell ecosystem"
        };

        public func icrc7_logo() : Text {
            "https://piggycell.com/logo.png" // 실제 로고 URL로 변경 필요
        };

        public func icrc7_total_supply() : Nat {
            totalSupply
        };

        public func icrc7_supply_cap() : ?Nat {
            ?10000 // 예시 값, 실제 제한값으로 수정 필요
        };

        public func icrc7_max_query_batch_size() : ?Nat {
            ?1000 // 최대 쿼리 배치 크기
        };

        public func icrc7_max_update_batch_size() : ?Nat {
            ?100 // 최대 업데이트 배치 크기
        };

        public func icrc7_default_take_value() : ?Nat {
            ?100 // 기본 페이지 크기
        };

        public func icrc7_max_take_value() : ?Nat {
            ?1000 // 최대 페이지 크기
        };

        public func icrc7_max_memo_size() : ?Nat {
            ?32 // 최대 메모 크기 (바이트)
        };

        public func icrc7_atomic_batch_transfers() : ?Bool {
            ?true // 원자적 배치 전송 지원 여부
        };

        public func icrc7_tx_window() : ?Nat {
            ?86400 // 24시간을 초 단위로 표현
        };

        public func icrc7_permitted_drift() : ?Nat {
            ?120 // 2분을 초 단위로 표현
        };

        public func icrc7_token_metadata(token_ids: [Nat]) : [?[(Text, Value)]] {
            Array.map<Nat, ?[(Text, Value)]>(
                token_ids,
                func(token_id: Nat) : ?[(Text, Value)] {
                    metadata.get(token_id)
                }
            )
        };

        public func icrc7_owner_of(token_ids: [Nat]) : [?Account] {
            Array.map<Nat, ?Account>(
                token_ids,
                func(token_id: Nat) : ?Account {
                    tokens.get(token_id)
                }
            )
        };

        public func icrc7_balance_of(accounts: [Account]) : [Nat] {
            Array.map<Account, Nat>(
                accounts,
                func(account: Account) : Nat {
                    var balance: Nat = 0;
                    for ((_, owner) in tokens.entries()) {
                        if (accountsEqual(account, owner)) {
                            balance += 1;
                        };
                    };
                    balance
                }
            )
        };

        public func icrc7_tokens(prev: ?Nat, take: ?Nat) : [Nat] {
            let defaultTake = 100; // 기본 페이지 크기
            let maxTake = 1000; // 최대 페이지 크기
            
            let actualTake = Option.get(take, defaultTake);
            let limit = Nat.min(actualTake, maxTake);
            
            let tokenIds = Buffer.Buffer<Nat>(0);
            for ((id, _) in tokens.entries()) {
                switch(prev) {
                    case(?prevId) {
                        if (id > prevId) {
                            tokenIds.add(id);
                        };
                    };
                    case(null) {
                        tokenIds.add(id);
                    };
                };
            };
            
            let sortedIds = Array.sort(Buffer.toArray(tokenIds), Nat.compare);
            if (sortedIds.size() <= limit) {
                return sortedIds;
            };
            Array.tabulate<Nat>(limit, func(i) = sortedIds[i])
        };

        public func icrc7_tokens_of(account: Account, prev: ?Nat, take: ?Nat) : [Nat] {
            let defaultTake = 100; // 기본 페이지 크기
            let maxTake = 1000; // 최대 페이지 크기
            
            let actualTake = Option.get(take, defaultTake);
            let limit = Nat.min(actualTake, maxTake);
            
            let tokenIds = Buffer.Buffer<Nat>(0);
            for ((id, owner) in tokens.entries()) {
                if (accountsEqual(account, owner)) {
                    switch(prev) {
                        case(?prevId) {
                            if (id > prevId) {
                                tokenIds.add(id);
                            };
                        };
                        case(null) {
                            tokenIds.add(id);
                        };
                    };
                };
            };
            
            let sortedIds = Array.sort(Buffer.toArray(tokenIds), Nat.compare);
            if (sortedIds.size() <= limit) {
                return sortedIds;
            };
            Array.tabulate<Nat>(limit, func(i) = sortedIds[i])
        };

        public func icrc7_transfer(caller: Principal, args: [TransferArg]) : [?TransferResult] {
            let results = Buffer.Buffer<?TransferResult>(args.size());
            var txIndex = transactions.size();

            // 배치 크기 제한 체크
            let max_batch_size = Option.get(icrc7_max_update_batch_size(), 100);
            if (args.size() > max_batch_size) {
                return [?#Err(#GenericBatchError({
                    error_code = 1;
                    message = "Batch size exceeds maximum allowed size of " # Nat.toText(max_batch_size);
                }))];
            };

            // 메모 크기 체크
            let max_memo_size = Option.get(icrc7_max_memo_size(), 32);
            for (arg in args.vals()) {
                switch(arg.memo) {
                    case(?memo) {
                        if (memo.size() > max_memo_size) {
                            return [?#Err(#GenericError({
                                error_code = 2;
                                message = "Memo size exceeds maximum allowed size of " # Nat.toText(max_memo_size) # " bytes";
                            }))];
                        };
                    };
                    case(null) {};
                };
            };

            // 중복 트랜잭션 체크를 위한 맵
            let seen_transactions = TrieMap.TrieMap<Text, Nat>(Text.equal, Text.hash);

            for (arg in args.vals()) {
                switch (tokens.get(arg.token_id)) {
                    case (?current_owner) {
                        var error : ?TransferError = null;
                        
                        // 중복 트랜잭션 체크
                        switch(arg.created_at_time, arg.memo) {
                            case(?created_at_time, ?memo) {
                                let tx_key = Text.concat(
                                    Nat.toText(arg.token_id),
                                    Principal.toText(caller)
                                );
                                switch(seen_transactions.get(tx_key)) {
                                    case(?prev_index) {
                                        error := ?#Duplicate({ duplicate_of = prev_index });
                                    };
                                    case(null) {
                                        let now = Nat64.fromNat(Int.abs(Time.now()) / 1_000_000);
                                        if (created_at_time < now - 86400 - 120) { // TX_WINDOW(24h) + PERMITTED_DRIFT(2m)
                                            error := ?#TooOld;
                                        } else if (created_at_time > now + 120) { // PERMITTED_DRIFT
                                            error := ?#CreatedInFuture({ ledger_time = now });
                                        } else {
                                            seen_transactions.put(tx_key, txIndex);
                                        };
                                    };
                                };
                            };
                            case(_, _) {};
                        };

                        // 자기 자신에게 전송하는 경우 체크
                        if (Option.isNull(error) and accountsEqual(current_owner, arg.to)) {
                            error := ?#InvalidRecipient;
                        };

                        // 권한 체크
                        if (Option.isNull(error) and current_owner.owner != caller and caller != owner) {
                            error := ?#Unauthorized;
                        };

                        switch(error) {
                            case(?err) {
                                results.add(?#Err(err));
                            };
                            case(null) {
                                // 전송 실행
                                tokens.put(arg.token_id, arg.to);
                                
                                // 트랜잭션 기록
                                recordTransaction(
                                    "7xfer",
                                    arg.token_id,
                                    ?{ owner = caller; subaccount = arg.from_subaccount },
                                    ?arg.to,
                                    arg.memo,
                                    arg.created_at_time,
                                    null
                                );

                                // 승인 정보 제거
                                let spender_account = { owner = caller; subaccount = null };
                                approvals.delete((arg.token_id, spender_account));

                                results.add(?#Ok(txIndex));
                                txIndex += 1;
                            };
                        };
                    };
                    case null {
                        results.add(?#Err(#NonExistingTokenId));
                    };
                };
            };

            Buffer.toArray(results)
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
                        "7mint",
                        args.token_id,
                        null,
                        ?args.to,
                        null,
                        null,
                        ?#Map(args.metadata)
                    );
                    
                    #ok(args.token_id)
                };
            };
        };

        public func updateMetadata(caller: Principal, token_id: Nat, new_metadata: [(Text, Value)]) : Result.Result<(), Text> {
            if (caller != owner) {
                return #err("Unauthorized: Only owner can update metadata");
            };

            switch (tokens.get(token_id)) {
                case (?_) {
                    metadata.put(token_id, new_metadata);
                    
                    // 메타데이터 업데이트 트랜잭션 기록
                    recordTransaction(
                        "7update_token",
                        token_id,
                        ?{ owner = caller; subaccount = null },
                        null,
                        null,
                        null,
                        ?#Map(new_metadata)
                    );
                    
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
                        ("icrc7:token_id", #Nat(token_id)),
                        ("piggycell:location", #Text(location)),
                        ("piggycell:charger_count", #Nat(chargerCount)),
                        ("piggycell:last_updated", #Nat64(Nat64.fromNat(Int.abs(Time.now()) / 1_000_000))),
                        ("piggycell:status", #Text("active")),
                        ("piggycell:location_details", #Map([
                            ("latitude", #Text("37.5665")), // 예시 값
                            ("longitude", #Text("126.9780")), // 예시 값
                            ("address", #Text("서울특별시")), // 예시 값
                            ("area_type", #Text("public"))
                        ])),
                        ("piggycell:charger_details", #Array(Array.map<Nat, Value>(
                            Array.tabulate<Nat>(chargerCount, func(i) = i),
                            func(i: Nat) : Value {
                                #Map([
                                    ("id", #Nat(i + 1)),
                                    ("type", #Text("AC")),
                                    ("status", #Text("available")),
                                    ("power", #Text("7kW"))
                                ])
                            }
                        )))
                    ];
                    metadata.put(token_id, updated_metadata);
                    
                    // 메타데이터 업데이트 트랜잭션 기록
                    recordTransaction(
                        "7update_token",
                        token_id,
                        ?{ owner = caller; subaccount = null },
                        null,
                        null,
                        null,
                        ?#Map(updated_metadata)
                    );
                    
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
            let result = icrc7_transfer(caller, args.transfers);
            #Ok(result)
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
                        switch (tx.block.tx.from, tx.block.tx.to) {
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

        // ICRC-10 지원 표준 조회 함수
        public func icrc10_supported_standards() : [(Text, Text)] {
            [
                ("ICRC-7", "https://github.com/dfinity/ICRC/ICRCs/ICRC-7"),
                ("ICRC-2", "https://github.com/dfinity/ICRC/ICRCs/ICRC-2"),
                ("ICRC-3", "https://github.com/dfinity/ICRC/ICRCs/ICRC-3"),
                ("ICRC-10", "https://github.com/dfinity/ICRC/ICRCs/ICRC-10")
            ]
        };
    };
}; 