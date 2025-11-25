import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../user/entities/refresh-token.entity';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async getDeviceList(userId: string) {
    const devices = await this.refreshTokenRepository.find({
      where: { userId },
      order: { lastUsedAt: 'DESC' },
    });

    return devices.map((device) => ({
      id: device.id,
      deviceInfo: device.deviceInfo,
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
      createdAt: device.createdAt,
      lastUsedAt: device.lastUsedAt,
      expiresAt: device.expiresAt,
    }));
  }

  async removeDevice(userId: string, deviceId: string): Promise<void> {
    await this.refreshTokenRepository.delete({
      id: deviceId,
      userId,
    });
  }
}
