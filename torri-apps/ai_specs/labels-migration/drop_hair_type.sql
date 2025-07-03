DROP TYPE IF EXISTS prod.users_hair_type_enum

ALTER TABLE prod.users
DROP COLUMN hair_type; 
