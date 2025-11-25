/* eslint-disable @typescript-eslint/no-empty-function */
import { customAlphabet, nanoid } from 'nanoid';
import * as os from 'os';
export const CommonUtil = {
  // 生产环境警用console
  disableConsole: function (): any {
    const originalConsole = { ...console };
    console.log = () => { };
    console.error = () => { };
    console.warn = () => { };
    console.info = () => { };
    console.debug = () => { };
    return originalConsole;
  },

  nanoidKey: function (size = 10): string {
    return nanoid(size);
  },

  getRandomString (length: number): string {
    const placeholder =
      '1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
    const customNanoid = customAlphabet(placeholder, length);
    return customNanoid();
  },

  getRandomCode (length: number): string {
    const placeholder = '1234567890';
    const customNanoid = customAlphabet(placeholder, length);
    return customNanoid();
  },

  getVerSion (): number {
    return Date.now();
  },

  getIPAdress () {
    const interfaces = os.networkInterfaces();

    // 按常用网段优先级顺序查找
    const preferredRanges = [
      /^192\.168\./, // 192.168.x.x
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.x.x - 172.31.x.x
      /^10\./, // 10.x.x.x
    ];

    for (const range of preferredRanges) {
      for (const devName in interfaces) {
        const iface = interfaces[devName];
        if (iface) {
          for (const alias of iface) {
            if (
              alias.family === 'IPv4' &&
              alias.address !== '127.0.0.1' &&
              !alias.internal &&
              range.test(alias.address)
            ) {
              return alias.address;
            }
          }
        }
      }
    }

    // 如果没找到常用网段的IP，返回第一个非回环地址
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (iface) {
        for (const alias of iface) {
          if (
            alias.family === 'IPv4' &&
            alias.address !== '127.0.0.1' &&
            !alias.internal
          ) {
            return alias.address;
          }
        }
      }
    }

    return 'locahost';
  },

  getMac () {
    const networkInterfaces = os.networkInterfaces();
    for (const devname in networkInterfaces) {
      const iface = networkInterfaces[devname];
      if (iface) {
        for (let index = 0; index < iface.length; index++) {
          const alias = iface[index];
          if (
            alias.family === 'IPv4' &&
            alias.address !== '127.0.0.1' &&
            !alias.internal
          ) {
            return alias.mac;
          }
        }
      }
    }
  },
};
