import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import jwt from 'jsonwebtoken';

describe('Notification System API Integration Tests', () => {
  let workerUser;
  let workerToken;

  beforeEach(async () => {
    await User.deleteMany({});
    await Notification.deleteMany({});

    workerUser = await User.create({
      name: 'Notification Worker',
      email: 'notifworker@example.com',
      password: 'Password123!',
      mobile: '9876543210',
      role: 'Worker',
      isVerified: true,
    });

    workerToken = jwt.sign(
      { id: workerUser._id.toString(), role: workerUser.role },
      process.env.JWT_SECRET || 'agriconnect_jwt_secret_key_32bytes_min',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Notification.deleteMany({});
  });

  test('GET /api/v1/notifications should return notifications list and unread count', async () => {
    await Notification.create({
      recipient: workerUser._id,
      type: 'application.accepted',
      title: 'Application Accepted',
      message: 'Farmer accepted your app',
      isRead: false,
    });

    const response = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.unreadCount).toBe(1);
  });

  test('GET /api/v1/notifications/unread-count should return correct count', async () => {
    await Notification.create({
      recipient: workerUser._id,
      type: 'application.shortlisted',
      title: 'Shortlisted',
      message: 'You have been shortlisted',
      isRead: false,
    });

    const response = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.count).toBe(1);
  });

  test('PATCH /api/v1/notifications/:id/read should mark notification as read', async () => {
    const notif = await Notification.create({
      recipient: workerUser._id,
      type: 'application.shortlisted',
      title: 'Shortlisted',
      message: 'You have been shortlisted',
      isRead: false,
    });

    const response = await request(app)
      .patch(`/api/v1/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.isRead).toBe(true);
  });

  test('PATCH /api/v1/notifications/read-all should mark all as read', async () => {
    await Notification.create([
      { recipient: workerUser._id, type: 'system', title: 'A', message: 'A', isRead: false },
      { recipient: workerUser._id, type: 'system', title: 'B', message: 'B', isRead: false },
    ]);

    const response = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.modifiedCount).toBe(2);
  });

  test('DELETE /api/v1/notifications/:id should delete notification', async () => {
    const notif = await Notification.create({
      recipient: workerUser._id,
      type: 'system',
      title: 'To Delete',
      message: 'Delete me',
    });

    const response = await request(app)
      .delete(`/api/v1/notifications/${notif._id}`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(response.status).toBe(200);

    const count = await Notification.countDocuments({ _id: notif._id });
    expect(count).toBe(0);
  });
});
