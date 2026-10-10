import mongoose, { Schema, Document, Model } from 'mongoose';
import type { FinancialCategory, CategoryClassification } from '@lumaspend/shared';

export interface ICategory extends Document {
  userId?: string;
  householdId?: string;
  name: string;
  type: CategoryClassification;
  icon: string;
  color: string;
  isSystem: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  toCategory(): FinancialCategory;
}

const CategorySchema = new Schema<ICategory>(
  {
    userId: {
      type: String,
      sparse: true,
      index: true
    },
    householdId: {
      type: String,
      sparse: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      required: true
    },
    icon: {
      type: String,
      default: 'Tag'
    },
    color: {
      type: String,
      default: '#8B5CF6'
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true
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

CategorySchema.index({ userId: 1, type: 1 });

CategorySchema.methods.toCategory = function (): FinancialCategory {
  return {
    id: this._id.toString(),
    userId: this.userId || undefined,
    householdId: this.householdId || undefined,
    name: this.name,
    type: this.type as CategoryClassification,
    icon: this.icon,
    color: this.color,
    isSystem: this.isSystem,
    isArchived: this.isArchived,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
