import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { User } from './user.entity';

export enum LoginType {
  PASSWORD = 'password',
  SMS = 'sms',
  WECHAT = 'wechat',
  GITHUB = 'github',
}

export enum LoginStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('login_logs')
export class LoginLog extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.loginLogs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'simple-enum',
    enum: LoginType,
  })
  loginType: LoginType;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'simple-json', nullable: true })
  deviceInfo: Record<string, any>;

  @Column({ nullable: true })
  location: string;

  @Column({
    type: 'simple-enum',
    enum: LoginStatus,
  })
  @Index()
  status: LoginStatus;

  @Column({ nullable: true })
  failureReason: string;
}
