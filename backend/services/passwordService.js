import bcrypt from 'bcryptjs';

/**
 * Hash a raw password string using bcrypt
 */
export const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

/**
 * Compare a raw password string against a bcrypt hash
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};
