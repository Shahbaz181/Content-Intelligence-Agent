import { Router } from "express";
import multer from "multer";
import { generateContentController, getPlanController, ingestContentController, listContentController, saveFeedbackController, savePlanController } from "../controllers/contentController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../middleware/appError.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { feedbackSchema } from "../schemas/agentSchemas.js";
import { brandQuerySchema } from "../schemas/commonSchemas.js";
import { generateContentSchema, ingestContentQuerySchema, ingestContentSchema, savePlanSchema } from "../schemas/contentSchemas.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
router.get("/", validateRequest({ query: brandQuerySchema }), asyncHandler(listContentController));
router.post("/ingest", upload.single("file"), (req, res, next) => {
  const validation = req.file ? validateRequest({ query: ingestContentQuerySchema }) : validateRequest({ query: ingestContentQuerySchema, body: ingestContentSchema });
  validation(req, res, next);
}, asyncHandler(ingestContentController));
router.post("/plan", validateRequest({ query: brandQuerySchema, body: savePlanSchema }), asyncHandler(savePlanController));
router.get("/plan", validateRequest({ query: brandQuerySchema }), asyncHandler(getPlanController));
router.post("/generate", validateRequest({ query: brandQuerySchema, body: generateContentSchema }), asyncHandler(generateContentController));
router.post("/feedback", validateRequest({ query: brandQuerySchema, body: feedbackSchema }), asyncHandler(saveFeedbackController));
router.use((_req, _res, next) => next(new AppError(404, "CONTENT_ROUTE_NOT_FOUND", "Content route not found.")));
export default router;
