import { availabilitySchema } from './schema';

export const availability = availabilitySchema.parse({
  openTo: ['permanent', 'freelance'],
  countries: ['DE', 'AT', 'CH', 'LU'],
  remote: true,
  updated: '2026-10-25',
});
