import express from 'express';
import mongoose from 'mongoose';

// We need to import from the main bot's models since they share the same database
const LinkWhitelist = mongoose.model('LinkWhitelist');
const User = mongoose.model('User');

const router = express.Router();

/**
 * GET /api/links/whitelist
 * Get all whitelisted link patterns
 */
router.get('/whitelist', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', active } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};
    if (search) {
      query.pattern = { $regex: search, $options: 'i' };
    }
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const [entries, total] = await Promise.all([
      LinkWhitelist.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LinkWhitelist.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching whitelist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch whitelist',
      error: error.message,
    });
  }
});

/**
 * POST /api/links/whitelist
 * Add a new whitelisted link pattern
 */
router.post('/whitelist', async (req, res) => {
  try {
    const { pattern, type = 'domain', notes = '', active = true } = req.body;

    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: 'Pattern is required',
      });
    }

    // Check if already exists
    const existing = await LinkWhitelist.findOne({ pattern: pattern.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Pattern already whitelisted',
      });
    }

    const whitelist = new LinkWhitelist({
      pattern: pattern.toLowerCase().trim(),
      type,
      notes,
      addedBy: req.user?.userId || 'dashboard',
      active,
    });

    await whitelist.save();

    res.status(201).json({
      success: true,
      message: 'Pattern whitelisted successfully',
      data: whitelist,
    });
  } catch (error) {
    console.error('Error adding to whitelist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to whitelist',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/links/whitelist/:id
 * Update a whitelisted link pattern
 */
router.patch('/whitelist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pattern, type, notes, active } = req.body;

    const whitelist = await LinkWhitelist.findById(id);

    if (!whitelist) {
      return res.status(404).json({
        success: false,
        message: 'Whitelist entry not found',
      });
    }

    // Update fields if provided
    if (pattern !== undefined) whitelist.pattern = pattern.toLowerCase().trim();
    if (type !== undefined) whitelist.type = type;
    if (notes !== undefined) whitelist.notes = notes;
    if (active !== undefined) whitelist.active = active;

    await whitelist.save();

    res.json({
      success: true,
      message: 'Whitelist entry updated successfully',
      data: whitelist,
    });
  } catch (error) {
    console.error('Error updating whitelist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update whitelist entry',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/links/whitelist/:id
 * Delete a whitelisted link pattern
 */
router.delete('/whitelist/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const whitelist = await LinkWhitelist.findById(id);

    if (!whitelist) {
      return res.status(404).json({
        success: false,
        message: 'Whitelist entry not found',
      });
    }

    await LinkWhitelist.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Whitelist entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting whitelist entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete whitelist entry',
      error: error.message,
    });
  }
});

/**
 * GET /api/links/permissions
 * Get users with link posting permission
 */
router.get('/permissions', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { canPostLinks: true };
    if (search) {
      query.alias = { $regex: search, $options: 'i' };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('_id alias icon role inLobby canPostLinks')
        .sort({ alias: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching link permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch link permissions',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/links/permissions/:userId
 * Update user link posting permission
 */
router.patch('/permissions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { canPostLinks } = req.body;

    if (canPostLinks === undefined) {
      return res.status(400).json({
        success: false,
        message: 'canPostLinks field is required',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.canPostLinks = canPostLinks;
    await user.save();

    res.json({
      success: true,
      message: `Link permission ${canPostLinks ? 'granted' : 'revoked'} successfully`,
      data: {
        userId: user._id,
        alias: user.alias,
        canPostLinks: user.canPostLinks,
      },
    });
  } catch (error) {
    console.error('Error updating link permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update link permission',
      error: error.message,
    });
  }
});

/**
 * GET /api/links/stats
 * Get link management statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalWhitelisted,
      activeWhitelisted,
      domainCount,
      urlCount,
      usersWithPermission,
    ] = await Promise.all([
      LinkWhitelist.countDocuments(),
      LinkWhitelist.countDocuments({ active: true }),
      LinkWhitelist.countDocuments({ type: 'domain', active: true }),
      LinkWhitelist.countDocuments({ type: 'full_url', active: true }),
      User.countDocuments({ canPostLinks: true }),
    ]);

    res.json({
      success: true,
      data: {
        whitelist: {
          total: totalWhitelisted,
          active: activeWhitelisted,
          domains: domainCount,
          urls: urlCount,
        },
        permissions: {
          usersWithPermission,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching link stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch link statistics',
      error: error.message,
    });
  }
});

export default router;
