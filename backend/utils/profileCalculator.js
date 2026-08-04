import { USER_ROLES } from '../constants/index.js';

/**
 * Calculates profile completion percentage dynamically based on user role and filled profile fields
 */
export const calculateProfileCompletion = (user, profile) => {
  if (!user || !profile) return 0;

  let totalPoints = 0;
  let earnedPoints = 0;

  // Base User fields
  const userFields = [
    { name: 'name', value: user.name, weight: 10 },
    { name: 'email', value: user.email, weight: 10 },
    { name: 'mobile', value: user.mobile, weight: 10 },
    { name: 'profileImage', value: user.profileImage, weight: 10 },
  ];

  userFields.forEach((field) => {
    totalPoints += field.weight;
    if (field.value && field.value.toString().trim() !== '') {
      earnedPoints += field.weight;
    }
  });

  const roleLower = user.role?.toLowerCase() || '';

  if (roleLower === 'farmer') {
    const farmerFields = [
      { name: 'farmName', value: profile.farmName, weight: 10 },
      { name: 'farmSize', value: profile.farmSize, weight: 10 },
      { name: 'district', value: profile.farmAddress?.district, weight: 10 },
      { name: 'state', value: profile.farmAddress?.state, weight: 10 },
      { name: 'cropTypes', value: profile.cropTypes?.length > 0, weight: 10 },
      { name: 'irrigationType', value: profile.irrigationType, weight: 5 },
      { name: 'farmDescription', value: profile.farmDescription, weight: 5 },
      { name: 'farmImages', value: profile.farmImages?.length > 0, weight: 10 },
    ];

    farmerFields.forEach((field) => {
      totalPoints += field.weight;
      if (field.value) {
        earnedPoints += field.weight;
      }
    });
  } else if (roleLower === 'worker') {
    const workerFields = [
      { name: 'title', value: profile.title, weight: 10 },
      { name: 'skills', value: profile.skills?.length > 0, weight: 10 },
      { name: 'expectedDailyWage', value: profile.expectedDailyWage > 0, weight: 10 },
      { name: 'preferredDistrict', value: profile.preferredDistrict, weight: 10 },
      { name: 'preferredState', value: profile.preferredState, weight: 5 },
      { name: 'bio', value: profile.bio, weight: 5 },
      { name: 'experience', value: profile.experience !== undefined, weight: 5 },
      { name: 'certificateImages', value: profile.certificateImages?.length > 0, weight: 5 },
    ];

    workerFields.forEach((field) => {
      totalPoints += field.weight;
      if (field.value) {
        earnedPoints += field.weight;
      }
    });
  }

  if (totalPoints === 0) return 0;
  return Math.min(100, Math.round((earnedPoints / totalPoints) * 100));
};
