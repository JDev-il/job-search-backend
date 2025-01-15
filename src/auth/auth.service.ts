// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { TestingService } from '../temp/testing.service';
import { UserEntity } from '../users/entities/user.entity';
import { UserService } from '../users/users.service';
import { jwtConstants } from './constants';
import { AuthorizedUserDto, LoginUserDto, ValidatedLoginDto, VerifiedUserDto } from './dto/user/login-user.dto';
@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService,
    private readonly usersService: UserService,
    private readonly testingService: TestingService
  ) {
    // this.testingService.testProtectedRoute()
  }

  //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING
  async googleLogin(user: any) {
    if (!user) {
      return 'No user from Google';
    }
    // Here you can add logic to save the use// Create a JWT token with user information
    const payload = { email: user.email, name: user.name };
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  // Validate user credentials
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email); // Fetch user by email
    if (user && (await bcrypt.compare(password, user.password))) {
      // Password matches, return user details
      const { password, ...result } = user; // Exclude password from result
      return result;
    }
    throw new UnauthorizedException('Invalid credentials'); // Invalid email/password
  }
  //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING


  async tokenGenerator(user: AuthorizedUserDto & LoginUserDto): Promise<ValidatedLoginDto | null> {
    const payload = <VerifiedUserDto>{ email: user.email, password: user.password };
    const token = this.jwtService.sign(payload);
    return { email: user.email, auth_token: token }
  }

  async tokenVerification(token: string): Promise<AuthorizedUserDto | null> {
    return await this.jwtService.verify(token, { secret: jwtConstants.secret });
  }

  public async userValidation(loginUser: LoginUserDto): Promise<boolean> {
    const { email, password } = <LoginUserDto>loginUser;
    try {
      const user = await this.usersRepository.findOne({ where: { email } });
      const passwordVerification = await bcrypt.compare(password, user.password);
      return !!passwordVerification;
    } catch {
      throw new UnauthorizedException('User does not exist!');
    }
  }


  //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING
  async generateToken(user: any) {
    const payload = { userId: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }
  //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING //! TEMPORARY FRO TESTING

}