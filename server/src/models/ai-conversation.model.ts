import mongoose, { Schema, Document, Model } from 'mongoose';
import type { AiConversation, AiMessage } from '@lumaspend/shared';

export interface IAiConversation extends Document {
  userId: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'model' | 'system';
    content: string;
    timestamp: Date;
  }>;
  retentionDays: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  toAiConversation(): AiConversation;
}

const MessageSchema = new Schema(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ['user', 'model', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const AiConversationSchema = new Schema<IAiConversation>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      default: 'Financial Strategy Session',
      trim: true
    },
    messages: {
      type: [MessageSchema],
      default: []
    },
    retentionDays: {
      type: Number,
      default: 30
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

AiConversationSchema.index({ userId: 1, updatedAt: -1 });

AiConversationSchema.methods.toAiConversation = function (): AiConversation {
  return {
    id: this._id.toString(),
    userId: this.userId,
    title: this.title,
    messages: this.messages.map(
      (m: any): AiMessage => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString()
      })
    ),
    retentionDays: this.retentionDays,
    isArchived: this.isArchived,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const AiConversationModel: Model<IAiConversation> =
  mongoose.models.AiConversation ||
  mongoose.model<IAiConversation>('AiConversation', AiConversationSchema);
