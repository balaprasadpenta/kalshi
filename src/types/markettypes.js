import {z} from 'zod' 

export const createMarketSchema = z.object({
    title: z.string().trim().min(3),
    creatorId: z.string(),
    resolution: z.enum(["yes", "no", "null"]),
    totalIssued: z.number()
})

export const placeBetSchema = z.object({
    marketId: z.string(),
    amount: z.number().int().positive()
}) 