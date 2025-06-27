// Permite CORS para desarrollo entre http://localhost:3000 y http://localhost:3002
module.exports = function allowCors(req, res, next) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://livecoder-wtbx.onrender.com',
    'https://www.livecoder-wtbx.onrender.com'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
};
