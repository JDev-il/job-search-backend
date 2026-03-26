import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApplicationStatus } from '../enums/application-status.enum';

@Entity()
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ApplicationStatus })
  status: ApplicationStatus;

  @Column()
  companyName: string;

  @Column()
  companyLocation: string;

  @Column()
  position: string;

  @Column()
  jobType: string;

  @Column()
  stack: string;

  @Column()
  platform: string;

  @Column({ type: 'date' })
  dateApplied: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  hunch: string;
}