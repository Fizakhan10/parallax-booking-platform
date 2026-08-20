// Ensure this path matches your actual Settings model file
const Settings = require('../models/Settings'); 
const { client, isRedisConnected } = require('../utils/redisClient');

/**
 * @desc    Get Tenant Settings
 * @route   GET /api/settings/:tenantId
 */
exports.getTenantSettings = async (req, res) => {
  // Aap req.params ya req.user jahan se bhi tenantId le rahi hain uske mutabiq adjust kar lein
  const tenantId = req.params.tenantId; 
  const cacheKey = `tenant:${tenantId}:settings`;

  try {
    // 1. Try Cache First (agar Redis connected hai)
    if (isRedisConnected) {
      const cachedSettings = await client.get(cacheKey);
      if (cachedSettings) {
        return res.status(200).json({ 
          success: true,
          source: 'cache', 
          data: JSON.parse(cachedSettings) 
        });
      }
    }

    // 2. Fallback to Database (Agar cache miss ho ya Redis down ho)
    const settings = await Settings.findOne({ tenantId });
    
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    // 3. Rehydrate Cache (Agle requests ke liye data Redis mein save karein - 1 hour TTL)
    if (isRedisConnected) {
      await client.setEx(cacheKey, 3600, JSON.stringify(settings)); 
    }

    return res.status(200).json({ 
      success: true,
      source: 'database', 
      data: settings 
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

/**
 * @desc    Update Tenant Settings
 * @route   PUT/POST /api/settings/:tenantId
 */
exports.updateTenantSettings = async (req, res) => {
  const tenantId = req.params.tenantId;
  const updateData = req.body;
  const cacheKey = `tenant:${tenantId}:settings`;

  try {
    // 1. Write to Database (Hamesha pehle DB update karein)
    const updatedSettings = await Settings.findOneAndUpdate(
      { tenantId }, 
      { $set: updateData }, 
      { new: true, upsert: true } // Upsert agar setting pehle se na ho tou bana dega
    );

    // 2. Cache Invalidation / Update
    // Naya data foran cache mein overwrite kar dein taake purana data na mile
    if (isRedisConnected) {
      await client.setEx(cacheKey, 3600, JSON.stringify(updatedSettings));
    }

    return res.status(200).json({ 
      success: true,
      source: 'database (cache updated)', 
      data: updatedSettings 
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ success: false, error: 'Update Failed' });
  }
};