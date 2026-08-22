import { jest } from '@jest/globals';

const mockUploadFarmImages = jest.fn();
const mockUploadCertificates = jest.fn();
const mockUploadProfilePhoto = jest.fn();

jest.unstable_mockModule('../services/cloudinaryService.js', () => ({
  uploadFarmImagesService: mockUploadFarmImages,
  uploadCertificateImagesService: mockUploadCertificates,
  uploadProfilePhotoService: mockUploadProfilePhoto,
  deleteCloudinaryImage: jest.fn().mockResolvedValue(true),
  deleteImageService: jest.fn().mockResolvedValue(true),
  extractPublicId: jest.fn(),
  uploadImageBuffer: jest.fn(),
}));

const {
  uploadFarmImagesProfileService,
  uploadCertificatesProfileService,
  uploadProfileImageService,
} = await import('../services/profileService.js');
const { FarmerProfile } = await import('../models/FarmerProfile.js');
const { WorkerProfile } = await import('../models/WorkerProfile.js');

describe('Image Upload Services (Multer file.buffer to Cloudinary)', () => {
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    role: 'farmer',
    save: jest.fn().mockResolvedValue(true),
  };

  const mockWorkerUser = {
    _id: '507f1f77bcf86cd799439012',
    role: 'worker',
    save: jest.fn().mockResolvedValue(true),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('uploadFarmImagesProfileService', () => {
    it('should throw 400 if files array is empty or not provided', async () => {
      await expect(uploadFarmImagesProfileService(mockUser, [])).rejects.toThrow(
        'Please upload at least one farm image.'
      );
      await expect(uploadFarmImagesProfileService(mockUser, null)).rejects.toThrow(
        'Please upload at least one farm image.'
      );
    });

    it('should throw 400 if any file in files array lacks a valid Buffer', async () => {
      const invalidFiles = [
        { originalname: 'farm1.jpg', buffer: null },
      ];
      await expect(uploadFarmImagesProfileService(mockUser, invalidFiles)).rejects.toThrow(
        'Invalid uploaded image data.'
      );

      const invalidObjFiles = [
        { originalname: 'farm1.jpg', buffer: 'not-a-buffer' },
      ];
      await expect(uploadFarmImagesProfileService(mockUser, invalidObjFiles)).rejects.toThrow(
        'Invalid uploaded image data.'
      );
    });

    it('should extract file.buffer and upload multiple images to Cloudinary and update FarmerProfile', async () => {
      const validFiles = [
        { originalname: 'farm1.jpg', buffer: Buffer.from('fake-image-1') },
        { originalname: 'farm2.jpg', buffer: Buffer.from('fake-image-2') },
      ];

      const mockCloudinaryResults = [
        { secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/farm1.webp' },
        { secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/farm2.webp' },
      ];

      mockUploadFarmImages.mockResolvedValue(mockCloudinaryResults);
      jest.spyOn(FarmerProfile, 'findOneAndUpdate').mockResolvedValue({
        farmImages: [
          'https://res.cloudinary.com/demo/image/upload/v1/farm1.webp',
          'https://res.cloudinary.com/demo/image/upload/v1/farm2.webp',
        ],
      });

      const result = await uploadFarmImagesProfileService(mockUser, validFiles);

      expect(mockUploadFarmImages).toHaveBeenCalledTimes(1);
      const passedBuffers = mockUploadFarmImages.mock.calls[0][0];
      expect(Array.isArray(passedBuffers)).toBe(true);
      expect(passedBuffers.length).toBe(2);
      expect(Buffer.isBuffer(passedBuffers[0])).toBe(true);
      expect(Buffer.isBuffer(passedBuffers[1])).toBe(true);

      expect(FarmerProfile.findOneAndUpdate).toHaveBeenCalledWith(
        { owner: mockUser._id },
        {
          $push: {
            farmImages: {
              $each: [
                'https://res.cloudinary.com/demo/image/upload/v1/farm1.webp',
                'https://res.cloudinary.com/demo/image/upload/v1/farm2.webp',
              ],
            },
          },
        },
        { new: true }
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('uploadCertificatesProfileService', () => {
    it('should throw 400 for invalid target field', async () => {
      const validFiles = [{ originalname: 'cert.jpg', buffer: Buffer.from('fake') }];
      await expect(
        uploadCertificatesProfileService(mockWorkerUser, validFiles, 'invalidField')
      ).rejects.toThrow('Invalid image target field.');
    });

    it('should extract buffer and upload certificate images to WorkerProfile', async () => {
      const validFiles = [{ originalname: 'cert.jpg', buffer: Buffer.from('fake-cert') }];
      const mockCloudinaryResults = [
        { secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/cert.webp' },
      ];

      mockUploadCertificates.mockResolvedValue(mockCloudinaryResults);
      jest.spyOn(WorkerProfile, 'findOneAndUpdate').mockResolvedValue({
        certificateImages: ['https://res.cloudinary.com/demo/image/upload/v1/cert.webp'],
      });

      const result = await uploadCertificatesProfileService(
        mockWorkerUser,
        validFiles,
        'certificateImages'
      );

      expect(mockUploadCertificates).toHaveBeenCalledTimes(1);
      const passedBuffers = mockUploadCertificates.mock.calls[0][0];
      expect(Buffer.isBuffer(passedBuffers[0])).toBe(true);
      expect(result).toEqual(['https://res.cloudinary.com/demo/image/upload/v1/cert.webp']);
    });
  });

  describe('uploadProfileImageService', () => {
    it('should accept Buffer and update user.profileImage', async () => {
      const buf = Buffer.from('avatar');
      mockUploadProfilePhoto.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.webp',
      });

      const result = await uploadProfileImageService(mockUser, buf);

      expect(mockUser.profileImage).toBe('https://res.cloudinary.com/demo/image/upload/v1/avatar.webp');
      expect(result).toBe('https://res.cloudinary.com/demo/image/upload/v1/avatar.webp');
    });

    it('should accept Multer file object with .buffer and update user.profileImage', async () => {
      const fileObj = { originalname: 'avatar.png', buffer: Buffer.from('avatar') };
      mockUploadProfilePhoto.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.webp',
      });

      const result = await uploadProfileImageService(mockUser, fileObj);

      expect(result).toBe('https://res.cloudinary.com/demo/image/upload/v1/avatar.webp');
    });

    it('should throw 400 if invalid data provided', async () => {
      await expect(uploadProfileImageService(mockUser, null)).rejects.toThrow(
        'Invalid image data provided.'
      );
    });
  });
});
