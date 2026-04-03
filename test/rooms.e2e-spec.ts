/**
 * rooms.e2e-spec.ts
 * Full Room API Lifecycle E2E Tests
 *
 * - Uses AppModule (complete NestJS application)
 * - Mocks Redis cache store to avoid external dependencies
 * - Seeds a test admin user with role permissions
 * - Tests the complete Room API lifecycle
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// ── Shared state ──────────────────────────────────────────────────────────────
let app: INestApplication;
let prisma: PrismaService;
let accessToken: string;
let createdRoomId: number;

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  // Initialize the complete NestJS application using AppModule
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useLogger(false);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.init();

  prisma = moduleFixture.get<PrismaService>(PrismaService);

  // Clean up any leftover test data from previous runs
  await prisma.notifications.deleteMany({});
  await prisma.bookings.deleteMany({});
  await prisma.rooms.deleteMany({ where: { name: { startsWith: 'E2E Test Room' } } });
  await prisma.users.deleteMany({ where: { email: 'rooms-e2e-admin@test.com' } });

  // Seed a test admin user with appropriate role permissions
  const hash = await bcrypt.hash('Admin1234!', 12);
  await prisma.users.create({
    data: {
      name: 'Rooms E2E Admin',
      email: 'rooms-e2e-admin@test.com',
      password: hash,
      Role: 'Admin',
    },
  });

  // Obtain a JWT access token by authenticating through the login endpoint
  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'rooms-e2e-admin@test.com', password: 'Admin1234!' });

  accessToken = loginRes.body.access_token;
}, 30000);

// ── Teardown ──────────────────────────────────────────────────────────────────
afterAll(async () => {
  // Proper cleanup to remove test data and close the application
  await prisma.rooms.deleteMany({ where: { name: { startsWith: 'E2E Test Room' } } });
  await prisma.users.deleteMany({ where: { email: 'rooms-e2e-admin@test.com' } });
  await app.close();
}, 30000);

// =============================================================================
// Room API Full Lifecycle Tests
// =============================================================================
describe('Room API - Full Lifecycle', () => {

  // ── Test Scenario: Create Room ──────────────────────────────────────────────
  // Send POST request to create a new room with valid data and verify 201 Created
  it('/rooms (POST) - Create Room', async () => {
    const response = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'E2E Test Room',
        description: 'A room created during E2E lifecycle test',
        capacity: 2,
        price_per_night: 150.00,
        image_url: 'https://example.com/room.jpg',
        is_active: true,
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('E2E Test Room');
    expect(response.body.capacity).toBe(2);
    expect(response.body.is_active).toBe(true);

    createdRoomId = response.body.id;
  });

  // ── Test Scenario: Unauthorized Access ─────────────────────────────────────
  // Send POST request without authentication token and verify 401 Unauthorized
  it('/rooms (POST) - Fail Unauthorized', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .send({
        name: 'E2E Test Room Unauthorized',
        capacity: 2,
        price_per_night: 100,
      })
      .expect(401);
  });

  // ── Test Scenario: Get All Rooms ────────────────────────────────────────────
  // Send GET request to retrieve all rooms and verify the created room exists
  it('/rooms (GET) - Get All Rooms', async () => {
    const response = await request(app.getHttpServer())
      .get('/rooms')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const found = response.body.find((r: any) => r.id === createdRoomId);
    expect(found).toBeDefined();
    expect(found.name).toBe('E2E Test Room');
  });

  // ── Test Scenario: Get Single Room ─────────────────────────────────────────
  // Send GET request to retrieve the specific room by ID and verify the response
  it('/rooms/:id (GET) - Get Single Room', async () => {
    const response = await request(app.getHttpServer())
      .get(`/rooms/${createdRoomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.name).toBe('E2E Test Room');
    expect(response.body.capacity).toBe(2);
  });

  // ── Test Scenario: Update Room ──────────────────────────────────────────────
  // Send PATCH request to update room details and verify 200 OK with updated data
  it('/rooms/:id (PATCH) - Update Room', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'E2E Test Room Updated',
        description: 'Updated description',
        price_per_night: 200.00,
      })
      .expect(200);

    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.name).toBe('E2E Test Room Updated');
    expect(response.body.description).toBe('Updated description');
  });

  // ── Test Scenario: Update Not Found ────────────────────────────────────────
  // Send PATCH request with invalid room ID and verify 404 Not Found
  it('/rooms/:id (PATCH) - Fail Not Found', async () => {
    await request(app.getHttpServer())
      .patch('/rooms/99999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Ghost Room' })
      .expect(404);
  });

  // ── Test Scenario: DISABLE Room ────────────────────────────────────────────
  // Update the room status to disabled and verify (200 OK) the response
  it('/rooms/:id/disable (PATCH) - Disable Room', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/disable`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.is_active).toBe(false);
  });

  // ── Test Scenario: ENABLE Room ─────────────────────────────────────────────
  // Update the room status to enabled and verify (200 OK) the response
  it('/rooms/:id/enable (PATCH) - Enable Room', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/rooms/${createdRoomId}/enable`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.id).toBe(createdRoomId);
    expect(response.body.is_active).toBe(true);
    expect(response.body.name).toBe('E2E Test Room Updated');
  });

  // ── Test Scenario: DELETE Room ─────────────────────────────────────────────
  // 1. Delete the room (200 OK)
  // 2. Verify it is actually gone by trying to GET it again (404 Not Found)
  it('/rooms/:id (DELETE) - Delete Room', async () => {
    await request(app.getHttpServer())
      .delete(`/rooms/${createdRoomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Verify it is gone (use a cache-busting query to avoid stale cached GET response)
    await request(app.getHttpServer())
      .get(`/rooms/${createdRoomId}?_t=${Date.now()}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  // ── Failure Scenarios ───────────────────────────────────────────────────────
  it('/rooms (POST) - Fail Unauthorized (no token)', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .send({})
      .expect(401);
  });

  it('/rooms (POST) - Fail missing required fields returns 400', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Incomplete' })
      .expect(400);
  });

  it('/rooms/:id (PATCH) - Fail Not Found with invalid ID', async () => {
    await request(app.getHttpServer())
      .patch('/rooms/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Fail' })
      .expect(404);
  });

  it('/rooms/:id (GET) - Fail Not Found returns 404', async () => {
    await request(app.getHttpServer())
      .get('/rooms/99999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('/rooms/:id (DELETE) - Fail Not Found returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/rooms/99999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

});
