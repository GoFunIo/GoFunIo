process.env.NODE_ENV = 'test';
process.env.COOKIE_KEY = 'test-cookie-key-min-32-chars-long!!';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.MAIL_HOST = 'localhost';
process.env.MAIL_PORT = '1025';
process.env.MAIL_USER = 'test';
process.env.MAIL_PASS = 'test';
process.env.MAIL_FROM = 'test@test.local';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gofunio:gofunio@localhost:5432/gofunio';
delete process.env.DATABASE_PATH;
process.env.RUN_MIGRATIONS = 'false';
