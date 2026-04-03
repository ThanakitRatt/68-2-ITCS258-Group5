import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Mock cache-manager-redis-yet so CacheModule does not attempt a real Redis
// connection during test module compilation (hoisted by ts-jest before imports).
jest.mock('cache-manager-redis-yet', () => ({
  redisStore: jest.fn().mockResolvedValue({
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
    mget: jest.fn().mockResolvedValue([]),
    mset: jest.fn().mockResolvedValue(undefined),
    mdel: jest.fn().mockResolvedValue(undefined),
    keys: jest.fn().mockResolvedValue([]),
    ttl: jest.fn().mockResolvedValue(-1),
  }),
}));

// Mock ioredis so RedisService does not attempt a real Redis connection.
// This also makes the logout blacklist write succeed silently.
jest.mock('ioredis', () => {
  const mockClient = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    on: jest.fn().mockReturnThis(),
    disconnect: jest.fn(),
  };
  return jest.fn().mockImplementation(() => mockClient);
});

// Replace ThrottlerGuard with a no-op so rate-limiting never fires during tests.
jest.mock('@nestjs/throttler', () => {
  const actual = jest.requireActual('@nestjs/throttler') as object;
  return {
    ...actual,
    ThrottlerGuard: class {
      canActivate() {
        return true;
      }
    },
  };
});

// Shared state across flows
let app: INestApplication;
let prisma: PrismaService;

// Tokens
let userToken: string;
let adminToken: string;
let user2Token: string;

// IDs
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

// ─── Global Setup ─────────────────────────────────────────────────────────────
beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useLogger(false); // Silence all logs during tests (no more red ERROR messages)
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.init();

  prisma = moduleFixture.get<PrismaService>(PrismaService);

  // Clean test data
  await prisma.notifications.deleteMany({});
  await prisma.bookings.deleteMany({});
  await prisma.rooms.deleteMany({ where: { name: { startsWith: 'E2E' } } });
  await prisma.users.deleteMany({
    where: {
      email: {
        in: ['e2euser@test.com', 'e2eadmin@test.com', 'e2euser2@test.com'],
      },
    },
  });

  // Seed Admin directly (no admin register endpoint)
  const hash = await bcrypt.hash('Admin1234!', 12);
  await prisma.users.create({
    data: { name: 'E2E Admin', email: 'e2eadmin@test.com', password: hash, Role: 'Admin' },
  });
}, 30000);

afterAll(async () => {
  await prisma.notifications.deleteMany({});
  await prisma.bookings.deleteMany({});
  await prisma.rooms.deleteMany({ where: { name: { startsWith: 'E2E' } } });
  await prisma.users.deleteMany({
    where: {
      email: {
        in: ['e2euser@test.com', 'e2eadmin@test.com', 'e2euser2@test.com'],
      },
    },
  });
  await app.close();
}, 30000);

// =============================================================================
// FLOW 1 — Health Check
// =============================================================================
describe('[Flow 1] Health Check', () => {
  it('/ (GET) - API is alive and returns Hello World! (200)', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);
    expect(response.text).toBe('Hello World!');
  });
});

// =============================================================================
// FLOW 2 — User Registration Flow
// Sign-up with valid data, then test all failure scenarios
// =============================================================================
describe('[Flow 2] User Registration', () => {
  // Success
  it('/auth/register (POST) - Success: Register new user (201)', async () => {
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

  it('/auth/register (POST) - DB State: password is hashed in database', async () => {
    const user = await prisma.users.findFirst({ where: { email: 'e2euser@test.com' } });
    expect(user).not.toBeNull();
    const isHashed = await bcrypt.compare('Test1234!', user!.password);
    expect(isHashed).toBe(true);
  });

  // Failures
  it('/auth/register (POST) - Fail: Duplicate email returns 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Duplicate', email: 'e2euser@test.com', password: 'Test1234!' })
      .expect(409);
  });

  it('/auth/register (POST) - Fail: Missing name and password returns 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'noname@test.com' })
      .expect(400);
  });

  it('/auth/register (POST) - Fail: Invalid email format returns 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Bad', email: 'not-an-email', password: 'Test1234!' })
      .expect(400);
  });

  it('/auth/register (POST) - Fail: Password too short returns 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Bad', email: 'short@test.com', password: '123' })
      .expect(400);
  });
});

// =============================================================================
// FLOW 3 — Login Flow (User + Admin)
// =============================================================================
describe('[Flow 3] Login', () => {
  // Success
  it('/auth/login (POST) - Success: User login returns access_token (200)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2euser@test.com', password: 'Test1234!' })
      .expect(200);
    expect(response.body).toHaveProperty('access_token');
    expect(typeof response.body.access_token).toBe('string');
    userToken = response.body.access_token;
  });

  it('/auth/login (POST) - Success: Admin login returns access_token (200)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2eadmin@test.com', password: 'Admin1234!' })
      .expect(200);
    expect(response.body).toHaveProperty('access_token');
    adminToken = response.body.access_token;
  });

  // Failures
  it('/auth/login (POST) - Fail: Wrong password returns 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2euser@test.com', password: 'WrongPass!' })
      .expect(401);
  });

  it('/auth/login (POST) - Fail: Non-existent email returns 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ghost@test.com', password: 'Test1234!' })
      .expect(401);
  });

  it('/auth/login (POST) - Fail: Empty body returns 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({})
      .expect(400);
  });
});

// =============================================================================
// FLOW 4 — Protected Profile Route (JWT Guard)
// =============================================================================
describe('[Flow 4] Protected Profile Route', () => {
  // Failures
  it('/users/myProfile (GET) - Fail: No token returns 401', async () => {
    await request(app.getHttpServer()).get('/users/myProfile').expect(401);
  });

  it('/users/myProfile (GET) - Fail: Fake/invalid token returns 401', async () => {
    await request(app.getHttpServer())
      .get('/users/myProfile')
      .set('Authorization', 'Bearer totally.fake.token')
      .expect(401);
  });

  // Success
  it('/users/myProfile (GET) - Success: Valid token returns own profile (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/myProfile')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('id', userId);
    expect(response.body).toHaveProperty('email', 'e2euser@test.com');
    expect(response.body).toHaveProperty('role');
    expect(response.body).not.toHaveProperty('password');
  });
});

// =============================================================================
// FLOW 5 — Admin Room Management Flow
// Admin creates/updates/disables/enables rooms + all failure scenarios
// =============================================================================
describe('[Flow 5] Admin Room Management', () => {
  // Failures first
  it('/rooms (POST) - Fail: No token returns 401', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .send({ name: 'E2E Ghost', capacity: 2, price_per_night: 100 })
      .expect(401);
  });

  it('/rooms (POST) - Fail: Regular user gets 403 Forbidden (RBAC)', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'E2E Forbidden', capacity: 2, price_per_night: 100 })
      .expect(403);
  });

  it('/rooms (POST) - Fail: Missing required fields returns 400', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Incomplete' })
      .expect(400);
  });

  it('/rooms (POST) - Fail: Invalid image_url format returns 400', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Bad URL', capacity: 2, price_per_night: 100, image_url: 'not-a-url' })
      .expect(400);
  });

  // Success
  it('/rooms (POST) - Success: Admin creates room (201)', async () => {
    const response = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
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

  it('/rooms (POST) - DB State: room saved correctly in database', async () => {
    const room = await prisma.rooms.findUnique({ where: { id: createdRoomId } });
    expect(room).not.toBeNull();
    expect(room!.name).toBe('E2E Test Room');
    expect(room!.capacity).toBe(2);
    expect(room!.is_active).toBe(true);
  });

  it('/rooms (GET) - Fail: No token returns 401', async () => {
    await request(app.getHttpServer()).get('/rooms').expect(401);
  });

  it('/rooms (GET) - Success: Authenticated user lists all rooms (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
  });

  it('/rooms/:id (GET) - Success: Get room by ID (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/rooms/${createdRoomId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.name).toBe('E2E Test Room');
  });

  it('/rooms/:id (GET) - Fail: Room not found returns 404', async () => {
    await request(app.getHttpServer())
      .get('/rooms/99999999')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });

  it('/rooms/:id (PATCH) - Fail: Regular user cannot update room (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'E2E Unauthorized' })
      .expect(403);
  });

  it('/rooms/:id (PATCH) - Success: Admin updates room description (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Updated by E2E' })
      .expect(200);
    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.description).toBe('Updated by E2E');
  });

  it('/rooms/:id/disable (PATCH) - Fail: Regular user cannot disable (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/disable`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('/rooms/:id/disable (PATCH) - Success: Admin disables room (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/disable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.is_active).toBe(false);
    expect(response.body.name).toBe('E2E Test Room');
  });

  it('/rooms/:id/enable (PATCH) - Fail: Regular user cannot enable (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/enable`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('/rooms/:id/enable (PATCH) - Success: Admin enables room (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/enable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.is_active).toBe(true);
    expect(response.body.name).toBe('E2E Test Room');
  });
});

// =============================================================================
// FLOW 6 — Search & Filter Available Rooms (FR-27 to FR-29)
// =============================================================================
describe('[Flow 6] Search Available Rooms', () => {
  // Failures
  it('/search/rooms (GET) - Fail: No token returns 401', async () => {
    await request(app.getHttpServer()).get('/search/rooms').expect(401);
  });

  it('/search/rooms (GET) - Fail: Only checkIn without checkOut returns 400', async () => {
    await request(app.getHttpServer())
      .get(`/search/rooms?checkIn=${daysFromNow(10)}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(400);
  });

  // Success
  it('/search/rooms (GET) - Success: Returns active rooms with no filters (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/search/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body).toHaveProperty('total');
    expect(response.body.total).toBeGreaterThanOrEqual(1);
    // All results must be active rooms
    response.body.data.forEach((r: any) => expect(r.is_active).toBe(true));
  });

  it('/search/rooms (GET) - Success: Keyword search finds matching rooms (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/search/rooms?q=E2E')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const found = response.body.data.find((r: any) => r.id === createdRoomId);
    expect(found).toBeDefined();
  });

  it('/search/rooms (GET) - Success: minCapacity filter returns only rooms with enough capacity (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/search/rooms?minCapacity=2')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    response.body.data.forEach((r: any) => expect(r.capacity).toBeGreaterThanOrEqual(2));
  });

  it('/search/rooms (GET) - Success: Price range filter returns only rooms within range (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/search/rooms?minPrice=100&maxPrice=300')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    response.body.data.forEach((r: any) => {
      const price = parseFloat(r.price_per_night);
      expect(price).toBeGreaterThanOrEqual(100);
      expect(price).toBeLessThanOrEqual(300);
    });
  });

  it('/search/rooms (GET) - Success: Date filter excludes rooms with overlapping bookings (200)', async () => {
    // Create a booking first for days +30..+33
    const bookRes = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ room_id: createdRoomId, check_in_date: daysFromNow(30), check_out_date: daysFromNow(33) });
    createdBookingId = bookRes.body.booking.id;

    // Search same window → our room should be excluded
    const response = await request(app.getHttpServer())
      .get(`/search/rooms?checkIn=${daysFromNow(30)}&checkOut=${daysFromNow(33)}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const bookedRoom = response.body.data.find((r: any) => r.id === createdRoomId);
    expect(bookedRoom).toBeUndefined();
  });
});

// =============================================================================
// FLOW 7 — Booking Creation Flow
// =============================================================================
describe('[Flow 7] Booking Creation', () => {
  // Failures
  it('/bookings (POST) - Fail: No token returns 401', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .send({ room_id: createdRoomId, check_in_date: daysFromNow(80), check_out_date: daysFromNow(83) })
      .expect(401);
  });

  it('/bookings (POST) - Fail: check-in date in the past returns 400', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ room_id: createdRoomId, check_in_date: past.toISOString(), check_out_date: daysFromNow(5) })
      .expect(400);
  });

  it('/bookings (POST) - Fail: check-out before check-in returns 400', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ room_id: createdRoomId, check_in_date: daysFromNow(20), check_out_date: daysFromNow(18) })
      .expect(400);
  });

  it('/bookings (POST) - Fail: Room does not exist returns 404', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ room_id: 99999999, check_in_date: daysFromNow(50), check_out_date: daysFromNow(52) })
      .expect(404);
  });

  // Success
  it('/bookings (POST) - Success: User creates booking (201)', async () => {
    const response = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ room_id: createdRoomId, check_in_date: daysFromNow(60), check_out_date: daysFromNow(63) })
      .expect(201);
    expect(response.body.message).toBe('Booking created successfully');
    expect(response.body.booking).toHaveProperty('id');
    expect(response.body.booking.status).toBe('PENDING');
    expect(response.body.booking.user_id).toBe(userId);
    cancelBookingId = response.body.booking.id;
  });

  it('/bookings (POST) - DB State: booking saved with PENDING status', async () => {
    const booking = await prisma.bookings.findUnique({ where: { id: createdBookingId } });
    expect(booking).not.toBeNull();
    expect(booking!.status).toBe('PENDING');
  });

  it('/bookings (POST) - DB State: BOOKING_CREATED notification auto-created', async () => {
    const notif = await prisma.notifications.findFirst({
      where: { booking_id: createdBookingId, type: 'BOOKING_CREATED' },
    });
    expect(notif).not.toBeNull();
    expect(notif!.user_id).toBe(userId);
  });
});

// =============================================================================
// FLOW 8 — Double Booking Prevention
// =============================================================================
describe('[Flow 8] Double Booking Prevention', () => {
  it('/bookings (POST) - Fail: Overlapping dates on same room returns 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ room_id: createdRoomId, check_in_date: daysFromNow(31), check_out_date: daysFromNow(35) })
      .expect(400);
    expect(response.body.message).toMatch(/already booked/i);
  });

  it('/bookings (POST) - Fail: Booking that wraps around existing dates returns 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ room_id: createdRoomId, check_in_date: daysFromNow(28), check_out_date: daysFromNow(35) })
      .expect(400);
    expect(response.body.message).toMatch(/already booked/i);
  });
});

// =============================================================================
// FLOW 9 — View Bookings (User + Admin)
// =============================================================================
describe('[Flow 9] View Bookings', () => {
  // Failures
  it('/bookings/me (GET) - Fail: No token returns 401', async () => {
    await request(app.getHttpServer()).get('/bookings/me').expect(401);
  });

  it('/bookings (GET) - Fail: Regular user cannot view all bookings (403)', async () => {
    await request(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('/bookings/:id (GET) - Fail: Another user cannot view someone else booking (403)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User2', email: 'e2euser2@test.com', password: 'Test1234!' });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2euser2@test.com', password: 'Test1234!' });
    user2Token = loginRes.body.access_token;

    await request(app.getHttpServer())
      .get(`/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);
  });

  it('/bookings/:id (GET) - Fail: Booking not found returns 404', async () => {
    await request(app.getHttpServer())
      .get('/bookings/99999999')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });

  // Success
  it('/bookings/me (GET) - Success: User views only own bookings (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/bookings/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    response.body.forEach((b: any) => expect(b.user_id).toBe(userId));
  });

  it('/bookings/:id (GET) - Success: User views own specific booking (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(response.body.id).toBe(createdBookingId);
  });

  it('/bookings (GET) - Success: Admin views ALL bookings (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('/bookings/:id (GET) - Success: Admin can view any user booking (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body.id).toBe(createdBookingId);
  });
});

// =============================================================================
// FLOW 10 — Admin Manages Booking Status
// =============================================================================
describe('[Flow 10] Admin Manage Booking Status', () => {
  // Failures
  it('/bookings/:id/status (PATCH) - Fail: No token returns 401', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .send({ status: 'APPROVED' })
      .expect(401);
  });

  it('/bookings/:id/status (PATCH) - Fail: Regular user gets 403 (RBAC)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'APPROVED' })
      .expect(403);
  });

  it('/bookings/:id/status (PATCH) - Fail: Invalid status value returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED' })
      .expect(400);
  });

  it('/bookings/:id/status (PATCH) - Fail: Booking not found returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/bookings/99999999/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(404);
  });

  // Success
  it('/bookings/:id/status (PATCH) - Success: Admin approves booking (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);
    expect(response.body.message).toBe('Booking status updated successfully');
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

  it('/bookings/:id/status (PATCH) - Success: Admin marks booking as PAID (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PAID' })
      .expect(200);
    expect(response.body.booking.status).toBe('PAID');
  });
});

// =============================================================================
// FLOW 11 — Booking Cancellation Flow
// =============================================================================
describe('[Flow 11] Booking Cancellation', () => {
  // Failures
  it('/bookings/:id/cancel (PATCH) - Fail: No token returns 401', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${cancelBookingId}/cancel`)
      .expect(401);
  });

  it('/bookings/:id/cancel (PATCH) - Fail: Booking not found returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/bookings/99999999/cancel')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });

  it('/bookings/:id/cancel (PATCH) - Fail: Another user cannot cancel someone else booking (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${cancelBookingId}/cancel`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);
  });

  // Success
  it('/bookings/:id/cancel (PATCH) - Success: User cancels own booking (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/bookings/${cancelBookingId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(response.body.message).toBe('Booking cancelled successfully');
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
  });

  it('/bookings/:id/cancel (PATCH) - Fail: Cannot cancel an already-cancelled booking (400)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${cancelBookingId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(400);
  });
});

// =============================================================================
// FLOW 12 — Notifications Flow
// =============================================================================
describe('[Flow 12] Notifications', () => {
  // Failures
  it('/notifications/me (GET) - Fail: No token returns 401', async () => {
    await request(app.getHttpServer()).get('/notifications/me').expect(401);
  });

  it('/notifications (GET) - Fail: Regular user cannot view all notifications (403)', async () => {
    await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  // Success
  it('/notifications/me (GET) - Success: User views own notifications (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    const types = response.body.map((n: any) => n.type);
    expect(types).toContain('BOOKING_CREATED');
    expect(types).toContain('BOOKING_CANCELLED');
    response.body.forEach((n: any) => {
      expect(n).toHaveProperty('id');
      expect(n).toHaveProperty('type');
      expect(n).toHaveProperty('message');
      expect(n.user_id).toBe(userId);
    });
  });

  it('/notifications (GET) - Success: Admin views all notifications (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// FLOW 13 — Logout Flow
// =============================================================================
describe('[Flow 13] Logout', () => {
  // Failure
  it('/auth/logout (POST) - Fail: No token returns 401', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(401);
  });

  // Success
  it('/auth/logout (POST) - Success: User logs out successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${userToken}`);
    expect([200, 201]).toContain(response.status);
    expect(response.body.message).toBe('Logged out successfully');
  });
});

// =============================================================================
// FLOW 14 — Admin Create Room: Extra Fail Scenarios
// JJ requested: "Admin create room — ใช้ style ไหนก็ได้"
// =============================================================================
describe('[Flow 14] Admin Create Room - Extended Fail Scenarios', () => {
  it('/rooms (POST) - Fail: negative price_per_night returns 400', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Bad Price', capacity: 2, price_per_night: -100 })
      .expect(400);
  });

  it('/rooms (POST) - Fail: capacity is a string (invalid type) returns 400', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Bad Cap', capacity: 'two', price_per_night: 100 })
      .expect(400);
  });

  it('/rooms (POST) - Fail: missing price_per_night returns 400', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E No Price', capacity: 2 })
      .expect(400);
  });

  it('/rooms (POST) - Fail: missing capacity returns 400', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E No Cap', price_per_night: 100 })
      .expect(400);
  });

  it('/rooms (POST) - Fail: completely empty body returns 400', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });

  it('/rooms/:id (PATCH) - Fail: update non-existent room returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/rooms/99999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Ghost Update' })
      .expect(404);
  });

  it('/rooms/:id/disable (PATCH) - Fail: disable non-existent room returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/rooms/99999999/disable')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('/rooms/:id/enable (PATCH) - Fail: enable non-existent room returns 404', async () => {
    await request(app.getHttpServer())
      .patch('/rooms/99999999/enable')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('/rooms (POST) - Fail: user2 (non-admin) also cannot create room (403)', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ name: 'E2E User2 Room', capacity: 2, price_per_night: 100 })
      .expect(403);
  });
});

// =============================================================================
// FLOW 15 — Admin Manage Booking: Extra Fail Scenarios
// JJ requested: "manage booking อะไรก็ได้ด้วยสี"
// =============================================================================
describe('[Flow 15] Admin Manage Booking - Extended Fail Scenarios', () => {
  it('/bookings/:id/status (PATCH) - Fail: missing status field returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });

  it('/bookings/:id/status (PATCH) - Fail: status "DELETED" is not valid enum (400)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DELETED' })
      .expect(400);
  });

  it('/bookings/:id/status (PATCH) - Fail: status "pending" lowercase not accepted (400)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'pending' })
      .expect(400);
  });

  it('/bookings/:id/status (PATCH) - Fail: no token on admin status update returns 401', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .send({ status: 'APPROVED' })
      .expect(401);
  });

  it('/bookings/:id/status (PATCH) - Fail: user2 cannot update booking status (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ status: 'APPROVED' })
      .expect(403);
  });

  it('/bookings (GET) - Fail: user2 cannot view all bookings (403)', async () => {
    await request(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);
  });

  it('/bookings/:id (GET) - Fail: user cannot view booking they do not own (403)', async () => {
    // user2 trying to see createdBookingId which belongs to userId
    await request(app.getHttpServer())
      .get(`/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);
  });
});

// =============================================================================
// FLOW 16 — Disabled Room Cannot Be Booked
// =============================================================================
describe('[Flow 16] Disabled Room Booking Prevention', () => {
  it('/rooms/:id/disable then /bookings (POST) - Fail: cannot book a disabled room (400)', async () => {
    // Step 1: Admin disables the room
    await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/disable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Step 2: Try to book the disabled room (use adminToken since userToken was logged out in Flow 13)
    const response = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        room_id: createdRoomId,
        check_in_date: daysFromNow(90),
        check_out_date: daysFromNow(93),
      })
      .expect(400);

    expect(response.body.message).toMatch(/not available/i);

    // Step 3: Re-enable for other tests
    await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/enable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});

// =============================================================================
// FLOW 17 — Full User Journey (Integration Flow)
// sign-up → login → search → book → view → cancel
// =============================================================================
describe('[Flow 17] Full User Journey (E2E Realistic Flow)', () => {
  let journeyToken: string;
  let journeyRoomId: number;
  let journeyBookingId: number;

  it('Step 1 — Admin creates a fresh room for this journey', async () => {
    const response = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Journey Room',
        description: 'Room used for full journey test',
        capacity: 3,
        price_per_night: 199.00,
        is_active: true,
      })
      .expect(201);
    journeyRoomId = response.body.id;
    expect(journeyRoomId).toBeDefined();
  });

  it('Step 2 — New user registers', async () => {
    // Clean up first in case of re-run
    await prisma.users.deleteMany({ where: { email: 'journey@test.com' } });

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Journey User', email: 'journey@test.com', password: 'Journey1!' })
      .expect(201);
    expect(response.body.user.email).toBe('journey@test.com');
  });

  it('Step 3 — New user logs in and gets token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'journey@test.com', password: 'Journey1!' })
      .expect(200);
    journeyToken = response.body.access_token;
    expect(journeyToken).toBeDefined();
  });

  it('Step 4 — User searches available rooms by capacity', async () => {
    const response = await request(app.getHttpServer())
      .get('/search/rooms?minCapacity=3')
      .set('Authorization', `Bearer ${journeyToken}`)
      .expect(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    const found = response.body.data.find((r: any) => r.id === journeyRoomId);
    expect(found).toBeDefined();
  });

  it('Step 5 — User creates a booking', async () => {
    const response = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${journeyToken}`)
      .send({
        room_id: journeyRoomId,
        check_in_date: daysFromNow(40),
        check_out_date: daysFromNow(43),
      })
      .expect(201);
    expect(response.body.booking.status).toBe('PENDING');
    journeyBookingId = response.body.booking.id;
  });

  it('Step 6 — User views their own bookings list', async () => {
    const response = await request(app.getHttpServer())
      .get('/bookings/me')
      .set('Authorization', `Bearer ${journeyToken}`)
      .expect(200);
    const found = response.body.find((b: any) => b.id === journeyBookingId);
    expect(found).toBeDefined();
    expect(found.status).toBe('PENDING');
  });

  it('Step 7 — Admin approves the booking', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/bookings/${journeyBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);
    expect(response.body.booking.status).toBe('APPROVED');
  });

  it('Step 8 — User checks their notifications after approval', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications/me')
      .set('Authorization', `Bearer ${journeyToken}`)
      .expect(200);
    const types = response.body.map((n: any) => n.type);
    expect(types).toContain('BOOKING_CREATED');
    expect(types).toContain('BOOKING_STATUS_UPDATED');
  });

  it('Step 9 — User cancels the booking', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/bookings/${journeyBookingId}/cancel`)
      .set('Authorization', `Bearer ${journeyToken}`)
      .expect(200);
    expect(response.body.booking.status).toBe('CANCELLED');
  });

  it('Step 10 — Cancelled booking now frees the room (same dates are bookable again)', async () => {
    const response = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${journeyToken}`)
      .send({
        room_id: journeyRoomId,
        check_in_date: daysFromNow(40),
        check_out_date: daysFromNow(43),
      })
      .expect(201);
    expect(response.body.booking.status).toBe('PENDING');
    // Cleanup — notifications must be removed before the booking due to FK constraint
    await prisma.notifications.deleteMany({ where: { booking_id: response.body.booking.id } });
    await prisma.bookings.delete({ where: { id: response.body.booking.id } });
  });

  afterAll(async () => {
    await prisma.notifications.deleteMany({ where: { booking_id: journeyBookingId } });
    await prisma.bookings.deleteMany({ where: { room_id: journeyRoomId } });
    await prisma.rooms.deleteMany({ where: { id: journeyRoomId } });
    await prisma.users.deleteMany({ where: { email: 'journey@test.com' } });
  });
});

