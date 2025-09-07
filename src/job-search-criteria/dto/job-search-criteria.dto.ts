import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class JobSearchCriteriaDto {
  @IsInt()
  @IsNotEmpty()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  positionStack?: string[];

  @IsString()
  @IsOptional()
  positionType?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  minYearsExperience?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  maxYearsExperience?: number;

  @IsBoolean()
  @IsOptional()
  remoteOnly?: boolean;

  @IsString()
  @IsOptional()
  companyName?: string;
}
