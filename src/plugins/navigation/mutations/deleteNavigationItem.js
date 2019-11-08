import ReactionError from "@reactioncommerce/reaction-error";

/**
 * @method deleteNavigationItem
 * @summary Deletes a navigation item
 * @param {Object} context An object containing the per-request state
 * @param {Object} input An object of all mutation arguments that were sent by the client
 * @param {String} input._id ID of the navigation item to delete
 * @param {String} input.shopId ID of the shop navigation item belongs
 * @returns {Promise<Object>} Deleted navigation item
 */
export default async function deleteNavigationItem(context, input) {
  const { collections } = context;
  const { NavigationItems } = collections;
  const { _id, shopId } = input;

  await context.validatePermissionsLegacy(["core"], null, { shopId });
  await context.validatePermissions(`reaction:navigationTreeItems:${_id}`, "delete", { shopId });

  const navigationItem = await NavigationItems.findOne({ _id });
  if (!navigationItem) {
    throw new ReactionError("navigation-item-not-found", "Navigation item was not found");
  }

  await NavigationItems.deleteOne({ _id });

  return navigationItem;
}
