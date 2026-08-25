import { User } from '../models/User.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { AppError } from '../utils/appError.js';
import { USER_ROLES } from '../constants/index.js';
import { OAuth2Client } from 'google-auth-library';
import { generateAndSaveOTP, verifyOTPCode, clearOTP } from './otpService.js';
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

  await FarmerProfile.create({
    owner: user._id,
    farmName: farmName || `${userName}'s Organic Farm`,
    farmType: farmType || 'Grain & Wheat Cultivation',
    farmSize: totalAcreage || 5,
    cropTypes: [],
    livestock: [],
    equipment: [],
    farmImages: [],
    workingDays: [],
    farmAddress: location
      ? {
        district: location.split(',')[0].trim(),
        state: location.includes(',') ? location.split(',')[1].trim() : '',
        addressLine: location,
        country: 'India',
      }
      : null,
    farmDescription: farmDescription || '',
  });

  const populatedUser = await User.findById(user._id).populate('farmerProfile');
  return populatedUser;
};

export const registerWorkerService = async (data) => {
  const { fullName, name, email, phone, mobile, password, title, location, hourlyRate, dailyRate, skills, experienceYears, experienceLevel, languages, bio } = data;

  const userName = name || fullName;
  const rawPhone = mobile || phone;
  const userPhone = rawPhone ? normalizePhoneNumber(rawPhone) : rawPhone;

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
      farmName: `${name}'s Farm`,   // placeholder, user edits later
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
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password').populate('farmerProfile').populate('workerProfile');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email address or password.', 401);
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
    // Invalidate all tokens for this user to protect against token theft
    user.refreshToken = null;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Security alert: Refresh token reuse detected. All sessions invalidated. Please log in again.', 401);
  }

  // TOKEN ROTATION: Issue brand new access token AND new refresh token
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
    // If ID token verification failed, try fetching profile via Access Token
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

  // Find user by googleId or email
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
    // Update existing user with googleId if not linked yet
    if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = 'google';
      await user.save({ validateBeforeSave: false });
    }
  }

  return user;
};

