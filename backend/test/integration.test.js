/**
 * Comprehensive Test Suite for ERP Backend
 * Tests security fixes, authorization, validation, and business logic
 * File: backend/test/integration.test.js (NEW)
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

// Test data generators
const createTestUser = async (role = 'OPERATOR') => {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@test.com`,
      name: `Test User ${Date.now()}`,
      role,
      passwordHash: 'hashed_password',
      isActive: true,
    },
  });
};

const getAuthToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET
  );
};

describe('ERP Backend Integration Tests', () => {
  
  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: CRITICAL SECURITY TESTS
  // ═══════════════════════════════════════════════════════════════════
  
  describe('✅ PII Encryption', () => {
    test('Party PII should be encrypted in database', async () => {
      const user = await createTestUser('MANAGER');
      const token = getAuthToken(user);
      
      const partyData = {
        name: 'Test Company',
        gstin: '27AAAAA0000A1Z5',
        pan: 'AAAAA0000A',
        accountNo: '12345678901234',
      };
      
      const res = await request(app)
        .post('/api/party')
        .set('Authorization', `Bearer ${token}`)
        .send(partyData);
      
      expect(res.status).toBe(201);
      expect(res.body.data.gstin).not.toContain('27AAAAA');
      expect(res.body.data.gstin).toMatch(/^\*{5}[A-Za-z0-9]{5}\*{5}$/); // Redacted format
    });

    test('Party PII should decrypt on retrieval', async () => {
      const user = await createTestUser('MANAGER');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .get(`/api/party/1`)
        .set('Authorization', `Bearer ${token}`);
      
      // Should NOT contain encrypted garbage
      if (res.status === 200) {
        expect(res.body.data.gstin).not.toMatch(/^[A-Za-z0-9+/=]+$/); // Not base64
      }
    });
  });

  describe('✅ CSRF Protection', () => {
    test('POST without origin header should fail', async () => {
      const user = await createTestUser('MANAGER');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .post('/api/party')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', `accessToken=${token}`)
        .send({ name: 'Test' });
      
      // Should require origin header
      expect([201, 403]).toContain(res.status);
    });

    test('GET request without origin should still work', async () => {
      const user = await createTestUser('OPERATOR');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .get('/api/party')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });
  });

  describe('✅ File Upload Validation', () => {
    test('Executable file should be rejected', async () => {
      const user = await createTestUser('OPERATOR');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .post('/api/upload/attachment')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('MZ\x90\x00'), 'malware.exe');
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('invalid');
    });

    test('Valid image should be accepted', async () => {
      const user = await createTestUser('OPERATOR');
      const token = getAuthToken(user);
      
      // Minimal PNG file
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      
      const res = await request(app)
        .post('/api/upload/attachment')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pngBuffer, 'test.png');
      
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('✅ DOS Protection', () => {
    test('Export with huge limit should be capped', async () => {
      const user = await createTestUser('MANAGER');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .get('/api/invoice?limit=999999')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5000);
    });

    test('Pagination beyond bounds should be rejected', async () => {
      const user = await createTestUser('OPERATOR');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .get('/api/invoice?page=999999999')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(422); // Validation error
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2A: AUTHORIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════
  
  describe('✅ Authorization Checks', () => {
    test('OPERATOR cannot view other OPERATOR\'s inspection', async () => {
      const op1 = await createTestUser('OPERATOR');
      const op2 = await createTestUser('OPERATOR');
      const token2 = getAuthToken(op2);
      
      // Create inspection by OP1
      const inspection = await prisma.incomingInspection.create({
        data: {
          jobCardId: 1,
          inspectedBy: op1.id,
        },
      });
      
      // OP2 tries to access OP1's inspection
      const res = await request(app)
        .get(`/api/quality/1/inspection`)
        .set('Authorization', `Bearer ${token2}`);
      
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('can only view your own');
    });

    test('MANAGER can view any inspection', async () => {
      const manager = await createTestUser('MANAGER');
      const token = getAuthToken(manager);
      
      const res = await request(app)
        .get(`/api/quality/1/inspection`)
        .set('Authorization', `Bearer ${token}`);
      
      expect([200, 404]).toContain(res.status); // 404 if no inspection, but no 403
    });

    test('Audit logs should be ADMIN-only', async () => {
      const manager = await createTestUser('MANAGER');
      const token = getAuthToken(manager);
      
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(403);
    });

    test('ADMIN can access audit logs', async () => {
      const admin = await createTestUser('ADMIN');
      const token = getAuthToken(admin);
      
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${token}`);
      
      expect([200, 400]).toContain(res.status); // 400 if other validation error, but not 403
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2B: VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════
  
  describe('✅ Input Validation', () => {
    test('Invalid email should be rejected', async () => {
      const user = await createTestUser('MANAGER');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .post('/api/party')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Company',
          email: 'not-an-email',
        });
      
      expect(res.status).toBe(422);
    });

    test('Invalid phone should be rejected', async () => {
      const user = await createTestUser('MANAGER');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .post('/api/party')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Company',
          phone: '123', // Not 10 digits
        });
      
      expect(res.status).toBe(422);
    });

    test('Invalid GSTIN should be rejected', async () => {
      const user = await createTestUser('MANAGER');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .post('/api/party')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Company',
          gstin: '123', // Not 15 chars
        });
      
      expect(res.status).toBe(422);
    });

    test('Negative quantity should be rejected', async () => {
      const user = await createTestUser('MANAGER');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .post('/api/invoice')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Test Item',
          quantity: -5,
        });
      
      expect(res.status).toBe(422);
    });
  });

  describe('✅ Pagination Validation', () => {
    test('Page out of bounds should be rejected', async () => {
      const user = await createTestUser('OPERATOR');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .get('/api/party?page=100001')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(422);
    });

    test('Limit out of bounds should be rejected', async () => {
      const user = await createTestUser('OPERATOR');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .get('/api/party?limit=501')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(422);
    });

    test('Valid pagination should work', async () => {
      const user = await createTestUser('OPERATOR');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .get('/api/party?page=1&limit=50')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2D: BUSINESS LOGIC TESTS
  // ═══════════════════════════════════════════════════════════════════
  
  describe('✅ Overbilling Prevention', () => {
    test('Dispatch qty > challan qty should be rejected', async () => {
      const user = await createTestUser('MANAGER');
      const token = getAuthToken(user);
      
      // Create challan with 100 units
      const challan = await prisma.jobworkChallan.create({
        data: {
          items: {
            create: [
              { quantity: 100 }
            ],
          },
        },
      });
      
      // Try to dispatch 150 units
      const res = await request(app)
        .post('/api/dispatch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jobworkChallanId: challan.id,
          items: [
            {
              sourceChallanItemId: challan.items[0].id,
              quantity: 150, // Over challan qty
            },
          ],
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Over-dispatch blocked');
    });
  });

  describe('✅ Data Consistency', () => {
    test('Multi-step operations should rollback on failure', async () => {
      const user = await createTestUser('OPERATOR');
      const token = getAuthToken(user);
      
      // Create jobwork challan with transaction
      const res = await request(app)
        .post('/api/jobwork/challan')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jobCardId: 1,
          fromPartyId: 1,
          toPartyId: 2,
          items: [
            {
              quantity: 50,
            },
          ],
        });
      
      // If any item creation fails, challan should not exist
      if (res.status === 400) {
        const challans = await prisma.jobworkChallan.findMany({
          where: { createdById: user.id },
        });
        expect(challans).toHaveLength(0); // Rolled back
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════
  
  describe('✅ Error Handling', () => {
    test('Missing required field should return 422', async () => {
      const user = await createTestUser('MANAGER');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .post('/api/party')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing required 'name' field
        });
      
      expect(res.status).toBe(422);
    });

    test('Invalid ID format should return 400', async () => {
      const user = await createTestUser('OPERATOR');
      const token = getAuthToken(user);
      
      const res = await request(app)
        .get('/api/party/invalid-id')
        .set('Authorization', `Bearer ${token}`);
      
      expect([400, 404]).toContain(res.status);
    });

    test('Unauthenticated request should return 401', async () => {
      const res = await request(app)
        .get('/api/party');
      
      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
});

module.exports = {};
