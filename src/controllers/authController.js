import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User} from "../model/userModel.js";
import { signupSchema, signinSchema, onrampSchema } from "../types/authtypes.js";
import { WalletEvent } from "../model/WalletEventModel.js";

export async function signup(req, res) {
  try {
    const { username, password } = signupSchema.parse(req.body);

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).json({
        error: "username already exists",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      balance: 0,
    });

    return res.status(201).json({
      id: user._id,
    });
  } catch (error) {
    return error.status(400).json({
      error: error.message,
    });
  }
}

export async function signin(req, res) {
  try {
    const { username, password } = signinSchema.parse(req.body);

    const existingUser = await User.findOne({ username });
    if (!existingUser) {
      return res.status(401).json({
        error: "invalid credentials",
      });
    }
    const validPassword = await bcrypt.compare(password, existingUser.password);

    if (!validPassword) {
      return res.status(401).json({
        error: "invalid password",
      });
    }

    const token = jwt.sign(
      { userId: existingUser._id.toString() },
      process.env.JWT_SECRET,
    );

    return res.json({ token });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
}

export async function onramp(req, res) {
  try {
    const { amount } = onrampSchema.parse(req.body);

    const existingUser = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { balance: amount } },
      { new: true },
    );

    if (!existingUser) {
      return res.status(400).json({
        error: "user doesnot exists",
      });
    }

    await WalletEvent.create({
      userId: req.userId,
      tx_type: "onramp",
      amount,
    });

    return res.json({
      balance: existingUser.balance,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
}

export async function getProfile(req, res) {
  try {
    const existingUser = await User.findById(req.userId).select("-password");

    if (!existingUser) {
      return res.status(400).json({ error: "user not found" });
    }
    return res.json(existingUser);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
}

export async function getTransactions(req, res) {
  try {
    const transaction = await WalletEvent.find({ userId: req.userId });
    return res.json(transaction);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
}
