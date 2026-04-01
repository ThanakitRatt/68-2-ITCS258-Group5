import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Shared state
let app: INestApplication;
let prisma: PrismaService;
let userAccessToken: string;
let adminAccessToken: string;
let user2AccessToken: string;
let userId: number;
let createdRoomId: number;
let createdBookingId: number;
let cancelBookingId: number;

// Helper
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// Setup
beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.init();

  prisma = moduleFixture.get<PrismaService>(PrismaService);

  // Clean previous test data
  await prisma.notifications.deleteMany({});
  await prisma.bookings.deleteMany({});
  await prisma.rooms.deleteMany({ where: { name: { startsWith: 'E2E' } } });
  await prisma.users.deleteMany({
    where: {
      email: { in: ['e2euser@test.com', 'e2eadmin@test.com', 'e2euser2@test.com'] },
    },
  });

  // Seed Admin user (no admin register endpoint exists)
  const hash = await bcrypt.hash('Admin1234!', 12);
  await prisma.users.create({
    data: {
      name: 'E2E Admin',
      email: 'e2eadmin@test.com',
      password: hash,
      Role: 'Admin',
    },
  });
}, 30000);

afterAll(async () => {
  await prisma.notifications.deleteMany({});
  await prisma.bookings.deleteMany({});
  await prisma.rooms.deleteMany({ where: { name: { startsWith: 'E2E' } } });
  await prisma.users.deleteMany({
    where: {
      email: { in: ['e2euser@test.com', 'e2eadmin@test.com', 'e2euser2@test.com'] },
    },
  });
  await app.close();
}, 30000);

// =============================================================================
// 1. Health Check
// =============================================================================
describe('Health Check', () => {
  it('/ (GET) - Should return Hello World!', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);
    expect(response.text).toBe('Hello World!');
  });
});

// =============================================================================
// 2. Auth - Register
// =============================================================================
describe('Auth - Register', () => {
  it('/auth/register (POST) - Register new user successfully (201)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User', email: 'e2euser@test.com', password: 'Test1234!' })
      .expect(201);
    expect(response.body.message).toBe('User registered successfully');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.email).toBe('e2euser@test.com');
    expect(response.body.user).not.toHaveProperty('password');
    userId = response.body.user.id;
  });

  it('/auth/register (POST) - DB State: user exists with hashed password', async () => {
    const user = await prisma.users.findFirst({ where: { email: 'e2euser@test.com' } });
    expect(user).not.toBeNull();
    expect(user!.name).toBe('E2E User');
    const isHashed = await bcrypt.compare('Test1234!', user!.password);
    expect(isHashed).toBe(true);
  });

  it('/auth/register (POST) - Fail duplicate email (409)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Duplicate', email: 'e2euser@test.com', password: 'Test1234!' })
      .expect(409);
  });

  it('/auth/register (POST) - Fail missing fields (400)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'bad@test.com' })
      .expect(400);
  });
});

// =============================================================================
// 3. Auth - Login
// =============================================================================
describe('Auth - Login', () => {
  it('/auth/login (POST) - User login successfully (200)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2euser@test.com', password: 'Test1234!' })
      .expect(200);
    expect(response.body).toHaveProperty('access_token');
    expect(typeof response.body.access_token).toBe('string');
    userAccessToken = response.body.access_token;
  });

  it('/auth/login (POST) - Admin login successfully (200)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2eadmin@test.com', password: 'Admin1234!' })
      .expect(200);
    expect(response.body).toHaveProperty('access_token');
    adminAccessToken = response.body.access_token;
  });

  it('/auth/login (POST) - Fail wrong password (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2euser@test.com', password: 'WrongPass!' })
      .expect(401);
  });

  it('/auth/login (POST) - Fail non-existent email (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ghost@test.com', password: 'Test1234!' })
      .expect(401);
  });
});

// =============================================================================
// 4. Users - Protected Profile Route
// =============================================================================
describe('Users - Profile (JWT Protected)', () => {
  it('/users/myProfile (GET) - Fail no token (401)', async () => {
    await request(app.getHttpServer()).get('/users/myProfile').expect(401);
  });

  it('/users/myProfile (GET) - Fail fake token (401)', async () => {
    await request(app.getHttpServer())
      .get('/users/myProfile')
      .set('Authorization', 'Bearer faketoken.abc.xyz')
      .expect(401);
  });

  it('/users/myProfile (GET) - Return own profile with valid token (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/myProfile')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('id', userId);
    expect(response.body).toHaveProperty('email', 'e2euser@test.com');
    expect(response.body).toHaveProperty('role');
    expect(response.body).not.toHaveProperty('password');
  });
});

// =============================================================================
// 5. Rooms - Management
// =============================================================================
describe('Rooms - Management', () => {
  it('/rooms (POST) - Fail no token (401)', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .send({ name: 'E2E Ghost', capacity: 2, price_per_night: 100 })
      .expect(401);
  });

  it('/rooms (POST) - Fail regular user cannot create room (403)', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({ name: 'E2E Forbidden', capacity: 2, price_per_night: 100 })
      .expect(403);
  });

  it('/rooms (POST) - Fail missing required fields (400)', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'E2E Incomplete' })
      .expect(400);
  });

  it('/rooms (POST) - Admin creates room successfully (201)', async () => {
    const response = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'E2E Test Room',
        description: 'E2E test room description',
        capacity: 2,
        price_per_night: 250.00,
        image_url: 'https://example.com/room.jpg',
        is_active: true,
      })
      .expect(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('E2E Test Room');
    expect(response.body.is_active).toBe(true);
    createdRoomId = response.body.id;
  });

  it('/rooms (POST) - DB State: room exists in database after creation', async () => {
    const room = await prisma.rooms.findUnique({ where: { id: createdRoomId } });
    expect(room).not.toBeNull();
    expect(room!.name).toBe('E2E Test Room');
    expect(room!.capacity).toBe(2);
    expect(room!.is_active).toBe(true);
  });

  it('/rooms (GET) - Fail no token (401)', async () => {
    await request(app.getHttpServer()).get('/rooms').expect(401);
  });

  it('/rooms (GET) - Return list of rooms (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/rooms')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
  });

  it('/rooms/:id (GET) - Return specific room by ID (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/rooms/${createdRoomId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.name).toBe('E2E Test Room');
  });

  it('/rooms/:id (GET) - Fail Not Found (404)', async () => {
    await request(app.getHttpServer())
      .get('/rooms/99999999')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(404);
  });

  it('/rooms/:id (PATCH) - Fail regular user cannot update room (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({ name: 'E2E Unauthorized Edit' })
      .expect(403);
  });

  it('/rooms/:id (PATCH) - Admin updates room successfully (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ description: 'Updated by E2E test' })
      .expect(200);
    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.description).toBe('Updated by E2E test');
  });

  it('/rooms/:id/disable (PATCH) - Fail regular user cannot disable (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/disable`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(403);
  });

  it('/rooms/:id/disable (PATCH) - Admin disables room (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/disable`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.is_active).toBe(false);
    expect(response.body.name).toBe('E2E Test Room');
  });

  it('/rooms/:id/enable (PATCH) - Enable Room (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/enable`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.is_active).toBe(true);
    expect(response.body.name).toBe('E2E Test Room');
  });

  it('/rooms/:id/enable (PATCH) - DB State: room is active again after enable', async () => {
    const room = await prisma.rooms.findUnique({ where: { id: createdRoomId } });
    expect(room!.is_active).toBe(true);
  });
});

// =============================================================================
// 6. Search - Available Rooms (FR-27 to FR-29)
// =============================================================================
describe('Search - Available Rooms', () => {
  it('/search/rooms (GET) - Fail no token (401)', async () => {
    await request(app.getHttpServer()).get('/search/rooms').expect(401);
  });

  it('/search/rooms (GET) - Return all active rooms with no filters (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/search/rooms')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body).toHaveProperty('total');
    expect(response.body.total).toBeGreaterThanOrEqual(1);
  });

  it('/search/rooms (GET) - Search by keyword returns matching rooms (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/search/rooms?q=E2E')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    const found = response.body.data.find((r: any) => r.id === createdRoomId);
    expect(found).toBeDefined();
  });

  it('/search/rooms (GET) - Filter by minCapacity returns correct rooms (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/search/rooms?minCapacity=2')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('data');
    response.body.data.forEach((r: any) => {
      expect(r.capacity).toBeGreaterThanOrEqual(2);
    });
  });

  it('/search/rooms (GET) - Filter by price range returns correct rooms (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/search/rooms?minPrice=100&maxPrice=300')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('data');
    response.body.data.forEach((r: any) => {
      expect(parseFloat(r.price_per_night)).toBeGreaterThanOrEqual(100);
      expect(parseFloat(r.price_per_night)).toBeLessThanOrEqual(300);
    });
  });

  it('/search/rooms (GET) - Filter by date availability excludes booked rooms (200)', async () => {
    // First create a booking for days +30 to +33
    await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({
        room_id: createdRoomId,
        check_in_date: daysFromNow(30),
        check_out_date: daysFromNow(33),
      });

    // Search for same date range - the booked room should NOT appear
    const response = await request(app.getHttpServer())
      .get(`/search/rooms?checkIn=${daysFromNow(30)}&checkOut=${daysFromNow(33)}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    const bookedRoom = response.body.data.find((r: any) => r.id === createdRoomId);
    expect(bookedRoom).toBeUndefined(); // Should NOT be in results

    // Save this booking id for later tests
    const bookings = await prisma.bookings.findMany({
      where: { room_id: createdRoomId, user_id: userId },
      orderBy: { id: 'desc' },
    });
    createdBookingId = bookings[0].id;
  });

  it('/search/rooms (GET) - Fail only checkIn without checkOut (400)', async () => {
    await request(app.getHttpServer())
      .get(`/search/rooms?checkIn=${daysFromNow(30)}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(400);
  });
});

// =============================================================================
// 7. Bookings - Create
// =============================================================================
describe('Bookings - Create', () => {
  it('/bookings (POST) - Fail no token (401)', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .send({ room_id: createdRoomId, check_in_date: daysFromNow(80), check_out_date: daysFromNow(83) })
      .expect(401);
  });

  it('/bookings (POST) - Fail check-in in the past (400)', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({ room_id: createdRoomId, check_in_date: past.toISOString(), check_out_date: daysFromNow(5) })
      .expect(400);
  });

  it('/bookings (POST) - Fail check-out before check-in (400)', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({ room_id: createdRoomId, check_in_date: daysFromNow(20), check_out_date: daysFromNow(18) })
      .expect(400);
  });

  it('/bookings (POST) - Fail room not found (404)', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({ room_id: 99999999, check_in_date: daysFromNow(50), check_out_date: daysFromNow(52) })
      .expect(404);
  });

  it('/bookings (POST) - Create cancellation booking successfully (201)', async () => {
    const response = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({ room_id: createdRoomId, check_in_date: daysFromNow(60), check_out_date: daysFromNow(63) })
      .expect(201);
    expect(response.body.message).toBe('Booking created successfully');
    expect(response.body.booking.status).toBe('PENDING');
    cancelBookingId = response.body.booking.id;
  });

  it('/bookings (POST) - DB State: booking exists with PENDING status', async () => {
    const booking = await prisma.bookings.findUnique({ where: { id: createdBookingId } });
    expect(booking).not.toBeNull();
    expect(booking!.status).toBe('PENDING');
    expect(booking!.user_id).toBe(userId);
    expect(booking!.room_id).toBe(createdRoomId);
  });

  it('/bookings (POST) - DB State: BOOKING_CREATED notification was auto-created', async () => {
    const notif = await prisma.notifications.findFirst({
      where: { booking_id: createdBookingId, type: 'BOOKING_CREATED' },
    });
    expect(notif).not.toBeNull();
    expect(notif!.user_id).toBe(userId);
  });
});

// =============================================================================
// 8. Bookings - Double Booking Prevention
// =============================================================================
describe('Bookings - Double Booking Prevention', () => {
  it('/bookings (POST) - Fail overlapping booking dates (400)', async () => {
    const response = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({ room_id: createdRoomId, check_in_date: daysFromNow(31), check_out_date: daysFromNow(35) })
      .expect(400);
    expect(response.body.message).toMatch(/already booked/i);
  });
});

// =============================================================================
// 9. Bookings - View
// =============================================================================
describe('Bookings - View', () => {
  it('/bookings/me (GET) - Fail no token (401)', async () => {
    await request(app.getHttpServer()).get('/bookings/me').expect(401);
  });

  it('/bookings/me (GET) - User views own bookings (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/bookings/me')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    response.body.forEach((b: any) => expect(b.user_id).toBe(userId));
  });

  it('/bookings/:id (GET) - User views own specific booking (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(response.body.id).toBe(createdBookingId);
    expect(response.body.user_id).toBe(userId);
  });

  it('/bookings/:id (GET) - Fail another user cannot view this booking (403)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User2', email: 'e2euser2@test.com', password: 'Test1234!' });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2euser2@test.com', password: 'Test1234!' });
    user2AccessToken = loginRes.body.access_token;
    await request(app.getHttpServer())
      .get(`/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${user2AccessToken}`)
      .expect(403);
  });

  it('/bookings (GET) - Fail regular user cannot view all bookings (403)', async () => {
    await request(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(403);
  });

  it('/bookings (GET) - Admin views all bookings (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('/bookings/:id (GET) - Admin can view any booking (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    expect(response.body.id).toBe(createdBookingId);
  });
});

// =============================================================================
// 10. Bookings - Admin Update Status
// =============================================================================
describe('Bookings - Update Status (Admin only)', () => {
  it('/bookings/:id/status (PATCH) - Fail no token (401)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .send({ status: 'APPROVED' })
      .expect(401);
  });

  it('/bookings/:id/status (PATCH) - Fail regular user cannot update status (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({ status: 'APPROVED' })
      .expect(403);
  });

  it('/bookings/:id/status (PATCH) - Fail invalid status value (400)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: 'INVALID_STATUS' })
      .expect(400);
  });

  it('/bookings/:id/status (PATCH) - Fail booking not found (404)', async () => {
    await request(app.getHttpServer())
      .patch('/bookings/99999999/status')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: 'APPROVED' })
      .expect(404);
  });

  it('/bookings/:id/status (PATCH) - Admin approves booking (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);
    expect(response.body.message).toBe('Booking status updated successfully');
    expect(response.body.booking.id).toBe(createdBookingId);
    expect(response.body.booking.status).toBe('APPROVED');
  });

  it('/bookings/:id/status (PATCH) - DB State: booking is APPROVED in database', async () => {
    const booking = await prisma.bookings.findUnique({ where: { id: createdBookingId } });
    expect(booking!.status).toBe('APPROVED');
  });

  it('/bookings/:id/status (PATCH) - DB State: BOOKING_STATUS_UPDATED notification created', async () => {
    const notif = await prisma.notifications.findFirst({
      where: { booking_id: createdBookingId, type: 'BOOKING_STATUS_UPDATED' },
    });
    expect(notif).not.toBeNull();
    expect(notif!.message).toContain('APPROVED');
  });

  it('/bookings/:id/status (PATCH) - Admin marks booking as PAID (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: 'PAID' })
      .expect(200);
    expect(response.body.booking.status).toBe('PAID');
  });
});

// =============================================================================
// 11. Bookings - Cancel
// =============================================================================
describe('Bookings - Cancel', () => {
  it('/bookings/:id/cancel (PATCH) - Fail no token (401)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${cancelBookingId}/cancel`)
      .expect(401);
  });

  it('/bookings/:id/cancel (PATCH) - Fail booking not found (404)', async () => {
    await request(app.getHttpServer())
      .patch('/bookings/99999999/cancel')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(404);
  });

  it('/bookings/:id/cancel (PATCH) - User cancels own booking (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/bookings/${cancelBookingId}/cancel`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(response.body.message).toBe('Booking cancelled successfully');
    expect(response.body.booking.id).toBe(cancelBookingId);
    expect(response.body.booking.status).toBe('CANCELLED');
  });

  it('/bookings/:id/cancel (PATCH) - DB State: booking is CANCELLED in database', async () => {
    const booking = await prisma.bookings.findUnique({ where: { id: cancelBookingId } });
    expect(booking!.status).toBe('CANCELLED');
  });

  it('/bookings/:id/cancel (PATCH) - DB State: BOOKING_CANCELLED notification created', async () => {
    const notif = await prisma.notifications.findFirst({
      where: { booking_id: cancelBookingId, type: 'BOOKING_CANCELLED' },
    });
    expect(notif).not.toBeNull();
    expect(notif!.user_id).toBe(userId);
  });

  it('/bookings/:id/cancel (PATCH) - Fail already cancelled booking (400)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${cancelBookingId}/cancel`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(400);
  });
});

// =============================================================================
// 12. Notifications
// =============================================================================
describe('Notifications', () => {
  it('/notifications/me (GET) - Fail no token (401)', async () => {
    await request(app.getHttpServer()).get('/notifications/me').expect(401);
  });

  it('/notifications/me (GET) - User views own notifications (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications/me')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    response.body.forEach((n: any) => {
      expect(n).toHaveProperty('id');
      expect(n).toHaveProperty('type');
      expect(n).toHaveProperty('message');
      expect(n.user_id).toBe(userId);
    });
  });

  it('/notifications/me (GET) - Contains BOOKING_CREATED notification', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications/me')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    const types = response.body.map((n: any) => n.type);
    expect(types).toContain('BOOKING_CREATED');
  });

  it('/notifications/me (GET) - Contains BOOKING_CANCELLED notification', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications/me')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);
    const types = response.body.map((n: any) => n.type);
    expect(types).toContain('BOOKING_CANCELLED');
  });

  it('/notifications (GET) - Fail regular user cannot view all notifications (403)', async () => {
    await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(403);
  });

  it('/notifications (GET) - Admin views all notifications (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// 13. Auth - Logout
// =============================================================================
describe('Auth - Logout', () => {
  it('/auth/logout (POST) - Fail no token (401)', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(401);
  });

  it('/auth/logout (POST) - User logs out successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${userAccessToken}`);
    expect([200, 201]).toContain(response.status);
    expect(response.body.message).toBe('Logged out successfully');
  });
});
