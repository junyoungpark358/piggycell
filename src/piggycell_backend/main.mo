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
import Staking "./Staking";

actor Main {
    private let nft = ChargerHubNFT.NFTCanister(Principal.fromActor(Main));
    private let adminManager = Admin.AdminManager();
    private let token = Token.Token();
    private let marketManager = Market.MarketManager(token, nft, Principal.fromActor(Main));
    private let stakingManager = Staking.StakingManager(token, nft);

    // 거래 내역을 저장하기 위한 타입과 변수
    type TransactionType = {
        #Mint;
        #NFTSale;
        #Stake;
        #Unstake;
        #StakingReward;
    };

    type Transaction = {
        txType: TransactionType;
        nftId: ?Nat;
        user: Principal;
        amount: Nat;
        timestamp: Int;
    };

    type TransactionResponse = {
        txType: Text;
        nftId: ?Text;
        user: Text;
        amount: Nat;
        date: Text;
    };

    type TransactionPage = {
        items: [TransactionResponse];
        total: Nat;
    };

    private let transactions = Buffer.Buffer<Transaction>(0);
    private let activeUsers = TrieMap.TrieMap<Principal, Int>(Principal.equal, Principal.hash);

    // 거래 내역 추가 함수
    private func addTransaction(txType: TransactionType, nftId: ?Nat, user: Principal, amount: Nat) {
        let tx = {
            txType = txType;
            nftId = nftId;
            user = user;
            amount = amount;
            timestamp = Time.now();
        };
        transactions.add(tx);
        
        // Mint 타입이 아닐 때만 활성 사용자로 기록
        switch (txType) {
            case (#Mint) { };  // Mint는 활성 사용자로 기록하지 않음
            case (_) { activeUsers.put(user, Time.now()) };
        };
    };

    // 활성 사용자 수 조회 (최근 30일 이내 거래한 사용자)
    public query func getActiveUsersCount() : async Nat {
        let thirtyDaysAgo = Time.now() - (30 * 24 * 60 * 60 * 1_000_000_000); // 30일을 나노초로 변환
        var count = 0;
        for ((_, lastActive) in activeUsers.entries()) {
            if (lastActive > thirtyDaysAgo) {
                count += 1;
            };
        };
        count
    };

    // 총 거래액 조회
    public query func getTotalVolume() : async Nat {
        var total = 0;
        for (tx in transactions.vals()) {
            switch (tx.txType) {
                case (#NFTSale) { total += tx.amount };
                case (_) {};
            };
        };
        total
    };

    // 거래 내역 조회 (페이지네이션)
    public query func getTransactions(page: Nat, limit: Nat) : async TransactionPage {
        let txs = Buffer.toArray(transactions);
        let total = txs.size();

        // 시작 인덱스 계산 (최신 거래부터 표시)
        let startIndex = if (total == 0) { 0 } else {
            let offset = page * limit;
            if (offset >= total) { 0 } else { total - Nat.min(offset + limit, total) };
        };

        // 페이지 크기 계산
        let pageSize = if (total == 0) { 0 } else {
            let remaining = total - (page * limit);
            if (remaining == 0) { 0 }
            else { Nat.min(remaining, limit) };
        };

        // 거래 내역 추출
        let pageTransactions = Array.tabulate<Transaction>(
            pageSize,
            func(i) = txs[startIndex + i]
        );

        // 응답 형식으로 변환
        let items = Array.map<Transaction, TransactionResponse>(
            pageTransactions,
            func(tx: Transaction) : TransactionResponse {
                let txType = switch (tx.txType) {
                    case (#NFTSale) { "NFT 판매" };
                    case (#Stake) { "NFT 스테이킹" };
                    case (#Unstake) { "NFT 언스테이킹" };
                    case (#StakingReward) { "스테이킹 보상" };
                };

                {
                    txType = txType;
                    nftId = Option.map<Nat, Text>(
                        tx.nftId,
                        func(id: Nat) : Text = "충전 허브 #" # Nat.toText(id)
                    );
                    user = Principal.toText(tx.user);
                    amount = tx.amount;
                    date = formatTimestamp(tx.timestamp);
                }
            }
        );

        {
            items = items;
            total = total;
        }
    };

    // 타임스탬프를 읽기 쉬운 형식으로 변환
    private func formatTimestamp(timestamp: Int) : Text {
        let seconds = timestamp / 1_000_000_000;
        
        // 한국 시간으로 변환 (UTC+9)
        let koreaSeconds = seconds + (9 * 3600);
        
        // 1970년 1월 1일부터의 일수
        let days = koreaSeconds / 86400;
        
        // 1970년부터의 연도 계산
        let year = 1970 + (days / 365);
        let remainingDays = days % 365;
        
        // 월과 일 계산 (간단한 버전)
        let monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var month = 1;
        var day = Nat64.toNat(Nat64.fromIntWrap(remainingDays));
        
        var daysInMonth = monthDays[0];
        while (day > daysInMonth) {
            day -= daysInMonth;
            month += 1;
            if (month <= 12) {
                daysInMonth := monthDays[month - 1];
            };
        };
        
        // 시간 계산
        let secondsInDay = koreaSeconds % 86400;
        let hour = secondsInDay / 3600;
        let minute = (secondsInDay % 3600) / 60;
        
        // 문자열 생성
        let yearStr = Nat.toText(Nat64.toNat(Nat64.fromIntWrap(year)));
        let monthStr = if (month < 10) "0" # Nat.toText(month) else Nat.toText(month);
        let dayStr = if (day < 10) "0" # Nat.toText(day) else Nat.toText(day);
        let hourStr = if (Nat64.toNat(Nat64.fromIntWrap(hour)) < 10) "0" # Nat.toText(Nat64.toNat(Nat64.fromIntWrap(hour))) 
                     else Nat.toText(Nat64.toNat(Nat64.fromIntWrap(hour)));
        let minuteStr = if (Nat64.toNat(Nat64.fromIntWrap(minute)) < 10) "0" # Nat.toText(Nat64.toNat(Nat64.fromIntWrap(minute))) 
                       else Nat.toText(Nat64.toNat(Nat64.fromIntWrap(minute)));
        
        yearStr # "-" # monthStr # "-" # dayStr # " " # hourStr # ":" # minuteStr
    };

    // ICRC-7 표준 메소드
    public query func icrc7_collection_metadata() : async [(Text, ChargerHubNFT.Value)] {
        nft.icrc7_collection_metadata()
    };

    public query func icrc7_symbol() : async Text {
        nft.icrc7_symbol()
    };

    public query func icrc7_name() : async Text {
        nft.icrc7_name()
    };

    public query func icrc7_description() : async Text {
        nft.icrc7_description()
    };

    public query func icrc7_logo() : async Text {
        nft.icrc7_logo()
    };

    public query func icrc7_total_supply() : async Nat {
        nft.icrc7_total_supply()
    };

    public query func icrc7_supply_cap() : async ?Nat {
        nft.icrc7_supply_cap()
    };

    public query func icrc7_max_query_batch_size() : async ?Nat {
        nft.icrc7_max_query_batch_size()
    };

    public query func icrc7_max_update_batch_size() : async ?Nat {
        nft.icrc7_max_update_batch_size()
    };

    public query func icrc7_default_take_value() : async ?Nat {
        nft.icrc7_default_take_value()
    };

    public query func icrc7_max_take_value() : async ?Nat {
        nft.icrc7_max_take_value()
    };

    public query func icrc7_max_memo_size() : async ?Nat {
        nft.icrc7_max_memo_size()
    };

    public query func icrc7_atomic_batch_transfers() : async ?Bool {
        nft.icrc7_atomic_batch_transfers()
    };

    public query func icrc7_tx_window() : async ?Nat {
        nft.icrc7_tx_window()
    };

    public query func icrc7_permitted_drift() : async ?Nat {
        nft.icrc7_permitted_drift()
    };

    public query func icrc7_token_metadata(token_ids: [Nat]) : async [?[(Text, ChargerHubNFT.Value)]] {
        nft.icrc7_token_metadata(token_ids)
    };

    public query func icrc7_owner_of(token_ids: [Nat]) : async [?ChargerHubNFT.Account] {
        nft.icrc7_owner_of(token_ids)
    };

    public query func icrc7_balance_of(accounts: [ChargerHubNFT.Account]) : async [Nat] {
        nft.icrc7_balance_of(accounts)
    };

    public query func icrc7_tokens(prev: ?Nat, take: ?Nat) : async [Nat] {
        nft.icrc7_tokens(prev, take)
    };

    public query func icrc7_tokens_of(account: ChargerHubNFT.Account, prev: ?Nat, take: ?Nat) : async [Nat] {
        nft.icrc7_tokens_of(account, prev, take)
    };

    // ICRC-1 토큰 관련 인터페이스
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

    // ICRC-3 인터페이스 구현
    public query func icrc3_get_transactions(request : GetTransactionsRequest) : async GetTransactionsResponse {
        let start = Option.get(request.start, 0);
        let length = Option.get(request.length, 10);
        let account = request.account;

        let filteredTxs = Buffer.Buffer<ICRC3Transaction>(0);
        
        for (tx in transactions.vals()) {
            let icrc3Tx : ICRC3Transaction = {
                kind = switch (tx.txType) {
                    case (#Mint) "mint";
                    case (#NFTSale) "transfer";
                    case (#Stake) "stake";
                    case (#Unstake) "unstake";
                    case (#StakingReward) "reward";
                };
                timestamp = tx.timestamp;
                from = ?{ owner = tx.user; subaccount = null };
                to = switch (tx.txType) {
                    case (#Mint) { ?{ owner = Principal.fromActor(Main); subaccount = null } };
                    case (#NFTSale) {
                        // NFT 판매의 경우 구매자가 받는 주소가 됨
                        ?{ owner = tx.user; subaccount = null }
                    };
                    case (#Stake) { ?{ owner = Principal.fromActor(Main); subaccount = null } };
                    case (#Unstake) { ?{ owner = tx.user; subaccount = null } };
                    case (#StakingReward) { ?{ owner = tx.user; subaccount = null } };
                };
                token_ids = switch (tx.nftId) {
                    case (null) [];
                    case (?id) [id];
                };
                memo = null;
                amount = ?tx.amount;  // 거래 금액 포함
            };

            // 계정 필터링
            switch (account) {
                case (null) {
                    filteredTxs.add(icrc3Tx);
                };
                case (?acc) {
                    if (tx.user == acc.owner) {
                        filteredTxs.add(icrc3Tx);
                    };
                };
            };
        };

        let total = filteredTxs.size();
        let end = Nat.min(start + length, total);
        let pageItems = Buffer.Buffer<ICRC3Transaction>(0);

        var i = start;
        while (i < end) {
            pageItems.add(filteredTxs.get(i));
            i += 1;
        };

        {
            transactions = Buffer.toArray(pageItems);
            total = total;
        }
    };

    public shared({ caller }) func icrc3_batch_transfer(args: ChargerHubNFT.BatchTransferArgs) : async ChargerHubNFT.BatchTransferResult {
        nft.icrc3_batch_transfer(caller, args)
    };

    public query func icrc3_supported_standards() : async [(Text, Text)] {
        nft.icrc3_supported_standards()
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

        // 가격 정보를 메타데이터에 추가
        let metadata = switch(price) {
            case (?p) { 
                Array.append(args.metadata, [("price", #Nat(p))]);
            };
            case null { args.metadata };
        };

        let mintArgs: ChargerHubNFT.MintArgs = {
            to = args.to;
            token_id = args.token_id;
            metadata = metadata;
        };

        switch(nft.mint(caller, mintArgs)) {
            case (#ok(token_id)) {
                // NFT 발행 거래 내역 추가
                addTransaction(#Mint, ?token_id, caller, 0);

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

    public shared({ caller }) func updateMetadata(token_id: Nat, new_metadata: [(Text, ChargerHubNFT.Value)]) : async Result.Result<(), Text> {
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
    public shared({ caller }) func icrc7_transfer(args: [ChargerHubNFT.TransferArg]) : async [?ChargerHubNFT.TransferResult] {
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
        switch(marketManager.buyNFT(caller, tokenId)) {
            case (#ok(listing)) {
                // 거래 내역 추가
                addTransaction(#NFTSale, ?tokenId, caller, listing.price);
                #ok(listing)
            };
            case (#err(error)) { #err(error) };
        }
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

    // 스테이킹 관련 인터페이스
    public query func isNFTStaked(tokenId: Nat) : async Bool {
        stakingManager.isStaked(tokenId)
    };

    public query func getEstimatedStakingReward(tokenId: Nat) : async Result.Result<Nat, Staking.StakingError> {
        stakingManager.getEstimatedReward(tokenId)
    };

    // ICRC-3 인터페이스 타입
    type ICRC3Account = {
        owner : Principal;
        subaccount : ?Blob;
    };

    type ICRC3Transaction = {
        kind : Text;
        timestamp : Int;
        from : ?ICRC3Account;
        to : ?ICRC3Account;
        token_ids : [Nat];
        memo : ?Blob;
        amount : ?Nat;  // 거래 금액 추가
    };

    type GetTransactionsRequest = {
        start : ?Nat;
        length : ?Nat;
        account : ?ICRC3Account;
    };

    type GetTransactionsResponse = {
        transactions : [ICRC3Transaction];
        total : Nat;
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

    // 스테이킹 관련 인터페이스
    public shared({ caller }) func stakeNFT(tokenId: Nat) : async Result.Result<(), Staking.StakingError> {
        switch(stakingManager.stakeNFT(caller, tokenId)) {
            case (#ok()) {
                // 스테이킹 거래 내역 추가
                addTransaction(#Stake, ?tokenId, caller, 0);
                #ok()
            };
            case (#err(error)) { #err(error) };
        }
    };

    public shared({ caller }) func unstakeNFT(tokenId: Nat) : async Result.Result<Nat, Staking.StakingError> {
        switch(stakingManager.unstakeNFT(caller, tokenId)) {
            case (#ok(reward)) {
                // 언스테이킹 거래 내역 추가
                addTransaction(#Unstake, ?tokenId, caller, reward);
                #ok(reward)
            };
            case (#err(error)) { #err(error) };
        }
    };

    public shared({ caller }) func claimStakingReward(tokenId: Nat) : async Result.Result<Nat, Staking.StakingError> {
        switch(stakingManager.claimReward(caller, tokenId)) {
            case (#ok(reward)) {
                // 스테이킹 보상 수령 거래 내역 추가
                addTransaction(#StakingReward, ?tokenId, caller, reward);
                #ok(reward)
            };
            case (#err(error)) { #err(error) };
        }
    };

    public query func getStakingInfo(tokenId: Nat) : async ?Staking.StakingInfo {
        stakingManager.getStakingInfo(tokenId)
    };

    public query func getStakedNFTs(owner: Principal) : async [Nat] {
        stakingManager.getStakedNFTs(owner)
    };
};
