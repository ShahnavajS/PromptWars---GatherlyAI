// Set before any service import so tests never write to workspace database
process.env.DATABASE_URL = ':memory:';
