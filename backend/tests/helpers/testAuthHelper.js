import { User } from '../../models/User.js';
import { FarmerProfile } from '../../models/FarmerProfile.js';
import { WorkerProfile } from '../../models/WorkerProfile.js';
import { signAccessToken, signRefreshToken } from '../../services/jwtService.js';
import { USER_ROLES } from '../../constants/index.js';
import bcrypt from 'bcryptjs';

/**
 * Creates a verified test farmer in the database and returns { user, token, tokens }
 * without going through the user-facing registration flow.
 */
export const createTestFarmer = async (overrides = {}) => {
  const timestamp = Date.now() + Math.floor(Math.random() * 100000);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(overrides.password || 'Password123!', salt);

  const user = new User({
    name: overrides.name || `Farmer ${timestamp}`,
    email: overrides.email || `farmer_${timestamp}@test.com`,
    mobile: overrides.mobile || `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: hashedPassword,
    role: USER_ROLES.FARMER,
    isVerified: true,
    emailVerifiedAt: new Date(),
    mobileVerified: true,
    mobileVerifiedAt: new Date(),
    profileCompleted: true,
    ...overrides,
  });
  user._skipPasswordHash = true;
  await user.save();

  const profile = await FarmerProfile.create({
    owner: user._id,
    farmName: overrides.farmName || `${user.name}'s Farm`,
    farmType: overrides.farmType || 'Grain & Wheat Cultivation',
    farmSize: overrides.farmSize || 10,
    farmSizeUnit: overrides.farmSizeUnit || 'Acres',
    cropTypes: overrides.cropTypes || ['Wheat', 'Rice'],
    farmAddress: overrides.farmAddress || {
      district: overrides.district || 'Ludhiana',
      state: overrides.state || 'Punjab',
      addressLine: overrides.location || 'Ludhiana, Punjab',
      country: 'India',
    },
  });

  const accessToken = signAccessToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ id: user._id, role: user.role });
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const populatedUser = await User.findById(user._id).populate('farmerProfile');
  return {
    user: populatedUser,
    profile,
    token: accessToken,
    tokens: { accessToken, refreshToken },
  };
};

/**
 * Creates a verified test worker in the database and returns { user, token, tokens }
 */
export const createTestWorker = async (overrides = {}) => {
  const timestamp = Date.now() + Math.floor(Math.random() * 100000);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(overrides.password || 'Password123!', salt);

  const user = new User({
    name: overrides.name || `Worker ${timestamp}`,
    email: overrides.email || `worker_${timestamp}@test.com`,
    mobile: overrides.mobile || `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: hashedPassword,
    role: USER_ROLES.WORKER,
    isVerified: true,
    emailVerifiedAt: new Date(),
    mobileVerified: true,
    mobileVerifiedAt: new Date(),
    profileCompleted: true,
    ...overrides,
  });
  user._skipPasswordHash = true;
  await user.save();

  const profile = await WorkerProfile.create({
    owner: user._id,
    title: overrides.title || 'Agricultural Specialist',
    skills: overrides.skills || ['Crop Harvesting', 'Tractor Driving'],
    expectedDailyWage: overrides.dailyRate || overrides.expectedDailyWage || 650,
    experience: overrides.experience || overrides.experienceYears || 3,
    preferredDistrict: overrides.district || 'Ludhiana',
    preferredState: overrides.state || 'Punjab',
    bio: overrides.bio || '',
    languages: overrides.languages || ['English', 'Hindi'],
  });

  const accessToken = signAccessToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ id: user._id, role: user.role });
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const populatedUser = await User.findById(user._id).populate('workerProfile');
  return {
    user: populatedUser,
    profile,
    token: accessToken,
    tokens: { accessToken, refreshToken },
  };
};
