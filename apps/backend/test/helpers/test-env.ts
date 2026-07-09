process.env.NODE_ENV = 'test';
process.env.COOKIE_KEY = 'test-cookie-key-min-32-chars-long!!';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.RESEND_API_KEY = 're_test_key';
process.env.MAIL_FROM = 'test@test.local';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gofunio:gofunio@localhost:5432/gofunio';
delete process.env.DATABASE_PATH;
process.env.RUN_MIGRATIONS = 'false';
