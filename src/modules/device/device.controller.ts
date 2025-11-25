import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  getDeviceList(@CurrentUser() user: User) {
    return this.deviceService.getDeviceList(user.id);
  }

  @Delete(':deviceId')
  removeDevice(@CurrentUser() user: User, @Param('deviceId') deviceId: string) {
    return this.deviceService.removeDevice(user.id, deviceId);
  }
}
