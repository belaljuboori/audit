import { IntersectionType } from '@nestjs/swagger';
import { SensitiveActionDto } from '../../../common/dto/sensitive-action.dto';
import { NodeCredentialDto } from './node-credential.dto';

export class RotateCredentialDto extends IntersectionType(SensitiveActionDto, NodeCredentialDto) {}
