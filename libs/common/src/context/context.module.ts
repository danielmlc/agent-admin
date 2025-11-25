// context/context.module.ts
import { Module, Global, DynamicModule } from '@nestjs/common';
import { ContextService } from './context.service';
import { CONTEXT_MODULE_OPTIONS } from './context.constants';
import { ContextModuleOptions } from './context.interfaces';

@Global()
@Module({})
export class ContextModule {
  static forRoot (
    options: ContextModuleOptions = {},
    isGlobal = true,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: ContextModule,
      providers: [
        {
          provide: CONTEXT_MODULE_OPTIONS,
          useValue: {
            enableCaching: true,
            ...options,
          },
        },
        ContextService,
      ],
      exports: [ContextService, CONTEXT_MODULE_OPTIONS],
    };
  }
}
