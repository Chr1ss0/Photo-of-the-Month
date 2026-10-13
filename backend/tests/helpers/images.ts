import sharp from 'sharp';

/** Erzeugt ein Test-JPEG mit EXIF-Daten (Blende, Zeit, ISO, WB, EV, GPS). */
export async function jpegWithExif(color = { r: 200, g: 120, b: 40 }): Promise<Buffer> {
  return sharp({ create: { width: 640, height: 480, channels: 3, background: color } })
    .withExif({
      IFD0: { Make: 'Fujifilm', Model: 'X-T5' },
      IFD2: {
        FNumber: '28/10',
        ExposureTime: '1/250',
        ISOSpeedRatings: '400',
        WhiteBalance: '1',
        LightSource: '1',
        ExposureBiasValue: '-1/3',
        FocalLength: '35/1',
        DateTimeOriginal: '2026:10:01 18:30:00',
      },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '52/1 31/1 12/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '13/1 24/1 18/1',
      },
    })
    .jpeg()
    .toBuffer();
}

export async function plainPng(): Promise<Buffer> {
  return sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 10, g: 10, b: 10 } } })
    .png()
    .toBuffer();
}
