import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import buildContext from "./buildContext";

const fakeUser = { _id: "FAKE_BUILD_CONTEXT_USER_ID" };
const mockAccount = { _id: "accountId", userId: fakeUser._id };
const accountByUserId = jest.fn().mockName("accountByUserId").mockReturnValue(Promise.resolve(mockAccount));

const auth = {
  accountByUserId,
  getHasPermissionFunctionForUserLegacy: () => () => {},
  getShopsUserHasPermissionForFunctionForUserLegacy: () => () => {}
};

test("properly mutates the context object without user", async () => {
  process.env.ROOT_URL = "http://localhost:3000";
  const context = {
    auth,
    checkPermissionsLegacy: mockContext.checkPermissionsLegacy,
    collections: mockContext.collections,
    queries: {
      primaryShopId: () => "PRIMARY_SHOP_ID"
    }
  };

  await buildContext(context, { user: undefined });
  expect(context).toEqual({
    account: null,
    accountId: null,
    auth,
    checkPermissionsLegacy: jasmine.any(Function),
    collections: mockContext.collections,
    isInternalCall: false,
    queries: {
      primaryShopId: jasmine.any(Function)
    },
    requestHeaders: {},
    shopsUserHasPermissionForLegacy: jasmine.any(Function),
    user: null,
    userHasPermissionLegacy: jasmine.any(Function),
    userId: null
  });
});

test("properly mutates the context object with user", async () => {
  process.env.ROOT_URL = "https://localhost:3000";
  mockContext.collections.Accounts.findOne.mockReturnValueOnce(Promise.resolve(mockAccount));

  const context = {
    auth,
    checkPermissionsLegacy: mockContext.checkPermissionsLegacy,
    collections: mockContext.collections,
    queries: {
      primaryShopId: () => "PRIMARY_SHOP_ID"
    }
  };
  await buildContext(context, { user: fakeUser });
  expect(context).toEqual({
    account: mockAccount,
    accountId: mockAccount._id,
    auth,
    checkPermissionsLegacy: jasmine.any(Function),
    collections: mockContext.collections,
    isInternalCall: false,
    queries: {
      primaryShopId: jasmine.any(Function)
    },
    requestHeaders: {},
    shopsUserHasPermissionForLegacy: jasmine.any(Function),
    user: fakeUser,
    userHasPermissionLegacy: jasmine.any(Function),
    userId: fakeUser._id
  });
});
