import { User } from "../model/userModel.js";
import { Market } from "../model/marketModel.js";
import { WalletEvent } from "../model/WalletEventModel.js";
import { Bet } from "../model/betModel.js";
import { createMarketSchema, placeBetSchema } from "../types/marketTypes.js";

export async function createMarket(req, res) {
  try {
    const data = createMarketSchema.parse(req.body);

    if (data.expiry <= new Date()) {
      return res.status(400).json({
        error: "invalid expiry",
      });
    }

    const existingUser = await User.findById(req.userId);

    if (!existingUser) {
      return res.status(400).json({
        error: "user not loggedin, please login to create market ",
      });
    }

    if (existingUser && existingUser.balance < data.initialWager) {
      return res.status(400).json({
        error: "insufficient balance",
      });
    }

    existingUser.balance -= data.initialWager;
    await existingUser.save();

    const market = await Market.create({
      ...data,
      creatorId: existingUser._id,
    });

    await WalletEvent.create({
      userId: existingUser._id,
      tx_type: "created",
      externalId: { marketId: market._id },
      amount: data.initialWager,
    });
    return res.status(201).json({
      id: market._id,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
}

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

