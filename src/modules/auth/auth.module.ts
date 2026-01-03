import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PostsModule } from '../posts/posts.module';
import { CommentsModule } from '../comments/comments.module';
import { SolutionsModule } from '../solutions/solutions.module';
import { IssuesModule } from '../issues/issues.module';
import { CommonModule } from '../../common/common.module';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { User } from '../users/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GitHubStrategy } from './strategies/github.strategy';
import { ConsoleEmailProvider, EMAIL_PROVIDER_TOKEN } from './providers/email.provider';
import { GitHubAuthGuard } from './guards/github-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AdminController } from './admin.controller';

@Module({
    imports: [
        UsersModule,
        PostsModule,
        CommentsModule,
        SolutionsModule,
        IssuesModule,
        CommonModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        TypeOrmModule.forFeature([User, EmailVerification, PasswordReset]),
    ],
    providers: [
        AuthService,
        JwtStrategy,
        GitHubStrategy,
        GitHubAuthGuard,
        RolesGuard,
        { provide: EMAIL_PROVIDER_TOKEN, useClass: ConsoleEmailProvider },
    ],
    controllers: [AuthController, AdminController],
})
export class AuthModule { }
