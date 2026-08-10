import { AdminRole } from '../models/AdminRole.js';

/**
 * Admin Role Repository
 */

export const create = async (data) => {
  return AdminRole.create(data);
};

export const findById = async (id) => {
  return AdminRole.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
};

export const findByName = async (name) => {
  return AdminRole.findOne({ name, isDeleted: { $ne: true } }).lean();
};

export const getAll = async () => {
  return AdminRole.find({ isDeleted: { $ne: true } }).sort({ isSystem: -1, name: 1 }).lean();
};

export const updateById = async (id, updateData) => {
  return AdminRole.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

export const deleteById = async (id) => {
  const role = await AdminRole.findById(id);
  if (!role) return null;
  if (role.isSystem) {
    throw new Error('Cannot delete system role');
  }
  return role.softDelete();
};
