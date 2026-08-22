import { USER_ROLES } from '../constants/index.js';

/**
 * Calculates profile completion percentage dynamically based on user role and filled profile fields
 */
export const calculateProfileCompletion = (user, profile) => {
  if (!user || !profile) return 0;

  const roleLower = user.role?.toLowerCase() || '';

  if (roleLower === 'farmer') {
    let totalPoints = 0;
    let earnedPoints = 0;

    // Base User fields for farmer
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

    if (totalPoints === 0) return 0;
    return Math.min(100, Math.round((earnedPoints / totalPoints) * 100));
  } else if (roleLower === 'worker') {
    // 8-Section Dynamic Worker Profile Calculation
    const isSection1 = Boolean(
      (user.name || profile.name || '').trim().length >= 2 &&
      (profile.title || '').trim().length >= 2 &&
      (profile.bio || '').trim().length > 0
    );

    const isSection2 = Boolean(
      Array.isArray(profile.skills) && profile.skills.length > 0
    );

    const isSection3 = Boolean(
      profile.experience !== undefined &&
      profile.experience !== null &&
      !isNaN(Number(profile.experience)) &&
      Number(profile.experience) >= 0 &&
      profile.education &&
      profile.education.trim().length > 0
    );

    const isSection4 = Boolean(
      profile.expectedDailyWage !== undefined &&
      profile.expectedDailyWage !== null &&
      !isNaN(Number(profile.expectedDailyWage)) &&
      Number(profile.expectedDailyWage) >= 50 &&
      profile.availability &&
      profile.preferredWorkType
    );

    const isSection5 = Boolean(
      profile.preferredDistrict &&
      profile.preferredDistrict.trim().length > 0 &&
      profile.preferredState &&
      profile.preferredState.trim().length > 0
    );

    const isSection6 = Boolean(
      Array.isArray(profile.certificateImages) && profile.certificateImages.length > 0
    );

    const isSection7 = Boolean(
      Array.isArray(profile.profileGallery) && profile.profileGallery.length > 0
    );

    const isSection8 = Boolean(profile.aadhaarVerified === true);

    const completedSections = [
      isSection1,
      isSection2,
      isSection3,
      isSection4,
      isSection5,
      isSection6,
      isSection7,
      isSection8,
    ].filter(Boolean).length;

    return Math.round((completedSections / 8) * 100);
  }

  return 0;
};
