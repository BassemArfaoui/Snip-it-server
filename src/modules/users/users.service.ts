import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private readonly subscriptionsService: SubscriptionsService,
    ) { }

    async create(userData: Partial<User>): Promise<User> {
        const user = this.usersRepository.create(userData);
        return this.usersRepository.save(user);
    }

    async save(user: User): Promise<User> {
        return this.usersRepository.save(user);
    }

    async findOneByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { email } });
    }

    async findOneByUsername(username: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { username } });
    }

    async findOneByEmailOrUsername(identifier: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: [
                { email: identifier },
                { username: identifier },
            ],
        });
    }

    async findOneByEmailOrUsernameWithPassword(identifier: string): Promise<User | null> {
        return this.usersRepository
            .createQueryBuilder('user')
            .where('user.email = :identifier OR user.username = :identifier', { identifier })
            .addSelect('user.password')
            .getOne();
    }

    async findOneWithRefreshToken(userId: number): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { id: userId },
            select: ['id', 'email', 'username', 'refreshTokenHash'],
        });
    }

    async updateRefreshToken(userId: number, refreshTokenHash: string | null): Promise<void> {
        if (refreshTokenHash) {
            await this.usersRepository.update({ id: userId }, { refreshTokenHash });
        } else {
            await this.usersRepository.query(
                'UPDATE users SET "refreshTokenHash" = NULL WHERE id = $1',
                [userId],
            );
        }
    }

    async markEmailVerified(userId: number): Promise<void> {
        await this.usersRepository.update({ id: userId }, {
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
        });
    }

    async updatePassword(userId: number, hashedPassword: string): Promise<void> {
        await this.usersRepository.update({ id: userId }, { password: hashedPassword });
    }

    async findByOAuth(oauthProvider: string, oauthId: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { oauthProvider, oauthId },
        });
    }

    async findById(id: number): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id } });
    }

    async findAll(): Promise<User[]> {
        return this.usersRepository.find();
    }

    async removeById(id: number): Promise<void> {
        try {
            // First remove subscriptions that reference this user to avoid FK issues
            await this.subscriptionsService.removeForUser(id);

            await this.usersRepository.delete({ id });
        } catch (err) {
            // Log original DB error details for debugging
            this.logger.error('Failed to delete user', err as any);
            // In case of a foreign key constraint or other DB error, throw a clearer exception
            // so the admin client gets a useful message instead of a raw QueryFailedError
            throw new ConflictException('Cannot delete user: related records exist. See server logs for details');
        }
    }

    async banUser(userId: number): Promise<void> {
        await this.usersRepository.update({ id: userId }, { isBanned: true, bannedAt: new Date() });
    }

    async unbanUser(userId: number): Promise<void> {
        await this.usersRepository.update({ id: userId }, { isBanned: false, bannedAt: null as any });
    }
}
