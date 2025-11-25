import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginUsernameDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  captchaId: string;

  @IsString()
  @IsNotEmpty()
  captchaCode: string;
}
