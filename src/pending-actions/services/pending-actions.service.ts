import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PendingActionEntity } from '../entities/pending-action.entity';
import { PendingActionResolution } from '../enums/pending-action.enum';
import { CreatePendingActionInput } from '../interfaces/pending-action.interface';

@Injectable()
export class PendingActionsService {
  private readonly logger = new Logger(PendingActionsService.name);

  constructor(
    @InjectRepository(PendingActionEntity)
    private readonly repo: Repository<PendingActionEntity>,
  ) { }

  async create(input: CreatePendingActionInput): Promise<PendingActionEntity | null> {
    const entity = this.repo.create({
      userId: input.userId,
      jobId: input.jobId ?? null,
      type: input.type,
      evidence: input.evidence,
      proposedChange: input.proposedChange,
      question: input.question,
      gmailMessageId: input.gmailMessageId,
      resolution: PendingActionResolution.PENDING,
    });
    try {
      return await this.repo.save(entity);
    } catch (err) {
      if (err instanceof QueryFailedError && /unique|duplicate/i.test(err.message)) {
        this.logger.debug(
          `Skipped duplicate PendingAction for user=${input.userId} message=${input.gmailMessageId}`,
        );
        return null;
      }
      throw err;
    }
  }

  async listPendingForUser(userId: number): Promise<PendingActionEntity[]> {
    return this.repo.find({
      where: { userId, resolution: PendingActionResolution.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async getOwned(userId: number, id: number): Promise<PendingActionEntity> {
    const action = await this.repo.findOne({ where: { id, userId } });
    if (!action) {
      throw new NotFoundException('Pending action not found');
    }
    return action;
  }

  async markResolved(
    id: number,
    resolution: PendingActionResolution,
  ): Promise<PendingActionEntity> {
    const action = await this.repo.findOne({ where: { id } });
    if (!action) throw new NotFoundException('Pending action not found');
    if (action.resolution !== PendingActionResolution.PENDING) {
      throw new ConflictException(`Pending action already ${action.resolution}`);
    }
    action.resolution = resolution;
    action.resolvedAt = new Date();
    return this.repo.save(action);
  }
}
