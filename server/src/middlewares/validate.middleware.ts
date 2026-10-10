import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';

export type ValidationTarget =
  | ZodTypeAny
  | {
      body?: ZodTypeAny;
      query?: ZodTypeAny;
      params?: ZodTypeAny;
    };

export function validateRequest(schema: ValidationTarget) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if ('parseAsync' in schema && typeof (schema as any).parseAsync === 'function') {
        req.body = await (schema as ZodTypeAny).parseAsync(req.body);
      } else {
        const obj = schema as { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };
        if (obj.body) {
          req.body = await obj.body.parseAsync(req.body);
        }
        if (obj.query) {
          req.query = await obj.query.parseAsync(req.query);
        }
        if (obj.params) {
          req.params = await obj.params.parseAsync(req.params);
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
