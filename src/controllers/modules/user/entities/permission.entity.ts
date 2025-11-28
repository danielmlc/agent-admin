import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from 'typeorm';
import { BaseFullEntity } from '../../../common/entities';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission extends BaseFullEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // 权限代码，如 'user:create', 'device:read'

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  resource: string; // 资源名称，如 'user'

  @Column({ nullable: true })
  action: string; // 操作名称，如 'create', 'read'

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
