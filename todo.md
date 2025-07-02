# To-Do List: Add Nickname to Client CRUD

## 1. Backend

- [ ] Update the `User` entity to include the `nickname` field.
- [ ] Update the `User` Pydantic schemas (`UserCreate`, `UserUpdate`) to include the `nickname` field.
- [ ] Ensure the `create_user` and `update_user` services handle the new `nickname` field.

## 2. Database Migrations

- [ ] Analyze the existing migration structure to determine how to switch between `dev` and `prod` schemas.
- [ ] Generate a new Alembic migration script to add the `nickname` column to the `users` table.
- [ ] Apply the migration to the `dev` schema.
- [ ] Apply the migration to the `prod` schema.

## 3. Frontend (Web-admin)

- [ ] Locate the client creation and editing forms in the `Web-admin` application.
- [ ] Add a `nickname` input field to the client forms.
- [ ] Update the API calls to include the `nickname` when creating or updating a client.

## 4. Verification

- [ ] Manually test the client CRUD functionality in the `Web-admin` application to ensure the `nickname` field is working as expected.
