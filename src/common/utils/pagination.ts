import { FindManyOptions, ObjectLiteral, Repository } from 'typeorm';

export type PaginationParams = {
    page?: number;
    limit?: number;
};

export type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
};

export type PaginatedResult<T> = {
    data: T[];
    meta: PaginationMeta;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function normalizePagination(params: PaginationParams = {}): { page: number; limit: number } {
    const page = Math.max(DEFAULT_PAGE, Number(params.page) || DEFAULT_PAGE);
    const rawLimit = Number(params.limit) || DEFAULT_LIMIT;
    const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);

    return { page, limit };
}

export async function paginate<T extends ObjectLiteral>(
    repo: Repository<T>,
    params: PaginationParams,
    findOptions: FindManyOptions<T> = {},
): Promise<PaginatedResult<T>> {
    const { page, limit } = normalizePagination(params);
    const skip = (page - 1) * limit;

    const [data, total] = await repo.findAndCount({
        ...findOptions,
        skip,
        take: limit,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        data,
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
