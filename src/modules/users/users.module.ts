import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
    imports: [TypeOrmModule.forFeature([User]), SubscriptionsModule],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
