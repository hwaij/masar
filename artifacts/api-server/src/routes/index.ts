import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyzeRouter from "./analyze";
import coachRouter from "./coach";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analyzeRouter);
router.use(coachRouter);

export default router;
