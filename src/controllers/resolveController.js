import { Bet } from "../model/betModel.js";
import { Market } from "../model/marketModel.js";
import { resolveMarketSchema } from "../types/resolvetypes.js";
import { WalletEvent } from "../model/WalletEventModel.js";
import { User } from "../model/userModel.js";

export async function resolveMarket(req, res) {
  try {
    const { marketId, resolution } = resolveMarketSchema.parse(req.body);

    const market = await Market.findOne({ _id: marketId });

    if (!market) {
      return res.status(404).json({
        error: "market not found",
      });
    }

    if (req.userId !== market.creatorId.toString()) {
      return res.status(403).json({
        error: "only creator can resolve the market",
      });
    }

    if (market.resolution !== null) {
      return res.status(400).json({
        error: "market already resolved",
      });
    }

    const bets = await Bet.find({ marketId });

    const totalBets = bets.reduce((sum, bet) => sum + bet.betAmount, 0);

    if (market.bet === resolution) {
      const payout = totalBets * 2 + (market.initialWager - totalBets);

      await User.updateOne(
        { _id: market.creatorId },
        { $inc: { balance: payout } },
      );

      await WalletEvent.create({
        userId: market.creatorId,
        tx_type: "payout",
        externalId: { marketId },
        amount: payout,
      });
    } else {
      for (const bet of bets) {
        const payout = bet.betAmount * 2;

        await User.updateOne(
          {
            _id: bet.userId,
          },
          { $inc: { balance: payout } },
        );
        await WalletEvent.create({
          userId: bet.userId,
          tx_type: "payout",
          externalId: { marketId, betId: bet._id },
          amount: payout,
        });
      }

      const refund = market.initialWager - totalBets;

      if (refund > 0) {
        await User.updateOne(
          {
            id: market.creatorId,
          },
          { $inc: { balance: refund } },
        );
      }

      await WalletEvent.create({
        userId: market.creatorId,
        tx_type: "refund",
        externalId: { marketId },
        amount: refund,
      });
    }

    market.resolution = resolution;
    await market.save();

    return res.status(200).json({
      message: "market resolved successfully",
      resolution,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
}
