import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
 
const mockPrismaService = {
  users: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
 
describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;
 
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
 
    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
 
    jest.clearAllMocks();
  });
 
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
 
  // Test Suite for findAProfile
  // Verifies that:
  // 1. Success: Returns the user profile when the user is found.
  // 2. Failure: Throws NotFoundException when the user does not exist.
  describe('findAProfile', () => {
    it('should return user profile when user is found', async () => {
      const mockUser = {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        Role: 'USER',
      };
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
 
      const result = await service.findAProfile(1);
 
      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.Role,
      });
      expect(prisma.users.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });
 
    it('should throw NotFoundException when user is not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);
 
      await expect(service.findAProfile(999)).rejects.toThrow(NotFoundException);
      await expect(service.findAProfile(999)).rejects.toThrow('User 999 not found');
      expect(prisma.users.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
    });
  });
 
  // Test Suite for update
  // Verifies that:
  // 1. Success: Updates and returns the user profile when found.
  // 2. Failure: Throws an error if Prisma cannot find the record to update.
  describe('update', () => {
    it('should update and return the user profile', async () => {
      const dto: UpdateUserDto = { name: 'Jane Doe', email: 'jane.doe@example.com' };
      const mockUpdatedUser = {
        id: 1,
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        Role: 'USER',
      };
      mockPrismaService.users.update.mockResolvedValue(mockUpdatedUser);
 
      const result = await service.update(1, dto);
 
      expect(result).toEqual({
        id: mockUpdatedUser.id,
        name: mockUpdatedUser.name,
        email: mockUpdatedUser.email,
        role: mockUpdatedUser.Role,
      });
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
    });
 
    it('should throw if user is not found during update', async () => {
      const dto: UpdateUserDto = { name: 'Jane Doe' };
      mockPrismaService.users.update.mockRejectedValue(
        new Error('Record to update not found.'),
      );
 
      await expect(service.update(999, dto)).rejects.toThrow('Record to update not found.');
    });
  });
});
 