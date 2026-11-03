import { User } from "../model/userModel.js";
import { Market } from "../model/marketModel.js";
import { createMarketSchema, placeBetSchema } from "../types/marketTypes.js";
import { OrderBook } from "../model/orderbookModel.js";

export async function createMarket(req, res) {
  const { title, creatorId } = createMarketSchema.parse(req.body);
  if (!title) {
    return res.status(400).json({
      error: "market title is required",
    });
  }
  try {
    const market = await Market.create({
      creatorId,
      title,
      totalIssued: 0,
      resolution: null,
    });

    await OrderBook.create([
      {
        marketId: market._id,
        type: "yes",
      },
      {
        marketId: market._id,
        type: "no",
      },
    ]);

    return res.status(201).json({
      message: "market created",
      market: {
        id: market._id,
        creatorId: market.creatorId,
        totalIssued: market.totalIssued,
        resolution: market.resolution,
      },
    });
  } catch (error) {
    console.error("createmarket error", error);
    return res.status(500).json({
      error: error.message,
      message: "could not create market",
    });
  }
}
// create yes order for this market,
async function createYesOrder(req, res) {
  const { marketId, type, side, price, qty } = safeParse(req.body);
  if (!marketId || !type || !side || !price || !qty) {
    return res.status(400).json({
      error: error.message,
      message: "all the fields are must to create order",
    });
  }

  if (market.resolution === "null") {
    res.status(400).json({
      error: "market is resolved, you cannot create order in a resolved market",
    });
    marketId.populate("Orderbook");
  }
}

//create no order for this market
async function createNoOrder(req, res) {}

export async function getMarkets(req, res) {
  try {
    const markets = await Market.find().populate("creatorId", "username");
    return res.json({ markets });
  } catch (error) {
    return res.status(400).json({
      error: error.mesage,
    });
  }
}

export async function placeBet(req, res) {
  //TODO:user balance is not decreasing when i am placing a bet
  try {
    const { marketId, amount } = placeBetSchema.parse(req.body);

    const market = await Market.findOne({ _id: marketId });

    if (!market) {
      return res.status(404).json({
        error: "market not found",
      });
    }

    if (market.resolution === !null) {
      return res.status(400).json({
        error: "market is resovled",
      });
    }

    if (market.expiry <= new Date()) {
      return res.status(400).json({
        error: "market expired",
      });
    }

    if (market.creatorId.toString() === req.userId) {
      return res.status(400).json({
        error: "creator cannot place a bet against their own market",
      });
    }

    const existingBets = await Bet.find({ marketId });

    const totalBets = existingBets.reduce((sum, bet) => sum + bet.betAmount, 0);

    if (totalBets + amount > Market.initialWager) {
      return res.status(400).json({
        error: "bet exceeds the remaining available amount",
      });
    }

    const user = await User.findById(req.userId);

    if (!user || user.balance < amount) {
      return res.status(400).json({
        error: "you dont have sufficient balance to place a bet",
      });
    }

    User.balance -= amount;
    await user.save();

    const bet = await Bet.create({
      userId: req.userId,
      marketId,
      betAmount: amount,
    });

    await WalletEvent.create({
      userId: req.userId,
      tx_type: "bet",
      externalId: { betId: bet._id, marketId },
      amount,
    });

    return res.status(201).json({
      betId: bet._id,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
}

export async function getBets(req, res) {
  try {
    const bets = await Bet.find({ userId: req.userId }).populate("marketId");
    return res.status(200).json({
      bets,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
}
