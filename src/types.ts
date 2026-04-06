export type ShapeMask = 'square' | 'rounded' | 'circle' | 'none'
export type ImageType = 'png' | 'jpeg' | 'svg'

export interface EditState {
  imageType: ImageType | null
  imageDataUrl: string | null    // data URL for PNG/JPEG; null for SVG
  svgString: string | null       // raw SVG markup; null for raster
  imgWidth: number               // natural px width (SVG defaults to 512)
  imgHeight: number              // natural px height (SVG defaults to 512)
  cropX: number                  // center offset X in editor-frame pixels (editor = 400px)
  cropY: number                  // center offset Y in editor-frame pixels
  scale: number                  // zoom multiplier; 1.0 = image covers canvas
  rotation: number               // degrees clockwise
  bgColor: string                // hex string e.g. "#ffffff"; "" = transparent
  shapeMask: ShapeMask
}

export interface Version {
  id: string
  thumbnail: string              // 64×64 PNG data URL
  state: EditState
}

export const DEFAULT_EDIT_STATE: EditState = {
  imageType: null,
  imageDataUrl: null,
  svgString: null,
  imgWidth: 0,
  imgHeight: 0,
  cropX: 0,
  cropY: 0,
  scale: 1,
  rotation: 0,
  bgColor: '',
  shapeMask: 'square',
}
