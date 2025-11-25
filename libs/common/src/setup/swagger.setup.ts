import { SetupStrategy } from './setup.interface';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
export class SwaggerStrategy extends SetupStrategy {
  setupSwagger(app, docPath, docsConfig) {
    // 加载文档
    const options = new DocumentBuilder()
      .addBearerAuth()
      .setTitle(`${docsConfig.name}`)
      .setDescription(`${docsConfig.describe}`)
      .setVersion(`${docsConfig.version}`)
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(docPath, app, document);
  }
  async execute(): Promise<void> {
    // 加载文档
    const serverPrefix = this.configService.get('serverPath');
    if (this.configService.isConfig('serverPath')) {
      this.app.setGlobalPrefix(serverPrefix);
    }
    const docsPath = serverPrefix ? `${serverPrefix}/docs` : 'docs';
    if (this.configService.isConfig('docs')) {
      // 添加前缀
      const docsConfig = this.configService.get('docs');
      docsConfig.serverPrefix = serverPrefix;
      this.setupSwagger(this.app, docsPath, docsConfig);
    }
  }
}
