-- ============================================================
-- COSFIT - Super Admin Seed (SQL)
-- 비밀번호: qwer1234!@ (bcrypt hash with 12 rounds)
-- Docker 환경에서 prisma db execute로 실행
-- ============================================================

-- bcrypt hash of 'qwer1234!@' with 12 rounds:
-- $2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- (이 해시는 배포 전 seed-admin.ts로 재생성 권장)

-- 1. User upsert (이미 있으면 skip)
INSERT INTO "users" ("id", "email", "passwordHash", "name", "role", "onboardingStatus", "mustChangePassword", "createdAt", "updatedAt")
VALUES (
  'clsuperadmin000000000000001',
  'admin@cosfit.kr',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Super Admin',
  'ADMIN',
  'COMPLETED',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO NOTHING;

-- 2. AdminUser upsert (이미 있으면 skip)
INSERT INTO "admin_users" ("id", "userId", "isSuperAdmin", "permissions", "createdAt", "updatedAt")
SELECT
  'clsuperadminau00000000000001',
  u.id,
  true,
  '{"menuPermissions":{"data-collection":{"view":true,"create":true,"edit":true},"ingredients":{"view":true,"create":true,"edit":true},"reviews":{"view":true,"create":true,"edit":true},"data-quality":{"view":true,"create":true,"edit":true},"etl":{"view":true,"create":true,"edit":true},"admin-users":{"view":true,"create":true,"edit":true},"statistics":{"view":true,"create":true,"edit":true},"members":{"view":true,"create":true,"edit":true},"partners":{"view":true,"create":true,"edit":true},"commerce":{"view":true,"create":true,"edit":true}}}'::jsonb,
  NOW(),
  NOW()
FROM "users" u
WHERE u.email = 'admin@cosfit.kr'
ON CONFLICT ("userId") DO NOTHING;
