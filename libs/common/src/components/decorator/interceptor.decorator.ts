import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_INTERCEPTOR = 'SKIP_TRANSFORM_INTERCEPTOR';

export const skipTransformInterceptor = (): MethodDecorator =>
  // 跳过转化拦截器
  SetMetadata(SKIP_TRANSFORM_INTERCEPTOR, true);
