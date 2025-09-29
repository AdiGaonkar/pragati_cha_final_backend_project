const Upload = require('../models/Upload');

exports.getMyUploads = async (req, res) => {
  try {
    const uploads = await Upload.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ uploads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
