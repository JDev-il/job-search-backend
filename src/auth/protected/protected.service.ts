import { Injectable } from '@nestjs/common';

@Injectable()
export class ProtectedService {
  getSensitiveData(data: any) {
    return { secret: 'This is sensitive data!' };
  }
}