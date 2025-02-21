import { AuthClient } from "@dfinity/auth-client";
import { Identity, Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/piggycell_backend";
import type { _SERVICE } from "../../../declarations/piggycell_backend/piggycell_backend.did";

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
    const agent = new HttpAgent({ identity });

    if (process.env.NODE_ENV !== "production") {
      await agent.fetchRootKey();
    }

    const canisterId = process.env.CANISTER_ID_PIGGYCELL_BACKEND;
    if (!canisterId) {
      throw new Error("Canister ID를 찾을 수 없습니다.");
    }

    return Actor.createActor<_SERVICE>(idlFactory, {
      agent,
      canisterId,
    });
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
        "7w7wy-vsfhb-af2eo-h7in2-rtrji-k4lpn-day6t-jnjdc-oimk2-4fnhy-xqe"
      );
    } catch (error) {
      console.error("관리자 권한 확인 중 오류 발생:", error);
      return false;
    }
  }
}
