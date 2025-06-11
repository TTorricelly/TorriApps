
## [Unreleased]
### Added
- **Back-end**: Added `phone_number` (String), `date_of_birth` (Date), `hair_type` (Enum: LISO, ONDULADO, CACHEADO, CRESPO), and `gender` (Enum: MASCULINO, FEMININO, OUTROS) fields to the `User` model (`Core/Auth/models.py`).
- **Back-end**: Updated Pydantic schemas (`UserBase`, `UserCreate`, `UserUpdate`, `User` in `Core/Auth/Schemas.py`) to include the new `phone_number`, `date_of_birth`, `hair_type`, and `gender` fields.
- **Back-end**: Updated user creation and update services (`Modules/Users/services.py`) to handle the new fields.
- **Front-end**: Added "Data de Nascimento" (Date of Birth) date input field to `ClientForm.jsx` (`Web-admin/Src/Pages/Clients/ClientForm.jsx`).
- **Front-end**: Added "Tipo de Cabelo" (Hair Type) select field to `ClientForm.jsx`.
- **Front-end**: Added "Gênero" (Gender) select field to `ClientForm.jsx`.

### Changed
- **Front-end**: Modified `autoComplete` attribute for the email field to "off" in `ClientForm.jsx` to prevent autofill.
- **Front-end**: Modified `autoComplete` attribute for the password field to "new-password" in `ClientForm.jsx` to prevent autofill with saved login credentials.
