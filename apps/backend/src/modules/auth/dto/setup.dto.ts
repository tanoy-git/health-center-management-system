import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class InitialSetupDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  userName?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.email)
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  centerName?: string;
}
