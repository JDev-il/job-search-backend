import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../auth/dto/user/create-user.dto';
import { NewUserDto } from '../auth/dto/user/login-user.dto';
import { UserEntity } from './entities/user.entity';

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
      relations: ['job_search']
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  async createUser(userToAdd: CreateUserDto): Promise<NewUserDto> {
    const hashedPassword = await bcrypt.hash(userToAdd.password, 10);
    const newUser = this.userRepository.create({
      ...userToAdd,
      password: hashedPassword,
    });
    try {
      return await this.userRepository.save(newUser) as NewUserDto;
    } catch (error) {
      throw Error('User was not saved!')
    }
  }

}