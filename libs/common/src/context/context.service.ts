import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
// import { UserContext } from './context.interfaces';

@Injectable()
export class ContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<
    Map<string, any>
  >();
  private readonly logger = new Logger(ContextService.name);

  /**
   * 获取上下文中特定键的值
   */
  getContext<T>(key: string): T | undefined {
    const store = this.asyncLocalStorage.getStore();
    return store ? store.get(key) : undefined;
  }

  getAllContext(): Record<string, any> {
    const store = this.asyncLocalStorage.getStore();
    if (!store) {
      return {};
    }

    // 将 Map 转换为普通对象
    const contextObject = {};
    for (const [key, value] of store.entries()) {
      contextObject[key] = value;
    }

    return contextObject;
  }

  /**
   * 在上下文中执行回调函数
   */
  runWithContext<T>(context: Record<string, any>, callback: () => T): T {
    const store = new Map<string, any>();
    Object.entries(context).forEach(([key, value]) => {
      store.set(key, value);
    });
    return this.asyncLocalStorage.run(store, callback);
  }

  /**
   * 设置当前上下文的值
   */
  setContext(key: string, value: any): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.set(key, value);
    } else {
      this.logger.warn('No active context store found when setting context');
    }
  }

  // 删除指定上下文的值
  deleteContext(key: string): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.delete(key);
    } else {
      this.logger.warn('No active context store found when deleting context');
    }
  }

  /**
   * 编码上下文为传输格式
   */
  encodeContext(context: Record<string, any>): string {
    return Buffer.from(JSON.stringify(context)).toString('base64');
  }

  /**
   * 解码传输格式的上下文
   */
  decodeContext(encodedContext: string): Record<string, any> {
    try {
      return JSON.parse(Buffer.from(encodedContext, 'base64').toString());
    } catch (error) {
      this.logger.error(`Failed to decode context: ${error.message}`);
      return {};
    }
  }
}
