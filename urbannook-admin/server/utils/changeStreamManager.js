// Manages MongoDB ChangeStreams with clean teardown + restart support.
// Exported so envSwitch can stop streams before disconnect and restart after.

import Order from "../models/order.model.js";
import InstagramOrder from "../models/instagram.order.model.js";
import orderEventEmitter from "./orderEvents.js";

const cs = {
  order:     { stream: null, timer: null },
  instagram: { stream: null, timer: null },
};

export function stopChangeStreams() {
  for (const key of ["order", "instagram"]) {
    if (cs[key].timer) { clearTimeout(cs[key].timer); cs[key].timer = null; }
    if (cs[key].stream) {
      cs[key].stream.removeAllListeners();
      cs[key].stream.close().catch(() => {});
      cs[key].stream = null;
    }
  }
}

export function restartChangeStreams() {
  stopChangeStreams();
  setupOrderChangeStream();
  setupInstagramChangeStream();
}

function setupOrderChangeStream() {
  if (cs.order.timer) { clearTimeout(cs.order.timer); cs.order.timer = null; }

  try {
    const stream = Order.watch(
      [{ $match: { operationType: "insert" } }],
      { fullDocument: "updateLookup" },
    );
    cs.order.stream = stream;

    stream.on("change", (change) => {
      if (change.fullDocument) {
        orderEventEmitter.emit("new_order", change.fullDocument);
        console.log(`[ChangeStream] New order: ${change.fullDocument.orderId}`);
      }
    });

    stream.on("error", (err) => {
      console.error(`[ChangeStream] Error: ${err.message}`);
      cs.order.stream = null;
      stream.removeAllListeners();
      stream.close().catch(() => {});
      cs.order.timer = setTimeout(setupOrderChangeStream, 5000);
    });

    stream.on("close", () => {
      // Only auto-restart if we weren't intentionally stopped
      if (cs.order.stream === stream) {
        cs.order.stream = null;
        console.warn("[ChangeStream] Closed, restarting in 5s...");
        cs.order.timer = setTimeout(setupOrderChangeStream, 5000);
      }
    });

    console.log("[ChangeStream] Watching Order collection for inserts");
  } catch (err) {
    console.warn("[ChangeStream] Unavailable —", err.message);
    cs.order.timer = setTimeout(setupOrderChangeStream, 5000);
  }
}

function setupInstagramChangeStream() {
  if (cs.instagram.timer) { clearTimeout(cs.instagram.timer); cs.instagram.timer = null; }

  try {
    const stream = InstagramOrder.watch(
      [{ $match: { operationType: "insert" } }],
      { fullDocument: "updateLookup" },
    );
    cs.instagram.stream = stream;

    stream.on("change", (change) => {
      if (change.fullDocument) {
        orderEventEmitter.emit("new_instagram_order", change.fullDocument);
        console.log(`[ChangeStream:Instagram] New order: ${change.fullDocument.orderId}`);
      }
    });

    stream.on("error", (err) => {
      console.error(`[ChangeStream:Instagram] Error: ${err.message}`);
      cs.instagram.stream = null;
      stream.removeAllListeners();
      stream.close().catch(() => {});
      cs.instagram.timer = setTimeout(setupInstagramChangeStream, 5000);
    });

    stream.on("close", () => {
      if (cs.instagram.stream === stream) {
        cs.instagram.stream = null;
        console.warn("[ChangeStream:Instagram] Closed, restarting in 5s...");
        cs.instagram.timer = setTimeout(setupInstagramChangeStream, 5000);
      }
    });

    console.log("[ChangeStream:Instagram] Watching InstagramOrder collection for inserts");
  } catch (err) {
    console.warn("[ChangeStream:Instagram] Unavailable —", err.message);
    cs.instagram.timer = setTimeout(setupInstagramChangeStream, 5000);
  }
}
