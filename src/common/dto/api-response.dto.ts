export class ApiResponse<T> {
  data: T;
  meta?: Record<string, any>;
  message: string;

  constructor(data: T, message = 'success', meta?: Record<string, any>) {
    this.data = data;
    this.message = message;
    if (meta) {
      this.meta = meta;
    }
  }

  static success<T>(data: T, message = 'success', meta?: Record<string, any>): ApiResponse<T> {
    return new ApiResponse(data, message, meta);
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message = 'success',
  ): ApiResponse<T[]> {
    return new ApiResponse(
      data,
      message,
      {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    );
  }
}
