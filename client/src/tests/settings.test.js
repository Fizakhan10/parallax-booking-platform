import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TenantSettings from '../components/TenantSettings'; // Path zaroor check kar lein

// Global fetch API ko mock kar rahay hain
global.fetch = jest.fn();

describe('TenantSettings UI Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('renders "Active (Redis Cache)" when backend source is cache', async () => {
    // Mocking response to simulate a Redis cache hit
    fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        source: 'cache',
        data: { themeColor: '#ff0000', bookingLimit: 25 }
      })
    });

    render(<TenantSettings tenantId="test_tenant_1" />);

    // API call complete hone ka wait karein aur check karein indicator
    await waitFor(() => {
      expect(screen.getByText(/Active \(Redis Cache\)/i)).toBeInTheDocument();
    });
  });

  it('renders "Fallback (MongoDB)" when backend source is database', async () => {
    // Mocking response to simulate a DB fallback
    fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        source: 'database',
        data: { themeColor: '#000000', bookingLimit: 10 }
      })
    });

    render(<TenantSettings tenantId="test_tenant_2" />);

    // API call complete hone ka wait karein aur check karein indicator
    await waitFor(() => {
      expect(screen.getByText(/Fallback \(MongoDB\)/i)).toBeInTheDocument();
    });
  });

  it('shows error state if API fails', async () => {
    // Simulating API error
    fetch.mockRejectedValueOnce(new Error('API is down'));

    render(<TenantSettings tenantId="test_tenant_3" />);

    await waitFor(() => {
      expect(screen.getByText(/Offline \/ Error/i)).toBeInTheDocument();
    });
  });
});