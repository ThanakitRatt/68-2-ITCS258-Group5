import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

const mockUsersService = {
  findAProfile: jest.fn(),
  update: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Test Suite for getMyProfile
  // Verifies that:
  // 1. Success: Returns the user profile using the ID from the token (not URL).
  // 2. Failure: Propagates NotFoundException when the user is not found.
  describe('getMyProfile', () => {
    it('should return the profile for the authenticated user', async () => {
      const mockUser = { id: 1 };
      const mockProfile = {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'USER',
      };
      mockUsersService.findAProfile.mockResolvedValue(mockProfile);

      const result = await controller.getMyProfile(mockUser);

      expect(result).toEqual(mockProfile);
      expect(service.findAProfile).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when user is not found', async () => {
      const mockUser = { id: 999 };
      mockUsersService.findAProfile.mockRejectedValue(
        new NotFoundException('User 999 not found'),
      );

      await expect(controller.getMyProfile(mockUser)).rejects.toThrow(NotFoundException);
      await expect(controller.getMyProfile(mockUser)).rejects.toThrow('User 999 not found');
    });
  });

  // Test Suite for update
  // Verifies that:
  // 1. Success: Updates and returns the user profile using the ID from the token.
  // 2. Failure: Propagates error when the update fails.
  describe('update', () => {
    it('should update and return the profile for the authenticated user', async () => {
      const mockUser = { id: 1 };
      const dto: UpdateUserDto = { name: 'Jane Doe', email: 'jane.doe@example.com' };
      const mockUpdatedProfile = {
        id: 1,
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        role: 'USER',
      };
      mockUsersService.update.mockResolvedValue(mockUpdatedProfile);

      const result = await controller.update(mockUser, dto);

      expect(result).toEqual(mockUpdatedProfile);
      expect(service.update).toHaveBeenCalledWith(mockUser.id, dto);
    });

    it('should throw when update fails', async () => {
      const mockUser = { id: 999 };
      const dto: UpdateUserDto = { name: 'Jane Doe' };
      mockUsersService.update.mockRejectedValue(
        new Error('Record to update not found.'),
      );

      await expect(controller.update(mockUser, dto)).rejects.toThrow(
        'Record to update not found.',
      );
    });
  });
});