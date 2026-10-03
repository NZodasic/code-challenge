import { z } from 'zod';

export const UpdateResourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  description: z.string().max(2000, 'Description must be at most 2000 characters').optional().default(''),
  price: z.number().min(0, 'Price cannot be negative')
});

export type UpdateResourceDto = z.infer<typeof UpdateResourceSchema>;

export const PartialUpdateResourceSchema = UpdateResourceSchema.partial();

export type PartialUpdateResourceDto = z.infer<typeof PartialUpdateResourceSchema>;
