import { IsEmail, IsNotEmpty, MinLength } from "class-validator";

export class CreateUsuarioDto {
    @IsNotEmpty({ message: 'El email no debe estar vacío' })
    @IsEmail({}, { message: 'El email debe ser válido' })
    email: string;

    @IsNotEmpty({ message: 'El nombre no debe estar vacío' })
    name: string;

    @IsNotEmpty()
    @MinLength(5, { message: 'El password debe tener al menos 5 caracteres' })
    password: string;

}
