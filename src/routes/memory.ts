import { Router } from "express";
import { getMemoryExplorerController, getMemoryTimelineController } from "../controllers/memoryController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { brandQuerySchema } from "../schemas/commonSchemas.js";

const router = Router();
router.get("/explorer", validateRequest({ query: brandQuerySchema }), asyncHandler(getMemoryExplorerController));
router.get("/timeline", validateRequest({ query: brandQuerySchema }), asyncHandler(getMemoryTimelineController));
export default router;
