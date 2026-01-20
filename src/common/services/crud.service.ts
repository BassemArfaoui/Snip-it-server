import { NotFoundException } from '@nestjs/common';
import { DeepPartial, FindManyOptions, FindOneOptions, ObjectLiteral, Repository } from 'typeorm';

/**
 * Generic CRUD service to be extended per module.
 */
export class CrudService<T extends ObjectLiteral> {
    constructor(protected readonly repo: Repository<T>) {}

    async create(dto: DeepPartial<T>): Promise<T> {
        const entity = this.repo.create(dto);
        return this.repo.save(entity as DeepPartial<T>) as Promise<T>;
    }

    async findAll(options?: FindManyOptions<T>): Promise<T[]> {
        return this.repo.find(options);
    }

    async findOne(id: number | string, options?: FindOneOptions<T>): Promise<T> {
        const entity = await this.repo.findOne({
            where: { id } as unknown as FindOneOptions<T>['where'],
            ...options,
        });

        if (!entity) {
            throw new NotFoundException(`Resource with id ${id} not found`);
        }

        return entity;
    }

    async update(id: number | string, dto: DeepPartial<T>): Promise<T> {
        const entity = await this.repo.preload({ ...dto, id } as unknown as DeepPartial<T>);
        if (!entity) {
            throw new NotFoundException(`Resource with id ${id} not found`);
        }

        return this.repo.save(entity as DeepPartial<T>) as Promise<T>;
    }

    async remove(id: number | string): Promise<void> {
        const result = await this.repo.delete(id);
        if (!result.affected) {
            throw new NotFoundException(`Resource with id ${id} not found`);
        }
    }
}
