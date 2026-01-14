export const validateCustomer = (row: any): string | null => {
  if (!row.name) return 'Missing name';
  if (!row.email) return 'Missing email';
  if (!row.company) return 'Missing company';

  // ולידציה מאוד בסיסית למייל (מספיק לתרגיל)
  if (!row.email.includes('@')) return 'Invalid email';

  return null; // תקין
};
