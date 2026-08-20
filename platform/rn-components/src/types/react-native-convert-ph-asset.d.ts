declare module 'react-native-convert-ph-asset' {
  export interface ConvertOptions {
    url?: string;
    convertTo: string;
    id?: string;
    quality: string;
  }

  export interface ConvertResult {
    path: string;
    duration: number;
    filename: string;
    mimeType: string;
    type: string;
  }

  export interface RNConvertPhAssetModule {
    convertVideoFromId(options: ConvertOptions): Promise<ConvertResult>;
    convertVideoFromUrl(options: ConvertOptions): Promise<ConvertResult>;
  }

  const RNConvertPhAsset: RNConvertPhAssetModule;
  export default RNConvertPhAsset;
}
