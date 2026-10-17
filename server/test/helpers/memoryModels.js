/*
  In-memory stand-ins for Mongoose models used by the tests (no MongoDB
  needed). Only the calls the code under test makes are supported.
*/
const get = (doc, key) => key.split('.').reduce((value, part) => (value == null ? value : value[part]), doc);

function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') return condition.some((part) => matches(doc, part));
    const value = get(doc, key);
    if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
      if ('$in' in condition) return condition.$in.includes(value);
      if ('$ne' in condition) return String(value) !== String(condition.$ne);
      if ('$lt' in condition) return value != null && value < condition.$lt;
      if ('$lte' in condition) return value != null && value <= condition.$lte;
    }
    if (condition === null) return value == null;
    return value === condition;
  });
}

function query(list) {
  const result = {
    sort(spec) {
      const [[key, dir]] = Object.entries(spec);
      list = [...list].sort((a, b) => (get(a, key) > get(b, key) ? dir : -dir));
      return result;
    },
    limit(n) { list = list.slice(0, n); return result; },
    select() { return result; },
    lean() { return Promise.resolve(list.map((doc) => doc.toObject())); },
    then(resolve, reject) { return Promise.resolve(list).then(resolve, reject); },
  };
  return result;
}

export function memoryModel(Model) {
  const store = [];

  Model.prototype.save = async function save() {
    await this.validate();
    if (!store.includes(this)) store.push(this);
    return this;
  };

  Model.create = async (data) => new Model(data).save();
  Model.find = (filter) => query(store.filter((doc) => matches(doc, filter)));
  // Single-document queries: awaitable, with the chain methods the code uses
  const one = (doc) => {
    const result = {
      select() { return result; },
      populate() { return result; },
      lean: async () => doc?.toObject() ?? null,
      then(resolve, reject) { return Promise.resolve(doc).then(resolve, reject); },
    };
    return result;
  };
  Model.findOne = (filter) => one(store.find((item) => matches(item, filter)) || null);
  Model.findById = (id) => one(store.find((item) => String(item._id) === String(id)) || null);
  Model.countDocuments = async (filter) => store.filter((doc) => matches(doc, filter)).length;
  Model.exists = async (filter) => (store.some((doc) => matches(doc, filter)) ? { _id: true } : null);
  Model.updateMany = async (filter, update) => {
    const docs = store.filter((doc) => matches(doc, filter));
    docs.forEach((doc) => doc.set(update.$set || update));
    return { matchedCount: docs.length, modifiedCount: docs.length };
  };
  Model.updateOne = async (filter, update) => {
    const doc = store.find((item) => matches(item, filter));
    if (doc) { doc.set(update.$set || update); return { matchedCount: 1 }; }
    return { matchedCount: 0 };
  };
  Model.findOneAndUpdate = async (filter, update) => {
    const doc = store.find((item) => matches(item, filter));
    if (!doc) return null;
    doc.set(update.$set || update);
    return doc;
  };

  return { store, reset: () => store.splice(0, store.length) };
}
