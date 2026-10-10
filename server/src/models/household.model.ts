import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Household, HouseholdMember, HouseholdRole, CurrencyCode } from '@lumaspend/shared';

export interface IHouseholdMemberSubdoc {
  userId: string;
  email: string;
  displayName: string;
  role: HouseholdRole;
  joinedAt: Date;
}

export interface IHousehold extends Document {
  name: string;
  ownerId: string;
  members: IHouseholdMemberSubdoc[];
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
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: { type: Date, default: Date.now }
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
    currency: this.currency as CurrencyCode,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const HouseholdModel: Model<IHousehold> =
  mongoose.models.Household || mongoose.model<IHousehold>('Household', HouseholdSchema);
