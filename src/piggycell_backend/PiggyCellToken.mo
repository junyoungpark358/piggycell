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

    public class PiggyCellToken() {
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
                    let subaccountHash = Hash.hashNat8(Array.map<Nat8, Hash.Hash>(subaccount, func(n: Nat8) : Hash.Hash { Nat32.fromNat(Nat8.toNat(n)) }));
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
            Nat32.add(ownerHash, spenderHash)
        };

        private let ledger = TrieMap.TrieMap<Account, Nat>(accountsEqual, accountHash);
        private let allowances = TrieMap.TrieMap<(Account, Account), Nat>(allowancesEqual, allowancesHash);
        private var totalSupply : Nat = 0;
        private let decimals : Nat8 = 8;
        private let symbol : Text = "PGC";
        private let name : Text = "PiggyCell Token";
        private let fee : Nat = 1;

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
                    #ok(())
                };
                case null {
                    #err("Account not found")
                };
            }
        };

        public func icrc1_transfer(caller : Principal, args : TransferArgs) : Result.Result<(), TransferError> {
            let from : Account = {
                owner = caller;
                subaccount = args.from_subaccount;
            };

            let balance = icrc1_balance_of(from);
            if (balance < args.amount + fee) {
                return #err(#InsufficientFunds { balance = balance });
            };

            switch (args.fee) {
                case (?requested_fee) {
                    if (requested_fee != fee) {
                        return #err(#BadFee { expected_fee = fee });
                    };
                };
                case null {};
            };

            switch (args.created_at_time) {
                case (?created_at_time) {
                    let current_time = Nat64.fromNat(Int.abs(Time.now()) / 1_000_000);
                    if (created_at_time > current_time + 180) {
                        return #err(#CreatedInFuture { ledger_time = current_time });
                    };
                };
                case null {};
            };

            switch (ledger.get(from)) {
                case (?from_balance) {
                    ledger.put(from, from_balance - args.amount - fee);
                };
                case null {
                    return #err(#InsufficientFunds { balance = 0 });
                };
            };

            switch (ledger.get(args.to)) {
                case (?to_balance) {
                    ledger.put(args.to, to_balance + args.amount);
                };
                case null {
                    ledger.put(args.to, args.amount);
                };
            };

            #ok(())
        };
    };
}; 