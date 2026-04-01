import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

const mockRoomsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findARoom: jest.fn(),
  disable: jest.fn(),
  enable: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('RoomsController', () => {
  let controller: RoomsController;
  let service: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        { provide: RoomsService, useValue: mockRoomsService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
    service = module.get<RoomsService>(RoomsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Test Suite for create (Admin only)
  // Verifies that the controller delegates to RoomsService.create with the correct DTO.
  describe('create', () => {
    it('should create a room', async () => {
      const dto: CreateRoomDto = {
        name: 'Deluxe Room',
        capacity: 2,
        price_per_night: 150.0,
      };
      const result = { id: 1, ...dto };
      mockRoomsService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should throw if service create fails', async () => {
      const dto: CreateRoomDto = { name: 'Bad Room', capacity: 2, price_per_night: 100 };
      mockRoomsService.create.mockRejectedValue(new Error('DB error'));

      await expect(controller.create(dto)).rejects.toThrow('DB error');
    });
  });

  // Test Suite for findAll
  // Verifies that the controller returns the list from the service.
  describe('findAll', () => {
    it('should return an array of rooms', async () => {
      const result = [{ id: 1, name: 'Deluxe Room' }, { id: 2, name: 'Suite' }];
      mockRoomsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should return an empty array when no rooms exist', async () => {
      mockRoomsService.findAll.mockResolvedValue([]);

      expect(await controller.findAll()).toEqual([]);
    });
  });

  // Test Suite for findOne
  // Verifies:
  // 1. Success: Returns the room by ID.
  // 2. Failure: Propagates NotFoundException when room is not found.
  describe('findOne', () => {
    it('should return a single room', async () => {
      const result = { id: 1, name: 'Deluxe Room' };
      mockRoomsService.findARoom.mockResolvedValue(result);

      expect(await controller.findOne(1)).toBe(result);
      expect(service.findARoom).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when room is not found', async () => {
      mockRoomsService.findARoom.mockRejectedValue(new NotFoundException('Room 999 not found'));

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne(999)).rejects.toThrow('Room 999 not found');
    });
  });

  // Test Suite for disable (Admin only)
  // Verifies:
  // 1. Success: Disables the room by ID.
  // 2. Failure: Propagates NotFoundException when room is not found.
  describe('disable', () => {
    it('should disable a room', async () => {
      const result = { id: 1, name: 'Deluxe Room', is_active: false };
      mockRoomsService.disable.mockResolvedValue(result);

      expect(await controller.disable(1)).toEqual(result);
      expect(service.disable).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when room is not found', async () => {
      mockRoomsService.disable.mockRejectedValue(new NotFoundException('Room 999 not found'));

      await expect(controller.disable(999)).rejects.toThrow(NotFoundException);
    });
  });

  // Test Suite for enable (Admin only)
  // Verifies:
  // 1. Success: Enables the room by ID.
  // 2. Failure: Propagates NotFoundException when room is not found.
  describe('enable', () => {
    it('should enable a room', async () => {
      const result = { id: 1, name: 'Deluxe Room', is_active: true };
      mockRoomsService.enable.mockResolvedValue(result);

      expect(await controller.enable(1)).toEqual(result);
      expect(service.enable).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when room is not found', async () => {
      mockRoomsService.enable.mockRejectedValue(new NotFoundException('Room 999 not found'));

      await expect(controller.enable(999)).rejects.toThrow(NotFoundException);
    });
  });

  // Test Suite for update (Admin only)
  // Verifies:
  // 1. Success: Updates the room with the given DTO.
  // 2. Failure: Propagates NotFoundException when room is not found.
  describe('update', () => {
    it('should update a room', async () => {
      const dto: UpdateRoomDto = { name: 'Updated Room', capacity: 3, price_per_night: 200 };
      const result = { id: 1, ...dto };
      mockRoomsService.update.mockResolvedValue(result);

      expect(await controller.update(1, dto)).toEqual(result);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when room is not found', async () => {
      const dto: UpdateRoomDto = { name: 'Updated Room', capacity: 3, price_per_night: 200 };
      mockRoomsService.update.mockRejectedValue(new NotFoundException('Room 999 not found'));

      await expect(controller.update(999, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // Test Suite for remove (Admin only)
  // Verifies that the controller delegates to RoomsService.remove.
  describe('remove', () => {
    it('should remove a room', async () => {
      const result = 'This action removes a #1 room';
      mockRoomsService.remove.mockReturnValue(result);

      expect(controller.remove(1)).toBe(result);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});