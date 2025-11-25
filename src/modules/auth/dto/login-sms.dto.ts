import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class LoginSmsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  smsCode: string;
}
