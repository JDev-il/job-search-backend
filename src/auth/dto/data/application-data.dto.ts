import { IsArray, IsDate, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ApplicationDataDto {
  @IsInt()
  @IsNotEmpty()
  userId?: number;

  @IsInt()
  @IsOptional()
  jobId?: number;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  companyLocation: string;

  @IsString()
  @IsNotEmpty()
  positionType: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  positionStack: string[];

  @IsString()
  @IsNotEmpty()
  applicationPlatform: string;

  @IsDate()
  @IsNotEmpty()
  applicationDate: Date;

  @IsString()
  @IsArray()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  hunch?: string;
}
