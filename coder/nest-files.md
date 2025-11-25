### @cs/nest-files代码库源码整理

#### 代码目录
```
@cs/nest-files/
├── src/
├── constants/
│   └── index.ts
├── interfaces/
│   ├── file-storage-options.interface.ts
│   ├── file-storage.interface.ts
│   └── index.ts
├── providers/
│   ├── abstract-storage.provider.ts
│   ├── ali-oss.provider.ts
│   └── minio.provider.ts
├── file-storage.factory.ts
├── file-storage.module.ts
├── file-storage.service.ts
└── index.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-files",
  "version": "1.0.1",
  "description": "",
  "author": "danielmlc <danielmlc@126.com>",
  "homepage": "",
  "license": "ISC",
  "main": "lib/index.js",
  "directories": {
    "lib": "lib"
  },
  "files": [
    "lib"
  ],
  "scripts": {
    "prebuild": "rimraf lib",
    "build": "tsc -p ./tsconfig.json",
    "watch": "tsc -p ./tsconfig.json --watch",
    "publish": "pnpm publish --no-git-checks",
    "pre-publish:beta": "pnpm version prerelease --preid=beta",
    "publish:beta": "pnpm run pre-publish:beta && pnpm publish --no-git-checks --tag beta"
  },
  "dependencies": {
    "ali-oss": "^6.22.0",
    "dayjs": "^1.11.13",
    "minio": "^8.0.5"
  },
  "devDependencies": {
    "@nestjs/schematics": "^10.2.3",
    "@types/ali-oss": "^6.16.11",
    "@types/minio": "^7.1.1"
  }
}

```


> 代码路径  `src\file-storage.factory.ts`

```typescript
import { Injectable } from '@nestjs/common';
import {
  FileStorageOptions,
  StorageProvider,
  IFileStorage,
} from './interfaces';
import { AliOssProvider } from './providers/ali-oss.provider';
import { MinioProvider } from './providers/minio.provider';

@Injectable()
export class FileStorageFactory {
  create(options: FileStorageOptions): IFileStorage {
    const provider = options.provider;
    switch (provider) {
      case StorageProvider.ALI_OSS:
        return new AliOssProvider(options);
      case StorageProvider.MINIO:
        return new MinioProvider(options);
      default:
        // 使用提前存储的provider值
        throw new Error(`不支持的存储提供者: ${provider}`);
    }
  }
}

```


> 代码路径  `src\file-storage.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { FILE_STORAGE_OPTIONS } from './constants';
import { FileStorageOptions, FileStorageAsyncOptions } from './interfaces';
import { FileStorageService } from './file-storage.service';
import { FileStorageFactory } from './file-storage.factory';

@Module({})
export class FileStorageModule {
  static forRoot(options: FileStorageOptions, isGlobal = true): DynamicModule {
    return {
      global: isGlobal,
      module: FileStorageModule,
      providers: [
        FileStorageFactory,
        FileStorageService,
        {
          provide: FILE_STORAGE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [FileStorageService, FILE_STORAGE_OPTIONS],
    };
  }

  static forRootAsync(
    options: FileStorageAsyncOptions,
    isGlobal = true,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: FileStorageModule,
      imports: options.imports,
      providers: [
        FileStorageFactory,
        FileStorageService,
        {
          provide: FILE_STORAGE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      exports: [FileStorageService, FILE_STORAGE_OPTIONS],
    };
  }
}

```


> 代码路径  `src\file-storage.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Readable } from 'stream';
import { FILE_STORAGE_OPTIONS } from './constants';
import {
  FileStorageOptions,
  FormSignatureDto,
  GetFileDto,
  HeaderOptions,
  SignatureOptions,
  UploadDto,
} from './interfaces';
import { FileStorageFactory } from './file-storage.factory';
import { IFileStorage } from './interfaces';

@Injectable()
export class FileStorageService implements IFileStorage {
  private readonly provider: IFileStorage;

  constructor(
    @Inject(FILE_STORAGE_OPTIONS) private options: FileStorageOptions,
    private readonly factory: FileStorageFactory,
  ) {
    this.provider = this.factory.create(options);
  }

  getClient(): any {
    return this.provider.getClient();
  }

  upload(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    return this.provider.upload(dto, options);
  }

  uploadByStream(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    return this.provider.uploadByStream(dto, options);
  }

  uploadStreamDirect(stream: Readable, key: string, size?: number, options?: HeaderOptions): Promise<any> {
    return this.provider.uploadStreamDirect(stream, key, size, options);
  }

  getFile(dto: GetFileDto): Promise<any> {
    return this.provider.getFile(dto);
  }

  getFileByStream(dto: GetFileDto): Promise<any> {
    return this.provider.getFileByStream(dto);
  }

  signatureUrl(key: string, options?: SignatureOptions): Promise<string> {
    return this.provider.signatureUrl(key, options);
  }

  generateUploadSignature(formDto: FormSignatureDto): Promise<any> {
    if (formDto.acl === 'public-read' || formDto.acl === 'public-read-write') {
      formDto.isPublic = true;
    }
    return this.provider.generateUploadSignature(formDto);
  }

  deleteFile(key: string): Promise<any> {
    return this.provider.deleteFile(key);
  }

  deleteFiles(keys: string[]): Promise<any> {
    return this.provider.deleteFiles(keys);
  }
}

```


> 代码路径  `src\index.ts`

```typescript
export * from './file-storage.module';
export * from './file-storage.service';
export * from './interfaces';
export * from './providers/ali-oss.provider';
export * from './providers/minio.provider';

```


> 代码路径  `src\constants\index.ts`

```typescript
export const FILE_STORAGE_OPTIONS = Symbol('FILE_STORAGE_OPTIONS');

```


> 代码路径  `src\interfaces\file-storage-options.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';

export enum StorageProvider {
  ALI_OSS = 'ali-oss',
  MINIO = 'minio',
}

export interface CommonStorageOptions {
  provider: StorageProvider;
  region?: string;
  bucket: string;
  secure?: boolean;
}

export interface AliOssOptions extends CommonStorageOptions {
  provider: StorageProvider.ALI_OSS;
  accessKeyId: string;
  accessKeySecret: string;
}

export interface MinioOptions extends CommonStorageOptions {
  provider: StorageProvider.MINIO;
  endPoint: string;
  port?: number;
  accessKey: string;
  secretKey: string;
}

export type FileStorageOptions = AliOssOptions | MinioOptions;

export interface FileStorageAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) => FileStorageOptions | Promise<FileStorageOptions>;
  inject?: any[];
}

```


> 代码路径  `src\interfaces\file-storage.interface.ts`

```typescript
export interface UploadDto {
  path: string;
  fileInfo: FormSignatureDto;
}

export interface GetFileDto {
  key: string;
  savePath: string;
}

export interface FormSignatureDto {
  fileSize?: number;
  autoGenerate?: boolean;
  isPublic?: boolean;
  isTemp?: boolean;
  product: string;
  filename: string;
  prefix?: string;
  tenantId?: string;
  acl?: string;
}

export interface SignatureResponse {
  type: string;
  expire: string;
  policy?: string;
  signature: string;
  accessId: string;
  host: string;
  key: string;
  [key: string]: any;
}

export interface HeaderOptions {
  'Cache-Control'?: string;
  'Content-Disposition'?: string;
  'Content-Encoding'?: string;
  'Content-Type'?: string;
  [key: string]: any;
}

// 为ali-oss特定的选项创建扩展接口
export interface AliOssUploadOptions {
  headers?: HeaderOptions;
  timeout?: number;
  mime?: string;
  meta?: Record<string, string>;
  [key: string]: any;
}

export interface SignatureOptions {
  expires?: number;
  method?: string;
  [key: string]: any;
}

import { Readable } from 'stream';

export interface IFileStorage {
  upload(dto: UploadDto, options?: HeaderOptions): Promise<any>;
  uploadByStream(dto: UploadDto, options?: HeaderOptions): Promise<any>;
  uploadStreamDirect(stream: Readable, key: string, size?: number, options?: HeaderOptions): Promise<any>;
  getFile(dto: GetFileDto): Promise<any>;
  getFileByStream(dto: GetFileDto): Promise<any>;
  signatureUrl(key: string, options?: SignatureOptions): Promise<string>;
  generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<SignatureResponse>;
  deleteFile(key: string): Promise<any>;
  deleteFiles(keys: string[]): Promise<any>;
  getClient(): any;
}

```


> 代码路径  `src\interfaces\index.ts`

```typescript
export * from './file-storage-options.interface';
export * from './file-storage.interface';

```


> 代码路径  `src\providers\abstract-storage.provider.ts`

```typescript
import { HttpException } from '@nestjs/common';
import * as fs from 'fs';
import { normalize } from 'path';
import { Readable } from 'stream';
import {
  FileStorageOptions,
  GetFileDto,
  HeaderOptions,
  IFileStorage,
  SignatureOptions,
  FormSignatureDto,
  SignatureResponse,
  UploadDto,
  AliOssUploadOptions,
} from '../interfaces';

export abstract class AbstractStorageProvider implements IFileStorage {
  protected defaultHeaders: HeaderOptions = {
    'Cache-Control': 'no-cache',
    'Content-Encoding': 'UTF-8',
  };

  protected defaultSignatureOptions: SignatureOptions = {
    expires: 1800,
    method: 'GET',
  };

  constructor(protected readonly options: FileStorageOptions) {}

  abstract getClient(): any;
  abstract upload(dto: UploadDto, options?: HeaderOptions): Promise<any>;
  abstract uploadByStream(
    dto: UploadDto,
    options?: HeaderOptions | AliOssUploadOptions,
  ): Promise<any>;
  abstract uploadStreamDirect(
    stream: Readable,
    key: string,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any>;
  abstract getFile(dto: GetFileDto): Promise<any>;
  abstract getFileByStream(dto: GetFileDto): Promise<any>;
  abstract signatureUrl(
    key: string,
    options?: SignatureOptions,
  ): Promise<string>;
  abstract generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<SignatureResponse>;
  abstract deleteFile(key: string): Promise<any>;
  abstract deleteFiles(keys: string[]): Promise<any>;

  protected validateFile(filePath: string): void {
    if (!fs.existsSync(normalize(filePath))) {
      throw new HttpException('文件不存在', 404);
    }
  }

  protected generateRandomFilename(originalName: string): string {
    const len = 32;
    const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    let pwd = '';
    for (let i = 0; i < len; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const pos = originalName.lastIndexOf('.');
    let suffix = '';
    if (pos !== -1) {
      suffix = originalName.substring(pos);
    }
    return pwd + suffix;
  }

  protected getObjectKey(formDto: FormSignatureDto): string {
    let key = formDto.filename;

    if (formDto.autoGenerate) {
      key = this.generateRandomFilename(formDto.filename);
    }

    if (formDto.prefix) {
      key = `${formDto.prefix}/${key}`;
    }

    if (formDto.product) {
      key = `${formDto.product}/${key}`;
    }

    if (formDto.isTemp) {
      key = `temp/${key}`;
    }

    if (formDto.isPublic) {
      key = `public/${key}`;
    } else {
      key = `common/${key}`;
    }

    if (formDto.tenantId) {
      key = `${formDto.tenantId}/${key}`;
    }

    return key;
  }
}

```


> 代码路径  `src\providers\ali-oss.provider.ts`

```typescript
import { HttpException } from '@nestjs/common';
import OSS from 'ali-oss';
import * as fs from 'fs';
import dayjs from 'dayjs';
import { normalize } from 'path';
import { Readable } from 'stream';
import {
  AliOssOptions,
  FormSignatureDto,
  GetFileDto,
  HeaderOptions,
  SignatureOptions,
  SignatureResponse,
  UploadDto,
} from '../interfaces';
import { AbstractStorageProvider } from './abstract-storage.provider';

export class AliOssProvider extends AbstractStorageProvider {
  private client: OSS;

  constructor(protected readonly options: AliOssOptions) {
    super(options);
    this.initClient();
  }

  private initClient(): void {
    const { region, bucket, accessKeyId, accessKeySecret, secure } =
      this.options;
    this.client = new OSS({
      region,
      bucket,
      accessKeyId,
      accessKeySecret,
      secure: secure === undefined ? true : secure,
    });
  }

  getClient(): OSS {
    return this.client;
  }

  async upload(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    try {
      const headers = { ...this.defaultHeaders, ...options };
      const _fileName = this.getObjectKey(dto.fileInfo);
      const result = await this.client.put(_fileName, normalize(dto.path), {
        headers,
        // 添加必要的参数以满足类型要求
        timeout: 60000,
        mime: options?.['Content-Type'],
      } as OSS.PutObjectOptions);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async uploadByStream(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    try {
      const filePath = normalize(dto.path);
      this.validateFile(filePath);

      const stream = fs.createReadStream(filePath);
      const headers = { ...this.defaultHeaders, ...options };

      // 使用类型断言确保兼容OSS.PutStreamOptions
      const putOptions = {
        headers,
        timeout: 60000,
        mime: options?.['Content-Type'],
        meta: {},
      } as OSS.PutStreamOptions;
      const _fileName = this.getObjectKey(dto.fileInfo);
      const result = await this.client.putStream(_fileName, stream, putOptions);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async getFile(dto: GetFileDto): Promise<any> {
    try {
      const result = await this.client.get(dto.key, normalize(dto.savePath));
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async getFileByStream(dto: GetFileDto): Promise<any> {
    try {
      const result = await this.client.getStream(dto.key);
      const writeStream = fs.createWriteStream(normalize(dto.savePath));
      return result.stream.pipe(writeStream);
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async signatureUrl(key: string, options?: SignatureOptions): Promise<string> {
    try {
      // 将默认选项与用户提供的选项合并
      const mergedOptions = { ...this.defaultSignatureOptions, ...options };

      // 处理HTTP方法，确保它是HTTPMethods类型
      let method: OSS.HTTPMethods | undefined;
      if (mergedOptions.method) {
        method = mergedOptions.method.toUpperCase() as OSS.HTTPMethods;
      }

      // 构建符合OSS.SignatureUrlOptions的对象
      const signOptions: OSS.SignatureUrlOptions = {
        expires: mergedOptions.expires,
        method,
        // 添加其他可能的选项
        process: mergedOptions.process,
        response: mergedOptions.response,
      };

      const result = await this.client.signatureUrl(key, signOptions);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<SignatureResponse> {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    const policy = {
      expiration: date.toISOString(),
      conditions: [
        ['content-length-range', 0, formDto.fileSize || 1024 * 1024 * 1024],
      ],
    };

    const formData = await this.client.calculatePostSignature(policy);
    const protocol = this.options.secure !== false ? 'https:' : 'http:';
    const host = `${protocol}//${this.options.bucket}.${this.options.region}.aliyuncs.com`;
    const key = this.getObjectKey(formDto);
    return {
      type: 'ali-oss',
      expire: dayjs().add(1, 'days').unix().toString(),
      policy: formData.policy,
      signature: formData.Signature,
      accessId: formData.OSSAccessKeyId,
      host,
      key,
    };
  }

  async deleteFile(key: string): Promise<any> {
    try {
      const result = await this.client.delete(key);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async uploadStreamDirect(
    stream: Readable,
    key: string,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any> {
    try {
      const headers = { ...this.defaultHeaders, ...options };

      // 构建符合OSS.PutStreamOptions的选项
      const putOptions = {
        headers,
        timeout: 60000,
        mime: options?.['Content-Type'],
        meta: {},
      } as OSS.PutStreamOptions;

      const result = await this.client.putStream(key, stream, putOptions);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async deleteFiles(keys: string[]): Promise<any> {
    try {
      const result = await this.client.deleteMulti(keys);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }
}

```


> 代码路径  `src\providers\minio.provider.ts`

```typescript
// providers/minio.provider.ts
import { HttpException } from '@nestjs/common';
import * as Minio from 'minio';
import * as fs from 'fs';
import dayjs from 'dayjs';
import { normalize } from 'path';
import { Readable } from 'stream';
import {
  FormSignatureDto,
  GetFileDto,
  HeaderOptions,
  MinioOptions,
  SignatureOptions,
  SignatureResponse,
  UploadDto,
} from '../interfaces';
import { AbstractStorageProvider } from './abstract-storage.provider';

export class MinioProvider extends AbstractStorageProvider {
  private client: Minio.Client;

  constructor(protected readonly options: MinioOptions) {
    super(options);
    this.initClient();
  }

  private initClient(): void {
    const { endPoint, port, accessKey, secretKey, secure } = this.options;
    this.client = new Minio.Client({
      endPoint,
      port: port || 9000,
      useSSL: secure !== false,
      accessKey,
      secretKey,
    });
  }

  getClient(): Minio.Client {
    return this.client;
  }

  async upload(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    try {
      const metadata = { ...this.defaultHeaders, ...options };
      const _fileName = this.getObjectKey(dto.fileInfo);
      const result = await this.client.fPutObject(
        this.options.bucket,
        _fileName,
        normalize(dto.path),
        metadata,
      );
      return {
        name: _fileName,
        url: await this.signatureUrl(_fileName),
        ...result,
      };
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async uploadByStream(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    try {
      const filePath = normalize(dto.path);
      this.validateFile(filePath);

      const fileStream = fs.createReadStream(filePath);
      const fileStats = fs.statSync(filePath);
      const metadata = { ...this.defaultHeaders, ...options };
      const _fileName = this.getObjectKey(dto.fileInfo);
      await this.client.putObject(
        this.options.bucket,
        _fileName,
        fileStream,
        fileStats.size,
        metadata,
      );
      return {
        name: _fileName,
        url: await this.signatureUrl(_fileName),
        etag: null, // MinIO doesn't return etag directly like OSS
      };
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async getFile(dto: GetFileDto): Promise<any> {
    try {
      await this.client.fGetObject(
        this.options.bucket,
        dto.key,
        normalize(dto.savePath),
      );
      return {
        res: {
          status: 200,
          statusCode: 200,
        },
        content: null, // MinIO doesn't return file content directly
      };
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async getFileByStream(dto: GetFileDto): Promise<any> {
    try {
      const fileStream = await this.client.getObject(
        this.options.bucket,
        dto.key,
      );
      const writeStream = fs.createWriteStream(normalize(dto.savePath));

      return new Promise((resolve, reject) => {
        fileStream.pipe(writeStream);

        writeStream.on('finish', () => {
          resolve({
            res: {
              status: 200,
              statusCode: 200,
            },
          });
        });

        writeStream.on('error', (err) => {
          reject(new HttpException(err, 500));
        });
      });
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async signatureUrl(key: string, options?: SignatureOptions): Promise<string> {
    try {
      const signOptions = { ...this.defaultSignatureOptions, ...options };
      const expires = Number(signOptions.expires) || 1800;
      const url = await this.client.presignedGetObject(
        this.options.bucket,
        key,
        expires,
      );

      return url;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<SignatureResponse> {
    const key = this.getObjectKey(formDto);
    const expires = 24 * 60 * 60; // 1 day in seconds
    let aclToApply = formDto.acl;
    if (aclToApply === 'default' || !aclToApply) {
      aclToApply = 'private'; // 默认ACL设为 'private'
    }
    try {
      // 创建 PostPolicy 对象
      const postPolicy = new Minio.PostPolicy();
      postPolicy.setBucket(this.options.bucket);
      postPolicy.setKey(key);
      postPolicy.setExpires(new Date(Date.now() + expires * 1000));

      // 设置文件大小限制
      postPolicy.setContentLengthRange(
        0,
        formDto.fileSize || 1024 * 1024 * 1024,
      );
      let alcInfo = {};
      if (aclToApply !== 'private') {
        postPolicy.policy.conditions.push(['eq', '$x-amz-acl', aclToApply]);
        postPolicy.policy.conditions.push([
          'eq',
          '$x-amz-meta-acl',
          aclToApply,
        ]);
        alcInfo = {
          'x-amz-acl': aclToApply,
          'x-amz-meta-acl': aclToApply,
        };
      }
      // 正确地调用 presignedPostPolicy 方法，只传递一个参数
      const { postURL, formData } =
        await this.client.presignedPostPolicy(postPolicy);
      return {
        type: 'minio',
        expire: dayjs().add(1, 'days').unix().toString(),
        policy: formData.policy,
        signature: formData['x-amz-signature'],
        accessId: formData['x-amz-credential'] || this.options.accessKey,
        host: postURL,
        key,
        'x-amz-algorithm': formData['x-amz-algorithm'],
        'x-amz-credential': formData['x-amz-credential'],
        'x-amz-date': formData['x-amz-date'],
        'x-amz-signature': formData['x-amz-signature'],
        'x-amz-acl': aclToApply,
        'x-amz-meta-acl': aclToApply,
        ...alcInfo,
      };
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async deleteFile(key: string): Promise<any> {
    try {
      await this.client.removeObject(this.options.bucket, key);
      return { res: { status: 204 } };
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async uploadStreamDirect(
    stream: Readable,
    key: string,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any> {
    try {
      const metadata = { ...this.defaultHeaders, ...options };

      // MinIO需要知道流的大小，如果没有提供size，我们需要先缓存流来获取大小
      if (size !== undefined) {
        await this.client.putObject(
          this.options.bucket,
          key,
          stream,
          size,
          metadata,
        );
      } else {
        // 如果没有提供size，我们需要先将流转换为Buffer
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          stream.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          stream.on('end', () => resolve());
          stream.on('error', reject);
        });

        const buffer = Buffer.concat(chunks);
        await this.client.putObject(
          this.options.bucket,
          key,
          buffer,
          buffer.length,
          metadata,
        );
      }

      return {
        name: key,
        url: await this.signatureUrl(key),
        etag: null,
      };
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async deleteFiles(keys: string[]): Promise<any> {
    try {
      await this.client.removeObjects(this.options.bucket, keys);
      return {
        res: { status: 204 },
        deleted: keys,
      };
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }
}

```


#### 代码说明

# @cs/nest-files


