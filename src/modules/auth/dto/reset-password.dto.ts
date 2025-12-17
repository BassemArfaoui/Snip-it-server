import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ValidationMessages } from '../../../common/validations/dto-validaton-messages';

export class ResetPasswordDto {
    @IsNotEmpty({ message: ValidationMessages.required('email') })
    @IsEmail({}, { message: ValidationMessages.type('email', 'email') })
    email: string;

    @IsNotEmpty({ message: ValidationMessages.required('token') })
    @IsString({ message: ValidationMessages.type('token', 'string') })
    @MinLength(20, { message: ValidationMessages.length('token', 'min', 20) })
    token: string;

    @IsNotEmpty({ message: ValidationMessages.required('newPassword') })
    @IsString({ message: ValidationMessages.type('newPassword', 'string') })
    @MinLength(8, { message: ValidationMessages.length('newPassword', 'min', 8) })
    newPassword: string;
}
