import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { AcceptPendingActionDto, PendingActionResponseDto } from './dto/pending-action.dto';
import { PendingActionEntity } from './entities/pending-action.entity';
import { PendingActionResolution } from './enums/pending-action.enum';
import { PendingActionsExecutor } from './services/pending-actions-executor.service';
import { PendingActionsService } from './services/pending-actions.service';

interface AuthedRequest extends Request {
  user: { userId: number; email: string };
}

@Controller('pending-actions')
@UseGuards(JwtAuthGuard)
export class PendingActionsController {
  constructor(
    private readonly pendingActions: PendingActionsService,
    private readonly executor: PendingActionsExecutor,
  ) { }

  @Get()
  async list(@Req() req: AuthedRequest): Promise<PendingActionResponseDto[]> {
    const items = await this.pendingActions.listPendingForUser(req.user.userId);
    return items.map(toResponse);
  }

  @Post(':id/accept')
  async accept(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AcceptPendingActionDto,
  ): Promise<PendingActionResponseDto> {
    const action = await this.pendingActions.getOwned(req.user.userId, id);
    await this.executor.execute(action, body ?? {});
    const resolved = await this.pendingActions.markResolved(action.id, PendingActionResolution.ACCEPTED);
    return toResponse(resolved);
  }

  @Post(':id/reject')
  async reject(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PendingActionResponseDto> {
    const action = await this.pendingActions.getOwned(req.user.userId, id);
    const resolved = await this.pendingActions.markResolved(action.id, PendingActionResolution.REJECTED);
    return toResponse(resolved);
  }
}

function toResponse(entity: PendingActionEntity): PendingActionResponseDto {
  return {
    id: entity.id,
    type: entity.type,
    question: entity.question,
    jobId: entity.jobId,
    evidence: entity.evidence,
    proposedChange: entity.proposedChange,
    resolution: entity.resolution,
    createdAt: entity.createdAt,
    resolvedAt: entity.resolvedAt,
  };
}
