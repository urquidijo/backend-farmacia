import { PartialType } from '@nestjs/mapped-types';
import { CreateOfertaDto } from './create-oferta.dto';

export class UpdateOfertaDto extends PartialType(CreateOfertaDto) {}

