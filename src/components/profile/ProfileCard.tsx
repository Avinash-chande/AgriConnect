import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Tractor, Briefcase, Star, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

import { Avatar } from './Avatar';
import { SkillBadge } from './SkillBadge';
import { CropBadge } from './CropBadge';

interface ProfileCardProps {
  id?: string;
  name: string;
  role: 'Farmer' | 'Worker' | 'admin' | string;
  avatarUrl?: string;
  titleOrFarmName: string;
  district: string;
  state: string;
  rating?: number;
  completedJobs?: number;
  dailyWageOrSize?: string | number;
  tags?: string[];
  isVerified?: boolean;
  slug?: string;
  className?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  id,
  name,
  role,
  avatarUrl,
  titleOrFarmName,
  district,
  state,
  rating = 4.9,
  completedJobs,
  dailyWageOrSize,
  tags = [],
  isVerified = true,
  slug,
  className = '',
}) => {
  const isFarmer = role.toLowerCase() === 'farmer';
  const profileLink = slug ? `/profile/user/${slug}` : id ? `/profile/user/${id}` : '#';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-white rounded-3xl border border-agri-border shadow-soft-sm hover:shadow-soft-md p-6 text-left space-y-5 transition-all duration-300 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <Avatar src={avatarUrl} name={name} size="md" isVerified={isVerified} />

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-agri-dark border border-emerald-300">
                {role}
              </span>
              {rating !== undefined && (
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{rating.toFixed(1)}</span>
                  {completedJobs !== undefined && <span className="text-slate-400 font-normal">({completedJobs} jobs)</span>}
                </span>
              )}
            </div>

            <h3 className="text-base font-bold font-heading text-slate-900 line-clamp-1">
              {name}
            </h3>

            <p className="text-xs text-slate-500 flex items-center space-x-1">
              {isFarmer ? <Tractor className="w-3.5 h-3.5 text-agri-primary shrink-0" /> : <Briefcase className="w-3.5 h-3.5 text-agri-primary shrink-0" />}
              <span className="line-clamp-1">{titleOrFarmName}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span className="flex items-center space-x-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>{district}, {state}</span>
        </span>

        {dailyWageOrSize && (
          <span className="font-bold text-agri-text">
            {isFarmer ? `${dailyWageOrSize} Acres` : `₹${dailyWageOrSize}/day`}
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.slice(0, 3).map((tag, idx) => (
            isFarmer ? <CropBadge key={idx} crop={tag} /> : <SkillBadge key={idx} skill={tag} />
          ))}
        </div>
      )}

      <div className="pt-2">
        <Link
          to={profileLink}
          className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-agri-primary hover:text-white text-slate-800 font-bold font-heading text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
        >
          <span>View Profile</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
};
