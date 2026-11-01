import {z} from 'zod';import {SourceId} from './intent.js';import {PreviewSchema} from './contract.js';
export const CancelTargetSchema=z.strictObject({reservationId:SourceId,roomIds:z.array(SourceId).length(1),startsAt:z.iso.datetime({offset:true}),endsAt:z.iso.datetime({offset:true}),memberCount:z.number().int().nonnegative().nullable()}).refine(x=>Date.parse(x.startsAt)<Date.parse(x.endsAt));
export type CancelTarget=z.infer<typeof CancelTargetSchema>;
export const CancellationEvidenceSchema=CancelTargetSchema.extend({kind:z.literal('cancelled_readback'),authority:z.literal('source_cancelled_record'),isOwner:z.boolean(),scope:z.strictObject({from:z.string(),to:z.string(),timezone:z.literal('Asia/Shanghai')}),sourceStatusCode:z.number().int().nonnegative().nullable(),approvalState:PreviewSchema.shape.approvalState});
export type CancellationEvidence=z.infer<typeof CancellationEvidenceSchema>;
export const CancelSubmissionSchema=z.discriminatedUnion('kind',[z.strictObject({kind:z.literal('cancel_ack'),authority:z.literal('m0_delete_success'),reservationId:SourceId}),z.strictObject({kind:z.literal('rejected'),code:z.enum(['PERMISSION_DENIED','BOOKING_RULE_BLOCKED']),authority:z.literal('verified_no_effect')}),z.strictObject({kind:z.literal('unknown')})]);
export type CancelSubmission=z.infer<typeof CancelSubmissionSchema>;
