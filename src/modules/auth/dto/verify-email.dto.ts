import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ValidationMessages } from '../../../common/validations/dto-validaton-messages';

export class VerifyEmailDto {
    @IsNotEmpty({ message: ValidationMessages.required('email') })
    @IsEmail({}, { message: ValidationMessages.type('email', 'email') })
    email: string;

    @IsNotEmpty({ message: ValidationMessages.required('otp') })
    @IsString({ message: ValidationMessages.type('otp', 'string') })
    @Length(6, 6, { message: 'Le code OTP doit contenir exactement 6 chiffres.' })
    otp: string;
}
