import Principal "mo:base/Principal";
import Result "mo:base/Result";
import TrieMap "mo:base/TrieMap";
import Text "mo:base/Text";

module {
    public type AdminError = {
        #NotAuthorized;
        #AlreadyAdmin;
        #NotAdmin;
    };

    public class AdminManager() {
        private let admins = TrieMap.TrieMap<Principal, Bool>(Principal.equal, Principal.hash);
        private var superAdmin : Principal = Principal.fromText("7w7wy-vsfhb-af2eo-h7in2-rtrji-k4lpn-day6t-jnjdc-oimk2-4fnhy-xqe");

        // 슈퍼 관리자 확인
        public func isSuperAdmin(caller: Principal) : Bool {
            Principal.equal(caller, superAdmin)
        };

        // 관리자 확인
        public func isAdmin(caller: Principal) : Bool {
            switch (admins.get(caller)) {
                case (?isAdmin) { isAdmin };
                case null { false };
            }
        };

        // 새로운 관리자 추가 (슈퍼 관리자만 가능)
        public func addAdmin(caller: Principal, newAdmin: Principal) : Result.Result<(), AdminError> {
            if (not isSuperAdmin(caller)) {
                return #err(#NotAuthorized);
            };

            switch (admins.get(newAdmin)) {
                case (?_) { #err(#AlreadyAdmin) };
                case null {
                    admins.put(newAdmin, true);
                    #ok(());
                };
            }
        };

        // 관리자 제거 (슈퍼 관리자만 가능)
        public func removeAdmin(caller: Principal, adminToRemove: Principal) : Result.Result<(), AdminError> {
            if (not isSuperAdmin(caller)) {
                return #err(#NotAuthorized);
            };

            switch (admins.get(adminToRemove)) {
                case (?_) {
                    admins.delete(adminToRemove);
                    #ok(());
                };
                case null { #err(#NotAdmin) };
            }
        };

        // 슈퍼 관리자 변경 (현재 슈퍼 관리자만 가능)
        public func changeSuperAdmin(caller: Principal, newSuperAdmin: Principal) : Result.Result<(), AdminError> {
            if (not isSuperAdmin(caller)) {
                return #err(#NotAuthorized);
            };
            
            superAdmin := newSuperAdmin;
            #ok(());
        };
    };
}; 