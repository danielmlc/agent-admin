import { SetupStrategy } from './setup.interface';
import { LoggerService } from '../logger';

export class StartedStrategy extends SetupStrategy {
  async execute (): Promise<void> {
    // 服务启动相关程序
    const logger = this.app.get(LoggerService);
    const serverPath = this.configService.get('serverPath', '');
    const port = this.configService.get<number>('port', 3000);
    const appName = this.configService.get<string>('name', 'Application');
    const env = this.configService.get<string>('env', 'dev');
    const docsPath = serverPath ? `${serverPath}/docs` : 'docs';
    // 设置服务访问路径前缀
    if (serverPath) {
      this.app.setGlobalPrefix(serverPath);
    }
    // 构建启动信息
    if (port > 0) {
      await this.app.listen(port);

      let startOutput = `\n- 服务 ${appName
        } 已经正常启动! \n- 服务访问地址: http://${process.env.CS_HOST}:${Number(
          process.env.CS_PORT,
        )}/${process.env.CS_SERVERPATH} \n`;
      if (this.configService.get('docs')) {
        startOutput += `- 服务的RESTfulAPI文档地址: http://${process.env.CS_HOST
          }:${Number(process.env.CS_PORT)}/${docsPath} \n`;
      }
      logger.log(startOutput);
    } else {
      logger.error('service start port not specified!');
    }
  }
}
