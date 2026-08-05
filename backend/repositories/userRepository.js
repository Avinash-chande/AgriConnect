import { User } from '../models/User.js';

export const findUserByEmailRepo = async (email, selectPassword = false) => {
  const query = User.findOne({ email: email.toLowerCase() });
  if (selectPassword) {
    query.select('+password');
  }
  return await query.populate('farmerProfile').populate('workerProfile');
};

export const findUserByMobileRepo = async (mobile) => {
  return await User.findOne({ mobile });
};

export const findUserByIdRepo = async (id, selectPassword = false) => {
  const query = User.findById(id);
  if (selectPassword) {
    query.select('+password');
  }
  return await query.populate('farmerProfile').populate('workerProfile');
};

export const createUserRepo = async (userData) => {
  return await User.create(userData);
};

export const updateUserByIdRepo = async (id, updateData) => {
  return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};
