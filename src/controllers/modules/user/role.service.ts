import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role, Permission } from './entities';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  // 创建角色
  async createRole(createRoleDto: {
    name: string;
    description?: string;
    isDefault?: boolean;
    permissions?: string[]; // 权限ID列表
  }) {
    const existingRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });
    if (existingRole) {
      throw new BadRequestException('角色名称已存在');
    }

    const role = this.roleRepository.create({
      name: createRoleDto.name,
      description: createRoleDto.description,
      isDefault: createRoleDto.isDefault,
    });

    if (createRoleDto.permissions && createRoleDto.permissions.length > 0) {
      const permissions = await this.permissionRepository.findBy({
        id: In(createRoleDto.permissions),
      });
      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
  }

  // 更新角色
  async updateRole(
    id: string,
    updateRoleDto: {
      name?: string;
      description?: string;
      isDefault?: boolean;
      permissions?: string[];
    },
  ) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
      });
      if (existingRole) {
        throw new BadRequestException('角色名称已存在');
      }
      role.name = updateRoleDto.name;
    }

    if (updateRoleDto.description !== undefined) {
      role.description = updateRoleDto.description;
    }

    if (updateRoleDto.isDefault !== undefined) {
      role.isDefault = updateRoleDto.isDefault;
    }

    if (updateRoleDto.permissions) {
      const permissions = await this.permissionRepository.findBy({
        id: In(updateRoleDto.permissions),
      });
      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
  }

  // 删除角色
  async deleteRole(id: string) {
    const result = await this.roleRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('角色不存在');
    }
  }

  // 获取所有角色
  async findAllRoles() {
    return this.roleRepository.find({ relations: ['permissions'] });
  }

  // 获取单个角色
  async findRoleById(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    return role;
  }

  // 创建权限
  async createPermission(createPermissionDto: {
    code: string;
    description?: string;
    resource?: string;
    action?: string;
  }) {
    const existingPermission = await this.permissionRepository.findOne({
      where: { code: createPermissionDto.code },
    });
    if (existingPermission) {
      throw new BadRequestException('权限代码已存在');
    }

    const permission = this.permissionRepository.create(createPermissionDto);
    return this.permissionRepository.save(permission);
  }

  // 获取所有权限
  async findAllPermissions() {
    return this.permissionRepository.find();
  }
}
