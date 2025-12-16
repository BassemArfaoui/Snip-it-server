import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If response is already wrapped in ApiResponse, return it
        if (data instanceof ApiResponse) {
          return data;
        }

        // For 204 No Content responses (e.g., DELETE)
        if (data === undefined || data === null) {
          return new ApiResponse(null, 'success');
        }

        // Wrap the response
        return new ApiResponse(data, 'success');
      }),
    );
  }
}
