const mongoose = require('mongoose');

exports.getCollections = async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const githubCollections = collections
      .map(col => col.name)
      .filter(name => name.startsWith('github_'));
    res.json(githubCollections);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving collections', error: err });
  }
};

exports.getCollectionData = async (req, res) => {
  try {
    const { collection } = req.params;
    const {
      page = 1,
      limit = 50,
      sortBy = '_id',
      sortOrder = 'desc',
      filter = '{}'
    } = req.query;

    const skip = (page - 1) * limit;
    const query = JSON.parse(filter);
    const dbCol = mongoose.connection.db.collection(collection);

    const total = await dbCol.countDocuments(query);
    const data = await dbCol.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    res.json({ total, data });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching collection data', error: err });
  }
};

exports.searchAcrossCollections = async (req, res) => {
  try {
    const { keyword } = req.params;
    const collections = await mongoose.connection.db.listCollections().toArray();
    const githubCollections = collections.filter(c => c.name.startsWith('github_'));

    const result = {};

    for (const { name } of githubCollections) {
      const col = mongoose.connection.db.collection(name);
      const match = await col.find({
        $text: { $search: keyword }
      }).limit(10).toArray();
      result[name] = match;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Global search failed', error: err });
  }
};
