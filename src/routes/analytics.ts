import { Router } from "express";
import { getAnalyticsController } from "../controllers/analyticsController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { brandQuerySchema } from "../schemas/commonSchemas.js";

const router = Router();
router.get("/", validateRequest({ query: brandQuerySchema }), asyncHandler(getAnalyticsController));
export default router;
