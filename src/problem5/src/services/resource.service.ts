import { v4 as uuidv4 } from 'uuid';
import { Resource } from '@/models/resource.model';
import { ResourceRepository } from '@/repositories/resource.repository';
import { CreateResourceDto } from '@/dto/create-resource.dto';
import { UpdateResourceDto, PartialUpdateResourceDto } from '@/dto/update-resource.dto';
import { ListResourceDto } from '@/dto/list-resource.dto';
import { AppError } from '@/errors/app-error';

/**
 * Service layer encapsulating business logic for Resources.
 */
export class ResourceService {
  constructor(private readonly repository: ResourceRepository) {}

  /**
   * Creates a new resource.
   */
  public async create(dto: CreateResourceDto): Promise<Resource> {
    const now = new Date();
    const resource: Resource = {
      id: uuidv4(),
      name: dto.name,
      description: dto.description ?? '',
      price: dto.price,
      createdAt: now,
      updatedAt: now,
    };
    return this.repository.create(resource);
  }

  /**
   * Retrieves a resource by its ID.
   * Throws 404 AppError if not found.
   */
  public async getById(id: string): Promise<Resource> {
    const resource = await this.repository.findById(id);
    if (!resource) {
      throw new AppError(404, `Resource with ID ${id} not found`, 'NOT_FOUND');
    }
    return resource;
  }

  /**
   * Lists resources matching the specified criteria.
   */
  public async list(dto: ListResourceDto): Promise<{ data: Resource[]; nextCursor: string | null }> {
    return this.repository.list({
      name: dto.name,
      minPrice: dto.minPrice,
      maxPrice: dto.maxPrice,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
      cursor: dto.cursor,
      limit: dto.limit,
    });
  }

  /**
   * Fully updates a resource.
   * Throws 404 AppError if not found.
   */
  public async update(id: string, dto: UpdateResourceDto): Promise<Resource> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError(404, `Resource with ID ${id} not found`, 'NOT_FOUND');
    }

    const updatedResource: Resource = {
      ...existing,
      name: dto.name,
      description: dto.description ?? '',
      price: dto.price,
      updatedAt: new Date(),
    };

    const result = await this.repository.update(id, updatedResource);
    if (!result) {
       throw new AppError(500, 'Failed to update resource', 'INTERNAL_ERROR');
    }
    return result;
  }

  /**
   * Partially updates a resource.
   * Throws 404 AppError if not found.
   */
  public async patch(id: string, dto: PartialUpdateResourceDto): Promise<Resource> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError(404, `Resource with ID ${id} not found`, 'NOT_FOUND');
    }

    const updatedResource: Resource = {
      ...existing,
      ...dto,
      updatedAt: new Date(),
    };

    const result = await this.repository.update(id, updatedResource);
    if (!result) {
       throw new AppError(500, 'Failed to patch resource', 'INTERNAL_ERROR');
    }
    return result;
  }

  /**
   * Deletes a resource.
   * Throws 404 AppError if not found.
   */
  public async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new AppError(404, `Resource with ID ${id} not found`, 'NOT_FOUND');
    }
  }
}
