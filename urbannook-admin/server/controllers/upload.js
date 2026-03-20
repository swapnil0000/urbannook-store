import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../config/s3.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";
import { uuidv7 } from "uuidv7";
import path from "path";

/**
 * Upload a single image to S3.
 * Expects multipart/form-data with field name "image".
 * Returns the CloudFront CDN URL.
 */
const uploadImage = async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image file provided");
  }

  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const key = `product-images/${uuidv7()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  const cdnUrl = `${process.env.AWS_CDN_BASE_URL}/${key}`;

  res
    .status(200)
    .json(new ApiResponse(200, "Image uploaded successfully", { url: cdnUrl }));
};

/**
 * Upload multiple images to S3.
 * Expects multipart/form-data with field name "images" (up to 10).
 * Returns array of CloudFront CDN URLs.
 */
const uploadMultipleImages = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No image files provided");
  }

  const urls = [];

  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const key = `product-images/${uuidv7()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);
    urls.push(`${process.env.AWS_CDN_BASE_URL}/${key}`);
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Images uploaded successfully", { urls }));
};

export { uploadImage, uploadMultipleImages };
