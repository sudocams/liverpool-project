import mongoose from 'mongoose';
import { ClassroomComparison } from '../models/ClassroomComparison.js';
import { loadLocalMap, saveLocalMap } from './localPersistence.js';

const temporaryRecords = new Map();
const loadRecords = () => loadLocalMap('classroom-comparison.json', temporaryRecords);

export async function listClassroomComparisonRecords() {
  if (mongoose.connection.readyState === 1) return ClassroomComparison.find({}).sort({ code: 1 }).lean();
  await loadRecords();
  return [...temporaryRecords.values()].map(record => structuredClone(record)).sort((a, b) => a.code.localeCompare(b.code));
}

export async function saveClassroomComparisonPhase(code, phaseRecord) {
  if (mongoose.connection.readyState === 1) {
    const record = await ClassroomComparison.findOne({ code }) ?? new ClassroomComparison({ code, phases: [] });
    const existingPhases = record.phases.filter(item => item.phase !== phaseRecord.phase);
    record.phases = [...existingPhases, phaseRecord];
    await record.save();
    return record.toObject();
  }
  await loadRecords();
  const current = temporaryRecords.get(code) ?? { code, phases: [] };
  const updated = { ...current, phases: [...current.phases.filter(item => item.phase !== phaseRecord.phase), phaseRecord] };
  temporaryRecords.set(code, updated);
  await saveLocalMap('classroom-comparison.json', temporaryRecords);
  return structuredClone(updated);
}

export async function deleteClassroomComparisonRecord(code) {
  if (mongoose.connection.readyState === 1) return ClassroomComparison.findOneAndDelete({ code }).lean();
  await loadRecords();
  const current = temporaryRecords.get(code) ?? null;
  temporaryRecords.delete(code);
  await saveLocalMap('classroom-comparison.json', temporaryRecords);
  return current;
}
