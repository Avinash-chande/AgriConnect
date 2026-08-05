import { FarmerProfile } from '../models/FarmerProfile.js';
import { WorkerProfile } from '../models/WorkerProfile.js';

export const findFarmerProfileByOwnerRepo = async (ownerId) => {
  return await FarmerProfile.findOne({ owner: ownerId }).populate('owner', '-password');
};

export const findWorkerProfileByOwnerRepo = async (ownerId) => {
  return await WorkerProfile.findOne({ owner: ownerId }).populate('owner', '-password');
};

export const createFarmerProfileRepo = async (profileData) => {
  return await FarmerProfile.create(profileData);
};

export const createWorkerProfileRepo = async (profileData) => {
  return await WorkerProfile.create(profileData);
};

export const updateFarmerProfileRepo = async (ownerId, updateData) => {
  return await FarmerProfile.findOneAndUpdate({ owner: ownerId }, updateData, {
    new: true,
    runValidators: true,
  }).populate('owner', '-password');
};

export const updateWorkerProfileRepo = async (ownerId, updateData) => {
  return await WorkerProfile.findOneAndUpdate({ owner: ownerId }, updateData, {
    new: true,
    runValidators: true,
  }).populate('owner', '-password');
};
