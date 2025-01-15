import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { LoginUserDto } from '../dto/user/login-user.dto';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const user = (context.switchToWs().getData().req.body as LoginUserDto);
    const isUser = !!user.email && !!user.password;
    if (!authHeader && isUser) {
      return true;
    }
    return super.canActivate(context);
  }
}