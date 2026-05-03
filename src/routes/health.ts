import { Router, type IRouter } from "express";
export const health = () => {
  return {
    status: "ok"
  };
};
const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
