import type { WorkerProfile, JobCategory, Testimonial, StatisticsMetric } from '../types';

export const MOCK_WORKERS: WorkerProfile[] = [
  {
    id: 'w-1',
    name: 'Rajesh Kumar',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250',
    title: 'Senior Harvester & Heavy Equipment Specialist',
    rating: 4.9,
    reviewsCount: 142,
    location: 'Punjab, India',
    hourlyRate: '$18/hr',
    dailyRate: '$130/day',
    skills: ['Combine Operator', 'Wheat Harvesting', 'Tractor Repair', 'Soil Prep'],
    experienceYears: 8,
    languages: ['Punjabi', 'Hindi', 'English'],
    isVerified: true,
    availability: 'Immediate',
    completedJobs: 98,
    badge: 'Top Rated Harvester',
    bio: '8+ years of expertise in large-scale grain harvesting, John Deere & Kubota machinery operation, and land cultivation.'
  },
  {
    id: 'w-2',
    name: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    title: 'Certified Agri-Drone & Precision Irrigation Tech',
    rating: 4.95,
    reviewsCount: 89,
    location: 'Fresno, California',
    hourlyRate: '$28/hr',
    dailyRate: '$210/day',
    skills: ['Agri-Drone Pilot', 'Thermal Crop Surveying', 'Drip Irrigation', 'IoT Sensors'],
    experienceYears: 5,
    languages: ['English', 'Spanish'],
    isVerified: true,
    availability: 'Within 3 Days',
    completedJobs: 64,
    badge: 'AI Precision Specialist',
    bio: 'FAA Part 107 certified drone operator specializing in multi-spectral crop health mapping, pest assessment, and automated irrigation setup.'
  },
  {
    id: 'w-3',
    name: 'Suresh Patel',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    title: 'Organic Horticulture & Greenhouse Manager',
    rating: 4.88,
    reviewsCount: 115,
    location: 'Gujarat, India',
    hourlyRate: '$22/hr',
    dailyRate: '$160/day',
    skills: ['Hydroponics', 'Organic Pest Control', 'Polyhouse Mgt', 'Pruning & Grafting'],
    experienceYears: 10,
    languages: ['Gujarati', 'Hindi', 'English'],
    isVerified: true,
    availability: 'Immediate',
    completedJobs: 130,
    badge: 'Organic Expert',
    bio: 'Master of indoor greenhouse climate control, organic certification compliance, and high-density tomato & berry cultivation.'
  },
  {
    id: 'w-4',
    name: 'Maria Fernandez',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
    title: 'Dairy Herd Manager & Livestock Veterinary Assistant',
    rating: 4.92,
    reviewsCount: 76,
    location: 'Wisconsin, USA',
    hourlyRate: '$25/hr',
    dailyRate: '$180/day',
    skills: ['Automated Milking', 'Livestock Health', 'Nutrition Mix', 'Calf Care'],
    experienceYears: 7,
    languages: ['Spanish', 'English'],
    isVerified: true,
    availability: 'Immediate',
    completedJobs: 52,
    badge: 'Livestock Certified',
    bio: 'Specialist in commercial dairy cattle care, automated rotary parlor operation, and reproductive health monitoring.'
  },
  {
    id: 'w-5',
    name: 'Amitabh Sharma',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    title: 'Sugarcane & Cotton Harvesting Crew Leader',
    rating: 4.85,
    reviewsCount: 164,
    location: 'Maharashtra, India',
    hourlyRate: '$16/hr',
    dailyRate: '$115/day',
    skills: ['Sugarcane Cutting', 'Crew Lead (10+ Workers)', 'Logistics', 'Baling'],
    experienceYears: 12,
    languages: ['Marathi', 'Hindi'],
    isVerified: true,
    availability: 'Seasonal',
    completedJobs: 210,
    badge: 'Veteran Field Lead',
    bio: 'Lead contractor for seasonal sugarcane harvesting crews, ensuring fast turnaround times and minimal crop loss.'
  },
  {
    id: 'w-6',
    name: 'David Miller',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=250',
    title: 'Orchard Care & Grape Vineyard Pruning Expert',
    rating: 4.91,
    reviewsCount: 93,
    location: 'Napa Valley, California',
    hourlyRate: '$24/hr',
    dailyRate: '$175/day',
    skills: ['Vineyard Pruning', 'Fruit Picking', 'Pesticide Application', 'Trellising'],
    experienceYears: 6,
    languages: ['English', 'Spanish'],
    isVerified: true,
    availability: 'Immediate',
    completedJobs: 87,
    badge: 'Vineyard Specialist',
    bio: 'Passionate vineyard technician with hands-on experience in fine wine grape harvesting, winter pruning, and trellis maintenance.'
  }
];

export const MOCK_JOB_CATEGORIES: JobCategory[] = [
  {
    id: 'cat-1',
    title: 'Crop Harvesting',
    iconName: 'Wheat',
    description: 'Grain, paddy, cotton, fruit, and sugarcane seasonal harvesting specialists.',
    activeJobsCount: 1420,
    popularSkills: ['Combine Operator', 'Manual Harvesting', 'Quality Grading', 'Baling'],
    bgGradient: 'from-amber-500/10 to-emerald-500/10'
  },
  {
    id: 'cat-2',
    title: 'Heavy Machinery',
    iconName: 'Tractor',
    description: 'Tractor drivers, tillers, plowers, and harvesters for large acreage.',
    activeJobsCount: 980,
    popularSkills: ['Tractor Driving', 'GPS Ploughing', 'Seeding Tech', 'Machine Maintenance'],
    bgGradient: 'from-green-500/10 to-teal-500/10'
  },
  {
    id: 'cat-3',
    title: 'Drone & Tech Farm',
    iconName: 'Bot',
    description: 'Precision aerial spraying, crop scouting, thermal imaging, and smart sensors.',
    activeJobsCount: 460,
    popularSkills: ['Agri Drone Flying', 'NDVI Analysis', 'Smart Irrigation', 'IoT Setup'],
    bgGradient: 'from-blue-500/10 to-indigo-500/10'
  },
  {
    id: 'cat-4',
    title: 'Irrigation & Soil',
    iconName: 'Droplets',
    description: 'Drip systems, solar pump installation, canal management, and soil testing.',
    activeJobsCount: 750,
    popularSkills: ['Drip Installation', 'Solar Pumps', 'Soil Testing', 'Fertigation'],
    bgGradient: 'from-cyan-500/10 to-blue-500/10'
  },
  {
    id: 'cat-5',
    title: 'Livestock & Dairy',
    iconName: 'Milk',
    description: 'Dairy parlor operators, cattle feeders, poultry handlers, and vet assistants.',
    activeJobsCount: 890,
    popularSkills: ['Milking Tech', 'Cattle Feed Mix', 'Poultry Mgt', 'Health Inspection'],
    bgGradient: 'from-orange-500/10 to-amber-500/10'
  },
  {
    id: 'cat-6',
    title: 'Greenhouse & Polyhouse',
    iconName: 'Sprout',
    description: 'Controlled environment agriculture, hydroponics, and exotic crop care.',
    activeJobsCount: 630,
    popularSkills: ['Hydroponics', 'Polyhouse Climate', 'Berry Harvesting', 'Substrate Mgt'],
    bgGradient: 'from-emerald-500/10 to-green-500/10'
  }
];

export const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    name: 'Gurpreet Singh',
    role: 'Farmer',
    farmOrLocation: 'Singh Organic Wheat Farms, Ludhiana',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
    content: 'AgriConnect saved my harvest! I needed 12 experienced combine operators within 24 hours before heavy rain hit. The AgriMatch AI found verified workers 15km away instantly.',
    rating: 5,
    verifiedBadge: 'Verified 450-Acre Farm Owner'
  },
  {
    id: 't-2',
    name: 'Priya Sundaram',
    role: 'Worker',
    farmOrLocation: 'Precision Drone Operator, Coimbatore',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    content: 'As a certified agricultural drone pilot, finding steady farm clients used to be tough. On AgriConnect, my calendar is full and daily payouts go directly into my bank account.',
    rating: 5,
    verifiedBadge: 'Verified Agri-Tech Contractor'
  },
  {
    id: 't-3',
    name: 'Marcus Vance',
    role: 'Farmer',
    farmOrLocation: 'Vance Valley Orchards, Washington',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
    content: 'The background checks and verified ratings give me total peace of mind. AgriConnect is hands down the cleanest, most efficient farm labor platform on the market.',
    rating: 5,
    verifiedBadge: 'Verified Orchard Producer'
  }
];

export const MOCK_METRICS: StatisticsMetric[] = [
  {
    label: 'Verified Farm Workers',
    value: '45,800+',
    change: '+24% this month',
    isPositive: true,
    description: 'Skilled, background-checked agricultural labor active across regions.'
  },
  {
    label: 'Active Farm Owners',
    value: '18,400+',
    change: '+18% this month',
    isPositive: true,
    description: 'Commercial farms, orchards, polyhouses, and cooperatives.'
  },
  {
    label: 'Successful Job Matches',
    value: '124,500+',
    change: '99.2% fulfillment',
    isPositive: true,
    description: 'Jobs filled seamlessly from emergency harvesting to seasonal contracts.'
  },
  {
    label: 'Average Match Time',
    value: '< 1.8 Hours',
    change: '4x faster than traditional agencies',
    isPositive: true,
    description: 'AI powered distance & skill matching engine.'
  }
];

export const MOCK_FARMS_LOCATIONS = [
  'Nagpur, Maharashtra',
  'Pune, Maharashtra',
  'Maharashtra, India',
  'Punjab, India',
  'Haryana, India',
  'Gujarat, India',
  'Karnataka, India',
  'Fresno, California, USA',
  'Iowa, USA',
  'Queensland, Australia',
  'Ontario, Canada',
  'Napa Valley, California, USA'
];

export const MOCK_FARM_TYPES = [
  'Grain & Wheat Cultivation',
  'Fresh Fruit Orchards & Vineyards',
  'Commercial Dairy & Livestock',
  'Greenhouse & Polyhouse Agriculture',
  'Sugarcane & Industrial Crops',
  'Organic Vegetable Produce',
  'Precision & Drone Spraying Services'
];

export const MOCK_WORKER_SKILLS = [
  'Combine Harvester Operator',
  'Tractor Driver & Ploughing',
  'Agricultural Drone Operator',
  'Drip & Automated Irrigation',
  'Greenhouse Climate Control',
  'Organic Pest Management',
  'Dairy Milking Machinery',
  'Pruning & Grafting Tech',
  'Crop Grading & Packaging',
  'Soil Moisture Testing'
];
