import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class KeyGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const credential = request.headers['x-api-key'] as string;

    if (!credential) {
      throw new UnauthorizedException('Missing MCP credential');
    }

    try {
      const payload = this.jwtService.verify(credential, {
        secret: this.configService.get<string>('MCP_CREDENTIAL_SECRET'),
      });
      request.mcpUser = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired MCP credential');
    }
  }
}