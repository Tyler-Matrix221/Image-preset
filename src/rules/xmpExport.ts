import { HSL_CHANNELS, clampParams, type EditParams } from '@/rules/params';

const XMP_CHANNEL_NAME: Record<string, string> = {
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  aqua: 'Aqua',
  blue: 'Blue',
  purple: 'Purple',
  magenta: 'Magenta',
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildXmpString(rawParams: EditParams, presetName = 'Studio Mau Preset'): string {
  const p = clampParams(rawParams);
  const absTemp = Math.round(5500 + p.temperature);
  const safeName = escapeXml(presetName.trim() || 'Studio Mau Preset');

  const hslLines = HSL_CHANNELS.map((ch) => {
    const name = XMP_CHANNEL_NAME[ch.key];
    const val = p.hsl[ch.key];
    return [
      `   crs:HueAdjustment${name}="${Math.round(val.hue)}"`,
      `   crs:SaturationAdjustment${name}="${Math.round(val.saturation)}"`,
      `   crs:LuminanceAdjustment${name}="${Math.round(val.luminance)}"`,
    ].join('\n');
  }).join('\n');

  return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Name="${safeName}"
   crs:Version="15.0"
   crs:ProcessVersion="11.0"
   crs:WhiteBalance="Custom"
   crs:Temperature="${absTemp}"
   crs:Tint="${Math.round(p.tint)}"
   crs:Exposure2012="${p.exposure.toFixed(2)}"
   crs:Contrast2012="${Math.round(p.contrast)}"
   crs:Highlights2012="${Math.round(p.highlights)}"
   crs:Shadows2012="${Math.round(p.shadows)}"
   crs:Whites2012="${Math.round(p.whites)}"
   crs:Blacks2012="${Math.round(p.blacks)}"
   crs:Vibrance="${Math.round(p.vibrance)}"
   crs:Saturation="${Math.round(p.saturation)}"
${hslLines}
   crs:HasSettings="True"/>
 </rdf:RDF>
</x:xmpmeta>
`;
}

export function downloadXmpPreset(params: EditParams, presetName: string): void {
  const xml = buildXmpString(params, presetName);
  const blob = new Blob([xml], { type: 'application/rdf+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const slug =
    presetName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'preset';
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.xmp`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
