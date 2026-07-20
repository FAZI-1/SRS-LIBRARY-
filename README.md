# SRSVault v1.0

**Prescribing Error Documentation Template Library**

SRSVault is a mobile-friendly prototype for creating, searching, copying, and sharing reusable prescribing error documentation templates.

## MVP Features

- Search by title, medication, category, contributor, or keyword
- Filter by category and error stage
- Complete copy-ready documentation
- Staff contribution workflow
- Contributor name displayed on every template
- Personal edit PIN for contributors
- Administrator access for editing, archiving, restoring, deleting, backup, and CSV export
- Local browser storage
- Progressive Web App support
- Responsive mobile design
- Starter Posaconazole loading-dose template

## Important Prototype Limitation

This version uses browser `localStorage`. Templates added on one device are not automatically shared with other devices or staff members.

For real shared use through Vercel, the next version should use:

- Supabase or Firebase database
- Real user accounts
- Role-based permissions
- Secure authentication
- Server-side audit trail

## Privacy

Do not enter patient names, medical record numbers, dates of birth, or any patient-identifiable information.
