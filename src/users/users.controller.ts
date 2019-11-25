import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UseFilters,
  UploadedFile,
  ValidationPipe,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../middleware/decorator/guard.decorator';
import { RolesGuard } from '../middleware/guard/user.guard';
import { UserCustom } from '../middleware/decorator/userLogged.decorator';
import { TransferDto } from '../users/dto/transfer.dto';
import { TransformInterceptor } from '../middleware/interceptor/transform.interceptor';
import { HttpExceptionFilter } from '../middleware/filter/http-exception.filter';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  editFileName,
  imageFileFilter,
} from '../middleware/filter/img-upload.filter';
import { AuthService } from '../auth/auth.service';
@Controller('users')
@UsePipes(ValidationPipe)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(TransformInterceptor)
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}
  // @Register
  @Post('register')
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }
  // @Login
  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    return await this.authService.validateUserByPassword(loginUserDto);
  }

  // @uUpdate Profile
  @Post('update')
  @UseGuards(AuthGuard())
  async update(@Body() updateUserDto: UpdateUserDto, @UserCustom() user: any) {
    return await this.usersService.updateProfile(updateUserDto, user);
  }

  // findAll
  @Get()
  findAll(): Promise<any[]> {
    return this.usersService.findAll();
  }

  // uploadAvatar
  @Post('upload-avatar')
  @UseGuards(AuthGuard())
  @Roles('admin', 'user')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './public/avatar',
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
    }),
  )
  async uploadedFile(@UploadedFile() file, @UserCustom() user: any) {
    return await this.usersService.uploadAvatar(file, user);
  }
}
