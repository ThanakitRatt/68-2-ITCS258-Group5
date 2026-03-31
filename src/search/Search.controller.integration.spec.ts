import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Bookings_status } from '@prisma/client';

// Mock SearchService
// The controller interacts with this mock instead of the real service/DB.
const mockSearchService = {
  searchRooms: jest.fn(),
  searchMyBookings: jest.fn(),
  searchAllBookings: jest.fn(),
};

// describe('SearchController Integration', () => {
//   let controller: SearchController;
//   let service: SearchService;

//   beforeEach(async () => {
//     // We override Guards and Interceptors to isolate the controller.
//     // 1. JwtAuthGuard & RolesGuard: overridden to allow all requests (return true).
//     // 2. CacheInterceptor: overridden to bypass caching logic.
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [SearchController],
//       providers: [
//         {
//           provide: SearchService,
//           useValue: mockSearchService,
//         },
//       ],
//     })
//       .overrideGuard(JwtAuthGuard)
//       .useValue({ canActivate: () => true })
//       .overrideGuard(RolesGuard)
//       .useValue({ canActivate: () => true })
//       .overrideInterceptor(CacheInterceptor)
//       .useValue({ intercept: (ctx: ExecutionContext, next: any) => next.handle() })
//       .compile();

//     controller = module.get<SearchController>(SearchController);
//     service = module.get<SearchService>(SearchService);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should be defined', () => {
//     expect(controller).toBeDefined();
//   });

//   // ─── Test Suite: searchRooms ──────────────────────────────────────────────
//   // Verifies the controller delegates to service.searchRooms and returns the result.
//   describe('searchRooms', () => {
//     it('should call service.searchRooms and return paginated rooms', async () => {
//       const dto = { q: 'deluxe', page: 1, limit: 10 };
//       const result = {
//         data: [{ id: 1, name: 'Deluxe Room', price_per_night: '150.00' }],
//         meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
//       };
//       mockSearchService.searchRooms.mockResolvedValue(result);

//       expect(await controller.searchRooms(dto)).toBe(result);
//       expect(service.searchRooms).toHaveBeenCalledWith(dto);
//     });

//     it('should return empty data when no rooms match', async () => {
//       const dto = { q: 'nonexistent', page: 1, limit: 10 };
//       const result = {
//         data: [],
//         meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
//       };
//       mockSearchService.searchRooms.mockResolvedValue(result);

//       expect(await controller.searchRooms(dto)).toBe(result);
//       expect(service.searchRooms).toHaveBeenCalledWith(dto);
//     });
//   });

//   // ─── Test Suite: searchMyBookings ─────────────────────────────────────────
//   // Verifies:
//   // 1. Controller passes user.id from @GetUser() to service correctly.
//   // 2. Returns the paginated result from service.
//   describe('searchMyBookings', () => {
//     it('should call service.searchMyBookings with user id and return result', async () => {
//       const mockUser = { id: 7, email: 'alice@example.com', role: 'User' };
//       const dto = { status: Bookings_status.PENDING, page: 1, limit: 10 };
//       const result = {
//         data: [{ id: 1, user_id: 7, room_id: 3, status: 'PENDING' }],
//         meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
//       };
//       mockSearchService.searchMyBookings.mockResolvedValue(result);

//       expect(await controller.searchMyBookings(mockUser, dto)).toBe(result);
//       expect(service.searchMyBookings).toHaveBeenCalledWith(mockUser.id, dto);
//     });

//     it('should return empty data when user has no matching bookings', async () => {
//       const mockUser = { id: 99, email: 'nobody@example.com', role: 'User' };
//       const dto = { status: Bookings_status.APPROVED, page: 1, limit: 10 };
//       const result = {
//         data: [],
//         meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
//       };
//       mockSearchService.searchMyBookings.mockResolvedValue(result);

//       expect(await controller.searchMyBookings(mockUser, dto)).toBe(result);
//       expect(service.searchMyBookings).toHaveBeenCalledWith(mockUser.id, dto);
//     });
//   });

//   // ─── Test Suite: searchAllBookings ────────────────────────────────────────
//   // Verifies:
//   // 1. Controller delegates to service.searchAllBookings and returns result.
//   // 2. Works with different filters (status, roomId, date range).
//   describe('searchAllBookings', () => {
//     it('should call service.searchAllBookings and return all bookings', async () => {
//       const dto = { status: Bookings_status.APPROVED, page: 1, limit: 10 };
//       const result = {
//         data: [
//           {
//             id: 1,
//             user_id: 7,
//             room_id: 3,
//             status: 'APPROVED',
//             room: { id: 3, name: 'Deluxe Room' },
//             user: { id: 7, name: 'Alice', email: 'alice@example.com', Role: 'User' },
//           },
//         ],
//         meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
//       };
//       mockSearchService.searchAllBookings.mockResolvedValue(result);

//       expect(await controller.searchAllBookings(dto)).toBe(result);
//       expect(service.searchAllBookings).toHaveBeenCalledWith(dto);
//     });

//     it('should return empty data when no bookings match the filter', async () => {
//       const dto = { roomId: 999, page: 1, limit: 10 };
//       const result = {
//         data: [],
//         meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
//       };
//       mockSearchService.searchAllBookings.mockResolvedValue(result);

//       expect(await controller.searchAllBookings(dto)).toBe(result);
//       expect(service.searchAllBookings).toHaveBeenCalledWith(dto);
//     });
//   });
// });