import { Request, Response, NextFunction } from 'express';
import { ResourceService } from '@/services/resource.service';
import { ApiResponse } from '@/types/response';
import { Resource } from '@/models/resource.model';
import { ListResourceDto } from '@/dto/list-resource.dto';

/**
 * Controller handling HTTP requests and formatting responses for Resources.
 */
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  public create = async (req: Request, res: Response<ApiResponse<Resource>>, next: NextFunction) => {
    try {
      const resource = await this.service.create(req.body);
      return res.status(201).json({
        success: true,
        data: resource
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response<ApiResponse<Resource>>, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const resource = await this.service.getById(id);
      return res.status(200).json({
        success: true,
        data: resource
      });
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response<ApiResponse<Resource[]>>, next: NextFunction) => {
    try {
      const result = await this.service.list(req.query as unknown as ListResourceDto);
      return res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          nextCursor: result.nextCursor,
          limit: req.query.limit ? Number(req.query.limit) : 20
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response<ApiResponse<Resource>>, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const resource = await this.service.update(id, req.body);
      return res.status(200).json({
        success: true,
        data: resource
      });
    } catch (error) {
      next(error);
    }
  };

  public patch = async (req: Request, res: Response<ApiResponse<Resource>>, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const resource = await this.service.patch(id, req.body);
      return res.status(200).json({
        success: true,
        data: resource
      });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await this.service.delete(id);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
