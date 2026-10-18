import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { InitialSetupDto } from './dto/setup.dto';
import {
  ChangePasswordDto,
  AdminResetPasswordDto,
} from './dto/change-password.dto';
import {
  CurrentUser,
  Public,
  RequirePermissions,
} from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('status')
  async getStatus() {
    return this.authService.getSetupStatus();
  }

  @Public()
  @Post('setup')
  async setup(@Body() setupDto: InitialSetupDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.socket.remoteAddress;
    return this.authService.initialSetup(setupDto, { userAgent, ip });
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.socket.remoteAddress;
    return this.authService.login(loginDto, { userAgent, ip });
  }

  @Post('logout')
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id, user.sessionId);
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Post('admin/reset-password/:userId')
  @RequirePermissions('iam:users:write')
  async adminResetPassword(
    @Param('userId') targetUserId: string,
    @Body() resetDto: AdminResetPasswordDto,
  ) {
    return this.authService.adminResetPassword(targetUserId, resetDto.newPassword);
  }

  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Get('sessions')
  async getSessions(@CurrentUser('id') userId: string) {
    return this.authService.getActiveSessions(userId);
  }

  @Post('force-logout/:userId')
  @RequirePermissions('iam:users:write')
  async forceLogout(@Param('userId') targetUserId: string) {
    return this.authService.forceLogout(targetUserId);
  }
}
