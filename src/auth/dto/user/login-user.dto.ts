import { IsEmail, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class UniqueUserDto {

  @IsOptional()
  @IsString()
  auth_token?: string;

  @IsEmail()
  email: string;
}

export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  auth_token?: string;
}


export class AuthorizedUserDto {
  @IsNumber()
  userId: number;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsNumber()
  iat: number;

  @IsOptional()
  @IsNumber()
  exp: number;

  @IsOptional()
  @IsString()
  auth_token?: string;

}