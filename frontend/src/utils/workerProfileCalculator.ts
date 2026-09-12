export interface WorkerProfileInputData {
  fullName?: string;
  title?: string;
  bio?: string;
  profileImage?: string;
  skills?: string[];
  experience?: number | string;
  education?: string;
  languages?: string[];
  expectedDailyWage?: number | string;
  expectedMonthlySalary?: number | string;
  availability?: string;
  preferredWorkType?: string;
  preferredDistrict?: string;
  preferredState?: string;
  preferredVillage?: string;
  certificateImages?: string[];
  profileGallery?: string[];
  aadhaarVerified?: boolean;
  aadhaarNumber?: string;
}

export interface WorkerProfileSectionStatus {
  id: number;
  name: string;
  isComplete: boolean;
  hint?: string;
}

export interface WorkerProfileCompletionResult {
  completedSections: number;
  totalSections: number;
  percentage: number;
  sections: WorkerProfileSectionStatus[];
}

/**
 * Calculates the Worker Profile completion dynamically across exactly 8 numbered sections.
 * Completion formula: Math.round((completedSections / 8) * 100)
 *
 * Progression:
 * 0/8 = 0%
 * 1/8 = 13%
 * 2/8 = 25%
 * 3/8 = 38%
 * 4/8 = 50%
 * 5/8 = 63%
 * 6/8 = 75%
 * 7/8 = 88%
 * 8/8 = 100%
 */
export const calculateWorkerProfileCompletion = (
  data: WorkerProfileInputData
): WorkerProfileCompletionResult => {
  // Section 1: Professional Title & Biography (Full Name, Title, Bio)
  const isSection1Complete = Boolean(
    data.fullName &&
    data.fullName.trim().length >= 2 &&
    data.title &&
    data.title.trim().length >= 2 &&
    data.bio &&
    data.bio.trim().length > 0
  );

  // Section 2: Agricultural Skills & Machine Mastery (at least 1 skill)
  const isSection2Complete = Boolean(
    Array.isArray(data.skills) && data.skills.length > 0
  );

  // Section 3: Education / Experience / Work Details (Valid experience >= 0 & education)
  const isSection3Complete = Boolean(
    data.experience !== undefined &&
    data.experience !== null &&
    data.experience !== '' &&
    !isNaN(Number(data.experience)) &&
    Number(data.experience) >= 0 &&
    data.education &&
    data.education.trim().length > 0
  );

  // Section 4: Compensation / Availability / Work Preferences (Daily Wage >= 50, availability, work type)
  const isSection4Complete = Boolean(
    data.expectedDailyWage !== undefined &&
    data.expectedDailyWage !== null &&
    data.expectedDailyWage !== '' &&
    !isNaN(Number(data.expectedDailyWage)) &&
    Number(data.expectedDailyWage) >= 50 &&
    data.availability &&
    data.availability.trim().length > 0 &&
    data.preferredWorkType &&
    data.preferredWorkType.trim().length > 0
  );

  // Section 5: Preferred Working Locations (District & State required)
  const isSection5Complete = Boolean(
    data.preferredDistrict &&
    data.preferredDistrict.trim().length > 0 &&
    data.preferredState &&
    data.preferredState.trim().length > 0
  );

  // Section 6: Licenses & Skill Certificates (at least 1 certificate uploaded)
  const isSection6Complete = Boolean(
    Array.isArray(data.certificateImages) && data.certificateImages.length > 0
  );

  // Section 7: Field Work Photo Gallery (at least 1 field photo uploaded)
  const isSection7Complete = Boolean(
    Array.isArray(data.profileGallery) && data.profileGallery.length > 0
  );

  // Section 8: Government Aadhaar Verification (aadhaarVerified === true)
  const isSection8Complete = Boolean(data.aadhaarVerified === true);

  const sections: WorkerProfileSectionStatus[] = [
    {
      id: 1,
      name: '1. Professional Title & Biography',
      isComplete: isSection1Complete,
      hint: 'Provide full name, specialty title, and biography',
    },
    {
      id: 2,
      name: '2. Agricultural Skills & Machine Mastery',
      isComplete: isSection2Complete,
      hint: 'Select at least 1 agricultural skill or machine specialty',
    },
    {
      id: 3,
      name: '3. Education / Experience / Work Details',
      isComplete: isSection3Complete,
      hint: 'Specify years of experience and education level',
    },
    {
      id: 4,
      name: '4. Compensation / Availability / Work Preferences',
      isComplete: isSection4Complete,
      hint: 'Set daily wage rate, availability, and employment basis',
    },
    {
      id: 5,
      name: '5. Preferred Working Locations',
      isComplete: isSection5Complete,
      hint: 'Set preferred district and state',
    },
    {
      id: 6,
      name: '6. Licenses & Skill Certificates',
      isComplete: isSection6Complete,
      hint: 'Upload at least one driving license or skill certificate',
    },
    {
      id: 7,
      name: '7. Field Work Photo Gallery',
      isComplete: isSection7Complete,
      hint: 'Upload at least one photo of your agricultural field work',
    },
    {
      id: 8,
      name: '8. Government Aadhaar Verification',
      isComplete: isSection8Complete,
      hint: 'Verify your 12-digit Aadhaar identity',
    },
  ];

  const completedSections = sections.filter((s) => s.isComplete).length;
  const totalSections = 8;
  const percentage = Math.round((completedSections / totalSections) * 100);

  return {
    completedSections,
    totalSections,
    percentage,
    sections,
  };
};
