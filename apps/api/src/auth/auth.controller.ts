import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ConfirmDto } from "./dto/confirm.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/password-recovery.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { JwtRefreshGuard } from "../common/guards/jwt-refresh.guard";
import { REFRESH_COOKIE } from "./strategies/jwt-refresh.strategy";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password);
  }

  @Public()
  @Post("register/confirm")
  @HttpCode(HttpStatus.OK)
  confirm(@Body() dto: ConfirmDto) {
    return this.auth.confirm(dto.email, dto.code);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto.email, dto.password, res);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req.user as never, res);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    return this.auth.logout(token, res);
  }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }
}
