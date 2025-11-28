import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();

    // 如果没有用户或用户没有角色，则拒绝
    if (!user || !user.roles) {
      return false;
    }

    // 收集用户所有角色的所有权限
    const userPermissions = new Set<string>();
    user.roles.forEach((role) => {
      if (role.permissions) {
        role.permissions.forEach((permission) => {
          userPermissions.add(permission.code);
        });
      }
    });

    // 检查用户是否拥有所需权限之一（此处逻辑为只需满足一个即可，也可改为需全部满足，视需求而定）
    // 通常这里的语义是 "需要具备这些权限中的至少一个" 或者是 "必须具备这个特定权限"
    // 如果装饰器传入多个，通常意味着 "或" 的关系，或者 "与" 的关系。
    // 这里假设是 "或" 的关系，即满足其中一个即可。
    return requiredPermissions.some((permission) =>
      userPermissions.has(permission),
    );
  }
}
