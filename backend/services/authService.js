import { User } from '../models/User.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { AppError } from '../utils/appError.js';
import { USER_ROLES } from '../constants/index.js';
import { generateAndSaveOTP, verifyOTPCode, clearOTP } from './otpService.js';
import { sendOTPEmail } from './emailService.js';
import { verifyToken, signAccessToken, signRefreshToken } from './jwtService.js';
import { calculateProfileCompletion } from '../utils/profileCalculator.js';

export const registerFarmerService = async (data) => {
  const { fullName, name, email, phone, mobile, password, farmName, farmType, location, totalAcreage, farmDescription } = data;

  const userName = name || fullName;
  const userPhone = mobile || phone;

  const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { mobile: userPhone }] });
  if (existingUser) {
    throw new AppError('An account with this email address or phone/mobile number already exists.', 409);
  }

  const user = await User.create({
    name: userName,
    email,
    mobile: userPhone,
    password,
    role: USER_ROLES.FARMER,
    profileCompleted: false,
  });
  const { otpCode } = await generateAndSaveOTP(user);
  await sendOTPEmail(user.email, otpCode);

  return user;

  await FarmerProfile.create({
    owner: user._id,
    farmName: farmName || `${userName}'s Organic Farm`,
    farmType: farmType || 'Grain & Wheat Cultivation',
    farmSize: totalAcreage || 5,
    farmAddress: {
      district: location ? location.split(',')[0].trim() : 'Amritsar',
      state: location && location.includes(',') ? location.split(',')[1].trim() : 'Punjab',
      addressLine: location || 'Punjab, India',
    },
    farmDescription: farmDescription || '',
  });

  const populatedUser = await User.findById(user._id).populate('farmerProfile');
  return populatedUser;
};

export const registerWorkerService = async (data) => {
  const { fullName, name, email, phone, mobile, password, title, location, hourlyRate, dailyRate, skills, experienceYears, experienceLevel, languages, bio } = data;

  const userName = name || fullName;
  const userPhone = mobile || phone;

  const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { mobile: userPhone }] });
  if (existingUser) {
    throw new AppError('An account with this email address or phone/mobile number already exists.', 409);
  }

  const user = await User.create({
    name: userName,
    email,
    mobile: userPhone,
    password,
    role: USER_ROLES.WORKER,
    profileCompleted: false,
  });
  const { otpCode } = await generateAndSaveOTP(user);
  await sendOTPEmail(user.email, otpCode);

  return user;

  await WorkerProfile.create({
    owner: user._id,
    title: title || 'Agricultural Specialist',
    skills: skills || ['Tractor Driving', 'Crop Harvesting'],
    expectedDailyWage: dailyRate || hourlyRate * 8 || 650,
    experience: experienceYears || 3,
    preferredDistrict: location ? location.split(',')[0].trim() : 'Amritsar',
    preferredState: location && location.includes(',') ? location.split(',')[1].trim() : 'Punjab',
    bio: bio || '',
  });

  const populatedUser = await User.findById(user._id).populate('workerProfile');
  return populatedUser;
};

export const loginUserService = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password').populate('farmerProfile').populate('workerProfile');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email address or password.', 401);
  }
  return user;
};

export const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) throw new AppError('Refresh token is required.', 400);

  const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET || 'agriconnect_refresh_secret');
  const user = await User.findById(decoded.id);

  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
  }

  const newAccessToken = signAccessToken({ id: user._id, role: user.role });
  const newRefreshToken = signRefreshToken({ id: user._id, role: user.role });

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const refreshTokenService = refreshAccessTokenService;

export const forgotPasswordService = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return true; // Return true to prevent account enumeration
  }
  const { otpCode } = await generateAndSaveOTP(user);
  await sendOTPEmail(user.email, otpCode);
  return true;
};

export const sendOTPService = forgotPasswordService;

export const verifyOTPService = async (email, otp) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+otpCode +otpExpiresAt');
  if (!user) throw new AppError('User account not found.', 404);

  const isValid = await verifyOTPCode(user, otp);
  if (!isValid) throw new AppError('Invalid or expired OTP code.', 400);

  user.isVerified = true;
  await user.save({ validateBeforeSave: false });
  return true;
};

export const resetPasswordService = async (email, otp, newPassword) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+otpCode +otpExpiresAt');
  if (!user) throw new AppError('User account not found.', 404);

  const isValid = await verifyOTPCode(user, otp);
  if (!isValid) throw new AppError('Invalid or expired OTP code.', 400);

  user.password = newPassword;
  await clearOTP(user);
  await user.save();
  return true;
};
