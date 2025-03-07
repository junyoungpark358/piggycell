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
                case (?subaccount) {
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
            let spenderHash = accountHash(spender);
            ownerHash
        };
        
        // 데이터 저장소
        private let ledger = TrieMap.TrieMap<Account, Nat>(accountsEqual, accountHash);
        private let allowances = TrieMap.TrieMap<(Account, Account), Allowance>(allowancesEqual, allowancesHash);
        private var simpleAllowances = Buffer.Buffer<SimpleAllowance>(0);
        
        // 거래 이력을 위한 변수들
        private var nextTxId : Nat = 0;
        private var transactions = Buffer.Buffer<Transaction>(0);
        private var transactionCount : Nat = 0;
        
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
            while (i < actualCount) {
                let index = size - i - 1;
                result.add(transactions.get(index));
                i += 1;
            };
            
            Buffer.toArray(result)
        };
    };
}; 