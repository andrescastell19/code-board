// Ejemplo de test para el servidor
const request = require('supertest');
const app = require('../server/server');

describe('Servidor', () => {
  it('debe responder al login', async () => {
    const res = await request(app)
      .post('/login')
      .send({ user: 'admin', pass: '12345' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
