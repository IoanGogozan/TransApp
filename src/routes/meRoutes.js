const express = require("express");
const {
  getMe,
  updateMyPassword,
  listMyVehicles,
  getMyTimesheet,
  upsertMyTimesheet,
  listMyRoutes,
  listMyCustomers,
  listMyRuns,
  startMyRun,
  stopMyRun,
  createVehicleCheckIn,
  listMyRecentVehicleCheckIns,
} = require("../controllers/meController");
const { listDocuments, downloadDocument } = require("../controllers/documentController");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.get("/", getMe);
router.patch("/password", updateMyPassword);
router.get("/vehicles", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listMyVehicles);
router.get("/timesheet/:date", requireRole("DRIVER"), getMyTimesheet);
router.put("/timesheet/:date", requireRole("DRIVER"), upsertMyTimesheet);
router.get("/routes", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listMyRoutes);
router.get("/customers", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listMyCustomers);
router.get("/documents", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listDocuments);
router.get("/documents/:id/download", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), downloadDocument);
router.get("/runs", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listMyRuns);
router.post("/runs/start", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), startMyRun);
router.post("/runs/stop", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), stopMyRun);
router.post("/vehicle-checkins", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), createVehicleCheckIn);
router.get("/vehicle-checkins/recent", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listMyRecentVehicleCheckIns);

module.exports = router;
