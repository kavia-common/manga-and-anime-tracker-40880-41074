import data from './mock_catalog.json';

// PUBLIC_INTERFACE
export const CatalogAPI = {
  /**
   * Returns the list of catalog items. Placeholder implementation uses local JSON.
   * Shape: { id, title, type, year, cover, genres[], synopsis }
   */
  async list() {
    return data;
  },
  // PUBLIC_INTERFACE
  async getById(id) {
    /** Returns an item by id from mock dataset. */
    const it = data.find(x => String(x.id) === String(id));
    return it || null;
  }
};
