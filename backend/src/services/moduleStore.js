import mongoose from 'mongoose';
import { challenges } from '../content/challenges.js';
import { LearningModule } from '../models/LearningModule.js';
import { ContentMigration } from '../models/ContentMigration.js';

const temporaryModules = new Map(challenges.map((module, index) => [module.id, { ...structuredClone(module), missionOrder: index + 1 }]));

export function validateModule(module) {
  if (!module || typeof module !== 'object' || Array.isArray(module)) return 'Module must be a JSON object.';
  if (typeof module.id !== 'string' || !/^[a-z0-9-]{3,60}$/.test(module.id)) return 'id must use 3–60 lowercase letters, numbers, or hyphens.';
  for (const key of ['topic', 'duration', 'title', 'description', 'learningObjective', 'scenario', 'question', 'explanation']) {
    if (typeof module[key] !== 'string' || !module[key].trim() || module[key].length > 1200) return `${key} must be a non-empty string up to 1200 characters.`;
  }
  for (const key of ['briefing', 'hints']) {
    if (!Array.isArray(module[key]) || module[key].length < 1 || module[key].length > 5 || module[key].some(item => typeof item !== 'string' || !item.trim() || item.length > 300)) return `${key} must contain 1–5 short text items.`;
  }
  if (!Array.isArray(module.options) || module.options.length < 2 || module.options.length > 6 || module.options.some(item => typeof item !== 'string' || !item.trim() || item.length > 500)) return 'options must contain 2–6 answer strings.';
  if (!Number.isInteger(module.answerIndex) || module.answerIndex < 0 || module.answerIndex >= module.options.length) return 'answerIndex must refer to one of the answer options.';
  return null;
}

function plainModule(document) {
  if (document?.toObject) return document.toObject();
  return document;
}

export async function listModules() {
  if (mongoose.connection.readyState === 1) {
    let modules = await LearningModule.find({}).sort({ missionOrder: 1, createdAt: 1 }).lean();
    if (modules.length === 0) {
      await LearningModule.insertMany(challenges);
      modules = await LearningModule.find({}).sort({ missionOrder: 1, createdAt: 1 }).lean();
    }
    return modules;
  }
  return [...temporaryModules.values()].map(item => structuredClone(item));
}

export async function getModule(id) {
  if (mongoose.connection.readyState === 1) return LearningModule.findOne({ id }).lean();
  return temporaryModules.has(id) ? structuredClone(temporaryModules.get(id)) : null;
}

export async function createModule(module) {
  if (mongoose.connection.readyState === 1) return plainModule(await LearningModule.create(module));
  if (temporaryModules.has(module.id)) throw new Error('A module with this id already exists.');
  temporaryModules.set(module.id, structuredClone(module));
  return structuredClone(module);
}

export async function updateModule(id, module) {
  if (mongoose.connection.readyState === 1) return LearningModule.findOneAndUpdate({ id }, { $set: module }, { new: true, runValidators: true }).lean();
  if (!temporaryModules.has(id)) return null;
  const updated = { ...module, id };
  temporaryModules.set(id, structuredClone(updated));
  return updated;
}

export async function deleteModule(id) {
  if (mongoose.connection.readyState === 1) return LearningModule.findOneAndDelete({ id }).lean();
  const existing = temporaryModules.get(id);
  temporaryModules.delete(id);
  return existing ?? null;
}

export async function seedModules() {
  if (mongoose.connection.readyState !== 1) return;
  const migrationKey = 'cyberwolf-missions-v1';
  if (await ContentMigration.exists({ key: migrationKey })) return;
  const operations = challenges.flatMap((module, index) => [
    { updateOne: { filter: { id: module.id }, update: { $setOnInsert: { ...module, missionOrder: index + 1 } }, upsert: true } },
    { updateOne: { filter: { id: module.id, missionOrder: { $exists: false } }, update: { $set: { missionOrder: index + 1 } } } },
  ]);
  await LearningModule.bulkWrite(operations);
  await ContentMigration.updateOne({ key: migrationKey }, { $setOnInsert: { key: migrationKey } }, { upsert: true });
}
