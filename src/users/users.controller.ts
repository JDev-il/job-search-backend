import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreateUserDto } from '../auth/dto/user/create-user.dto';
import { NewUserDto } from '../auth/dto/user/login-user.dto';
import { UserService } from './users.service';

@Controller('users')
export class UsersController {

  constructor(private readonly usersService: UserService) { }

  @Get('user')
  async getUser(@Query('user_id') user_id: string) {
    if (user_id) {
      const userByEmail = await this.usersService.findOneByEmail(user_id);
      if (userByEmail && userByEmail.email.includes(user_id)) {
        return userByEmail;
      }
    } else {
      await this.usersService.findUsers();
    }
  }

  @Get('all')
  async getAllUsers() { //! For Development Purposes Only!
    return await this.usersService.findUsers();
  }

  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.findOneById(id);
  }

  @Post('add')
  async insertNewUser(@Body() newUserDto: CreateUserDto): Promise<NewUserDto> {
    return await this.usersService.createUser(newUserDto);
  }

}