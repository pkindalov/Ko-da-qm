-- Rename profiles table to users (for existing databases that applied 001)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE profiles RENAME TO users;
    ALTER POLICY "profiles: own row only" ON users RENAME TO "users: own row only";
  END IF;
END $$;
