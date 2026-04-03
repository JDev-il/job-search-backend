import { ConfigService } from '@nestjs/config';
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { GmailWatchService } from '../gmail/services/gmail-watch.service';
import { TestingService } from '../temp/testing.service';
import { UserEntity } from '../users/entities/user.entity';
import { UserService } from '../users/users.service';
import { AuthorizedUserDto, LoginUserDto, PayloadUserDto, ValidatedLoginDto } from './dto/user/login-user.dto';
@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService,
    private readonly usersService: UserService,
    private configService: ConfigService,
    private readonly testingService: TestingService,
    private readonly gmailWatchService: GmailWatchService,
  ) {
    // this.testingService.testProtectedRoute()
  }

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    accessToken: string;
    refreshToken: string;
  }): Promise<string> {
    let user = await this.usersService.findByGoogleId(googleUser.googleId);

    if (!user) {
      const existingByEmail = await this.usersService.findOneByEmail(googleUser.email);
      if (existingByEmail) {
        await this.usersService.linkGoogleId(existingByEmail.userId, googleUser.googleId);
        user = existingByEmail;
      } else {
        user = await this.usersService.createGoogleUser({
          googleId: googleUser.googleId,
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
        });
      }
    }

    const expiry = new Date(Date.now() + 3600 * 1000);
    await this.usersService.saveGmailTokens(user.userId, googleUser.accessToken, googleUser.refreshToken, expiry);

    try {
      await this.gmailWatchService.registerWatch(user.userId, googleUser.email);
    } catch {
      // Non-fatal: watch registration can be retried by cron
    }

    return this.tokenGenerator({ userId: user.userId, email: user.email }).then((t) => t.auth_token);
  }

  // Validate user credentials
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email); // Fetch user by email
    if (user?.googleId && user.password === '') {
      throw new UnauthorizedException('This account uses Google Sign-In. Please sign in with Google.');
    }
    if (user && (await bcrypt.compare(password, user.password))) {
      // Password matches, return user details
      const { password, ...result } = user; // Exclude password from result
      return result;
    }
    throw new UnauthorizedException('Invalid credentials'); // Invalid email/password
  }
  //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING


  async tokenGenerator(user: PayloadUserDto): Promise<ValidatedLoginDto> {
    const payload = { userId: user.userId, email: user.email };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET_KEY'),
      expiresIn: '1d',
    });
    return { email: user.email, auth_token: token };
  }

  async tokenVerification(token: string): Promise<AuthorizedUserDto> {
    try {
      return await this.jwtService.verify(token, { secret: this.configService.get('JWT_SECRET_KEY'), });
    } catch {
      throw new UnauthorizedException();
    }
  }

  async userValidation(loginUser: LoginUserDto): Promise<boolean> {
    const { email, password } = <LoginUserDto>loginUser;
    try {
      const user = await this.usersRepository.findOne({ where: { email } });
      const passwordVerification = await bcrypt.compare(password, user.password);
      return !!passwordVerification;
    } catch {
      throw new UnauthorizedException('User does not exist!');
    }
  }

  async openAiCredentials(user: AuthorizedUserDto): Promise<string> {
    const payload = {
      sub: user.userId,
      email: user.email,
      scope: 'mcp',
    };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('MCP_CREDENTIAL_SECRET'),
      expiresIn: '5m',
    });
    return token;
  }

  //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING
  async generateToken(user: any) {
    const payload = { userId: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }
  //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING

}