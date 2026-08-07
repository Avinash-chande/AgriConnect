import mongoose from 'mongoose';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../constants/index.js';

export const MAX_PROMPT_LENGTH = 4000;

/**
 * Validate MongoDB ObjectId format
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate AI Chat Input
 */
export const validateChatInput = (req, res, next) => {
  const { message, conversationId, systemPromptType, temperature, maxTokens } = req.body;

  // 1. Message presence and length check
  if (!message || typeof message !== 'string' || !message.trim()) {
    return next(new AppError('Message string parameter is required and cannot be empty.', HTTP_STATUS.BAD_REQUEST));
  }

  if (message.length > MAX_PROMPT_LENGTH) {
    return next(
      new AppError(`Message exceeds maximum limit of ${MAX_PROMPT_LENGTH} characters.`, HTTP_STATUS.BAD_REQUEST)
    );
  }

  // 2. Validate conversationId if provided
  if (conversationId && !isValidObjectId(conversationId)) {
    return next(new AppError('Invalid conversationId format.', HTTP_STATUS.BAD_REQUEST));
  }

  // 3. Temperature validation (0.0 to 2.0)
  if (temperature !== undefined) {
    const tempNum = Number(temperature);
    if (isNaN(tempNum) || tempNum < 0 || tempNum > 2.0) {
      return next(new AppError('Temperature must be a number between 0.0 and 2.0', HTTP_STATUS.BAD_REQUEST));
    }
  }

  // 4. maxTokens validation
  if (maxTokens !== undefined) {
    const tokensNum = Number(maxTokens);
    if (isNaN(tokensNum) || tokensNum < 1 || tokensNum > 8192) {
      return next(new AppError('maxTokens must be a positive integer between 1 and 8192', HTTP_STATUS.BAD_REQUEST));
    }
  }

  next();
};

/**
 * Validate Crop Recommendation Input
 */
export const validateCropRecommendationInput = (req, res, next) => {
  const { location, soilType, farmSize, irrigationType, season } = req.body;

  if (!location || typeof location !== 'string' || !location.trim()) {
    return next(new AppError('Location string is required for crop recommendation.', HTTP_STATUS.BAD_REQUEST));
  }

  if (farmSize !== undefined) {
    const sizeNum = Number(farmSize);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      return next(new AppError('Farm size must be a positive number.', HTTP_STATUS.BAD_REQUEST));
    }
  }

  next();
};

/**
 * Validate Worker Recommendation Input
 */
export const validateWorkerRecommendationInput = (req, res, next) => {
  const jobId = req.body?.jobId || req.query?.jobId;

  if (jobId && !isValidObjectId(jobId)) {
    return next(new AppError('Invalid jobId parameter format.', HTTP_STATUS.BAD_REQUEST));
  }

  next();
};

/**
 * Validate Conversation ID URL Parameter
 */
export const validateConversationIdParam = (req, res, next) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    return next(new AppError('Invalid conversation ID parameter', HTTP_STATUS.BAD_REQUEST));
  }

  next();
};

/**
 * Validate Job Description Generation Input
 */
export const validateJobDescriptionGenerationInput = (req, res, next) => {
  const { crop, workType, numberOfWorkers, dailyWage } = req.body;

  if (!crop || typeof crop !== 'string' || !crop.trim()) {
    return next(new AppError('Crop type string parameter is required (e.g. Paddy, Wheat, Cotton).', HTTP_STATUS.BAD_REQUEST));
  }

  if (numberOfWorkers !== undefined) {
    const num = Number(numberOfWorkers);
    if (isNaN(num) || num <= 0) {
      return next(new AppError('numberOfWorkers must be a positive integer.', HTTP_STATUS.BAD_REQUEST));
    }
  }

  if (dailyWage !== undefined) {
    const wage = Number(dailyWage);
    if (isNaN(wage) || wage < 0) {
      return next(new AppError('dailyWage cannot be negative.', HTTP_STATUS.BAD_REQUEST));
    }
  }

  next();
};

/**
 * Validate AI Smart Search Input
 */
export const validateSmartSearchInput = (req, res, next) => {
  const query = req.body?.query || req.query?.query || req.query?.q;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return next(new AppError('Search query string parameter is required.', HTTP_STATUS.BAD_REQUEST));
  }

  if (query.length > 500) {
    return next(new AppError('Search query cannot exceed 500 characters.', HTTP_STATUS.BAD_REQUEST));
  }

  next();
};

/**
 * Validate AI Wage Prediction Input
 */
export const validateWagePredictionInput = (req, res, next) => {
  const { crop, district, workingHours, experience } = req.body;

  if (!crop || typeof crop !== 'string' || !crop.trim()) {
    return next(new AppError('Crop type string parameter is required.', HTTP_STATUS.BAD_REQUEST));
  }

  if (!district || typeof district !== 'string' || !district.trim()) {
    return next(new AppError('District string parameter is required.', HTTP_STATUS.BAD_REQUEST));
  }

  if (workingHours !== undefined) {
    const hours = Number(workingHours);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      return next(new AppError('Working hours must be a number between 1 and 24.', HTTP_STATUS.BAD_REQUEST));
    }
  }

  if (experience !== undefined) {
    const exp = Number(experience);
    if (isNaN(exp) || exp < 0) {
      return next(new AppError('Experience years cannot be negative.', HTTP_STATUS.BAD_REQUEST));
    }
  }

  next();
};

/**
 * Validate Crop-Based Worker Recommendation Input
 */
export const validateCropWorkerRecommendationInput = (req, res, next) => {
  const crop = req.body?.crop || req.query?.crop;

  if (!crop || typeof crop !== 'string' || !crop.trim()) {
    return next(new AppError('Crop parameter is required (e.g. Sugarcane, Cotton, Paddy).', HTTP_STATUS.BAD_REQUEST));
  }

  next();
};

/**
 * Validate AI Interview Generation Input
 */
export const validateInterviewGenerationInput = (req, res, next) => {
  const crop = req.body?.crop || req.query?.crop;
  const jobTitle = req.body?.jobTitle || req.query?.jobTitle;

  if (!crop || typeof crop !== 'string' || !crop.trim()) {
    return next(new AppError('Crop parameter is required (e.g. Sugarcane, Cotton, Paddy).', HTTP_STATUS.BAD_REQUEST));
  }

  if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
    return next(new AppError('Job title parameter is required.', HTTP_STATUS.BAD_REQUEST));
  }

  next();
};

/**
 * Validate AI Interview Evaluation Input
 */
export const validateInterviewEvaluationInput = (req, res, next) => {
  const { sessionId, userAnswers } = req.body;

  if (!sessionId || !isValidObjectId(sessionId)) {
    return next(new AppError('Valid sessionId MongoDB ObjectId parameter is required.', HTTP_STATUS.BAD_REQUEST));
  }

  if (!userAnswers || !Array.isArray(userAnswers) || userAnswers.length === 0) {
    return next(new AppError('userAnswers array parameter is required.', HTTP_STATUS.BAD_REQUEST));
  }

  next();
};
