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

export enum OAuthProvider {
  WECHAT = 'wechat',
  GITHUB = 'github',
}

@Entity('oauth_bindings')
@Index(['provider', 'providerUserId'], { unique: true })
export class OAuthBinding extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.oauthBindings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'simple-enum',
    enum: OAuthProvider,
  })
  @Index()
  provider: OAuthProvider;

  @Column()
  providerUserId: string;

  @Column({ nullable: true })
  providerUsername: string;

  @Column({ type: 'text', nullable: true })
  accessToken: string;

  @Column({ type: 'simple-json', nullable: true })
  profile: Record<string, any>;
}
