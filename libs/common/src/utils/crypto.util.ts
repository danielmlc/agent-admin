import {
  createCipheriv,
  createDecipheriv,
  publicEncrypt,
  privateDecrypt,
  randomBytes,
  scrypt,
  constants,
  createHash,
} from 'crypto';
import argon2 from 'argon2';
import { promisify } from 'util';

/**
 * AES加密工具类 对称加密类
 */
export class AesUtils {
  /**
   * AES-256-CBC加密
   * @param text 待加密文本
   * @param key 密钥(32字节)
   * @param iv 初始化向量(16字节)
   * @returns 加密后的Base64字符串
   */
  static async encrypt(
    text: string,
    key: string,
    iv?: string,
  ): Promise<string> {
    // 从密钥派生32字节密钥
    const keyBuffer = await this.deriveKey(key);

    // 使用提供的IV或生成随机IV
    const ivBuffer = iv ? Buffer.from(iv, 'hex') : randomBytes(16);

    // 创建加密器
    const cipher = createCipheriv('aes-256-cbc', keyBuffer, ivBuffer);

    // 加密数据
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // 如果使用随机IV，将IV添加到加密结果前面
    if (!iv) {
      const ivHex = ivBuffer.toString('hex');
      return `${ivHex}:${encrypted}`;
    }

    return encrypted;
  }

  /**
   * AES-256-CBC解密
   * @param encryptedText 加密的Base64字符串
   * @param key 密钥
   * @param iv 初始化向量(如果未包含在加密文本中)
   * @returns 解密后的原始文本
   */
  static async decrypt(
    encryptedText: string,
    key: string,
    iv?: string,
  ): Promise<string> {
    let ivBuffer: Buffer;
    let textToDecrypt = encryptedText;

    // 检查是否包含IV
    if (encryptedText.includes(':') && !iv) {
      const parts = encryptedText.split(':');
      const ivHex = parts[0];
      textToDecrypt = parts[1];
      ivBuffer = Buffer.from(ivHex, 'hex');
    } else if (iv) {
      ivBuffer = Buffer.from(iv, 'hex');
    } else {
      throw new Error('未提供IV且加密文本中不包含IV');
    }

    // 从密钥派生32字节密钥
    const keyBuffer = await this.deriveKey(key);

    // 创建解密器
    const decipher = createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);

    // 解密数据
    let decrypted = decipher.update(textToDecrypt, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 生成AES密钥和IV
   * @returns 生成的密钥和IV(十六进制格式)
   */
  static generateKey(): { key: string; iv: string } {
    const key = randomBytes(32).toString('hex'); // 256位密钥
    const iv = randomBytes(16).toString('hex'); // 128位IV
    return { key, iv };
  }

  /**
   * 从密码派生密钥
   * @private
   * @param password 密码
   * @returns 派生的32字节密钥
   */
  private static async deriveKey(password: string): Promise<Buffer> {
    const scryptAsync = promisify(scrypt);
    return scryptAsync(password, 'salt', 32) as Promise<Buffer>;
  }
}

/**
 * RSA加密工具类 非对称类加密
 */
export class RsaUtils {
  /**
   * RSA公钥加密
   * @param text 待加密文本
   * @param publicKey PEM格式公钥
   * @returns 加密后的Base64字符串
   */
  static encrypt(text: string, publicKey: string): string {
    const buffer = Buffer.from(text);
    const encrypted = publicEncrypt(
      {
        key: publicKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );

    return encrypted.toString('base64');
  }

  /**
   * RSA私钥解密
   * @param encryptedText 加密的Base64字符串
   * @param privateKey PEM格式私钥
   * @returns 解密后的原始文本
   */
  static decrypt(encryptedText: string, privateKey: string): string {
    const buffer = Buffer.from(encryptedText, 'base64');
    const decrypted = privateDecrypt(
      {
        key: privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );

    return decrypted.toString('utf8');
  }

  /**
   * 分块加密长文本(解决RSA加密大小限制)
   * @param text 待加密的长文本
   * @param publicKey PEM格式公钥
   * @param blockSize 分块大小，默认190字节
   * @returns 加密后的Base64字符串，块之间用冒号分隔
   */
  static encryptLong(text: string, publicKey: string, blockSize = 190): string {
    const textBuffer = Buffer.from(text, 'utf8');
    const blocks: string[] = [];

    for (let i = 0; i < textBuffer.length; i += blockSize) {
      const block = textBuffer.slice(i, i + blockSize);
      const encryptedBlock = this.encrypt(block.toString('utf8'), publicKey);
      blocks.push(encryptedBlock);
    }

    return blocks.join(':');
  }

  /**
   * 解密分块加密的长文本
   * @param encryptedBlocks 以冒号分隔的加密块
   * @param privateKey PEM格式私钥
   * @returns 解密后的原始文本
   */
  static decryptLong(encryptedBlocks: string, privateKey: string): string {
    const blocks = encryptedBlocks.split(':');
    let result = '';

    for (const block of blocks) {
      result += this.decrypt(block, privateKey);
    }

    return result;
  }
}

/**
 * MD5哈希工具类
 *
 * @remarks
 * MD5是一种单向哈希算法，非真正的加密算法。
 * 在安全性要求高的场景（如密码存储）中不应使用MD5，
 * 应考虑使用bcrypt、Argon2、PBKDF2等更安全的算法。
 */
export class Md5Utils {
  /**
   * 生成字符串的MD5哈希值
   *
   * @param text - 输入文本
   * @returns MD5哈希值（十六进制字符串）
   */
  static hash(text: string): string {
    return createHash('md5').update(text).digest('hex');
  }

  /**
   * 生成带盐值的MD5哈希（简单提升安全性）
   *
   * @param text - 输入文本
   * @param salt - 盐值
   * @param iterations - 迭代次数，默认为1
   * @returns 带盐值的MD5哈希（十六进制字符串）
   */
  static hashWithSalt(text: string, salt: string, iterations = 1): string {
    let hash = text + salt;

    for (let i = 0; i < iterations; i++) {
      hash = createHash('md5').update(hash).digest('hex');
    }

    return hash;
  }

  /**
   * MD5-HMAC处理（消息认证码）
   *
   * @param text - 输入文本
   * @param key - 密钥
   * @returns HMAC结果（十六进制字符串）
   */
  static hmac(text: string, key: string): string {
    // 创建内外填充
    const blockSize = 64; // MD5的块大小为64字节

    // 如果密钥长度超过块大小，则使用其哈希值
    const k =
      key.length > blockSize
        ? createHash('md5').update(key).digest()
        : Buffer.from(key);

    // 创建内外填充
    const iPad = Buffer.alloc(blockSize, 0x36);
    const oPad = Buffer.alloc(blockSize, 0x5c);

    for (let i = 0; i < k.length; i++) {
      iPad[i] = iPad[i] ^ k[i];
      oPad[i] = oPad[i] ^ k[i];
    }

    // 计算HMAC: MD5(K XOR opad, MD5(K XOR ipad, text))
    const innerHash = createHash('md5').update(iPad).update(text).digest();

    return createHash('md5').update(oPad).update(innerHash).digest('hex');
  }

  /**
   * 文件MD5校验码计算
   *
   * @param buffer - 文件Buffer
   * @returns 文件的MD5校验码（十六进制字符串）
   */
  static fileChecksum(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  /**
   * 验证字符串是否匹配指定的MD5哈希值
   *
   * @param text - 待验证的文本
   * @param hash - MD5哈希值
   * @returns 是否匹配
   */
  static verify(text: string, hash: string): boolean {
    return this.hash(text) === hash.toLowerCase();
  }

  /**
   * 验证字符串是否匹配指定的带盐值MD5哈希
   *
   * @param text - 待验证的文本
   * @param hash - 带盐值的MD5哈希
   * @param salt - 盐值
   * @param iterations - 迭代次数，默认为1
   * @returns 是否匹配
   */
  static verifyWithSalt(
    text: string,
    hash: string,
    salt: string,
    iterations = 1,
  ): boolean {
    return this.hashWithSalt(text, salt, iterations) === hash.toLowerCase();
  }
}

/**
 * 密码哈希系统配置接口
 */
interface HashingOptions {
  /**
   * 内存成本 (单位: kibibytes)
   * 推荐: 服务器环境 65536+ (64MB)，Web环境 32768 (32MB)
   */
  memoryCost?: number;

  /**
   * 时间成本因子 (迭代次数)
   * 推荐: 3-4 (可根据硬件定期评估并调整)
   */
  timeCost?: number;

  /**
   * 并行度 (线程数)
   * 推荐: 核心数的一半，最小值为 1
   */
  parallelism?: number;

  /**
   * 输出哈希长度 (字节数)
   * 推荐: 32 (256位)
   */
  hashLength?: number;

  /**
   * Argon2 算法类型
   * - 0 (argon2d): 抗 GPU 攻击，适用于加密货币等应用
   * - 1 (argon2i): 抗侧信道攻击，适用于密码哈希
   * - 2 (argon2id): 混合模式，推荐用于密码哈希
   */
  type?: 0 | 1 | 2;
}

/**
 * 基于Argon2算法的密码哈希服务类
 * 提供密码哈希与验证的核心功能
 */
export class Argon2Utils {
  private readonly defaultOptions: HashingOptions;

  /**
   * 构造密码服务实例
   * @param options 自定义哈希配置参数
   */
  constructor(options: HashingOptions = {}) {
    // 基于系统安全等级设置默认参数
    this.defaultOptions = {
      memoryCost: options.memoryCost || 65536, // 64MB
      timeCost: options.timeCost || 3, // 3 次迭代
      parallelism: options.parallelism || 4, // 4 线程
      hashLength: options.hashLength || 32, // 256 位输出
      type: options.type !== undefined ? options.type : 2, // 默认使用 argon2id (2)
    };
  }

  /**
   * 哈希用户密码
   * @param password 明文密码
   * @param options 可选的哈希参数(覆盖默认值)
   * @returns 哈希结果(包含算法、盐值、参数等完整信息)
   */
  async hashPassword(
    password: string,
    options?: HashingOptions,
  ): Promise<string> {
    try {
      // 创建一个新对象，确保所有选项都符合 argon2 库要求
      const hashOptions = {
        memoryCost: options?.memoryCost || this.defaultOptions.memoryCost,
        timeCost: options?.timeCost || this.defaultOptions.timeCost,
        parallelism: options?.parallelism || this.defaultOptions.parallelism,
        hashLength: options?.hashLength || this.defaultOptions.hashLength,
        type: options?.type || this.defaultOptions.type,
      };

      return await argon2.hash(password, hashOptions);
    } catch (error) {
      // 系统化错误处理，保留错误上下文但不泄露敏感信息
      throw new Error(
        `Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 验证密码
   * @param hashedPassword 存储的哈希密码
   * @param plainPassword 用户输入的明文密码
   * @returns 密码是否匹配
   */
  async verifyPassword(
    hashedPassword: string,
    plainPassword: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(hashedPassword, plainPassword);
    } catch (error) {
      // 系统化错误处理
      throw new Error(
        `Password verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 检查哈希是否需要重新哈希(参数升级)
   * 系统安全维护的关键组件，用于适应计算能力增长
   * @param hashedPassword 存储的哈希密码
   * @returns 是否需要重新哈希
   */
  async needsRehash(hashedPassword: string): Promise<boolean> {
    try {
      // 创建一个符合 argon2 库要求的选项对象
      const rehashOptions = {
        memoryCost: this.defaultOptions.memoryCost,
        timeCost: this.defaultOptions.timeCost,
        parallelism: this.defaultOptions.parallelism,
        hashLength: this.defaultOptions.hashLength,
        type: this.defaultOptions.type,
      };

      const needsRehash = await argon2.needsRehash(
        hashedPassword,
        rehashOptions,
      );
      return needsRehash;
    } catch (error) {
      // 出错时保守处理，建议重新哈希
      return true;
    }
  }
}
