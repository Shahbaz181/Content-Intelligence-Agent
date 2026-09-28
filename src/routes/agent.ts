import { Router } from "express";
import { askAgentController } from "../controllers/agentController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { askAgentQuerySchema, askAgentSchema } from "../schemas/agentSchemas.js";

const router = Router();
router.post("/ask", validateRequest({ query: askAgentQuerySchema, body: askAgentSchema }), asyncHandler(askAgentController));
export default router;
