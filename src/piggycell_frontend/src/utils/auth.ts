import { AuthClient } from "@dfinity/auth-client";
import { Identity } from "@dfinity/agent";

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

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  public async init(): Promise<void> {
    this.authClient = await AuthClient.create();
    await this.authClient.isAuthenticated();
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
      onSuccess: () => {
        window.location.reload();
      },
    });

    return this.authClient?.getIdentity();
  }

  public async logout(): Promise<void> {
    await this.authClient?.logout();
    window.location.reload();
  }

  public async getIdentity(): Promise<Identity | undefined> {
    return this.authClient?.getIdentity();
  }

  public async isAuthenticated(): Promise<boolean> {
    return this.authClient?.isAuthenticated() ?? false;
  }
}
