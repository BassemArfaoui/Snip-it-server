import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsersService } from '../../users/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private usersService: UsersService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const jwtUser = request.user;
        if (!jwtUser || !jwtUser.userId) {
            return false;
        }

        const user = await this.usersService.findById(jwtUser.userId);
        if (!user) return false;

        // Compare roles case-insensitively to tolerate existing seeded values
        return requiredRoles.some(required => {
            const userRole = (user.role || '').toString().toLowerCase();
            const reqRole = (required || '').toString().toLowerCase();
            return userRole === reqRole;
        });
    }
}