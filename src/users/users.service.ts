import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../auth/dto/user/create-user.dto';
import { LoginUserDto } from '../auth/dto/user/login-user.dto';
import { UserRegistrationEntity } from './entities/user.entity';

@Injectable()
export class UserService {

  private emailPattern: RegExp = new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/);

  constructor(
    @InjectRepository(UserRegistrationEntity) // Inject User repository for database operations
    private readonly userRepository: Repository<UserRegistrationEntity>,
  ) { }

  async findUsers(): Promise<UserRegistrationEntity[]> {
    const users = await this.userRepository.find();
    if (!users) {
      throw new NotFoundException(`Users were not found`);
    }
    return users;
  }

  async findOneByEmail(email: string): Promise<UserRegistrationEntity> {
    if (!this.emailPattern.test(email)) {
      throw NotFoundException.createBody(null, 'Invalid email address', 501);
    }
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  async findOneById(user_id: number): Promise<UserRegistrationEntity> {
    const user = await this.userRepository.findOne({
      where: { user_id },
      relations: ['jobSearhData']
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${user_id} not found`);
    }
    return user;
  }

  async createUser(createUserDto: CreateUserDto): Promise<LoginUserDto> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const newUser = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    try {
      const saved = await this.userRepository.save(newUser) as LoginUserDto;
      if (saved) {
        return saved
      }
    } catch (error) {
      throw Error('User was not saved!')
    }
  }

}