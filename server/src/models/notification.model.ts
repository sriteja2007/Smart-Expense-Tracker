import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Notification, NotificationType } from '@lumaspend/shared';

export interface INotification extends Document {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  toNotification(): Notification;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['budget_alert', 'recurring_due', 'goal_milestone', 'household_invite', 'system'],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

NotificationSchema.methods.toNotification = function (): Notification {
  return {
    id: this._id.toString(),
    userId: this.userId,
    type: this.type as NotificationType,
    title: this.title,
    message: this.message,
    isRead: this.isRead,
    metadata: this.metadata,
    createdAt: this.createdAt.toISOString()
  };
};

export const NotificationModel: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
