import { createRequire } from "module";
import { Engine } from "json-rules-engine";
import Logger from "@reactioncommerce/logger";

const require = createRequire(import.meta.url);

const pkg = require("../../../../package.json");

const { name, version } = pkg;
const logCtx = {
  name,
  version,
  file: "util/applyItemDiscountToCart.js"
};

/**
 * @summary Create a discount object for a cart item
 * @param {Object} item - The cart item
 * @param {Object} discount - The discount to create
 * @param {Number} discountedAmount - The amount discounted
 * @returns {Object} - The cart item discount object
 */
export function createItemDiscount(item, discount, discountedAmount) {
  const itemDiscount = {
    actionKey: discount.actionKey,
    promotionId: discount.promotionId,
    discountType: discount.discountType,
    discountCalculationType: discount.discountCalculationType,
    discountValue: discount.discountValue,
    dateApplied: new Date(),
    discountedAmount
  };
  return itemDiscount;
}

/**
 * @summary Add the discount to the cart item
 * @param {Object} context - The application context
 * @param {Object} discount - The discount to apply
 * @param {Object} params.item - The cart item to apply the discount to
 * @returns {Promise<void>} undefined
 */
export async function addDiscountToItem(context, discount, { item }) {
  const existingDiscount = item.discounts
    .find((itemDiscount) => discount.actionKey === itemDiscount.actionKey && discount.promotionId === itemDiscount.promotionId);
  if (existingDiscount) {
    Logger.warn(logCtx, "Not adding discount because it already exists");
    return;
  }
  const cartDiscount = createItemDiscount(item, discount);
  item.discounts.push(cartDiscount);
}

/**
 * @summary Apply the discount to the cart
 * @param {Object} context - The application context
 * @param {Object} discountParameters - The discount parameters
 * @param {Object} cart - The cart to apply the discount to
 * @returns {Promise<Object>} - The updated cart with results
 */
export default async function applyItemDiscountToCart(context, discountParameters, cart) {
  const allResults = [];
  const discountedItems = [];
  const { promotions: { operators } } = context;
  if (discountParameters.rules) {
    const engine = new Engine();
    engine.addRule({
      ...discountParameters.rules,
      event: {
        type: "rulesCheckPassed"
      }
    });
    Object.keys(operators).forEach((operatorKey) => {
      engine.addOperator(operatorKey, operators[operatorKey]);
    });

    for (const item of cart.items) {
      // eslint-disable-next-line no-unused-vars
      engine.on("success", (event, almanac, ruleResult) => {
        discountedItems.push(item);
        addDiscountToItem(context, discountParameters, { item });
      });
      const facts = { item };
      // eslint-disable-next-line no-await-in-loop
      const results = await engine.run(facts);
      allResults.push(results);
    }
  } else {
    for (const item of cart.items) {
      discountedItems.push(item);
      addDiscountToItem(context, discountParameters, { item });
    }
  }

  if (discountedItems.length) {
    Logger.info(logCtx, "Saved Discount to cart");
  }

  return { cart, allResults, discountedItems };
}
