import { GARMENT_THUMBNAIL_MAX_DIMENSION_PX, GarmentImageBytes, GarmentThumbnailGeneratorPort } from "@closet-ai/application";
import sharp from "sharp";

export class SharpGarmentThumbnailGenerator implements GarmentThumbnailGeneratorPort {
  async generate(input: GarmentImageBytes): Promise<GarmentImageBytes> {
    const data = await sharp(input.data)
      .rotate()
      .resize({
        width: GARMENT_THUMBNAIL_MAX_DIMENSION_PX,
        height: GARMENT_THUMBNAIL_MAX_DIMENSION_PX,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: 82 })
      .toBuffer();

    return {
      data,
      mimeType: "image/webp"
    };
  }
}
