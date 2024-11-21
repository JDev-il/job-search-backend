import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { LoginUserDto } from '../dto/user/login-user.dto';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const user = (context.switchToWs().getData().req.body as LoginUserDto);
    return !!user.email && !!user.password;
  }
}