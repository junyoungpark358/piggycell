import Principal "mo:base/Principal";
import Result "mo:base/Result";
import TrieMap "mo:base/TrieMap";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Iter "mo:base/Iter";

module {
    public type AdminError = {
        #NotAuthorized;
        #AlreadyAdmin;
        #NotAdmin;
    };

    public class AdminManager() {
        private let admins = TrieMap.TrieMap<Principal, Bool>(Principal.equal, Principal.hash);
        private var superAdmin : Principal = Principal.fromText("dil3j-p2ir2-aqcvd-lqx2z-qlmxw-wuaut-drizs-nbgvn-3gk7d-qlbeg-vqe");

        // 슈퍼 관리자 확인
        public func isSuperAdmin(caller: Principal) : Bool {
            Principal.equal(caller, superAdmin)
        };

        // 관리자 확인 - 슈퍼 관리자도 자동으로 관리자로 인식
        public func isAdmin(caller: Principal) : Bool {
            if (isSuperAdmin(caller)) {
                return true;
            };
            
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
        
        // 모든 관리자 목록 조회
        public func getAllAdmins() : [Principal] {
            let adminArray = Iter.toArray(admins.keys());
            Array.append<Principal>([superAdmin], adminArray)
        };
        
        // 슈퍼 관리자 ID 반환
        public func getSuperAdmin() : Principal {
            superAdmin
        };
    };
}; 