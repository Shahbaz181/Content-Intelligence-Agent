import { Router } from "express";
import { getBrandController, saveBrandController } from "../controllers/brandController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { getBrandQuerySchema, saveBrandSchema } from "../schemas/brandSchemas.js";

const router = Router();
router.get("/", validateRequest({ query: getBrandQuerySchema }), asyncHandler(getBrandController));
router.post("/", validateRequest({ query: getBrandQuerySchema, body: saveBrandSchema }), asyncHandler(saveBrandController));
export default router;
