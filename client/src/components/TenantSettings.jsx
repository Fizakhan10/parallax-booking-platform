import React, { useState, useEffect } from 'react';

// Aap is component ko render karte waqt tenantId prop pass karengi (e.g., <TenantSettings tenantId="123" />)
const TenantSettings = ({ tenantId = 'default_tenant' }) => {
  const [settings, setSettings] = useState({ themeColor: '#000000', bookingLimit: 10 });
  const [status, setStatus] = useState({ state: 'idle', message: '' }); 
  const [dataSource, setDataSource] = useState('Checking...');

  // Component load hotay hi settings fetch karega
  useEffect(() => {
    fetchSettings();
  }, [tenantId]);

  const fetchSettings = async () => {
    setStatus({ state: 'loading', message: 'Loading settings...' });
    try {
      // Backend API call
      const response = await fetch(`/api/settings/${tenantId}`);
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data || { themeColor: '#000000', bookingLimit: 10 });
        
        // 🟢 Visual indicator for graceful degradation (Redis vs DB)
        setDataSource(data.source === 'cache' ? '⚡ Active (Redis Cache)' : '🗄️ Fallback (MongoDB)');
        setStatus({ state: 'idle', message: '' });
      } else {
        throw new Error(data.message || 'Failed to fetch');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setDataSource('⚠️ Offline / Error');
      setStatus({ state: 'error', message: 'Could not load settings.' });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setStatus({ state: 'saving', message: 'Saving settings...' });
    
    try {
      const response = await fetch(`/api/settings/${tenantId}`, {
        method: 'PUT', // Ya POST, jo aapne backend routes mein define kiya ho
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await response.json();

      if (data.success) {
        setStatus({ state: 'success', message: 'Settings saved successfully!' });
        
        // 🟢 Update data source indicator (cache update honay ke baad)
        setDataSource(data.source.includes('cache') ? '⚡ Active (Redis Cache)' : '🗄️ Fallback (MongoDB)');
        
        // 3 seconds baad success message gayab kar dein
        setTimeout(() => setStatus({ state: 'idle', message: '' }), 3000);
      } else {
         throw new Error('Save failed');
      }
    } catch (error) {
      setStatus({ state: 'error', message: 'Failed to save settings.' });
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Tenant Admin Settings</h2>
      
      {/* Visual Indicator Banner */}
      <div style={{ padding: '10px', marginBottom: '20px', borderRadius: '5px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db' }}>
        <p style={{ margin: 0 }}>
          <strong>System Status:</strong> {dataSource}
        </p>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Theme Color Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Theme Color:</label>
          <input 
            type="color" 
            value={settings.themeColor} 
            onChange={e => setSettings({...settings, themeColor: e.target.value})} 
            style={{ width: '100px', height: '40px', padding: '0', cursor: 'pointer' }}
          />
        </div>
        
        {/* Booking Limit Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Max Bookings per Day:</label>
          <input 
            type="number" 
            value={settings.bookingLimit} 
            onChange={e => setSettings({...settings, bookingLimit: Number(e.target.value)})} 
            style={{ padding: '8px', width: '100%', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
            min="1"
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={status.state === 'saving' || status.state === 'loading'}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#2563eb', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: status.state === 'saving' ? 'not-allowed' : 'pointer',
            opacity: status.state === 'saving' ? 0.7 : 1
          }}
        >
          {status.state === 'saving' ? 'Processing...' : 'Save Settings'}
        </button>
      </form>

      {/* Save Status/Error Badges */}
      {status.state !== 'idle' && status.state !== 'loading' && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          borderRadius: '5px',
          backgroundColor: status.state === 'success' ? '#d1fae5' : (status.state === 'error' ? '#fee2e2' : '#fef3c7'),
          color: status.state === 'success' ? '#065f46' : (status.state === 'error' ? '#991b1b' : '#92400e'),
          fontWeight: '500'
        }}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default TenantSettings;