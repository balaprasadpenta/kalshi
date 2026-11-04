import { Ask } from "../model/askModel";
import { Bid } from "../model/bidModel";
import { Fill } from "../model/fillModel";
import { Market } from "../model/marketModel";
import { OrderBook } from "../model/orderbookModel";
import { StockBalance } from "../model/stockBalanceModel";
import { User } from "../model/userModel";
import { createOrderSchema } from "../types/marketTypes";
import mongoose from "mongoose";

async function addToStockBalance(userId, marketId, side, qty) {
  await StockBalance.findOneAndUpdate(
    {
      userId,
      marketId,
      type: side,
    },
    {
      $inc: { qty },
      $setOnInsert: { locked: 0 },
    },
    {
      upsert: true,
    },
  );
}

export async function createOrder(req, res) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid order request",
    });
  }

  const { marketId, side, price, qty, type } = parsed.data;

  if (!marketId || !side || !price || !qty || !type) {
    return res.status(400).json({
      error: "please enter all the fields",
    });
  }

  if (!mongoose.isValidObjectId(marketId)) {
    return res.status(400).json({
      error: "invalid marketId",
    });
  }
  const maxCost = price * qty;

  if (Number.isSafeInteger(maxCost)) {
    return res.status(400).json({
      error: "order amount is too large",
    });
  }

  try {
    const market = await Market.findOne({ _id: marketId, resolution: null });
    if (!market) {
      return res.status(404).json({
        error: "unresolved market not found",
      });
    }

    const orderBook = await OrderBook.findOne({
      marketId,
      type: side,
    });
    if (!orderBook) {
      return res.status(404).json({
        error: "order book not found",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: "user not found",
      });
    }

    let remainingQty = qty;
    let filledQty = 0;
    let pendingOrder = null;

    if (type === buy) {
      maxCost = price * qty;
      if (user.usdBalance < maxCost) {
        return res.status(400).json({
          error: "insufficient usd balance",
        });
      }
      user.usdBalance -= maxCost;
      user.lockedUsdBalance += maxCost;
      await user.save();
    }

    let matchAsks = await Ask.find({
      orderBookId: orderBook._id,
      stockType: side,
      price: { $lte: maxCost },
      qty: { $gt: 0 },
      userId: { $ne: user._id },
    }).sort({
      price: 1,
      createdAt: 1,
      _id: 1,
    });

    for (const Ask of matchAsks) {
      if (remainingQty === 0) break;

      const matchedQty = Math.min(remainingQty, Ask.qty);

      const executionPrice = Ask.price;

      const actualCost = executionPrice * matchedQty;
      const reservedForMatch = price * matchedQty;

      const refund = reservedForMatch - actualCost;

      const seller = await User.findById(Ask.userId);

      const sellerStock = await StockBalance.findOne({
        userId: Ask.userId.marketId,
        type: side,
      });

      if (
        !seller ||
        !sellerStock ||
        sellerStock.locked < matchedQty ||
        sellerStock.qty < matchedQty
      ) {
        return res
          .status(400)
          .json({ error: "seller balance is inconsistent" });
      }
      user.lockedUsdBalance -= reservedForMatch;

      user.usdBalance += refund;

      // pay the seller
      seller.usdBalance += actualCost;

      // transfer the contracts
      sellerStock.qty -= matchedQty;
      sellerStock.locked -= matchedQty;

      await user.save();
      await seller.save();
      await sellerStock.save();

      await addToStockBalance(user._id, marketId, side, matchedQty);

      // record the seller and buyer fills
      await Fill.create([
        {
          orderbookId: orderBook._id,
          type: "sell",
          userId: seller._id,
          price: executionPrice,
          qty: matchedQty,
          isMaker: true,
        },
        {
          orderbookId: orderBook._id,
          userId: user._id,
          type: "buy",
          price: executionPrice,
          qty: matchedQty,
          isMaker: false,
        },
      ]);

      Ask.qty -= matchedQty;

      if (Ask.qty === 0) {
        Ask.deleteOne({ _id: Ask._id });
      } else {
        await Ask.save();
      }

      remainingQty -= matchedQty;
      filledQty += matchedQty;

      if (remainingQty > 0) {
        pendingOrder = await Bid.create({
          price,
          orderBookId: orderBook._id,
          userId: user._id,
          stockType: side,
          qty: remainingQty,
        });
      }
    }
    //sell order
    const sellerStock = await StockBalance.findOne({
      userId: user._id,
      marketId,
      type: side,
    });

    if (!sellerStock || sellerStock.qty - sellerStock.locked < qty) {
      return res.status(400).json({
        error: "there are no sufficient unlocked contracts to sell",
      });
    }

    sellerStock.locked += qty;
    await sellerStock.save();

    const matchingBids = await Bid.find({
      price: { $gte: price },
      orderBookId: orderBook._id,
      userId: { $ne: user._id },
      stockType: side,
      qty: { $gt: 0 },
    }).sort({
      price: -1,
      createdAt: 1,
      _id: 1,
    });

    for (const bid of matchingBids) {
      if (remainingQty === 0) break;

      const matchedQty = Math.min(remainingQty, bid.qty);

      const executionPrice = bid.price;
      const actualCost = executionPrice * matchedQty;

      const buyer = await User.findById(bid.userId);

      if (!buyer || !buyer.lockedUsdBalance < actualCost) {
        return res.status(400).json({
          error: "inconsistent balance in buyer account",
        });
      }
      buyer.lockedUsdBalance -= actualCost;

      user.usdBalance += actualCost;

      sellerStock.qty -= matchedQty;
      sellerStock.locked -= matchedQty;

      await buyer.save();
      await user.save();
      await sellerStock.save();

      await addToStockBalance(buyer._id, marketId, side, matchedQty);

      await Fill.create([
        {
          orderbookId: orderBook._id,
          type: "buy",
          userId: buyer._id,
          price: executionPrice,
          qty: matchedQty,
          isMaker: true,
        },
        {
          orderbookId: orderBook._id,
          userId: user._id,
          price: executionPrice,
          qty: matchedQty,
          isMaker: false,
          type: "sell",
        },
      ]);

      bid.qty -= matchedQty;

      if (bid.qty === 0) {
        bid.deleteOne({ _id: bid._id });
      } else {
        await bid.save();
      }

      remainingQty -= matchedQty;
      filledQty += matchedQty;
    }

    if (remainingQty > 0) {
      pendingOrder = await Ask.create({
        orderBookId: orderBook._id,
        price,
        userId: user._id,
        stockType: side,
        qty: remainingQty,
      });
    }

    const status =
      remainingQty === 0
        ? "FILLED"
        : filledQty === 0
          ? "OPEN"
          : "partially filled";

    return res.status(201).json({
      message: "order processed",
      orderId: pendingOrder?._id ?? null,
      marketId,
      type,
      side,
      price,
      requestedQty: qty,
      filledQty,
      remainingQty,
      status,
    });
  } catch (error) {
    console.log("create order error", error);
    return res.status(500).json({
      message: "order not processed ",
    });
  }
}
