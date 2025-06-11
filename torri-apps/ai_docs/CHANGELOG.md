## [Unreleased]
### Added
- **Back-end**: Added `phone_number` (String), `date_of_birth` (Date), `hair_type` (Enum: LISO, ONDULADO, CACHEADO, CRESPO), and `gender` (Enum: MASCULINO, FEMININO, OUTROS) fields to the `User` model (`Core/Auth/models.py`).
- **Back-end**: Updated Pydantic schemas (`UserBase`, `UserCreate`, `UserUpdate`, `User` in `Core/Auth/Schemas.py`) to include the new `phone_number`, `date_of_birth`, `hair_type`, and `gender` fields.
- **Back-end**: Updated user creation and update services (`Modules/Users/services.py`) to handle the new fields.
- **Front-end**: Added "Data de Nascimento" (Date of Birth) date input field to `ClientForm.jsx` (`Web-admin/Src/Pages/Clients/ClientForm.jsx`).
- **Front-end**: Added "Tipo de Cabelo" (Hair Type) select field to `ClientForm.jsx`.
- **Front-end**: Added "Gênero" (Gender) select field to `ClientForm.jsx`.
- **Back-end**: Added `phone_number` field to the `User` SQLAlchemy model (`Core/Auth/models.py`) and associated Pydantic schemas (`Core/Auth/Schemas.py`) to store client phone numbers. (Note: This was verified as pre-existing but confirmed for this feature set).
- **Back-end**: Included `client_phone_number` in `AppointmentDetailSchema` (`Modules/Appointments/schemas.py`) and updated `schedule_service.py` to populate it, making client phone numbers available in the daily schedule API response.
- **Database**: Generated an Alembic migration to add the `phone_number` column to the `users` table.

### Changed
- **Front-end**: Modified `autoComplete` attribute for the email field to "off" in `ClientForm.jsx` to prevent autofill.
- **Front-end**: Modified `autoComplete` attribute for the password field to "new-password" in `ClientForm.jsx` to prevent autofill with saved login credentials.
- **Front-end**: Updated `getDailySchedule` in `Web-admin/Src/Services/appointmentsApi.js` to map `notes_by_client`, `client_email`, and `client_phone_number` from the backend response to frontend appointment objects.
- **Back-end**: Updated `AppointmentDetailSchema` (`Modules/Appointments/schemas.py`) to include `notes_by_client` and `client_email`, and modified `schedule_service.py` to populate these fields for the daily schedule view.
- **Back-end**: Verified User services (`Modules/Users/services.py`) correctly handle saving the `phone_number` field during user creation and updates.

### Fixed
- **Front-end**: Corrected calendar date display on the Appointments page (`Web-admin/Src/Pages/Appointments/DailySchedulePage.jsx`) to ensure consistency with filtered appointments on initial load.
- **Front-end**: Ensured "Observações" (notes) are correctly loaded into the form field when editing an appointment in `Web-admin/Src/Pages/Appointments/DailySchedulePage.jsx`.
- **Front-end**: Applied CSS overrides in `Web-admin/Src/index.css` to ensure disabled input fields (Nome, Telefone, Email) in the Edit Appointment modal consistently use a dark background and light text, adhering to the dark theme.
- **Front-end**: Ensured the "Duração" field in the Create Appointment modal maintains dark theme styling (dark background, light text) when disabled after service selection (`Web-admin/Src/Pages/Appointments/DailySchedulePage.jsx`).
- **Back-end**: Corrected category filtering in `Modules/Services/services.py` by ensuring `category_id` (UUID) is cast to a string when querying the database in `get_all_services` function. This resolves an issue where the service list (`services/list`) might appear empty for a category even if services exist.
- **Front-end**: Fixed a console warning ("Received `true` for a non-boolean attribute `jsx`") in the `RichTextEditor` component (`Web-admin/Src/Pages/Services/ServiceForm.jsx`) by removing the `<style jsx>` block and moving its CSS rules to the global `index.css` file, scoped with the `.rich-text-display` class.
