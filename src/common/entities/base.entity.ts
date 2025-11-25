import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * 基础实体类 - 包含审计字段
 */
export abstract class BaseEntity {
  // 创建时间
  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  // 创建人ID
  @Column({ name: 'creator_id', nullable: true, comment: '创建人ID' })
  creatorId: string;

  // 创建人名称
  @Column({ name: 'creator_name', nullable: true, comment: '创建人名称' })
  creatorName: string;

  // 修改时间
  @UpdateDateColumn({ name: 'modified_at', comment: '修改时间' })
  modifiedAt: Date;

  // 修改人ID
  @Column({ name: 'modifier_id', nullable: true, comment: '修改人ID' })
  modifierId: string;

  // 修改人名称
  @Column({ name: 'modifier_name', nullable: true, comment: '修改人名称' })
  modifierName: string;

  // 是否删除(软删除)
  @Column({ name: 'is_removed', default: false, comment: '是否删除' })
  isRemoved: boolean;

  // 版本号(乐观锁)
  @VersionColumn({ name: 'version', comment: '版本号' })
  version: number;
}

/**
 * 完整基础实体类 - 包含审计字段 + 排序 + 启用状态
 */
export abstract class BaseFullEntity extends BaseEntity {
  // 排序码
  @Column({ name: 'sort_code', default: 0, comment: '排序码' })
  sortCode: number;

  // 是否启用
  @Column({ name: 'is_enable', default: true, comment: '是否启用' })
  isEnable: boolean;
}
