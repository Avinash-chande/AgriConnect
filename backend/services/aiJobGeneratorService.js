import { SYSTEM_PROMPTS, formatJobDescriptionGenerationPrompt } from '../prompts/systemPrompts.js';
import { executeGroqJsonQuery } from './groqService.js';

/**
 * AI Job Description Generator Service Layer
 * Generates professional farm job titles, detailed descriptions, required skills,
 * responsibilities, benefits, and safety instructions for farmers using Groq.
 */
export const generateJobDescriptionWithAi = async (userId, inputData) => {
  const { crop, workType, numberOfWorkers, dailyWage, duration, location } = inputData;

  const cacheKey = `job_desc_gen_${crop}_${workType}_${numberOfWorkers}_${dailyWage}_${location}`;
  const userPrompt = formatJobDescriptionGenerationPrompt(inputData);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.JOB_DESCRIPTION_GENERATOR },
    { role: 'user', content: userPrompt },
  ];

  const { data: parsedContent, usage, isCached } = await executeGroqJsonQuery({
    userId,
    endpoint: '/api/v1/ai/jobs/generate-description',
    cacheKey,
    ttlMs: 30 * 60 * 1000,
    messages,
    temperature: 0.5,
  });

  const cropName = crop || 'Agricultural Farm';
  const locationStr = location || 'Local Farm Region';
  const numWorkersStr = numberOfWorkers || 1;

  return {
    jobTitle:
      parsedContent.jobTitle ||
      `Professional ${cropName} Harvesting & Farm Labor Specialist`,
    description:
      parsedContent.description ||
      `We are seeking ${numWorkersStr} dedicated and experienced farm workers for ${cropName} operations in ${locationStr}. The role involves land preparation, crop care, harvesting, and field maintenance for a duration of ${duration || 'Seasonal'}. We offer a competitive daily wage of ₹${dailyWage || 500} with prompt daily/weekly payouts.`,
    requiredSkills:
      Array.isArray(parsedContent.requiredSkills) && parsedContent.requiredSkills.length > 0
        ? parsedContent.requiredSkills
        : [`${cropName} Harvesting`, 'Field Weeding & Irrigation', 'Farm Tools Operation', 'Physical Stamina'],
    responsibilities:
      Array.isArray(parsedContent.responsibilities) && parsedContent.responsibilities.length > 0
        ? parsedContent.responsibilities
        : [
            `Execute timely harvesting and gathering of ${cropName}`,
            'Operate basic agricultural hand tools and equipment safely',
            'Assist in crop sorting, packing, and loading for market transport',
            'Maintain clean irrigation channels and field boundaries',
          ],
    benefits:
      Array.isArray(parsedContent.benefits) && parsedContent.benefits.length > 0
        ? parsedContent.benefits
        : [
            `Competitive wage of ₹${dailyWage || 500} per day with on-time payouts`,
            'Fresh drinking water and clean rest area provided on farm',
            'Flexible working hours with meal breaks',
            'Potential for ongoing seasonal employment contract',
          ],
    safetyInstructions:
      Array.isArray(parsedContent.safetyInstructions) && parsedContent.safetyInstructions.length > 0
        ? parsedContent.safetyInstructions
        : [
            'Wear protective gloves and footwear during field operations',
            'Stay hydrated with provided clean water during peak sunshine hours',
            'Follow proper lifting posture when handling heavy crop bundles',
            'Report any equipment defects or field hazards immediately',
          ],
    inputParameters: {
      crop,
      workType,
      numberOfWorkers,
      dailyWage,
      duration,
      location,
    },
    usage,
    isCached,
  };
};
