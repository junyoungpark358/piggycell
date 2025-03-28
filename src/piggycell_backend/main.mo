import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Option "mo:base/Option";
import Order "mo:base/Order";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import TrieMap "mo:base/TrieMap";
import ChargerHubNFT "./ChargerHubNFT";
import Admin "./Admin";
import Market "./Market";
import PiggyCellToken "./PiggyCellToken";
import Staking "./Staking";
import RevenueDistribution "./RevenueDistribution";

actor Main {
    private let nft = ChargerHubNFT.NFTCanister(Principal.fromActor(Main));
    private let adminManager = Admin.AdminManager();
    private let token = PiggyCellToken.PiggyCellToken();
    private let stakingManager = Staking.StakingManager(token, nft);
    private let marketManager = Market.MarketManager(token, nft, Principal.fromActor(Main), adminManager);
    private let revenueManager = RevenueDistribution.RevenueDistributionManager(token, stakingManager, adminManager);
    
    // Value 타입 별칭
    type Value = ChargerHubNFT.Value;

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
    // 누적 집계를 위한 변수 추가
    private var cachedActiveUserCount: Nat = 0;
    private var cachedTotalVolume: Nat = 0;
    private var cachedTotalChargers: Nat = 0;
    private var cachedActiveLocations = TrieMap.TrieMap<Text, Bool>(Text.equal, Text.hash);
    // NFT 소유자 추적을 위한 변수 추가
    private let nftOwners = TrieMap.TrieMap<Principal, Bool>(Principal.equal, Principal.hash);
    private var cachedNFTOwnerCount: Nat = 0;

    // 초기화 함수 추가
    private func initializeStats() {
        // 기존 트랜잭션에서 거래량 계산
        cachedTotalVolume := 0;
        for (tx in transactions.vals()) {
            switch (tx.txType) {
                case (#NFTSale) { cachedTotalVolume += tx.amount };
                case (_) {};
            };
        };
        Debug.print("초기 통계 계산 완료: 총 거래량 = " # Nat.toText(cachedTotalVolume));
        
        // 활성 사용자 통계 초기화
        initializeActiveUserStats();
        
        // 충전기 및 위치 통계 초기화
        initializeNFTStats();
    };
    
    // 충전기 및 위치 통계 초기화 함수
    private func initializeNFTStats() {
        cachedTotalChargers := 0;
        // TrieMap을 비우는 대신 새로 생성
        cachedActiveLocations := TrieMap.TrieMap<Text, Bool>(Text.equal, Text.hash);
        
        // 초기화는 간단하게 0으로 설정
        // 실제 값은 NFT가 생성될 때마다 업데이트됨
        Debug.print("NFT 통계 초기화 완료");
    };
    
    // NFT 민팅 시 통계 업데이트
    private func updateNFTStats(metadata: [(Text, Value)]) {
        for ((key, value) in metadata.vals()) {
            switch (key, value) {
                case ("location", #Text(location)) {
                    if (location != "") {
                        cachedActiveLocations.put(location, true);
                    };
                };
                case ("chargerCount", #Nat(count)) {
                    cachedTotalChargers += count;
                };
                case _ {};
            };
        };
    };
    
    // NFT 통계 조회 공개 함수
    public query func getNFTStats() : async { totalChargers: Nat; activeLocations: Nat } {
        {
            totalChargers = cachedTotalChargers;
            activeLocations = cachedActiveLocations.size();
        }
    };

    // 관리자 전용: 통계 데이터 재계산 함수
    public shared({ caller }) func recalculateNFTStats() : async Result.Result<(), Text> {
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            return #err("관리자만 통계 데이터를 재계산할 수 있습니다.");
        };
        
        // 통계 데이터 초기화
        cachedTotalChargers := 0;
        cachedActiveLocations := TrieMap.TrieMap<Text, Bool>(Text.equal, Text.hash);
        
        // 모든 토큰 ID 목록 가져오기 (전체 토큰 목록)
        let allTokens = nft.icrc7_tokens(null, null);
        Debug.print("NFT 통계 재계산 시작: 총 " # Nat.toText(allTokens.size()) # "개의 NFT 확인");
        
        // 모든 토큰의 메타데이터를 조회하여 통계 재계산
        for (tokenId in allTokens.vals()) {
            let metadataResult = nft.icrc7_token_metadata([tokenId]);
            
            if (metadataResult.size() > 0) {
                switch (metadataResult[0]) {
                    case (?metadata) {
                        for ((key, value) in metadata.vals()) {
                            switch (key, value) {
                                case ("piggycell:location", #Text(location)) {
                                    if (location != "") {
                                        cachedActiveLocations.put(location, true);
                                    };
                                };
                                case ("piggycell:charger_count", #Nat(count)) {
                                    cachedTotalChargers += count;
                                    Debug.print("토큰 #" # Nat.toText(tokenId) # " - piggycell:charger_count: " # Nat.toText(count));
                                };
                                case ("location", #Text(location)) {
                                    if (location != "") {
                                        cachedActiveLocations.put(location, true);
                                    };
                                };
                                case ("chargerCount", #Nat(count)) {
                                    cachedTotalChargers += count;
                                    Debug.print("토큰 #" # Nat.toText(tokenId) # " - chargerCount: " # Nat.toText(count));
                                };
                                case _ {};
                            };
                        };
                    };
                    case (null) {
                        // 메타데이터가 없는 경우 무시
                        Debug.print("토큰 #" # Nat.toText(tokenId) # "의 메타데이터 없음");
                    };
                };
            };
        };
        
        Debug.print("통계 데이터 재계산 완료: 총 충전기 = " # Nat.toText(cachedTotalChargers) # ", 활성 위치 = " # Nat.toText(cachedActiveLocations.size()));
        return #ok();
    };

    // NFT ID를 저장하는 순서화된 배열 추가
    private var sortedNFTIds = Buffer.Buffer<Nat>(0);
    
    // 맞춤형 해시 함수 구현
    private func natHash(n: Nat) : Hash.Hash {
        Text.hash(Nat.toText(n))
    };
    
    // NFT 상태를 추적하는 맵 추가
    private let nftStatuses = TrieMap.TrieMap<Nat, Text>(Nat.equal, natHash);

    // NFT 상태 업데이트 함수
    private func updateNFTStatus(tokenId: Nat, status: Text) {
        nftStatuses.put(tokenId, status);
    };

    // 정렬된 상태로 트랜잭션 추가
    private func addTransaction(txType: TransactionType, nftId: ?Nat, user: Principal, amount: Nat) {
        // 기존 거래 내역 추가
        let tx = {
            txType = txType;
            nftId = nftId;
            user = user;
            amount = amount;
            timestamp = Time.now();
        };
        transactions.add(tx);

        // 거래 유형에 따른 처리
        switch (txType) {
            case (#NFTSale) { cachedTotalVolume += amount };
            case (_) {};
        };

        // Mint 타입이 아닐 때만 활성 사용자로 기록
        switch (txType) {
            case (#Mint) { };
            case (_) { 
                let prevActivity = activeUsers.get(user);
                let thirtyDaysAgo = Time.now() - (30 * 24 * 60 * 60 * 1_000_000);
                
                // 사용자 활동 시간만 업데이트
                activeUsers.put(user, Time.now());
                
                // 소유자 통계는 initializeActiveUserStats에서 계산하므로 여기서는 계산하지 않음
            };
        };
    };

    // 활성 사용자 수 조회 (최근 30일 이내 거래한 사용자) - 캐시된 값 반환
    public query func getActiveUsersCount() : async Nat {
        cachedActiveUserCount
    };

    // NFT 소유자 수 조회 - 캐시된 값 반환
    public query func getNFTOwnerCount() : async Nat {
        cachedNFTOwnerCount
    };

    // 총 거래액 조회 - 캐시된 값 반환
    public query func getTotalVolume() : async Nat {
        cachedTotalVolume
    };

    // 거래 내역 조회 (페이지네이션)
    public query func getTransactions(page: Nat, limit: Nat) : async TransactionPage {
        let txs = Buffer.toArray(transactions);
        let total = txs.size();

        // 시작 인덱스 계산 (최신 거래부터 표시)
        let startIndex = if (total == 0) { 0 } else {
            let offset = page * limit;
            if (offset >= total) { 
                0 
            } else { 
                // 안전한 계산을 위한 정의
                let remaining = Nat.min(offset + limit, total);
                if (total >= remaining) {
                    total - remaining
                } else {
                    0
                }
            };
        };

        // 페이지 크기 계산
        let pageSize = if (total == 0) { 0 } else {
            // 페이지에 따른 오프셋 계산
            let offset = page * limit;
            // 안전한 계산을 위한 로직
            if (offset >= total) {
                0
            } else {
                // 남은 항목 수 계산 (언더플로우 방지)
                let remaining = total - offset;
                // 페이지 크기 제한
                Nat.min(remaining, limit)
            }
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
                    case (#Mint) { "NFT 발행" };
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
        let second = secondsInDay % 60;
        
        // 문자열 생성
        let yearStr = Nat.toText(Nat64.toNat(Nat64.fromIntWrap(year)));
        let monthStr = if (month < 10) "0" # Nat.toText(month) else Nat.toText(month);
        let dayStr = if (day < 10) "0" # Nat.toText(day) else Nat.toText(day);
        let hourStr = if (Nat64.toNat(Nat64.fromIntWrap(hour)) < 10) "0" # Nat.toText(Nat64.toNat(Nat64.fromIntWrap(hour))) 
                     else Nat.toText(Nat64.toNat(Nat64.fromIntWrap(hour)));
        let minuteStr = if (Nat64.toNat(Nat64.fromIntWrap(minute)) < 10) "0" # Nat.toText(Nat64.toNat(Nat64.fromIntWrap(minute))) 
                       else Nat.toText(Nat64.toNat(Nat64.fromIntWrap(minute)));
        let secondStr = if (Nat64.toNat(Nat64.fromIntWrap(second)) < 10) "0" # Nat.toText(Nat64.toNat(Nat64.fromIntWrap(second))) 
                       else Nat.toText(Nat64.toNat(Nat64.fromIntWrap(second)));
        
        yearStr # "-" # monthStr # "-" # dayStr # " " # hourStr # ":" # minuteStr # ":" # secondStr
    };

    // ICRC-7 표준 메소드
    public query func icrc7_collection_metadata() : async [(Text, Value)] {
        nft.icrc7_collection_metadata()
    };

    public query func icrc7_symbol() : async Text {
        nft.icrc7_symbol()
    };

    public query func icrc7_name() : async Text {
        nft.icrc7_name()
    };

    public query func icrc7_description() : async ?Text {
        nft.icrc7_description()
    };

    public query func icrc7_logo() : async ?Text {
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

    public query func icrc7_token_metadata(token_ids: [Nat]) : async [?[(Text, Value)]] {
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

    public query func icrc1_balance_of(account : PiggyCellToken.Account) : async Nat {
        token.icrc1_balance_of(account)
    };

    public shared({ caller }) func icrc1_transfer(args : PiggyCellToken.TransferArgs) : async { #Ok : Nat; #Err : PiggyCellToken.TransferError } {
        token.icrc1_transfer(caller, args)
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
        // ICRC-3 표준 확장 - 내부 처리용 필드
        sort_by : ?Text;  // 정렬 필드 (timestamp, kind 등)
        sort_direction : ?Text;  // 정렬 방향 (asc, desc)
        search_query : ?Text;  // 검색어
        type_filter : ?[Text];  // 거래 유형 필터 (mint, transfer, stake 등)
    };

    type GetTransactionsResponse = {
        transactions : [ICRC3Transaction];
        total : Nat;
    };

    // 트랜잭션을 ICRC3Transaction 형식으로 변환하는 헬퍼 함수
    private func convertToICRC3Transaction(tx: Transaction) : ICRC3Transaction {
        {
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
                case (#NFTSale) { ?{ owner = tx.user; subaccount = null } };
                case (#Stake) { ?{ owner = Principal.fromActor(Main); subaccount = null } };
                case (#Unstake) { ?{ owner = tx.user; subaccount = null } };
                case (#StakingReward) { ?{ owner = tx.user; subaccount = null } };
            };
            token_ids = switch (tx.nftId) {
                case (null) [];
                case (?id) [id];
            };
            memo = null;
            amount = ?tx.amount;
        }
    };

    // 검색어로 트랜잭션을 필터링하는 함수
    private func filterBySearchQuery(tx: ICRC3Transaction, queryText: Text) : Bool {
        // |exclude_type 플래그 확인
        let (actualQuery, excludeType) = if (Text.contains(queryText, #text "|exclude_type")) {
            let parts = Iter.toArray(Text.split(queryText, #text "|"));
            (parts[0], true)
        } else {
            (queryText, false)
        };
        
        let queryLower = Text.toLowercase(actualQuery);
        
        Debug.print("필터링 검사 시작: 쿼리='" # actualQuery # "', 트랜잭션 종류='" # tx.kind # "', 유형 검색 제외=" # (if (excludeType) "true" else "false"));
        
        // 거래 유형 검색 (트랜잭션 종류)
        if (not excludeType and Text.contains(Text.toLowercase(tx.kind), #text queryLower)) {
            Debug.print(">> 거래 유형 일치: " # tx.kind);
            return true;
        };
        
        // 토큰 ID 검색
        for (id in tx.token_ids.vals()) {
            let idText = Int.toText(id);
            Debug.print(">> 토큰 ID 검사: " # idText);
            if (Text.contains(idText, #text queryLower)) {
                Debug.print(">>> 토큰 ID 일치: " # idText);
                return true;
            };
        };
        
        // 주소 검색 (보내는 주소 / 받는 주소)
        switch (tx.from) {
            case (null) { Debug.print(">> 보내는 주소 없음"); };
            case (?account) {
                let principalText = Principal.toText(account.owner);
                Debug.print(">> 보내는 주소 검사: " # principalText);
                if (Text.contains(Text.toLowercase(principalText), #text queryLower)) {
                    Debug.print(">>> 보내는 주소 일치");
                    return true;
                };
            };
        };
        
        switch (tx.to) {
            case (null) { Debug.print(">> 받는 주소 없음"); };
            case (?account) {
                let principalText = Principal.toText(account.owner);
                Debug.print(">> 받는 주소 검사: " # principalText);
                if (Text.contains(Text.toLowercase(principalText), #text queryLower)) {
                    Debug.print(">>> 받는 주소 일치");
                    return true;
                };
            };
        };
        
        Debug.print(">> 필터링 검사 결과: 일치하는 항목 없음");
        false
    };

    // 거래 유형 필터링 함수
    private func filterByType(tx: ICRC3Transaction, typeFilters: [Text]) : Bool {
        if (typeFilters.size() == 0) {
            return true;  // 필터가 없으면 모든 유형 포함
        };
        
        for (typeFilter in typeFilters.vals()) {
            if (typeFilter == tx.kind) {
                return true;
            };
        };
        
        false
    };

    // ICRC3Transaction 정렬 함수
    private func sortICRC3Transactions(
        transactions: [ICRC3Transaction], 
        sortBy: Text,
        sortDirection: Text
    ) : [ICRC3Transaction] {
        let sorted = Array.thaw<ICRC3Transaction>(transactions);
        
        // 정렬 로직
        if (sortBy == "timestamp") {
            if (sortDirection == "asc") {
                Array.sortInPlace(sorted, func(a: ICRC3Transaction, b: ICRC3Transaction) : Order.Order {
                    if (a.timestamp < b.timestamp) { #less } 
                    else if (a.timestamp > b.timestamp) { #greater } 
                    else { #equal }
                });
            } else {
                Array.sortInPlace(sorted, func(a: ICRC3Transaction, b: ICRC3Transaction) : Order.Order {
                    if (a.timestamp > b.timestamp) { #less } 
                    else if (a.timestamp < b.timestamp) { #greater } 
                    else { #equal }
                });
            };
        } else if (sortBy == "kind") {
            if (sortDirection == "asc") {
                Array.sortInPlace(sorted, func(a: ICRC3Transaction, b: ICRC3Transaction) : Order.Order {
                    Text.compare(a.kind, b.kind)
                });
            } else {
                Array.sortInPlace(sorted, func(a: ICRC3Transaction, b: ICRC3Transaction) : Order.Order {
                    switch (Text.compare(a.kind, b.kind)) {
                        case (#less) { #greater };
                        case (#equal) { #equal };
                        case (#greater) { #less };
                    }
                });
            };
        };
        // 기본적으로 timestamp 내림차순 적용 (명시적으로 지정되지 않은 필드)
        
        Array.freeze<ICRC3Transaction>(sorted)
    };

    // 트랜잭션 히스토리 조회 함수
    public query func get_transaction_history(request : GetTransactionsRequest) : async GetTransactionsResponse {
        let start = Option.get(request.start, 0);
        let length = Option.get(request.length, 10);
        let account = request.account;
        let searchQuery = request.search_query;
        let typeFilter = request.type_filter;
        let sortBy = Option.get(request.sort_by, "timestamp");
        let sortDirection = Option.get(request.sort_direction, "desc");
        
        // Step 1: 기본 트랜잭션을 ICRC3 형식으로 변환
        let allICRC3Txs = Buffer.Buffer<ICRC3Transaction>(transactions.size());
        for (tx in transactions.vals()) {
            allICRC3Txs.add(convertToICRC3Transaction(tx));
        };
        
        // Step 2: 필터링 적용
        let filteredTxs = Buffer.Buffer<ICRC3Transaction>(0);
        
        for (tx in allICRC3Txs.vals()) {
            var shouldInclude = true;
            
            // 계정 필터링
            switch (account) {
                case (null) { /* 계정 필터가 없으면 모든 거래 포함 */ };
                case (?acc) {
                    let fromMatch = switch (tx.from) {
                        case (null) false;
                        case (?from) from.owner == acc.owner;
                    };
                    
                    let toMatch = switch (tx.to) {
                        case (null) false;
                        case (?to) to.owner == acc.owner;
                    };
                    
                    if (not fromMatch and not toMatch) {
                        shouldInclude := false;
                    };
                };
            };
            
            // 검색어 필터링
            switch (searchQuery) {
                case (null) { /* 검색어가 없으면 모든 거래 포함 */ };
                case (?queryText) {
                    if (not filterBySearchQuery(tx, queryText)) {
                        shouldInclude := false;
                    };
                };
            };
            
            // 거래 유형 필터링
            switch (typeFilter) {
                case (null) { /* 유형 필터가 없으면 모든 거래 포함 */ };
                case (?types) {
                    if (not filterByType(tx, types)) {
                        shouldInclude := false;
                    };
                };
            };
            
            if (shouldInclude) {
                filteredTxs.add(tx);
            };
        };
        
        // Step 3: 정렬 적용
        let sortedTxs = sortICRC3Transactions(Buffer.toArray(filteredTxs), sortBy, sortDirection);
        
        // Step 4: 페이지네이션 적용
        let total = sortedTxs.size();
        let end = Nat.min(start + length, total);
        let pageItems = Buffer.Buffer<ICRC3Transaction>(0);
        
        var j = start;
        while (j < end) {
            pageItems.add(sortedTxs[j]);
            j += 1;
        };
        
        {
            transactions = Buffer.toArray(pageItems);
            total = total;
        }
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
        
        // 거래 내역 추가 및 활성 사용자 업데이트
        addTransaction(#Mint, ?args.token_id, caller, 0);
        
        // 활성 사용자 업데이트 - 직접 구현
        let prevActivity = activeUsers.get(caller);
        let thirtyDaysAgo = Time.now() - (30 * 24 * 60 * 60 * 1_000_000);
        
        // 사용자 활동 시간만 업데이트
        activeUsers.put(caller, Time.now());
        
        // NFT 메타데이터에서 통계 정보 추출하여 업데이트
        for ((key, value) in args.metadata.vals()) {
            switch (key, value) {
                case ("location", #Text(location)) {
                    if (location != "") {
                        cachedActiveLocations.put(location, true);
                    };
                };
                case ("chargerCount", #Nat(count)) {
                    cachedTotalChargers += count;
                };
                case _ {};
            };
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

        // NFT 민팅 - ChargerHubNFT의 mint 함수가 async가 아니므로 await 없이 호출
        switch(nft.mint(caller, mintArgs)) {
            case (#ok(token_id)) {
                // 생성된 NFT ID를 정렬된 배열의 맨 앞에 추가 (최신 NFT를 맨 앞에 배치)
                sortedNFTIds.insert(0, token_id);

                // NFT 상태를 "created"로 설정
                updateNFTStatus(token_id, "created");

                // NFT 마켓 등록인 경우
                if (transferType == "market") {
                    switch(price) {
                        case (?listing_price) {
                            // NFT 소유자를 마켓으로 직접 변경
                            switch(nft.updateOwner(caller, token_id, Principal.fromActor(Main))) {
                                case (#ok()) {
                                    // 마켓에 리스팅
                                    switch(marketManager.listNFT(caller, token_id, listing_price)) {
                                        case (#ok()) { 
                                            // 리스팅 성공 시 상태를 "listed"로 변경
                                            updateNFTStatus(token_id, "listed");
                                            #ok(token_id) 
                                        };
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
        };
    };

    public shared({ caller }) func updateMetadata(token_id: Nat, new_metadata: [(Text, Value)]) : async Result.Result<(), Text> {
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
        // 각 토큰이 스테이킹 상태인지 확인하고 전송을 제한
        let results = Buffer.Buffer<?ChargerHubNFT.TransferResult>(args.size());
        
        for (arg in args.vals()) {
            // 스테이킹 상태 확인
            if (stakingManager.isStaked(arg.token_id)) {
                // 스테이킹 상태면 전송 불가 에러 반환
                results.add(?#Err(#GenericError({
                    error_code = 100;
                    message = "Token is currently staked and cannot be transferred";
                })));
            } else {
                // 스테이킹 상태가 아니면 전송 진행
                // 여기서는 결과를 null로 설정하고 실제 전송은 아래에서 수행
                results.add(null);
            };
        };
        
        // 스테이킹되지 않은 토큰만 필터링
        var nonStakedArgs = Buffer.Buffer<ChargerHubNFT.TransferArg>(args.size());
        var resultIndices = Buffer.Buffer<Nat>(args.size());
        
        var i = 0;
        for (arg in args.vals()) {
            switch (results.get(i)) {
                case (null) {
                    // 스테이킹되지 않은 토큰: 전송 가능
                    nonStakedArgs.add(arg);
                    resultIndices.add(i);
                };
                case (?_) {
                    // 스테이킹된 토큰: 이미 에러 처리됨
                };
            };
            i += 1;
        };
        
        // 전송 가능한 토큰이 있으면 실제 전송 수행
        if (nonStakedArgs.size() > 0) {
            let transferResults = nft.icrc7_transfer(caller, Buffer.toArray(nonStakedArgs));
            
            // 결과 병합
            var j = 0;
            for (transferResult in transferResults.vals()) {
                let originalIndex = resultIndices.get(j);
                results.put(originalIndex, transferResult);
                j += 1;
            };
        };
        
        Buffer.toArray(results)
    };

    // 마켓 관련 인터페이스
    public shared({ caller }) func listNFT(tokenId: Nat, price: Nat) : async Result.Result<(), Market.ListingError> {
        marketManager.listNFT(caller, tokenId, price)
    };

    public shared({ caller }) func delistNFT(tokenId: Nat) : async Result.Result<(), Market.ListingError> {
        switch(marketManager.delistNFT(caller, tokenId)) {
            case (#ok()) {
                // NFT 소유자 확인
                let ownerResult = nft.icrc7_owner_of([tokenId]);
                
                if (ownerResult.size() > 0) {
                    switch (ownerResult[0]) {
                        case (?account) {
                            // 소유자가 백엔드 캐니스터가 아니면 "sold" 상태로 설정
                            if (account.owner != Principal.fromActor(Main)) {
                                updateNFTStatus(tokenId, "sold");
                            } else {
                                // 소유자가 백엔드 캐니스터이면 "created" 상태로 설정
                                updateNFTStatus(tokenId, "created");
                            };
                        };
                        case (null) {};
                    };
                };
                
                #ok()
            };
            case (#err(error)) { #err(error) };
        }
    };

    public shared({ caller }) func buyNFT(tokenId: Nat) : async Result.Result<Market.Listing, Market.ListingError> {
        switch(marketManager.buyNFT(caller, tokenId)) {
            case (#ok(listing)) {
                // 거래 내역 추가
                addTransaction(#NFTSale, ?tokenId, caller, listing.price);
                
                // NFT 상태를 "sold"로 변경
                updateNFTStatus(tokenId, "sold");
                
                // NFT 소유자 통계 업데이트 - 새 소유자인 경우에만 카운트 증가
                switch (nftOwners.get(caller)) {
                    case (null) {
                        // 새 소유자인 경우
                        nftOwners.put(caller, true);
                        cachedNFTOwnerCount += 1;
                        Debug.print("새로운 NFT 소유자 추가: " # Principal.toText(caller) # ", 현재 소유자 수: " # Nat.toText(cachedNFTOwnerCount));
                    };
                    case (?_) {
                        // 이미 소유자인 경우
                    };
                };
                
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

    public query func getSoldNFTs(start: ?Nat, limit: Nat) : async Market.PageResult {
        marketManager.getSoldNFTs(start, limit)
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

    // 총 스테이킹된 NFT 개수 조회 API 추가
    public query func getTotalStakedCount() : async Nat {
        stakingManager.getTotalStakedCount()
    };

    // 관리자용 토큰 발행/소각 기능
    public shared({ caller }) func mint_tokens(to : PiggyCellToken.Account, amount : Nat) : async { #Ok : Nat; #Err : Text } {
        // 관리자 권한 로깅 추가
        Debug.print("mint_tokens 함수 호출, 호출자 Principal ID: " # Principal.toText(caller));
        let isSuperAdmin = adminManager.isSuperAdmin(caller);
        let isAdmin = adminManager.isAdmin(caller);
        Debug.print("슈퍼관리자 여부: " # (if (isSuperAdmin) "true" else "false"));
        Debug.print("일반관리자 여부: " # (if (isAdmin) "true" else "false"));
        
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            Debug.print("권한 검증 실패: 관리자 권한이 없음");
            return #Err("관리자만 토큰을 발행할 수 있습니다.");
        };
        Debug.print("권한 검증 성공: 토큰 발행 시작");
        token.mint(to, amount)
    };

    public shared({ caller }) func burn_tokens(from : PiggyCellToken.Account, amount : Nat) : async { #Ok : Nat; #Err : Text } {
        // 관리자 권한 로깅 추가
        Debug.print("burn_tokens 함수 호출, 호출자 Principal ID: " # Principal.toText(caller));
        let isSuperAdmin = adminManager.isSuperAdmin(caller);
        let isAdmin = adminManager.isAdmin(caller);
        Debug.print("슈퍼관리자 여부: " # (if (isSuperAdmin) "true" else "false"));
        Debug.print("일반관리자 여부: " # (if (isAdmin) "true" else "false"));
        
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            Debug.print("권한 검증 실패: 관리자 권한이 없음");
            return #Err("관리자만 토큰을 소각할 수 있습니다.");
        };
        Debug.print("권한 검증 성공: 토큰 소각 시작");
        token.burn(from, amount)
    };

    // 스테이킹 관련 인터페이스
    public shared({ caller }) func stakeNFT(tokenId: Nat) : async Result.Result<(), Staking.StakingError> {
        // NFT 가격 정보 가져오기
        let metadataResult = nft.icrc7_token_metadata([tokenId]);
        var price: Nat = 0;
        
        if (metadataResult.size() > 0) {
            switch (metadataResult[0]) {
                case (?metadata) {
                    for ((key, value) in metadata.vals()) {
                        if (key == "price") {
                            switch (value) {
                                case (#Nat(p)) { price := p };
                                case (_) {};
                            };
                        };
                    };
                };
                case (null) {};
            };
        };
        
        switch(stakingManager.stakeNFT(caller, tokenId, price)) {
            case (#ok()) {
                // 스테이킹 거래 내역 추가
                addTransaction(#Stake, ?tokenId, caller, 0);
                
                // NFT 상태를 "staked"로 변경
                updateNFTStatus(tokenId, "staked");
                
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
                
                // NFT 상태를 "sold"로 변경 (언스테이킹 시 소유자에게 돌아가므로)
                updateNFTStatus(tokenId, "sold");
                
                // sortedNFTIds에서 tokenId 제거 후 맨 앞에 추가하여 최신 상태로 만들기
                // 기존 배열에서 동일한 tokenId 위치 찾기
                var position: ?Nat = null;
                var i = 0;
                label findPos for (id in sortedNFTIds.vals()) {
                    if (id == tokenId) {
                        position := ?i;
                        break findPos;
                    };
                    i := i + 1;
                };
                
                // 기존 tokenId가 있으면 제거
                switch (position) {
                    case (?pos) {
                        ignore sortedNFTIds.remove(pos);
                    };
                    case (null) {};
                };
                
                // 최신 상태의 NFT를 맨 앞에 추가
                sortedNFTIds.insert(0, tokenId);
                
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

    // 정렬된 NFT ID 목록을 반환하는 함수 추가
    public query func getSortedNFTs() : async [Nat] {
        let sortedNFTs = Buffer.toArray(sortedNFTIds);
        return sortedNFTs;
    };

    // NFT 메타데이터 타입 정의
    type NFTMetadata = {
        id: Nat;
        location: ?Text;
        chargerCount: ?Nat;
        owner: ?Principal;
        status: Text;
        price: ?Nat;
        statusChangedAt: Int;
    };

    // 페이지네이션 요청 파라미터 타입 정의
    public type PaginationRequest = {
        page: Nat;
        pageSize: Nat;
        sortBy: Text;
        sortDirection: Text;
        searchQuery: Text;
    };

    // 페이지네이션 응답 타입 정의
    public type PaginationResponse = {
        nfts: [NFTMetadata];
        totalCount: Nat;
    };

    // 페이지네이션된 NFT 목록을 반환하는 함수
    public query func getNFTsByPage(req: PaginationRequest) : async PaginationResponse {
        // 1. 모든 NFT 데이터 가져오기
        let allNFTs = Buffer.Buffer<NFTMetadata>(0);
        let ids = Buffer.toArray(sortedNFTIds);
        
        // 모든 NFT 데이터를 먼저 수집
        for (id in ids.vals()) {
            let ownerResult = nft.icrc7_owner_of([id]);
            let metadataResult = nft.icrc7_token_metadata([id]);
            
            if (ownerResult.size() > 0 and metadataResult.size() > 0) {
                let owner = ownerResult[0];
                let metadata = metadataResult[0];
                
                if (Option.isSome(owner) and Option.isSome(metadata)) {
                    let isListed = marketManager.isListed(id);
                    let isStaked = stakingManager.isStaked(id);
                    
                    // 상태 결정 - nftStatuses에서 먼저 확인하고 없으면 기존 로직 사용
                    let status = switch (nftStatuses.get(id)) {
                        case (?storedStatus) { storedStatus };
                        case (null) {
                            if (isListed) { "listed" } 
                            else if (isStaked) { "staked" }
                            else { 
                                // 소유자가 백엔드 캐니스터가 아닌 경우 "sold" 상태로 설정
                                switch (owner) {
                                    case (?ownerAccount) {
                                        if (ownerAccount.owner != Principal.fromActor(Main)) {
                                            "sold"
                                        } else {
                                            "created"
                                        }
                                    };
                                    case (null) { "created" };
                                }
                            }
                        };
                    };
                    
                    // 메타데이터에서 필요한 정보 추출
                    var location: ?Text = null;
                    var chargerCount: ?Nat = null;
                    var price: ?Nat = null;
                    
                    switch (metadata) {
                        case (?meta) {
                            for ((key, value) in meta.vals()) {
                                if (key == "location" or key == "piggycell:location") {
                                    switch (value) {
                                        case (#Text(text)) { location := ?text };
                                        case (_) {};
                                    };
                                } else if (key == "chargerCount" or key == "piggycell:charger_count") {
                                    switch (value) {
                                        case (#Nat(nat)) { chargerCount := ?nat };
                                        case (_) {};
                                    };
                                } else if (key == "price") {
                                    switch (value) {
                                        case (#Nat(nat)) { price := ?nat };
                                        case (_) {};
                                    };
                                };
                            };
                        };
                        case (null) {};
                    };
                    
                    // 상태에 따라 상태 변경 시간 결정
                    var statusChangedAt = Time.now(); // 기본값으로 현재 시간 설정
                    
                    if (isStaked) {
                        // 스테이킹된 경우, 스테이킹 시간 가져오기
                        let stakingInfo = stakingManager.getStakingInfo(id);
                        switch(stakingInfo) {
                            case (?info) {
                                statusChangedAt := info.stakedAt;
                            };
                            case (null) {};
                        };
                    } else if (marketManager.isListed(id)) {
                        // 리스팅된 경우, 리스팅 시간 가져오기
                        let listing = marketManager.getListing(id);
                        switch(listing) {
                            case (?l) {
                                statusChangedAt := l.listedAt;
                            };
                            case (null) {};
                        };
                    } else {
                        // 생성된 경우 또는 판매된 경우, 관련 트랜잭션 찾기
                        var foundTx = false;
                        label l for (tx in transactions.vals()) {
                            switch(tx.txType, tx.nftId) {
                                case (#NFTSale, ?nftId) {
                                    if (nftId == id) {
                                        statusChangedAt := tx.timestamp;
                                        foundTx := true;
                                        break l;
                                    };
                                };
                                case (#Unstake, ?nftId) {
                                    if (nftId == id) {
                                        statusChangedAt := tx.timestamp;
                                        foundTx := true;
                                        break l;
                                    };
                                };
                                case (#Mint, ?nftId) {
                                    if (nftId == id and not foundTx) {
                                        statusChangedAt := tx.timestamp;
                                        break l;
                                    };
                                };
                                case (_, _) {};
                            };
                        };
                    };
                    
                    let nftData: NFTMetadata = {
                        id = id;
                        location = location;
                        chargerCount = chargerCount;
                        owner = switch (owner) {
                            case (?acc) { ?acc.owner };
                            case (null) { null };
                        };
                        status = status;
                        price = price;
                        statusChangedAt = statusChangedAt;
                    };
                    
                    allNFTs.add(nftData);
                };
            };
        };
        
        // 2. 검색 로직 추가: 검색어가 있는 경우 필터링
        let searchQuery = req.searchQuery;
        let searchEnabled = searchQuery != "";
        var filteredNFTs = Buffer.toArray(allNFTs);
        
        if (searchEnabled) {
            // 검색어를 소문자로 변환하여 대소문자 구분 없이 검색
            let searchLower = Text.toLowercase(searchQuery);
            
            filteredNFTs := Array.filter<NFTMetadata>(filteredNFTs, func(nft) {
                // ID 검색
                let idStr = Nat.toText(nft.id);
                if (Text.contains(idStr, #text searchLower)) {
                    return true;
                };
                
                // 위치 검색
                switch (nft.location) {
                    case (?loc) {
                        let locLower = Text.toLowercase(loc);
                        if (Text.contains(locLower, #text searchLower)) {
                            return true;
                        };
                    };
                    case (null) {};
                };
                
                // 소유자 검색
                switch (nft.owner) {
                    case (?ownerPrincipal) {
                        let ownerText = Principal.toText(ownerPrincipal);
                        if (Text.contains(ownerText, #text searchLower)) {
                            return true;
                        };
                    };
                    case (null) {};
                };
                
                false
            });
        };
        
        // 3. 정렬 기준에 따라 데이터 정렬
        var sortedNFTs = filteredNFTs;
        
        // 정렬 기준과 방향에 따라 정렬
        switch (req.sortBy) {
            case "id" {
                sortedNFTs := Array.sort<NFTMetadata>(filteredNFTs, func(a, b) {
                    if (req.sortDirection == "asc") {
                        if (a.id < b.id) { #less }
                        else if (a.id > b.id) { #greater }
                        else { #equal }
                    } else {
                        if (a.id > b.id) { #less }
                        else if (a.id < b.id) { #greater }
                        else { #equal }
                    }
                });
            };
            case "location" {
                sortedNFTs := Array.sort<NFTMetadata>(filteredNFTs, func(a, b) {
                    let aLoc = switch (a.location) { case (?l) { l }; case (null) { "" } };
                    let bLoc = switch (b.location) { case (?l) { l }; case (null) { "" } };
                    
                    if (req.sortDirection == "asc") {
                        if (aLoc < bLoc) { #less }
                        else if (aLoc > bLoc) { #greater }
                        else { #equal }
                    } else {
                        if (aLoc > bLoc) { #less }
                        else if (aLoc < bLoc) { #greater }
                        else { #equal }
                    }
                });
            };
            case "chargerCount" {
                sortedNFTs := Array.sort<NFTMetadata>(filteredNFTs, func(a, b) {
                    let aCount = switch (a.chargerCount) { case (?c) { c }; case (null) { 0 } };
                    let bCount = switch (b.chargerCount) { case (?c) { c }; case (null) { 0 } };
                    
                    if (req.sortDirection == "asc") {
                        if (aCount < bCount) { #less }
                        else if (aCount > bCount) { #greater }
                        else { #equal }
                    } else {
                        if (aCount > bCount) { #less }
                        else if (aCount < bCount) { #greater }
                        else { #equal }
                    }
                });
            };
            case "price" {
                sortedNFTs := Array.sort<NFTMetadata>(filteredNFTs, func(a, b) {
                    let aPrice = switch (a.price) { case (?p) { p }; case (null) { 0 } };
                    let bPrice = switch (b.price) { case (?p) { p }; case (null) { 0 } };
                    
                    if (req.sortDirection == "asc") {
                        if (aPrice < bPrice) { #less }
                        else if (aPrice > bPrice) { #greater }
                        else { #equal }
                    } else {
                        if (aPrice > bPrice) { #less }
                        else if (aPrice < bPrice) { #greater }
                        else { #equal }
                    }
                });
            };
            case "status" {
                sortedNFTs := Array.sort<NFTMetadata>(filteredNFTs, func(a, b) {
                    if (req.sortDirection == "asc") {
                        if (a.status < b.status) { #less }
                        else if (a.status > b.status) { #greater }
                        else { #equal }
                    } else {
                        if (a.status > b.status) { #less }
                        else if (a.status < b.status) { #greater }
                        else { #equal }
                    }
                });
            };
            case "statusChangedAt" {
                sortedNFTs := Array.sort<NFTMetadata>(filteredNFTs, func(a, b) {
                    if (req.sortDirection == "asc") {
                        if (a.statusChangedAt < b.statusChangedAt) { #less }
                        else if (a.statusChangedAt > b.statusChangedAt) { #greater }
                        else { #equal }
                    } else {
                        if (a.statusChangedAt > b.statusChangedAt) { #less }
                        else if (a.statusChangedAt < b.statusChangedAt) { #greater }
                        else { #equal }
                    }
                });
            };
            // 기본 정렬은 ID 기준 내림차순
            case _ {
                sortedNFTs := Array.sort<NFTMetadata>(filteredNFTs, func(a, b) {
                    if (a.id > b.id) { #less }
                    else if (a.id < b.id) { #greater }
                    else { #equal }
                });
            };
        };
        
        // 3. 페이지네이션 적용
        let totalCount = sortedNFTs.size();
        let startIndex = Nat.max(0, Nat.min(totalCount, (req.page - 1) * req.pageSize));
        let endIndex = Nat.min(totalCount, startIndex + req.pageSize);
        
        // subArray 함수 구현 (Array.subArray는 없으므로 직접 구현)
        func subArray<T>(arr: [T], start: Nat, end: Nat) : [T] {
            let size = arr.size();
            if (start >= size or start >= end) {
                return [];
            };
            
            let realEnd = Nat.min(end, size);
            let result = Buffer.Buffer<T>(realEnd - start);
            
            var i = start;
            while (i < realEnd) {
                result.add(arr[i]);
                i += 1;
            };
            
            Buffer.toArray(result)
        };
        
        let paginatedNFTs = subArray(sortedNFTs, startIndex, endIndex);
        
        {
            nfts = paginatedNFTs;
            totalCount = totalCount;
        }
    };

    // 단일 NFT의 메타데이터 조회 함수
    public query func getNFTMetadata(tokenId: Nat) : async ?NFTMetadata {
        let ownerResult = nft.icrc7_owner_of([tokenId]);
        let metadataResult = nft.icrc7_token_metadata([tokenId]);
        
        if (ownerResult.size() == 0 or metadataResult.size() == 0) {
            return null;
        };
        
        let owner = ownerResult[0];
        let metadata = metadataResult[0];
        
        if (Option.isNull(owner) or Option.isNull(metadata)) {
            return null;
        };
        
        let isListed = marketManager.isListed(tokenId);
        let isStaked = stakingManager.isStaked(tokenId);
        
        // 상태 결정 - nftStatuses에서 먼저 확인하고 없으면 기존 로직 사용
        let status = switch (nftStatuses.get(tokenId)) {
            case (?storedStatus) { storedStatus };
            case (null) {
                if (isListed) { "listed" } 
                else if (isStaked) { "staked" }
                else { 
                    // 소유자가 백엔드 캐니스터가 아닌 경우 "sold" 상태로 설정
                    switch (owner) {
                        case (?ownerAccount) {
                            if (ownerAccount.owner != Principal.fromActor(Main)) {
                                "sold"
                            } else {
                                "created"
                            }
                        };
                        case (null) { "created" };
                    }
                }
            };
        };
        
        // 메타데이터에서 필요한 정보 추출
        var location: ?Text = null;
        var chargerCount: ?Nat = null;
        var price: ?Nat = null;
        
        switch (metadata) {
            case (?meta) {
                for ((key, value) in meta.vals()) {
                    if (key == "location" or key == "piggycell:location") {
                        switch (value) {
                            case (#Text(text)) { location := ?text };
                            case (_) {};
                        };
                    } else if (key == "chargerCount" or key == "piggycell:charger_count") {
                        switch (value) {
                            case (#Nat(nat)) { chargerCount := ?nat };
                            case (_) {};
                        };
                    } else if (key == "price") {
                        switch (value) {
                            case (#Nat(nat)) { price := ?nat };
                            case (_) {};
                        };
                    };
                };
            };
            case (null) {};
        };
        
        // 상태에 따라 상태 변경 시간 결정
        var statusChangedAt = Time.now(); // 기본값으로 현재 시간 설정
        
        if (isStaked) {
            // 스테이킹된 경우, 스테이킹 시간 가져오기
            let stakingInfo = stakingManager.getStakingInfo(tokenId);
            switch(stakingInfo) {
                case (?info) {
                    statusChangedAt := info.stakedAt;
                };
                case (null) {};
            };
        } else if (isListed) {
            // 리스팅된 경우, 리스팅 시간 가져오기
            let listing = marketManager.getListing(tokenId);
            switch(listing) {
                case (?l) {
                    statusChangedAt := l.listedAt;
                };
                case (null) {};
            };
        } else {
            // 생성된 경우 또는 판매된 경우, 관련 트랜잭션 찾기
            var foundTx = false;
            label l for (tx in transactions.vals()) {
                switch(tx.txType, tx.nftId) {
                    case (#NFTSale, ?nftId) {
                        if (nftId == tokenId) {
                            statusChangedAt := tx.timestamp;
                            foundTx := true;
                            break l;
                        };
                    };
                    case (#Unstake, ?nftId) {
                        if (nftId == tokenId) {
                            statusChangedAt := tx.timestamp;
                            foundTx := true;
                            break l;
                        };
                    };
                    case (#Mint, ?nftId) {
                        if (nftId == tokenId and not foundTx) {
                            statusChangedAt := tx.timestamp;
                            break l;
                        };
                    };
                    case (_, _) {};
                };
            };
        };
        
        ?{
            id = tokenId;
            location = location;
            chargerCount = chargerCount;
            owner = switch (owner) {
                case (?acc) { ?acc.owner };
                case (null) { null };
            };
            status = status;
            price = price;
            statusChangedAt = statusChangedAt;
        }
    };

    // 단일 NFT의 상태만 조회하는 함수
    public query func getNFTStatus(tokenId: Nat) : async Text {
        switch (nftStatuses.get(tokenId)) {
            case (?storedStatus) { 
                // 저장된 상태가 있으면 그대로 반환
                storedStatus 
            };
            case (null) {
                // 저장된 상태가 없으면 상태 계산
                if (marketManager.isListed(tokenId)) { 
                    "listed" 
                } else if (stakingManager.isStaked(tokenId)) { 
                    "staked" 
                } else { 
                    // 소유자 확인
                    let ownerResult = nft.icrc7_owner_of([tokenId]);
                    if (ownerResult.size() > 0) {
                        switch (ownerResult[0]) {
                            case (?ownerAccount) {
                                if (ownerAccount.owner != Principal.fromActor(Main)) {
                                    "sold"
                                } else {
                                    "created"
                                }
                            };
                            case (null) { "created" };
                        }
                    } else {
                        "created"
                    }
                }
            };
        }
    };

    // 여러 NFT의 상태를 한번에 조회하는 함수
    public query func getBatchNFTStatus(tokenIds: [Nat]) : async [Text] {
        Array.map<Nat, Text>(
            tokenIds,
            func(tokenId: Nat) : Text {
                switch (nftStatuses.get(tokenId)) {
                    case (?storedStatus) { storedStatus };
                    case (null) {
                        if (marketManager.isListed(tokenId)) { 
                            "listed" 
                        } else if (stakingManager.isStaked(tokenId)) { 
                            "staked" 
                        } else { 
                            // 소유자 확인
                            let ownerResult = nft.icrc7_owner_of([tokenId]);
                            if (ownerResult.size() > 0) {
                                switch (ownerResult[0]) {
                                    case (?ownerAccount) {
                                        if (ownerAccount.owner != Principal.fromActor(Main)) {
                                            "sold"
                                        } else {
                                            "created"
                                        }
                                    };
                                    case (null) { "created" };
                                }
                            } else {
                                "created"
                            }
                        }
                    };
                }
            }
        )
    };

    // NFT 상태를 직접 설정하는 관리자 함수
    public shared({ caller }) func setNFTStatus(tokenId: Nat, status: Text) : async Result.Result<(), Text> {
        if (not adminManager.isAdmin(caller) and not adminManager.isSuperAdmin(caller)) {
            return #err("관리자만 NFT 상태를 직접 설정할 수 있습니다.");
        };
        
        // 상태 값 검증
        if (status != "created" and status != "listed" and status != "sold" and status != "staked") {
            return #err("유효하지 않은 상태입니다. 'created', 'listed', 'sold', 'staked' 중 하나여야 합니다.");
        };
        
        // 상태 업데이트
        updateNFTStatus(tokenId, status);
        #ok()
    };

    // 새로운 토큰 보유자 및 거래 관련 조회 함수 추가
    public query func get_token_holders() : async [(Principal, Nat)] {
        token.get_token_holders()
    };

    public query func get_token_holders_count() : async Nat {
        token.get_token_holders_count()
    };

    public query func get_transaction_count() : async Nat {
        token.get_transaction_count()
    };

    public query func get_recent_transactions(count : Nat) : async [PiggyCellToken.Transaction] {
        token.get_recent_transactions(count)
    };

    // 마켓 캐니스터 Principal 반환
    public query func getMarketCanisterPrincipal() : async Principal {
        Principal.fromActor(Main)
    };

    // ICRC-2 토큰 승인 함수
    public shared({ caller }) func icrc2_approve(args: PiggyCellToken.ApproveArgs) : async { #Ok : Nat; #Err : PiggyCellToken.ApproveError } {
        Debug.print("icrc2_approve 함수 호출, 호출자 Principal ID: " # Principal.toText(caller));
        token.icrc2_approve(caller, args)
    };

    // ICRC-2 승인 정보 조회 함수
    public query func icrc2_allowance(args: PiggyCellToken.AllowanceArgs) : async PiggyCellToken.AllowanceResponse {
        token.icrc2_allowance(args)
    };
    
    //-----------------------------------------------------------------------------
    // 수익 배분 관련 인터페이스
    //-----------------------------------------------------------------------------
    
    // 관리자용: 수익 배분 실행 (금액 지정 가능)
    public shared({ caller }) func executeDistribution(amount: Nat) : async Result.Result<(), Text> {
        if (not adminManager.isAdmin(caller)) {
            return #err("Not authorized. Admin access required.");
        };
        
        try {
            let result = await revenueManager.executeDistribution(amount);
            switch (result) {
                case (#ok(_)) {
                    return #ok(());
                };
                case (#err(errorMsg)) {
                    return #err(errorMsg);
                };
            };
        } catch (e) {
            return #err("Error executing distribution: " # Debug.trap(Error.message(e)));
        };
    };

    // 관리자용: 모든 배분 기록 조회
    public query func getAllDistributionRecords() : async [RevenueDistribution.DistributionRecord] {
        revenueManager.getAllDistributionRecords()
    };

    // 사용자용: 자신의 수익 배분 내역 조회
    public query({ caller }) func getMyDistributionRecords() : async [RevenueDistribution.UserDistributionRecord] {
        revenueManager.getUserDistributionRecords(caller)
    };

    // 사용자/관리자용: 특정 NFT의 수익 배분 내역 조회
    public query func getNFTDistributionRecords(tokenId: Nat) : async [RevenueDistribution.UserDistributionRecord] {
        revenueManager.getTokenDistributionRecords(tokenId)
    };

    // 사용자의 보류 중인 수익 배분 조회
    public query func getPendingDistributions(user: Principal) : async [RevenueDistribution.UserDistributionRecord] {
        revenueManager.getPendingDistributions(user)
    };

    // 특정 배분 기록 조회
    public query func getDistributionRecord(id: Nat) : async ?RevenueDistribution.DistributionRecord {
        revenueManager.getDistributionRecord(id)
    };

    // 특정 배분 ID에 대한 유니크한 사용자 수 조회
    public query func getDistributionUniqueUserCount(distributionId: Nat) : async Nat {
        revenueManager.getDistributionUniqueUserCount(distributionId)
    };

    // ICRC-3 인터페이스 노출
    public query func icrc3_get_blocks(args: RevenueDistribution.GetBlocksArgs) : async RevenueDistribution.GetBlocksResult {
        revenueManager.icrc3_get_blocks(args)
    };

    public query func icrc3_get_tip_certificate() : async ?RevenueDistribution.DataCertificate {
        revenueManager.icrc3_get_tip_certificate()
    };

    public query func icrc3_supported_block_types() : async [{block_type: Text; url: Text}] {
        revenueManager.icrc3_supported_block_types()
    };

    // 페이지네이션 결과 타입 정의
    public type PaginatedResult<T> = {
        items: [T];
        nextStart: Nat;
        hasMore: Bool;
    };

    // 모든 수익 배분 거래 내역 조회 (페이지네이션 지원)
    public func getRevenueTransactions(start: Nat, limit: Nat) : async PaginatedResult<RevenueDistribution.UserDistributionRecord> {
        Debug.print("[Main] getRevenueTransactions 호출: start=" # Nat.toText(start) # ", limit=" # Nat.toText(limit));
        
        // 최대 조회 개수 제한
        let maxResults = Nat.min(limit, 20);
        
        // 수익 배분 트랜잭션 조회
        try {
            await revenueManager.getTransactions(start, maxResults)
        } catch(e) {
            Debug.print("[Main] getRevenueTransactions 오류: " # Error.message(e));
            // 오류 발생 시 빈 결과 반환
            return {
                items = [];
                nextStart = start;
                hasMore = false;
            };
        }
    };

    // 특정 사용자의 수익 배분 내역 조회 (페이지네이션 지원)
    public func getUserRevenueTransactions(user: Principal, start: Nat, limit: Nat) : async PaginatedResult<RevenueDistribution.UserDistributionRecord> {
        Debug.print("[Main] getUserRevenueTransactions 호출: user=" # Principal.toText(user) # ", start=" # Nat.toText(start) # ", limit=" # Nat.toText(limit));
        await revenueManager.getUserTransactions(user, start, limit)
    };

    //-----------------------------------------------------------------------------
    // 수익 배분 통계 관련 인터페이스
    //-----------------------------------------------------------------------------
    
    // 전체 수익 배분 통계 요약 조회
    public query func getRevenueDistributionStats() : async RevenueDistribution.DistributionStats {
        revenueManager.getDistributionStats()
    };
    
    // 특정 기간의 배분 통계 조회
    public query func getRevenueStatsByPeriod(period: Text, startTime: Int, endTime: Int) : async RevenueDistribution.PeriodStats {
        revenueManager.getDistributionStatsByPeriod(period, startTime, endTime)
    };
    
    // NFT 성과 통계 조회
    public query func getNFTRevenueStats(limit: Nat) : async RevenueDistribution.NFTPerformanceStats {
        revenueManager.getNFTPerformanceStats(limit)
    };
    
    // 사용자 통계 조회
    public query func getUserRevenueStats(user: Principal) : async RevenueDistribution.UserStats {
        revenueManager.getUserStats(user)
    };
    
    // 자신의 통계 조회 (caller 기반)
    public query({ caller }) func getMyRevenueStats() : async RevenueDistribution.UserStats {
        revenueManager.getUserStats(caller)
    };
    
    // 수익 대시보드 데이터 조회
    public query func getRevenueDashboardData() : async RevenueDistribution.DashboardData {
        revenueManager.getDashboardData()
    };

    // 최초 배포 후 실행할 수 있는 슈퍼 관리자 초기화 함수
    public shared func initSuperAdmin(superAdminPrincipal: Principal) : async Result.Result<Text, Text> {
        switch (adminManager.initSuperAdmin(superAdminPrincipal)) {
            case (#ok()) {
                // adminManager에 슈퍼관리자 설정 성공. 로그를 남깁니다.
                Debug.print("슈퍼 관리자가 성공적으로 초기화되었습니다: " # Principal.toText(superAdminPrincipal));
                #ok("슈퍼 관리자가 성공적으로 초기화되었습니다.")
            };
            case (#err(#SuperAdminAlreadySet)) {
                Debug.print("슈퍼 관리자가 이미 설정되어 있습니다.");
                #err("슈퍼 관리자가 이미 설정되어 있습니다.")
            };
            case (#err(_)) {
                Debug.print("슈퍼 관리자 초기화 중 알 수 없는 오류가 발생했습니다.");
                #err("슈퍼 관리자 초기화 중 알 수 없는 오류가 발생했습니다.")
            };
        }
    };

    // 슈퍼 관리자 조회 함수
    public query func getSuperAdmin() : async ?Principal {
        adminManager.getSuperAdmin()
    };
    
    // 슈퍼 관리자 설정 여부 확인 함수 추가
    public query func isSuperAdminSet() : async Bool {
        switch (adminManager.getSuperAdmin()) {
            case (?_) { true };
            case (null) { false };
        }
    };

    // 사용자가 관리자인지 확인하는 함수 추가 (일반 관리자 + 슈퍼 관리자)
    public query func isUserAdmin(userPrincipal: Principal) : async Bool {
        adminManager.isAdmin(userPrincipal)
    };

    // 누적 집계 초기화 함수
    private func initializeActiveUserStats() {
        // 활성 사용자 통계 초기화
        let activeUserSet = TrieMap.TrieMap<Principal, Bool>(Principal.equal, Principal.hash);
        
        // 최근 30일 이내 활동한 사용자 집계
        let thirtyDaysAgo = Time.now() - (30 * 24 * 60 * 60 * 1_000_000);
        
        for ((user, lastActivity) in activeUsers.entries()) {
            if (lastActivity >= thirtyDaysAgo) {
                activeUserSet.put(user, true);
            };
        };
        
        cachedActiveUserCount := activeUserSet.size();
        Debug.print("활성 사용자 통계 초기화 완료: " # Nat.toText(cachedActiveUserCount) # "명");
        
        // NFT 소유자 통계 초기화 (기존의 코드 재활용하되 이름만 변경)
        initializeNFTOwnerStats();
    };
    
    // NFT 소유자 통계 초기화 함수 (별도로 분리)
    private func initializeNFTOwnerStats() {
        // 기존의 nftOwners를 초기화
        for (owner in nftOwners.keys()) {
            nftOwners.delete(owner);
        };
        
        // 모든 토큰 ID 가져오기
        let totalTokens = nft.icrc7_total_supply();
        
        // NFT가 있는 경우에만 처리
        if (totalTokens > 0) {
            // 각 토큰의 소유자 정보 수집
            for (tokenId in Iter.range(0, Nat.sub(totalTokens, 1))) {
                let ownerResults = nft.icrc7_owner_of([tokenId]);
                
                if (ownerResults.size() > 0) {
                    switch(ownerResults[0]) {
                        case (?owner) {
                            // 백엔드 캐니스터가 아닌 실제 사용자만 포함
                            if (owner.owner != Principal.fromActor(Main)) {
                                nftOwners.put(owner.owner, true);
                            };
                        };
                        case (null) { };
                    };
                };
            };
        };
        
        // 고유한 NFT 소유자 수를 계산
        cachedNFTOwnerCount := nftOwners.size();
        Debug.print("NFT 소유자 통계 초기화 완료: " # Nat.toText(cachedNFTOwnerCount) # "명");
    };
    
    // 시스템 초기화: 함수 정의 후 호출
    initializeStats();
};

