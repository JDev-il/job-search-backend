// applications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './entities/application.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    // private readonly userService: UserService,  // Inject UsersService
  ) { }

  // Fetch all applications
  async findAll(): Promise<Application[]> {
    return await this.applicationRepository.find();
  }

  // Fetch a single application by ID
  async findOne(id: number): Promise<Application> {
    const application = await this.applicationRepository.findOne({ where: { id } });
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  // Create a new application
  async createApplication(data: Partial<Application>): Promise<Application> {
    const application = this.applicationRepository.create(data);
    return await this.applicationRepository.save(application);
  }

  // Delete an application by ID
  async deleteApplication(id: number): Promise<void> {
    const deleteResult = await this.applicationRepository.delete(id);
    if (!deleteResult.affected) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
  }

  // async getApplicationAndUser(applicationId: number, userId: number) {
  //   const application = await this.findOne(applicationId);
  //   // Use UsersService to fetch user data
  //   const user = await this.userService.findOne(userId);
  //   return { application, user };
  // }
}