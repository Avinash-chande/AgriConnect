import { AI_CATEGORIES } from '../../constants/aiConstants.js';
import { aiLogger } from './aiLogger.js';

/**
 * Intelligent Rule-Based Offline/Degraded Mode Fallback Service for AgriConnect
 */
export class AIFallbackService {
  /**
   * Generates a realistic fallback response tailored to the category and query
   */
  static getFallbackResponse({ category, prompt, systemPrompt, conversationHistory = [] }) {
    aiLogger.warn(`Executing fallback response generator for category: ${category}`);

    switch (category) {
      case AI_CATEGORIES.AGRONOMY:
        return this.getAgronomyFallback(prompt);
      case AI_CATEGORIES.JOB_GENERATOR:
        return this.getJobGeneratorFallback(prompt);
      case AI_CATEGORIES.PROFILE_SUMMARY:
        return this.getProfileSummaryFallback(prompt);
      case AI_CATEGORIES.TRANSLATION:
        return this.getTranslationFallback(prompt);
      case AI_CATEGORIES.GOVT_SCHEMES:
        return this.getGovtSchemesFallback(prompt);
      case AI_CATEGORIES.GENERAL_ASSISTANT:
      default:
        return this.getGeneralAssistantFallback(prompt);
    }
  }

  static getAgronomyFallback(prompt = '') {
    const lower = prompt.toLowerCase();
    if (lower.includes('pest') || lower.includes('insect') || lower.includes('bug')) {
      return `### AgriConnect Crop Protection Guidance (Offline Mode)

**Diagnosis & Advisory:**
1. **Immediate Inspection:** Check underside of leaves for eggs or larva activity during early morning.
2. **Eco-Friendly Solution:** Apply Neem oil spray (5ml per liter of water with mild soap solution) every 7 days.
3. **Chemical Treatment:** If infestation is high, consult your local Krishi Vigyan Kendra (KVK) for recommended insecticides for your specific crop.
4. **Safety Precautions:** Always wear protective mask, gloves, and eye safety goggles when spraying chemical treatments.`;
    }

    if (lower.includes('soil') || lower.includes('fertilizer') || lower.includes('npk')) {
      return `### AgriConnect Soil & Nutrition Advisory (Offline Mode)

**Recommendation:**
1. **Soil Testing:** Perform a baseline soil test to determine pH and Nitrogen-Phosphorus-Potassium (NPK) levels.
2. **Basal Application:** Incorporate well-decomposed Farmyard Manure (FYM) or compost (5-10 tonnes/acre) during field preparation.
3. **Balanced NPK:** Split Nitrogen application into 2-3 top dressings to minimize leaching during rain or heavy irrigation.`;
    }

    return `### AgriConnect Agronomy Advisory (Offline Mode)

Thank you for your agronomic query regarding: "${prompt}".

**General Field Best Practices:**
- Ensure adequate drainage to prevent waterlogging and root rot.
- Practice crop rotation with legumes (pulses/beans) to naturally replenish soil nitrogen.
- Monitor weather forecasts before applying fertilizers or pesticides.
- Consult your nearest agricultural officer or AgriConnect extension center for localized seed and crop recommendations.`;
  }

  static getJobGeneratorFallback(prompt = '') {
    return `### Agricultural Job Description (Generated in Resilient Mode)

**Position Overview:**
We are seeking dependable agricultural labor and farm equipment operators for upcoming seasonal field work.

**Key Responsibilities:**
- Perform field preparation, crop planting, weeding, and harvesting duties.
- Operate and maintain standard farm equipment (tractors, tillers, or sprayers).
- Assist in irrigation management and post-harvest storage handling.

**Requirements & Experience:**
- Prior hands-on experience in farm operations or crop harvesting preferred.
- Physical stamina for field duties and ability to work in team environments.
- Punctuality and adherence to farm safety protocols.

**Compensation & Perks:**
- Competitive daily/monthly wage based on experience.
- Accommodation / transportation provided where applicable.

*(Apply via AgriConnect Platform)*`;
  }

  static getProfileSummaryFallback(prompt = '') {
    return `### Professional Agricultural Worker Summary (Resilient Mode)

**Professional Bio:**
Dedicated and skilled agricultural worker with hands-on experience in seasonal crop cultivation, machinery operation, and field management. Known for strong work ethic, punctuality, and expertise in optimizing crop harvest efficiency.

**Core Competencies:**
- Crop Harvesting & Field Preparation
- Machinery Operation & Basic Maintenance
- Irrigation & Soil Nutrient Care
- Team Collaboration & Safety Compliance`;
  }

  static getTranslationFallback(prompt = '') {
    return `[AgriConnect Translation Notice: External AI translation service is currently operating in offline mode. Please retry your translation request shortly.]`;
  }

  static getGovtSchemesFallback(prompt = '') {
    return `### Key Indian Agricultural Schemes Overview (Offline Mode)

1. **PM-KISAN (Pradhan Mantri Kisan Samman Nidhi):**
   - Direct income support of ₹6,000 per year in 3 equal installments to eligible landholding farmer families.
2. **PMFBY (Pradhan Mantri Fasal Bima Yojana):**
   - Affordable crop insurance against natural risks, pests, and disease failures.
3. **Kisan Credit Card (KCC):**
   - Concessional institutional credit for agricultural inputs and emergency farming needs.
4. **Sub-Mission on Agricultural Mechanization (SMAM):**
   - Subsidies (40%-80%) for buying tractors, harvesters, and setting up Custom Hiring Centers.`;
  }

  static getGeneralAssistantFallback(prompt = '') {
    return `Hello! I am AgriConnect AI Assistant operating in offline backup mode.

I can assist you with farm job postings, worker profile summaries, crop management advice, and agricultural government schemes.

If your query requires real-time AI processing, please verify your internet connection or try again in a few moments. How can I help you today?`;
  }
}
