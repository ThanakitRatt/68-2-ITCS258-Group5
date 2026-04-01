import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ForbiddenException } from '@nestjs/common';
import { Users_Role } from '@prisma/client';

const mockNotificationsService = {
  findMyNotifications: jest.fn(),
  findAll: jest.fn(),
};

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Test Suite for findMyNotifications
  // Verifies that the controller delegates to NotificationsService using the user ID from the token.
  describe('findMyNotifications', () => {
    it('should return notifications for the authenticated user', async () => {
      const mockUser = { id: 1 };
      const result = [
        { id: 1, user_id: 1, message: 'Booking confirmed', created_at: new Date() },
      ];
      mockNotificationsService.findMyNotifications.mockResolvedValue(result);

      expect(await controller.findMyNotifications(mockUser)).toBe(result);
      expect(service.findMyNotifications).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return an empty array when user has no notifications', async () => {
      const mockUser = { id: 999 };
      mockNotificationsService.findMyNotifications.mockResolvedValue([]);

      expect(await controller.findMyNotifications(mockUser)).toEqual([]);
      expect(service.findMyNotifications).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // Test Suite for findAll (Admin only)
  // Verifies:
  // 1. Success: Admin user can retrieve all notifications.
  // 2. Failure: Propagates ForbiddenException for non-admin users.
  describe('findAll', () => {
    it('should return all notifications when called by an Admin', async () => {
      const mockUser = { id: 1, role: Users_Role.Admin };
      const result = [
        { id: 1, user_id: 1, message: 'Booking confirmed', created_at: new Date() },
        { id: 2, user_id: 2, message: 'Booking cancelled', created_at: new Date() },
      ];
      mockNotificationsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(mockUser)).toBe(result);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.role);
    });

    it('should throw ForbiddenException when called by a non-admin user', async () => {
      const mockUser = { id: 2, role: Users_Role.User };
      mockNotificationsService.findAll.mockRejectedValue(
        new ForbiddenException('Only admins can view all notifications'),
      );

      await expect(controller.findAll(mockUser)).rejects.toThrow(ForbiddenException);
      await expect(controller.findAll(mockUser)).rejects.toThrow(
        'Only admins can view all notifications',
      );
    });
  });
});