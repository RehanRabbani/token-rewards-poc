import { z } from "zod";

/** User ids, order ids and event ids: short, and safe to put in a URL or a log line. */
export const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[\w.:@-]+$/, "letters, digits and . _ : @ - only");
