import Logger from "@reactioncommerce/logger";
import loadShops from "./loaders/loadShops.js";
import loadAccounts from "./loaders/loadAccounts.js";
import loadUsers from "./loaders/loadUsers.js";
import loadImages from "./loaders/loadImages.js";
import loadTags from "./loaders/loadTags.js";
import loadProducts from "./loaders/loadProducts.js";
import loadNavigation from "./loaders/loadNavigation.js";
import loadShipping from "./loaders/loadShipping.js";
import config from "./config.js";

/**
 * @summary run all data loader functions
 * @param {Object} context - the application context
 * @returns {Promise<Boolean>} true if success
 */
export default async function loadSampleData(context) {
  Logger.info("Beginning load Sample Data");
  const { collections: { Shops } } = context;
  const { LOAD_SAMPLE_DATA } = config;
  if (!LOAD_SAMPLE_DATA || LOAD_SAMPLE_DATA === "false") {
    Logger.warn("Not loading sample data based on .env config");
    return false;
  }
  const shopExists = await Shops.findOne();
  if (shopExists) {
    Logger.warn("Not loading sample data because data already exists");
    return false;
  }

  Logger.info("Load Users");
  let user = await loadUsers(context);
  Logger.info("Load Accounts");
  let account = await loadAccounts(context);
  Logger.info("Load Shop");
  let newShopId = await loadShops(context, account, user[0]);
  Logger.info("Load Tags");
  let tagsData = await loadTags(context, newShopId);
  Logger.info("Load Products");
  await loadProducts(context, newShopId, tagsData);
  Logger.info("Load Navigation");
  await loadNavigation(context, newShopId);
  Logger.info("Load Images");
  await loadImages(context, newShopId);
  Logger.info("Load Shipping");
  await loadShipping(context, newShopId);
  Logger.info("Loading Sample Data complete");
  return true;
}
