import { z } from "zod";
import ms from "ms";

const DurationSchema = z
  .string()
  .trim()
  .refine((value) => ms(value as ms.StringValue) !== undefined, {
    message: "Invalid duration format",
  });

export const CreateGameSchema = z.object({
  players: z
    .number()
    .int()
    .min(3, "Minimum 3 players")
    .max(15, "Maximum 15 players"),

  rounds: z.number().int().min(1, "Minimum 1 round").max(5, "Maximum 5 rounds"),

  discussion_duration: DurationSchema.refine(
    (value) => {
      const duration = ms(value as ms.StringValue)!;

      return duration >= 30_000 && duration <= 600_000;
    },
    {
      message: "Discussion duration must be between 30s and 10m",
    },
  ),

  voting_duration: DurationSchema.refine(
    (value) => {
      const duration = ms(value as ms.StringValue)!;

      return duration >= 15_000 && duration <= 180_000;
    },
    {
      message: "Voting duration must be between 15s and 3m",
    },
  ),
});
