import { AadhaarVerificationService } from './AadhaarVerificationService.js';

export const getKycRequests = (params) => AadhaarVerificationService.getKycRequests(params);
export const reviewKycRequest = (id, data, admin) => AadhaarVerificationService.reviewKycRequest(id, data, admin);
export const processAadhaarKyc = (user, zip, shareCode) => AadhaarVerificationService.processAadhaarKyc(user, zip, shareCode);

export default AadhaarVerificationService;
