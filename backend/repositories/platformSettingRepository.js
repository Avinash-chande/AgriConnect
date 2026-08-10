import { PlatformSetting } from '../models/PlatformSetting.js';

/**
 * Platform Setting Repository — Get/Set with type coercion
 */

export const getByKey = async (key) => {
  return PlatformSetting.findOne({ key }).lean();
};

export const getByCategory = async (category) => {
  return PlatformSetting.find({ category }).sort({ key: 1 }).lean();
};

export const getAll = async () => {
  return PlatformSetting.find().sort({ category: 1, key: 1 }).lean();
};

export const upsert = async (key, data) => {
  return PlatformSetting.findOneAndUpdate({ key }, data, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

export const updateByKey = async (key, value, updatedBy) => {
  return PlatformSetting.findOneAndUpdate(
    { key },
    { value, updatedBy },
    { new: true, runValidators: true }
  );
};

/**
 * Get a setting value with type coercion and default fallback
 */
export const getValue = async (key, defaultValue = null) => {
  const setting = await PlatformSetting.findOne({ key }).lean();
  if (!setting) return defaultValue;

  switch (setting.type) {
    case 'boolean':
      return Boolean(setting.value);
    case 'number':
      return Number(setting.value);
    case 'json':
      return typeof setting.value === 'object' ? setting.value : JSON.parse(setting.value);
    default:
      return String(setting.value);
  }
};
