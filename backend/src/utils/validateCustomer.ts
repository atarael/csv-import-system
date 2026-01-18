type CustomerInput = {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
};

export const validateCustomer = (
  input: CustomerInput
): string | null => {
  if (!input.name) return 'Missing name';
  if (!input.email) return 'Missing email';
  if (!input.company) return 'Missing company';

  if (!input.email.includes('@')) {
    return 'Invalid email';
  }

  return null;
};
