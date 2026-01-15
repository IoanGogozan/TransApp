const express = require("express");
const {
  getMe,
  updateMyPassword,
  listMyVehicles,
  listMyRoutes,
  listMyCustomers,
  listMyEntries,
  createMyEntry,
  updateMyEntry,
  deleteMyEntry,
  createVehicleCheckIn,
  listMyRecentVehicleCheckIns,
  getMyVehicleCheckInStatus,
} = require("../controllers/meController");
const { listDocuments, downloadDocument } = require("../controllers/documentController");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.get("/", getMe);
router.patch("/password", updateMyPassword);
router.get("/vehicles", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listMyVehicles);
router.get("/routes", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listMyRoutes);
router.get("/customers", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listMyCustomers);
router.get("/documents", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listDocuments);
router.get("/documents/:id/download", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), downloadDocument);
router.get("/entries", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listMyEntries);
router.post("/entries", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), createMyEntry);
router.patch("/entries/:id", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), updateMyEntry);
router.delete("/entries/:id", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), deleteMyEntry);
router.post("/vehicle-checkins", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), createVehicleCheckIn);
router.get("/vehicle-checkins/recent", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), listMyRecentVehicleCheckIns);
router.get("/vehicle-checkins/status", requireRole("DRIVER", "ADMIN", "PLATFORM_ADMIN"), getMyVehicleCheckInStatus);

module.exports = router;
