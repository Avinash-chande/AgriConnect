import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { PendingRegistration, MAX_OTP_ATTEMPTS } from '../models/PendingRegistration.js';
import { AppError } from '../utils/appError.js';
import { USER_ROLES } from '../constants/index.js';
import { OAuth2Client } from 'google-auth-library';
import {
  generateAndSaveOTP,
  generateOTPCode,
  verifyOTPCode,
  verifyPendingOTPCode,
  clearOTP,
} from './otpService.js';
import { sendOTPEmail } from './emailService.js';
import { verifyToken, signAccessToken, signRefreshToken } from './jwtService.js';
import { calculateProfileCompletion } from '../utils/profileCalculator.js';
import { TrustScoreService } from './TrustScoreService.js';
import { VerificationHistory } from '../models/VerificationHistory.js';
import { Notification, NOTIFICATION_TYPE } from '../models/Notification.js';
import { createNotificationService } from './notificationService.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';

export const registerFarmerService = async (data) => {
  const { name, fullName, email, mobile, phone, password, location, farmDescription, farmName, farmType, totalAcreage } = data;

  const userName = name || fullName;
  const rawPhone = mobile || phone;
  const userPhone = rawPhone ? normalizePhoneNumber(rawPhone) : rawPhone;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if a real, verified User already exists with this email or mobile
  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { mobile: userPhone }],
  });
  if (existingUser) {
    throw new AppError('An account with this email address or phone/mobile number already exists.', 409);
  }

  // Pre-hash password once with bcrypt (salt rounds: 10)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Generate secure 6-digit OTP code & 10-minute expiry
  const { otpCode, otpExpiresAt } = generateOTPCode();

  const farmAddress = location
    ? {
        district: location.split(',')[0].trim(),
        state: location.includes(',') ? location.split(',')[1].trim() : '',
        addressLine: location,
        country: 'India',
      }
    : null;

  // Upsert PendingRegistration: replace any previous pending registration for this email
  await PendingRegistration.findOneAndUpdate(
    { email: normalizedEmail },
    {
      name: userName,
      email: normalizedEmail,
      mobile: userPhone,
      password: hashedPassword,
      role: USER_ROLES.FARMER,
      farmName: farmName || `${userName}'s Organic Farm`,
      farmType: farmType || 'Grain & Wheat Cultivation',
      farmSize: totalAcreage || 5,
      farmAddress,
      farmDescription: farmDescription || '',
      otpCode,
      otpExpiresAt,
      otpAttempts: 0,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  // Send OTP to user's email
  await sendOTPEmail(normalizedEmail, otpCode);

  // Invariant: User document, FarmerProfile, JWT MUST NOT EXIST
  return {
    requiresOtp: true,
    email: normalizedEmail,
  };
};

export const registerWorkerService = async (data) => {
  const { fullName, name, email, phone, mobile, password, title, location, hourlyRate, dailyRate, skills, experienceYears, experienceLevel, languages, bio } = data;

  const userName = name || fullName;
  const rawPhone = mobile || phone;
  const userPhone = rawPhone ? normalizePhoneNumber(rawPhone) : rawPhone;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if a real, verified User already exists with this email or mobile
  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { mobile: userPhone }],
  });
  if (existingUser) {
    throw new AppError('An account with this email address or phone/mobile number already exists.', 409);
  }

  // Pre-hash password once with bcrypt (salt rounds: 10)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Generate secure 6-digit OTP code & 10-minute expiry
  const { otpCode, otpExpiresAt } = generateOTPCode();

  // Upsert PendingRegistration: replace any previous pending registration for this email
  await PendingRegistration.findOneAndUpdate(
    { email: normalizedEmail },
    {
      name: userName,
      email: normalizedEmail,
      mobile: userPhone,
      password: hashedPassword,
      role: USER_ROLES.WORKER,
      title: title || 'Agricultural Specialist',
      skills: (skills && skills.length > 0) ? skills : ['Tractor Driving', 'Crop Harvesting'],
      expectedDailyWage: dailyRate || (hourlyRate ? hourlyRate * 8 : 650),
      experience: experienceYears || 0,
      preferredDistrict: location ? location.split(',')[0].trim() : 'Amritsar',
      preferredState: location && location.includes(',') ? location.split(',')[1].trim() : 'Punjab',
      bio: bio || '',
      languages: (languages && languages.length > 0) ? languages : ['English', 'Hindi'],
      otpCode,
      otpExpiresAt,
      otpAttempts: 0,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  // Send OTP to user's email
  await sendOTPEmail(normalizedEmail, otpCode);

  // Invariant: User document, WorkerProfile, JWT MUST NOT EXIST
  return {
    requiresOtp: true,
    email: normalizedEmail,
  };
};

/**
 * Resend OTP for a pending registration session
 */
export const resendRegistrationOTPService = async (email) => {
  if (!email) {
    throw new AppError('Email is required to resend verification code.', 400);
  }
  const normalizedEmail = email.toLowerCase().trim();

  const pending = await PendingRegistration.findOne({ email: normalizedEmail });
  if (!pending) {
    throw new AppError('Registration session not found or expired. Please register again.', 404);
  }

  const { otpCode, otpExpiresAt } = generateOTPCode();
  pending.otpCode = otpCode;
  pending.otpExpiresAt = otpExpiresAt;
  pending.otpAttempts = 0; // Reset attempts on fresh code
  await pending.save();

  await sendOTPEmail(normalizedEmail, otpCode);

  return { email: normalizedEmail, expiresAt: otpExpiresAt };
};

/**
 * Verify Registration OTP:
 * 1. Finds PendingRegistration
 * 2. Validates expiry and max attempts (5)
 * 3. Verifies OTP match
 * 4. Protects against duplicate concurrent registration (final duplicate check)
 * 5. Atomically creates User + Profile
 * 6. Deletes PendingRegistration
 * 7. Executes post-verification logic (TrustScore, history, notifications)
 * 8. Returns fully populated User
 */
export const verifyRegistrationOTPService = async (email, otpCode) => {
  if (!email || !otpCode) {
    throw new AppError('Please provide email address and 6-digit OTP code.', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const pending = await PendingRegistration.findOne({ email: normalizedEmail });

  if (!pending) {
    throw new AppError('Registration session not found or expired. Please register again.', 404);
  }

  // 1. Check OTP Expiry
  if (pending.otpExpiresAt < new Date()) {
    throw new AppError('OTP verification code has expired. Please request a new code.', 400);
  }

  // 2. Check Failed Attempts Limit
  if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw new AppError('Too many failed attempts. Please register again.', 429);
  }

  // 3. Verify OTP Code
  const isMatch = verifyPendingOTPCode(pending, otpCode.toString().trim());
  if (!isMatch) {
    pending.otpAttempts += 1;
    await pending.save();

    if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      throw new AppError('Too many failed attempts. Please register again.', 429);
    }

    throw new AppError('Invalid OTP verification code.', 400);
  }

  // 4. Final Duplicate User Check (race condition protection)
  const existingUser = await User.findOne({
    $or: [{ email: pending.email }, { mobile: pending.mobile }],
  });
  if (existingUser) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw new AppError('An account with this email address or mobile number already exists.', 409);
  }

  // 5. Atomic Account & Profile Creation
  // Attempt with MongoDB Transaction if supported by replica set; fallback to safe rollback if not
  const now = new Date();
  let user;
  let session = null;

  // Check whether MongoDB supports transactions (replica set or sharded cluster)
  const isReplicaSet = mongoose.connection.client?.topology?.description?.type === 'ReplicaSet' ||
                       mongoose.connection.client?.topology?.description?.type === 'Sharded';
  if (isReplicaSet) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (sessErr) {
      session = null;
    }
  }

  try {
    const userDoc = new User({
      name: pending.name,
      email: pending.email,
      mobile: pending.mobile,
      password: pending.password, // Pre-hashed bcrypt hash
      role: pending.role,
      isVerified: true,
      emailVerifiedAt: now,
      mobileVerified: true,
      mobileVerifiedAt: now,
      profileCompleted: false,
    });

    // Skip password hashing middleware since password is already a valid bcrypt hash
    userDoc._skipPasswordHash = true;

    if (session) {
      await userDoc.save({ session });
    } else {
      await userDoc.save();
    }

    user = userDoc;

    if (pending.role === USER_ROLES.FARMER) {
      const farmerProfileData = {
        owner: user._id,
        farmName: pending.farmName || `${pending.name}'s Organic Farm`,
        farmType: pending.farmType || 'Grain & Wheat Cultivation',
        farmSize: pending.farmSize || 5,
        cropTypes: [],
        livestock: [],
        equipment: [],
        farmImages: [],
        workingDays: [],
        farmAddress: pending.farmAddress,
        farmDescription: pending.farmDescription || '',
      };

      if (session) {
        await FarmerProfile.create([farmerProfileData], { session });
      } else {
        await FarmerProfile.create(farmerProfileData);
      }
    } else if (pending.role === USER_ROLES.WORKER) {
      const workerProfileData = {
        owner: user._id,
        title: pending.title || 'Agricultural Specialist',
        skills: pending.skills && pending.skills.length > 0 ? pending.skills : ['Tractor Driving', 'Crop Harvesting'],
        expectedDailyWage: pending.expectedDailyWage || 650,
        experience: pending.experience || 0,
        preferredDistrict: pending.preferredDistrict || 'Amritsar',
        preferredState: pending.preferredState || 'Punjab',
        bio: pending.bio || '',
        languages: pending.languages && pending.languages.length > 0 ? pending.languages : ['English', 'Hindi'],
      };

      if (session) {
        await WorkerProfile.create([workerProfileData], { session });
      } else {
        await WorkerProfile.create(workerProfileData);
      }
    }

    // Delete the PendingRegistration document so OTP cannot be reused
    if (session) {
      await PendingRegistration.deleteOne({ _id: pending._id }, { session });
      await session.commitTransaction();
    } else {
      await PendingRegistration.deleteOne({ _id: pending._id });
    }
  } catch (creationErr) {
    if (session) {
      await session.abortTransaction();
    } else if (user && user._id) {
      // Safe compensating rollback for non-transactional standalone MongoDB
      await User.deleteOne({ _id: user._id });
      await FarmerProfile.deleteOne({ owner: user._id });
      await WorkerProfile.deleteOne({ owner: user._id });
    }
    throw creationErr;
  } finally {
    if (session) {
      session.endSession();
    }
  }

  // 6. Post-verification Logic: Trust Score & Verification History
  try {
    const trustProfile = await TrustScoreService.updateTrustScore(
      user._id,
      'OTP_VERIFICATION_SUCCESS',
      { kind: 'User', id: user._id }
    );

    await VerificationHistory.create({
      user: user._id,
      verificationSystem: 'SYSTEM_A_TRUST',
      entityId: trustProfile._id,
      previousState: { isVerified: false },
      newState: {
        isVerified: true,
        emailVerifiedAt: user.emailVerifiedAt,
        mobileVerifiedAt: user.mobileVerifiedAt,
        trustScore: trustProfile.trustScore,
        trustLevel: trustProfile.trustLevel,
      },
      changedBy: user._id,
      changeReason: 'Registration OTP verification successful',
    });

    await createNotificationService({
      type: NOTIFICATION_TYPE.EMAIL_VERIFIED,
      recipientId: user._id,
      payload: { trustScore: trustProfile.trustScore, trustLevel: trustProfile.trustLevel },
    });
  } catch (auditErr) {
    // Non-blocking audit/notification errors
  }

  const populatedUser = await User.findById(user._id)
    .populate('farmerProfile')
    .populate('workerProfile');

  return populatedUser;
};

export const findUserByEmailOrGoogleId = async (email, googleId) => {
  return await User.findOne({ $or: [{ email: email.toLowerCase() }, { googleId }] });
};

export const registerGoogleUserService = async ({ email, name, googleId, role }) => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('An account with this email address already exists.', 409);
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    googleId,
    authProvider: 'google',
    role: role === 'farmer' ? USER_ROLES.FARMER : USER_ROLES.WORKER,
    isVerified: true,        // Google already verified their email
    emailVerifiedAt: new Date(),
    profileCompleted: false, // forces them through your existing profile-completion flow
  });

  if (role === 'farmer') {
    await FarmerProfile.create({
      owner: user._id,
      farmName: `${name}'s Farm`,
      farmType: 'Grain & Wheat Cultivation',
      farmSize: 5,
      cropTypes: [], livestock: [], equipment: [], farmImages: [], workingDays: [],
      farmAddress: null,
      farmDescription: '',
    });
  } else {
    await WorkerProfile.create({
      owner: user._id,
      title: 'Agricultural Specialist',
      skills: ['Tractor Driving', 'Crop Harvesting'],
      expectedDailyWage: 650,
      experience: 3,
      preferredDistrict: 'Amritsar',
      preferredState: 'Punjab',
      bio: '',
    });
  }

  const populatedUser = await User.findById(user._id).populate(role === 'farmer' ? 'farmerProfile' : 'workerProfile');
  return populatedUser;
};

export const loginUserService = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password')
    .populate('farmerProfile')
    .populate('workerProfile');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email address or password.', 401);
  }

  // Reject login for unverified accounts
  if (!user.isVerified) {
    throw new AppError('Your account is not verified. Please verify your email before logging in.', 403);
  }

  return user;
};

export const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) throw new AppError('Refresh token is required.', 400);

  let decoded;
  try {
    decoded = verifyToken(refreshToken, true);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user) {
    throw new AppError('The user belonging to this token no longer exists.', 401);
  }

  // REUSE DETECTION GUARD: If token signature is valid but doesn't match active stored token
  if (user.refreshToken !== refreshToken) {
    user.refreshToken = null;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Security alert: Refresh token reuse detected. All sessions invalidated. Please log in again.', 401);
  }

  const newAccessToken = signAccessToken({ id: user._id, role: user.role });
  const newRefreshToken = signRefreshToken({ id: user._id, role: user.role });

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
};

export const refreshTokenService = refreshAccessTokenService;

export const logoutUserService = async (userId) => {
  if (!userId) return;
  await User.findByIdAndUpdate(userId, { $set: { refreshToken: null } });
};

export const forgotPasswordService = async (credential) => {
  if (!credential) return true;
  const isEmail = credential.includes('@');
  const query = isEmail ? { email: credential.toLowerCase() } : { mobile: credential };
  const user = await User.findOne(query);
  if (!user) {
    return true; // Return true to prevent account enumeration
  }
  const { otpCode } = await generateAndSaveOTP(user);
  if (isEmail) {
    await sendOTPEmail(user.email, otpCode);
  }
  return { otpCode, otpExpiresAt: user.otpExpiresAt };
};

export const sendOTPService = forgotPasswordService;

/**
 * Legacy OTP verification for already-existing User documents (e.g. forgot-password flow)
 */
export const verifyOTPService = async (credential, otp) => {
  if (!credential || !otp) {
    throw new AppError('Please provide mobile number/email and OTP code.', 400);
  }

  const isEmail = credential.includes('@');
  const query = isEmail ? { email: credential.toLowerCase() } : { mobile: credential };

  const user = await User.findOne(query).select('+otpCode +otpExpiresAt');
  if (!user) throw new AppError('User account not found.', 404);

  const isValid = await verifyOTPCode(user, otp);
  if (!isValid) throw new AppError('Invalid or expired OTP code.', 400);

  const now = new Date();
  user.isVerified = true;

  if (isEmail) {
    user.emailVerifiedAt = now;
  } else {
    user.mobileVerified = true;
    user.mobileVerifiedAt = now;
  }

  if (user.mobile) {
    user.mobileVerified = true;
    if (!user.mobileVerifiedAt) user.mobileVerifiedAt = now;
  }
  if (user.email && !user.emailVerifiedAt) user.emailVerifiedAt = now;

  await user.save({ validateBeforeSave: false });

  // 1. Recalculate System A Trust Score & Badges via TrustScoreService
  const trustProfile = await TrustScoreService.updateTrustScore(
    user._id,
    'OTP_VERIFICATION_SUCCESS',
    { kind: 'User', id: user._id }
  );

  // 2. Create VerificationHistory entry
  await VerificationHistory.create({
    user: user._id,
    verificationSystem: 'SYSTEM_A_TRUST',
    entityId: trustProfile._id,
    previousState: { isVerified: false },
    newState: {
      isVerified: true,
      emailVerifiedAt: user.emailVerifiedAt,
      mobileVerifiedAt: user.mobileVerifiedAt,
      trustScore: trustProfile.trustScore,
      trustLevel: trustProfile.trustLevel,
    },
    changedBy: user._id,
    changeReason: `OTP verification successful for ${isEmail ? 'email' : 'mobile'}`,
  });

  // 3. Notify user of successful verification and trust score update via Socket.IO
  try {
    const notifType = isEmail ? NOTIFICATION_TYPE.EMAIL_VERIFIED : NOTIFICATION_TYPE.MOBILE_VERIFIED;
    await createNotificationService({
      type: notifType,
      recipientId: user._id,
      payload: { trustScore: trustProfile.trustScore, trustLevel: trustProfile.trustLevel },
    });
  } catch (err) {
    // Non-blocking notification error handling
  }

  return { isVerified: true, trustProfile };
};

export const resetPasswordService = async (credential, otp, newPassword) => {
  const isEmail = credential.includes('@');
  const query = isEmail ? { email: credential.toLowerCase() } : { mobile: credential };

  const user = await User.findOne(query).select('+otpCode +otpExpiresAt');
  if (!user) throw new AppError('User account not found.', 404);

  const isValid = await verifyOTPCode(user, otp);
  if (!isValid) throw new AppError('Invalid or expired OTP code.', 400);

  user.password = newPassword;
  await clearOTP(user);
  await user.save();
  return true;
};

export const googleLoginService = async (token, selectedRole = 'farmer') => {
  if (!token) throw new AppError('Google authentication token is required.', 400);

  let googleId, email, name, picture;

  // Try verifying as ID token first
  try {
    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    googleId = payload.sub;
    email = payload.email;
    name = payload.name;
    picture = payload.picture;
  } catch (idTokenErr) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Invalid Google Access Token');
      const data = await response.json();
      googleId = data.sub;
      email = data.email;
      name = data.name;
      picture = data.picture;
    } catch (accessTokenErr) {
      throw new AppError('Invalid or expired Google token. Verification failed.', 401);
    }
  }

  if (!email) {
    throw new AppError('Could not retrieve email address from Google authentication.', 400);
  }

  let user = await User.findOne({
    $or: [{ googleId }, { email: email.toLowerCase() }]
  }).populate('farmerProfile').populate('workerProfile');

  const role = selectedRole && selectedRole.toLowerCase() === 'worker' ? USER_ROLES.WORKER : USER_ROLES.FARMER;

  if (!user) {
    user = await User.create({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      googleId,
      authProvider: 'google',
      isVerified: true,
      emailVerifiedAt: new Date(),
      profileImage: picture || '',
      role,
      profileCompleted: false,
    });

    if (role === USER_ROLES.FARMER) {
      await FarmerProfile.create({
        owner: user._id,
        farmName: `${name || 'Farmer'}'s Farm`,
        farmType: 'General Agriculture',
        farmSize: 5,
      });
    } else {
      await WorkerProfile.create({
        owner: user._id,
        title: 'Agricultural Specialist',
        skills: ['General Labor'],
        expectedDailyWage: 600,
      });
    }

    user = await User.findById(user._id).populate('farmerProfile').populate('workerProfile');
  } else {
    if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = 'google';
      await user.save({ validateBeforeSave: false });
    }
  }

  return user;
};
