import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) // Inject User repository for database operations
    private readonly userRepository: Repository<User>,
  ) { }

  async findOne(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
      relations: ['jobSearhData']
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  async addUser(userData: User) {
    const insert = await this.userRepository.save(userData);
    if (insert) {
      return "saved!"
    }
    throw new NotFoundException('An issue occured while saving new user. Please try again.');
  }
}