import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProtectedService } from './protected.service';

@Controller('protected')
export class ProtectedController {
  constructor(private readonly protectedService: ProtectedService) { }

  @Get()
  @UseGuards(AuthGuard('jwt')) // Protect this route
  getProtectedResource() {
    return { message: 'This is a protected route!' };
  }
}