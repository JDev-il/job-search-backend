import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../auth/dto/user/create-user.dto';
import { NewUserDto } from '../auth/dto/user/login-user.dto';
import { UserEntity } from './entities/user.entity';

export interface GoogleUserData {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class UserService {

  private emailPattern: RegExp = new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/);

  constructor(
    @InjectRepository(UserEntity) // Inject User repository for database operations
    private readonly userRepository: Repository<UserEntity>,
  ) { }

  async findUsers(): Promise<UserEntity[]> {
    const users = await this.userRepository.find();
    if (!users) {
      throw new NotFoundException(`Users were not found`);
    }
    return users;
  }

  async findOneByEmail(email: string): Promise<UserEntity> {
    if (!this.emailPattern.test(email)) {
      throw NotFoundException.createBody(null, 'Invalid email address', 501);
    }
    return await this.userRepository.findOne({
      where: { email }
    });
  }

  async findOneById(userId: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['jobSearchData']
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  async findByGmailEmail(gmailEmail: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { gmailEmail } });
  }

  async updateGmailHistoryId(userId: number, historyId: string): Promise<void> {
    await this.userRepository.update(userId, { gmailHistoryId: historyId });
  }

  async saveGmailWatchData(userId: number, historyId: string, gmailEmail: string): Promise<void> {
    await this.userRepository.update(userId, { gmailHistoryId: historyId, gmailEmail });
  }

  async findUsersWithGmail(): Promise<UserEntity[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.gmailRefreshToken IS NOT NULL')
      .select(['user.userId', 'user.gmailHistoryId', 'user.gmailEmail'])
      .getMany();
  }

  async getGmailTokens(userId: number): Promise<Pick<UserEntity, 'gmailAccessToken' | 'gmailRefreshToken' | 'gmailTokenExpiry' | 'gmailEmail'> | null> {
    return this.userRepository.findOne({
      where: { userId },
      select: ['gmailAccessToken', 'gmailRefreshToken', 'gmailTokenExpiry', 'gmailEmail'],
    });
  }

  async updateGmailAccessToken(userId: number, accessToken: string, expiry: Date): Promise<void> {
    await this.userRepository.update(userId, { gmailAccessToken: accessToken, gmailTokenExpiry: expiry });
  }

  async saveGmailTokens(
    userId: number,
    accessToken: string,
    refreshToken: string,
    expiry: Date,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      gmailAccessToken: accessToken,
      gmailRefreshToken: refreshToken,
      gmailTokenExpiry: expiry,
    });
  }

  async clearGmailTokens(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailTokenExpiry: null,
      gmailHistoryId: null,
      gmailEmail: null,
    });
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  async createGoogleUser(data: GoogleUserData): Promise<UserEntity> {
    const newUser = this.userRepository.create({
      googleId: data.googleId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: '',
    });
    return this.userRepository.save(newUser);
  }

  async linkGoogleId(userId: number, googleId: string): Promise<void> {
    await this.userRepository.update(userId, { googleId });
  }

  async createUser(userToAdd: CreateUserDto): Promise<NewUserDto> {
    const existing = await this.userRepository.findOne({ where: { email: userToAdd.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const hashedPassword = await bcrypt.hash(userToAdd.password, 10);
    const newUser = this.userRepository.create({
      ...userToAdd,
      password: hashedPassword,
    });
    try {
      return await this.userRepository.save(newUser) as NewUserDto;
    } catch (error) {
      console.error('[createUser] DB error:', error);
      throw Error('User was not saved!')
    }
  }

}