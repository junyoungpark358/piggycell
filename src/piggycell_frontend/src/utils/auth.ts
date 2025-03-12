import { AuthClient } from "@dfinity/auth-client";
import { Identity, Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/piggycell_backend";
import type { _SERVICE } from "../../../declarations/piggycell_backend/piggycell_backend.did";
import { Principal } from "@dfinity/principal";

// 브라우저 종류에 따라 적절한 URL 형식을 반환하는 함수
const getAuthUrl = (canisterId: string): string => {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  return isSafari
    ? `http://localhost:4943/?canisterId=${canisterId}`
    : `http://${canisterId}.localhost:4943`;
};

// 로컬 환경의 Internet Identity canister ID
const LOCAL_II_CANISTER_ID = "bkyz2-fmaaa-aaaaa-qaaaq-cai";

export class AuthManager {
  private static instance: AuthManager;
  private authClient: AuthClient | null = null;
  private actor: _SERVICE | null = null;

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private async createActor(): Promise<_SERVICE> {
    if (!this.authClient) {
      throw new Error("AuthClient가 초기화되지 않았습니다.");
    }

    const identity = this.authClient.getIdentity();
    console.log("[AuthManager] createActor - Identity 획득:", {
      principal: identity.getPrincipal().toString(),
    });

    const agent = new HttpAgent({ identity });
    console.log("[AuthManager] createActor - HttpAgent 생성됨");

    if (process.env.NODE_ENV !== "production") {
      await agent.fetchRootKey();
      console.log("[AuthManager] createActor - Root key 가져옴 (개발 환경)");
    }

    const canisterId = process.env.CANISTER_ID_PIGGYCELL_BACKEND;
    if (!canisterId) {
      throw new Error("Canister ID를 찾을 수 없습니다.");
    }
    console.log("[AuthManager] createActor - Canister ID:", canisterId);

    // Actor 생성
    const actor = Actor.createActor<_SERVICE>(idlFactory, {
      agent,
      canisterId,
    });
    console.log("[AuthManager] 백엔드 Actor 생성 완료");

    return actor;
  }

  public async init(): Promise<void> {
    this.authClient = await AuthClient.create();
    if (await this.authClient.isAuthenticated()) {
      this.actor = await this.createActor();
    }
  }

  public async login(): Promise<Identity | undefined> {
    const days = BigInt(1);
    const hours = BigInt(24);
    const nanoseconds = BigInt(3600000000000);

    await this.authClient?.login({
      identityProvider:
        process.env.DFX_NETWORK === "ic"
          ? "https://identity.ic0.app/#authorize"
          : `${getAuthUrl(LOCAL_II_CANISTER_ID)}/#authorize`,
      maxTimeToLive: days * hours * nanoseconds,
      onSuccess: async () => {
        if (this.authClient) {
          this.actor = await this.createActor();
        }
        window.location.reload();
      },
    });

    return this.authClient?.getIdentity();
  }

  public async logout(): Promise<void> {
    await this.authClient?.logout();
    this.actor = null;
    window.location.reload();
  }

  public async getIdentity(): Promise<Identity | undefined> {
    return this.authClient?.getIdentity();
  }

  public async getPrincipal(): Promise<Principal | undefined> {
    try {
      const identity = await this.getIdentity();
      return identity?.getPrincipal();
    } catch (error) {
      console.error("Principal 가져오기 오류:", error);
      return undefined;
    }
  }

  public async isAuthenticated(): Promise<boolean> {
    return this.authClient?.isAuthenticated() ?? false;
  }

  public async isAdmin(): Promise<boolean> {
    if (!this.authClient?.isAuthenticated()) {
      return false;
    }

    try {
      const identity = this.authClient.getIdentity();
      const principal = identity.getPrincipal();
      return (
        principal.toString() ===
        "dexux-4pqfq-e625z-pb4pp-qlqam-fm4cu-iaueu-2lu2r-43ojg-6jmvd-zae"
      );
    } catch (error) {
      console.error("관리자 권한 확인 중 오류 발생:", error);
      return false;
    }
  }
}
