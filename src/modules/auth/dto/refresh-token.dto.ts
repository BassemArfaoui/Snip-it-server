import { IsNotEmpty, IsString } from 'class-validator';
import { ValidationMessages } from '../../../common/validations/dto-validaton-messages';

export class RefreshTokenDto {
    @IsNotEmpty({ message: ValidationMessages.required('refreshToken') })
    @IsString({ message: ValidationMessages.type('refreshToken', 'string') })
    refreshToken: string;
}
