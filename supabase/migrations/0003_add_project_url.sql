-- 새 환경에서는 projects 테이블이 0004에서 생성되므로 IF EXISTS 필요
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS url text;
