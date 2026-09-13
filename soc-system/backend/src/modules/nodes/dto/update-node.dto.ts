import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateNodeDto } from './create-node.dto';

// Type and credential are deliberately excluded: changing a node's device
// type after creation is a structural change (not a config edit), and
// credentials are rotated through their own dedicated, separately-audited
// endpoint rather than folded into a general-purpose update.
export class UpdateNodeDto extends PartialType(
  OmitType(CreateNodeDto, ['type', 'credential'] as const),
) {}
