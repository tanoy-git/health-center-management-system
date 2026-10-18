import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextData {
  centerId: string;
  userId: string;
  role: string;
  permissions: string[];
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantContextData>();

export class TenantContext {
  static get(): TenantContextData | undefined {
    return tenantLocalStorage.getStore();
  }

  static getCenterId(): string | undefined {
    return tenantLocalStorage.getStore()?.centerId;
  }

  static getUserId(): string | undefined {
    return tenantLocalStorage.getStore()?.userId;
  }

  static run<T>(data: TenantContextData, callback: () => T): T {
    return tenantLocalStorage.run(data, callback);
  }
}
