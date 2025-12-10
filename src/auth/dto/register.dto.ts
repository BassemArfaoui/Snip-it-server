import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ValidationMessages } from '../../common/validations/dto-validaton-messages';

export class RegisterDto {
    @IsNotEmpty({ message: ValidationMessages.required('email') })
    @IsEmail({}, { message: ValidationMessages.type('email', 'email') })
    email: string;

    @IsNotEmpty({ message: ValidationMessages.required('password') })
    @IsString({ message: ValidationMessages.type('password', 'string') })
    @MinLength(8, { message: ValidationMessages.length('password', 'min', 6) })
    password: string;

    @IsNotEmpty({ message: ValidationMessages.required('username') })
    @IsString({ message: ValidationMessages.type('username', 'string') })
    @MinLength(3, { message: ValidationMessages.length('username', 'min', 3) })
    username: string;

    @IsNotEmpty({ message: ValidationMessages.required('fullName') })
    @IsString({ message: ValidationMessages.type('fullName', 'string') })
    @MinLength(3, { message: ValidationMessages.length('fullName', 'min', 3) })
    fullName: string;

    @IsOptional()
    @IsString({ message: ValidationMessages.type('role', 'string') })
    role?: string;

    @IsOptional()
    @IsString({ message: ValidationMessages.type('imageProfile', 'string') })
    imageProfile?: string;
}
