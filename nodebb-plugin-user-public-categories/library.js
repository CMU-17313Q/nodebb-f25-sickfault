'use strict';

let router, middleware;
const Categories = require.main.require('./src/categories');
const Privileges  = require.main.require('./src/privileges');
const User = require.main.require('./src/user');

// Put 0 to place at root, or a parent category cid if you created one like "Student Hubs"
const PARENT_CID = 0;
const MAX_PER_USER = 3;

async function getCount(uid) {
  const settings = (await User.getSettings(uid)) || {};
  return Number(settings.userPublicCatCount || 0);
}
async function bumpCount(uid) {
  const settings = (await User.getSettings(uid)) || {};
  const next = Number(settings.userPublicCatCount || 0) + 1;
  await User.updateSettings(uid, { ...settings, userPublicCatCount: next });
}

exports.init = async function init(params) {
  router = params.router;
  middleware = params.middleware;
  
  router.post('/api/category/create',
    middleware.ensureLoggedIn,
    middleware.applyCSRF,
    async (req, res, next) => {
      try {
        const uid = req.user.uid;
        const { name, description = '' } = req.body || {};
        if (!name || name.trim().length < 3) {
          return res.status(400).json({ error: 'Name must be at least 3 characters.' });
        }
        const count = await getCount(uid);
        if (count >= MAX_PER_USER) {
          return res.status(403).json({ error: 'Category creation limit reached.' });
        }
        const cid = await Categories.create({
          name: name.trim(),
          description: description.trim(),
          parentCid: PARENT_CID,
          icon: 'fa-comments',
        });

        if (typeof Categories.setCategoryField === 'function') {
          await Categories.setCategoryField(cid, 'ownerUid', uid);
        }

        try {
          await Privileges.categories.give(['moderate'], cid, `uid:${uid}`);
        } catch (e) {
        }
        

        await bumpCount(uid);
        res.json({ ok: true, cid });
      } catch (err) {
        next(err);
      }
    });
};