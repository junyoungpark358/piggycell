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
    public type Account = {
        owner : Principal;
        subaccount : ?[Nat8];
    };

    public type TransferArgs = {
        from_subaccount : ?[Nat8];
        to : Account;
        amount : Nat;
        fee : ?Nat;
        memo : ?[Nat8];
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

    // 거래 이력을 위한 타입 추가
    public type Transaction = {
        id : Nat;
        from : Account;
        to : Account;
        amount : Nat;
        fee : Nat;
        timestamp : Time.Time;
        memo : ?[Nat8];
    };

    public type TransactionRecord = {
        from : Account;
        to : Account;
        amount : Nat;
        timestamp : Int;
        memo : ?Blob;
    };

    // ICRC-2 승인 관련 타입 추가
    public type ApproveArgs = {
        from_subaccount : ?[Nat8];
        spender : Account;
        amount : Nat;
        expected_allowance : ?Nat;
        expires_at : ?Nat64;
        fee : ?Nat;
        memo : ?[Nat8];
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
    
    // 토큰 승인 정보를 저장하기 위한 타입 - 만료 시간 제거 버전
    public type Allowance = {
        allowance : Nat;
        // expires_at 필드는 유지하되 사용하지 않음
        expires_at : ?Nat64;
    };

    // 단순화된 승인 정보 저장을 위한 새로운 타입
    private type SimpleAllowance = {
        from : Principal;
        spender : Principal;
        amount : Nat;
    };

    public class PiggyCellToken() {
        // 단순한 버퍼를 사용한 승인 정보 저장
        private var simpleAllowances = Buffer.Buffer<SimpleAllowance>(0);
        
        private func accountsEqual(a : Account, b : Account) : Bool {
            Principal.equal(a.owner, b.owner) and
            Option.equal(a.subaccount, b.subaccount, func(a : [Nat8], b : [Nat8]) : Bool {
                Array.equal(a, b, Nat8.equal)
            })
        };

        private func accountHash(account : Account) : Nat32 {
            let hash = Principal.hash(account.owner);
            switch (account.subaccount) {
                case (?subaccount) {
                    hash
                };
                case null {
                    hash
                };
            }
        };

        private func allowancesEqual(a : (Account, Account), b : (Account, Account)) : Bool {
            accountsEqual(a.0, b.0) and accountsEqual(a.1, b.1)
        };

        private func allowancesHash(allowance : (Account, Account)) : Nat32 {
            let (owner, spender) = allowance;
            let ownerHash = accountHash(owner);
            let spenderHash = accountHash(spender);
            ownerHash
        };

        private let ledger = TrieMap.TrieMap<Account, Nat>(accountsEqual, accountHash);
        private let allowances = TrieMap.TrieMap<(Account, Account), Allowance>(allowancesEqual, allowancesHash);
        private var totalSupply : Nat = 0;
        private let decimals : Nat8 = 8;
        private let symbol : Text = "PGC";
        private let name : Text = "PiggyCell Token";
        private let fee : Nat = 0;
        
        // 거래 이력을 위한 변수들
        private var nextTxId : Nat = 0;
        private var transactions = Buffer.Buffer<Transaction>(0);
        private var transactionCount : Nat = 0;

        public func icrc1_name() : Text {
            name
        };

        public func icrc1_symbol() : Text {
            symbol
        };

        public func icrc1_decimals() : Nat8 {
            decimals
        };

        public func icrc1_fee() : Nat {
            fee
        };

        public func icrc1_total_supply() : Nat {
            totalSupply
        };

        public func icrc1_balance_of(account : Account) : Nat {
            switch (ledger.get(account)) {
                case (?balance) { balance };
                case null { 0 };
            }
        };

        // 새로운 함수: 토큰 보유자 목록 반환
        public func get_token_holders() : [(Principal, Nat)] {
            var holders = Buffer.Buffer<(Principal, Nat)>(0);
            for ((account, balance) in ledger.entries()) {
                if (balance > 0) {
                    holders.add((account.owner, balance));
                };
            };
            Buffer.toArray(holders)
        };

        // 새로운 함수: 토큰 보유자 수 반환
        public func get_token_holders_count() : Nat {
            var count : Nat = 0;
            for ((account, balance) in ledger.entries()) {
                if (balance > 0) {
                    count += 1;
                };
            };
            count
        };

        // 새로운 함수: 총 거래 건수 반환
        public func get_transaction_count() : Nat {
            transactionCount
        };

        // 새로운 함수: 최근 거래 내역 반환 (최대 count개)
        public func get_recent_transactions(count : Nat) : [Transaction] {
            let size = transactions.size();
            let actualCount = if (size < count) { size } else { count };
            
            let result = Buffer.Buffer<Transaction>(actualCount);
            var i = 0;
            
            // 가장 최근 거래부터 (버퍼의 마지막부터) 가져옴
            while (i < actualCount) {
                let index = size - i - 1;
                result.add(transactions.get(index));
                i += 1;
            };
            
            Buffer.toArray(result)
        };

        // 트랜잭션 기록 함수
        private func recordTransaction(from : Account, to : Account, amount : Nat, memo : ?[Nat8]) {
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
        };

        public func mint(to : Account, amount : Nat) : Result.Result<(), Text> {
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
            
            #ok(())
        };

        public func burn(from : Account, amount : Nat) : Result.Result<(), Text> {
            switch (ledger.get(from)) {
                case (?balance) {
                    if (balance < amount) {
                        return #err("Insufficient balance");
                    };
                    ledger.put(from, balance - amount);
                    totalSupply -= amount;
                    
                    // 가상의 시스템 계정으로 소각 기록
                    let systemAccount : Account = {
                        owner = Principal.fromText("aaaaa-aa");
                        subaccount = null;
                    };
                    recordTransaction(from, systemAccount, amount, null);
                    
                    #ok(())
                };
                case null {
                    #err("Account not found")
                };
            }
        };

        // ICRC-2 승인 함수 - 완전히 새로운 접근 방식
        public func icrc2_approve(caller : Principal, args : ApproveArgs) : Result.Result<Nat, ApproveError> {
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
            Debug.print("====== approve 완료 ======");
            
            #ok(args.amount)
        };
        
        // 현재 승인 금액 조회 - 완전히 새로운 구현
        public func icrc2_allowance(args : AllowanceArgs) : Nat {
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
            result
        };
        
        // 승인된 자금 전송 - 새로운 구현에 맞게 수정
        public func icrc2_transfer_from(caller : Principal, args : TransferArgs, from : Account) : Result.Result<(), TransferError> {
            Debug.print("====== transfer_from 새 구현 ======");
            
            let from_principal = from.owner;
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
                return #err(#InsufficientFunds { balance = approved_amount });
            };
            
            // 송금자 계정 차감
            switch (ledger.get(from)) {
                case (?balance) {
                    if (balance < amount) {
                        Debug.print("잔액 부족");
                        return #err(#InsufficientFunds { balance = balance });
                    };
                    
                    ledger.put(from, balance - amount);
                };
                case null {
                    Debug.print("계정 없음");
                    return #err(#InsufficientFunds { balance = 0 });
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
            recordTransaction(from, to, amount, args.memo);
            
            Debug.print("====== transfer_from 완료 ======");
            #ok(())
        };

        // 기본 전송 함수 - 극단적으로 단순화
        public func icrc1_transfer(caller : Principal, args : TransferArgs) : Result.Result<(), TransferError> {
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
                        return #err(#InsufficientFunds { balance = balance });
                    };
                    
                    ledger.put(from, balance - amount);
                };
                case null {
                    Debug.print("계정 없음");
                    return #err(#InsufficientFunds { balance = 0 });
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
            #ok(())
        };
    };
}; 