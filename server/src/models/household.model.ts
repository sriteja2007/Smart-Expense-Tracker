import mongoose, { Schema, Document, Model } from 'mongoose';
import type {
  Household,
  HouseholdMember,
  HouseholdRole,
  HouseholdInvitation,
  HouseholdAuditLog,
  InvitationStatus,
  CurrencyCode
} from '@lumaspend/shared';

export interface IHouseholdMemberSubdoc {
  userId: string;
  email: string;
  displayName: string;
  role: HouseholdRole;
  joinedAt: Date;
}

export interface IHouseholdInvitationSubdoc {
  id: string;
  householdName: string;
  inviterUserId: string;
  inviterName: string;
  inviteeEmail: string;
  role: 'editor' | 'viewer';
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
}

export interface IHouseholdAuditLogSubdoc {
  id: string;
  action:
    | 'household_created'
    | 'member_invited'
    | 'invitation_accepted'
    | 'invitation_revoked'
    | 'member_removed'
    | 'role_updated';
  actorUserId: string;
  actorName: string;
  targetUserId?: string;
  targetEmail?: string;
  role?: HouseholdRole;
  details?: string;
  timestamp: Date;
}

export interface IHousehold extends Document {
  name: string;
  ownerId: string;
  members: IHouseholdMemberSubdoc[];
  invitations: IHouseholdInvitationSubdoc[];
  auditLogs: IHouseholdAuditLogSubdoc[];
  currency: CurrencyCode;
  createdAt: Date;
  updatedAt: Date;
  toHousehold(): Household;
}

const HouseholdMemberSchema = new Schema(
  {
    userId: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer', 'admin', 'member'],
      default: 'editor'
    },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const HouseholdInvitationSchema = new Schema(
  {
    id: { type: String, required: true },
    householdName: { type: String, required: true },
    inviterUserId: { type: String, required: true },
    inviterName: { type: String, required: true },
    inviteeEmail: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
    token: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked', 'expired'],
      default: 'pending'
    },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const HouseholdAuditLogSchema = new Schema(
  {
    id: { type: String, required: true },
    action: {
      type: String,
      enum: [
        'household_created',
        'member_invited',
        'invitation_accepted',
        'invitation_revoked',
        'member_removed',
        'role_updated'
      ],
      required: true
    },
    actorUserId: { type: String, required: true },
    actorName: { type: String, required: true },
    targetUserId: { type: String },
    targetEmail: { type: String },
    role: { type: String },
    details: { type: String },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const HouseholdSchema = new Schema<IHousehold>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    ownerId: {
      type: String,
      required: true,
      index: true
    },
    members: {
      type: [HouseholdMemberSchema],
      default: []
    },
    invitations: {
      type: [HouseholdInvitationSchema],
      default: []
    },
    auditLogs: {
      type: [HouseholdAuditLogSchema],
      default: []
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  {
    timestamps: true
  }
);

HouseholdSchema.index({ 'members.userId': 1 });


HouseholdSchema.methods.toHousehold = function (): Household {
  return {
    id: this._id.toString(),
    name: this.name,
    ownerId: this.ownerId,
    members: this.members.map((m: IHouseholdMemberSubdoc): HouseholdMember => ({
      userId: m.userId,
      email: m.email,
      displayName: m.displayName,
      role: m.role as HouseholdRole,
      joinedAt: m.joinedAt.toISOString()
    })),
    invitations: (this.invitations || []).map((inv: IHouseholdInvitationSubdoc): HouseholdInvitation => ({
      id: inv.id,
      householdId: this._id.toString(),
      householdName: inv.householdName,
      inviterUserId: inv.inviterUserId,
      inviterName: inv.inviterName,
      inviteeEmail: inv.inviteeEmail,
      role: inv.role,
      token: inv.token,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString()
    })),
    auditLogs: (this.auditLogs || []).map((a: IHouseholdAuditLogSubdoc): HouseholdAuditLog => ({
      id: a.id,
      action: a.action,
      actorUserId: a.actorUserId,
      actorName: a.actorName,
      targetUserId: a.targetUserId,
      targetEmail: a.targetEmail,
      role: a.role,
      details: a.details,
      timestamp: a.timestamp.toISOString()
    })),
    currency: this.currency as CurrencyCode,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const HouseholdModel: Model<IHousehold> =
  mongoose.models.Household || mongoose.model<IHousehold>('Household', HouseholdSchema);
