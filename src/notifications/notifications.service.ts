import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Users_Role } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger('NotificationsService');

  async findMyNotifications(userId: number) {
    this.logger.log(`Fetching notifications for user id: ${userId}`);

    return this.prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findAll(userRole: Users_Role) {
    if (userRole !== Users_Role.Admin) {
      throw new ForbiddenException('Only admins can view all notifications');
    }

    this.logger.log('Fetching all notifications for admin');

    return this.prisma.notifications.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });
  }
}