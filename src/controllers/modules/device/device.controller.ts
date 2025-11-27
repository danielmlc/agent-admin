import {
  Controller,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('devices')
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
