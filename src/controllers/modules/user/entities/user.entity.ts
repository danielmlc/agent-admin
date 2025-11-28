import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseFullEntity } from '../../../common/entities';
import { Role } from './role.entity';
import { OAuthBinding } from './oauth-binding.entity';
import { RefreshToken } from './refresh-token.entity';
import { LoginLog } from './login-log.entity';

export enum UserStatus {
  NORMAL = 'normal',
  DISABLED = 'disabled',
  LOCKED = 'locked',
}

@Entity('users')
export class User extends BaseFullEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  @Index()
  username: string;

  @Column({ unique: true, nullable: true })
  @Index()
  phone: string;

  @Column({ unique: true, nullable: true })
  @Index()
  email: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({
    type: 'simple-enum',
    enum: UserStatus,
    default: UserStatus.NORMAL,
  })
  status: UserStatus;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @OneToMany(() => OAuthBinding, (binding) => binding.user)
  oauthBindings: OAuthBinding[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => LoginLog, (log) => log.user)
  loginLogs: LoginLog[];

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
