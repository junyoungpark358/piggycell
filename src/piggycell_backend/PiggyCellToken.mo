import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import TrieMap "mo:base/TrieMap";
import List "mo:base/List";
import Debug "mo:base/Debug";
import IC "mo:base/ExperimentalInternetComputer";
import Error "mo:base/Error";

module {
    //-----------------------------------------------------------------------------
    // 공통 타입 정의
    //-----------------------------------------------------------------------------
    
    // 계정 관련 타입
    public type Subaccount = Blob;
    
    public type Account = {
        owner : Principal;
        subaccount : ?Subaccount;
    };
    
    // 값 타입 (ICRC-1 표준)
    public type Value = {
        #Nat : Nat;
        #Int : Int;
        #Text : Text;
        #Blob : Blob;
    };
    
    //-----------------------------------------------------------------------------
    // ICRC-3 관련 타입 정의
    //-----------------------------------------------------------------------------
    
    // ICRC-3 Value 타입
    public type ICRC3Value = {
        #Blob : Blob;
        #Text : Text;
        #Nat : Nat;
        #Int : Int;
        #Array : [ICRC3Value];
        #Map : [(Text, ICRC3Value)];
    };
    
    // 블록 타입
    public type Block = {
        phash : ?Blob;     // 부모 블록 해시
        btype : Text;      // 블록 타입 (1mint, 1xfer, 2approve, 3revDist 등)
        ts : Nat;          // 타임스탬프
        tx : ICRC3Value;   // 트랜잭션 정보
        fee : ?Nat;        // 수수료 (선택적)
    };
    
    // GetBlocksArgs 타입
    public type GetBlocksArgs = [{start : Nat; length : Nat}];
    
    // GetBlocksResult 타입
    public type GetBlocksResult = {
        log_length : Nat;
        blocks : [{id : Nat; block: ICRC3Value}];
        archived_blocks : [{
            args : GetBlocksArgs;
            callback : shared query (GetBlocksArgs) -> async GetBlocksResult;
        }];
    };
    
    // 데이터 인증서 타입
    public type DataCertificate = {
        certificate : Blob;    // 인증서 서명
        hash_tree : Blob;      // CBOR 인코딩된 해시 트리
    };
    
    // 지원하는 블록 타입
    public type SupportedBlockType = {
        block_type : Text;
        url : Text;
    };
    
    //-----------------------------------------------------------------------------
    // ICRC-1 관련 타입 정의
    //-----------------------------------------------------------------------------
    
    public type TransferArgs = {
        from_subaccount : ?Subaccount;
        to : Account;
        amount : Nat;
        fee : ?Nat;
        memo : ?Blob;
        created_at_time : ?Nat64;
    };
    
    public type TransferError = {
        #BadFee : { expected_fee : Nat };
        #BadBurn : { min_burn_amount : Nat };
        #InsufficientFunds : { balance : Nat };
        #TooOld;
        #CreatedInFuture : { ledger_time : Nat64 };
        #Duplicate : { duplicate_of : Nat };
        #TemporarilyUnavailable;
        #GenericError : { error_code : Nat; message : Text };
    };
    
    //-----------------------------------------------------------------------------
    // ICRC-2 관련 타입 정의
    //-----------------------------------------------------------------------------
    
    public type TransferFromArgs = {
        spender_subaccount : ?Subaccount;
        from : Account;
        to : Account;
        amount : Nat;
        fee : ?Nat;
        memo : ?Blob;
        created_at_time : ?Nat64;
    };
    
    public type TransferFromError = {
        #BadFee : { expected_fee : Nat };
        #BadBurn : { min_burn_amount : Nat };
        #InsufficientFunds : { balance : Nat };
        #InsufficientAllowance : { allowance : Nat };
        #TooOld;
        #CreatedInFuture : { ledger_time : Nat64 };
        #Duplicate : { duplicate_of : Nat };
        #TemporarilyUnavailable;
        #GenericError : { error_code : Nat; message : Text };
    };
    
    public type ApproveArgs = {
        from_subaccount : ?Subaccount;
        spender : Account;
        amount : Nat;
        expected_allowance : ?Nat;
        expires_at : ?Nat64;
        fee : ?Nat;
        memo : ?Blob;
        created_at_time : ?Nat64;
    };
    
    public type ApproveError = {
        #BadFee : { expected_fee : Nat };
        #InsufficientFunds : { balance : Nat };
        #AllowanceChanged : { current_allowance : Nat };
        #Expired : { ledger_time : Nat64 };
        #TooOld;
        #CreatedInFuture : { ledger_time : Nat64 };
        #Duplicate : { duplicate_of : Nat };
        #TemporarilyUnavailable;
        #GenericError : { error_code : Nat; message : Text };
    };
    
    public type AllowanceArgs = {
        account : Account;
        spender : Account;
    };
    
    public type AllowanceResponse = {
        allowance : Nat;
        expires_at : ?Nat64;
    };
    
    public type Allowance = {
        allowance : Nat;
        expires_at : ?Nat64;
    };
    
    // 단순화된 승인 정보 저장을 위한 타입
    private type SimpleAllowance = {
        from : Principal;
        spender : Principal;
        amount : Nat;
    };
    
    //-----------------------------------------------------------------------------
    // 거래 및 기타 타입 정의
    //-----------------------------------------------------------------------------
    
    public type Transaction = {
        id : Nat;
        from : Account;
        to : Account;
        amount : Nat;
        fee : Nat;
        timestamp : Time.Time;
        memo : ?Blob;
    };
    
    public type TransactionRecord = {
        from : Account;
        to : Account;
        amount : Nat;
        timestamp : Int;
        memo : ?Blob;
    };
    
    //-----------------------------------------------------------------------------
    // 토큰 구현
    //-----------------------------------------------------------------------------
    
    public class PiggyCellToken() {
        //-----------------------------------------------------------------------------
        // 변수 및 초기화
        //-----------------------------------------------------------------------------
        
        // 토큰 기본 정보
        private let decimals : Nat8 = 8;
        private let symbol : Text = "PGC";
        private let name : Text = "PiggyCell Token";
        private let fee : Nat = 0;
        private var totalSupply : Nat = 0;
        
        // 민팅 계정 정의
        private let minting_account : Account = {
            owner = Principal.fromText("aaaaa-aa");
            subaccount = null;
        };
        
        // 계정 관련 유틸리티 함수
        private func accountsEqual(a : Account, b : Account) : Bool {
            Principal.equal(a.owner, b.owner) and
            Option.equal(a.subaccount, b.subaccount, Blob.equal)
        };
        
        private func accountHash(account : Account) : Nat32 {
            let hash = Principal.hash(account.owner);
            switch (account.subaccount) {
                case (?_subaccount) {
                    hash
                };
                case null {
                    hash
                };
            }
        };
        
        // 승인 관련 유틸리티 함수
        private func allowancesEqual(a : (Account, Account), b : (Account, Account)) : Bool {
            accountsEqual(a.0, b.0) and accountsEqual(a.1, b.1)
        };
        
        private func allowancesHash(allowance : (Account, Account)) : Nat32 {
            let (owner, spender) = allowance;
            let ownerHash = accountHash(owner);
            let _spenderHash = accountHash(spender);
            ownerHash
        };
        
        // 데이터 저장소
        private let ledger = TrieMap.TrieMap<Account, Nat>(accountsEqual, accountHash);
        private let _allowances = TrieMap.TrieMap<(Account, Account), Allowance>(allowancesEqual, allowancesHash);
        private var simpleAllowances = Buffer.Buffer<SimpleAllowance>(0);
        
        // 거래 이력을 위한 변수들
        private var nextTxId : Nat = 0;
        private var transactions = Buffer.Buffer<Transaction>(0);
        private var transactionCount : Nat = 0;
        
        // ICRC-3 블록 관련 변수
        private var blocks = Buffer.Buffer<Block>(100);       // 블록 저장소
        private var nextBlockId : Nat = 0;                   // 다음 블록 ID
        private let maxBlocksToStore : Nat = 50000;           // 최대 저장할 블록 수 (메모리 관리용)
        private var lastBlockHash : ?Blob = null;            // 마지막 블록 해시
        
        // 지원하는 블록 타입 목록
        private let supportedBlockTypes : [SupportedBlockType] = [
            { block_type = "1mint"; url = "https://github.com/dfinity/ICRC/ICRCs/ICRC-1" },
            { block_type = "1burn"; url = "https://github.com/dfinity/ICRC/ICRCs/ICRC-1" },
            { block_type = "1xfer"; url = "https://github.com/dfinity/ICRC/ICRCs/ICRC-1" }, 
            { block_type = "2approve"; url = "https://github.com/dfinity/ICRC/ICRCs/ICRC-2" },
            { block_type = "2xfer"; url = "https://github.com/dfinity/ICRC/ICRCs/ICRC-2" },
            { block_type = "3revDist"; url = "https://github.com/your-org/piggycell/docs/revenue-distribution" }
        ];
        
        //-----------------------------------------------------------------------------
        // ICRC-3 유틸리티 함수
        //-----------------------------------------------------------------------------
        
        // 블록 해시 계산 함수 (실제 구현에서는 표준 준수 필요)
        private func hashBlock(block : Block) : Blob {
            // 임시 구현: 실제로는 ICRC-3 표준에 따른 해시 함수 구현 필요
            // 이 함수는 블록을 직렬화하고 적절한 해시 알고리즘(예: SHA-256)을 적용해야 함
            let textRepresentation = blockToText(block);
            
            // 단순한 해시 함수 구현 (실제 프로덕션에서는 보안 해시 알고리즘 사용 필요)
            let hashValue = Text.hash(textRepresentation);
            
            Blob.fromArray([
                Nat8.fromNat(Nat32.toNat(hashValue / 16777216) % 256),
                Nat8.fromNat(Nat32.toNat(hashValue / 65536) % 256),
                Nat8.fromNat(Nat32.toNat(hashValue / 256) % 256),
                Nat8.fromNat(Nat32.toNat(hashValue) % 256)
            ])
        };
        
        // 블록을 텍스트로 변환 (해싱용)
        private func blockToText(block : Block) : Text {
            var result = "Block{";
            result #= "btype=" # block.btype # ";";
            result #= "ts=" # Nat.toText(block.ts) # ";";
            
            // phash 필드 처리
            switch (block.phash) {
                case (?hash) {
                    result #= "phash=" # debug_show(hash) # ";";
                };
                case (null) {
                    result #= "phash=null;";
                };
            };
            
            // tx 필드 처리 (간략화)
            result #= "tx=" # debug_show(block.tx) # ";";
            
            // fee 필드 처리
            switch (block.fee) {
                case (?feeValue) {
                    result #= "fee=" # Nat.toText(feeValue) # ";";
                };
                case (null) {
                    result #= "fee=null;";
                };
            };
            
            result #= "}";
            result
        };
        
        // ICRC-3 Value를 account 타입에서 변환
        private func accountToICRC3Value(account : Account) : ICRC3Value {
            #Array([
                #Blob(Principal.toBlob(account.owner)),
                switch (account.subaccount) {
                    case (?subaccount) { #Blob(subaccount) };
                    case (null) { #Blob(Blob.fromArray([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])) };
                }
            ])
        };
        
        // 블록을 ICRC3Value로 변환
        private func blockToICRC3Value(block : Block) : ICRC3Value {
            let fieldsBuffer = Buffer.Buffer<(Text, ICRC3Value)>(10); // 대략적인 크기로 초기화
            
            // 필수 필드
            fieldsBuffer.add(("btype", #Text(block.btype)));
            
            // phash가 있으면 추가
            switch (block.phash) {
                case (?hash) {
                    fieldsBuffer.add(("phash", #Blob(hash)));
                };
                case (null) {};
            };
            
            // 타임스탬프 추가
            fieldsBuffer.add(("ts", #Nat(block.ts)));
            
            // tx 필드 추가
            fieldsBuffer.add(("tx", block.tx));
            
            // fee가 있으면 추가
            switch (block.fee) {
                case (?feeValue) {
                    fieldsBuffer.add(("fee", #Nat(feeValue)));
                };
                case (null) {};
            };
            
            #Map(Buffer.toArray(fieldsBuffer))
        };
        
        //-----------------------------------------------------------------------------
        // ICRC-3 표준 함수
        //-----------------------------------------------------------------------------
        
        // 블록 가져오기 (ICRC-3 표준)
        public func icrc3_get_blocks(args : GetBlocksArgs) : GetBlocksResult {
            let totalBlocks = blocks.size();
            let resultBuffer = Buffer.Buffer<{id : Nat; block : ICRC3Value}>(totalBlocks);
            
            for (range in args.vals()) {
                let start = range.start;
                let length = range.length;
                
                // 범위가 유효한지 확인
                if (start < totalBlocks) {
                    let endIndex = Nat.min(start + length, totalBlocks);
                    var i = start;
                    
                    while (i < endIndex) {
                        let block = blocks.get(i);
                        let icrc3Block = blockToICRC3Value(block);
                        resultBuffer.add({id = i; block = icrc3Block});
                        i += 1;
                    };
                };
            };
            
            {
                log_length = totalBlocks;
                blocks = Buffer.toArray(resultBuffer);
                archived_blocks = []; // 내부 관리이므로 아카이브드 블록 없음
            }
        };
        
        // 인증서 가져오기 (ICRC-3 표준)
        // 참고: 실제 구현에서는 IC 인증 메커니즘 활용 필요
        public func icrc3_get_tip_certificate() : ?DataCertificate {
            // 간단한 구현: 실제로는 IC의 인증 메커니즘 사용 필요
            if (blocks.size() == 0) {
                return null;
            };
            
            // 간이 인증서 생성 (실제 구현에서는 IC API 사용)
            let _last_index = Nat64.fromNat(blocks.size() - 1);
            let dummy_cert = Blob.fromArray([0, 1, 2, 3]); // 더미 인증서
            let dummy_tree = Blob.fromArray([4, 5, 6, 7]); // 더미 해시 트리
            
            ?{
                certificate = dummy_cert;
                hash_tree = dummy_tree;
            }
        };
        
        // 지원하는 블록 타입 조회 (ICRC-3 표준)
        public func icrc3_supported_block_types() : [SupportedBlockType] {
            supportedBlockTypes
        };
        
        // 아카이브 조회 (ICRC-3 표준)
        public func icrc3_get_archives(_from : ?Principal) : [{
            canister_id : Principal;
            start : Nat;
            end : Nat;
        }] {
            // 내부 관리이므로 아카이브 노드 없음
            []
        };
        
        //-----------------------------------------------------------------------------
        // 내부 유틸리티 함수
        //-----------------------------------------------------------------------------
        
        // 트랜잭션 기록 함수
        private func recordTransaction(from : Account, to : Account, amount : Nat, memo : ?Blob) {
            let txn : Transaction = {
                id = nextTxId;
                from = from;
                to = to;
                amount = amount;
                fee = fee;
                timestamp = Time.now();
                memo = memo;
            };
            
            nextTxId += 1;
            transactionCount += 1;
            
            // 최대 100개 거래 내역만 저장 (제한을 두어 메모리 사용량 관리)
            if (transactions.size() >= 100) {
                // 가장 오래된 거래(버퍼의 처음) 제거
                let temp = Buffer.Buffer<Transaction>(99);
                for (i in Iter.range(1, 99)) {
                    temp.add(transactions.get(i));
                };
                transactions := temp;
            };
            
            // 새 거래 추가
            transactions.add(txn);
            
            // ICRC-3 블록도 추가
            // 시스템 계정으로부터의 민팅 또는 소각인지 확인
            let isSystemAccount = Principal.equal(from.owner, Principal.fromText("aaaaa-aa")) or 
                                  Principal.equal(to.owner, Principal.fromText("aaaaa-aa"));
            
            if (isSystemAccount) {
                if (Principal.equal(from.owner, Principal.fromText("aaaaa-aa"))) {
                    // 민팅
                    addMintBlock(to, amount);
                } else {
                    // 소각
                    addBurnBlock(from, amount);
                }
            } else {
                // 일반 전송
                addTransactionBlock(from, to, amount, memo, "1xfer");
            }
        };
        
        //-----------------------------------------------------------------------------
        // ICRC-1 표준 함수
        //-----------------------------------------------------------------------------
        
        // 토큰 이름 반환
        public func icrc1_name() : Text {
            name
        };
        
        // 토큰 심볼 반환
        public func icrc1_symbol() : Text {
            symbol
        };
        
        // 토큰 소수점 자릿수 반환
        public func icrc1_decimals() : Nat8 {
            decimals
        };
        
        // 토큰 거래 수수료 반환
        public func icrc1_fee() : Nat {
            fee
        };
        
        // 토큰 총 공급량 반환
        public func icrc1_total_supply() : Nat {
            totalSupply
        };
        
        // 계정 잔액 확인
        public func icrc1_balance_of(account : Account) : Nat {
            switch (ledger.get(account)) {
                case (?balance) { balance };
                case null { 0 };
            }
        };
        
        // 토큰 메타데이터 반환
        public func icrc1_metadata() : [(Text, Value)] {
            [
                ("icrc1:name", #Text(name)),
                ("icrc1:symbol", #Text(symbol)),
                ("icrc1:decimals", #Nat(Nat8.toNat(decimals))),
                ("icrc1:fee", #Nat(fee)),
                ("icrc1:total_supply", #Nat(totalSupply))
            ]
        };
        
        // 민팅 계정 정보 반환
        public func icrc1_minting_account() : ?Account {
            ?minting_account
        };
        
        // 지원하는 표준 목록 반환
        public func icrc1_supported_standards() : [{ name : Text; url : Text }] {
            [
                { name = "ICRC-1"; url = "https://github.com/dfinity/ICRC/ICRCs/ICRC-1" },
                { name = "ICRC-2"; url = "https://github.com/dfinity/ICRC/ICRCs/ICRC-2" }
            ]
        };
        
        // 토큰 전송 함수
        public func icrc1_transfer(caller : Principal, args : TransferArgs) : { #Ok : Nat; #Err : TransferError } {
            Debug.print("====== transfer 시작 ======");
            
            // 계정 생성 (단순화)
            let from : Account = {
                owner = caller;
                subaccount = args.from_subaccount;
            };
            
            // 필요한 값 추출
            let amount = args.amount;
            let to = args.to;

            // 송금자 계정 차감 (단순화)
            switch (ledger.get(from)) {
                case (?balance) {
                    if (balance < amount) {
                        Debug.print("잔액 부족");
                        return #Err(#InsufficientFunds { balance = balance });
                    };
                    
                    ledger.put(from, balance - amount);
                };
                case null {
                    Debug.print("계정 없음");
                    return #Err(#InsufficientFunds { balance = 0 });
                };
            };
            
            // 수신자 계정 증가 (단순화)
            switch (ledger.get(to)) {
                case (?to_balance) {
                    ledger.put(to, to_balance + amount);
                };
                case null {
                    ledger.put(to, amount);
                };
            };
            
            // 간단히 송금 기록
            recordTransaction(from, to, amount, args.memo);
            
            Debug.print("====== transfer 완료 ======");
            #Ok(amount)
        };
        
        //-----------------------------------------------------------------------------
        // ICRC-2 표준 함수
        //-----------------------------------------------------------------------------
        
        // 승인 함수 - 다른 계정에게 자금 사용 권한 부여
        public func icrc2_approve(caller : Principal, args : ApproveArgs) : { #Ok : Nat; #Err : ApproveError } {
            Debug.print("====== approve 완전히 새로운 구현 ======");
            
            Debug.print("approve 시작");
            
            // 승인 정보 저장
            let new_allowance : SimpleAllowance = {
                from = caller;
                spender = args.spender.owner;
                amount = args.amount;
            };
            
            // 버퍼에 직접 추가
            simpleAllowances.add(new_allowance);
            
            Debug.print("승인 정보 저장 완료");
            
            // 성공 시 승인 블록 기록
            let fromAccount : Account = {
                owner = caller;
                subaccount = args.from_subaccount;
            };
            
            // 트랜잭션 정보를 Buffer로 구성
            let txBuffer = Buffer.Buffer<(Text, ICRC3Value)>(4);
            txBuffer.add(("amt", #Nat(args.amount)));
            txBuffer.add(("from", accountToICRC3Value(fromAccount)));
            txBuffer.add(("spender", accountToICRC3Value(args.spender)));
            
            switch (args.memo) {
                case (?m) { txBuffer.add(("memo", #Blob(m))) };
                case (null) { }; // 메모가 없으면 추가하지 않음
            };
            
            // 블록 생성
            let newBlock : Block = {
                phash = if (blocks.size() > 0) { lastBlockHash } else { null };
                btype = "2approve";
                ts = Int.abs(Time.now());
                tx = #Map(Buffer.toArray(txBuffer));
                fee = ?fee;
            };
            
            // 블록 저장 및 해시 계산
            let blockHash = hashBlock(newBlock);
            lastBlockHash := ?blockHash;
            
            // 블록 저장 - 최대 개수 제한
            if (blocks.size() >= maxBlocksToStore) {
                // 가장 오래된 블록 제거
                let tempBlocks = Buffer.Buffer<Block>(maxBlocksToStore);
                // 안전한 계산으로 시작 인덱스 결정
                var startIndex = 0;
                if (blocks.size() > maxBlocksToStore) {
                    // 음수 결과를 방지하기 위한 안전한 계산
                    let blocksToSkip = blocks.size() - maxBlocksToStore;
                    // 오버플로우 방지
                    if (blocksToSkip < Nat.pow(2, 32)) {
                        startIndex := blocksToSkip + 1;
                    } else {
                        startIndex := 1; // 너무 큰 값이면 기본값 사용
                    };
                };
                
                while (startIndex < blocks.size()) {
                    tempBlocks.add(blocks.get(startIndex));
                    startIndex += 1;
                };
                tempBlocks.add(newBlock);
                blocks := tempBlocks;
            };
            
            blocks.add(newBlock);
            nextBlockId += 1;
            
            Debug.print("====== approve 완료 ======");
            #Ok(args.amount)
        };
        
        // 현재 승인 금액 조회 함수
        public func icrc2_allowance(args : AllowanceArgs) : AllowanceResponse {
            Debug.print("====== allowance 새 구현 ======");
            
            let account_owner = args.account.owner;
            let spender_owner = args.spender.owner;
            
            var result : Nat = 0;
            
            // 버퍼에서 일치하는 승인 정보 찾기
            for (allowance in simpleAllowances.vals()) {
                if (Principal.equal(allowance.from, account_owner) and 
                    Principal.equal(allowance.spender, spender_owner)) {
                    result := allowance.amount;
                };
            };
            
            Debug.print("====== allowance 완료 ======");
            { allowance = result; expires_at = null }
        };
        
        // 승인된 자금 전송 함수
        public func icrc2_transfer_from(caller : Principal, args : TransferFromArgs) : { #Ok : Nat; #Err : TransferFromError } {
            Debug.print("====== transfer_from 새 구현 ======");
            
            let from_principal = args.from.owner;
            let amount = args.amount;
            let to = args.to;
            
            // 승인 금액 확인
            var approved_amount : Nat = 0;
            var found_index : ?Nat = null;
            
            for (i in Iter.range(0, simpleAllowances.size() - 1)) {
                let allowance = simpleAllowances.get(i);
                if (Principal.equal(allowance.from, from_principal) and 
                    Principal.equal(allowance.spender, caller)) {
                    approved_amount := allowance.amount;
                    found_index := ?i;
                };
            };
            
            if (approved_amount < amount) {
                Debug.print("승인 금액 부족");
                // ICRC-2 표준에 맞게 InsufficientAllowance 오류 반환
                return #Err(#InsufficientAllowance { allowance = approved_amount });
            };
            
            // 송금자 계정 차감
            switch (ledger.get(args.from)) {
                case (?balance) {
                    if (balance < amount) {
                        Debug.print("잔액 부족");
                        return #Err(#InsufficientFunds { balance = balance });
                    };
                    
                    ledger.put(args.from, balance - amount);
                };
                case null {
                    Debug.print("계정 없음");
                    return #Err(#InsufficientFunds { balance = 0 });
                };
            };
            
            // 수신자 계정 증가
            switch (ledger.get(to)) {
                case (?to_balance) {
                    ledger.put(to, to_balance + amount);
                };
                case null {
                    ledger.put(to, amount);
                };
            };
            
            // 승인 금액 조정
            switch (found_index) {
                case (?index) {
                    let allowance = simpleAllowances.get(index);
                    let new_allowance : SimpleAllowance = {
                        from = allowance.from;
                        spender = allowance.spender;
                        amount = allowance.amount - amount;
                    };
                    simpleAllowances.put(index, new_allowance);
                };
                case null {};
            };
            
            // 송금 기록
            recordTransaction(args.from, to, amount, args.memo);
            
            // ICRC-3 블록 추가 (recordTransaction 내부에서 처리됨)
            
            Debug.print("====== transfer_from 완료 ======");
            #Ok(amount)
        };
        
        //-----------------------------------------------------------------------------
        // 사용자 정의 함수
        //-----------------------------------------------------------------------------
        
        // 토큰 민팅 (새로운 토큰 생성)
        public func mint(to : Account, amount : Nat) : { #Ok : Nat; #Err : Text } {
            switch (ledger.get(to)) {
                case (?balance) {
                    ledger.put(to, balance + amount);
                };
                case null {
                    ledger.put(to, amount);
                };
            };
            totalSupply += amount;
            
            // 가상의 시스템 계정으로부터 민팅 기록
            let systemAccount : Account = {
                owner = Principal.fromText("aaaaa-aa");
                subaccount = null;
            };
            recordTransaction(systemAccount, to, amount, null);
            
            // ICRC-3 민팅 블록은 recordTransaction 내에서 처리됨
            
            #Ok(amount)
        };
        
        // 토큰 소각 (토큰 파괴)
        public func burn(from : Account, amount : Nat) : { #Ok : Nat; #Err : Text } {
            switch (ledger.get(from)) {
                case (?balance) {
                    if (balance < amount) {
                        return #Err("Insufficient balance");
                    };
                    ledger.put(from, balance - amount);
                    totalSupply -= amount;
                    
                    // 가상의 시스템 계정으로 소각 기록
                    let systemAccount : Account = {
                        owner = Principal.fromText("aaaaa-aa");
                        subaccount = null;
                    };
                    recordTransaction(from, systemAccount, amount, null);
                    
                    // ICRC-3 소각 블록은 recordTransaction 내에서 처리됨
                    
                    #Ok(amount)
                };
                case null {
                    #Err("Account not found")
                };
            }
        };
        
        // 토큰 보유자 목록 반환
        public func get_token_holders() : [(Principal, Nat)] {
            var holders = Buffer.Buffer<(Principal, Nat)>(0);
            for ((account, balance) in ledger.entries()) {
                if (balance > 0) {
                    holders.add((account.owner, balance));
                };
            };
            Buffer.toArray(holders)
        };
        
        // 토큰 보유자 수 반환
        public func get_token_holders_count() : Nat {
            var count : Nat = 0;
            for ((account, balance) in ledger.entries()) {
                if (balance > 0) {
                    count += 1;
                };
            };
            count
        };
        
        // 총 거래 건수 반환
        public func get_transaction_count() : Nat {
            transactionCount
        };
        
        // 최근 거래 내역 반환 (최대 count개)
        public func get_recent_transactions(count : Nat) : [Transaction] {
            let size = transactions.size();
            let actualCount = if (size < count) { size } else { count };
            
            let result = Buffer.Buffer<Transaction>(actualCount);
            var i = 0;
            
            // 가장 최근 거래부터 (버퍼의 마지막부터) 가져옴
            while (i < actualCount and i < size) {
                // 안전한 인덱스 계산
                var index = 0;
                if (size > 0 and i < size) {
                    // 역순으로 가져오기 위한 계산
                    if (size > i) {
                        index := size - 1 - i;
                    };
                };
                
                result.add(transactions.get(index));
                i += 1;
            };
            
            Buffer.toArray(result)
        };
        
        // 트랜잭션 기록 함수 (ICRC-3 블록 생성)
        private func addTransactionBlock(from : Account, to : Account, amount : Nat, memo : ?Blob, blockType : Text) {
            let parentHash = if (blocks.size() > 0) {
                lastBlockHash
            } else {
                null
            };
            
            // 트랜잭션 정보를 Buffer로 구성
            let txBuffer = Buffer.Buffer<(Text, ICRC3Value)>(5);
            txBuffer.add(("amt", #Nat(amount)));
            txBuffer.add(("from", accountToICRC3Value(from)));
            txBuffer.add(("to", accountToICRC3Value(to)));
            
            switch (memo) {
                case (?m) { txBuffer.add(("memo", #Blob(m))) };
                case (null) { }; // 메모가 없으면 추가하지 않음
            };
            
            // 블록 생성
            let newBlock : Block = {
                phash = parentHash;
                btype = blockType;
                ts = Int.abs(Time.now());
                tx = #Map(Buffer.toArray(txBuffer));
                fee = ?fee;
            };
            
            // 블록 저장 및 해시 계산
            let blockHash = hashBlock(newBlock);
            lastBlockHash := ?blockHash;
            
            // 블록 저장 - 최대 개수 제한
            if (blocks.size() >= maxBlocksToStore) {
                // 가장 오래된 블록 제거
                let tempBlocks = Buffer.Buffer<Block>(maxBlocksToStore);
                // 안전한 계산으로 시작 인덱스 결정
                var startIndex = 0;
                if (blocks.size() > maxBlocksToStore) {
                    // 음수 결과를 방지하기 위한 안전한 계산
                    let blocksToSkip = blocks.size() - maxBlocksToStore;
                    // 오버플로우 방지
                    if (blocksToSkip < Nat.pow(2, 32)) {
                        startIndex := blocksToSkip + 1;
                    } else {
                        startIndex := 1; // 너무 큰 값이면 기본값 사용
                    };
                };
                
                while (startIndex < blocks.size()) {
                    tempBlocks.add(blocks.get(startIndex));
                    startIndex += 1;
                };
                tempBlocks.add(newBlock);
                blocks := tempBlocks;
            };
            
            blocks.add(newBlock);
            nextBlockId += 1;
        };
        
        // 민팅 전용 블록 추가
        private func addMintBlock(to : Account, amount : Nat) {
            let systemAccount : Account = {
                owner = Principal.fromText("aaaaa-aa");
                subaccount = null;
            };
            
            addTransactionBlock(systemAccount, to, amount, null, "1mint");
        };
        
        // 소각 전용 블록 추가
        private func addBurnBlock(from : Account, amount : Nat) {
            let systemAccount : Account = {
                owner = Principal.fromText("aaaaa-aa");
                subaccount = null;
            };
            
            addTransactionBlock(from, systemAccount, amount, null, "1burn");
        };
        
        // 수익 배분 전용 블록 추가 (3revDist)
        public func addRevenueDistributionBlock(to : Account, amount : Nat, tokenId : Nat, distributionId : Nat) : Nat {
            let systemAccount : Account = {
                owner = Principal.fromText("aaaaa-aa");
                subaccount = null;
            };
            
            let parentHash = if (blocks.size() > 0) {
                lastBlockHash
            } else {
                null
            };
            
            // 수익 배분 전용 필드 추가
            let txBuffer = Buffer.Buffer<(Text, ICRC3Value)>(6);
            txBuffer.add(("amt", #Nat(amount)));
            txBuffer.add(("from", accountToICRC3Value(systemAccount)));
            txBuffer.add(("to", accountToICRC3Value(to)));
            txBuffer.add(("tokenId", #Nat(tokenId)));
            txBuffer.add(("distributionId", #Nat(distributionId)));
            txBuffer.add(("revenueType", #Text("nft-staking")));
            
            // 블록 생성
            let newBlock : Block = {
                phash = parentHash;
                btype = "3revDist";
                ts = Int.abs(Time.now());
                tx = #Map(Buffer.toArray(txBuffer));
                fee = null;  // 수익 배분에는 수수료 없음
            };
            
            // 블록 저장 및 해시 계산
            let blockHash = hashBlock(newBlock);
            lastBlockHash := ?blockHash;
            
            // 블록 ID 생성
            let blockId = blocks.size();
            
            // 블록 저장 - 최대 개수 제한
            if (blocks.size() >= maxBlocksToStore) {
                // 가장 오래된 블록 제거
                let tempBlocks = Buffer.Buffer<Block>(maxBlocksToStore);
                // 안전한 계산으로 시작 인덱스 결정
                var startIndex = 0;
                if (blocks.size() > maxBlocksToStore) {
                    // 음수 결과를 방지하기 위한 안전한 계산
                    let blocksToSkip = blocks.size() - maxBlocksToStore;
                    // 오버플로우 방지
                    if (blocksToSkip < Nat.pow(2, 32)) {
                        startIndex := blocksToSkip + 1;
                    } else {
                        startIndex := 1; // 너무 큰 값이면 기본값 사용
                    };
                };
                
                while (startIndex < blocks.size()) {
                    tempBlocks.add(blocks.get(startIndex));
                    startIndex += 1;
                };
                tempBlocks.add(newBlock);
                blocks := tempBlocks;
            } else {
                blocks.add(newBlock);
            };
            
            Debug.print("[PiggyCellToken] 수익 배분 블록 생성 완료, ID: " # Nat.toText(blockId) # 
                      ", 사용자: " # Principal.toText(to.owner) # 
                      ", 토큰ID: " # Nat.toText(tokenId) # 
                      ", 배분ID: " # Nat.toText(distributionId));
            
            return blockId; // 생성된 블록 ID 반환
        };
    };
}; 