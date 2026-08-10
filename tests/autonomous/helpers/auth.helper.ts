/**
 * PoDM Autonomous QA Test Suite — Auth & Account Helper
 * Handles Audience, Creator, Admin, and Enclave account management
 */

export interface TestUser {
  id: string;
  email: string;
  username: string;
  role: 'fan' | 'creator' | 'admin';
  status: 'active' | 'pending verification' | 'suspended';
  is_enclave_member?: boolean;
  enclave_joined_at?: string;
  commission_rate?: number;
  crypto_wallet_address?: string;
  authToken?: string;
  authRefreshToken?: string;
}

export class AuthHelper {
  private static userCounter = 100;

  public static createAudienceUser(overrides?: Partial<TestUser>): TestUser {
    this.userCounter++;
    const id = `user-audience-${this.userCounter}`;
    return {
      id,
      email: `audience${this.userCounter}@test.podm.app`,
      username: `audience_${this.userCounter}`,
      role: 'fan',
      status: 'active',
      authToken: `mock-jwt-fan-${id}`,
      authRefreshToken: `mock-refresh-fan-${id}`,
      ...overrides,
    };
  }

  public static createCreatorUser(overrides?: Partial<TestUser>): TestUser {
    this.userCounter++;
    const id = `user-creator-${this.userCounter}`;
    return {
      id,
      email: `creator${this.userCounter}@test.podm.app`,
      username: `creator_${this.userCounter}`,
      role: 'creator',
      status: 'pending verification',
      commission_rate: 12.5,
      crypto_wallet_address: `0x${id.replace(/-/g, '').padEnd(40, '0')}`,
      authToken: `mock-jwt-creator-${id}`,
      authRefreshToken: `mock-refresh-creator-${id}`,
      ...overrides,
    };
  }

  public static createActiveCreatorUser(overrides?: Partial<TestUser>): TestUser {
    return this.createCreatorUser({
      status: 'active',
      ...overrides,
    });
  }

  public static createEnclaveCreatorUser(overrides?: Partial<TestUser>): TestUser {
    return this.createActiveCreatorUser({
      is_enclave_member: true,
      enclave_joined_at: new Date().toISOString(),
      commission_rate: 10,
      ...overrides,
    });
  }

  public static createAdminUser(overrides?: Partial<TestUser>): TestUser {
    this.userCounter++;
    const id = `user-admin-${this.userCounter}`;
    return {
      id,
      email: `admin${this.userCounter}@test.podm.app`,
      username: `admin_${this.userCounter}`,
      role: 'admin',
      status: 'active',
      authToken: `mock-jwt-admin-${id}`,
      authRefreshToken: `mock-refresh-admin-${id}`,
      ...overrides,
    };
  }

  public static getAuthHeaders(user: TestUser, impersonatedUserId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${user.authToken}`,
      Cookie: `authToken=${user.authToken}; authRefreshToken=${user.authRefreshToken}`,
    };
    if (impersonatedUserId) {
      headers['X-Impersonating-User-Id'] = impersonatedUserId;
    }
    return headers;
  }
}
