import { IsEmail, IsNotEmpty } from 'class-validator';
import { ValidationMessages } from '../../../common/validations/dto-validaton-messages';

export class ResendOtpDto {
    @IsNotEmpty({ message: ValidationMessages.required('email') })
    @IsEmail({}, { message: ValidationMessages.type('email', 'email') })
    email: string;
}
