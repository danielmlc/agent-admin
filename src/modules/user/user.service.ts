import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Argon2Utils } from '@libs/common/utils/crypto.util';

@Injectable()
export class UserService {
  private readonly argon2Utils = new Argon2Utils();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, creatorId?: string, creatorName?: string): Promise<User> {
    const { username, phone, email, password, ...rest } = createUserDto;

    // 检查用户名、手机号、邮箱是否已存在
    if (username) {
      const existingUser = await this.userRepository.findOne({ where: { username } });
      if (existingUser) {
        throw new ConflictException('用户名已存在');
      }
    }

    if (phone) {
      const existingUser = await this.userRepository.findOne({ where: { phone } });
      if (existingUser) {
        throw new ConflictException('手机号已存在');
      }
    }

    if (email) {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('邮箱已存在');
      }
    }

    const user = this.userRepository.create({
      username,
      phone,
      email,
      ...rest,
      creatorId,
      creatorName,
    });

    // 如果提供了密码，进行哈希
    if (password) {
      user.passwordHash = await this.argon2Utils.hashPassword(password);
    }

    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
      select: ['id', 'username', 'phone', 'email', 'passwordHash', 'avatar', 'nickname', 'status', 'createdAt', 'modifiedAt', 'lastLoginAt'],
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto, modifierId?: string, modifierName?: string): Promise<User> {
    const user = await this.findById(id);

    const { username, phone, email, ...rest } = updateUserDto;

    // 检查唯一性
    if (username && username !== user.username) {
      const existingUser = await this.userRepository.findOne({ where: { username } });
      if (existingUser) {
        throw new ConflictException('用户名已存在');
      }
      user.username = username;
    }

    if (phone && phone !== user.phone) {
      const existingUser = await this.userRepository.findOne({ where: { phone } });
      if (existingUser) {
        throw new ConflictException('手机号已存在');
      }
      user.phone = phone;
    }

    if (email && email !== user.email) {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('邮箱已存在');
      }
      user.email = email;
    }

    Object.assign(user, rest);

    // 设置修改人信息
    if (modifierId) {
      user.modifierId = modifierId;
    }
    if (modifierName) {
      user.modifierName = modifierName;
    }

    return this.userRepository.save(user);
  }

  async updateLastLoginAt(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) {
      return false;
    }
    return this.argon2Utils.verifyPassword(user.passwordHash, password);
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await this.argon2Utils.hashPassword(newPassword);
    await this.userRepository.update(id, { passwordHash });
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}
