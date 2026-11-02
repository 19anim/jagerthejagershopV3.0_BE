const test = require("node:test");
const assert = require("node:assert");
const { ShopSetting } = require("../../model/shopSetting.model");
const controller = require("./settings.controller");

const res = () => {
  const r = { statusCode: 0, body: null };
  r.status = (code) => ((r.statusCode = code), r);
  r.json = (body) => ((r.body = body), r);
  return r;
};

test("GET returns auto when nothing is stored", async () => {
  ShopSetting.findOne = () => ({ lean: async () => null });
  const r = res();
  await controller.getShop3dTheme({}, r);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body, { shop3dTheme: "auto" });
});

test("GET returns the stored theme", async () => {
  ShopSetting.findOne = () => ({ lean: async () => ({ shop3dTheme: "tet" }) });
  const r = res();
  await controller.getShop3dTheme({}, r);
  assert.deepEqual(r.body, { shop3dTheme: "tet" });
});

test("PUT rejects unknown themes without touching the DB", async () => {
  let touched = false;
  ShopSetting.findOneAndUpdate = () => {
    touched = true;
  };
  const r = res();
  await controller.setShop3dTheme({ body: { shop3dTheme: "easter" } }, r);
  assert.equal(r.statusCode, 400);
  assert.equal(touched, false);
});

test("PUT upserts a valid theme", async () => {
  let args;
  ShopSetting.findOneAndUpdate = (...a) => {
    args = a;
    return { lean: async () => ({ shop3dTheme: "christmas" }) };
  };
  const r = res();
  await controller.setShop3dTheme({ body: { shop3dTheme: "christmas" } }, r);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body, { shop3dTheme: "christmas" });
  assert.deepEqual(args[0], { key: "main" });
  assert.equal(args[2].upsert, true);
});
