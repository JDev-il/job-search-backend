import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../auth/dto/user.dto/create-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {

  private emailPattern: RegExp = new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/);

  constructor(
    @InjectRepository(User) // Inject User repository for database operations
    private readonly userRepository: Repository<User>,
  ) { }

  async findUsers(): Promise<User[]> {
    const users = await this.userRepository.find();
    if (!users) {
      throw new NotFoundException(`Users were not found`);
    }
    return users;
  }

  async findOneByEmail(email: string): Promise<User> {
    if (!this.emailPattern.test(email)) {
      throw NotFoundException.createBody(null, 'Invalid email address', 501);
    }
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  async findOneById(user_id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { user_id },
      relations: ['jobSearhData']
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${user_id} not found`);
    }
    return user;
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    try {
      return await this.userRepository.save(user);
    } catch {
      throw Error('User was not saved!')
    }
  }

}