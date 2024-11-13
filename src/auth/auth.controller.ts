import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthorizedUserDto, LoginUserDto } from './dto/user/login-user.dto';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth') // This sets the base route as /auth
export class AuthController {

  constructor(private authService: AuthService) { }

  @UseGuards(AuthGuard('local')) // Use the local strategy here
  @Post('/login')
  async login(@Req() req: { user: LoginUserDto }) {
    return this.authService.userLogin(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  getProfile(@Req() existingUser: AuthorizedUserDto) {
    return this.authService.verifyUserToken(existingUser); // req.user should contain decoded JWT payload
  }
}