import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';
import { BaseFullEntity } from '../../../common/entities';

export enum RuleType {
  WHITELIST = 'whitelist',
  BLACKLIST = 'blacklist',
}

@Entity('ip_rules')
export class IpRule extends BaseFullEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  ipAddress: string;

  @Column({
    type: 'simple-enum',
    enum: RuleType,
  })
  @Index()
  ruleType: RuleType;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  expiresAt: Date;
}
