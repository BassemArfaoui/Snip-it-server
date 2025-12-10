import { IsNotEmpty, IsString } from 'class-validator';
import { ValidationMessages } from '../../common/validations/dto-validaton-messages';

export class LoginDto {
    @IsNotEmpty({ message: ValidationMessages.required('identifier') })
    @IsString({ message: ValidationMessages.type('identifier', 'string') })
    identifier: string;

    @IsNotEmpty({ message: ValidationMessages.required('password') })
    @IsString({ message: ValidationMessages.type('password', 'string') })
    password: string;
}
