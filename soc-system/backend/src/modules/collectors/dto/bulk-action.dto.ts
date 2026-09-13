import { IntersectionType } from '@nestjs/swagger';
import { SensitiveActionDto } from '../../../common/dto/sensitive-action.dto';
import { ConfirmActionDto } from '../../../common/dto/confirm-action.dto';

export class BulkActionDto extends IntersectionType(SensitiveActionDto, ConfirmActionDto) {}
