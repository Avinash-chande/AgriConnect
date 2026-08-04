import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoogleMapPicker } from '../components/profile/GoogleMapPicker';

describe('GoogleMapPicker Component Tests', () => {
  it('should render map iframe with district and state labels', () => {
    render(<GoogleMapPicker district="Ludhiana" state="Punjab" latitude={30.9} longitude={75.8} />);
    expect(screen.getByText('Ludhiana, Punjab')).toBeInTheDocument();
    expect(screen.getByText('Use Current GPS Coordinates')).toBeInTheDocument();
  });
});
