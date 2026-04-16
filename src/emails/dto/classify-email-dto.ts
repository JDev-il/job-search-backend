import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ClassifyEmailDto {
  @IsString()
  subject: string;

  @IsString()
  bodyText: string;

  @IsString()
  @IsOptional()
  bodyClean?: string;

  @IsOptional()
  @IsString()
  snippet?: string;

  @IsEmail()
  sender: string;

  @IsOptional()
  @IsString()
  senderDomain?: string;
}