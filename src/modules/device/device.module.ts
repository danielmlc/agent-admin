import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [DeviceController],
  providers: [DeviceService],
})
export class DeviceModule {}
