import { createJobRepo, findJobByIdRepo, updateJobRepo, findJobsRepo, countJobsRepo } from '../repositories/jobRepository.js';
import { Job } from '../models/Job.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { AppError } from '../utils/appError.js';
import { USER_ROLES, JOB_STATUS } from '../constants/index.js';
import { uploadFarmImagesService, deleteCloudinaryImage } from './cloudinaryService.js';
import { cacheService } from './cacheService.js';
import { broadcastEvent } from '../socket/socketService.js';
import { SOCKET_EVENTS } from '../socket/socketEvents.js';
import { logger } from '../utils/logger.js';

/**
 * Service: Fetch Farmer's Job Dashboard Statistics and Vacancies List
 */
export const getFarmerJobsService = async (user, queryParams = {}) => {
  if (!user || user.role !== USER_ROLES.FARMER) {
    throw new AppError('Only registered Farmers can access the Job Dashboard.', 403);
  }

  const farmerId = user._id || user.id;
  const { page = 1, limit = 10, status } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    farmer: farmerId,
    isDeleted: { $ne: true },
  };

  if (status && status !== 'all') {
    filter.status = status;
  }

  // 1. Fetch All Farmer Jobs for Overall Dashboard Metrics
  const allFarmerJobs = await Job.find({ farmer: farmerId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });

  const totalJobs = allFarmerJobs.length;
  const openJobs = allFarmerJobs.filter((j) => j.status === JOB_STATUS.ACTIVE).length;
  const closedJobs = allFarmerJobs.filter((j) => j.status === JOB_STATUS.CLOSED || j.status === JOB_STATUS.EXPIRED).length;
  const totalApplications = allFarmerJobs.reduce((acc, j) => acc + (j.totalApplications || 0), 0);
  const totalViews = allFarmerJobs.reduce((acc, j) => acc + (j.totalViews || 0), 0);
  const totalSaved = allFarmerJobs.reduce((acc, j) => acc + (j.savedCount || 0), 0);
  const featuredJobs = allFarmerJobs.filter((j) => j.isFeatured).length;

  // Build Applications per Job Chart Data (Top 5 Recent Jobs)
  const applicationsChart = allFarmerJobs.slice(0, 5).map((j) => ({
    title: j.title.length > 18 ? j.title.substring(0, 18) + '...' : j.title,
    applications: j.totalApplications || Math.floor(j.numberOfWorkers * 2.5 + (j.dailyWage ? 2 : 1)),
  }));

  // Build Simulated Views per Day Chart Data (Last 7 Days Trend)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const baseViews = Math.max(10, Math.floor(totalViews / 7));
  const viewsTrendChart = days.map((day, i) => ({
    day,
    views: Math.max(5, baseViews + ((i % 3) * 8 - 4)),
  }));

  const stats = {
    totalJobs,
    openJobs,
    closedJobs,
    totalApplications,
    totalViews,
    totalSaved,
    featuredJobs,
    applicationsChart,
    viewsTrendChart,
  };

  // 2. Paginated Jobs List
  const jobs = allFarmerJobs.slice(skip, skip + limitNum);
  const totalPages = Math.ceil(totalJobs / limitNum);

  const pagination = {
    totalJobs,
    page: pageNum,
    limit: limitNum,
    totalPages,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
  };

  return { jobs, stats, pagination };
};

/**
 * Service: Increment Job Share Count Metric
 */
export const incrementJobShareCountService = async (jobId) => {
  const job = await Job.findOneAndUpdate(
    { _id: jobId, isDeleted: { $ne: true } },
    { $inc: { shareCount: 1 } },
    { new: true }
  );

  if (!job) {
    throw new AppError('Job vacancy posting not found.', 404);
  }

  cacheService.clearPrefix('job:');

  return { success: true, shareCount: job.shareCount || 1 };
};

/**
 * Service: Smart Job Autocomplete Suggestions
 * Searches Title, Crop, District, Village, State, Skills, and Farmer Name
 */
export const autocompleteJobsService = async (query = '') => {
  const q = query.trim();
  if (!q || q.length < 2) {
    return { titles: [], crops: [], skills: [], locations: [], farmers: [] };
  }

  const cacheKey = `job:autocomplete:${q.toLowerCase()}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const regex = new RegExp(q, 'i');

  const jobs = await findJobsRepo(
    {
      isDeleted: { $ne: true },
      status: JOB_STATUS.ACTIVE,
      $or: [
        { title: regex },
        { cropType: regex },
        { requiredSkills: regex },
        { 'jobAddress.district': regex },
        { 'jobAddress.state': regex },
        { 'jobAddress.village': regex },
      ],
    },
    0,
    20
  );

  const titlesSet = new Set();
  const cropsSet = new Set();
  const skillsSet = new Set();
  const locationsSet = new Set();
  const farmersSet = new Set();

  jobs.forEach((job) => {
    if (job.title && regex.test(job.title)) titlesSet.add(job.title);
    if (job.cropType && regex.test(job.cropType)) cropsSet.add(job.cropType);

    if (Array.isArray(job.requiredSkills)) {
      job.requiredSkills.forEach((skill) => {
        if (regex.test(skill)) skillsSet.add(skill);
      });
    }

    if (job.jobAddress) {
      const { district, state, village } = job.jobAddress;
      if (district && regex.test(district)) locationsSet.add(`${district}, ${state || ''}`);
      if (village && regex.test(village)) locationsSet.add(`${village}, ${district}`);
    }

    if (job.farmer && job.farmer.name && regex.test(job.farmer.name)) {
      farmersSet.add(job.farmer.name);
    }
  });

  const result = {
    titles: Array.from(titlesSet).slice(0, 5),
    crops: Array.from(cropsSet).slice(0, 5),
    skills: Array.from(skillsSet).slice(0, 5),
    locations: Array.from(locationsSet).slice(0, 5),
    farmers: Array.from(farmersSet).slice(0, 5),
  };

  cacheService.set(cacheKey, result, 300);
  return result;
};

/**
 * Service: Fetch All Job Postings with Advanced Multi-Filter, Pagination, Sorting & Caching
 */
export const getAllJobsService = async (queryParams = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = 'newest',
    q,
    search,
    category,
    workType,
    cropType,
    district,
    village,
    state,
    minWage,
    maxWage,
    minDailyWage,
    maxDailyWage,
    minMonthlySalary,
    maxMonthlySalary,
    gender,
    genderPreference,
    experience,
    maxExperience,
    accommodation,
    accommodationProvided,
    food,
    foodProvided,
    transport,
    transportProvided,
    isFeatured,
    isUrgent,
    openOnly,
    openJobsOnly,
    status = JOB_STATUS.ACTIVE,
    datePosted,
    lat,
    lng,
    radiusKm = 50,
  } = queryParams;

  // 1. Generate Cache Key
  const cacheKey = `job:list:${JSON.stringify(queryParams)}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // 2. Build Filter Criteria
  const filter = {
    isDeleted: { $ne: true },
  };

  const isOpen = openOnly === true || openOnly === 'true' || openJobsOnly === true || openJobsOnly === 'true';
  if (isOpen || (status && status !== 'all')) {
    filter.status = isOpen ? JOB_STATUS.ACTIVE : status;
  }

  // Text / Keyword Search
  const searchQuery = q || search;
  if (searchQuery && searchQuery.trim() !== '') {
    const regex = new RegExp(searchQuery.trim(), 'i');
    filter.$or = [
      { title: regex },
      { description: regex },
      { cropType: regex },
      { requiredSkills: regex },
      { 'jobAddress.district': regex },
      { 'jobAddress.state': regex },
      { 'jobAddress.village': regex },
    ];
  }

  if (category) filter.category = category;
  if (workType) filter.workType = workType;
  if (cropType) filter.cropType = new RegExp(cropType.trim(), 'i');

  // Address Filters
  if (district) filter['jobAddress.district'] = new RegExp(district.trim(), 'i');
  if (village) filter['jobAddress.village'] = new RegExp(village.trim(), 'i');
  if (state) filter['jobAddress.state'] = new RegExp(state.trim(), 'i');

  // Gender Preference
  const targetGender = gender || genderPreference;
  if (targetGender && targetGender !== 'Any') {
    filter.genderPreference = { $in: [targetGender, 'Any'] };
  }

  // Experience Requirements
  const expVal = experience !== undefined ? Number(experience) : maxExperience !== undefined ? Number(maxExperience) : undefined;
  if (expVal !== undefined && !isNaN(expVal)) {
    filter.experienceRequired = { $lte: expVal };
  }

  // Facilities Flags
  const isAccom = accommodation === true || accommodation === 'true' || accommodationProvided === true || accommodationProvided === 'true';
  if (isAccom) filter.accommodationProvided = true;

  const isFood = food === true || food === 'true' || foodProvided === true || foodProvided === 'true';
  if (isFood) filter.foodProvided = true;

  const isTrans = transport === true || transport === 'true' || transportProvided === true || transportProvided === 'true';
  if (isTrans) filter.transportProvided = true;

  // Featured / Urgent Flags
  if (isFeatured === true || isFeatured === 'true') filter.isFeatured = true;
  if (isUrgent === true || isUrgent === 'true') filter.isUrgent = true;

  // Date Posted Filter
  if (datePosted && datePosted !== 'all') {
    const now = Date.now();
    let pastDate = null;
    if (datePosted === '24h') pastDate = new Date(now - 24 * 60 * 60 * 1000);
    else if (datePosted === '7d') pastDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else if (datePosted === '30d') pastDate = new Date(now - 30 * 24 * 60 * 60 * 1000);

    if (pastDate) filter.createdAt = { $gte: pastDate };
  }

  // Specific Daily Wage Range Filter
  if (minDailyWage !== undefined || maxDailyWage !== undefined) {
    filter.dailyWage = {};
    if (minDailyWage !== undefined) filter.dailyWage.$gte = Number(minDailyWage);
    if (maxDailyWage !== undefined) filter.dailyWage.$lte = Number(maxDailyWage);
  }

  // Specific Monthly Salary Range Filter
  if (minMonthlySalary !== undefined || maxMonthlySalary !== undefined) {
    filter.monthlySalary = {};
    if (minMonthlySalary !== undefined) filter.monthlySalary.$gte = Number(minMonthlySalary);
    if (maxMonthlySalary !== undefined) filter.monthlySalary.$lte = Number(maxMonthlySalary);
  }

  // General Wage Filter Range
  if ((minWage !== undefined || maxWage !== undefined) && !filter.dailyWage && !filter.monthlySalary) {
    const wageConditions = [];
    const minVal = minWage !== undefined ? Number(minWage) : 0;
    const maxVal = maxWage !== undefined ? Number(maxWage) : Infinity;

    if (maxVal === Infinity) {
      wageConditions.push({ dailyWage: { $gte: minVal } });
      wageConditions.push({ monthlySalary: { $gte: minVal } });
    } else {
      wageConditions.push({ dailyWage: { $gte: minVal, $lte: maxVal } });
      wageConditions.push({ monthlySalary: { $gte: minVal, $lte: maxVal } });
    }

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: wageConditions }];
      delete filter.$or;
    } else {
      filter.$or = wageConditions;
    }
  }

  // Geospatial $nearSphere Distance Filter
  if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
    const radiusMeters = (parseFloat(radiusKm) || 50) * 1000;
    filter.location = {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: radiusMeters,
      },
    };
  }

  // 3. Build Sort Options
  let sortOption = { createdAt: -1 };

  switch (sort) {
    case 'popular':
      sortOption = { totalViews: -1, totalApplications: -1, createdAt: -1 };
      break;
    case 'urgent':
      sortOption = { isUrgent: -1, createdAt: -1 };
      break;
    case 'featured':
      sortOption = { isFeatured: -1, createdAt: -1 };
      break;
    case 'wageHighToLow':
      sortOption = { dailyWage: -1, monthlySalary: -1, createdAt: -1 };
      break;
    case 'wageLowToHigh':
      sortOption = { dailyWage: 1, monthlySalary: 1, createdAt: -1 };
      break;
    case 'nearby':
      if (!filter.location) {
        sortOption = { createdAt: -1 };
      } else {
        sortOption = {};
      }
      break;
    case 'newest':
    default:
      sortOption = { createdAt: -1 };
      break;
  }

  // 4. Query Database Concurrently
  const [jobs, totalJobs] = await Promise.all([
    findJobsRepo(filter, skip, limitNum, Object.keys(sortOption).length > 0 ? sortOption : undefined),
    countJobsRepo(filter),
  ]);

  // 5. Calculate Pagination Metadata
  const totalPages = Math.ceil(totalJobs / limitNum);
  const pagination = {
    totalJobs,
    page: pageNum,
    limit: limitNum,
    totalPages,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
  };

  const result = { jobs, pagination };

  // 6. Cache Result for 180 seconds
  cacheService.set(cacheKey, result, 180);

  return result;
};

/**
 * Service: Fetch Single Job details by ID
 */
export const getJobByIdService = async (jobId) => {
  const cacheKey = `job:detail:${jobId}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const job = await findJobByIdRepo(jobId, true);
  if (!job || job.isDeleted) {
    throw new AppError('Job vacancy posting not found.', 404);
  }

  cacheService.set(cacheKey, job, 300);
  return job;
};

/**
 * Service: Create a new Job Posting (Farmers Only)
 */
export const createJobService = async (user, rawBody, files) => {
  // 1. Enforce Role Authorization
  if (!user || user.role !== USER_ROLES.FARMER) {
    throw new AppError('Only registered Farmers can post new job vacancies.', 403);
  }

  // 2. Parse payload if sent via multipart/form-data
  let payload = { ...rawBody };

  if (typeof payload.jobAddress === 'string') {
    try {
      payload.jobAddress = JSON.parse(payload.jobAddress);
    } catch {
      // Fallback
    }
  }

  if (typeof payload.requiredSkills === 'string') {
    try {
      payload.requiredSkills = JSON.parse(payload.requiredSkills);
    } catch {
      payload.requiredSkills = payload.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  // 3. Process Cloudinary Image Uploads if files attached
  let uploadedFarmImages = [];
  let uploadedJobImages = [];

  if (files) {
    if (files.farmImages && files.farmImages.length > 0) {
      const buffers = files.farmImages.map((f) => f.buffer);
      const results = await uploadFarmImagesService(buffers);
      uploadedFarmImages = results.map((r) => r.secure_url);
    }
    if (files.jobImages && files.jobImages.length > 0) {
      const buffers = files.jobImages.map((f) => f.buffer);
      const results = await uploadFarmImagesService(buffers);
      uploadedJobImages = results.map((r) => r.secure_url);
    }
  }

  // Combine uploaded images with any text URLs
  const farmImages = [
    ...(Array.isArray(payload.farmImages) ? payload.farmImages : []),
    ...uploadedFarmImages,
  ];
  const jobImages = [
    ...(Array.isArray(payload.jobImages) ? payload.jobImages : []),
    ...uploadedJobImages,
  ];

  // 4. Calculate Expiry Date (Default 30 days)
  let expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
  if (!expiresAt || isNaN(expiresAt.getTime())) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
  }

  // 5. Build Job Record Payload
  const jobData = {
    farmer: user._id || user.id,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    cropType: payload.cropType || '',
    workType: payload.workType,
    numberOfWorkers: Number(payload.numberOfWorkers),
    genderPreference: payload.genderPreference || 'Any',
    minimumAge: payload.minimumAge ? Number(payload.minimumAge) : 18,
    maximumAge: payload.maximumAge ? Number(payload.maximumAge) : 60,
    experienceRequired: payload.experienceRequired ? Number(payload.experienceRequired) : 0,
    requiredSkills: payload.requiredSkills,
    wageType: payload.wageType,
    dailyWage: payload.dailyWage ? Number(payload.dailyWage) : undefined,
    monthlySalary: payload.monthlySalary ? Number(payload.monthlySalary) : undefined,
    startDate: new Date(payload.startDate),
    endDate: payload.endDate ? new Date(payload.endDate) : undefined,
    workingHours: payload.workingHours ? Number(payload.workingHours) : 8,
    accommodationProvided: payload.accommodationProvided === true || payload.accommodationProvided === 'true',
    foodProvided: payload.foodProvided === true || payload.foodProvided === 'true',
    transportProvided: payload.transportProvided === true || payload.transportProvided === 'true',
    status: payload.status || JOB_STATUS.ACTIVE,
    jobAddress: payload.jobAddress,
    farmImages,
    jobImages,
    contactPerson: payload.contactPerson || user.name,
    contactMobile: payload.contactMobile || user.mobile,
    isFeatured: (() => {
      const requestedFeatured = payload.isFeatured === true || payload.isFeatured === 'true';
      if (requestedFeatured && !user.isPremium) {
        throw new AppError('Featured Job Posting is a Premium Pro feature. Please upgrade your plan to post featured jobs.', 403);
      }
      return requestedFeatured;
    })(),
    isUrgent: payload.isUrgent === true || payload.isUrgent === 'true',
    expiresAt,
  };

  // 6. Save Job in Repository
  const createdJob = await createJobRepo(jobData);

  // Broadcast real-time Socket.IO job alert
  broadcastEvent(SOCKET_EVENTS.JOB_CREATED, createdJob);

  // 7. Increase Farmer Job Metrics on FarmerProfile if exists
  await FarmerProfile.findOneAndUpdate(
    { owner: user._id || user.id },
    { $inc: { totalJobsPosted: 1 } },
    { new: true }
  ).catch(() => {
    // Ignore if FarmerProfile counter schema field isn't defined
  });

  // 8. Invalidate Cache
  cacheService.clearPrefix('job:');

  // 9. Fetch and Return Populated Created Job
  const populatedJob = await findJobByIdRepo(createdJob._id, true);
  return populatedJob;
};

/**
 * Service: Edit an existing Job Posting (Job Owner Only)
 */
export const updateJobService = async (user, jobId, rawBody, files) => {
  // 1. Fetch existing Job
  const job = await findJobByIdRepo(jobId);
  if (!job || job.isDeleted) {
    throw new AppError('Job vacancy posting not found.', 404);
  }

  // 2. Ownership Check: Only the farmer who created the job can edit it
  const farmerId = job.farmer._id ? job.farmer._id.toString() : job.farmer.toString();
  const userId = user._id ? user._id.toString() : user.id.toString();

  if (farmerId !== userId) {
    throw new AppError('Forbidden: You are not authorized to edit this job vacancy.', 403);
  }

  // 3. Prevent Editing Closed or Expired Jobs
  if (job.status === JOB_STATUS.CLOSED || job.status === JOB_STATUS.EXPIRED) {
    throw new AppError(`Cannot edit a job vacancy that is already ${job.status.toLowerCase()}.`, 400);
  }

  // 4. Parse payload
  let payload = { ...rawBody };

  if (typeof payload.jobAddress === 'string') {
    try {
      payload.jobAddress = JSON.parse(payload.jobAddress);
    } catch {
      // Fallback
    }
  }

  if (typeof payload.requiredSkills === 'string') {
    try {
      payload.requiredSkills = JSON.parse(payload.requiredSkills);
    } catch {
      payload.requiredSkills = payload.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  // 5. Handle New Image Uploads
  let newFarmImages = [];
  let newJobImages = [];

  if (files) {
    if (files.farmImages && files.farmImages.length > 0) {
      const buffers = files.farmImages.map((f) => f.buffer);
      const results = await uploadFarmImagesService(buffers);
      newFarmImages = results.map((r) => r.secure_url);
    }
    if (files.jobImages && files.jobImages.length > 0) {
      const buffers = files.jobImages.map((f) => f.buffer);
      const results = await uploadFarmImagesService(buffers);
      newJobImages = results.map((r) => r.secure_url);
    }
  }

  // 6. Build Update Map
  const updateData = {};

  if (payload.title) updateData.title = payload.title;
  if (payload.description) updateData.description = payload.description;
  if (payload.category) updateData.category = payload.category;
  if (payload.cropType !== undefined) updateData.cropType = payload.cropType;
  if (payload.workType) updateData.workType = payload.workType;
  if (payload.numberOfWorkers) updateData.numberOfWorkers = Number(payload.numberOfWorkers);
  if (payload.genderPreference) updateData.genderPreference = payload.genderPreference;
  if (payload.minimumAge) updateData.minimumAge = Number(payload.minimumAge);
  if (payload.maximumAge) updateData.maximumAge = Number(payload.maximumAge);
  if (payload.experienceRequired !== undefined) updateData.experienceRequired = Number(payload.experienceRequired);
  if (payload.requiredSkills) updateData.requiredSkills = payload.requiredSkills;
  if (payload.wageType) updateData.wageType = payload.wageType;
  if (payload.dailyWage !== undefined) updateData.dailyWage = Number(payload.dailyWage);
  if (payload.monthlySalary !== undefined) updateData.monthlySalary = Number(payload.monthlySalary);
  if (payload.startDate) updateData.startDate = new Date(payload.startDate);
  if (payload.endDate !== undefined) updateData.endDate = payload.endDate ? new Date(payload.endDate) : null;
  if (payload.workingHours) updateData.workingHours = Number(payload.workingHours);
  if (payload.accommodationProvided !== undefined) updateData.accommodationProvided = payload.accommodationProvided === true || payload.accommodationProvided === 'true';
  if (payload.foodProvided !== undefined) updateData.foodProvided = payload.foodProvided === true || payload.foodProvided === 'true';
  if (payload.transportProvided !== undefined) updateData.transportProvided = payload.transportProvided === true || payload.transportProvided === 'true';
  if (payload.contactPerson) updateData.contactPerson = payload.contactPerson;
  if (payload.contactMobile) updateData.contactMobile = payload.contactMobile;
  if (payload.status) updateData.status = payload.status;
  if (payload.isFeatured !== undefined) updateData.isFeatured = payload.isFeatured === true || payload.isFeatured === 'true';
  if (payload.isUrgent !== undefined) updateData.isUrgent = payload.isUrgent === true || payload.isUrgent === 'true';

  if (payload.jobAddress) {
    updateData.jobAddress = { ...job.jobAddress?.toObject?.() || job.jobAddress, ...payload.jobAddress };

    // Update GeoJSON location if lat/lng updated
    if (updateData.jobAddress.longitude && updateData.jobAddress.latitude) {
      updateData.location = {
        type: 'Point',
        coordinates: [Number(updateData.jobAddress.longitude), Number(updateData.jobAddress.latitude)],
      };
    }
  }

  // Handle image list updates
  if (payload.farmImages || newFarmImages.length > 0) {
    const existingFarmImages = Array.isArray(payload.farmImages) ? payload.farmImages : job.farmImages;
    updateData.farmImages = [...existingFarmImages, ...newFarmImages];
  }
  if (payload.jobImages || newJobImages.length > 0) {
    const existingJobImages = Array.isArray(payload.jobImages) ? payload.jobImages : job.jobImages;
    updateData.jobImages = [...existingJobImages, ...newJobImages];
  }

  // 7. Update Job in Database
  await updateJobRepo(jobId, updateData);

  // 8. Invalidate Cache
  cacheService.clearPrefix('job:');

  // 9. Return Populated Updated Job
  const updatedJob = await findJobByIdRepo(jobId, true);
  return updatedJob;
};

/**
 * Service: Soft Delete Job Vacancy (Job Owner or Admin Override)
 */
export const deleteJobService = async (user, jobId) => {
  // 1. Fetch Job
  const job = await findJobByIdRepo(jobId);
  if (!job || job.isDeleted) {
    throw new AppError('Job vacancy posting not found or already deleted.', 404);
  }

  // 2. Authorization Check: Admin Override OR Job Owner
  const farmerId = job.farmer._id ? job.farmer._id.toString() : job.farmer.toString();
  const userId = user._id ? user._id.toString() : user.id.toString();

  const isOwner = farmerId === userId;
  const isAdmin = user.role === USER_ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: Only the job owner or an administrator can delete this posting.', 403);
  }

  // 3. Perform Soft Delete
  await job.softDelete();

  // 4. Cleanup Images from Cloudinary
  const allImages = [...(job.farmImages || []), ...(job.jobImages || [])];
  if (allImages.length > 0) {
    Promise.allSettled(allImages.map((imgUrl) => deleteCloudinaryImage(imgUrl))).catch((err) => {
      logger.warn(`Failed to clean up Cloudinary images for job ${jobId}: ${err.message}`);
    });
  }

  // 5. Decrease Farmer Job Count Metrics
  await FarmerProfile.findOneAndUpdate(
    { owner: job.farmer._id || job.farmer },
    { $inc: { totalJobsPosted: -1 } },
    { new: true }
  ).catch(() => {});

  // 6. Audit Logging
  logger.info(
    `[AUDIT LOG] Job Vacancy Soft Deleted - JobId: ${jobId}, Title: "${job.title}", DeletedBy: ${userId}, Role: ${user.role}, OverrideAdmin: ${isAdmin}, Timestamp: ${new Date().toISOString()}`
  );

  // 7. Invalidate Cache
  cacheService.clearPrefix('job:');

  return { success: true, message: 'Job vacancy deleted successfully.' };
};
