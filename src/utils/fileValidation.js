const path = require("path");
const crypto = require("crypto");
const AppError = require("./AppError");

const FILE_TYPE_NOT_ALLOWED = "UPLOAD_FILE_TYPE_NOT_ALLOWED";

const fileTypes = {
  "application/pdf": {
    extensions: [".pdf"],
    storageExtension: ".pdf",
    matches: (buffer) => buffer.subarray(0, 5).equals(Buffer.from("%PDF-")),
  },
  "image/jpeg": {
    extensions: [".jpg", ".jpeg"],
    storageExtension: ".jpg",
    matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  "image/png": {
    extensions: [".png"],
    storageExtension: ".png",
    matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  "text/plain": {
    extensions: [".txt"],
    storageExtension: ".txt",
    matches: (buffer) => !buffer.includes(0x00),
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extensions: [".docx"],
    storageExtension: ".docx",
    matches: (buffer) => buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b,
  },
};

const normalizeExtension = (filename) => path.extname(filename || "").toLowerCase();

const sanitizeFilenameBase = (filename, fallback = "file") => {
  const parsed = path.parse(filename || "");
  const base = parsed.name.trim().replace(/[\\/:*?"<>|\x00-\x1f]+/g, "_").replace(/\s+/g, " ");
  return base || fallback;
};

const createStorageFilename = (mimeType) => {
  const type = fileTypes[mimeType];
  if (!type) {
    throw new AppError(400, "File type not allowed", FILE_TYPE_NOT_ALLOWED);
  }
  return `${crypto.randomUUID()}${type.storageExtension}`;
};

const validateUploadedFile = (file, allowedMimeTypes) => {
  if (!file) {
    throw new AppError(400, "File is required", "VALIDATION_ERROR");
  }

  const type = fileTypes[file.mimetype];
  if (!type || !allowedMimeTypes.has(file.mimetype)) {
    throw new AppError(400, "File type not allowed", FILE_TYPE_NOT_ALLOWED);
  }

  const extension = normalizeExtension(file.originalname);
  if (!type.extensions.includes(extension)) {
    throw new AppError(400, "File extension does not match file type", FILE_TYPE_NOT_ALLOWED);
  }

  if (!Buffer.isBuffer(file.buffer) || !type.matches(file.buffer)) {
    throw new AppError(400, "File content does not match file type", FILE_TYPE_NOT_ALLOWED);
  }

  return {
    extension: type.storageExtension,
    originalName: sanitizeFilenameBase(file.originalname),
  };
};

module.exports = {
  createStorageFilename,
  fileTypes,
  sanitizeFilenameBase,
  validateUploadedFile,
};
