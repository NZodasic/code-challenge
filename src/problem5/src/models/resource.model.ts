/**
 * Represents a Resource entity in the system.
 */
export interface Resource {
  id: string;
  name: string;
  description: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}
