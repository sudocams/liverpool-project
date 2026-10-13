import mongoose from 'mongoose';

const contentMigrationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
}, { timestamps: true });

export const ContentMigration = mongoose.model('ContentMigration', contentMigrationSchema);
