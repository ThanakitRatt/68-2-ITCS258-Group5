import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { Users_Role } from '@prisma/client';

const mockPrismaService = {
  notifications: {
    findMany: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test Suite for findMyNotifications
  // Verifies that the service returns notifications for the given user, ordered by created_at desc.
  describe('findMyNotifications', () => {
    it('should return notifications for the given user', async () => {
      const result = [
        { id: 1, user_id: 1, message: 'Booking confirmed', created_at: new Date() },
        { id: 2, user_id: 1, message: 'Booking cancelled', created_at: new Date() },
      ];
      mockPrismaService.notifications.findMany.mockResolvedValue(result);

      expect(await service.findMyNotifications(1)).toBe(result);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith({
        where: { user_id: 1 },
        orderBy: { created_at: 'desc' },
      });
    });

    it('should return an empty array when user has no notifications', async () => {
      mockPrismaService.notifications.findMany.mockResolvedValue([]);

      expect(await service.findMyNotifications(999)).toEqual([]);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith({
        where: { user_id: 999 },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  // Test Suite for findAll
  // Verifies:
  // 1. Success: Admin can retrieve all notifications.
  // 2. Failure: Non-admin user throws ForbiddenException.
  describe('findAll', () => {
    it('should return all notifications when called by an Admin', async () => {
      const result = [
        { id: 1, user_id: 1, message: 'Booking confirmed', created_at: new Date() },
        { id: 2, user_id: 2, message: 'Booking cancelled', created_at: new Date() },
      ];
      mockPrismaService.notifications.findMany.mockResolvedValue(result);

      expect(await service.findAll(Users_Role.Admin)).toBe(result);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith({
        orderBy: { created_at: 'desc' },
      });
    });

    it('should throw ForbiddenException when called by a non-admin user', async () => {
      await expect(service.findAll(Users_Role.User)).rejects.toThrow(ForbiddenException);
      await expect(service.findAll(Users_Role.User)).rejects.toThrow(
        'Only admins can view all notifications',
      );
      expect(prisma.notifications.findMany).not.toHaveBeenCalled();
    });
  });
});