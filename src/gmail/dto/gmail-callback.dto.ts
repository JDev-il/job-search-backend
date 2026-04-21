import { IsString } from 'class-validator';

export class GmailCallbackDto {
  @IsString()
  code: string;

  @IsString()
  state: string;
}
