import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CreateJobPage } from '../pages/CreateJobPage';
import { jobService } from '../services/jobService';

vi.mock('../services/jobService', () => ({
  jobService: {
    createJob: vi.fn(),
  },
}));

vi.mock('../components/jobs/JobLocationSelector', () => ({
  JobLocationSelector: () => <div data-testid="job-location-selector">JobLocationSelector Mock</div>,
}));

describe('CreateJobPage - Farm & Job Gallery Photos Real-Time Previews', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.URL.createObjectURL = vi.fn((file: File) => `blob:http://localhost/${file.name}`);
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders upload area and initial 0 photos state', () => {
    render(
      <MemoryRouter>
        <CreateJobPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Farm & Job Gallery Photos')).toBeInTheDocument();
    expect(screen.getByText('Click to select farm/job photos')).toBeInTheDocument();
    expect(screen.queryByText(/photos selected/i)).not.toBeInTheDocument();
  });

  it('displays real-time image previews when farmer selects valid files', async () => {
    const { container } = render(
      <MemoryRouter>
        <CreateJobPage />
      </MemoryRouter>
    );

    const file1 = new File(['fake content 1'], 'tractor.jpg', { type: 'image/jpeg' });
    const file2 = new File(['fake content 2'], 'wheat_field.png', { type: 'image/png' });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    await waitFor(() => {
      expect(screen.getByText('2 / 5 photos selected')).toBeInTheDocument();
      expect(screen.getByText('tractor.jpg')).toBeInTheDocument();
      expect(screen.getByText('wheat_field.png')).toBeInTheDocument();
    });

    const previewImgs = container.querySelectorAll('img[alt="tractor.jpg"], img[alt="wheat_field.png"]');
    expect(previewImgs.length).toBe(2);
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file1);
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file2);
  });

  it('allows removing an individual image preview and updates count', async () => {
    const { container } = render(
      <MemoryRouter>
        <CreateJobPage />
      </MemoryRouter>
    );

    const file1 = new File(['fake 1'], 'harvester.jpg', { type: 'image/jpeg' });
    const file2 = new File(['fake 2'], 'field.png', { type: 'image/png' });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    await waitFor(() => {
      expect(screen.getByText('2 / 5 photos selected')).toBeInTheDocument();
    });

    // Click remove button for harvester.jpg
    const removeBtn = screen.getByTitle('Remove harvester.jpg');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText('harvester.jpg')).not.toBeInTheDocument();
      expect(screen.getByText('field.png')).toBeInTheDocument();
      expect(screen.getByText('1 / 5 photos selected')).toBeInTheDocument();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  it('rejects invalid file formats and shows validation error', async () => {
    const { container } = render(
      <MemoryRouter>
        <CreateJobPage />
      </MemoryRouter>
    );

    const invalidFile = new File(['fake content'], 'contract.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/is not a valid format/i)).toBeInTheDocument();
      expect(screen.queryByText('contract.pdf')).not.toBeInTheDocument();
    });
  });

  it('enforces 5 photos maximum limit', async () => {
    const { container } = render(
      <MemoryRouter>
        <CreateJobPage />
      </MemoryRouter>
    );

    const files = Array.from({ length: 6 }, (_, i) =>
      new File([`image ${i}`], `photo_${i + 1}.jpg`, { type: 'image/jpeg' })
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/Maximum of 5 photos allowed/i)).toBeInTheDocument();
      expect(screen.getByText('5 / 5 photos selected')).toBeInTheDocument();
    });
  });
});
