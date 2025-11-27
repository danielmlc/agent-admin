import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { User } from '../../user/entities/user.entity';

export enum ConfigScope {
  GLOBAL = 'global',  // 全局配置
  USER = 'user',      // 用户配置
}

export enum ConfigValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array',
}

@Entity('configs')
@Index(['scope', 'userId', 'group', 'key'], { unique: true })
export class Config extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 配置范围：全局或用户
  @Column({
    type: 'simple-enum',
    enum: ConfigScope,
    default: ConfigScope.GLOBAL,
  })
  @Index()
  scope: ConfigScope;

  // 用户ID（仅当scope为USER时有值）
  @Column({ nullable: true })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  // 配置分组（如：system, ui, notification等）
  @Column()
  @Index()
  group: string;

  // 配置键
  @Column()
  @Index()
  key: string;

  // 配置值（存储为字符串）
  @Column({ type: 'text' })
  value: string;

  // 值类型
  @Column({
    type: 'simple-enum',
    enum: ConfigValueType,
    default: ConfigValueType.STRING,
  })
  valueType: ConfigValueType;

  // 配置描述
  @Column({ type: 'text', nullable: true })
  description: string;

  // 是否公开给前端（仅对全局配置有效）
  @Column({ default: false })
  isPublic: boolean;

  // 是否允许用户自定义（仅对全局配置有效）
  @Column({ default: true })
  isEditable: boolean;

  // 默认值（仅对全局配置有效）
  @Column({ type: 'text', nullable: true })
  defaultValue: string;

  // 排序
  @Column({ default: 0 })
  sort: number;

  // 分组名称（冗余字段，便于查询）
  @Column({ nullable: true })
  groupName: string;
}
