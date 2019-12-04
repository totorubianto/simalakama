import {
  Injectable,
  UnauthorizedException,
  Request,
  Response,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as JWT from 'jwt-decode';
import { Auth } from './interfaces/jwt.interface';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('Auth') private readonly authModel: Model<Auth>,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // validation user by password
  async validateUserByPassword(loginAttempt: LoginUserDto) {
    let userToAttempt = await this.usersService.findOne({email: loginAttempt.email});
    if (!userToAttempt) throw new BadRequestException('email tidak ditemukan');
    const isMatch = await bcrypt.compare(
      loginAttempt.password,
      userToAttempt.password,
    );
    if (!isMatch)
      throw new BadRequestException('password yang anda masukan salah');
     
    const [accessToken, refreshToken] = this.createJwtPayload(userToAttempt);
    const saveToken = {
      accessToken: accessToken,
      refreshToken: refreshToken,
      actor: userToAttempt._id,
      actorModel: userToAttempt.role,
    };
    const newItem = new this.authModel(saveToken);
    const result = newItem.save();
    return result;
  }

  // find token from header and check of auth model
  async findTokenEmail(token: string): Model<Auth> {
    const tokenNotBearer = token.replace('Bearer ', '');
    const data = await this.authModel.findOne({ accessToken: tokenNotBearer });
    return data;
  }

  // validate user by jwt
  async validateUserByJwt(payload: JwtPayload, token: string) {
    let user = await this.findTokenEmail(token);
    if (!user)
      throw new UnauthorizedException('Session login anda sudah habis');
    const data = JWT(user.accessToken);
    const expiresIn = data.exp * 1000;
    let compareDate: boolean = expiresIn > Date.now();
    if (!compareDate) {
      await this.authModel.deleteOne(token);
      throw new UnauthorizedException('Session login anda sudah habis');
    }
    return this.createJwtPayload(payload);
  }

  // create jwt payload
  createJwtPayload(payload:any): [string, string] {
    const payloadData = {
      _id:payload._id,
      email:payload.email,
      role:payload.role,
      name:payload.name
    }
    const accessToken = this.jwtService.sign(payloadData, { expiresIn: process.env.JWT_TTL });
    const refreshToken = this.jwtService.sign({}, { expiresIn: process.env.JWT_REFRESH_TTL });
    return [accessToken, refreshToken];
  }
}
