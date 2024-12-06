import { IsEmail, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class ValidatedLoginDto { // User needs to go through validation in order to proceed

  @IsEmail()
  email: string;

  @IsString()
  auth_token: string;
}

export class NewUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;


}

export class LoginUserDto { // User already has a token, a username and a password
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  auth_token?: string;
}


export class AuthorizedUserDto { // User is fully authorized with userId, email, iat, exp and a valid token
  @IsNumber()
  userId: number;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  auth_token?: string;

  @IsOptional()
  @IsNumber()
  iat?: number;

  @IsOptional()
  @IsNumber()
  exp?: number;

}


export class VerifiedUserDto {

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsNumber()
  iat?: number;

  @IsOptional()
  @IsNumber()
  exp?: number;

}