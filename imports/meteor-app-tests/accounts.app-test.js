/* eslint-disable require-jsdoc */
/* eslint dot-notation: 0 */
/* eslint prefer-arrow-callback:0 */
import Logger from "@reactioncommerce/logger";
import Random from "@reactioncommerce/random";
import { Meteor } from "meteor/meteor";
import { Factory } from "meteor/dburles:factory";
import { check, Match } from "meteor/check";
import { Accounts as MeteorAccounts } from "meteor/accounts-base";
import { expect } from "meteor/practicalmeteor:chai";
import { sinon } from "meteor/practicalmeteor:sinon";
import ReactionError from "@reactioncommerce/reaction-error";
import { Accounts, Groups, Packages, Orders, Products, Shops, Cart } from "/lib/collections";
import Reaction from "/imports/plugins/core/core/server/Reaction";
import { getShop } from "/imports/plugins/core/core/server/fixtures/shops";
import Fixtures from "/imports/plugins/core/core/server/fixtures";

describe("Account Meteor method ", function () {
  let shopId;
  let fakeUser;
  let fakeAccount;
  const originals = {};
  let sandbox;

  before(function (done) {
    this.timeout(20000);
    Reaction.onAppStartupComplete(() => {
      Fixtures();
      done();
    });
  });

  after(() => {
    Packages.remove({});
    Cart.remove({});
    Accounts.remove({});
    Orders.remove({});
    Products.remove({});
    Shops.remove({});
    if (sandbox) {
      sandbox.restore();
    }
  });

  beforeEach(function () {
    shopId = getShop()._id;
    sandbox = sinon.sandbox.create();

    fakeUser = Factory.create("user");
    const userId = fakeUser._id;
    // set the _id... some code requires that Account#_id === Account#userId
    fakeAccount = Factory.create("account", { _id: userId, userId, shopId });
    sandbox.stub(Meteor, "user", () => fakeUser);
    sandbox.stub(Meteor.users, "findOne", () => fakeUser);
    sandbox.stub(Reaction, "getUserId", () => userId);
    sandbox.stub(Reaction, "getShopId", () => shopId);

    Object.keys(originals).forEach((method) => spyOnMethod(method, userId));
  });

  afterEach(function () {
    sandbox.restore();
  });

  function spyOnMethod(method, id) {
    return sandbox.stub(Meteor.server.method_handlers, `cart/${method}`, function (...args) {
      check(args, [Match.Any]); // to prevent audit_arguments from complaining
      this.userId = id; // having to do this makes me think that we should be using Meteor.userId() instead of this.userId in our Meteor methods
      return originals[method].apply(this, args);
    });
  }

  describe("accounts/inviteShopOwner", function () {
    let createUserSpy;
    let groupId;
    let group;

    function callDescribed(accountAttributes = {}, shopData) {
      const options = Object.assign({
        email: fakeUser.emails[0].address,
        name: fakeAccount.profile.addressBook[0].fullName
      }, accountAttributes);

      return Meteor.call("accounts/inviteShopOwner", options, shopData);
    }

    function stubPermissioning(settings) {
      const { hasPermission } = settings;

      sandbox
        .stub(Reaction, "hasPermission", () => hasPermission)
        .withArgs("admin", fakeAccount.userId, sinon.match.string);
    }

    beforeEach(function () {
      // fakeAccount = Factory.create("account");
      createUserSpy = sandbox.spy(MeteorAccounts, "createUser");

      // resolves issues with the onCreateUser event handler
      groupId = Random.id();
      group = Factory.create("group");
      sandbox
        .stub(Groups, "findOne", () => group)
        .withArgs({ _id: groupId, shopId: sinon.match.string });

      // since we expect a note to be written, let's ignore it to keep the output clean
      sandbox.stub(Logger, "info").withArgs(sinon.match(/Created shop/));
    });

    it("requires admin permission", function () {
      stubPermissioning({ hasPermission: false });

      expect(callDescribed).to.throw(ReactionError, /Access denied/);
      expect(createUserSpy).to.not.have.been.called;
    });

    it("creates a shop with the data provided", function () {
      const primaryShop = getShop();
      const name = Random.id();
      const shopData = { name };
      const email = `${Random.id()}@example.com`;

      stubPermissioning({ hasPermission: true });
      sandbox.stub(Reaction, "getPrimaryShop", () => primaryShop);

      sandbox.stub(Accounts, "findOne", () => fakeAccount)
        .withArgs({ id: fakeUser._id });

      callDescribed({ email }, shopData);

      const newShopCount = Shops.find({ name }).count();
      expect(newShopCount).to.equal(1);
    });
  });
});
