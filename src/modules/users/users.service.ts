import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
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
}
