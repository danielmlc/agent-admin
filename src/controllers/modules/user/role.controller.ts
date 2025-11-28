import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('权限管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: '创建角色' })
  createRole(
    @Body()
    createRoleDto: {
      name: string;
      description?: string;
      isDefault?: boolean;
      permissions?: string[];
    },
  ) {
    return this.roleService.createRole(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有角色' })
  findAllRoles() {
    return this.roleService.findAllRoles();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取角色详情' })
  findRoleById(@Param('id') id: string) {
    return this.roleService.findRoleById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新角色' })
  updateRole(
    @Param('id') id: string,
    @Body()
    updateRoleDto: {
      name?: string;
      description?: string;
      isDefault?: boolean;
      permissions?: string[];
    },
  ) {
    return this.roleService.updateRole(id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  deleteRole(@Param('id') id: string) {
    return this.roleService.deleteRole(id);
  }

  @Post('permissions')
  @ApiOperation({ summary: '创建权限' })
  createPermission(
    @Body()
    createPermissionDto: {
      code: string;
      description?: string;
      resource?: string;
      action?: string;
    },
  ) {
    return this.roleService.createPermission(createPermissionDto);
  }

  @Get('permissions/list')
  @ApiOperation({ summary: '获取所有权限' })
  findAllPermissions() {
    return this.roleService.findAllPermissions();
  }
}
