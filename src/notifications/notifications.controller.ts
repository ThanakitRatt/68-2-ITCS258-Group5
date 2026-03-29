import { Controller, Get, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/users.decorator';
import { Users_Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get notifications of the logged-in user' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMyNotifications(@GetUser() user: any) {
    return this.notificationsService.findMyNotifications(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Users_Role.Admin)
  @Get()
  @ApiOperation({ summary: 'Get all notifications (Admin only)' })
  @ApiResponse({ status: 200, description: 'All notifications retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@GetUser() user: any) {
    return this.notificationsService.findAll(user.role);
  }
}